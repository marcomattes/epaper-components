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
