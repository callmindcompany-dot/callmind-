-- When the team is full, tell the owner instead of turning the person away.
--
-- A trial workspace holds three people: the owner and two telecallers. The
-- third telecaller to scan the QR is the moment the trial has proved itself --
-- somebody wants to put a third person on the product. That is exactly when the
-- owner should be asked to pick a plan.
--
-- What happened instead: validate_join_request returned
--
--   'This company team hub has reached its maximum seat capacity (3/3).
--    Please contact the system administrator to upgrade their plan.'
--
-- and submit_join_request returned before writing anything. So the telecaller
-- was told to go and find their admin, the admin was never told anyone had
-- tried, and the strongest buying signal the product can produce was thrown
-- away at the door. The telecaller also cannot act on that message -- only the
-- owner can buy a plan.
--
-- Two changes:
--
--   validate_join_request now returns a machine-readable `code` beside the
--   message, so the app can tell "the team is full" apart from "that code is
--   wrong" and show the right screen for each. The seat numbers come back too.
--
--   submit_join_request records a seat-blocked attempt as a real row with
--   status 'blocked_seat_limit' rather than discarding it. The invite's
--   used_count is deliberately NOT incremented -- no seat was taken, and
--   burning a slot on a refused request would make the invite run out for
--   people who could actually have joined.
--
-- Every other refusal -- bad code, expired, revoked, slots consumed -- still
-- returns without writing. Those are not buying signals; they are typos.

CREATE OR REPLACE FUNCTION public.validate_join_request(p_company_id text, p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_company_name TEXT;
    v_plan TEXT;
    v_plan_status TEXT;
    v_seat_limit INT;
    v_invite_id TEXT;
    v_max_uses INT;
    v_used_count INT;
    v_expires_at TIMESTAMPTZ;
    v_trimmed_code TEXT;
    v_actual_members INT;
BEGIN
    SELECT name, plan, plan_status, seat_limit
    INTO v_company_name, v_plan, v_plan_status, v_seat_limit
    FROM public.companies
    WHERE id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'NO_COMPANY',
            'error', 'No active team hub exists with this Company ID.');
    END IF;

    v_trimmed_code := UPPER(TRIM(p_join_code));

    SELECT id, max_uses, used_count, expires_at
    INTO v_invite_id, v_max_uses, v_used_count, v_expires_at
    FROM public.invites
    WHERE company_id = p_company_id
      AND status = 'active'
      AND (UPPER(join_code) = v_trimmed_code OR UPPER(token) = v_trimmed_code OR UPPER(id) = v_trimmed_code)
    LIMIT 1;

    IF v_invite_id IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'BAD_CODE',
            'error', 'This invitation code is either invalid, revoked, or has expired.');
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'EXPIRED_CODE',
            'error', 'This onboarding invitation code has expired.');
    END IF;

    IF v_max_uses IS NOT NULL AND v_used_count >= v_max_uses THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'CODE_USED_UP',
            'error', 'All available slots for this invitation code have been consumed.');
    END IF;

    -- Seat capacity. The fallbacks below match plan names that predate the
    -- current four; plan_limits is the authority for anything current.
    IF v_seat_limit IS NULL THEN
        IF LOWER(COALESCE(v_plan, '')) LIKE '%enterprise%' THEN
            v_seat_limit := 1000;
        ELSIF LOWER(COALESCE(v_plan, '')) LIKE '%professional%' OR LOWER(COALESCE(v_plan, '')) LIKE '%team%' OR LOWER(COALESCE(v_plan, '')) LIKE '%growth%' THEN
            v_seat_limit := 50;
        ELSIF LOWER(COALESCE(v_plan, '')) LIKE '%trial%' THEN
            v_seat_limit := 3;
        ELSE
            v_seat_limit := 10;
        END IF;
    END IF;

    -- The users table is the only place seat occupancy actually lives. There
    -- was a denormalised companies.active_members_count consulted here that
    -- nothing ever wrote.
    SELECT COUNT(*)
    INTO v_actual_members
    FROM public.users
    WHERE company_id = p_company_id
      AND LOWER(COALESCE(status, 'active')) NOT IN ('disabled', 'removed');

    IF v_actual_members >= v_seat_limit THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'SEAT_LIMIT',
            'seatsUsed', v_actual_members,
            'seatLimit', v_seat_limit,
            'plan', v_plan,
            'companyName', v_company_name,
            -- Addressed to the person reading it, who is the telecaller and
            -- cannot buy anything. The previous wording told them to go and
            -- chase somebody; this tells them it is already handled.
            'error', 'This team is full (' || v_actual_members || ' of ' || v_seat_limit ||
                     ' seats). Your request has been sent to the workspace owner.');
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'code', 'OK',
        'companyName', v_company_name,
        'maxUses', v_max_uses,
        'usedCount', v_used_count
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.submit_join_request(
    p_company_id text, p_user_id text, p_name text, p_email text,
    p_phone text, p_city text, p_language text, p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_validation JSONB;
    v_code TEXT;
    v_invite_id TEXT;
    v_invite_token TEXT;
    v_new_id TEXT;
    v_requested_via TEXT;
    v_trimmed_code TEXT;
BEGIN
    v_validation := public.validate_join_request(p_company_id, p_join_code);
    v_code := v_validation->>'code';

    -- Anything except a full team is a dead end: a wrong code, an expired one,
    -- a revoked one. Nothing to record and nobody to tell.
    IF NOT (v_validation->>'valid')::BOOLEAN AND v_code IS DISTINCT FROM 'SEAT_LIMIT' THEN
        RETURN jsonb_build_object('success', false, 'code', v_code, 'error', v_validation->>'error');
    END IF;

    v_trimmed_code := UPPER(TRIM(p_join_code));
    SELECT id, token
    INTO v_invite_id, v_invite_token
    FROM public.invites
    WHERE company_id = p_company_id
      AND status = 'active'
      AND (UPPER(join_code) = v_trimmed_code OR UPPER(token) = v_trimmed_code OR UPPER(id) = v_trimmed_code)
    LIMIT 1;

    IF v_invite_token IS NOT NULL AND v_invite_token <> '' THEN
        v_requested_via := 'qr_live';
    ELSE
        v_requested_via := 'join_code';
    END IF;

    v_new_id := gen_random_uuid()::text;

    INSERT INTO public.join_requests (
        id, company_id, user_id, name, email, phone, city, language,
        requested_via, join_code, token, status, requested_at
    ) VALUES (
        v_new_id, p_company_id, p_user_id, p_name, p_email, p_phone, p_city, p_language,
        v_requested_via, p_join_code, v_invite_token,
        -- The whole point: a blocked request is still a request, and the owner
        -- needs to see it to know a plan is worth buying.
        CASE WHEN v_code = 'SEAT_LIMIT' THEN 'blocked_seat_limit' ELSE 'pending' END,
        NOW()
    );

    -- No seat was taken, so no slot is spent. Burning one here would make the
    -- invite run out for people who could actually have joined.
    IF v_code IS DISTINCT FROM 'SEAT_LIMIT' THEN
        UPDATE public.invites
        SET used_count = used_count + 1, updated_at = NOW()
        WHERE id = v_invite_id;
    END IF;

    RETURN jsonb_build_object(
        'success', v_code IS DISTINCT FROM 'SEAT_LIMIT',
        'code', COALESCE(v_code, 'OK'),
        'requestId', v_new_id,
        'seatsUsed', v_validation->>'seatsUsed',
        'seatLimit', v_validation->>'seatLimit',
        'error', v_validation->>'error'
    );
END;
$function$;
