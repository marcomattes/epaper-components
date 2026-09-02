// Locale-aware formatting helpers.
//
// Every component that renders a number, a currency, a date or a relative
// time goes through here. Before this existed each one hand-rolled its own
// output — `toFixed()` in `e-statistic`, hard-coded "days ago" strings in
// `e-last-updated` — so a German deployment got "1299.00" and "3 days ago"
// with no way to change either. `Intl` already knows all of it; these are
// thin wrappers that resolve the locale consistently and fail soft.

import { parseYMD } from './date';

/**
 * Resolve the locale for an element: its own `locale` attribute wins, then
 * the nearest `lang` in its ancestry, then the document language. Returning
 * `undefined` lets `Intl` fall back to the browser default, which is the
 * right answer when the page says nothing.
 */
export function resolveLocale(el: Element): string | undefined {
  const own = el.getAttribute('locale');
  if (own && own.trim() !== '') return own.trim();
  const tagged = el.closest('[lang]')?.getAttribute('lang');
  if (tagged && tagged.trim() !== '') return tagged.trim();
  const docLang = el.ownerDocument?.documentElement?.lang;
  return docLang && docLang.trim() !== '' ? docLang.trim() : undefined;
}

/**
 * `Intl` throws on a malformed locale or an unsupported option combination.
 * A display component must never take the page down over a typo in an
 * attribute, so every formatter routes through here and falls back to a
 * plain, un-localized rendering.
 */
function safely(fn: () => string, fallback: () => string): string {
  try {
    return fn();
  } catch {
    return fallback();
  }
}

/**
 * Both `Intl`'s fraction-digit options and `toFixed` accept 0…100 and throw a
 * `RangeError` outside it. An attribute is author input, so a typo
 * (`fraction-digits="-1"`, `="200"`) must not reach either — the `Intl` throw
 * lands in a fallback that calls `toFixed` with the same bad number and throws
 * again, this time outside any `try`. Clamping once, here, is what keeps that
 * unreachable for every caller.
 */
function safePrecision(precision: number): number {
  if (!Number.isFinite(precision)) return 0;
  return Math.min(100, Math.max(0, Math.trunc(precision)));
}

export interface NumberFormatOptions {
  /** Currency code (ISO 4217). Switches the output to currency style. */
  currency?: string;
  /** Fixed number of fraction digits; omit to let the locale decide. */
  precision?: number;
  /** Render as a percentage of 1 (0.3 → "30 %"). */
  percent?: boolean;
  /** Group thousands. Defaults to true. */
  grouping?: boolean;
}

/** Format a number for display, honouring locale, currency and precision. */
export function formatNumber(
  el: Element,
  value: number,
  options: NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return '';
  const { currency, percent, grouping = true } = options;
  const precision = options.precision == null ? null : safePrecision(options.precision);
  return safely(
    () => {
      const opts: Intl.NumberFormatOptions = { useGrouping: grouping };
      if (currency) {
        opts.style = 'currency';
        opts.currency = currency;
      } else if (percent) {
        opts.style = 'percent';
      }
      if (precision != null) {
        opts.minimumFractionDigits = precision;
        opts.maximumFractionDigits = precision;
      }
      return new Intl.NumberFormat(resolveLocale(el), opts).format(value);
    },
    // The fallback runs for a malformed locale as well as an unknown currency,
    // so it has to reproduce the *shape* the caller asked for. Dropping the
    // currency symbol or the percent sign here turned a price into a bare
    // number and "30 %" into "0.3" — silently, page-wide, from one typo in a
    // `lang` attribute.
    () => {
      const scaled = percent && !currency ? value * 100 : value;
      const base = precision != null ? scaled.toFixed(precision) : String(scaled);
      if (currency) return `${base} ${currency}`;
      return percent ? `${base}%` : base;
    },
  );
}

/**
 * Shared so the default is one object rather than a fresh literal per call —
 * `Intl` caches formatters by option identity, and a new literal defeats that.
 */
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };

