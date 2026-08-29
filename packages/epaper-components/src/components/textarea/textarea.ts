import { boolAttr, define, esc, intAttr, patchText, randId } from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';

/** Inline fallback height used when no `rows` is authored (pre-v2.0.0 default). */
const DEFAULT_MIN_HEIGHT = '96px';

/**
 * @summary Multi-line text input with label, hint, row sizing and error states.
 * @since v1.0.1
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * `label` and `hint` mirror `<e-input>`'s markup exactly (`.ink-label`
 * / `.ink-hint`), so a form built from both controls stays visually uniform.
 * Height is authored with `rows`; without it the control keeps its historic
 * `min-height: 96px`.
 *
 * @attr {string} [value] - Current value.
 * @attr {string} [label] - Label rendered above the textarea. @since v2.0.0
 * @attr {string} [hint] - Helper text rendered below the textarea. @since v2.0.0
 * @attr {number} [rows] - Visible text rows. Replaces the default `min-height: 96px` sizing. Values below 1 and non-integers are ignored. @since v2.0.0
 * @attr {string} [placeholder] - Native placeholder text.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [error] - Marks the textarea as invalid. Sets `aria-invalid="true"` and a custom `ElementInternals` validity error so `form.checkValidity()` returns `false`.
 * @attr {string} [error-message] - Message reported to `ElementInternals.setValidity` when `error` is set. Defaults to "Invalid value.".
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables, per the HTML spec for form-associated elements — `disabled="false"` still disables.
 * @attr {boolean} [readonly] - Renders as a non-editable read-only textarea. Still submitted with the form.
 * @attr {boolean} [required] - Requires a non-empty value for form validation.
 * @attr {string} [required-message] - Overrides the native message reported when `required` is not satisfied.
 * @attr {number} [minlength] - Minimum text length.
 * @attr {number} [maxlength] - Maximum text length. Setting it also renders a `current / max` character counter below the control. @since v2.0.0
 * @attr {string} [autocomplete] - Forwarded to the native `autocomplete` attribute.
 * @attr {string} [inputmode] - Forwarded to the native `inputmode` attribute (virtual keyboard layout).
 * @attr {string} [enterkeyhint] - Forwarded to the native `enterkeyhint` attribute.
 * @attr {string} [spellcheck] - Forwarded to the native `spellcheck` attribute.
 *
 * @fires {CustomEvent<{value: string}>} e-input - Fired on every keystroke.
 * @fires {CustomEvent<{value: string}>} e-change - Fired on commit (blur / Enter).
 *
 * @example
 * <e-textarea label="Notiz" hint="Max. 280 Zeichen" rows="6" maxlength="280"></e-textarea>
 */
