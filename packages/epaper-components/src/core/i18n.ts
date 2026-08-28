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
  /** `e-barcode` visible fallback and error text; `{format}`, `{value}`, `{min}`, `{max}`, `{found}`, `{expected}` and `{char}` are substituted. */
  barcodeLabel: string;
  barcodeValueEmpty: string;
  barcodeDigitsOnly: string;
  barcodeNeedsDigits: string;
  barcodeCheckDigit: string;
  code128CannotEncode: string;
  /** `e-change-marker`; `{value}` is substituted. */
  changed: string;
  from: string;
  /** `e-sparkline`; `{state}` and `{threshold}` are substituted. */
  sparklineThreshold: string;
  thresholdAbove: string;
  thresholdBelow: string;
  thresholdAt: string;
  /** `e-anchor`. */
  onThisPage: string;
  inPageNavigation: string;
  /** `e-qrcode`; `{value}` is substituted. */
  qrCodeFor: string;
  qrCodeError: string;
  /** `e-title`. */
  linkToSection: string;
  /** `e-upload`. */
  anyFileType: string;
  /** `e-status-pill` built-in vocabulary. */
  statusOk: string;
  statusWarning: string;
  statusCritical: string;
  statusOffline: string;
  statusNeutral: string;
}

/** The languages shipped in the library itself; authors can register more via `setLocaleStrings`. */
type BuiltInLocale = 'en' | 'de';

