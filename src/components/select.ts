import { addCleanup, define, esc, onGlobal, patchText, randId, runCleanups } from '../core/dom';
import { ICONS, iconSvg } from '../core/icons';
import { BaseFormControl } from '../core/base-form-control';

/**
 * @summary Single-select dropdown built from `<e-option>` children.
 * @since v1.0.1
 *
 * Form-associated: participates in `<form>` submission and FormData.
 *
 * Supports listbox type-ahead: pressing a printable character while the
 * trigger or an option is focused jumps to the next option whose label
 * starts with that letter, cycling on repeat presses — matching a plain
 * native `<select>`.
 *
 * @attr {string} [value] - Currently selected option value.
 * @attr {string} [placeholder='Select…'] - Trigger placeholder when no value is set.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [required] - Requires a selected option.
 * @attr {string} [required-message] - Message reported when no required option is selected.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user picks a different option.
 *
 * @example
 * <e-select placeholder="Pick one">
 *   <e-option value="a" label="Apples"></e-option>
 *   <e-option value="b" label="Bananas"></e-option>
 * </e-select>
 */
export class ESelect extends BaseFormControl {
  static readonly observedAttributes = ['value', 'placeholder', 'required', 'required-message'];

  private _wired = false;
  private _trigger: HTMLElement | null = null;
  private _menu: HTMLElement | null = null;
  private _triggerLabel: HTMLElement | null = null;
  private _chevPath: SVGPathElement | null = null;
  private _opts: Array<{ value: string; label: string }> = [];
  private _optEls: HTMLElement[] = [];
  private _selectedEl: HTMLElement | null = null;
  private _placeholder = 'Select…';

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._placeholder = this.getAttribute('placeholder') || 'Select…';
      const value = this.getAttribute('value') ?? '';
      const menuId = randId('ink-select-listbox');
      this._opts = [...this.querySelectorAll('e-option')].map((o) => ({
        value: o.getAttribute('value') ?? '',
        label: o.getAttribute('label') || o.textContent || '',
      }));
      const current = this._opts.find((o) => o.value === value);
      this.innerHTML = `<div class="ink-select">
      <button type="button" class="ink-select__trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="${esc(menuId)}">
        <span data-current>${esc(current ? current.label : this._placeholder)}</span>
        ${iconSvg('chevD', 18)}
      </button>
      <ul id="${esc(menuId)}" class="ink-select__menu" role="listbox" hidden>
        ${this._opts
          .map(
            (o) => `<li class="ink-select__option" role="option"
          data-value="${esc(o.value)}" aria-selected="${o.value === value}">
          <span style="flex:1">${esc(o.label)}</span>
          ${o.value === value ? iconSvg('check', 16) : ''}
        </li>`,
          )
          .join('')}
      </ul>
    </div>`;

      this._trigger = this.querySelector('.ink-select__trigger');
      this._menu = this.querySelector('.ink-select__menu');
      this._triggerLabel = this._trigger!.querySelector<HTMLElement>('[data-current]');
      this._chevPath = this._trigger!.querySelector<SVGPathElement>('svg path');
      this._optEls = [...this._menu!.querySelectorAll<HTMLElement>('.ink-select__option')];
      this._value = value;
      this.internals.setFormValue(value);

      // Cache the initially-selected option element.
      const selIdx = this._opts.findIndex((o) => o.value === value);
      this._selectedEl = selIdx >= 0 ? (this._optEls[selIdx] ?? null) : null;

