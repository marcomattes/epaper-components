import {
  boolAttr,
  define,
  esc,
  intAttr,
  numAttr,
  patchAttr,
  patchText,
  randId,
} from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';
import { formatNumber } from '../../core/format';
import { t } from '../../core/i18n';

const MAX_TICKS = 21;

/**
 * @summary Range slider with a wide grip, printed scale and optional tick marks.
 * @since v2.0.0
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * The grip is deliberately oversized and square: a round 12px thumb is
 * invisible on a 1-bit panel and unhittable through a kiosk's protective
 * sheet. The current value is always printed next to the track, because a
 * position alone is not readable on a display without sub-pixel rendering.
 *
 * @attr {number} [value] - Current value. Falls back to `default-value`, then to `min`.
 * @attr {number} [default-value] - Value restored by a form reset.
 * @attr {number} [min=0] - Lower bound.
 * @attr {number} [max=100] - Upper bound.
 * @attr {number} [step=1] - Step interval.
 * @attr {number} [ticks] - Number of tick intervals drawn under the track (2–20). Omit for none.
 * @attr {string} [label] - Label rendered above the track.
 * @attr {string} [hint] - Helper text rendered below the track.
 * @attr {string} [unit] - Unit appended to the printed value, e.g. `°C`.
 * @attr {boolean} [hide-value] - Hides the printed value readout.
 * @attr {boolean} [hide-scale] - Hides the min/max end labels.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables.
 *
 * @fires {CustomEvent<{value: number}>} e-input - Fired continuously while dragging.
 * @fires {CustomEvent<{value: number}>} e-change - Fired when the value is committed.
 *
 * @example
 * <e-slider name="brightness" min="0" max="100" step="5" ticks="10" label="Brightness"></e-slider>
 */
export class ESlider extends BaseFormControl<number> {
  static readonly observedAttributes = [
    'value',
    'min',
    'max',
    'step',
    'ticks',
    'label',
    'hint',
    'unit',
    'hide-value',
    'hide-scale',
    'disabled',
  ];

  private _wired = false;
  private _input: HTMLInputElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _output: HTMLOutputElement | null = null;
  private _ticksEl: HTMLElement | null = null;
  private _scaleMin: HTMLElement | null = null;
  private _scaleMax: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const id = this.id ? `${this.id}-control` : randId('e-sl');
    this.innerHTML = `<div class="ink-slider">
      <label class="ink-label" for="${esc(id)}"></label>
      <div class="ink-slider__row">
        <input class="ink-slider__input" id="${esc(id)}" type="range"/>
        <output class="ink-slider__value" for="${esc(id)}"></output>
      </div>
      <div class="ink-slider__ticks" aria-hidden="true"></div>
      <div class="ink-slider__scale" aria-hidden="true">
        <span class="ink-slider__scale-min"></span>
        <span class="ink-slider__scale-max"></span>
      </div>
      <div class="ink-hint"></div>
    </div>`;
    this._input = this.querySelector('input');
    this._labelEl = this.querySelector('label.ink-label');
    this._hintEl = this.querySelector('.ink-hint');
    this._output = this.querySelector('output');
    this._ticksEl = this.querySelector('.ink-slider__ticks');
    this._scaleMin = this.querySelector('.ink-slider__scale-min');
    this._scaleMax = this.querySelector('.ink-slider__scale-max');

    this._syncRange();
    this._value = this._clamp(
      numAttr(this, 'value', numAttr(this, 'default-value', this._bounds().min)),
    );
    this._input!.value = String(this._value);
    this.internals.setFormValue(this.serialize(this._value));
    this._syncTexts();
    this._syncTicks();
    this._syncReadout();

