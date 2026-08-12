import { addCleanup, define, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Numeric input with increment/decrement buttons.
 *
 * Form-associated: the value is submitted as a string (matching the behaviour
 * of `<input type="number">`). Step buttons support press-and-hold to repeat.
 *
 * @attr {string} [value] - Current numeric value as a string.
 * @attr {string} [default-value] - Initial value used by `formResetCallback`.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {string} [min] - Lower bound (inclusive).
 * @attr {string} [max] - Upper bound (inclusive).
 * @attr {string} [step='1'] - Step size for the buttons and native input.
 *
 * @fires {CustomEvent<{value: number}>} e-change - Fired when the value changes via buttons or native commit.
 *
 * @example
 * <e-input-number value="3" min="0" max="10" step="1"></e-input-number>
 */
export class EInputNumber extends BaseFormControl<string> {
  static observedAttributes = ['value', 'min', 'max', 'step'];

  private _wired = false;
  private _input: HTMLInputElement | null = null;
  private _holdTimer: ReturnType<typeof setInterval> | null = null;
  private _holdDelay: ReturnType<typeof setTimeout> | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `
      <div class="ink-number">
        <button type="button" class="ink-number__btn" data-step="-1" aria-label="Decrement">${iconSvg('minus', 18)}</button>
        <input class="ink-number__input" type="number"/>
        <button type="button" class="ink-number__btn" data-step="1" aria-label="Increment">${iconSvg('plus', 18)}</button>
      </div>`;
    this._input = this.querySelector('input');
    this._initialiseInput();

    const onClick = (e: Event) => {
      const btn = (e.target as Element).closest<HTMLElement>('[data-step]');
      if (!btn) return;
      this._step(Number(btn.dataset['step']));
    };
    this.addEventListener('click', onClick);
    addCleanup(this, () => this.removeEventListener('click', onClick));

    const onMouseDown = (e: MouseEvent) => {
      const btn = (e.target as Element).closest<HTMLElement>('[data-step]');
      if (!btn) return;
      const dir = Number(btn.dataset['step']);
      this._stopHold();
      this._holdDelay = setTimeout(() => {
        this._holdTimer = setInterval(() => this._step(dir), 200);
      }, 400);
    };
    this.addEventListener('mousedown', onMouseDown);
    addCleanup(this, () => this.removeEventListener('mousedown', onMouseDown));

    const stopHold = () => this._stopHold();
    this.addEventListener('mouseup', stopHold);
    this.addEventListener('mouseleave', stopHold);
    this.addEventListener('touchend', stopHold);
    this.addEventListener('touchcancel', stopHold);
    addCleanup(this, () => {
      this.removeEventListener('mouseup', stopHold);
      this.removeEventListener('mouseleave', stopHold);
      this.removeEventListener('touchend', stopHold);
      this.removeEventListener('touchcancel', stopHold);
    });

    this._input!.addEventListener('change', () => {
      const v = this._input!.value;
      this._value = v;
      this.internals.setFormValue(v);
      this.dispatchEvent(
        new CustomEvent('e-change', {
          detail: { value: Number(v) },
          bubbles: true,
        }),
      );
    });
  }

  disconnectedCallback() {
    this._stopHold();
    runCleanups(this);
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._input) return;
    if (name === 'value') {
      const next = v ?? '';
      this._input.value = next;
      this._value = next;
      this.internals.setFormValue(next);
    }
    if (name === 'min') {
      if (v == null) this._input.removeAttribute('min');
      else this._input.setAttribute('min', v);
    }
    if (name === 'max') {
      if (v == null) this._input.removeAttribute('max');
      else this._input.setAttribute('max', v);
    }
    if (name === 'step') this._input.setAttribute('step', v || '1');
  }

  override get value(): string {
    return this._input?.value ?? this._value;
  }
  override set value(v: string) {
    const next = v ?? '';
    this._value = next;
    if (this._input) this._input.value = next;
    this.internals.setFormValue(next);
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return s;
  }

  override formResetCallback(): void {
    const dflt = this.getAttribute('default-value') ?? '';
    this.value = dflt;
  }

  private _initialiseInput(): void {
    if (!this._input) return;
    const min = this.getAttribute('min');
    const max = this.getAttribute('max');
    const initial = this.getAttribute('value') ?? this.getAttribute('default-value') ?? '';
    this._input.value = initial;
    this._input.step = this.getAttribute('step') || '1';
    if (min != null) this._input.setAttribute('min', min);
    if (max != null) this._input.setAttribute('max', max);
    this._value = initial;
    this.internals.setFormValue(initial);
  }

  private _step(direction: number): void {
    if (!this._input) return;
    const step = Number(this.getAttribute('step') || '1');
    const min = this.getAttribute('min');
    const max = this.getAttribute('max');
    const cur = Number(this._input.value || 0);
    const next = cur + direction * step;
    const lo = min != null ? Number(min) : -Infinity;
    const hi = max != null ? Number(max) : Infinity;
    const clamped = String(Math.max(lo, Math.min(hi, next)));
    this._input.value = clamped;
    this._value = clamped;
    this.internals.setFormValue(clamped);
    this.dispatchEvent(
      new CustomEvent('e-change', {
        detail: { value: Number(clamped) },
        bubbles: true,
      }),
    );
  }

  private _stopHold(): void {
    if (this._holdDelay != null) {
      clearTimeout(this._holdDelay);
      this._holdDelay = null;
    }
    if (this._holdTimer != null) {
      clearInterval(this._holdTimer);
      this._holdTimer = null;
    }
  }
}

define('e-input-number', EInputNumber);