/** Matches a bare `YYYY-MM-DD` with no time part, e.g. a `<e-table>` cell. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: Date | string | number): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && DATE_ONLY_RE.test(value)) return parseYMD(value);
  return new Date(value);
}

/**
 * Format a date/time for display. Invalid input renders as an empty string.
 *
 * A date-only string is routed through {@link parseYMD} rather than the
 * `Date` constructor: `new Date('2026-08-28')` parses as UTC midnight, but
 * `Intl.DateTimeFormat` renders in the viewer's local zone, so anywhere west
 * of UTC the date would print as the day before. `parseYMD` builds a local
 * date instead, so the calendar day survives. Timestamps that carry a time
 * part (or a `Z`/offset) keep the constructor's normal behaviour.
 */
export function formatDate(
  el: Element,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return safely(
    () => new Intl.DateTimeFormat(resolveLocale(el), options).format(date),
    () => date.toISOString(),
  );
}

/** Ordered coarse-to-fine buckets used to pick a relative-time unit. */
const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

/**
 * Format the distance between two instants as localized relative time
 * ("vor 3 Tagen", "in 10 Minuten"). Works in both directions, so the same
 * helper serves `e-last-updated` (past) and `e-countdown` (future).
 */
export function formatRelativeTime(el: Element, from: Date, to: Date = new Date()): string {
  const deltaMs = from.getTime() - to.getTime();
  const abs = Math.abs(deltaMs);
  const bucket = RELATIVE_UNITS.find((u) => abs >= u.ms) ?? RELATIVE_UNITS.at(-1)!;
  // Round away from zero on both sides. `Math.round` breaks .5 upwards, which
  // is not symmetric for a signed delta: 36 hours ago rounded to -1 ("yesterday")
  // while 36 hours ahead rounded to 2 ("in 2 days") — the same distance
  // described with two different coarsenesses depending on direction.
  const amount = Math.sign(deltaMs) * Math.round(abs / bucket.ms);
  return safely(
    () =>
      new Intl.RelativeTimeFormat(resolveLocale(el), { numeric: 'auto' }).format(
        amount,
        bucket.unit,
      ),
    () => `${amount} ${bucket.unit}`,
  );
}

/**
 * Localized weekday labels, narrow by default, starting at `weekStart`
 * (0 = Sunday). Replaces the hard-coded `['S','M','T','W','T','F','S']` that
 * made the calendar English-only and Sunday-first.
 */
export function weekdayLabels(
  el: Element,
  weekStart = 0,
  format: 'narrow' | 'short' | 'long' = 'narrow',
): string[] {
  return safely(
    () => {
      // `timeZone: 'UTC'` is load-bearing, not tidiness: the reference dates
      // below are built with `Date.UTC`, and a formatter left on the viewer's
      // zone renders them in local time. West of UTC that lands on the
      // previous day, so the whole row shifted by one — `<e-calendar>` printed
      // "Sat" over its Sunday column for every viewer in the Americas, while
      // CI (UTC) stayed green.
      const fmt = new Intl.DateTimeFormat(resolveLocale(el), {
        weekday: format,
        timeZone: 'UTC',
      });
      // 2024-01-07 is a Sunday, so adding the index walks a full week.
      return Array.from({ length: 7 }, (_, i) =>
        fmt.format(new Date(Date.UTC(2024, 0, 7 + ((i + weekStart) % 7)))),
      ).join('\0');
    },
    () => ['S', 'M', 'T', 'W', 'T', 'F', 'S'].join('\0'),
  ).split('\0');
}

/** Localized month name for a zero-based month index. */
export function monthLabel(
  el: Element,
  month: number,
  year: number,
  format: 'long' | 'short' = 'long',
): string {
  return safely(
    () =>
      new Intl.DateTimeFormat(resolveLocale(el), { month: format }).format(
        new Date(year, month, 1),
      ),
    () => String(month + 1),
  );
}

/** The pieces a split price display sets at different sizes. */
export interface MoneyParts {
  /** Integer part including the locale's group separators, e.g. `1.299`. */
  major: string;
  /** Fraction digits without the separator, e.g. `99`. Empty when none. */
  minor: string;
  /** The locale's decimal separator. Empty when there is no fraction. */
  decimal: string;
  /** Currency symbol or code as the locale writes it, e.g. `€`. */
  currency: string;
  /** True when the currency precedes the number in this locale. */
  currencyFirst: boolean;
  /** True when the amount is below zero. */
  negative: boolean;
  /** The complete formatted amount, exactly as `Intl` writes it. */
  text: string;
}