    // Listeners on the inner control, collected with the element itself —
    // no document listeners, so nothing to tear down.
    this._input!.addEventListener('input', () => this._read('e-input'));
    this._input!.addEventListener('change', () => this._read('e-change'));
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._input) return;
    if (name === 'disabled') {
      this._input.disabled = this.hasAttribute('disabled') || this._formDisabled;
      return;
    }
    if (name === 'label' || name === 'hint') {
      this._syncTexts();
      return;
    }
    if (name === 'value') {
      const next = this._clamp(Number(v));
      if (Number.isFinite(next) && next !== this._value) {
        this._value = next;
        this._input.value = String(next);
        this.internals.setFormValue(this.serialize(next));
      }
      this._syncReadout();
      return;
    }
    this._syncRange();
    this._value = this._clamp(Number(this._input.value));
    this._input.value = String(this._value);
    this.internals.setFormValue(this.serialize(this._value));
    this._syncTicks();
    this._syncReadout();
  }

  override get value(): number {
    return this._value;
  }
  override set value(v: number) {
    const next = this._clamp(Number(v));
    this._value = next;
    if (this._input) this._input.value = String(next);
    this.internals.setFormValue(this.serialize(next));
    this._syncReadout();
  }

  /** The value is always a clamped finite number, which is all `String` needs. */
  protected serialize = String;
  protected parse(s: string): number {
    const parsed = Number(s);
    return this._clamp(Number.isFinite(parsed) ? parsed : this._bounds().min);
  }

  protected override resetValue(): void {
    this.value = this.parse(this.getAttribute('default-value') ?? String(this._bounds().min));
  }

  protected override formDisabledChanged(): void {
    if (this._input) this._input.disabled = this.hasAttribute('disabled') || this._formDisabled;
  }

  private _bounds(): { min: number; max: number; step: number } {
    const min = numAttr(this, 'min', 0);
    const rawMax = numAttr(this, 'max', 100);
    const max = rawMax > min ? rawMax : min + 1;
    const rawStep = numAttr(this, 'step', 1);
    return { min, max, step: rawStep > 0 ? rawStep : 1 };
  }

  private _clamp(v: number): number {
    const { min, max } = this._bounds();
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  // The refs below are assigned together in `connectedCallback`, and the two
  // entry points that reach these helpers — that callback and
  // `attributeChangedCallback`, which returns early without an `<input>` —
  // have already proved them. Re-checking each one here only adds branches
  // that can never be taken.
  private _read(type: 'e-input' | 'e-change'): void {
    const next = Number(this._input!.value);
    this._value = next;
    this.internals.setFormValue(this.serialize(next));
    this._syncReadout();
    this.dispatchEvent(new CustomEvent(type, { detail: { value: next }, bubbles: true }));
  }

  private _syncRange(): void {
    const input = this._input!;
    const { min, max, step } = this._bounds();
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.disabled = this.hasAttribute('disabled') || this._formDisabled;
  }

  private _syncTexts(): void {
    const label = this.getAttribute('label') || '';
    patchText(this._labelEl!, label);
    patchAttr(this._labelEl!, 'hidden', label ? null : '');
    const hint = this.getAttribute('hint') || '';
    patchText(this._hintEl!, hint);
    patchAttr(this._hintEl!, 'hidden', hint ? null : '');
    patchAttr(
      this._input!,
      'aria-label',
      label ? null : this.getAttribute('aria-label') || t(this, 'slider'),
    );
  }

  /** One tick element per interval boundary, positioned as a percentage. */
  private _syncTicks(): void {
    const ticks = this._ticksEl!;
    const intervals = Math.min(MAX_TICKS - 1, Math.max(0, intAttr(this, 'ticks', 0)));
    const count = intervals >= 2 ? intervals + 1 : 0;
    while (ticks.children.length > count) ticks.lastElementChild!.remove();
    while (ticks.children.length < count) {
      const tick = document.createElement('span');
      tick.className = 'ink-slider__tick';
      ticks.appendChild(tick);
    }
    for (let index = 0; index < count; index++) {
      const tick = ticks.children[index] as HTMLElement;
      tick.style.left = `${(index / intervals) * 100}%`;
    }
    patchAttr(ticks, 'hidden', count ? null : '');
  }

  private _syncReadout(): void {
    if (!this._output || !this._scaleMin || !this._scaleMax) return;
    const { min, max } = this._bounds();
    const unit = this.getAttribute('unit') || '';
    const suffix = unit ? ` ${unit}` : '';
    // Grouping stays off: the readout sits inline next to the track, the same
    // choice `<e-meter>` makes for its own single-figure reading.
    patchText(this._output, `${formatNumber(this, this._value, { grouping: false })}${suffix}`);
    patchAttr(this._output, 'hidden', boolAttr(this, 'hide-value') ? '' : null);
    patchText(this._scaleMin, `${formatNumber(this, min, { grouping: false })}${suffix}`);
    patchText(this._scaleMax, `${formatNumber(this, max, { grouping: false })}${suffix}`);
    const scale = this._scaleMin.parentElement;
    if (scale) patchAttr(scale, 'hidden', boolAttr(this, 'hide-scale') ? '' : null);
  }
}

define('e-slider', ESlider);
