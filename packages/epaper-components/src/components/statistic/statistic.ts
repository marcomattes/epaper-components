import { boolAttr, clampedNumAttr, define, numAttr, patchAttr, patchText } from '../../core/dom';
import { formatNumber, resolveLocale, type NumberFormatOptions } from '../../core/format';
import { t, type LocaleStrings } from '../../core/i18n';

type TrendDirection = 'up' | 'down' | 'flat';

/** Threshold bands derived from `low` / `high`. */
type StatusBand = 'low' | 'normal' | 'high';

const TREND_GLYPH: Record<TrendDirection, string> = { up: '▲', down: '▼', flat: '—' };
const TREND_KEY: Record<TrendDirection, keyof LocaleStrings> = {
  up: 'increased',
  down: 'decreased',
  flat: 'unchanged',
};
const STATUS_KEY: Record<StatusBand, keyof LocaleStrings> = {
  low: 'bandLow',
  normal: 'bandNormal',
  high: 'bandHigh',
};

function normalizeTrendDirection(trend: string | null): TrendDirection {
  return trend === 'up' || trend === 'down' ? trend : 'flat';
}

function isStatusBand(value: string): value is StatusBand {
  return value === 'low' || value === 'normal' || value === 'high';
}

/**
 * @summary KPI block with a large numeric value, label and optional trend arrow.
 * @since v1.0.1
 *
 * Use to present a single metric (e.g. revenue, users, score) with an
 * optional secondary delta. The trend marker is a static glyph, not animated,
 * so it is e-paper-friendly.
 *
 * Numbers pass through untouched until one of `currency`, `percent`,
 * `precision` or `grouping` asks for formatting; from then on they are
 * rendered with `Intl.NumberFormat` for the resolved locale, so
 * `value="1299" currency="EUR" locale="de"` reads "1.299,00 €".
 *
 * `low` / `high` turn the value into a threshold reading: the resulting band
 * is published as `data-status` on the host *and* spelled out in words next
 * to the value, so the state survives a monochrome panel. `status` sets that
 * band directly when the host has already computed it.
 *
 * @attr {string} [label] - Caption above the value.
 * @attr {string|number} [value] - Primary value. Strings render as-is; numbers honor the formatting attributes.
 * @attr {string} [prefix] - Inline prefix rendered before the value (e.g. `$`).
 * @attr {string} [suffix] - Inline suffix rendered after the value (e.g. `%`).
 * @attr {number} [precision] - Decimal places when `value` is numeric.
 * @attr {string} [currency] - ISO-4217 code. Renders the value as a currency amount, with grouping. (since v1.3.0)
 * @attr {boolean} [percent] - Renders the value as a percentage of 1 (`0.42` → "42%"). (since v1.3.0)
 * @attr {boolean} [grouping] - Adds locale thousands separators to a plain number. (since v1.3.0)
 * @attr {number} [low] - Values below this threshold report `data-status="low"`. (since v1.3.0)
 * @attr {number} [high] - Values above this threshold report `data-status="high"`. (since v1.3.0)
 * @attr {'low'|'normal'|'high'|string} [status] - Explicit status, overriding `low` / `high`. Unknown values are shown verbatim. (since v1.3.0)
 * @attr {'up'|'down'|'flat'} [trend] - Direction marker shown next to the delta.
 * @attr {string|number} [delta] - Secondary value rendered next to the trend arrow.
 * @attr {string} [locale] - BCP-47 tag for the number format and the trend wording. Falls back to the nearest `lang`, then the document language. (since v1.3.0)
 *
 * @example
 * <e-statistic label="Revenue" value="12480" prefix="$" trend="up" delta="8.4%"></e-statistic>
 * @example
 * <e-statistic locale="de" label="Umsatz" value="1299" currency="EUR" low="1500"></e-statistic>
 */
