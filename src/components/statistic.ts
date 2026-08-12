import { clampedNumAttr, define, patchAttr, patchText } from '../core/dom';

/**
 * @summary KPI block with a large numeric value, label and optional trend arrow.
 *
 * Use to present a single metric (e.g. revenue, users, score) with an
 * optional secondary delta. Numeric formatting is locale-independent and
 * respects the `precision` attribute. The trend marker is a static glyph,
 * not animated, so it is e-paper-friendly.
 *
 * @attr {string} [label] - Caption above the value.
 * @attr {string|number} [value] - Primary value. Strings render as-is; numbers honor `precision`.
 * @attr {string} [prefix] - Inline prefix rendered before the value (e.g. `$`).
 * @attr {string} [suffix] - Inline suffix rendered after the value (e.g. `%`).
 * @attr {number} [precision] - Decimal places when `value` is numeric.
 * @attr {'up'|'down'|'flat'} [trend] - Direction marker shown next to the delta.
 * @attr {string|number} [delta] - Secondary value rendered next to the trend arrow.
 *
 * @example
 * <e-statistic label="Revenue" value="12480" prefix="$" trend="up" delta="8.4%"></e-statistic>
 */
export class EStatistic extends HTMLElement {
  static observedAttributes = ['label', 'value', 'prefix', 'suffix', 'precision', 'trend', 'delta'];

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
    patchAttr(this, 'role', 'group');
    this._render();
  }

  attributeChangedCallback() {
    if (this._wired) this._render();
  }

  private _formatValue(): string {
    const raw = this.getAttribute('value');
    if (raw == null) return '';
    const num = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(num) && this.hasAttribute('precision')) {
      return num.toFixed(clampedNumAttr(this, 'precision', 0, 0, 100));
    }
    return raw;
  }

  private _render(): void {
    if (!this._root || !this._labelEl || !this._valueEl || !this._prefixEl || !this._suffixEl)
      return;
    const label = this.getAttribute('label') || '';
    const prefix = this.getAttribute('prefix') || '';
    const suffix = this.getAttribute('suffix') || '';
    const trend = this.getAttribute('trend');
    const delta = this.getAttribute('delta');

    patchText(this._labelEl, label);
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    patchText(this._prefixEl, prefix);
    patchAttr(this._prefixEl, 'hidden', prefix ? null : '');
    patchText(this._valueEl, this._formatValue());
    patchText(this._suffixEl, suffix);
    patchAttr(this._suffixEl, 'hidden', suffix ? null : '');

    const trendVisible = !!(trend || delta);
    if (this._trendEl) {
      patchAttr(this._trendEl, 'hidden', trendVisible ? null : '');
      if (trendVisible) {
        const arrow = trend === 'up' ? '\u25B2' : trend === 'down' ? '\u25BC' : '\u2014';
        const dir = trend === 'up' || trend === 'down' || trend === 'flat' ? trend : 'flat';
        patchAttr(this._trendEl, 'data-trend', dir);
        const a11y = dir === 'up' ? 'increased by' : dir === 'down' ? 'decreased by' : 'unchanged';
        if (this._trendArrow) patchText(this._trendArrow, arrow);
        if (this._trendDelta) patchText(this._trendDelta, delta || '');
        if (this._trendA11y) patchText(this._trendA11y, a11y);
      }
    }
  }
}

define('e-statistic', EStatistic);
