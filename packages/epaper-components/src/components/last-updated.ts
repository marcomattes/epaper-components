import { define, numAttr, patchAttr, patchText } from '../core/dom';

export type UpdateFreshness = 'fresh' | 'stale' | 'expired' | 'invalid';

const parseTime = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

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

const FRESHNESS_META: Record<UpdateFreshness, { symbol: string; label: string }> = {
  fresh: { symbol: '✓', label: 'Fresh' },
  stale: { symbol: '!', label: 'Stale' },
  expired: { symbol: '×', label: 'Expired' },
  invalid: { symbol: '?', label: 'Unknown' },
};

/**
 * @summary Timestamp with explicit age and freshness state.
 * @since v1.1.0
 *
 * The component intentionally owns no timer. Hosts can update the `now`
 * attribute from their existing refresh cycle or call `refresh()` when a
 * redraw is already planned, avoiding background e-paper refreshes.
 *
 * @attr {string} datetime - ISO timestamp of the last successful update.
 * @attr {string} [now] - Optional ISO timestamp used as the comparison clock.
 * @attr {number} [stale-after=300] - Age in seconds after which the value is stale.
 * @attr {number} [expired-after=3600] - Age in seconds after which the value is expired.
 * @attr {string} [label='Updated'] - Visible and accessible timestamp label.
 * @attr {string} [locale='en'] - Locale used for the optional absolute timestamp.
 * @attr {boolean} [show-absolute] - Displays the absolute timestamp below the relative age.
 *
 * @example
 * <e-last-updated datetime="2026-08-17T14:00:00Z" stale-after="600"></e-last-updated>
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
    const relative = valid ? relativeAge(age) : 'Unknown time';
    const absolute =
      valid && this.hasAttribute('show-absolute')
        ? formatAbsolute(timestamp, this.getAttribute('locale') || 'en')
        : '';

    patchAttr(this, 'role', 'group');
    patchAttr(this, 'aria-label', `${label}: ${relative}; ${FRESHNESS_META[freshness].label}`);
    patchAttr(this._root, 'data-freshness', freshness);
    patchText(this._cueEl, FRESHNESS_META[freshness].symbol);
    patchText(this._labelEl, label);
    patchText(this._relativeEl, relative);
    patchAttr(this._relativeEl, 'datetime', valid && raw ? raw : null);
    patchText(this._stateEl, FRESHNESS_META[freshness].label);
    patchText(this._absoluteEl, absolute);
    patchAttr(this._absoluteEl, 'datetime', valid && raw ? raw : null);
    patchAttr(this._absoluteEl, 'hidden', absolute ? null : '');
  }
}

define('e-last-updated', ELastUpdated);
