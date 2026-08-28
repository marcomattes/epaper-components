import { define, numAttr, patchAttr, patchText } from '../../core/dom';
import { formatRelativeTime, resolveLocale } from '../../core/format';
import { t } from '../../core/i18n';

export type UpdateFreshness = 'fresh' | 'stale' | 'expired' | 'invalid';

const parseTime = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

/**
 * The English wording this component has rendered since v1.1.0.
 *
 * `Intl.RelativeTimeFormat` words the same instants differently — "now"
 * instead of "just now", "yesterday" instead of "1 day ago", and it rounds
 * (119 s becomes "2 minutes ago") where this floors. Those exact strings are
 * on screens today and asserted by the shipped test suites, so English keeps
 * this table and every other locale goes through `Intl`.
 */
const relativeAge = (ageSeconds: number): string => {
  const future = ageSeconds < 0;
  const absolute = Math.abs(ageSeconds);
  if (absolute < 60) return future ? 'in less than a minute' : 'just now';
  const units: Array<[number, string]> = [
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [seconds, unit] of units) {
    if (absolute >= seconds) {
      const amount = Math.floor(absolute / seconds);
      const text = `${amount} ${unit}${amount === 1 ? '' : 's'}`;
      return future ? `in ${text}` : `${text} ago`;
    }
  }
  return 'just now';
};

const computeFreshness = (
  age: number,
  staleAfter: number,
  expiredAfter: number,
): UpdateFreshness => {
  if (age > expiredAfter) return 'expired';
  if (age > staleAfter) return 'stale';
  return 'fresh';
};

const formatAbsolute = (timestamp: number, locale: string): string => {
  try {
    return new Date(timestamp).toLocaleString(locale);
  } catch {
    return new Date(timestamp).toISOString();
  }
};

/** Cue glyphs per freshness state. The words come from the locale table. */
const FRESHNESS_SYMBOL: Record<UpdateFreshness, string> = {
  fresh: '✓',
  stale: '!',
  expired: '×',
  invalid: '?',
};

/** Locale-table keys for the three states the table covers. */
const FRESHNESS_KEY = { fresh: 'fresh', stale: 'stale', expired: 'expired' } as const;

/**
 * @summary Timestamp with explicit age and freshness state.
 * @since v1.1.0
 *
 * The component intentionally owns no timer. Hosts can update the `now`
 * attribute from their existing refresh cycle or call `refresh()` when a
 * redraw is already planned, avoiding background e-paper refreshes.
 *
 * Freshness words come from the locale string table and the relative age from
 * `Intl.RelativeTimeFormat`, so a German board reads "vor 3 Tagen · Veraltet".
 * English deployments keep the v1.1.0 wording verbatim — see `relativeAge`.
 *
 * @attr {string} datetime - ISO timestamp of the last successful update.
 * @attr {string} [now] - Optional ISO timestamp used as the comparison clock.
 * @attr {number} [stale-after=300] - Age in seconds after which the value is stale.
 * @attr {number} [expired-after=3600] - Age in seconds after which the value is expired.
 * @attr {string} [label='Updated'] - Visible and accessible timestamp label.
 * @attr {string} [locale='en'] - Locale for the relative age, the freshness words and the optional absolute timestamp. Falls back to the nearest `lang`, then the document language; only the absolute timestamp still defaults to `en`.
 * @attr {boolean} [show-absolute] - Displays the absolute timestamp below the relative age.
 *
 * @example
 * <e-last-updated datetime="2026-08-17T14:00:00Z" stale-after="600"></e-last-updated>
 * @example
 * <e-last-updated locale="de" datetime="2026-08-17T14:00:00Z"></e-last-updated>
 */
