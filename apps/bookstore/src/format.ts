// Money, dates and delivery wording.
//
// The interface is English throughout, but the shop ships from Germany, so
// prices are EUR and the delivery promise follows German conditions: free
// standard delivery from €29, 19 % VAT included, and Sunday is not a working
// day. Only the numbers are localised — `de-DE` for the amount, English for
// every label around it.

const EUR = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** Free standard delivery above this order value, in EUR. */
export const FREE_DELIVERY_THRESHOLD = 29;

/** Standard delivery charge below the threshold, in EUR. */
export const STANDARD_DELIVERY = 3.9;

/** Express delivery charge, always payable. */
export const EXPRESS_DELIVERY = 7.9;

/** VAT rate applied to books in Germany. */
export const VAT_RATE = 0.07;

export const eur = (amount: number): string => EUR.format(amount);

/** Bare amount without the symbol — for `<e-statistic prefix="€">`. */
export const eurAmount = (amount: number): string => amount.toFixed(2).replace('.', ',');

export const longDate = (iso: string): string => LONG_DATE.format(new Date(`${iso}T00:00:00`));

export const shortDate = (date: Date): string => SHORT_DATE.format(date);

/** ISO `YYYY-MM-DD` for a `Date`, in local time. */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Add `days` working days to `from`, skipping Saturday and Sunday. Deutsche
 * Post delivers on Saturdays, but the warehouse in the story does not pack on
 * weekends, so both are skipped — the estimate is the conservative one.
 */
export function addWorkingDays(from: Date, days: number): Date {
  const date = new Date(from);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return date;
}

/** "Tue, 25 Aug – Thu, 27 Aug" for a delivery window of `days`…`days + 2`. */
export function deliveryWindow(days: number, from: Date = new Date()): string {
  const earliest = addWorkingDays(from, days);
  const latest = addWorkingDays(from, days + 2);
  return `${shortDate(earliest)} – ${shortDate(latest)}`;
}

/** Percentage a discounted price saves against its previous price. */
export function discountPercent(price: number, previous: number): number {
  return Math.round((1 - price / previous) * 100);
}
