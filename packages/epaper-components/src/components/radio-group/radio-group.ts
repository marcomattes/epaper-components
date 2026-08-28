import {
  addCleanup,
  boolAttr,
  define,
  observeItems,
  patchAttr,
  patchText,
  randId,
  runCleanups,
} from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';

/** Rendered `<label>`/`<input>` pair for a single `<e-radio>`. */
interface RadioRow {
  label: HTMLLabelElement;
  input: HTMLInputElement;
  text: Text;
}

/**
 * @summary Group of radio options sharing a single value.
 * @since v1.0.1
 *
 * Reads options from `<e-radio>` children and keeps them live: the authored
 * items stay in the light DOM as the source of truth, and a
 * `MutationObserver` re-syncs the rendered radios whenever one is added,
 * removed, reordered, relabelled or re-valued. Rows keep their DOM identity by
 * position, and `checked` is always re-derived from the group's own `value` —
 * the same source of truth an attribute-driven update already used — so an
 * unrelated option changing never moves the current selection.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is first wired. The stable form
 * of that is a `e-radio { display: none; }` rule in `components.css`; the
 * inline style is what guarantees it without one.
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * @attr {string} [value] - Currently selected option value.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {'horizontal'|'vertical'} [layout='horizontal'] - Stacking direction.
 * @attr {boolean} [disabled] - Disables every option: none can be focused or checked. Presence
 *   alone disables, per the HTML spec for form-associated elements — `disabled="false"` still
 *   disables. Also applied by a surrounding `<fieldset disabled>`.
 * @attr {boolean} [required] - Requires one selected option.
 * @attr {string} [required-message] - Message reported when no required option is selected.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the selection changes.
 *
 * @slot - Default slot for `<e-radio>` children.
 *
 * @example
 * <e-radio-group value="a" layout="horizontal">
 *   <e-radio value="a" label="Apples"></e-radio>
 *   <e-radio value="b" label="Bananas"></e-radio>
 * </e-radio-group>
 */
export class ERadioGroup extends BaseFormControl {
  static readonly observedAttributes = [
    'value',
    'layout',
    'disabled',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _group: HTMLElement | null = null;
  private _name = '';
  private readonly _rows: RadioRow[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._name = randId('e-rg');
      const layout = this.getAttribute('layout') === 'vertical' ? 'vertical' : 'horizontal';
      const group = document.createElement('div');
      group.className =
        'ink-radio-group' + (layout === 'vertical' ? ' ink-radio-group--vertical' : '');
      group.setAttribute('role', 'radiogroup');
      this._group = group;
      this.appendChild(group);

      this._value = this.getAttribute('value') ?? '';
      this.internals.setFormValue(this._value);
      this._sync();
      this._syncValidity();
    } else {
      this._sync();
    }
    this._applyDisabled();
    this.addEventListener('change', this._onChange);
    addCleanup(this, () => this.removeEventListener('change', this._onChange));
    observeItems(this, this._sync, {
      attributeFilter: ['value', 'label', 'disabled'],
      isOutput: (n) => this._group?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private readonly _onChange = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (this._disabled) return;
    if (!target.matches('input[type="radio"]')) return;
    this.setAttribute('value', target.value);
    this.dispatchEvent(
      new CustomEvent('e-change', { detail: { value: target.value }, bubbles: true }),
    );
  };

  /**
   * Effective disabled state. Presence alone disables — the HTML spec, not the
   * library's `x="false"` convention, governs `disabled` on a form-associated
   * element, and that is what the browser reports through `formDisabledCallback`.
   */
  private get _disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  /**
   * Forward the effective disabled state to every radio. An option disabled in
   * its own right (`<e-radio disabled>`, marked with `aria-disabled` on its
   * label) stays disabled when the group as a whole is enabled again.
   */
  private _applyDisabled(): void {
    const disabled = this._disabled;
    if (this._group) patchAttr(this._group, 'aria-disabled', disabled ? 'true' : null);
    for (const row of this._rows) {
      row.input.disabled = disabled || row.label.getAttribute('aria-disabled') === 'true';
    }
  }

  protected override formDisabledChanged(): void {
    this._applyDisabled();
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._wired) return;
    if (name === 'disabled') {
      this._applyDisabled();
      return;
    }
    if (name === 'layout') {
      if (this._group) {
        this._group.classList.toggle('ink-radio-group--vertical', v === 'vertical');
      }
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
    for (const row of this._rows) row.input.checked = row.input.value === newValue;
    this._syncValidity();
  }

  /** Authored radios, excluding anything inside the rendered group. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-radio')].filter(
      (r) => !this._group?.contains(r),
    );
  }

  private readonly _sync = (): void => {
    const group = this._group;
    if (!group) return;
    const items = this._items();
    const disabledAll = this._disabled;

    while (this._rows.length > items.length) this._rows.pop()!.label.remove();

    items.forEach((item, i) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      const value = item.getAttribute('value') ?? '';
      const label = item.getAttribute('label') || item.textContent || '';
      const itemDisabled = boolAttr(item, 'disabled');

      let row = this._rows[i];
      if (!row) {
        row = ERadioGroup._makeRow(this._name);
        group.appendChild(row.label);
        this._rows.push(row);
      }
      if (row.input.value !== value) row.input.value = value;
      patchText(row.text, label);
      patchAttr(row.label, 'aria-disabled', itemDisabled ? 'true' : null);
      row.input.checked = value === this._value;
      const rowDisabled = disabledAll || itemDisabled;
      if (row.input.disabled !== rowDisabled) row.input.disabled = rowDisabled;
    });
  };

  private static _makeRow(name: string): RadioRow {
    const label = document.createElement('label');
    label.className = 'ink-radio';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    const dot = document.createElement('span');
    dot.className = 'ink-radio__dot';
    const text = document.createTextNode('');
    label.append(input, dot, text);
    return { label, input, text };
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
    this._group?.setAttribute('aria-required', String(boolAttr(this, 'required')));
    this.applyRequiredValidity(!!this.value, this._group ?? undefined, 'Please select an option.');
  }
}
define('e-radio-group', ERadioGroup);

/**
 * @summary Single option entry inside an `<e-radio-group>`.
 *
 * Acts as a data carrier; the parent renders the actual radio input and hides
 * this element. Changing its attributes after mount updates the rendered row.
 *
 * @attr {string} value - Value contributed when this option is selected.
 * @attr {string} [label] - Visible label. Falls back to text content.
 * @attr {boolean} [disabled] - Makes this single option unselectable and unfocusable while the
 *   rest of the group stays usable. Follows the library's boolean-attribute convention, so
 *   `disabled="false"` leaves it selectable.
 *
 * @example
 * <e-radio value="a" label="Apples"></e-radio>
 */
export class ERadio extends HTMLElement {}
define('e-radio', ERadio);