export class ELastUpdated extends HTMLElement {
  static readonly observedAttributes = [
    'datetime',
    'now',
    'stale-after',
    'expired-after',
    'label',
    'locale',
    'show-absolute',
  ];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _cueEl: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _relativeEl: HTMLTimeElement | null = null;
  private _stateEl: HTMLElement | null = null;
  private _absoluteEl: HTMLTimeElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<div class="ink-last-updated">
      <span class="ink-last-updated__cue" aria-hidden="true"></span>
      <span class="ink-last-updated__body">
        <span class="ink-last-updated__label"></span>
        <time class="ink-last-updated__relative"></time>
        <span class="ink-last-updated__state"></span>
        <time class="ink-last-updated__absolute"></time>
      </span>
    </div>`;
    this._root = this.firstElementChild as HTMLElement;
    this._cueEl = this._root.querySelector('.ink-last-updated__cue');
    this._labelEl = this._root.querySelector('.ink-last-updated__label');
    this._relativeEl = this._root.querySelector('.ink-last-updated__relative');
    this._stateEl = this._root.querySelector('.ink-last-updated__state');
    this._absoluteEl = this._root.querySelector('.ink-last-updated__absolute');
    this.refresh();
  }

  attributeChangedCallback() {
    if (this._wired) this.refresh();
  }

  /**
   * True when nothing on the page asked for a language other than English.
   * Gate for the two strings whose English wording predates the locale table
   * (`relativeAge` and the "Unknown" freshness state); everything else is
   * translated unconditionally because the table matches the old wording.
   */
  private _english(): boolean {
    const locale = resolveLocale(this);
    return !locale || locale.toLowerCase().split('-')[0] === 'en';
  }

  /** Relative age, localized unless the page is English. */
  private _relative(timestamp: number, now: number, age: number): string {
    return this._english()
      ? relativeAge(age)
      : formatRelativeTime(this, new Date(timestamp), new Date(now));
  }

  /** Visible word for a freshness state. */
  private _freshnessLabel(freshness: UpdateFreshness): string {
    if (freshness === 'invalid') return this._english() ? 'Unknown' : t(this, 'invalidDate');
    return t(this, FRESHNESS_KEY[freshness]);
  }

  /** Recomputes the relative age against `now` or the current system time. */
  refresh(): void {
    if (
      !this._root ||
      !this._cueEl ||
      !this._labelEl ||
      !this._relativeEl ||
      !this._stateEl ||
      !this._absoluteEl
    )
      return;
    const raw = this.getAttribute('datetime');
    const timestamp = parseTime(raw, Number.NaN);
    const now = parseTime(this.getAttribute('now'), Date.now());
    const label = this.getAttribute('label') || 'Updated';
    const staleAfter = Math.max(0, numAttr(this, 'stale-after', 300));
    const expiredAfter = Math.max(staleAfter, numAttr(this, 'expired-after', 3600));
    const valid = Number.isFinite(timestamp) && Number.isFinite(now);
    const age = valid ? Math.floor((now - timestamp) / 1000) : 0;
    const freshness: UpdateFreshness = valid
      ? computeFreshness(age, staleAfter, expiredAfter)
      : 'invalid';
    const stateLabel = this._freshnessLabel(freshness);
    // Without a parseable timestamp there is no age to word; English keeps its
    // "Unknown time", other locales repeat the state word.
    const unknown = this._english() ? 'Unknown time' : stateLabel;
    const relative = valid ? this._relative(timestamp, now, age) : unknown;
    const absolute =
      valid && this.hasAttribute('show-absolute')
        ? formatAbsolute(timestamp, this.getAttribute('locale') || 'en')
        : '';

    patchAttr(this, 'role', 'group');
    patchAttr(this, 'aria-label', `${label}: ${relative}; ${stateLabel}`);
    patchAttr(this._root, 'data-freshness', freshness);
    patchText(this._cueEl, FRESHNESS_SYMBOL[freshness]);
    patchText(this._labelEl, label);
    patchText(this._relativeEl, relative);
    patchAttr(this._relativeEl, 'datetime', valid && raw ? raw : null);
    patchText(this._stateEl, stateLabel);
    patchText(this._absoluteEl, absolute);
    patchAttr(this._absoluteEl, 'datetime', valid && raw ? raw : null);
    patchAttr(this._absoluteEl, 'hidden', absolute ? null : '');
  }
}

define('e-last-updated', ELastUpdated);
