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
  /**
   * Required-field messages. `required` is the generic one; the rest are what
   * each composite control reports in place of the native message a `<select>`
   * or `<input type=file>` would have produced.
   */
  required: string;
  requiredSelect: string;
  requiredOneOption: string;
  requiredCheck: string;
  requiredToggle: string;
  requiredDate: string;
  requiredTime: string;
  requiredFile: string;
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
  /** `e-redline`; `{changed}` and `{total}` are substituted. */
  redlineSummary: string;
  redlineNoChanges: string;
  redlineChangesOnly: string;
  redlineShowAll: string;
  /** `e-tree` branch toggles; `{label}` is substituted. */
  expandItem: string;
  collapseItem: string;
  /** `e-dialog` dismiss control. */
  close: string;
  /** Landmark names for the two navigation components that render a `<nav>`. */
  paginationLabel: string;
  breadcrumbLabel: string;
  /** `e-steps` status words. Rendered upper-case by the component. */
  stepDone: string;
  stepInProgress: string;
  stepPending: string;
  /** `e-popover` / `e-dropdown` fallback trigger, and the `e-popconfirm` buttons. */
  openTrigger: string;
  confirm: string;
  cancel: string;
  /** `e-back-top`. */
  backToTop: string;
  /** `e-toggle` state pip. */
  stateOn: string;
  stateOff: string;
  /** `e-input-number` stepper buttons. */
  increment: string;
  decrement: string;
  /** `e-form-item` required marker: the pill text and its accessible name. */
  requiredShort: string;
  requiredMarker: string;
  /** `e-input` / `e-textarea` fallback message for an author-set `error`. */
  invalidValue: string;
  /**
   * `e-upload` drop zone and constraint messages; `{types}`, `{name}` and
   * `{max}` are substituted.
   */
  chooseFiles: string;
  uploadPrompt: string;
  uploadAccepts: string;
  uploadTooLarge: string;
  uploadTooMany: string;
  /** `e-status-board`. */
  statusBoardLabel: string;
  noMetrics: string;
  /** `e-diff` headings and the change cue. */
  diffLabel: string;
  diffBefore: string;
  diffAfter: string;
  /** `e-sparkline` trend words. */
  trendRising: string;
  trendFalling: string;
  trendFlat: string;
  /** Shared empty state for `e-sparkline` and `e-table`. */
  noData: string;
  /** `e-calendar` and `e-date-picker` month steppers and padding cells. */
  previousMonth: string;
  nextMonth: string;
  outsideMonth: string;
  /** `e-table` selection controls; `{index}` is substituted. */
  selectAllRows: string;
  selectRow: string;
  /** `e-cascader` column names; `{label}` and `{level}` are substituted. */
  cascaderLevel: string;
  /** `e-last-updated` label and the two states with no age to word. */
  updatedLabel: string;
  unknown: string;
  unknownTime: string;
  /**
   * `e-last-updated` relative age. English keeps its own wording here rather
   * than `Intl.RelativeTimeFormat` (see the component), so the words live in
   * the table like every other string instead of as literals in the render.
   * `{count}` and `{age}` are substituted.
   */
  ageJustNow: string;
  ageUnderMinute: string;
  agePast: string;
  ageFuture: string;
  ageMinute: string;
  ageMinutes: string;
  ageHour: string;
  ageHours: string;
  ageDay: string;
  ageDays: string;
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
  requiredSelect: { en: 'Please select an option.', de: 'Bitte wählen Sie eine Option.' },
  requiredOneOption: {
    en: 'Please select at least one option.',
    de: 'Bitte wählen Sie mindestens eine Option.',
  },
  requiredCheck: {
    en: 'Please check this box.',
    de: 'Bitte aktivieren Sie dieses Kontrollkästchen.',
  },
  requiredToggle: {
    en: 'Please turn on this switch.',
    de: 'Bitte schalten Sie diesen Schalter ein.',
  },
  requiredDate: { en: 'Please select a date.', de: 'Bitte wählen Sie ein Datum.' },
  requiredTime: { en: 'Please select a time.', de: 'Bitte wählen Sie eine Uhrzeit.' },
  requiredFile: { en: 'Please select a file.', de: 'Bitte wählen Sie eine Datei.' },
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
  // `e-redline`; `{changed}` and `{total}` are substituted.
  redlineSummary: {
    en: '{changed} of {total} paragraphs changed',
    de: '{changed} von {total} Absätzen geändert',
  },
  redlineNoChanges: { en: 'No changes', de: 'Keine Änderungen' },
  redlineChangesOnly: { en: 'Changes only', de: 'Nur Änderungen' },
  redlineShowAll: { en: 'Show all', de: 'Alle anzeigen' },
  // `e-tree` branch toggles; `{label}` is substituted.
  expandItem: { en: 'Expand {label}', de: '{label} aufklappen' },
  collapseItem: { en: 'Collapse {label}', de: '{label} zuklappen' },
  // `e-dialog` dismiss control.
  close: { en: 'Close', de: 'Schließen' },
  // Landmark names for the two navigation components that render a `<nav>`.
  paginationLabel: { en: 'Pagination', de: 'Seitennavigation' },
  breadcrumbLabel: { en: 'Breadcrumb', de: 'Navigationspfad' },
  // `e-steps` status words, rendered in caps by the component.
  // Normal case here, upper-cased by the component like the severity words
  // beside them, so a locale table never has to shout to match the design.
  stepDone: { en: 'Done', de: 'Fertig' },
  stepInProgress: { en: 'In progress', de: 'Läuft' },
  stepPending: { en: 'Pending', de: 'Offen' },
  // `e-popover` / `e-dropdown` fallback trigger, and the `e-popconfirm` buttons.
  openTrigger: { en: 'Open', de: 'Öffnen' },
  confirm: { en: 'OK', de: 'OK' },
  cancel: { en: 'Cancel', de: 'Abbrechen' },
  // `e-back-top`.
  backToTop: { en: 'Back to top', de: 'Nach oben' },
  // `e-toggle` state pip.
  stateOn: { en: 'ON', de: 'AN' },
  stateOff: { en: 'OFF', de: 'AUS' },
  // `e-input-number` stepper buttons.
  increment: { en: 'Increment', de: 'Erhöhen' },
  decrement: { en: 'Decrement', de: 'Verringern' },
  // `e-form-item` required marker: the pill text and its accessible name.
  requiredShort: { en: 'REQ', de: 'PFL' },
  requiredMarker: { en: 'required', de: 'Pflichtfeld' },
  // `e-input` / `e-textarea` fallback message for an author-set `error`.
  invalidValue: { en: 'Invalid value.', de: 'Ungültiger Wert.' },
  // `e-upload` drop zone; `{types}` is substituted.
  chooseFiles: { en: 'Choose files', de: 'Dateien auswählen' },
  uploadPrompt: {
    en: 'Drop files here or click to upload',
    de: 'Dateien hierher ziehen oder zum Hochladen klicken',
  },
  uploadAccepts: { en: 'ACCEPTS · {types}', de: 'AKZEPTIERT · {types}' },
  uploadTooLarge: {
    en: 'File "{name}" exceeds maximum size of {max} bytes.',
    de: 'Die Datei „{name}“ überschreitet die Maximalgröße von {max} Bytes.',
  },
  uploadTooMany: {
    en: 'At most {max} file(s) allowed.',
    de: 'Höchstens {max} Datei(en) erlaubt.',
  },
  // `e-status-board`.
  statusBoardLabel: { en: 'Status board', de: 'Statustafel' },
  noMetrics: { en: 'No metrics', de: 'Keine Kennzahlen' },
  // `e-diff` headings and the change cue.
  diffLabel: { en: 'Value comparison', de: 'Wertevergleich' },
  diffBefore: { en: 'Previous', de: 'Vorher' },
  diffAfter: { en: 'Current', de: 'Jetzt' },
  // `e-sparkline` trend words.
  trendRising: { en: 'Rising', de: 'Steigend' },
  trendFalling: { en: 'Falling', de: 'Fallend' },
  trendFlat: { en: 'Flat', de: 'Gleichbleibend' },
  // Shared empty state for `e-sparkline` and `e-table`.
  noData: { en: 'No data', de: 'Keine Daten' },
  // `e-calendar` and `e-date-picker` month steppers and padding cells.
  previousMonth: { en: 'Previous month', de: 'Voriger Monat' },
  nextMonth: { en: 'Next month', de: 'Nächster Monat' },
  outsideMonth: { en: 'Outside current month', de: 'Außerhalb des aktuellen Monats' },
  // `e-table` selection controls; `{index}` is substituted.
  selectAllRows: { en: 'Select all rows', de: 'Alle Zeilen auswählen' },
  selectRow: { en: 'Select row {index}', de: 'Zeile {index} auswählen' },
  // `e-cascader` column names; `{label}` and `{level}` are substituted.
  cascaderLevel: { en: '{label} level {level}', de: '{label} Ebene {level}' },
  // `e-last-updated` label and the two states with no age to word.
  updatedLabel: { en: 'Updated', de: 'Aktualisiert' },
  unknown: { en: 'Unknown', de: 'Unbekannt' },
  unknownTime: { en: 'Unknown time', de: 'Unbekannte Zeit' },
  // `e-last-updated` relative age; `{count}` and `{age}` are substituted.
  ageJustNow: { en: 'just now', de: 'gerade eben' },
  ageUnderMinute: { en: 'in less than a minute', de: 'in weniger als einer Minute' },
  agePast: { en: '{age} ago', de: 'vor {age}' },
  ageFuture: { en: 'in {age}', de: 'in {age}' },
  ageMinute: { en: '{count} minute', de: '{count} Minute' },
  ageMinutes: { en: '{count} minutes', de: '{count} Minuten' },
  ageHour: { en: '{count} hour', de: '{count} Stunde' },
  ageHours: { en: '{count} hours', de: '{count} Stunden' },
  ageDay: { en: '{count} day', de: '{count} Tag' },
  ageDays: { en: '{count} days', de: '{count} Tagen' },
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

