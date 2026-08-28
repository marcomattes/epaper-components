// Locale-aware money formatting, pre-split into the pieces retail price
// typography needs.
//
// `Intl.NumberFormat` already knows where a locale puts its currency symbol,
// which separators it groups with, and how many fraction digits a currency
// carries. What it does not do is hand those pieces back individually, and a
// shelf label needs exactly that: the euros set large, the cents set small
// and raised, the symbol wherever the locale wants it. `formatToParts` is the
// documented way in, so every consumer in the library goes through here
// rather than slicing a formatted string apart with a regular expression.

/** A money amount broken into the parts a price display sets separately. */
export interface MoneyParts {
  /** Integer part including the locale's group separators, e.g. `1,299`. */
  major: string;
  /** Fraction digits without the separator, e.g. `99`. Empty when none. */
  minor: string;
  /** The locale's decimal separator, e.g. `.` or `,`. Empty when no fraction. */
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

/** Rendered in place of a number that cannot be formatted. */
export const MONEY_PLACEHOLDER = '—';

const placeholderParts = (): MoneyParts => ({
  major: MONEY_PLACEHOLDER,
  minor: '',
  decimal: '',
  currency: '',
  currencyFirst: false,
  negative: false,
  text: MONEY_PLACEHOLDER,
});

/** Last-resort formatting for a currency code `Intl` refuses to accept. */
function fallbackParts(value: number, currency: string, fractionDigits: number): MoneyParts {
  const fixed = Math.abs(value).toFixed(fractionDigits);
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
 * Format `value` as money and return both the complete string and the parts.
 *
 * `fractionDigits` defaults to the currency's own default (2 for EUR/USD,
 * 0 for JPY) — pass a number only to override it.
 */
export function formatMoney(
  value: number,
  currency = 'EUR',
  locale?: string,
  fractionDigits?: number,
): MoneyParts {
  if (!Number.isFinite(value)) return placeholderParts();

  const digits =
    fractionDigits != null && Number.isFinite(fractionDigits)
      ? Math.max(0, Math.min(20, Math.trunc(fractionDigits)))
      : null;

  let parts: Intl.NumberFormatPart[];
  try {
    const format = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...(digits == null ? {} : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    });
    parts = format.formatToParts(value);
  } catch {
    // An unknown or malformed currency code throws a RangeError; a price tag
    // with the wrong symbol still beats a component that renders nothing.
    return fallbackParts(value, currency, digits ?? 2);
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

/**
 * Format a base price such as `4.32 €/kg`. Returns the formatted amount alone
 * when `unit` is empty, so a caller does not have to branch.
 */
export function formatUnitPrice(
  value: number,
  currency = 'EUR',
  unit = '',
  locale?: string,
  fractionDigits?: number,
): string {
  const { text } = formatMoney(value, currency, locale, fractionDigits);
  const trimmed = unit.trim();
  return trimmed ? `${text}/${trimmed}` : text;
}
