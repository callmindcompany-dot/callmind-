import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LEGAL_DOCUMENTS, LEGAL_SLUGS, ENTITY, renderLegalText } from '@/config/legal';

/**
 * These documents existed in five places at once — three web pages, a mobile
 * screen, and rows in the legal_pages table — and they disagreed. One named the
 * operator "Voolabs Technologies", another "CallMind Technologies Inc." with
 * jurisdiction in Pune. The Terms named Stripe as a payment processor that has
 * never been integrated. The Privacy Policy described call-log and contacts
 * permissions the app does not request, and said nothing about the GPS location
 * it does collect.
 *
 * This is the guard against that happening again: one source, a generated
 * mobile copy, and assertions that the claims still match the product.
 */

const MOBILE_COPY = path.join(process.cwd(), 'mobile', 'src', 'config', 'legal.ts');
const SOURCE = path.join(process.cwd(), 'src', 'config', 'legal.ts');

describe('legal documents', () => {
  it('has a mobile copy that matches the source', () => {
    expect(
      fs.existsSync(MOBILE_COPY),
      'run: node scripts/gen-mobile-legal.mjs',
    ).toBe(true);

    const source = fs.readFileSync(SOURCE, 'utf8');
    const copy = fs.readFileSync(MOBILE_COPY, 'utf8');

    // The copy is the source with a generated-file banner in front of it.
    expect(
      copy.endsWith(source),
      'mobile/src/config/legal.ts has drifted from src/config/legal.ts — ' +
        're-run: node scripts/gen-mobile-legal.mjs',
    ).toBe(true);
  });

  it('makes no claim the product cannot support', () => {
    const everything = LEGAL_SLUGS.map((s) => renderLegalText(LEGAL_DOCUMENTS[s]))
      .join('\n')
      .toLowerCase();

    // Each of these was in the text that shipped, and none of them was true.
    const forbidden = [
      'sqlcipher',
      '14-layer',
      'stripe',
      'iso 27001',
      'soc 2',
      'hipaa',
      '24/7',
      'bank-grade',
      'military-grade',
      'zero-knowledge',
    ];

    const found = forbidden.filter((claim) => everything.includes(claim));
    expect(
      found,
      'these describe things this product does not have or does not use',
    ).toEqual([]);
  });

  it('states the one sensitive thing the mobile app actually collects', () => {
    const privacy = renderLegalText(LEGAL_DOCUMENTS.privacy).toLowerCase();

    // attendanceService.ts calls Location.getCurrentPositionAsync and stores
    // latitude, longitude, accuracy and a resolved address against a named
    // employee. A privacy policy that omits it is wrong in the direction that
    // matters.
    //
    // Asserted on the substance, not the words. Checking only for "location"
    // and "attendance" passed even with the disclosure deleted, because both
    // words occur elsewhere in the document.
    for (const detail of ['latitude', 'longitude', 'accuracy']) {
      expect(privacy, `the location disclosure must name what is stored (${detail})`).toContain(detail);
    }
    expect(
      privacy,
      'it must say the reading is taken at attendance and not in the background',
    ).toMatch(/not collected in the background/);
  });

  it('does not claim permissions the app never requests', () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'mobile', 'app.json'), 'utf8'),
    );
    const permissions: string[] = appJson.expo?.android?.permissions ?? [];
    const privacy = renderLegalText(LEGAL_DOCUMENTS.privacy).toLowerCase();

    if (!permissions.some((p) => p.includes('READ_CALL_LOG'))) {
      expect(privacy).toContain('does not read your call log');
    }
    if (!permissions.some((p) => p.includes('READ_CONTACTS'))) {
      expect(privacy).toContain('does not read your contacts');
    }
    // The reverse: expo-location is a dependency and attendance uses it, so the
    // permission has to be declared or punch-in fails on Android.
    expect(
      permissions.some((p) => p.includes('LOCATION')),
      'mobile/app.json declares an explicit android.permissions list, which is a ' +
        'whitelist — expo-location needs ACCESS_FINE_LOCATION or ACCESS_COARSE_LOCATION ' +
        'in it, or attendance cannot be marked on Android',
    ).toBe(true);
  });

  it('names the operator as a person trading under the business name', () => {
    const everything = LEGAL_SLUGS.map((s) => renderLegalText(LEGAL_DOCUMENTS[s])).join('\n');

    // CallMind is a product of Voolabs Technologies, which is not a registered
    // company — so the legal counterparty is the proprietor, trading as Voolabs.
    // Naming only the trading name identifies nobody a customer could bring a
    // claim against, and naming only the person hides which business it is.
    expect(everything).toContain(ENTITY.proprietor);
    expect(everything).toContain(ENTITY.business);

    // "Inc." was in the mobile copy alongside jurisdiction in Pune. There is no
    // incorporated entity.
    expect(everything).not.toContain('Inc.');
    expect(everything).not.toContain('Private Limited');
  });

  it('uses contact addresses that belong to the right thing', () => {
    const everything = LEGAL_SLUGS.map((s) => renderLegalText(LEGAL_DOCUMENTS[s])).join('\n');

    // The mobile copy pointed at support@callmind.ai, which is not an address
    // anyone reads. Product questions go to the product mailbox.
    expect(everything).not.toContain('callmind.ai');
    expect(everything).toContain(ENTITY.supportEmail);

    // DPDP Act 2023 requires a reachable contact for data-principal requests.
    expect(renderLegalText(LEGAL_DOCUMENTS.privacy)).toContain(ENTITY.grievanceEmail);
  });

  it('keeps prices out of the legal text', () => {
    // Prices belong in src/config/pricing.ts. The refund policy used to state a
    // trial length and seat count of its own, which is how the four
    // contradicting price lists started.
    const everything = LEGAL_SLUGS.map((s) => renderLegalText(LEGAL_DOCUMENTS[s])).join('\n');
    expect(everything).not.toMatch(/₹\s?\d/);
    expect(everything).not.toMatch(/\b\d+-day free trial\b/i);
  });

  it('gives every document a version and a date', () => {
    for (const slug of LEGAL_SLUGS) {
      const doc = LEGAL_DOCUMENTS[slug];
      expect(doc.version, `${slug} needs a version`).toMatch(/^\d+\.\d+$/);
      expect(doc.effectiveDate, `${slug} needs an ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.sections.length, `${slug} has no sections`).toBeGreaterThan(3);
      // useLegalCompliance compares version against user_acceptances, so an
      // empty document silently accepting itself would be worse than none.
      for (const section of doc.sections) {
        expect(section.body.length, `${slug}/${section.id} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
