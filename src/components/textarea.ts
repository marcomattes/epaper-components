import { boolAttr, define, esc } from '../core/dom';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Multi-line text input with error and disabled states.
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value] - Current value.
 * @attr {string} [placeholder] - Native placeholder text.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [error] - Marks the textarea as invalid. Sets `aria-invalid="true"` and a custom `ElementInternals` validity error so `form.checkValidity()` returns `false`.
 * @attr {string} [error-message] - Message reported to `ElementInternals.setValidity` when `error` is set. Defaults to "Invalid value.".
 * @attr {boolean} [disabled] - Disables interaction.
 * @attr {boolean} [readonly] - Renders as a non-editable read-only textarea. Still submitted with the form.
 * @attr {boolean} [required] - Requires a non-empty value for form validation.
 *
 * @fires {CustomEvent<{value: string}>} e-input - Fired on every keystroke.
 * @fires {CustomEvent<{value: string}>} e-change - Fired on commit (blur / Enter).
 *
 * @example
 * <e-textarea placeholder="Notes…"></e-textarea>
 */
export class ETextarea extends BaseFormControl {
  static observedAttributes = [
    'value',
    'error',
    'error-message',
    'disabled',
    'readonly',
    'aria-label',
    'placeholder',
    'required',
  ];

  private _wired = false;
  private _ta: HTMLTextAreaElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const value = this.getAttribute('value') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const ariaLabel = this.getAttribute('aria-label') || '';
    const error = boolAttr(this, 'error');
    const disabled = boolAttr(this, 'disabled');
    const readonly = boolAttr(this, 'readonly');
    const required = boolAttr(this, 'required');
    this.innerHTML = `<textarea class="ink-control" placeholder="${esc(placeholder)}"
      style="min-height:96px;resize:vertical"
      ${ariaLabel ? `aria-label="${esc(ariaLabel)}"` : ''}
      ${error ? 'aria-invalid="true"' : ''} ${disabled ? 'disabled' : ''} ${readonly ? 'readonly' : ''} ${required ? 'required' : ''}>${esc(value)}</textarea>`;
    this._ta = this.querySelector('textarea');
    this._value = value;
    this.internals.setFormValue(value);
    this._syncValidity();
    this._ta!.addEventListener('input', (e) => {
      const v = (e.target as HTMLTextAreaElement).value;
      this._value = v;
      this.internals.setFormValue(v);
      this._syncValidity();
      this.dispatchEvent(new CustomEvent('e-input', { detail: { value: v }, bubbles: true }));
    });
    this._ta!.addEventListener('change', (e) => {
      const v = (e.target as HTMLTextAreaElement).value;
      this._value = v;
      this.internals.setFormValue(v);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
    });
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._ta) return;
    if (name === 'value') {
      if (this._ta.value !== (v ?? '')) this._ta.value = v ?? '';
      this._value = v ?? '';
      this.internals.setFormValue(this._value);
    }
    if (name === 'aria-label') {
      if (v) this._ta.setAttribute('aria-label', v);
      else this._ta.removeAttribute('aria-label');
    }
    if (name === 'error' || name === 'error-message') {
      const on = boolAttr(this, 'error');
      if (on) this._ta.setAttribute('aria-invalid', 'true');
      else this._ta.removeAttribute('aria-invalid');
      this._syncValidity();
    }
    if (name === 'disabled') this._ta.disabled = boolAttr(this, 'disabled') || this._formDisabled;
    if (name === 'readonly') this._ta.readOnly = boolAttr(this, 'readonly');
    if (name === 'placeholder') this._ta.placeholder = v ?? '';
    if (name === 'required') {
      this._ta.required = boolAttr(this, 'required');
      this._syncValidity();
    }
  }

  override get value(): string {
    return this._ta?.value ?? this._value;
  }
  override set value(v: string) {
    this._value = v ?? '';
    if (this._ta) this._ta.value = this._value;
    this.internals.setFormValue(this._value);
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
      this.internals.setValidity({ customError: true }, msg, this._ta ?? undefined);
    } else if (boolAttr(this, 'required') && !this.value) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please fill out this field.',
        this._ta ?? undefined,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  protected override formDisabledChanged(): void {
    if (this._ta) this._ta.disabled = boolAttr(this, 'disabled') || this._formDisabled;
  }
}

define('e-textarea', ETextarea);
