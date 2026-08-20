import { clampedNumAttr, define, patchAttr, patchText } from '../core/dom';

type ChangeDirection = 'up' | 'down' | 'changed' | 'unchanged';

/**
 * @summary Compact value that visibly marks changes without relying on color.
 * @since v1.1.0
 *
 * Numeric values receive direction and delta cues. Text values receive a
 * generic changed marker. A configurable tolerance suppresses insignificant
 * numeric changes.
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
 *
 * @example
 * <e-change-marker label="Temperature" previous="21.8" value="22.4" suffix=" °C" precision="1"></e-change-marker>
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
      return value.toFixed(precision);
    return raw;
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
    const fromPrevious = showPrevious ? ` from ${prefix}${this._format(previous!)}${suffix}` : '';
    if (direction === 'changed') {
      return `≠ Changed${fromPrevious}`;
    }
    const delta = Number(value) - Number(previous);
    const formattedDelta =
      this._precision() == null
        ? String(Math.abs(delta))
        : Math.abs(delta).toFixed(this._precision()!);
    const word = direction === 'up' ? 'Increased' : 'Decreased';
    const symbol = direction === 'up' ? '▲' : '▼';
    return `${symbol} ${word} by ${formattedDelta}${suffix}${fromPrevious}`;
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
    const cueSuffix = cue ? `; ${cue}` : '; unchanged';
    patchAttr(this, 'aria-label', `${labelPrefix}${value}${cueSuffix}`);
  }
}

define('e-change-marker', EChangeMarker);