/** Rendered in place of an amount that cannot be formatted. */
export const MONEY_PLACEHOLDER = '—';

/** Currency and precision only — `percent` and `grouping` have no meaning here. */
export type MoneyOptions = Pick<NumberFormatOptions, 'currency' | 'precision'>;

const PLACEHOLDER_PARTS: MoneyParts = {
  major: MONEY_PLACEHOLDER,
  minor: '',
  decimal: '',
  currency: '',
  currencyFirst: false,
  negative: false,
  text: MONEY_PLACEHOLDER,
};

/**
 * Format money and hand back both the whole string and its parts.
 *
 * `formatNumber(el, value, { currency })` already covers the single-string
 * case. A shelf label needs more than that: the euros set large, the cents
 * set small and raised, the symbol wherever the locale puts it. `Intl`
 * knows all three, it just does not expose them separately — `formatToParts`
 * is the documented way in, and doing it here keeps every consumer off
 * slicing a formatted string apart with a regular expression.
 */
export function formatMoneyParts(
  el: Element,
  value: number,
  options: MoneyOptions = {},
): MoneyParts {
  if (!Number.isFinite(value)) return { ...PLACEHOLDER_PARTS };
  const { currency = 'EUR' } = options;
  const precision = options.precision == null ? null : safePrecision(options.precision);

  let parts: Intl.NumberFormatPart[];
  try {
    const opts: Intl.NumberFormatOptions = { style: 'currency', currency };
    if (precision != null) {
      opts.minimumFractionDigits = precision;
      opts.maximumFractionDigits = precision;
    }
    parts = new Intl.NumberFormat(resolveLocale(el), opts).formatToParts(value);
  } catch {
    // An unknown currency code throws a RangeError. A price tag with the
    // wrong symbol still beats a component that renders nothing at all.
    return fallbackMoneyParts(value, currency, precision ?? 2);
  }

  let major = '';
  let minor = '';
  let decimal = '';
  let currencyText = '';
  let currencyIndex = -1;
  let numberIndex = -1;

  parts.forEach((part, index) => {
    switch (part.type) {
      case 'currency':
        currencyText += part.value;
        if (currencyIndex === -1) currencyIndex = index;
        break;
      case 'integer':
      case 'group':
        major += part.value;
        if (numberIndex === -1) numberIndex = index;
        break;
      case 'decimal':
        decimal = part.value;
        break;
      case 'fraction':
        minor += part.value;
        break;
      case 'minusSign':
        major = `${part.value}${major}`;
        break;
      default:
        break;
    }
  });

  return {
    major,
    minor,
    decimal: minor ? decimal : '',
    currency: currencyText,
    currencyFirst: currencyIndex !== -1 && (numberIndex === -1 || currencyIndex < numberIndex),
    negative: value < 0,
    text: parts.map((part) => part.value).join(''),
  };
}

/** Last-resort split for a currency code `Intl` refuses to accept. */
function fallbackMoneyParts(value: number, currency: string, precision: number): MoneyParts {
  const fixed = Math.abs(value).toFixed(precision);
  const [major = '0', minor = ''] = fixed.split('.');
  const negative = value < 0;
  const decimal = minor ? '.' : '';
  const number = `${negative ? '-' : ''}${major}${decimal}${minor}`;
  return {
    major: `${negative ? '-' : ''}${major}`,
    minor,
    decimal,
    currency,
    currencyFirst: false,
    negative,
    text: currency ? `${number} ${currency}` : number,
  };
}

/**
 * Format a base price such as `4,32 €/kg`. Returns the amount alone when
 * `unit` is empty, so a caller does not have to branch.
 */
export function formatUnitPrice(
  el: Element,
  value: number,
  unit = '',
  options: MoneyOptions = {},
): string {
  const { text } = formatMoneyParts(el, value, options);
  const trimmed = unit.trim();
  return trimmed ? `${text}/${trimmed}` : text;
}