      for (const opt of this._optEls) {
        opt.tabIndex = opt.getAttribute('aria-selected') === 'true' ? 0 : -1;
      }
      this._syncValidity();
    }

    this._trigger!.addEventListener('click', this._onTriggerClick);
    this._trigger!.addEventListener('keydown', this._onTriggerKeydown);
    this._menu!.addEventListener('click', this._onMenuClick);
    this._menu!.addEventListener('keydown', this._onMenuKeydown);
    addCleanup(this, () => {
      this._trigger?.removeEventListener('click', this._onTriggerClick);
      this._trigger?.removeEventListener('keydown', this._onTriggerKeydown);
      this._menu?.removeEventListener('click', this._onMenuClick);
      this._menu?.removeEventListener('keydown', this._onMenuKeydown);
    });
    onGlobal(this, document, 'mousedown', (e) => {
      if (!this.contains(e.target as Node)) this._setOpen(false);
    });
    onGlobal(this, document, 'keydown', (e) => {
      if (e.key === 'Escape' && !this._menu!.hidden && this.contains(document.activeElement)) {
        this._setOpen(false);
        this._trigger!.focus();
      }
    });
  }

  private _setOpen(open: boolean): void {
    if (!this._menu || !this._trigger) return;
    this._menu.hidden = !open;
    this._trigger.setAttribute('aria-expanded', String(open));
    if (this._chevPath) this._chevPath.setAttribute('d', open ? ICONS.chevU : ICONS.chevD);
  }

  private _focusOption(index: number): void {
    if (this._optEls.length === 0) return;
    const normalized = ((index % this._optEls.length) + this._optEls.length) % this._optEls.length;
    const target = this._optEls[normalized];
    if (!target) return;
    for (const option of this._optEls) option.tabIndex = -1;
    target.tabIndex = 0;
    target.focus();
  }

  /**
   * Listbox type-ahead: returns the index of the next option (wrapping past
   * `fromIndex`) whose label starts with `char`, or -1. Each keystroke is an
   * independent single-character search, so repeatedly pressing the same key
   * cycles through every option sharing that first letter.
   */
  private _typeaheadIndex(char: string, fromIndex: number): number {
    const query = char.toLowerCase();
    const count = this._opts.length;
    for (let step = 1; step <= count; step++) {
      const idx = (fromIndex + step) % count;
      if (this._opts[idx]?.label.toLowerCase().startsWith(query)) return idx;
    }
    return -1;
  }

  /** Whether `e` is a plain printable character with no modifier — the type-ahead trigger key. */
  private _isTypeaheadKey(e: KeyboardEvent): boolean {
    return e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey;
  }

  private _selectOption(value: string): void {
    this.setAttribute('value', value);
    this._setOpen(false);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value }, bubbles: true }));
    this._trigger?.focus();
  }

  private readonly _onTriggerClick = (): void => this._setOpen(!!this._menu?.hidden);

  private readonly _onTriggerKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this._setOpen(true);
      let target = this._optEls.findIndex((o) => o.getAttribute('aria-selected') === 'true');
      if (target < 0) target = e.key === 'ArrowDown' ? 0 : this._optEls.length - 1;
      this._focusOption(target);
      return;
    }
    if (this._isTypeaheadKey(e)) {
      const current = this._opts.findIndex((o) => o.value === this._value);
      const idx = this._typeaheadIndex(e.key, current);
      if (idx >= 0) {
        e.preventDefault();
        this._selectOption(this._opts[idx]!.value);
      }
    }
  };

  private readonly _onMenuClick = (e: Event): void => {
    const option = (e.target as Element).closest<HTMLElement>('.ink-select__option');
    if (option) this._selectOption(option.dataset['value'] ?? '');
  };

  /** Target index for a navigation key, relative to `current` (-1 if unfocused). */
  private _navigationIndex(key: string, current: number): number | null {
    switch (key) {
      case 'ArrowDown':
        return current < 0 ? 0 : current + 1;
      case 'ArrowUp':
        return current < 0 ? this._optEls.length - 1 : current - 1;
      case 'Home':
        return 0;
      case 'End':
        return this._optEls.length - 1;
      default:
        return null;
    }
  }

  private readonly _onMenuKeydown = (e: KeyboardEvent): void => {
    if (this._menu?.hidden) return;
    const current = this._optEls.indexOf(document.activeElement as HTMLElement);

    const navIndex = this._navigationIndex(e.key, current);
    if (navIndex != null) {
      this._focusOption(navIndex);
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      const focused = document.activeElement as HTMLElement | null;
      if (focused?.classList.contains('ink-select__option')) {
        this._selectOption(focused.dataset['value'] ?? '');
      }
      e.preventDefault();
      return;
    }

    if (this._isTypeaheadKey(e)) {
      const idx = this._typeaheadIndex(e.key, current);
      if (idx < 0) return;
      this._focusOption(idx);
      e.preventDefault();
    }
  };

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string, _old: string | null, v: string | null) {
    if (!this._menu || !this._trigger) return;
    if (name === 'placeholder') {
      this._placeholder = v ?? 'Select…';
      if (!this._opts.find((o) => o.value === this._value) && this._triggerLabel) {
        patchText(this._triggerLabel, this._placeholder);
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

    // Deselect previous — only touch the old element.
    if (this._selectedEl) {
      this._selectedEl.setAttribute('aria-selected', 'false');
      this._selectedEl.tabIndex = -1;
      this._selectedEl.querySelector('svg')?.remove();
    }
    // Select new — only touch the new element.
    const newIdx = this._opts.findIndex((o) => o.value === newValue);
    const newEl = newIdx >= 0 ? (this._optEls[newIdx] ?? null) : null;
    if (newEl) {
      newEl.setAttribute('aria-selected', 'true');
      newEl.tabIndex = 0;
      if (!newEl.querySelector('svg')) newEl.insertAdjacentHTML('beforeend', iconSvg('check', 16));
    }
    this._selectedEl = newEl;

    if (this._triggerLabel) {
      const opt = this._opts.find((o) => o.value === newValue);
      patchText(this._triggerLabel, opt ? opt.label : this._placeholder);
    }
    this._syncValidity();
  }

  override get value(): string {
    return this._value;
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

  override formResetCallback(): void {
    this.value = this.getAttribute('default-value') ?? '';
  }

  private _syncValidity(): void {
    this._trigger?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(
      !!this._value,
      this._trigger ?? undefined,
      'Please select an option.',
    );
  }
}
define('e-select', ESelect);

/**
 * @summary Single option entry inside an `<e-select>`.
 *
 * @attr {string} value - Option value emitted by the parent's `e-change` event.
 * @attr {string} [label] - Visible label. Falls back to text content.
 *
 * @example
 * <e-option value="a" label="Apples"></e-option>
 */
export class EOption extends HTMLElement {}
define('e-option', EOption);
