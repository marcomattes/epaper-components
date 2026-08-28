import { boolAttr, define, intAttr, patchAttr, patchText, randId } from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';
import { t } from '../../core/i18n';

type KeyKind = 'digit' | 'decimal' | 'backspace' | 'clear';

interface KeyDef {
  kind: KeyKind;
  key: string;
  label: string;
  ariaLabel: string;
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/**
 * @summary On-screen numeric keypad that can drive another control through `for`.
 * @since v1.3.0
 *
 * Form-associated: participates in `<form>` submission and FormData on its
 * own, and mirrors every keystroke into the control named by `for` when one
 * is given — the prerequisite for a kiosk browser that has no operating
 * system keyboard to fall back on.
 *
 * @attr {string} [value] - Current entry.
 * @attr {string} [default-value] - Entry restored by a form reset.
 * @attr {string} [for] - Id of the control this keypad types into.
 * @attr {number} [max-length=32] - Longest entry accepted.
 * @attr {boolean} [decimal] - Adds a decimal-separator key.
 * @attr {string} [decimal-separator='.'] - Character the decimal key inserts.
 * @attr {boolean} [show-display] - Shows the current entry above the keys.
 * @attr {string} [label] - Label rendered above the keypad.
 * @attr {string} [hint] - Helper text rendered below the keypad.
 * @attr {string} [clear-label='C'] - Text of the clear key.
 * @attr {string} [backspace-label='⌫'] - Text of the backspace key.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables.
 * @attr {boolean} [required] - Requires a non-empty entry.
 * @attr {string} [required-message] - Message reported when `required` is not satisfied.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired on every key press that changes the entry.
 *
 * @example
 * <e-input id="qty" label="Quantity" inputmode="numeric"></e-input>
 * <e-keypad for="qty" max-length="4"></e-keypad>
 */
export class EKeypad extends BaseFormControl {
  static readonly observedAttributes = [
    'value',
    'for',
    'max-length',
    'decimal',
    'decimal-separator',
    'show-display',
    'label',
    'hint',
    'clear-label',
    'backspace-label',
    'disabled',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _labelEl: HTMLElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _display: HTMLElement | null = null;
  private _grid: HTMLElement | null = null;
  private _keys: HTMLButtonElement[] = [];

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const root = document.createElement('div');
    root.className = 'ink-keypad';
    const labelEl = document.createElement('div');
    labelEl.className = 'ink-label';
    const display = document.createElement('output');
    display.className = 'ink-keypad__display';
    const grid = document.createElement('div');
    grid.className = 'ink-keypad__grid';
    grid.id = this.id ? `${this.id}-grid` : randId('e-kp');
    grid.setAttribute('role', 'group');
    const hintEl = document.createElement('div');
    hintEl.className = 'ink-hint';
    root.append(labelEl, display, grid, hintEl);
    this._labelEl = labelEl;
    this._display = display;
    this._grid = grid;
    this._hintEl = hintEl;
    this.replaceChildren(root);

    this._value = this._trim(
      this.getAttribute('value') ?? this.getAttribute('default-value') ?? '',
    );
    this._buildKeys();
    this._syncTexts();
    this._syncDisplay();
    this._syncEnabled();
    this.internals.setFormValue(this._value);
    this._syncValidity();
    grid.addEventListener('click', this._onClick);
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._wired) return;
    if (
      name === 'decimal' ||
      name === 'decimal-separator' ||
      name === 'clear-label' ||
      name === 'backspace-label'
    ) {
      this._buildKeys();
      this._syncEnabled();
      return;
    }
    if (name === 'label' || name === 'hint') {
      this._syncTexts();
      return;
    }
    if (name === 'value') {
      const next = this._trim(v ?? '');
      if (next !== this._value) {
        this._value = next;
        this.internals.setFormValue(next);
      }
    }
    this._syncDisplay();
    this._syncEnabled();
    this._syncValidity();
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    const next = this._trim(v ?? '');
    this._value = next;
    this.internals.setFormValue(next);
    this._syncDisplay();
    this._syncValidity();
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return this._trim(s);
  }

  protected override resetValue(): void {
    this.value = this.parse(this.getAttribute('default-value') ?? '');
  }

  protected override formDisabledChanged(): void {
    this._syncEnabled();
  }

