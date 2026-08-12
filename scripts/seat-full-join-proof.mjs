/**
 * Proof that a full team turns the third telecaller into a plan decision.
 *
 *   node scripts/seat-full-join-proof.mjs
 *
 * A trial workspace holds three people: the owner and two telecallers. The
 * third person to scan the QR is the strongest buying signal the product can
 * produce -- and it used to be thrown away at the door. validate_join_request
 * refused, submit_join_request returned before writing anything, and the owner
 * never learned that anyone had tried. The telecaller was told to "contact the
 * system administrator", which is not something they can act on.
 *
 * Seeds a trial company at its seat limit, has a fourth person try to join, and
 * checks that the attempt is recorded, the owner can see it, and no invite slot
 * was spent. Runs in one transaction and rolls back.
 */
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query('BEGIN');

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? '  -- ' + detail : ''}`); }
};
const scalar = async (sql, p = []) => (await c.query(sql, p)).rows[0];

const CO = 'seat_proof_' + Date.now();
const CODE = 'JOIN' + String(Date.now()).slice(-4);

console.log('\n--- seed: a trial company with its three seats taken');

await c.query(
  `INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
   VALUES ($1, 'Seat Proof Co', 'trial', 'trialing', 3)`, [CO]);

// Owner plus two telecallers is the whole trial allowance.
for (const [n, role] of [['owner', 'founder'], ['tc1', 'telecaller'], ['tc2', 'telecaller']]) {
  await c.query(
    `INSERT INTO public.users (id, company_id, email, name, role, status)
     VALUES ($1, $2, $3, $1, $4, 'active')`,
    [`${CO}_${n}`, CO, `${n}@seat.proof`, role]);
}

await c.query(
  `INSERT INTO public.invites (id, company_id, join_code, status, max_uses, used_count)
   VALUES ($1, $2, $3, 'active', 10, 0)`, [CO + '_inv', CO, CODE]);

const seats = await scalar(
  `SELECT count(*)::int n FROM public.users WHERE company_id=$1`, [CO]);
ok('three seats are taken', seats.n === 3, `seats=${seats.n}`);

console.log('\n--- CONTROL: a good code on a company with room is accepted');

const roomy = await scalar(
  `SELECT public.validate_join_request($1, $2) v`, [CO, CODE]);
// Same company is full, so validate against the seat check by temporarily
// raising the limit -- this proves the code path itself is sound.
await c.query(`UPDATE public.companies SET seat_limit = 4 WHERE id = $1`, [CO]);
const withRoom = await scalar(`SELECT public.validate_join_request($1, $2) v`, [CO, CODE]);
ok('valid while a seat is free', withRoom.v.valid === true, JSON.stringify(withRoom.v));
ok('  ...and reports code OK', withRoom.v.code === 'OK', withRoom.v.code);
await c.query(`UPDATE public.companies SET seat_limit = 3 WHERE id = $1`, [CO]);

console.log('\n--- the third telecaller arrives');

ok('validation refuses', roomy.v.valid === false, JSON.stringify(roomy.v));
ok('  ...with a machine code the app can branch on', roomy.v.code === 'SEAT_LIMIT', roomy.v.code);
ok('  ...carrying the numbers', roomy.v.seatsUsed === 3 && roomy.v.seatLimit === 3,
  `${roomy.v.seatsUsed}/${roomy.v.seatLimit}`);
ok('  ...and tells them it has been sent on, not to go chasing somebody',
  /sent to the workspace owner/i.test(roomy.v.error || ''), roomy.v.error);

const submitted = await scalar(
  `SELECT public.submit_join_request($1,$2,$3,$4,$5,$6,$7,$8) r`,
  [CO, CO + '_tc3', 'Third Telecaller', 'tc3@seat.proof', '9000000003', 'Satara', 'mr', CODE]);

ok('submit reports it did not join', submitted.r.success === false, JSON.stringify(submitted.r));
ok('  ...with SEAT_LIMIT', submitted.r.code === 'SEAT_LIMIT', submitted.r.code);

console.log('\n--- but the request is recorded, so the owner finds out');

const req = await scalar(
  `SELECT status, name, email FROM public.join_requests WHERE company_id=$1 AND email='tc3@seat.proof'`, [CO]);
ok('the attempt exists as a row', !!req, 'no row written');
ok('  ...flagged blocked_seat_limit', req?.status === 'blocked_seat_limit', `status=${req?.status}`);
ok('  ...with the person\'s name for the owner to recognise', req?.name === 'Third Telecaller', req?.name);

const waiting = await scalar(
  `SELECT count(*)::int n FROM public.join_requests
    WHERE company_id=$1 AND status='blocked_seat_limit'`, [CO]);
ok('the owner can count who is waiting', waiting.n === 1, `waiting=${waiting.n}`);

console.log('\n--- and no invite slot was burned');

const inv = await scalar(`SELECT used_count FROM public.invites WHERE id=$1`, [CO + '_inv']);
// Spending a slot on a refused request would exhaust the invite for people who
// could actually have joined once a plan is bought.
ok('used_count is still zero', Number(inv.used_count) === 0, `used_count=${inv.used_count}`);

console.log('\n--- a wrong code is still just a wrong code');

const bad = await scalar(
  `SELECT public.submit_join_request($1,$2,$3,$4,$5,$6,$7,$8) r`,
  [CO, CO + '_tc4', 'Typo Person', 'tc4@seat.proof', '9000000004', 'Satara', 'mr', 'NOPE9999']);
ok('refused', bad.r.success === false, JSON.stringify(bad.r));
ok('  ...as BAD_CODE, not SEAT_LIMIT', bad.r.code === 'BAD_CODE', bad.r.code);

const typoRow = await scalar(
  `SELECT count(*)::int n FROM public.join_requests WHERE email='tc4@seat.proof'`);
// A typo is not a buying signal and must not clutter the owner's queue.
ok('and nothing was recorded for it', typoRow.n === 0, `rows=${typoRow.n}`);

await c.query('ROLLBACK');
await c.end();

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
