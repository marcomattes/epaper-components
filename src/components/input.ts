import { boolAttr, define, esc, randId } from '../core/dom';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Single-line text input with label, hint and error states.
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [label] - Label rendered above the input.
 * @attr {string} [hint] - Helper text rendered below the input.
 * @attr {string} [placeholder] - Native placeholder text.
 * @attr {string} [type='text'] - Native input type.
 * @attr {string} [value] - Current value. Reflected via the `value` property.
 * @attr {string} [default-value] - Initial value used when `value` is not set.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [error] - Marks the input as invalid. Sets `aria-invalid="true"` and a custom `ElementInternals` validity error so `form.checkValidity()` returns `false`.
 * @attr {string} [error-message] - Message reported to `ElementInternals.setValidity` when `error` is set. Defaults to "Invalid value.".
 * @attr {boolean} [disabled] - Disables interaction.
 * @attr {boolean} [readonly] - Renders as a non-editable read-only input. Still submitted with the form.
 * @attr {boolean} [required] - Requires a non-empty value for form validation.
 *
 * @fires {CustomEvent<{value: string}>} e-input - Fired on every keystroke.
 * @fires {CustomEvent<{value: string}>} e-change - Fired on commit (blur/Enter).
 *
 * @example
 * <e-input label="Name" placeholder="Ada Lovelace"></e-input>
 */
export class EInput extends BaseFormControl {
  static observedAttributes = [
    'value',
    'error',
    'error-message',
    'disabled',
    'readonly',
    'aria-label',
    'placeholder',
    'label',
    'hint',
    'type',
    'required',
  ];

  private _wired = false;
  private _input: HTMLInputElement | null = null;
  private _label: HTMLLabelElement | null = null;
  private _hint: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const id = this.id ? `${this.id}-control` : randId('e-i');
    const label = this.getAttribute('label');
    const hint = this.getAttribute('hint');
    const type = this.getAttribute('type') || 'text';
    const placeholder = this.getAttribute('placeholder') || '';
    const value = this.getAttribute('value') || this.getAttribute('default-value') || '';
    const ariaLabel = this.getAttribute('aria-label') || '';
    const error = boolAttr(this, 'error');
    const disabled = boolAttr(this, 'disabled');
    const readonly = boolAttr(this, 'readonly');
    const required = boolAttr(this, 'required');
    this.innerHTML = `
      ${label ? `<label class="ink-label" for="${esc(id)}">${esc(label)}</label>` : ''}
      <input class="ink-control" id="${esc(id)}" type="${esc(type)}"
             placeholder="${esc(placeholder)}" value="${esc(value)}"
             ${ariaLabel ? `aria-label="${esc(ariaLabel)}"` : ''}
             ${error ? 'aria-invalid="true"' : ''} ${disabled ? 'disabled' : ''} ${readonly ? 'readonly' : ''} ${required ? 'required' : ''}/>
      ${hint ? `<div class="ink-hint">${esc(hint)}</div>` : ''}
    `;
    this._input = this.querySelector('input');
    this._label = this.querySelector('label.ink-label');
    this._hint = this.querySelector('.ink-hint');
    this._value = value;
    this.internals.setFormValue(value);
    this._syncValidity();
    this._input!.addEventListener('input', (e) => {
      const v = (e.target as HTMLInputElement).value;
      this._value = v;
      this.internals.setFormValue(v);
      this._syncValidity();
      this.dispatchEvent(new CustomEvent('e-input', { detail: { value: v }, bubbles: true }));
    });
    this._input!.addEventListener('change', (e) => {
      const v = (e.target as HTMLInputElement).value;
      this._value = v;
      this.internals.setFormValue(v);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
    });
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._input) return;
    if (name === 'value') {
      if (this._input.value !== (v ?? '')) this._input.value = v ?? '';
      this._value = v ?? '';
      this.internals.setFormValue(this._value);
    }
    if (name === 'error' || name === 'error-message') {
      const on = boolAttr(this, 'error');
      if (on) this._input.setAttribute('aria-invalid', 'true');
      else this._input.removeAttribute('aria-invalid');
      this._syncValidity();
    }
    if (name === 'disabled') {
      this._input.disabled = boolAttr(this, 'disabled') || this._formDisabled;
    }
    if (name === 'readonly') {
      this._input.readOnly = boolAttr(this, 'readonly');
    }
    if (name === 'aria-label') {
      if (v) this._input.setAttribute('aria-label', v);
      else this._input.removeAttribute('aria-label');
    }
    if (name === 'placeholder') {
      this._input.placeholder = v ?? '';
    }
    if (name === 'type') this._input.type = v || 'text';
    if (name === 'required') {
      this._input.required = boolAttr(this, 'required');
      this._syncValidity();
    }
    if (name === 'label') this._syncLabel(v ?? '');
    if (name === 'hint') this._syncHint(v ?? '');
  }

  override get value(): string {
    return this._input?.value ?? this._value;
  }
  override set value(v: string) {
    this._value = v ?? '';
    if (this._input) this._input.value = this._value;
    this.internals.setFormValue(this._value);
    this._syncValidity();
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
    this._syncValidity();
  }

  private _syncValidity(): void {
    if (boolAttr(this, 'error')) {
      const msg = this.getAttribute('error-message') ?? 'Invalid value.';
      this.internals.setValidity({ customError: true }, msg, this._input ?? undefined);
    } else if (boolAttr(this, 'required') && !this.value) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please fill out this field.',
        this._input ?? undefined,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  private _syncLabel(value: string): void {
    if (!this._input) return;
    if (value && !this._label) {
      const label = document.createElement('label');
      label.className = 'ink-label';
      label.htmlFor = this._input.id;
      label.textContent = value;
      this.insertBefore(label, this._input);
      this._label = label;
    } else if (!value && this._label) {
      this._label.remove();
      this._label = null;
    } else if (this._label) {
      this._label.textContent = value;
    }
  }

  private _syncHint(value: string): void {
    if (value && !this._hint) {
      const hint = document.createElement('div');
      hint.className = 'ink-hint';
      hint.textContent = value;
      this.appendChild(hint);
      this._hint = hint;
    } else if (!value && this._hint) {
      this._hint.remove();
      this._hint = null;
    } else if (this._hint) {
      this._hint.textContent = value;
    }
  }

  protected override formDisabledChanged(): void {
    if (this._input) this._input.disabled = boolAttr(this, 'disabled') || this._formDisabled;
  }
}

define('e-input', EInput);
