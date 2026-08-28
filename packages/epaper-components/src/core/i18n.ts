// Translatable UI strings.
//
// `Intl` covers numbers, dates and relative time (see `format.ts`); what is
// left are the handful of words the library invents itself — freshness
// labels, meter band names, trend verbs, pager controls. Those used to be
// string literals inside each component, which made `e-last-updated`,
// `e-meter`, `e-pagination` and friends unusable outside English without
// forking them.
//
// Resolution order for any string: a per-instance attribute override on the
// component (e.g. `prev-label`) → the registry entry for the element's
// locale → the registry entry for the bare language → English.

import { resolveLocale } from './format';

export interface LocaleStrings {
  /** `e-last-updated` freshness states. */
  fresh: string;
  stale: string;
  expired: string;
  invalidDate: string;
  /** `e-meter` band labels. */
  bandLow: string;
  bandNormal: string;
  bandHigh: string;
  /** `e-statistic` / `e-change-marker` trend verbs. */
  increased: string;
  decreased: string;
  unchanged: string;
  /** `e-pagination` controls. */
  previous: string;
  next: string;
  /** Pager summary; `{page}` and `{total}` are substituted. */
  pageOf: string;
  /** Generic required-field message shared by the composite form controls. */
  required: string;
  /** `e-agenda` axis and entry labels. */
  agendaDay: string;
  agendaWeek: string;
  allDay: string;
  freeUntil: string;
  now: string;
  /** `e-event-log` severities, acknowledgement chip and empty state. */
  severityInfo: string;
  severityWarning: string;
  severityError: string;
  severityCritical: string;
  acknowledged: string;
  noEvents: string;
  /** `e-price`: the struck-through previous price, and the empty amount. */
  wasPrice: string;
  noPrice: string;
  /** `e-barcode` fallback states. */
  barcodeEmpty: string;
  barcodeError: string;
  /** `e-rating`; `{value}` and `{max}` are substituted. */
  rating: string;
  ratingOf: string;
  /** `e-slider`, `e-pin-input`; `{index}` and `{length}` are substituted. */
  slider: string;
  code: string;
  digitOf: string;
  /** `e-signature`. */
  signaturePad: string;
  signatureUnavailable: string;
  /** `e-keypad`, and the clear control `e-signature` shares with it. */
  keypad: string;
  clear: string;
  backspace: string;
  decimalSeparator: string;
  /** `e-redline`; `{changed}` and `{total}` are substituted. */
  redlineSummary: string;
  redlineNoChanges: string;
  redlineChangesOnly: string;
  redlineShowAll: string;
}

const EN: LocaleStrings = {
  fresh: 'Fresh',
  stale: 'Stale',
  expired: 'Expired',
  invalidDate: 'Invalid date',
  bandLow: 'Low',
  bandNormal: 'In range',
  bandHigh: 'High',
  increased: 'Increased by',
  decreased: 'Decreased by',
  unchanged: 'Unchanged',
  previous: 'Previous',
  next: 'Next',
  pageOf: 'Page {page} of {total}',
  required: 'Please fill out this field.',
  agendaDay: 'Agenda · Day',
  agendaWeek: 'Agenda · Week',
  allDay: 'All day',
  freeUntil: 'Free until',
  now: 'Now',
  severityInfo: 'Info',
  severityWarning: 'Warning',
  severityError: 'Error',
  severityCritical: 'Critical',
  acknowledged: 'ACK',
  noEvents: 'No events',
  wasPrice: 'Was',
  noPrice: 'No price',
  barcodeEmpty: 'Empty barcode',
  barcodeError: 'Barcode error',
  rating: 'Rating',
  ratingOf: '{value} of {max}',
  slider: 'Slider',
  code: 'Code',
  digitOf: 'Digit {index} of {length}',
  signaturePad: 'Signature pad',
  signatureUnavailable: 'Signature capture is unavailable on this device.',
  keypad: 'Keypad',
  clear: 'Clear',
  backspace: 'Backspace',
  decimalSeparator: 'Decimal separator',
  redlineSummary: '{changed} of {total} paragraphs changed',
  redlineNoChanges: 'No changes',
  redlineChangesOnly: 'Changes only',
  redlineShowAll: 'Show all',
};

