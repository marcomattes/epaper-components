// Money formatting: the parts a price display sets separately, plus the two
// paths that do not go through `Intl` — a non-finite amount and a currency
// code the platform rejects.
import { describe, it, expect } from 'vitest';
import { formatMoney, formatUnitPrice, MONEY_PLACEHOLDER } from './format';

describe('formatMoney', () => {
  it('splits a German amount into major, minor and a trailing symbol', () => {
    const money = formatMoney(1299.5, 'EUR', 'de-DE');
    expect(money.major).toBe('1.299');
    expect(money.minor).toBe('50');
    expect(money.decimal).toBe(',');
    expect(money.currency).toBe('€');
    expect(money.currencyFirst).toBe(false);
    expect(money.negative).toBe(false);
    expect(money.text).toContain('1.299,50');
  });

  it('reports a leading symbol for locales that write one', () => {
    const money = formatMoney(3.99, 'USD', 'en-US');
    expect(money.major).toBe('3');
    expect(money.minor).toBe('99');
    expect(money.decimal).toBe('.');
    expect(money.currency).toBe('$');
    expect(money.currencyFirst).toBe(true);
    expect(money.text).toBe('$3.99');
  });

  it('keeps the minus sign with the major part', () => {
    const money = formatMoney(-4.2, 'EUR', 'de-DE');
    expect(money.negative).toBe(true);
    expect(money.major.startsWith('-')).toBe(true);
    expect(money.minor).toBe('20');
  });

  it('honours a currency without fraction digits', () => {
    const money = formatMoney(2500, 'JPY', 'en-US');
    expect(money.minor).toBe('');
    expect(money.decimal).toBe('');
    expect(money.major).toBe('2,500');
  });

  it('applies an explicit fraction-digit override', () => {
    expect(formatMoney(3.456, 'EUR', 'de-DE', 0).minor).toBe('');
    expect(formatMoney(3.456, 'EUR', 'de-DE', 3).minor).toBe('456');
  });

  it('falls back to a placeholder for a non-finite amount', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const money = formatMoney(value, 'EUR', 'de-DE');
      expect(money.text).toBe(MONEY_PLACEHOLDER);
      expect(money.major).toBe(MONEY_PLACEHOLDER);
      expect(money.minor).toBe('');
      expect(money.currency).toBe('');
      expect(money.currencyFirst).toBe(false);
      expect(money.negative).toBe(false);
    }
  });

  it('still formats when the currency code is one Intl rejects', () => {
    const money = formatMoney(-7.5, 'not-a-currency', 'de-DE');
    expect(money.major).toBe('-7');
    expect(money.minor).toBe('50');
    expect(money.decimal).toBe('.');
    expect(money.currency).toBe('not-a-currency');
    expect(money.negative).toBe(true);
    expect(money.text).toBe('-7.50 not-a-currency');
  });

  it('drops the separator in the fallback when no fraction digits are wanted', () => {
    const money = formatMoney(7, 'not-a-currency', undefined, 0);
    expect(money.minor).toBe('');
    expect(money.decimal).toBe('');
    expect(money.text).toBe('7 not-a-currency');
  });

  it('defaults to EUR', () => {
    expect(formatMoney(1, undefined, 'de-DE').currency).toBe('€');
  });
});

describe('formatUnitPrice', () => {
  // `de-DE` separates the amount from the symbol with U+00A0, not a space.
  const NBSP = '\u00a0';

  it('appends the unit with a slash', () => {
    expect(formatUnitPrice(7.98, 'EUR', 'kg', 'de-DE')).toBe(`7,98${NBSP}€/kg`);
  });

  it('trims the unit and omits the slash when there is none', () => {
    expect(formatUnitPrice(7.98, 'EUR', '  l ', 'de-DE')).toBe(`7,98${NBSP}€/l`);
    expect(formatUnitPrice(7.98, 'EUR', '   ', 'de-DE')).toBe(`7,98${NBSP}€`);
    expect(formatUnitPrice(7.98, 'EUR', undefined, 'de-DE')).toBe(`7,98${NBSP}€`);
  });

  it('passes the fraction-digit override through', () => {
    expect(formatUnitPrice(7.98, 'EUR', 'kg', 'de-DE', 0)).toBe(`8${NBSP}€/kg`);
  });
});
