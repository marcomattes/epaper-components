// Time-zone edge-case tests for the shared date helpers. `parseYMD` returns a
// local-midnight `Date`; these tests pin the assumption so accidental UTC
// rewrites do not regress the date pickers.
import { describe, it, expect } from 'vitest';
import { parseYMD, ymd, pad2 } from './date';

describe('pad2', () => {
  it('pads single digits to two characters', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(5)).toBe('05');
    expect(pad2(12)).toBe('12');
  });
});

describe('parseYMD', () => {
  it('returns null for empty / invalid input', () => {
    expect(parseYMD('')).toBeNull();
    expect(parseYMD(null)).toBeNull();
    expect(parseYMD(undefined)).toBeNull();
    expect(parseYMD('not-a-date')).toBeNull();
  });

  it('parses a normal day', () => {
    const d = parseYMD('2026-04-26')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(26);
  });

  it('preserves the calendar day across DST start (Europe/Berlin: 2026-03-29)', () => {
    // Local-midnight constructor: even on the DST-spring-forward day, the
    // resulting Date is just before the DST jump, so getDate() must be 29.
    const d = parseYMD('2026-03-29')!;
    expect(d.getDate()).toBe(29);
    expect(d.getMonth()).toBe(2);
    expect(d.getFullYear()).toBe(2026);
  });

  it('preserves the calendar day across DST end (Europe/Berlin: 2026-10-25)', () => {
    const d = parseYMD('2026-10-25')!;
    expect(d.getDate()).toBe(25);
    expect(d.getMonth()).toBe(9);
  });
});

describe('ymd round-trip', () => {
  it('parseYMD ∘ ymd is the identity for the DST-end day', () => {
    expect(ymd(parseYMD('2026-10-25')!)).toBe('2026-10-25');
  });

  it('parseYMD ∘ ymd is the identity for the DST-start day', () => {
    expect(ymd(parseYMD('2026-03-29')!)).toBe('2026-03-29');
  });

  it('round-trips a year boundary', () => {
    expect(ymd(parseYMD('2025-12-31')!)).toBe('2025-12-31');
    expect(ymd(parseYMD('2026-01-01')!)).toBe('2026-01-01');
  });
});