export class EStatistic extends HTMLElement {
  static readonly observedAttributes = [
    'label',
    'value',
    'prefix',
    'suffix',
    'precision',
    'currency',
    'percent',
    'grouping',
    'low',
    'high',
    'status',
    'trend',
    'delta',
    'locale',
  ];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _valueEl: HTMLElement | null = null;
  private _prefixEl: HTMLElement | null = null;
  private _suffixEl: HTMLElement | null = null;
  private _trendEl: HTMLElement | null = null;
  private _trendArrow: HTMLElement | null = null;
  private _trendDelta: HTMLElement | null = null;
  private _trendA11y: HTMLElement | null = null;
  private _statusEl: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<div class="ink-statistic">
      <div class="ink-statistic__label"></div>
      <div class="ink-statistic__row">
        <span class="ink-statistic__prefix"></span><span class="ink-statistic__value"></span><span class="ink-statistic__suffix"></span>
      </div>
      <div class="ink-statistic__trend" hidden>
        <span class="ink-statistic__arrow" aria-hidden="true"></span>
        <span class="ink-statistic__delta"></span>
        <span class="sr-only"></span>
      </div>
      <div class="ink-statistic__status" hidden></div>
    </div>`;
    this._root = this.firstElementChild as HTMLElement;
    this._labelEl = this._root.querySelector('.ink-statistic__label');
    this._valueEl = this._root.querySelector('.ink-statistic__value');
    this._prefixEl = this._root.querySelector('.ink-statistic__prefix');
    this._suffixEl = this._root.querySelector('.ink-statistic__suffix');
    this._trendEl = this._root.querySelector('.ink-statistic__trend');
    this._trendArrow = this._root.querySelector('.ink-statistic__arrow');
    this._trendDelta = this._root.querySelector('.ink-statistic__delta');
    this._trendA11y = this._root.querySelector('.sr-only');
    this._statusEl = this._root.querySelector('.ink-statistic__status');
    patchAttr(this, 'role', 'group');
    this._render();
  }

  attributeChangedCallback() {
    if (this._wired) this._render();
  }

  /**
   * The `Intl` options this instance asks for, or `null` when no formatting
   * attribute is present — in that case the value is passed through verbatim,
   * which is what every `<e-statistic>` written before v1.3.0 expects.
   */
  private _numberOptions(): NumberFormatOptions | null {
    const currency = this.getAttribute('currency');
    const percent = boolAttr(this, 'percent');
    const grouping = boolAttr(this, 'grouping');
    const precision = this.hasAttribute('precision');
    if (!currency && !percent && !grouping && !precision) return null;
    // A currency amount or a percentage is a composed figure and carries its
    // locale's separators; a bare number only groups when asked to.
    const opts: NumberFormatOptions = { grouping: grouping || !!currency || percent };
    if (currency) opts.currency = currency;
    if (percent) opts.percent = true;
    if (precision) opts.precision = clampedNumAttr(this, 'precision', 0, 0, 100);
    return opts;
  }

  private _formatValue(): string {
    const raw = this.getAttribute('value');
    if (raw == null) return '';
    const opts = this._numberOptions();
    if (opts == null) return raw;
    const num = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(num)) return raw;
    return formatNumber(this, num, opts) || raw;
  }

  /**
   * Threshold band for the current value: an explicit `status` wins, then
   * `low` / `high` are compared strictly, matching `e-meter`'s bands. Returns
   * `null` when the component was given no threshold semantics at all.
   */
  private _status(): string | null {
    const explicit = this.getAttribute('status')?.trim();
    if (explicit) return explicit;
    const hasLow = this.hasAttribute('low');
    const hasHigh = this.hasAttribute('high');
    if (!hasLow && !hasHigh) return null;
    const raw = this.getAttribute('value');
    const num = raw != null && raw.trim() !== '' ? Number(raw) : Number.NaN;
    if (!Number.isFinite(num)) return null;
    if (hasLow && num < numAttr(this, 'low', num)) return 'low';
    if (hasHigh && num > numAttr(this, 'high', num)) return 'high';
    return 'normal';
  }

  private _render(): void {
    if (!this._root || !this._labelEl || !this._valueEl || !this._prefixEl || !this._suffixEl)
      return;
    const label = this.getAttribute('label') || '';
    const prefix = this.getAttribute('prefix') || '';
    const suffix = this.getAttribute('suffix') || '';

    patchText(this._labelEl, label);
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    patchText(this._prefixEl, prefix);
    patchAttr(this._prefixEl, 'hidden', prefix ? null : '');
    patchText(this._valueEl, this._formatValue());
    patchText(this._suffixEl, suffix);
    patchAttr(this._suffixEl, 'hidden', suffix ? null : '');

    this._renderTrend();
    this._renderStatus();
  }

  /**
   * Publishes the threshold band as `data-status` on the host for styling and
   * spells it out in words, so the reading never depends on color alone.
   */
  private _renderStatus(): void {
    if (!this._statusEl) return;
    const status = this._status();
    let word = '';
    if (status) word = isStatusBand(status) ? t(this, STATUS_KEY[status]) : status;
    patchAttr(this, 'data-status', status);
    patchText(this._statusEl, word);
    patchAttr(this._statusEl, 'hidden', status ? null : '');
  }

  private _renderTrend(): void {
    if (!this._trendEl) return;
    const trend = this.getAttribute('trend');
    const delta = this.getAttribute('delta');
    const trendVisible = !!(trend || delta);
    patchAttr(this._trendEl, 'hidden', trendVisible ? null : '');
    if (!trendVisible) return;

    const dir = normalizeTrendDirection(trend);
    patchAttr(this._trendEl, 'data-trend', dir);
    if (this._trendArrow) patchText(this._trendArrow, TREND_GLYPH[dir]);
    if (this._trendDelta) patchText(this._trendDelta, delta || '');
    // The screen-reader fragment is read mid-sentence ("Revenue 8.4%,
    // increased by"), so the capitalized table entry is lowercased.
    if (this._trendA11y)
      patchText(this._trendA11y, t(this, TREND_KEY[dir]).toLocaleLowerCase(resolveLocale(this)));
  }
}

define('e-statistic', EStatistic);
