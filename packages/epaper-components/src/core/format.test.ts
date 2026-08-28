// Locale resolution and Intl wrapper behaviour. These pin the two properties
// every caller depends on: the locale is read from the element's own context,
// and malformed input degrades to plain output instead of throwing into a
// component's render path.
import { describe, it, expect, afterEach } from 'vitest';
import {
  formatDate,
  formatMoneyParts,
  formatNumber,
  formatRelativeTime,
  formatUnitPrice,
  MONEY_PLACEHOLDER,
  monthLabel,
  resolveLocale,
  weekdayLabels,
} from './format';

const el = (html = '<span></span>'): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as HTMLElement;
};

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('lang');
});

describe('resolveLocale', () => {
  it('prefers the element locale attribute', () => {
    expect(resolveLocale(el('<span locale="de-DE"></span>'))).toBe('de-DE');
  });

  it('falls back to the nearest lang ancestor', () => {
    const node = el('<div lang="fr"><span></span></div>').querySelector('span')!;
    expect(resolveLocale(node)).toBe('fr');
  });

  it('falls back to the document language', () => {
    document.documentElement.lang = 'es';
    expect(resolveLocale(el())).toBe('es');
  });

  it('returns undefined when nothing declares a language', () => {
    expect(resolveLocale(el())).toBeUndefined();
  });

  it('ignores a blank locale attribute', () => {
    expect(resolveLocale(el('<span locale="   "></span>'))).toBeUndefined();
  });
});

describe('formatNumber', () => {
  it('groups thousands for the resolved locale', () => {
    expect(formatNumber(el('<span locale="de-DE"></span>'), 1299)).toBe('1.299');
    expect(formatNumber(el('<span locale="en-US"></span>'), 1299)).toBe('1,299');
  });

  it('renders currency', () => {
    expect(formatNumber(el('<span locale="de-DE"></span>'), 1299, { currency: 'EUR' })).toContain(
      '1.299,00',
    );
  });

  it('honours a fixed precision', () => {
    expect(formatNumber(el('<span locale="en-US"></span>'), 3.14159, { precision: 2 })).toBe(
      '3.14',
    );
  });

  it('can suppress grouping', () => {
    expect(formatNumber(el('<span locale="en-US"></span>'), 1299, { grouping: false })).toBe(
      '1299',
    );
  });

  it('returns an empty string for non-finite input', () => {
    expect(formatNumber(el(), Number.NaN)).toBe('');
    expect(formatNumber(el(), Number.POSITIVE_INFINITY)).toBe('');
  });

  it('falls back rather than throwing on a malformed locale', () => {
    expect(formatNumber(el('<span locale="not a locale"></span>'), 3.5, { precision: 1 })).toBe(
      '3.5',
    );
  });
});