export class ETextarea extends BaseFormControl {
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
    'rows',
    'required',
    'required-message',
    'minlength',
    'maxlength',
    'autocomplete',
    'inputmode',
    'enterkeyhint',
    'spellcheck',
  ];

  private _wired = false;
  private _ta: HTMLTextAreaElement | null = null;
  private _label: HTMLLabelElement | null = null;
  private _hint: HTMLElement | null = null;
  private _counter: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const id = this.id ? `${this.id}-control` : randId('e-ta');
    const value = this.getAttribute('value') || '';
    const label = this.getAttribute('label');
    const hint = this.getAttribute('hint');
    const placeholder = this.getAttribute('placeholder') || '';
    const ariaLabel = this.getAttribute('aria-label') || '';
    const error = boolAttr(this, 'error');
    // The HTML spec, not the library's `x="false"` convention, governs
    // `disabled` on a form-associated element: presence alone disables, and
    // that is what the browser reports through `formDisabledCallback`.
    const disabled = this.hasAttribute('disabled');
    const readonly = boolAttr(this, 'readonly');
    const required = boolAttr(this, 'required');
    // Concatenated rather than nested: `esc()` has to stay inline inside the
    // template the local no-unescaped-innerhtml rule inspects, so hoisting the
    // optional fragments into variables would blind that check (hard rule #1),
    // while nesting them would breach no-nested-template-literals. Joining
    // separate templates satisfies both.
    const flags = [
      ariaLabel ? `aria-label="${esc(ariaLabel)}"` : '',
      error ? 'aria-invalid="true"' : '',
      disabled ? 'disabled' : '',
      readonly ? 'readonly' : '',
      required ? 'required' : '',
    ]
      .filter(Boolean)
      .join(' ');
    this.innerHTML =
      (label ? `<label class="ink-label" for="${esc(id)}">${esc(label)}</label>` : '') +
      `<textarea class="ink-control" id="${esc(id)}" placeholder="${esc(placeholder)}" style="resize:vertical" ${flags}>${esc(value)}</textarea>` +
      (hint ? `<div class="ink-hint">${esc(hint)}</div>` : '');
    this._ta = this.querySelector('textarea');
    this._label = this.querySelector('label.ink-label');
    this._hint = this.querySelector('.ink-hint');
    this._syncRows();
    for (const name of [
      'minlength',
      'maxlength',
      'autocomplete',
      'inputmode',
      'enterkeyhint',
      'spellcheck',
    ]) {
      this._syncNativeConstraint(name, this.getAttribute(name));
    }
    this._value = value;
    this.internals.setFormValue(value);
    this._syncValidity();
    this._syncCounter();
    this._ta!.addEventListener('input', (e) => {
      const v = (e.target as HTMLTextAreaElement).value;
      this._value = v;
      this.internals.setFormValue(v);
      this._syncValidity();
      this._syncCounter();
      this.dispatchEvent(new CustomEvent('e-input', { detail: { value: v }, bubbles: true }));
    });
    this._ta!.addEventListener('change', (e) => {
      const v = (e.target as HTMLTextAreaElement).value;
      this._value = v;
      this.internals.setFormValue(v);
      this._syncValidity();
      this._syncCounter();
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
    });
  }

  // Split three ways purely to stay under the cognitive-complexity budget:
  // one flat if-chain over this many observed attributes reads as one
  // 20-branch function even though every branch is trivial.
  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._ta) return;
    this._applyValueAttr(name, v);
    this._applyPresentationAttr(name, v);
    this._applyConstraintAttr(name, v);
  }

  /** Attributes that change the submitted value or its validity. */
  private _applyValueAttr(name: string, v: string | null): void {
    const ta = this._ta!;
    if (name === 'value') {
      if (ta.value !== (v ?? '')) ta.value = v ?? '';
      this._value = v ?? '';
      this.internals.setFormValue(this._value);
      this._syncValidity();
      this._syncCounter();
    }
    if (name === 'error' || name === 'error-message') this._syncValidity();
    if (name === 'required' || name === 'required-message') {
      ta.required = boolAttr(this, 'required');
      this._syncValidity();
    }
  }

  /** Attributes that only change how the control presents itself. */
  private _applyPresentationAttr(name: string, v: string | null): void {
    const ta = this._ta!;
    if (name === 'aria-label') {
      if (v) ta.setAttribute('aria-label', v);
      else ta.removeAttribute('aria-label');
    }
    // Presence alone disables — the HTML spec governs `disabled` here.
    if (name === 'disabled') ta.disabled = this.hasAttribute('disabled') || this._formDisabled;
    if (name === 'readonly') ta.readOnly = boolAttr(this, 'readonly');
    if (name === 'placeholder') ta.placeholder = v ?? '';
    if (name === 'label') this._syncLabel(v ?? '');
    if (name === 'hint') this._syncHint(v ?? '');
    if (name === 'rows') this._syncRows();
  }

  /** Attributes forwarded to the native textarea as-is. */
  private _applyConstraintAttr(name: string, v: string | null): void {
    if (name === 'minlength' || name === 'maxlength') {
      this._syncNativeConstraint(name, v);
      this._syncValidity();
      if (name === 'maxlength') this._syncCounter();
      return;
    }
    if (['autocomplete', 'inputmode', 'enterkeyhint', 'spellcheck'].includes(name)) {
      this._syncNativeConstraint(name, v);
    }
  }

  override get value(): string {
    return this._ta?.value ?? this._value;
  }
  override set value(v: string) {
    this._value = v ?? '';
    if (this._ta) this._ta.value = this._value;
    this.internals.setFormValue(this._value);
    this._syncValidity();
    this._syncCounter();
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return s;
  }

  private _syncValidity(): void {
    if (!this._ta) return;
    this._ta.required = boolAttr(this, 'required');
    const customMessage = boolAttr(this, 'error')
      ? (this.getAttribute('error-message') ?? 'Invalid value.')
      : undefined;
    if (!customMessage && this._ta.validity.valueMissing) {
      const message = this.getAttribute('required-message');
      if (message) {
        // Only the message differs from the native one; when the violation is
        // shown stays with the base class's deferred-validation gate.
        this.internals.setValidity({ valueMissing: true }, message, this._ta);
        this._markInvalid(this._ta);
        return;
      }
    }
    this.mirrorNativeValidity(this._ta, customMessage);
  }

  private _syncNativeConstraint(name: string, value: string | null): void {
    if (!this._ta) return;
    if (value == null) this._ta.removeAttribute(name);
    else this._ta.setAttribute(name, value);
  }

  /**
   * `rows` owns the height when authored; otherwise the pre-v2.0.0
   * `min-height` keeps the control the size existing layouts expect.
   */
  private _syncRows(): void {
    if (!this._ta) return;
    const rows = intAttr(this, 'rows', 0);
    if (this.hasAttribute('rows') && rows >= 1) {
      this._ta.rows = rows;
      this._ta.style.minHeight = '';
    } else {
      this._ta.removeAttribute('rows');
      this._ta.style.minHeight = DEFAULT_MIN_HEIGHT;
    }
  }

  private _syncLabel(value: string): void {
    if (!this._ta) return;
    if (value && !this._label) {
      const label = document.createElement('label');
      label.className = 'ink-label';
      label.htmlFor = this._ta.id;
      label.textContent = value;
      this.insertBefore(label, this._ta);
      this._label = label;
    } else if (!value && this._label) {
      this._label.remove();
      this._label = null;
    } else if (this._label) {
      patchText(this._label, value);
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
      patchText(this._hint, value);
    }
  }

  /**
   * A `current / max` readout, rendered only while `maxlength` is set. It is
   * not a live region: an e-paper panel cannot afford a repaint per keystroke
   * announcement, and the native `maxlength` already blocks overtyping.
   */
  private _syncCounter(): void {
    if (!this._ta) return;
    const max = this.getAttribute('maxlength');
    if (max == null || max.trim() === '') {
      this._counter?.remove();
      this._counter = null;
      return;
    }
    if (!this._counter) {
      const counter = document.createElement('div');
      counter.className = 'ink-textarea__counter';
      this._ta.after(counter);
      this._counter = counter;
    }
    patchText(this._counter, `${this._ta.value.length} / ${max}`);
  }

  protected override formDisabledChanged(): void {
    // Presence alone disables — the HTML spec governs `disabled` here.
    if (this._ta) this._ta.disabled = this.hasAttribute('disabled') || this._formDisabled;
  }
}

define('e-textarea', ETextarea);