  /** The control this keypad types into, when `for` names one. */
  get control(): (HTMLElement & { value?: string }) | null {
    const id = this.getAttribute('for');
    if (!id) return null;
    return (
      (this.ownerDocument.getElementById(id) as (HTMLElement & { value?: string }) | null) ?? null
    );
  }

  /** Apply one key programmatically. `key` is a digit, the separator, `backspace` or `clear`. */
  press(key: string): void {
    if (key === 'clear') return this._commit('');
    if (key === 'backspace') return this._commit(this._value.slice(0, -1));
    this._commit(this._trim(this._value + key));
  }

  private _maxLength(): number {
    return Math.max(1, Math.min(64, intAttr(this, 'max-length', 32)));
  }

  private _trim(raw: string): string {
    return raw.slice(0, this._maxLength());
  }

  private _disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  private readonly _onClick = (e: Event): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.ink-keypad__key');
    if (!button || this._disabled()) return;
    this.press(button.dataset['key'] ?? '');
  };

  private _commit(next: string): void {
    if (next === this._value) return;
    this._value = next;
    this.internals.setFormValue(next);
    this.setAttribute('value', next);
    this._syncDisplay();
    this._syncValidity();
    this._mirror(next);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: next }, bubbles: true }));
  }

  /** Write into the `for` target and let its own listeners see the change. */
  private _mirror(next: string): void {
    const target = this.control;
    if (!target) return;
    if (target.value === next) return;
    target.value = next;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private _keyDefs(): KeyDef[] {
    const separator = (this.getAttribute('decimal-separator') || '.').slice(0, 1);
    const keys: KeyDef[] = [];
    for (const row of DIGIT_ROWS) {
      for (const digit of row) {
        keys.push({ kind: 'digit', key: digit, label: digit, ariaLabel: digit });
      }
    }
    if (boolAttr(this, 'decimal')) {
      keys.push({
        kind: 'decimal',
        key: separator,
        label: separator,
        ariaLabel: 'Decimal separator',
      });
    } else {
      keys.push({
        kind: 'clear',
        key: 'clear',
        label: this.getAttribute('clear-label') || 'C',
        ariaLabel: t(this, 'clear'),
      });
    }
    keys.push({ kind: 'digit', key: '0', label: '0', ariaLabel: '0' });
    keys.push({
      kind: 'backspace',
      key: 'backspace',
      label: this.getAttribute('backspace-label') || '⌫',
      ariaLabel: t(this, 'backspace'),
    });
    if (boolAttr(this, 'decimal')) {
      keys.push({
        kind: 'clear',
        key: 'clear',
        label: this.getAttribute('clear-label') || 'C',
        ariaLabel: t(this, 'clear'),
      });
    }
    return keys;
  }

  // Reached only from `connectedCallback` and from `attributeChangedCallback`,
  // which bails on `_wired` — the refs are always in place by then.
  private _buildKeys(): void {
    const grid = this._grid!;
    const defs = this._keyDefs();
    this._keys = defs.map((def) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ink-keypad__key';
      button.dataset['key'] = def.key;
      button.dataset['kind'] = def.kind;
      button.setAttribute('aria-label', def.ariaLabel);
      button.textContent = def.label;
      return button;
    });
    grid.replaceChildren(...this._keys);
    patchAttr(grid, 'data-columns', '3');
  }

  private _syncTexts(): void {
    const label = this.getAttribute('label') || '';
    patchText(this._labelEl!, label);
    patchAttr(this._labelEl!, 'hidden', label ? null : '');
    const hint = this.getAttribute('hint') || '';
    patchText(this._hintEl!, hint);
    patchAttr(this._hintEl!, 'hidden', hint ? null : '');
    patchAttr(
      this._grid!,
      'aria-label',
      label || this.getAttribute('aria-label') || t(this, 'keypad'),
    );
  }

  private _syncDisplay(): void {
    if (!this._display) return;
    patchText(this._display, this._value);
    patchAttr(this._display, 'hidden', boolAttr(this, 'show-display') ? null : '');
  }

  private _syncEnabled(): void {
    const disabled = this._disabled();
    for (const key of this._keys) key.disabled = disabled;
  }

  private _syncValidity(): void {
    this.applyRequiredValidity(
      this._value.length > 0,
      this._grid ?? undefined,
      t(this, 'required'),
    );
  }
}

define('e-keypad', EKeypad);