const DE: LocaleStrings = {
  fresh: 'Aktuell',
  stale: 'Veraltet',
  expired: 'Abgelaufen',
  invalidDate: 'Ungültiges Datum',
  bandLow: 'Niedrig',
  bandNormal: 'Im Bereich',
  bandHigh: 'Hoch',
  increased: 'Gestiegen um',
  decreased: 'Gefallen um',
  unchanged: 'Unverändert',
  previous: 'Zurück',
  next: 'Weiter',
  pageOf: 'Seite {page} von {total}',
  required: 'Bitte füllen Sie dieses Feld aus.',
  agendaDay: 'Agenda · Tag',
  agendaWeek: 'Agenda · Woche',
  allDay: 'Ganztägig',
  freeUntil: 'Frei bis',
  now: 'Jetzt',
  severityInfo: 'Info',
  severityWarning: 'Warnung',
  severityError: 'Fehler',
  severityCritical: 'Kritisch',
  acknowledged: 'QUIT',
  noEvents: 'Keine Ereignisse',
  wasPrice: 'Vorher',
  noPrice: 'Kein Preis',
  barcodeEmpty: 'Leerer Barcode',
  barcodeError: 'Barcode-Fehler',
  rating: 'Bewertung',
  ratingOf: '{value} von {max}',
  slider: 'Schieberegler',
  code: 'Code',
  digitOf: 'Ziffer {index} von {length}',
  signaturePad: 'Unterschriftenfeld',
  signatureUnavailable: 'Unterschriften sind auf diesem Gerät nicht verfügbar.',
  keypad: 'Tastenfeld',
  clear: 'Löschen',
  backspace: 'Rücktaste',
  decimalSeparator: 'Dezimaltrennzeichen',
  redlineSummary: '{changed} von {total} Absätzen geändert',
  redlineNoChanges: 'Keine Änderungen',
  redlineChangesOnly: 'Nur Änderungen',
  redlineShowAll: 'Alle anzeigen',
};

const REGISTRY = new Map<string, LocaleStrings>([
  ['en', EN],
  ['de', DE],
]);

/**
 * Register or extend the strings for a locale. Partial overrides are merged
 * onto the existing entry, so a page can correct a single word without
 * restating the whole table:
 *
 * ```js
 * setLocaleStrings('de', { stale: 'Nicht mehr aktuell' });
 * ```
 */
export function setLocaleStrings(locale: string, strings: Partial<LocaleStrings>): void {
  const key = locale.toLowerCase();
  const base = REGISTRY.get(key) ?? REGISTRY.get(key.split('-')[0]!) ?? EN;
  REGISTRY.set(key, { ...base, ...strings });
}

/** The full string table for an element's resolved locale. */
export function strings(el: Element): LocaleStrings {
  const locale = resolveLocale(el)?.toLowerCase();
  if (!locale) return EN;
  return REGISTRY.get(locale) ?? REGISTRY.get(locale.split('-')[0]!) ?? EN;
}

/**
 * One localized string for an element, with an optional per-instance
 * attribute override and `{placeholder}` substitution.
 */
export function t(
  el: Element,
  key: keyof LocaleStrings,
  vars?: Record<string, string | number>,
): string {
  const value = strings(el)[key];
  if (!vars) return value;
  return value.replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * A component-level label: `attr` on the element wins over the locale table,
 * so `<e-pagination prev-label="Zurück">` keeps working regardless of locale.
 */
export function label(el: Element, attr: string, key: keyof LocaleStrings): string {
  const override = el.getAttribute(attr);
  return override != null && override !== '' ? override : t(el, key);
}
