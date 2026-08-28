import { clampedNumAttr, define, patchAttr, patchText } from '../../core/dom';
import { formatNumber, resolveLocale } from '../../core/format';
import { t } from '../../core/i18n';

type ChangeDirection = 'up' | 'down' | 'changed' | 'unchanged';

/**
 * @summary Compact value that visibly marks changes without relying on color.
 * @since v1.1.0
 *
 * Numeric values receive direction and delta cues. Text values receive a
 * generic changed marker. A configurable tolerance suppresses insignificant
 * numeric changes.
 *
 * The direction words come from the locale string table, so a German board
 * reads "▲ Gestiegen um 0,6 °C" instead of the English wording. Numbers are
 * localized only once `precision` says how many decimals to render — without
 * it the marker keeps passing the raw value through, as it always has.
 *
 * @attr {string|number} value - Current value.
 * @attr {string|number} [previous] - Previous value used for comparison.
 * @attr {string} [label] - Caption for the value.
 * @attr {string} [prefix] - Text before current and previous values.
 * @attr {string} [suffix] - Text after current and previous values.
 * @attr {number} [precision] - Decimal places for numeric values and deltas.
 * @attr {number} [tolerance=0] - Absolute numeric change treated as unchanged.
 * @attr {boolean} [show-previous] - Adds the previous value to the change cue.
 * @attr {boolean} [announce] - Exposes updates as a polite live status.
 * @attr {string} [locale] - BCP-47 tag for the cue words and the number format. Falls back to the nearest `lang`, then the document language. (since v1.3.0)
 *
 * @example
 * <e-change-marker label="Temperature" previous="21.8" value="22.4" suffix=" °C" precision="1"></e-change-marker>
 * @example
 * <e-change-marker locale="de" previous="21.8" value="22.4" suffix=" °C" precision="1"></e-change-marker>
 */
export class EChangeMarker extends HTMLElement {
  static readonly observedAttributes = [
    'value',
    'previous',
    'label',
    'prefix',
    'suffix',
    'precision',
    'tolerance',
    'show-previous',
    'announce',
    'locale',
  ];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _valueEl: HTMLElement | null = null;
  private _cueEl: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<div class="ink-change-marker">
      <span class="ink-change-marker__label"></span>
      <span class="ink-change-marker__value"></span>
      <span class="ink-change-marker__cue"></span>
    </div>`;
    this._root = this.firstElementChild as HTMLElement;
    this._labelEl = this._root.querySelector('.ink-change-marker__label');
    this._valueEl = this._root.querySelector('.ink-change-marker__value');
    this._cueEl = this._root.querySelector('.ink-change-marker__cue');
    this._patch();
  }

  attributeChangedCallback() {
    if (this._wired) this._patch();
  }

  private _precision(): number | null {
    return this.hasAttribute('precision') ? clampedNumAttr(this, 'precision', 0, 0, 20) : null;
  }

  private _format(raw: string): string {
    const precision = this._precision();
    const value = Number(raw);
    if (precision != null && raw.trim() !== '' && Number.isFinite(value))
      return this._formatNumber(value, precision);
    return raw;
  }

  /**
   * Locale-aware replacement for `toFixed()`. Grouping stays off: the marker
   * sits inline next to a label, and a thousands separator would also change
   * the rendering of every existing English deployment that only asked for a
   * fixed number of decimals.
   */
  private _formatNumber(value: number, precision: number): string {
    return formatNumber(this, value, { precision, grouping: false });
  }

  private _direction(value: string, previous: string | null): ChangeDirection {
    if (previous == null) return 'unchanged';
    const currentNumber = Number(value);
    const previousNumber = Number(previous);
    if (
      value.trim() !== '' &&
      previous.trim() !== '' &&
      Number.isFinite(currentNumber) &&
      Number.isFinite(previousNumber)
    ) {
      const tolerance = Math.max(
        0,
        clampedNumAttr(this, 'tolerance', 0, 0, Number.MAX_SAFE_INTEGER),
      );
      const delta = currentNumber - previousNumber;
      if (Math.abs(delta) <= tolerance) return 'unchanged';
      return delta > 0 ? 'up' : 'down';
    }
    return value === previous ? 'unchanged' : 'changed';
  }

  private _cue(direction: ChangeDirection, value: string, previous: string | null): string {
    if (direction === 'unchanged') return '';
    const showPrevious = this.hasAttribute('show-previous') && previous != null;
    const prefix = this.getAttribute('prefix') || '';
    const suffix = this.getAttribute('suffix') || '';
    // Hoisted out of both return templates: nesting a conditional template inside
    // another is the shape Sonar flags, and both branches built it identically.
    const fromPrevious = showPrevious
      ? ` ${t(this, 'from')} ${prefix}${this._format(previous!)}${suffix}`
      : '';
    if (direction === 'changed') {
      return `≠ ${t(this, 'changed')}${fromPrevious}`;
    }
    const delta = Number(value) - Number(previous);
    const precision = this._precision();
    const formattedDelta =
      precision == null ? String(Math.abs(delta)) : this._formatNumber(Math.abs(delta), precision);
    const word = t(this, direction === 'up' ? 'increased' : 'decreased');
    const symbol = direction === 'up' ? '▲' : '▼';
    return `${symbol} ${word} ${formattedDelta}${suffix}${fromPrevious}`;
  }

  private _patch(): void {
    if (!this._root || !this._labelEl || !this._valueEl || !this._cueEl) return;
    const rawValue = this.getAttribute('value') || '';
    const previous = this.getAttribute('previous');
    const label = this.getAttribute('label') || '';
    const prefix = this.getAttribute('prefix') || '';
    const suffix = this.getAttribute('suffix') || '';
    const value = `${prefix}${this._format(rawValue)}${suffix}`;
    const direction = this._direction(rawValue, previous);
    const cue = this._cue(direction, rawValue, previous);

    patchAttr(this._root, 'data-change', direction);
    patchText(this._labelEl, label);
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    patchText(this._valueEl, value);
    patchText(this._cueEl, cue);
    patchAttr(this._cueEl, 'hidden', cue ? null : '');
    patchAttr(this, 'role', this.hasAttribute('announce') ? 'status' : 'group');
    patchAttr(this, 'aria-live', this.hasAttribute('announce') ? 'polite' : null);
    const labelPrefix = label ? `${label}: ` : '';
    // The cue reads as the tail of a sentence ("42; unchanged"), so the
    // capitalized table entry is lowercased for the resolved locale.
    const cueSuffix = cue
      ? `; ${cue}`
      : `; ${t(this, 'unchanged').toLocaleLowerCase(resolveLocale(this))}`;
    patchAttr(this, 'aria-label', `${labelPrefix}${value}${cueSuffix}`);
  }
}

define('e-change-marker', EChangeMarker);
