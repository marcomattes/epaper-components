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
    if (!this._wired) {
      this._wired = true;
      this.innerHTML = `
      <div class="ink-number">
        <button type="button" class="ink-number__btn" data-step="-1" aria-label="Decrement">${iconSvg('minus', 18)}</button>
        <input class="ink-number__input" type="number"/>
        <button type="button" class="ink-number__btn" data-step="1" aria-label="Increment">${iconSvg('plus', 18)}</button>
      </div>`;
      this._input = this.querySelector('input');
      this._initialiseInput();
    }

    this.addEventListener('click', this._onClick);
    this.addEventListener('mousedown', this._onMouseDown);
    this.addEventListener('mouseup', this._stopHold);
    this.addEventListener('mouseleave', this._stopHold);
    this.addEventListener('touchend', this._stopHold);
    this.addEventListener('touchcancel', this._stopHold);
    this._input?.addEventListener('change', this._onInputChange);
    addCleanup(this, () => {
      this.removeEventListener('click', this._onClick);
      this.removeEventListener('mousedown', this._onMouseDown);
      this.removeEventListener('mouseup', this._stopHold);
      this.removeEventListener('mouseleave', this._stopHold);
      this.removeEventListener('touchend', this._stopHold);
      this.removeEventListener('touchcancel', this._stopHold);
      this._input?.removeEventListener('change', this._onInputChange);
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
      this._setFiniteInputAttr('min', v);
    }
    if (name === 'max') {
      this._setFiniteInputAttr('max', v);
    }
    if (name === 'step') this._input.step = this._validStep(v);
  }

  override get value(): string {
    return this._input?.value ?? this._value;
  }
  override set value(v: string) {
    this.setAttribute('value', v ?? '');
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
    this._input.step = this._validStep(this.getAttribute('step'));
    this._setFiniteInputAttr('min', min);
    this._setFiniteInputAttr('max', max);
    this._value = initial;
    this.internals.setFormValue(initial);
  }

  private _step(direction: number): void {
    if (!this._input) return;
    if (direction > 0) this._input.stepUp(direction);
    else this._input.stepDown(Math.abs(direction));
    const next = this._input.value;
    this._value = next;
    this.internals.setFormValue(next);
    this.setAttribute('value', next);
    this.dispatchEvent(
      new CustomEvent('e-change', {
        detail: { value: Number(next) },
        bubbles: true,
      }),
    );
  }

  private _stopHold = (): void => {
    if (this._holdDelay != null) {
      clearTimeout(this._holdDelay);
      this._holdDelay = null;
    }
    if (this._holdTimer != null) {
      clearInterval(this._holdTimer);
      this._holdTimer = null;
    }
  };

  private _validStep(value: string | null): string {
    const parsed = Number(value ?? '1');
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '1';
  }

  private _setFiniteInputAttr(name: 'min' | 'max', value: string | null): void {
    if (!this._input) return;
    const parsed = value == null ? NaN : Number(value);
    if (Number.isFinite(parsed)) this._input.setAttribute(name, String(parsed));
    else this._input.removeAttribute(name);
  }

  private _onClick = (e: Event): void => {
    const button = (e.target as Element).closest<HTMLElement>('[data-step]');
    if (button) this._step(Number(button.dataset['step']));
  };

  private _onMouseDown = (e: MouseEvent): void => {
    const button = (e.target as Element).closest<HTMLElement>('[data-step]');
    if (!button) return;
    const direction = Number(button.dataset['step']);
    this._stopHold();
    this._holdDelay = setTimeout(() => {
      this._holdTimer = setInterval(() => this._step(direction), 200);
    }, 400);
  };

  private _onInputChange = (): void => {
    if (!this._input) return;
    const value = this._input.value;
    this._value = value;
    this.internals.setFormValue(value);
    this.setAttribute('value', value);
    this.dispatchEvent(
      new CustomEvent('e-change', {
        detail: { value: Number(value) },
        bubbles: true,
      }),
    );
  };
}

define('e-input-number', EInputNumber);
