import { boolAttr, define, esc, patchText, randId } from '../../core/dom';
import { t } from '../../core/i18n';
import { BaseFormControl } from '../../core/base-form-control';

/**
 * @summary On/off switch with an optional inline label and ON/OFF state pill.
 * @since v1.0.1
 *
 * Form-associated: submits its `value` (defaults to `"on"`) when checked.
 *
 * @attr {boolean} [checked] - Whether the switch is on. Reflected to the attribute on user input.
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables, per the HTML spec for form-associated elements — `disabled="false"` still disables.
 * @attr {string} [label] - Inline text label rendered next to the switch.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {string} [value='on'] - Submitted value when checked.
 * @attr {boolean} [required] - Requires the switch to be on.
 * @attr {string} [required-message] - Message reported when the required switch is off.
 *
 * @fires {CustomEvent<{checked: boolean}>} e-change - Fired when the checked state changes.
 *
 * @example
 * <e-toggle checked label="Enable notifications"></e-toggle>
 */
export class EToggle extends BaseFormControl {
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
  private _state: HTMLElement | null = null;

  private _syncFormValue(): void {
    const v = this.getAttribute('value') || 'on';
    const checked = !!this._cb?.checked;
    this.internals.setFormValue(checked ? v : null, checked ? 'checked' : 'unchecked');
    if (this._cb) {
      this._cb.required = boolAttr(this, 'required');
      this.applyRequiredValidity(checked, this._cb, t(this, 'requiredToggle'));
    }
  }

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const id = this.id ? `${this.id}-control` : randId('e-t');
    const checked = boolAttr(this, 'checked');
    // The HTML spec, not the library's `x="false"` convention, governs
    // `disabled` on a form-associated element: presence alone disables, and
    // that is what the browser reports through `formDisabledCallback`.
    const disabled = this.hasAttribute('disabled');
    const label = this.getAttribute('label') || '';
    this.innerHTML = `
      <label class="ink-toggle" for="${esc(id)}">
        <span style="position:relative;display:inline-flex">
          <input id="${esc(id)}" type="checkbox" role="switch" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}/>
          <span class="ink-toggle__track">
            <span class="ink-toggle__tick"></span>
            <span class="ink-toggle__thumb"></span>
          </span>
        </span>
        ${label ? `<span>${esc(label)}</span>` : ''}
        <span class="ink-toggle__state" aria-hidden="true">${esc(checked ? t(this, 'stateOn') : t(this, 'stateOff'))}</span>
      </label>`;
    this._cb = this.querySelector('input');
    this._state = this.querySelector('.ink-toggle__state');
    this._syncFormValue();
    this._cb!.addEventListener('change', (e) => {
      const v = (e.target as HTMLInputElement).checked;
      this._state!.textContent = v ? t(this, 'stateOn') : t(this, 'stateOff');
      if (v) this.setAttribute('checked', '');
      else this.removeAttribute('checked');
      this._syncFormValue();
      this.dispatchEvent(new CustomEvent('e-change', { detail: { checked: v }, bubbles: true }));
    });
  }

  attributeChangedCallback(name: string) {
    if (!this._cb) return;
    if (name === 'checked') this._syncChecked();
    // Presence alone disables — the HTML spec governs `disabled` here.
    if (name === 'disabled')
      this._cb.disabled = this.hasAttribute('disabled') || this._formDisabled;
    if (name === 'value') this._syncFormValue();
    if (name === 'required' || name === 'required-message') this._syncFormValue();
    if (name === 'label') this._syncLabel();
  }

  private _syncChecked(): void {
    const v = boolAttr(this, 'checked');
    if (this._cb!.checked !== v) this._cb!.checked = v;
    if (this._state) patchText(this._state, v ? t(this, 'stateOn') : t(this, 'stateOff'));
    this._syncFormValue();
  }

  /** Finds/creates/removes the label text span, which lives between the switch and the ON/OFF pill. */
  private _syncLabel(): void {
    const text = this.getAttribute('label') || '';
    const label = this.querySelector('label.ink-toggle') as HTMLElement | null;
    const state = this._state;
    if (!label) return;
    let span: HTMLElement | null = null;
    for (const child of label.children) {
      if (child === state) break;
      if (child.tagName === 'SPAN' && !child.hasAttribute('style')) {
        span = child as HTMLElement;
      }
    }
    if (text && !span) {
      span = document.createElement('span');
      span.textContent = text;
      if (state) state.before(span);
      else label.appendChild(span);
    } else if (!text && span) {
      span.remove();
    } else if (span) {
      patchText(span, text);
    }
  }

  get checked(): boolean {
    return this._cb?.checked || false;
  }
  set checked(v: boolean) {
    this._reflectChecked(v);
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
    if (this._cb && this._cb.checked !== v) this._syncChecked();
  }

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
    this._reflectChecked(this.hasAttribute('default-checked'));
    // Unconditional: a reset back to the state the attribute already names
    // still has to re-assert the input and the form value, because the native
    // reset of the inner input just moved them.
    this._syncChecked();
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

define('e-toggle', EToggle);
