import { describe, it, expect } from 'vitest';
import { toCsv } from '@/lib/downloadCsv';

describe('toCsv', () => {
  it('quotes every cell so a comma cannot shift a column', () => {
    expect(toCsv(['A', 'B'], [['Sharma, Rakesh', 'Pune']]))
      .toBe('"A","B"\r\n"Sharma, Rakesh","Pune"');
  });

  it('doubles embedded quotes rather than breaking the row', () => {
    expect(toCsv(['A'], [['He said "yes"']])).toContain('"He said ""yes"""');
  });

  it('keeps a newline inside a cell instead of splitting the record', () => {
    const csv = toCsv(['Note'], [['line one\nline two']]);
    // Quoted, so a reader treats it as one field.
    expect(csv).toBe('"Note"\r\n"line one\nline two"');
  });

  it('leaves a blank cell blank', () => {
    // The export used to write 'Direct' into an empty source and 'New' into an
    // empty status, so the file asserted things nobody had recorded.
    expect(toCsv(['S'], [[null]])).toBe('"S"\r\n""');
    expect(toCsv(['S'], [[undefined]])).toBe('"S"\r\n""');
    expect(toCsv(['S'], [['']])).toBe('"S"\r\n""');
  });

  it('defuses a cell Excel would run as a formula', () => {
    // Lead names come from web forms and CSV imports, so they are
    // attacker-controlled; Excel executes a cell starting with = + - or @.
    for (const payload of ['=1+1', '+1', '-1', '@SUM(A1)']) {
      const csv = toCsv(['Name'], [[payload]]);
      expect(csv).toContain(`"\t${payload}"`);
      expect(csv).not.toContain(`"${payload}"`);
    }
  });

  it('does not defuse an ordinary value', () => {
    expect(toCsv(['Name'], [['Rakesh']])).toBe('"Name"\r\n"Rakesh"');
  });

  it('separates records with CRLF, which is what Excel expects', () => {
    expect(toCsv(['A'], [['1'], ['2']])).toBe('"A"\r\n"1"\r\n"2"');
  });

  it('survives the character that used to truncate the file', () => {
    // The old export ran the whole CSV through encodeURI into a data: URI.
    // encodeURI does not escape '#', and everything after '#' in a URI is a
    // fragment, so one lead with a hash in a note silently cut the file short.
    const csv = toCsv(['Note'], [['Ref #4471'], ['Second row']]);
    expect(csv).toContain('Ref #4471');
    expect(csv).toContain('Second row');
  });
});
