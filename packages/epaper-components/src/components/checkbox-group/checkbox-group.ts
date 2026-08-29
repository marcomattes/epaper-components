import {
  addCleanup,
  boolAttr,
  define,
  EpaperElement,
  observeItems,
  patchAttr,
  patchText,
  runCleanups,
} from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';

/** Rendered `<label>`/`<input>` pair for a single `<e-cbox-option>`. */
interface CboxRow {
  label: HTMLLabelElement;
  input: HTMLInputElement;
  text: HTMLElement;
}

/**
 * @summary Group of checkbox options sharing a single comma-separated value.
 * @since v1.0.1
 *
 * Reads options from `<e-cbox-option>` children and keeps them live: the
 * authored items stay in the light DOM as the source of truth, and a
 * `MutationObserver` re-syncs the rendered checkboxes whenever one is added,
 * removed, reordered, relabelled or re-valued. Rows keep their DOM identity by
 * position, and `checked` is always re-derived from the group's own `value` —
 * the same source of truth an attribute-driven update already used — so an
 * unrelated option changing never moves the current selection.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is first wired. The stable form
 * of that is a `e-cbox-option { display: none; }` rule in `components.css`;
 * the inline style is what guarantees it without one.
 *
 * Form-associated: each selected option is appended to FormData under `name`.
 *
 * @attr {string} [value] - Comma-separated list of selected option values. Reactive.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {'horizontal'|'vertical'} [layout='vertical'] - Stacking direction. Reactive.
 * @attr {boolean} [disabled] - Disables every option: none can be focused or toggled. Presence
 *   alone disables, per the HTML spec for form-associated elements — `disabled="false"` still
 *   disables. Also applied by a surrounding `<fieldset disabled>`.
 * @attr {boolean} [required] - Requires at least one selected option.
 * @attr {string} [required-message] - Message reported when no required option is selected.
 *
 * @fires {CustomEvent<{value: string[]}>} e-change - Fired when the selection changes. `value` is the array of selected option values.
 *
 * @slot - Default slot for `<e-cbox-option>` children.
 *
 * @example
 * <e-checkbox-group value="a,b" layout="horizontal">
 *   <e-cbox-option value="a" label="Apples"></e-cbox-option>
 *   <e-cbox-option value="b" label="Bananas"></e-cbox-option>
 * </e-checkbox-group>
 */
export class ECheckboxGroup extends BaseFormControl {
  static readonly observedAttributes = [
    'value',
    'layout',
    'disabled',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _container: HTMLDivElement | null = null;
  private readonly _rows: CboxRow[] = [];

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
      const layout = this.getAttribute('layout') === 'horizontal' ? 'row' : 'column';
      const container = document.createElement('div');
      container.setAttribute('role', 'group');
      container.style.display = 'flex';
      container.style.flexDirection = layout;
      container.style.gap = '10px';
      container.style.flexWrap = 'wrap';
      this._container = container;
      this.appendChild(container);

      this._value = (this.getAttribute('value') || '').split(',').filter(Boolean).join(',');
      this._sync();
    } else {
      this._sync();
    }
    this._applyDisabled();
    this.addEventListener('change', this._onChange);
    addCleanup(this, () => this.removeEventListener('change', this._onChange));
    observeItems(this, this._sync, {
      attributeFilter: ['value', 'label', 'disabled'],
      isOutput: (n) => this._container?.contains(n) ?? false,
    });
  }

  /**
   * Effective disabled state. Presence alone disables — the HTML spec, not the
   * library's `x="false"` convention, governs `disabled` on a form-associated
   * element, and that is what the browser reports through `formDisabledCallback`.
   */
  private get _disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  /**
   * Forward the effective disabled state to every box. An option disabled in
   * its own right (`<e-cbox-option disabled>`, marked with `aria-disabled` on
   * its label) stays disabled when the group as a whole is enabled again.
   */
  private _applyDisabled(): void {
    const disabled = this._disabled;
    if (this._container) patchAttr(this._container, 'aria-disabled', disabled ? 'true' : null);
    for (const row of this._rows) {
      row.input.disabled = disabled || row.label.getAttribute('aria-disabled') === 'true';
    }
  }

  protected override formDisabledChanged(): void {
    this._applyDisabled();
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private readonly _onChange = (): void => {
    if (this._disabled) return;
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
      for (const row of this._rows) row.input.checked = set.has(row.input.value);
      this._syncFormValue([...set]);
    } else if (name === 'layout') {
      if (this._container) {
        this._container.style.flexDirection =
          this.getAttribute('layout') === 'horizontal' ? 'row' : 'column';
      }
    } else if (name === 'disabled') {
      this._applyDisabled();
    } else if (name === 'required' || name === 'required-message') {
      this._syncValidity(this._value.split(',').filter(Boolean));
    }
  }

  /** Authored options, excluding anything inside the rendered group. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-cbox-option')].filter(
      (o) => !this._container?.contains(o),
    );
  }

  private readonly _sync = (): void => {
    const container = this._container;
    if (!container) return;
    const items = this._items();
    const selected = new Set(this._value.split(',').filter(Boolean));
    const disabledAll = this._disabled;

    while (this._rows.length > items.length) this._rows.pop()!.label.remove();

    items.forEach((item, i) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      const value = item.getAttribute('value') ?? '';
      const label = item.getAttribute('label') || item.textContent || value;
      const itemDisabled = boolAttr(item, 'disabled');

      let row = this._rows[i];
      if (!row) {
        row = ECheckboxGroup._makeRow();
        container.appendChild(row.label);
        this._rows.push(row);
      }
      if (row.input.value !== value) row.input.value = value;
      patchText(row.text, label);
      patchAttr(row.label, 'aria-disabled', itemDisabled ? 'true' : null);
      row.input.checked = selected.has(value);
      const rowDisabled = disabledAll || itemDisabled;
      if (row.input.disabled !== rowDisabled) row.input.disabled = rowDisabled;
    });

    const checked = [...container.querySelectorAll<HTMLInputElement>('input:checked')].map(
      (i) => i.value,
    );
    this._syncFormValue(checked);
  };

  private static _makeRow(): CboxRow {
    const label = document.createElement('label');
    label.className = 'ink-checkbox';

    const wrapper = document.createElement('span');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-flex';

    const input = document.createElement('input');
    input.type = 'checkbox';

    const box = document.createElement('span');
    box.className = 'ink-checkbox__box';
    box.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">' +
      '<path d="M2 8.5l4 4 8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="square"/>' +
      '</svg>';

    wrapper.appendChild(input);
    wrapper.appendChild(box);

    const text = document.createElement('span');

    label.appendChild(wrapper);
    label.appendChild(text);
    return { label, input, text };
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
    this._container?.setAttribute('aria-required', String(boolAttr(this, 'required')));
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
 * Acts as a data carrier; the parent renders the actual checkbox and hides
 * this element. Changing its attributes after mount updates the rendered row.
 *
 * @attr {string} value - Value contributed when this option is checked.
 * @attr {string} [label] - Visible label. Falls back to text content, then to `value`.
 * @attr {boolean} [disabled] - Makes this single option untoggleable and unfocusable while the
 *   rest of the group stays usable. Follows the library's boolean-attribute convention, so
 *   `disabled="false"` leaves it toggleable.
 */
export class ECboxOption extends EpaperElement {}
define('e-cbox-option', ECboxOption);
