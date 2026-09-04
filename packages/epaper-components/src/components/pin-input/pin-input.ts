import { boolAttr, define, intAttr, patchAttr, patchText, randId } from '../../core/dom';
import { BaseFormControl } from '../../core/base-form-control';
import { t } from '../../core/i18n';

const MAX_LENGTH = 12;

/**
 * @summary Fixed-length code entry as separate digit boxes, with auto-advance.
 * @since v2.0.0
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * One box per digit rather than one wide field: on a kiosk panel the boxes
 * tell the user how many digits are expected before they start, and the
 * caret — which is nearly invisible at 1-bit — stops being the only cue for
 * where input goes. Typing advances, `Backspace` on an empty box steps back,
 * and pasting a full code fills every box at once.
 *
 * @attr {string} [value] - Current code. Longer input is truncated to `length`.
 * @attr {string} [default-value] - Code restored by a form reset.
 * @attr {number} [length=4] - Number of digit boxes (1–12).
 * @attr {boolean} [masked] - Hides the entered digits, as a PIN pad does.
 * @attr {string} [label] - Label rendered above the boxes.
 * @attr {string} [hint] - Helper text rendered below the boxes.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [disabled] - Disables interaction. Presence alone disables.
 * @attr {boolean} [required] - Requires every box to be filled.
 * @attr {string} [required-message] - Message reported when `required` is not satisfied.
 *
 * @fires {CustomEvent<{value: string}>} e-input - Fired on every digit typed or deleted.
 * @fires {CustomEvent<{value: string}>} e-change - Fired once the last box is filled.
 *
 * @example
 * <e-pin-input name="pin" length="4" masked label="PIN"></e-pin-input>
 */
