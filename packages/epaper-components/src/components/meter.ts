import { define, intAttr, numAttr, patchAttr, patchBoolAttr, patchText } from '../core/dom';

type MeterBand = 'low' | 'normal' | 'high';

const BAND_LABEL: Record<MeterBand, string> = {
  low: 'Low',
  high: 'High',
  normal: 'In range',
};

/**
 * @summary Discrete, non-animated meter for bounded measurements.
 * @since v1.1.0
 *
 * Unlike progress, a meter represents a measurement inside a known range.
 * Threshold bands use labels and hatch patterns rather than color alone.
 *
 * @attr {number} [value=0] - Current measurement.
 * @attr {number} [min=0] - Lower bound.
 * @attr {number} [max=100] - Upper bound.
 * @attr {number} [segments=10] - Number of discrete scale segments (1..100).
 * @attr {number} [low] - Values below this threshold use the low band.
 * @attr {number} [high] - Values above this threshold use the high band.
 * @attr {string} [label] - Visible and accessible measurement label.
 * @attr {string} [unit] - Unit appended to the visible and accessible value.
 * @attr {boolean} [hide-value] - Hides the visible value while retaining meter semantics.
 *
 * @example
 * <e-meter label="Battery" value="72" low="20" high="90" unit="%"></e-meter>
 */
export class EMeter extends HTMLElement {
  static readonly observedAttributes = [
    'value',
    'min',
    'max',
    'segments',
    'low',
    'high',
    'label',
    'unit',
    'hide-value',
  ];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _scale: HTMLElement | null = null;
  private readonly _segments: HTMLElement[] = [];
  private _valueEl: HTMLElement | null = null;
  private _bandEl: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<div class="ink-meter">
      <div class="ink-meter__header">
        <span class="ink-meter__label"></span>
        <span class="ink-meter__reading"></span>
      </div>
      <div class="ink-meter__scale" aria-hidden="true"></div>
      <div class="ink-meter__band"></div>
    </div>`;
    this._root = this.firstElementChild as HTMLElement;
    this._labelEl = this._root.querySelector('.ink-meter__label');
    this._scale = this._root.querySelector('.ink-meter__scale');
    this._valueEl = this._root.querySelector('.ink-meter__reading');
    this._bandEl = this._root.querySelector('.ink-meter__band');
    this._patch();
  }

  attributeChangedCallback() {
    if (this._wired) this._patch();
  }

  private _bounds(): { min: number; max: number; value: number } {
    const min = numAttr(this, 'min', 0);
    const rawMax = numAttr(this, 'max', 100);
    const max = rawMax > min ? rawMax : min + 1;
    const rawValue = numAttr(this, 'value', min);
    return { min, max, value: Math.min(max, Math.max(min, rawValue)) };
  }

  private _band(value: number): MeterBand {
    const low = this.hasAttribute('low') ? numAttr(this, 'low', value) : null;
    const high = this.hasAttribute('high') ? numAttr(this, 'high', value) : null;
    if (low != null && value < low) return 'low';
    if (high != null && value > high) return 'high';
    return 'normal';
  }

  private _syncSegments(count: number): void {
    if (!this._scale) return;
    while (this._segments.length < count) {
      const segment = document.createElement('span');
      segment.className = 'ink-meter__segment';
      this._scale.appendChild(segment);
      this._segments.push(segment);
    }
    while (this._segments.length > count) {
      const segment = this._segments.pop();
      segment?.remove();
    }
  }

  private _patch(): void {
    if (!this._root || !this._labelEl || !this._valueEl || !this._bandEl) return;
    const { min, max, value } = this._bounds();
    const count = Math.max(1, Math.min(100, intAttr(this, 'segments', 10)));
    const ratio = (value - min) / (max - min);
    const active = ratio <= 0 ? 0 : Math.max(1, Math.round(ratio * count));
    const label = this.getAttribute('label') || '';
    const unit = this.getAttribute('unit') || '';
    const reading = `${value}${unit}`;
    const band = this._band(value);

    patchAttr(this, 'role', 'meter');
    patchAttr(this, 'aria-valuemin', String(min));
    patchAttr(this, 'aria-valuemax', String(max));
    patchAttr(this, 'aria-valuenow', String(value));
    patchAttr(this, 'aria-valuetext', reading);
    patchAttr(this, 'aria-label', label || 'Meter');
    patchAttr(this._root, 'data-band', band);
    patchText(this._labelEl, label);
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    patchText(this._valueEl, reading);
    patchAttr(this._valueEl, 'hidden', this.hasAttribute('hide-value') ? '' : null);
    patchText(this._bandEl, BAND_LABEL[band]);

    this._syncSegments(count);
    for (let i = 0; i < this._segments.length; i++) {
      patchBoolAttr(this._segments[i], 'data-on', i < active);
    }
  }
}

define('e-meter', EMeter);