const BUILT_IN_TABLES = new Map<string, LocaleStrings>([
  ['en', EN],
  ['de', DE],
]);

/**
 * Author overrides, kept as the partials they were registered as rather than
 * as finished tables.
 *
 * Storing the merged result instead made a region tag a snapshot: registering
 * `de-CH` and *then* correcting a word in `de` left the Swiss table on the old
 * wording forever, because it had already copied the base. Resolving the chain
 * on read — built-in language, then the language override, then the region
 * override — means a later edit to any level reaches every tag below it.
 */
const OVERRIDES = new Map<string, Partial<LocaleStrings>>();

/** Memoized resolution, dropped whenever an override changes. */
const RESOLVED = new Map<string, LocaleStrings>();

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
  OVERRIDES.set(key, { ...OVERRIDES.get(key), ...strings });
  RESOLVED.clear();
}

/** Resolve one locale tag through the built-in table and both override levels. */
function tableFor(locale: string): LocaleStrings {
  const cached = RESOLVED.get(locale);
  if (cached) return cached;
  const base = locale.split('-')[0]!;
  const table: LocaleStrings = {
    ...(BUILT_IN_TABLES.get(base) ?? EN),
    ...OVERRIDES.get(base),
    ...(base === locale ? undefined : OVERRIDES.get(locale)),
  };
  RESOLVED.set(locale, table);
  return table;
}

/** The full string table for an element's resolved locale. */
export function strings(el: Element): LocaleStrings {
  const locale = resolveLocale(el)?.toLowerCase();
  return locale ? tableFor(locale) : tableFor('en');
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
  // `Object.hasOwn`, not `in`: `{constructor}` in a string would otherwise
  // resolve against `Object.prototype` and interpolate a function body.
  return value.replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
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
