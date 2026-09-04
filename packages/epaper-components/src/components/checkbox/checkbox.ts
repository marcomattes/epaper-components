import { boolAttr, define, esc, patchText, randId } from '../../core/dom';
import { t } from '../../core/i18n';
import { BaseFormControl } from '../../core/base-form-control';

/**
 * @summary Single checkbox with an optional inline label.
 * @since v1.0.1
 *
 * Form-associated: submits its `value` (defaults to `"on"`) when checked,
 * matching native `<input type="checkbox">` behaviour.
 *
 * @attr {boolean} [checked] - Whether the box is checked. Reflected to the attribute on user input.
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables, per the HTML spec for form-associated elements — `disabled="false"` still disables.
 * @attr {string} [label] - Inline text label rendered next to the box.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {string} [value='on'] - Submitted value when checked.
 * @attr {boolean} [required] - Requires the checkbox to be checked.
 * @attr {string} [required-message] - Message reported when the required checkbox is unchecked.
 *
 * @fires {CustomEvent<{checked: boolean}>} e-change - Fired when the checked state changes.
 *
 * @example
 * <e-checkbox checked label="Accept terms"></e-checkbox>
 */
export class ECheckbox extends BaseFormControl {
  static readonly observedAttributes = [
    'checked',
    'label',
    'disabled',
    'value',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _cb: HTMLInputElement | null = null;

  private _syncFormValue(): void {
    const v = this.getAttribute('value') || 'on';
    const checked = !!this._cb?.checked;
    this.internals.setFormValue(checked ? v : null, checked ? 'checked' : 'unchecked');
    if (this._cb) {
      this._cb.required = boolAttr(this, 'required');
      this.applyRequiredValidity(checked, this._cb, t(this, 'requiredCheck'));
    }
  }

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const id = this.id ? `${this.id}-control` : randId('e-c');
    const checked = boolAttr(this, 'checked');
    // The HTML spec, not the library's `x="false"` convention, governs
    // `disabled` on a form-associated element: presence alone disables, and
    // that is what the browser reports through `formDisabledCallback`.
    const disabled = this.hasAttribute('disabled');
    const label = this.getAttribute('label') || '';
    this.innerHTML = `
      <label class="ink-checkbox" for="${esc(id)}">
        <span style="position:relative;display:inline-flex">
          <input id="${esc(id)}" type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}/>
          <span class="ink-checkbox__box">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 8.5l4 4 8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="square"/>
            </svg>
          </span>
        </span>
        ${label ? `<span>${esc(label)}</span>` : ''}
      </label>`;
    this._cb = this.querySelector('input');
    this._syncFormValue();
    this._cb!.addEventListener('change', (e) => {
      const v = (e.target as HTMLInputElement).checked;
      this._reflectChecked(v);
      this._syncFormValue();
      this.dispatchEvent(new CustomEvent('e-change', { detail: { checked: v }, bubbles: true }));
    });
  }

  /**
   * Write the checked state to both places that hold it: the host attribute
   * and the native input.
   *
   * Going through the attribute alone was not enough. `toggleAttribute` is a
   * no-op when the attribute already matches, so `attributeChangedCallback`
   * never ran and the input kept whatever the browser had just put there —
   * which is exactly the situation `form.reset()` creates, since it resets the
   * inner input to its *rendered* `checked` before this callback runs. The
   * result was a box drawn checked while the form submitted nothing. The same
   * mismatch reached `checked="false"`, where the attribute is present but
   * false, so `toggleAttribute(…, true)` left it saying the opposite of the
   * state it was setting.
   */
  private _reflectChecked(v: boolean): void {
    if (v) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
    if (this._cb && this._cb.checked !== v) {
      this._cb.checked = v;
      this._syncFormValue();
    }
  }

  attributeChangedCallback(name: string) {
    if (!this._cb) return;
    if (name === 'checked') {
      this._cb.checked = boolAttr(this, 'checked');
      this._syncFormValue();
    }
    // Presence alone disables — the HTML spec governs `disabled` here.
    if (name === 'disabled')
      this._cb.disabled = this.hasAttribute('disabled') || this._formDisabled;
    if (name === 'value') this._syncFormValue();
    if (name === 'required' || name === 'required-message') this._syncFormValue();
    if (name === 'label') {
      const text = this.getAttribute('label') || '';
      const label = this.querySelector('label.ink-checkbox') as HTMLElement | null;
      if (!label) return;
      let span = label.querySelector<HTMLElement>(':scope > span:not([style])');
      if (text && !span) {
        span = document.createElement('span');
        span.textContent = text;
        label.appendChild(span);
      } else if (!text && span) {
        span.remove();
      } else if (span) {
        patchText(span, text);
      }
    }
  }

  get checked(): boolean {
    return this._cb?.checked || false;
  }
  set checked(v: boolean) {
    this._reflectChecked(v);
  }

  /** Submitted value when checked (defaults to "on"). */
  override get value(): string {
    return this.getAttribute('value') || 'on';
  }
  override set value(v: string) {
    this.setAttribute('value', v);
    this._syncFormValue();
  }

  protected serialize(v: string): string | null {
    return this._cb?.checked ? v || 'on' : null;
  }
  protected parse(s: string): string {
    return s;
  }

  protected override resetValue(): void {
    const dflt = this.hasAttribute('default-checked');
    this._reflectChecked(dflt);
    // Unconditional: a reset back to the state the attribute already names
    // still has to re-assert the input and the form value, because the native
    // reset of the inner input just moved them.
    if (this._cb) this._cb.checked = dflt;
    this._syncFormValue();
  }

  /** Restore the checked state from the back-forward cache. */
  override formStateRestoreCallback(state: string | File | FormData | null): void {
    // No stored state means nothing to restore; the live state stands.
    if (state == null) return;
    this.checked = state === 'checked' || state === this.value;
  }

  protected override formDisabledChanged(): void {
    // Presence alone disables — the HTML spec governs `disabled` here.
    if (this._cb) this._cb.disabled = this.hasAttribute('disabled') || this._formDisabled;
  }
}

define('e-checkbox', ECheckbox);
