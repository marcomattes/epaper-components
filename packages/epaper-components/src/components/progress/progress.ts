import {
  boolAttr,
  define,
  EpaperElement,
  intAttr,
  numAttr,
  patchAttr,
  patchBoolAttr,
  patchText,
} from '../../core/dom';
import { formatNumber } from '../../core/format';

/**
 * The caption's percentage, formatted for the element's locale — German writes
 * "42 %" with a space, which a hard-coded `${pct}%` cannot produce. The bar's
 * own width stays a raw CSS percentage.
 */
const percentText = (el: Element, pct: number): string =>
  formatNumber(el, pct / 100, { percent: true });

/**
 * @summary Static progress indicator (linear bar or discrete steps).
 * @since v1.0.1
 *
 * No animation: the bar updates as a single dirty rectangle which the EPDC
 * can resolve with a partial waveform.
 *
 * @attr {number} [value=0] - Current value (0..max).
 * @attr {number} [max=100] - Maximum value.
 * @attr {'linear'|'steps'} [variant='linear'] - Visual style.
 * @attr {number} [steps=5] - When `variant="steps"`, the number of segments.
 * @attr {string} [label] - Accessible label, also rendered as a small caption.
 * @attr {boolean} [hide-label] - Suppresses the visible caption while keeping the aria-label.
 *
 * @example
 * <e-progress value="42" label="Upload"></e-progress>
 */
export class EProgress extends EpaperElement {
  static readonly observedAttributes = ['value', 'max', 'variant', 'steps', 'label', 'hide-label'];

  private _wired = false;
  private _variant: 'linear' | 'steps' | null = null;
  private _wrap: HTMLElement | null = null;
  private _fill: HTMLElement | null = null;
  private _stepsGrid: HTMLElement | null = null;
  private _segs: HTMLElement[] = [];
  private _cap: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this._build();
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    const variant = this.getAttribute('variant') === 'steps' ? 'steps' : 'linear';
    if (name === 'variant' && variant !== this._variant) {
      this._build();
      return;
    }
    this._patch();
  }

  private _patchAria(value: number, max: number, label: string): void {
    patchAttr(this, 'role', 'progressbar');
    patchAttr(this, 'aria-valuemin', '0');
    patchAttr(this, 'aria-valuemax', String(max));
    patchAttr(this, 'aria-valuenow', String(Math.max(0, Math.min(value, max))));
    patchAttr(this, 'aria-label', label || null);
  }

  private _build(): void {
    const variant = this.getAttribute('variant') === 'steps' ? 'steps' : 'linear';
    this._variant = variant;
    const value = Math.max(0, numAttr(this, 'value', 0));
    const max = Math.max(1, numAttr(this, 'max', 100));
    const pct = Math.min(100, Math.round((value / max) * 100));
    const label = this.getAttribute('label') || '';
    const hideLabel = boolAttr(this, 'hide-label');

    this._patchAria(value, max, label);

    const wrap = document.createElement('div');
    wrap.className = `ink-progress ink-progress--${variant}`;
    this._wrap = wrap;
    this._fill = null;
    this._stepsGrid = null;
    this._segs = [];
    this._cap = null;

    if (variant === 'linear') {
      const track = document.createElement('div');
      track.className = 'ink-progress__track';
      const fill = document.createElement('div');
      fill.className = 'ink-progress__fill';
      fill.style.width = `${pct}%`;
      track.appendChild(fill);
      wrap.appendChild(track);
      this._fill = fill;
    } else {
      const stepsCount = Math.max(1, Math.min(1000, intAttr(this, 'steps', 5)));
      const filledSteps = Math.round((pct / 100) * stepsCount);
      const grid = document.createElement('div');
      grid.className = 'ink-progress__steps';
      for (let i = 0; i < stepsCount; i++) {
        const seg = document.createElement('span');
        seg.className = 'ink-progress__seg';
        if (i < filledSteps) seg.dataset.on = '';
        grid.appendChild(seg);
        this._segs.push(seg);
      }
      wrap.appendChild(grid);
      this._stepsGrid = grid;
    }

    if (label && !hideLabel) {
      const cap = document.createElement('div');
      cap.className = 'ink-progress__label';
      cap.textContent = `${label} · ${percentText(this, pct)}`;
      wrap.appendChild(cap);
      this._cap = cap;
    }

    this.replaceChildren(wrap);
  }

  private _patchLinear(pct: number): void {
    if (!this._fill) return;
    const w = `${pct}%`;
    if (this._fill.style.width !== w) this._fill.style.width = w;
  }

  private _patchSteps(pct: number): void {
    const stepsCount = Math.max(1, Math.min(1000, intAttr(this, 'steps', 5)));
    const filledSteps = Math.round((pct / 100) * stepsCount);

    while (this._segs.length < stepsCount) {
      const seg = document.createElement('span');
      seg.className = 'ink-progress__seg';
      this._stepsGrid!.appendChild(seg);
      this._segs.push(seg);
    }
    while (this._segs.length > stepsCount) {
      this._segs.pop()!.remove();
    }
    for (let i = 0; i < this._segs.length; i++) {
      patchBoolAttr(this._segs[i], 'data-on', i < filledSteps);
    }
  }

  private _patchCaption(label: string, hideLabel: boolean, pct: number): void {
    if (!label || hideLabel) {
      this._cap?.remove();
      this._cap = null;
      return;
    }
    if (!this._cap) {
      const cap = document.createElement('div');
      cap.className = 'ink-progress__label';
      this._wrap!.appendChild(cap);
      this._cap = cap;
    }
    patchText(this._cap, `${label} · ${percentText(this, pct)}`);
  }

  private _patch(): void {
    const value = Math.max(0, numAttr(this, 'value', 0));
    const max = Math.max(1, numAttr(this, 'max', 100));
    const pct = Math.min(100, Math.round((value / max) * 100));
    const label = this.getAttribute('label') || '';
    const hideLabel = boolAttr(this, 'hide-label');

    this._patchAria(value, max, label);

    if (this._variant === 'linear') {
      this._patchLinear(pct);
    } else if (this._variant === 'steps') {
      this._patchSteps(pct);
    }

    this._patchCaption(label, hideLabel, pct);
  }
}

define('e-progress', EProgress);
