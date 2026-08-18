import { boolAttr, define, esc, patchText, randId } from '../core/dom';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary On/off switch with an optional inline label and ON/OFF state pill.
 * @since v1.0.1
 *
 * Form-associated: submits its `value` (defaults to `"on"`) when checked.
 *
 * @attr {boolean} [checked] - Whether the switch is on. Reflected to the attribute on user input.
 * @attr {boolean} [disabled] - Disables interaction.
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
      this.applyRequiredValidity(checked, this._cb, 'Please turn on this switch.');
    }
  }

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const id = this.id ? `${this.id}-control` : randId('e-t');
    const checked = boolAttr(this, 'checked');
    const disabled = boolAttr(this, 'disabled');
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
        <span class="ink-toggle__state" aria-hidden="true">${checked ? 'ON' : 'OFF'}</span>
      </label>`;
    this._cb = this.querySelector('input');
    this._state = this.querySelector('.ink-toggle__state');
    this._syncFormValue();
    this._cb!.addEventListener('change', (e) => {
      const v = (e.target as HTMLInputElement).checked;
      this._state!.textContent = v ? 'ON' : 'OFF';
      if (v) this.setAttribute('checked', '');
      else this.removeAttribute('checked');
      this._syncFormValue();
      this.dispatchEvent(new CustomEvent('e-change', { detail: { checked: v }, bubbles: true }));
    });
  }

  attributeChangedCallback(name: string) {
    if (!this._cb) return;
    if (name === 'checked') {
      const v = boolAttr(this, 'checked');
      this._cb.checked = v;
      if (this._state) patchText(this._state, v ? 'ON' : 'OFF');
      this._syncFormValue();
    }
    if (name === 'disabled') this._cb.disabled = boolAttr(this, 'disabled') || this._formDisabled;
    if (name === 'value') this._syncFormValue();
    if (name === 'required' || name === 'required-message') this._syncFormValue();
    if (name === 'label') {
      const text = this.getAttribute('label') || '';
      const label = this.querySelector('label.ink-toggle') as HTMLElement | null;
      const state = this._state;
      if (!label) return;
      let span: HTMLElement | null = null;
      for (const child of [...label.children]) {
        if (child === state) break;
        if (child.tagName === 'SPAN' && !child.hasAttribute('style')) {
          span = child as HTMLElement;
        }
      }
      if (text && !span) {
        span = document.createElement('span');
        span.textContent = text;
        if (state) label.insertBefore(span, state);
        else label.appendChild(span);
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
    if (v) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
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
    this.checked = this.hasAttribute('default-checked');
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    this.checked = state === 'checked' || state === this.value;
  }

  protected override formDisabledChanged(): void {
    if (this._cb) this._cb.disabled = boolAttr(this, 'disabled') || this._formDisabled;
  }
}

define('e-toggle', EToggle);
