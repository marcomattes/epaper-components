import { addCleanup, define, runCleanups } from '../core/dom';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Group of checkbox options sharing a single comma-separated value.
 * @since v1.0.1
 *
 * Reads options from `<e-cbox-option>` children at connect time.
 * Form-associated: each selected option is appended to FormData under `name`.
 *
 * @attr {string} [value] - Comma-separated list of selected option values. Reactive.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {'horizontal'|'vertical'} [layout='vertical'] - Stacking direction. Reactive.
 * @attr {boolean} [required] - Requires at least one selected option.
 * @attr {string} [required-message] - Message reported when no required option is selected.
 *
 * @fires {CustomEvent<{value: string[]}>} e-change - Fired when the selection changes. `value` is the array of selected option values.
 *
 * @example
 * <e-checkbox-group value="a,b" layout="horizontal">
 *   <e-cbox-option value="a" label="Apples"></e-cbox-option>
 *   <e-cbox-option value="b" label="Bananas"></e-cbox-option>
 * </e-checkbox-group>
 */
export class ECheckboxGroup extends BaseFormControl {
  static observedAttributes = ['value', 'layout', 'required', 'required-message'];

  private _wired = false;
  private _opts: Array<{ value: string; label: string }> = [];
  private _container: HTMLDivElement | null = null;

  private _syncFormValue(values: string[]): void {
    const name = this.getAttribute('name');
    if (!name) {
      this.internals.setFormValue(values.join(','));
      this._syncValidity(values);
      return;
    }
    const fd = new FormData();
    for (const v of values) fd.append(name, v);
    this.internals.setFormValue(fd);
    this._syncValidity(values);
  }

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._opts = [...this.querySelectorAll('e-cbox-option')].map((o) => ({
        value: o.getAttribute('value') ?? '',
        label: o.getAttribute('label') || o.textContent || o.getAttribute('value') || '',
      }));
      this._build();
    }
    this.addEventListener('change', this._onChange);
    addCleanup(this, () => this.removeEventListener('change', this._onChange));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private _onChange = (): void => {
    const v = [...this.querySelectorAll<HTMLInputElement>('input:checked')].map((i) => i.value);
    this._value = v.join(',');
    this.setAttribute('value', this._value);
    this._syncFormValue(v);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
  };

  attributeChangedCallback(name: string, _o: string | null, v: string | null) {
    if (!this._wired) return;
    if (name === 'value') {
      const next = v ?? '';
      if (next === this._value) return;
      this._value = next;
      const set = new Set(next.split(',').filter(Boolean));
      this.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
        cb.checked = set.has(cb.value);
      });
      this._syncFormValue([...set]);
    } else if (name === 'layout') {
      if (this._container)
        this._container.style.flexDirection =
          this.getAttribute('layout') === 'horizontal' ? 'row' : 'column';
    } else if (name === 'required' || name === 'required-message') {
      this._syncValidity(this.value.split(',').filter(Boolean));
    }
  }

  override formResetCallback(): void {
    const dflt = this.getAttribute('default-value') ?? '';
    this.value = dflt;
  }

  private _build(): void {
    const value = (this.getAttribute('value') || '').split(',').filter(Boolean);
    const layout = this.getAttribute('layout') === 'horizontal' ? 'row' : 'column';

    const container = document.createElement('div');
    container.setAttribute('role', 'group');
    container.style.display = 'flex';
    container.style.flexDirection = layout;
    container.style.gap = '10px';
    container.style.flexWrap = 'wrap';
    this._container = container;

    for (const o of this._opts) {
      const label = document.createElement('label');
      label.className = 'ink-checkbox';

      const wrapper = document.createElement('span');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-flex';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = o.value;
      input.checked = value.includes(o.value);

      const box = document.createElement('span');
      box.className = 'ink-checkbox__box';
      box.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M2 8.5l4 4 8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="square"/>' +
        '</svg>';

      wrapper.appendChild(input);
      wrapper.appendChild(box);

      const text = document.createElement('span');
      text.textContent = o.label;

      label.appendChild(wrapper);
      label.appendChild(text);
      container.appendChild(label);
    }

    this.replaceChildren(container);
    this._value = value.join(',');
    this._syncFormValue(value);
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    this.setAttribute('value', v ?? '');
  }

  protected serialize(v: string): FormData | string {
    const name = this.getAttribute('name');
    const values = (v ?? '').split(',').filter(Boolean);
    if (!name) return values.join(',');
    const fd = new FormData();
    for (const item of values) fd.append(name, item);
    return fd;
  }
  protected parse(s: string): string {
    return s;
  }

  protected override parseFormData(fd: FormData): string {
    const name = this.getAttribute('name');
    if (!name) return '';
    return fd
      .getAll(name)
      .filter((v): v is string => typeof v === 'string')
      .join(',');
  }

  private _syncValidity(values: string[]): void {
    this._container?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(
      values.length > 0,
      this._container ?? undefined,
      'Please select at least one option.',
    );
  }
}
define('e-checkbox-group', ECheckboxGroup);

/**
 * @summary Single option entry inside an `<e-checkbox-group>`.
 *
 * Acts as a data carrier; the parent renders the actual checkbox.
 *
 * @attr {string} value - Value contributed when this option is checked.
 * @attr {string} [label] - Visible label. Falls back to text content, then to `value`.
 */
export class ECboxOption extends HTMLElement {}
define('e-cbox-option', ECboxOption);