// Each key's translations sit side by side rather than in one table per
// language, so a key can never be added to one language and forgotten in the
// other. Grouping comments match `LocaleStrings` above: they are the only map
// from key to the component that owns it, so keep them in sync when a key is
// added or moved.
const BUILT_IN = {
  // `e-last-updated` freshness states.
  fresh: { en: 'Fresh', de: 'Aktuell' },
  stale: { en: 'Stale', de: 'Veraltet' },
  expired: { en: 'Expired', de: 'Abgelaufen' },
  invalidDate: { en: 'Invalid date', de: 'Ungültiges Datum' },
  // `e-meter` band labels.
  bandLow: { en: 'Low', de: 'Niedrig' },
  bandNormal: { en: 'In range', de: 'Im Bereich' },
  bandHigh: { en: 'High', de: 'Hoch' },
  // `e-statistic` / `e-change-marker` trend verbs.
  increased: { en: 'Increased by', de: 'Gestiegen um' },
  decreased: { en: 'Decreased by', de: 'Gefallen um' },
  unchanged: { en: 'Unchanged', de: 'Unverändert' },
  // `e-pagination` controls.
  previous: { en: 'Previous', de: 'Zurück' },
  next: { en: 'Next', de: 'Weiter' },
  // Pager summary; `{page}` and `{total}` are substituted.
  pageOf: { en: 'Page {page} of {total}', de: 'Seite {page} von {total}' },
  // Generic required-field message shared by the composite form controls.
  required: { en: 'Please fill out this field.', de: 'Bitte füllen Sie dieses Feld aus.' },
  // `e-agenda` axis and entry labels.
  agendaDay: { en: 'Agenda · Day', de: 'Agenda · Tag' },
  agendaWeek: { en: 'Agenda · Week', de: 'Agenda · Woche' },
  allDay: { en: 'All day', de: 'Ganztägig' },
  freeUntil: { en: 'Free until', de: 'Frei bis' },
  now: { en: 'Now', de: 'Jetzt' },
  // `e-event-log` severities, acknowledgement chip and empty state.
  severityInfo: { en: 'Info', de: 'Info' },
  severityWarning: { en: 'Warning', de: 'Warnung' },
  severityError: { en: 'Error', de: 'Fehler' },
  severityCritical: { en: 'Critical', de: 'Kritisch' },
  acknowledged: { en: 'ACK', de: 'QUIT' },
  noEvents: { en: 'No events', de: 'Keine Ereignisse' },
  // `e-price`: the struck-through previous price, and the empty amount.
  wasPrice: { en: 'Was', de: 'Vorher' },
  noPrice: { en: 'No price', de: 'Kein Preis' },
  // `e-barcode` fallback states.
  barcodeEmpty: { en: 'Empty barcode', de: 'Leerer Barcode' },
  barcodeError: { en: 'Barcode error', de: 'Barcode-Fehler' },
  // `e-rating`; `{value}` and `{max}` are substituted.
  rating: { en: 'Rating', de: 'Bewertung' },
  ratingOf: { en: '{value} of {max}', de: '{value} von {max}' },
  // `e-slider`, `e-pin-input`; `{index}` and `{length}` are substituted.
  slider: { en: 'Slider', de: 'Schieberegler' },
  code: { en: 'Code', de: 'Code' },
  digitOf: { en: 'Digit {index} of {length}', de: 'Ziffer {index} von {length}' },
  // `e-signature`.
  signaturePad: { en: 'Signature pad', de: 'Unterschriftenfeld' },
  signatureUnavailable: {
    en: 'Signature capture is unavailable on this device.',
    de: 'Unterschriften sind auf diesem Gerät nicht verfügbar.',
  },
  // `e-keypad`, and the clear control `e-signature` shares with it.
  keypad: { en: 'Keypad', de: 'Tastenfeld' },
  clear: { en: 'Clear', de: 'Löschen' },
  backspace: { en: 'Backspace', de: 'Rücktaste' },
  decimalSeparator: { en: 'Decimal separator', de: 'Dezimaltrennzeichen' },
  // `e-barcode` visible fallback and error text; `{format}`, `{value}`, `{min}`, `{max}`,
  // `{found}`, `{expected}` and `{char}` are substituted.
  barcodeLabel: { en: '{format} barcode {value}', de: '{format} Barcode {value}' },
  barcodeValueEmpty: { en: 'Barcode value is empty.', de: 'Barcode ist leer.' },
  barcodeDigitsOnly: {
    en: '{format} accepts digits only.',
    de: '{format} akzeptiert nur Ziffern.',
  },
  barcodeNeedsDigits: {
    en: '{format} needs {min} or {max} digits.',
    de: '{format} benötigt {min} oder {max} Ziffern.',
  },
  barcodeCheckDigit: {
    en: 'Check digit is {found}, expected {expected}.',
    de: 'Prüfziffer ist {found}, erwartet {expected}.',
  },
  code128CannotEncode: {
    en: 'Code 128 cannot encode character "{char}".',
    de: 'Code 128 kann das Zeichen „{char}“ nicht codieren.',
  },
  // `e-change-marker`; `{value}` is substituted.
  changed: { en: 'Changed', de: 'Geändert' },
  from: { en: 'from', de: 'von' },
  // `e-sparkline`; `{state}` and `{threshold}` are substituted.
  sparklineThreshold: {
    en: '; {state} threshold {threshold}',
    de: '; {state} Schwellenwert {threshold}',
  },
  thresholdAbove: { en: 'above', de: 'über' },
  thresholdBelow: { en: 'below', de: 'unter' },
  thresholdAt: { en: 'at', de: 'am' },
  // `e-anchor`.
  onThisPage: { en: 'ON THIS PAGE', de: 'AUF DIESER SEITE' },
  inPageNavigation: { en: 'In-page navigation', de: 'Seiteninterne Navigation' },
  // `e-qrcode`; `{value}` is substituted.
  qrCodeFor: { en: 'QR code for {value}', de: 'QR-Code für {value}' },
  qrCodeError: { en: 'QR code error', de: 'QR-Code-Fehler' },
  // `e-title`.
  linkToSection: { en: 'Link to this section', de: 'Link zu diesem Abschnitt' },
  // `e-upload`.
  anyFileType: { en: 'ANY FILE TYPE', de: 'BELIEBIGER DATEITYP' },
  // `e-status-pill` built-in vocabulary.
  statusOk: { en: 'OK', de: 'OK' },
  statusWarning: { en: 'Warning', de: 'Warnung' },
  statusCritical: { en: 'Critical', de: 'Kritisch' },
  statusOffline: { en: 'Offline', de: 'Offline' },
  statusNeutral: { en: 'Neutral', de: 'Neutral' },
} satisfies Record<keyof LocaleStrings, Record<BuiltInLocale, string>>;

/** Every key of `LocaleStrings`, used to project `BUILT_IN` down to one language. */
const BUILT_IN_KEYS = Object.keys(BUILT_IN) as (keyof LocaleStrings)[];

/** Build the flat `LocaleStrings` table for one of the shipped languages. */
function builtInTable(locale: BuiltInLocale): LocaleStrings {
  // The loop below assigns every key `BUILT_IN_KEYS` enumerates (one full
  // pass over `LocaleStrings`'s keys), so the object is complete before it
  // is returned — the cast just tells TS what the loop guarantees.
  const out = {} as LocaleStrings;
  for (const key of BUILT_IN_KEYS) {
    out[key] = BUILT_IN[key][locale];
  }
  return out;
}

const EN: LocaleStrings = builtInTable('en');
const DE: LocaleStrings = builtInTable('de');

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
