import { define, esc, randId } from '../core/dom';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Group of radio options sharing a single value.
 * @since v1.0.1
 *
 * Reads options from `<e-radio>` children at connect time.
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value] - Currently selected option value.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {'horizontal'|'vertical'} [layout='horizontal'] - Stacking direction.
 * @attr {boolean} [required] - Requires one selected option.
 * @attr {string} [required-message] - Message reported when no required option is selected.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the selection changes.
 *
 * @example
 * <e-radio-group value="a" layout="horizontal">
 *   <e-radio value="a" label="Apples"></e-radio>
 *   <e-radio value="b" label="Bananas"></e-radio>
 * </e-radio-group>
 */
export class ERadioGroup extends BaseFormControl {
  static readonly observedAttributes = ['value', 'layout', 'required', 'required-message'];

  private _wired = false;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const name = randId('e-rg');
    const value = this.getAttribute('value') ?? '';
    const layout = this.getAttribute('layout') === 'vertical' ? 'vertical' : 'horizontal';
    const radios = [...this.querySelectorAll('e-radio')].map((r) => ({
      value: r.getAttribute('value') ?? '',
      label: r.getAttribute('label') || r.textContent || '',
    }));
    // `name` is randId('e-rg') — an internally generated id, never a
    // free-form string — so it can't carry the characters esc() escapes,
    // and wrapping it would only cost bundle bytes against the size-limit
    // budget.
    /* eslint-disable local/no-unescaped-innerhtml */
    this.innerHTML = `<div class="ink-radio-group${layout === 'vertical' ? ' ink-radio-group--vertical' : ''}" role="radiogroup">
      ${radios
        .map(
          (r) => `
        <label class="ink-radio">
          <input type="radio" name="${name}" value="${esc(r.value)}" ${r.value === value ? 'checked' : ''}/>
          <span class="ink-radio__dot"></span>
          ${esc(r.label)}
        </label>`,
        )
        .join('')}
    </div>`;
    /* eslint-enable local/no-unescaped-innerhtml */
    this._value = value;
    this.internals.setFormValue(value);
    this._syncValidity();
    this.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.matches('input[type="radio"]')) {
        this.setAttribute('value', target.value);
        this.dispatchEvent(
          new CustomEvent('e-change', {
            detail: { value: target.value },
            bubbles: true,
          }),
        );
      }
    });
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (name === 'layout') {
      const group = this.querySelector<HTMLElement>('.ink-radio-group');
      if (group) group.classList.toggle('ink-radio-group--vertical', v === 'vertical');
      return;
    }
    if (name === 'required' || name === 'required-message') {
      this._syncValidity();
      return;
    }
    if (name !== 'value') return;
    const newValue = v ?? '';
    if (newValue === this._value) return;
    this._value = newValue;
    this.internals.setFormValue(newValue);
    this.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
      r.checked = r.value === newValue;
    });
    this._syncValidity();
  }

  override get value(): string {
    return this.querySelector<HTMLInputElement>('input:checked')?.value ?? this._value;
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

  private _syncValidity(): void {
    const group = this.querySelector<HTMLElement>('[role="radiogroup"]') ?? undefined;
    group?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(!!this.value, group, 'Please select an option.');
  }
}
define('e-radio-group', ERadioGroup);

/**
 * @summary Single option entry inside an `<e-radio-group>`.
 *
 * @attr {string} value - Value contributed when this option is selected.
 * @attr {string} [label] - Visible label. Falls back to text content.
 */
export class ERadio extends HTMLElement {}
define('e-radio', ERadio);