export class EPinInput extends BaseFormControl {
  static readonly observedAttributes = [
    'value',
    'length',
    'masked',
    'label',
    'hint',
    'disabled',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _group: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _hintEl: HTMLElement | null = null;
  private _boxes: HTMLInputElement[] = [];

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const root = document.createElement('div');
    root.className = 'ink-pin';
    const labelEl = document.createElement('div');
    labelEl.className = 'ink-label';
    const group = document.createElement('div');
    group.className = 'ink-pin__boxes';
    group.setAttribute('role', 'group');
    group.id = this.id ? `${this.id}-group` : randId('e-pin');
    const hintEl = document.createElement('div');
    hintEl.className = 'ink-hint';
    root.append(labelEl, group, hintEl);
    this._labelEl = labelEl;
    this._group = group;
    this._hintEl = hintEl;
    this.replaceChildren(root);

    this._value = this._normalize(
      this.getAttribute('value') ?? this.getAttribute('default-value') ?? '',
    );
    this._buildBoxes();
    this._syncTexts();
    this._paint();
    this.internals.setFormValue(this._value);
    this._syncValidity();
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._wired) return;
    if (name === 'length') {
      this._value = this._normalize(this._value);
      this._buildBoxes();
      this._paint();
      this.internals.setFormValue(this._value);
      this._syncValidity();
      return;
    }
    if (name === 'label' || name === 'hint') {
      this._syncTexts();
      return;
    }
    if (name === 'value') {
      const next = this._normalize(v ?? '');
      if (next !== this._value) {
        this._value = next;
        this.internals.setFormValue(next);
      }
    }
    this._paint();
    this._syncValidity();
  }

  override get value(): string {
    return this._value;
  }
  override set value(v: string) {
    const next = this._normalize(v ?? '');
    this._value = next;
    this.internals.setFormValue(next);
    this._paint();
    this._syncValidity();
  }

  protected serialize(v: string): string {
    return v ?? '';
  }
  protected parse(s: string): string {
    return this._normalize(s);
  }

  protected override resetValue(): void {
    this.value = this.parse(this.getAttribute('default-value') ?? '');
  }

  protected override formDisabledChanged(): void {
    this._paint();
  }

  /** Focus the first empty box, or the last one when the code is complete. */
  focusNext(): void {
    const index = Math.min(this._value.length, this._boxes.length - 1);
    this._boxes[index]?.focus();
  }

  private _length(): number {
    return Math.max(1, Math.min(MAX_LENGTH, intAttr(this, 'length', 4)));
  }

  private _normalize(raw: string): string {
    return raw.replaceAll(/\D/g, '').slice(0, this._length());
  }

  private _disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  private _buildBoxes(): void {
    if (!this._group) return;
    const length = this._length();
    this._boxes = [];
    const boxes: HTMLInputElement[] = [];
    for (let index = 0; index < length; index++) {
      const box = document.createElement('input');
      box.className = 'ink-control ink-pin__box';
      box.type = 'text';
      box.inputMode = 'numeric';
      box.autocomplete = 'off';
      box.maxLength = 1;
      box.dataset['index'] = String(index);
      box.setAttribute('aria-label', t(this, 'digitOf', { index: index + 1, length }));
      box.addEventListener('input', this._onInput);
      box.addEventListener('keydown', this._onKeydown);
      box.addEventListener('paste', this._onPaste);
      box.addEventListener('focus', this._onFocus);
      boxes.push(box);
      this._boxes.push(box);
    }
    this._group.replaceChildren(...boxes);
  }

  private readonly _onFocus = (e: Event): void => {
    (e.target as HTMLInputElement).select();
  };

  private readonly _onInput = (e: Event): void => {
    const box = e.target as HTMLInputElement;
    const index = Number(box.dataset['index']);
    const digits = box.value.replaceAll(/\D/g, '');
    if (!digits) {
      // Typing a letter over a filled box is a rejected keystroke, not a
      // deletion: dropping the digit and shifting the rest left turned one
      // mistyped character into a mangled code.
      if (box.value === '') {
        this._commit(this._removeAt(index), false);
      } else {
        this._paint();
      }
      return;
    }
    // The value has no holes, so an entry never lands further right than the
    // first empty box. A soft keyboard that delivers several characters at
    // once spills into the following boxes instead of dropping the surplus.
    const at = Math.min(index, this._value.length);
    const next = this._normalize(
      this._value.slice(0, at) + digits + this._value.slice(at + digits.length),
    );
    this._commit(next, true);
    this._boxes[Math.min(at + digits.length, this._boxes.length - 1)]?.focus();
  };

  private readonly _onKeydown = (e: KeyboardEvent): void => {
    const box = e.target as HTMLInputElement;
    const index = Number(box.dataset['index']);
    if (e.key === 'Backspace' && !box.value && index > 0) {
      e.preventDefault();
      this._commit(this._removeAt(index - 1), false);
      this._boxes[index - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      this._boxes[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < this._boxes.length - 1) {
      e.preventDefault();
      this._boxes[index + 1]?.focus();
    }
  };

  private readonly _onPaste = (e: ClipboardEvent): void => {
    const text = e.clipboardData?.getData('text') ?? '';
    const digits = text.replaceAll(/\D/g, '');
    if (!digits) return;
    e.preventDefault();
    const index = Number((e.target as HTMLInputElement).dataset['index']);
    const next = this._normalize(this._value.slice(0, index) + digits);
    this._commit(next, true);
    this.focusNext();
  };

  /** Drop one digit; the remaining ones close the gap, keeping the value dense. */
  private _removeAt(index: number): string {
    return this._value.slice(0, index) + this._value.slice(index + 1);
  }

  private _commit(next: string, advance: boolean): void {
    const changed = next !== this._value;
    this._value = next;
    this.internals.setFormValue(next);
    this._paint();
    this._syncValidity();
    if (!changed) return;
    this.setAttribute('value', next);
    this.dispatchEvent(new CustomEvent('e-input', { detail: { value: next }, bubbles: true }));
    if (advance && next.length === this._length()) {
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: next }, bubbles: true }));
    }
  }

  private _syncTexts(): void {
    if (!this._labelEl || !this._hintEl || !this._group) return;
    const label = this.getAttribute('label') || '';
    patchText(this._labelEl, label);
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    const hint = this.getAttribute('hint') || '';
    patchText(this._hintEl, hint);
    patchAttr(this._hintEl, 'hidden', hint ? null : '');
    patchAttr(
      this._group,
      'aria-label',
      label || this.getAttribute('aria-label') || t(this, 'code'),
    );
  }

  private _paint(): void {
    const masked = boolAttr(this, 'masked');
    const disabled = this._disabled();
    this._boxes.forEach((box, index) => {
      const digit = this._value[index] ?? '';
      const shown = masked && digit ? '•' : digit;
      if (box.value !== shown) box.value = shown;
      box.disabled = disabled;
      patchAttr(box, 'data-filled', digit ? 'true' : null);
    });
  }

  private _syncValidity(): void {
    this.applyRequiredValidity(
      this._value.length === this._length(),
      this._group ?? undefined,
      t(this, 'required'),
    );
  }
}

define('e-pin-input', EPinInput);