describe('formatDate', () => {
  it('returns an empty string for an unparseable date', () => {
    expect(formatDate(el(), 'nonsense')).toBe('');
  });

  it('formats a valid date without throwing', () => {
    expect(formatDate(el('<span locale="en-US"></span>'), '2026-08-28')).not.toBe('');
  });

  it('parses a date-only string as the local calendar day, not UTC midnight', () => {
    // Regression: `new Date('2026-08-28')` parses as UTC midnight, and Intl
    // then renders that instant in the viewer's local zone — anywhere west of
    // UTC the date printed as the day before. A date-only string must land on
    // the same day as the equivalent local `Date`, in any time zone, so this
    // compares the two rather than hard-coding an offset.
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const fromString = formatDate(el('<span locale="en-CA"></span>'), '2026-08-28', opts);
    const fromLocalDate = formatDate(
      el('<span locale="en-CA"></span>'),
      new Date(2026, 7, 28),
      opts,
    );
    expect(fromString).toBe(fromLocalDate);
    expect(fromString).toBe('2026-08-28');
  });

  it('keeps a full timestamp on its own instant rather than routing it through parseYMD', () => {
    // Only a bare YYYY-MM-DD is date-only; a timestamp already carries a zone
    // and must keep the `Date` constructor's normal behaviour.
    expect(
      formatDate(el('<span locale="en-US"></span>'), '2026-08-28T23:30:00Z', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC',
      }),
    ).toBe('08/28/2026');
  });

  it('falls back to ISO rather than throwing on a malformed locale', () => {
    // Intl rejects a malformed language tag outright; a display component must
    // not take the page down over a typo in an attribute.
    expect(formatDate(el('<span locale="not a locale"></span>'), '2026-08-28T00:00:00Z')).toBe(
      '2026-08-28T00:00:00.000Z',
    );
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-28T12:00:00Z');

  it('describes the past', () => {
    const then = new Date('2026-08-25T12:00:00Z');
    expect(formatRelativeTime(el('<span locale="en-US"></span>'), then, now)).toBe('3 days ago');
  });

  it('describes the future, which is what a countdown needs', () => {
    const later = new Date('2026-08-28T12:10:00Z');
    expect(formatRelativeTime(el('<span locale="en-US"></span>'), later, now)).toBe(
      'in 10 minutes',
    );
  });

  it('localizes', () => {
    const then = new Date('2026-08-25T12:00:00Z');
    expect(formatRelativeTime(el('<span locale="de-DE"></span>'), then, now)).toContain('Tagen');
  });
});

describe('weekdayLabels', () => {
  it('starts on Sunday by default', () => {
    const labels = weekdayLabels(el('<span locale="en-US"></span>'), 0, 'short');
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe('Sun');
  });

  it('can start the week on Monday, as most of Europe does', () => {
    const labels = weekdayLabels(el('<span locale="en-US"></span>'), 1, 'short');
    expect(labels[0]).toBe('Mon');
  });

  it('localizes', () => {
    expect(weekdayLabels(el('<span locale="de-DE"></span>'), 1, 'short')[0]).toContain('Mo');
  });

  it('round-trips the long format through the join/split separator', () => {
    // The separator between joining and splitting is `\0`, chosen because a
    // weekday label can itself contain a space (unlike `narrow`/`short`, the
    // `long` format is the one most likely to). Seven labels in, seven out.
    const labels = weekdayLabels(el('<span locale="en-US"></span>'), 0, 'long');
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe('Sunday');
    expect(labels[6]).toBe('Saturday');
  });

  it('falls back to the English narrow set on a malformed locale', () => {
    expect(weekdayLabels(el('<span locale="not a locale"></span>'))).toEqual([
      'S',
      'M',
      'T',
      'W',
      'T',
      'F',
      'S',
    ]);
  });
});

describe('monthLabel', () => {
  it('localizes the month name', () => {
    expect(monthLabel(el('<span locale="de-DE"></span>'), 0, 2026)).toBe('Januar');
    expect(monthLabel(el('<span locale="en-US"></span>'), 0, 2026)).toBe('January');
  });

  it('falls back to the month number on a malformed locale', () => {
    expect(monthLabel(el('<span locale="not a locale"></span>'), 0, 2026)).toBe('1');
  });
});

describe('formatMoneyParts', () => {
  it('splits a German amount into major, minor and a trailing symbol', () => {
    const money = formatMoneyParts(el('<span locale="de-DE"></span>'), 1299.5);
    expect(money.major).toBe('1.299');
    expect(money.minor).toBe('50');
    expect(money.decimal).toBe(',');
    expect(money.currency).toBe('€');
    expect(money.currencyFirst).toBe(false);
    expect(money.negative).toBe(false);
    expect(money.text).toContain('1.299,50');
  });

  it('reports a leading symbol for locales that write one', () => {
    const money = formatMoneyParts(el('<span locale="en-US"></span>'), 3.99, { currency: 'USD' });
    expect(money.major).toBe('3');
    expect(money.minor).toBe('99');
    expect(money.currency).toBe('$');
    expect(money.currencyFirst).toBe(true);
    expect(money.text).toBe('$3.99');
  });

  it('resolves the locale from the element context like the other wrappers', () => {
    document.documentElement.lang = 'de-DE';
    expect(formatMoneyParts(el(), 3.99).currency).toBe('€');
  });

  it('keeps the minus sign with the major part', () => {
    const money = formatMoneyParts(el('<span locale="de-DE"></span>'), -4.2);
    expect(money.negative).toBe(true);
    expect(money.major.startsWith('-')).toBe(true);
    expect(money.minor).toBe('20');
  });

  it('honours a currency without fraction digits', () => {
    const money = formatMoneyParts(el('<span locale="en-US"></span>'), 2500, { currency: 'JPY' });
    expect(money.minor).toBe('');
    expect(money.decimal).toBe('');
    expect(money.major).toBe('2,500');
  });

  it('applies an explicit precision', () => {
    const de = el('<span locale="de-DE"></span>');
    expect(formatMoneyParts(de, 3.456, { precision: 0 }).minor).toBe('');
    expect(formatMoneyParts(de, 3.456, { precision: 3 }).minor).toBe('456');
  });

  it('falls back to a placeholder for a non-finite amount', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const money = formatMoneyParts(el(), value);
      expect(money.text).toBe(MONEY_PLACEHOLDER);
      expect(money.major).toBe(MONEY_PLACEHOLDER);
      expect(money.minor).toBe('');
      expect(money.currency).toBe('');
    }
  });

  it('still formats when the currency code is one Intl rejects', () => {
    const money = formatMoneyParts(el('<span locale="de-DE"></span>'), -7.5, {
      currency: 'not-a-currency',
    });
    expect(money.major).toBe('-7');
    expect(money.minor).toBe('50');
    expect(money.currency).toBe('not-a-currency');
    expect(money.negative).toBe(true);
    expect(money.text).toBe('-7.50 not-a-currency');
  });

  it('drops the separator in the fallback when no fraction digits are wanted', () => {
    const money = formatMoneyParts(el(), 7, { currency: 'not-a-currency', precision: 0 });
    expect(money.minor).toBe('');
    expect(money.decimal).toBe('');
    expect(money.text).toBe('7 not-a-currency');
  });
});

describe('formatUnitPrice', () => {
  // `de-DE` separates the amount from the symbol with U+00A0, not a space.
  const NBSP = '\u00a0';

  it('appends the unit with a slash', () => {
    expect(formatUnitPrice(el('<span locale="de-DE"></span>'), 7.98, 'kg')).toBe(`7,98${NBSP}€/kg`);
  });

  it('trims the unit and omits the slash when there is none', () => {
    const de = el('<span locale="de-DE"></span>');
    expect(formatUnitPrice(de, 7.98, '  l ')).toBe(`7,98${NBSP}€/l`);
    expect(formatUnitPrice(de, 7.98, '   ')).toBe(`7,98${NBSP}€`);
    expect(formatUnitPrice(de, 7.98)).toBe(`7,98${NBSP}€`);
  });

  it('passes the precision through', () => {
    expect(formatUnitPrice(el('<span locale="de-DE"></span>'), 7.98, 'kg', { precision: 0 })).toBe(
      `8${NBSP}€/kg`,
    );
  });
});
