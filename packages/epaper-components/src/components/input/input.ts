import { boolAttr, define, esc, randId } from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';
import { t } from '../../core/i18n';

/**
 * @summary Single-line text input with label, hint and error states.
 * @since v1.0.1
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
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables, per the HTML spec for form-associated elements — `disabled="false"` still disables.
 * @attr {boolean} [readonly] - Renders as a non-editable read-only input. Still submitted with the form.
 * @attr {boolean} [required] - Requires a non-empty value for form validation.
 * @attr {string} [required-message] - Overrides the native message reported when `required` is not satisfied.
 * @attr {string} [pattern] - Regular expression the value must match.
 * @attr {number} [minlength] - Minimum text length.
 * @attr {number} [maxlength] - Maximum text length.
 * @attr {string} [min] - Minimum value for numeric and date-like input types.
 * @attr {string} [max] - Maximum value for numeric and date-like input types.
 * @attr {string} [step] - Step interval for numeric and date-like input types.
 * @attr {string} [autocomplete] - Forwarded to the native `autocomplete` attribute.
 * @attr {string} [inputmode] - Forwarded to the native `inputmode` attribute (virtual keyboard layout).
 * @attr {string} [enterkeyhint] - Forwarded to the native `enterkeyhint` attribute.
 * @attr {string} [spellcheck] - Forwarded to the native `spellcheck` attribute.
 *
 * @fires {CustomEvent<{value: string}>} e-input - Fired on every keystroke.
 * @fires {CustomEvent<{value: string}>} e-change - Fired on commit (blur/Enter).
 *
 * @example
 * <e-input label="Name" placeholder="Ada Lovelace"></e-input>
 */
export class EInput extends BaseFormControl {
  static readonly observedAttributes = [
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
    'required-message',
    'pattern',
    'minlength',
    'maxlength',
    'min',
    'max',
    'step',
    'autocomplete',
    'inputmode',
    'enterkeyhint',
    'spellcheck',
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
    // `??`, not `||`: an explicit `value=""` is a value — the author saying
    // "start empty" — and must not fall through to `default-value`.
    const value = this.getAttribute('value') ?? this.getAttribute('default-value') ?? '';
    const ariaLabel = this.getAttribute('aria-label') || '';
    const error = boolAttr(this, 'error');
    // The HTML spec, not the library's `x="false"` convention, governs
    // `disabled` on a form-associated element: presence alone disables, and
    // that is what the browser reports through `formDisabledCallback`.
    const disabled = this.hasAttribute('disabled');
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
    for (const name of [
      'pattern',
      'minlength',
      'maxlength',
      'min',
      'max',
      'step',
      'autocomplete',
      'inputmode',
      'enterkeyhint',
      'spellcheck',
    ]) {
      this._syncNativeConstraint(name, this.getAttribute(name));
    }
    this._value = this._input!.value;
    this.internals.setFormValue(this._value);
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
      this._syncValidity();
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
    });
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._input) return;
    switch (name) {
      case 'value':
        this._applyValueAttr(v);
        break;
      case 'error':
      case 'error-message':
        this._syncValidity();
        break;
      case 'disabled':
        // Presence alone disables — the HTML spec governs `disabled` here.
        this._input.disabled = this.hasAttribute('disabled') || this._formDisabled;
        break;
      case 'readonly':
        this._input.readOnly = boolAttr(this, 'readonly');
        break;
      case 'aria-label':
        this._applyAriaLabelAttr(v);
        break;
      case 'placeholder':
        this._input.placeholder = v ?? '';
        break;
      case 'type':
        this._applyTypeAttr(v);
        break;
      case 'required':
      case 'required-message':
        this._input.required = boolAttr(this, 'required');
        this._syncValidity();
        break;
      case 'label':
        this._syncLabel(v ?? '');
        break;
      case 'hint':
        this._syncHint(v ?? '');
        break;
      default:
        this._applyConstraintAttr(name, v);
    }
  }

  private _applyValueAttr(v: string | null): void {
    const input = this._input!;
    if (input.value !== (v ?? '')) input.value = v ?? '';
    this._value = input.value;
    this.internals.setFormValue(this._value);
    this._syncValidity();
  }

  private _applyAriaLabelAttr(v: string | null): void {
    if (v) this._input!.setAttribute('aria-label', v);
    else this._input!.removeAttribute('aria-label');
  }

  private _applyTypeAttr(v: string | null): void {
    const input = this._input!;
    input.type = v || 'text';
    this._value = input.value;
    this.internals.setFormValue(this._value);
    this._syncValidity();
  }

  /** `pattern`/length/range constraints revalidate; passive UX hints just forward. */
  private _applyConstraintAttr(name: string, v: string | null): void {
    const validating = ['pattern', 'minlength', 'maxlength', 'min', 'max', 'step'];
    const passive = ['autocomplete', 'inputmode', 'enterkeyhint', 'spellcheck'];
    if (validating.includes(name)) {
      this._syncNativeConstraint(name, v);
      this._syncValidity();
    } else if (passive.includes(name)) {
      this._syncNativeConstraint(name, v);
    }
  }

  override get value(): string {
    return this._input?.value ?? this._value;
  }
  override set value(v: string) {
    if (this._input) {
      this._input.value = v;
      this._value = this._input.value;
    } else {
      this._value = v;
    }
    this.internals.setFormValue(this._value);
    this._syncValidity();
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return s;
  }

  private _syncValidity(): void {
    if (!this._input) return;
    this._input.required = boolAttr(this, 'required');
    const customMessage = boolAttr(this, 'error')
      ? (this.getAttribute('error-message') ?? t(this, 'invalidValue'))
      : undefined;
    if (!customMessage && this._input.validity.valueMissing) {
      const message = this.getAttribute('required-message');
      if (message) {
        // Only the message differs from the native one; when the violation is
        // shown stays with the base class's deferred-validation gate.
        this.internals.setValidity({ valueMissing: true }, message, this._input);
        this._markInvalid(this._input);
        return;
      }
    }
    this.mirrorNativeValidity(this._input, customMessage);
  }

  private _syncNativeConstraint(name: string, value: string | null): void {
    if (!this._input) return;
    if (value == null) this._input.removeAttribute(name);
    else this._input.setAttribute(name, value);
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
    // Presence alone disables — the HTML spec governs `disabled` here.
    if (this._input) this._input.disabled = this.hasAttribute('disabled') || this._formDisabled;
  }
}

define('e-input', EInput);
