import {
  addCleanup,
  boolAttr,
  define,
  esc,
  onGlobal,
  patchAttr,
  patchText,
  randId,
  runCleanups,
} from '../../core/dom';
import { ICONS, iconSvg } from '../../core/icons';
import { BaseFormControl } from '../../core/base-form-control';

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
 * @attr {string} [value] - Currently selected option value. While the attribute is absent the
 *   select is unset: the trigger shows the placeholder and no option is marked selected, even
 *   when an option carries `value=""`. Writing `value=""` selects that option deliberately.
 * @attr {string} [placeholder='Select…'] - Trigger label while nothing is selected. An absent
 *   *or empty* attribute falls back to `Select…`.
 * @attr {string} [name] - Form field name. Required to participate in `FormData`.
 * @attr {boolean} [disabled] - Disables interaction: the trigger leaves the tab flow, the menu
 *   cannot open and no key or click changes the value. Presence alone disables, per the HTML spec
 *   for form-associated elements — `disabled="false"` still disables. Also applied by a
 *   surrounding `<fieldset disabled>`.
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
  static readonly observedAttributes = [
    'value',
    'placeholder',
    'disabled',
    'required',
    'required-message',
  ];

  private _wired = false;
  private _trigger: HTMLButtonElement | null = null;
  private _menu: HTMLElement | null = null;
  private _triggerLabel: HTMLElement | null = null;
  private _chevPath: SVGPathElement | null = null;
  private _opts: Array<{ value: string; label: string; disabled: boolean }> = [];
  private _optEls: HTMLElement[] = [];
  private _selectedEl: HTMLElement | null = null;
  private _placeholder = 'Select…';
  /** Whether the host carries a `value` attribute at all. */
  private _hasValue = false;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._placeholder = this.getAttribute('placeholder') || 'Select…';
      const attr = this.getAttribute('value');
      this._hasValue = attr !== null;
      this._value = attr ?? '';
      const menuId = randId('ink-select-listbox');
      this._opts = [...this.querySelectorAll('e-option')].map((o) => ({
        value: o.getAttribute('value') ?? '',
        label: o.getAttribute('label') || o.textContent || '',
        // `<e-option>` is a plain data carrier, not a form-associated element,
        // so its `disabled` follows the library's boolean-attribute convention.
        disabled: boolAttr(o, 'disabled'),
      }));
      const selIdx = this._matchIndex();
      const current = selIdx >= 0 ? this._opts[selIdx] : undefined;
      // `i === selIdx` is a boolean (stringifies to "true"/"false") — it can
      // never carry the characters esc() escapes, so wrapping it would only
      // cost bundle bytes against the size-limit budget.
      /* eslint-disable local/no-unescaped-innerhtml */
      this.innerHTML = `<div class="ink-select">
      <button type="button" class="ink-select__trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="${esc(menuId)}">
        <span data-current>${esc(current ? current.label : this._placeholder)}</span>
        ${iconSvg('chevD', 18)}
      </button>
      <ul id="${esc(menuId)}" class="ink-select__menu" role="listbox" hidden>
        ${this._opts
          .map(
            (o, i) => `<li class="ink-select__option" role="option"
          data-value="${esc(o.value)}" aria-selected="${i === selIdx}"${o.disabled ? ' aria-disabled="true"' : ''}>
          <span style="flex:1">${esc(o.label)}</span>
          ${i === selIdx ? iconSvg('check', 16) : ''}
        </li>`,
          )
          .join('')}
      </ul>
    </div>`;
      /* eslint-enable local/no-unescaped-innerhtml */

      this._trigger = this.querySelector('.ink-select__trigger');
      this._menu = this.querySelector('.ink-select__menu');
      this._triggerLabel = this._trigger!.querySelector<HTMLElement>('[data-current]');
      this._chevPath = this._trigger!.querySelector<SVGPathElement>('svg path');
      this._optEls = [...this._menu!.querySelectorAll<HTMLElement>('.ink-select__option')];
      this.internals.setFormValue(this._value);

      // Cache the initially-selected option element.
      this._selectedEl = selIdx >= 0 ? (this._optEls[selIdx] ?? null) : null;

      for (const [i, opt] of this._optEls.entries()) {
        opt.tabIndex =
          !this._opts[i]?.disabled && opt.getAttribute('aria-selected') === 'true' ? 0 : -1;
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

    this._applyDisabled();
  }

  /**
   * Effective disabled state. Presence alone disables — the HTML spec, not the
   * library's `x="false"` convention, governs `disabled` on a form-associated
   * element, and that is what the browser reports through `formDisabledCallback`.
   */
  private get _disabled(): boolean {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  /** Forward the effective disabled state to the trigger and the option list. */
  private _applyDisabled(): void {
    if (!this._trigger || !this._menu) return;
    const disabled = this._disabled;
    this._trigger.disabled = disabled;
    patchAttr(this._trigger, 'aria-disabled', disabled ? 'true' : null);
    if (disabled) {
      // A menu left open would still be clickable behind a dead trigger.
      this._setOpen(false);
      for (const opt of this._optEls) opt.tabIndex = -1;
    } else {
      for (const [i, opt] of this._optEls.entries()) {
        opt.tabIndex =
          !this._opts[i]?.disabled && opt.getAttribute('aria-selected') === 'true' ? 0 : -1;
      }
    }
  }

  /**
   * Index of the option carrying the current value, or -1 when nothing
   * matches. A select with no `value` attribute is unset and matches no
   * option at all — including one that deliberately carries `value=""`.
   */
  private _matchIndex(): number {
    return this._hasValue ? this._opts.findIndex((o) => o.value === this._value) : -1;
  }

  private _setOpen(open: boolean): void {
    if (!this._menu || !this._trigger) return;
    if (open && this._disabled) return;
    this._menu.hidden = !open;
    this._trigger.setAttribute('aria-expanded', String(open));
    if (this._chevPath) this._chevPath.setAttribute('d', open ? ICONS.chevU : ICONS.chevD);
  }

  /**
   * Move focus to option `index`, skipping over disabled options in the
   * direction of travel (`step`) so they are never a keyboard stop.
   */
  private _focusOption(index: number, step = 1): void {
    const count = this._optEls.length;
    if (count === 0) return;
    const wrap = (i: number): number => ((i % count) + count) % count;
    let normalized = wrap(index);
    for (let tried = 0; tried < count && this._opts[normalized]?.disabled; tried++) {
      normalized = wrap(normalized + step);
    }
    const target = this._optEls[normalized];
    if (!target || this._opts[normalized]?.disabled) return;
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
      const opt = this._opts[idx];
      // A disabled option is not a type-ahead target: it cannot be selected,
      // so jumping to it would strand the search on an unusable row.
      if (opt && !opt.disabled && opt.label.toLowerCase().startsWith(query)) return idx;
    }
    return -1;
  }

  /** Whether `e` is a plain printable character with no modifier — the type-ahead trigger key. */
  private _isTypeaheadKey(e: KeyboardEvent): boolean {
    return e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey;
  }

  private _selectOption(value: string): void {
    if (this._disabled) return;
    this.setAttribute('value', value);
    this._setOpen(false);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value }, bubbles: true }));
    this._trigger?.focus();
  }

  private readonly _onTriggerClick = (): void => {
    if (this._disabled) return;
    this._setOpen(!!this._menu?.hidden);
  };

  private readonly _onTriggerKeydown = (e: KeyboardEvent): void => {
    if (this._disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this._setOpen(true);
      let target = this._optEls.findIndex((o) => o.getAttribute('aria-selected') === 'true');
      if (target < 0) target = e.key === 'ArrowDown' ? 0 : this._optEls.length - 1;
      this._focusOption(target, e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (this._isTypeaheadKey(e)) {
      const idx = this._typeaheadIndex(e.key, this._matchIndex());
      if (idx >= 0) {
        e.preventDefault();
        this._selectOption(this._opts[idx]!.value);
      }
    }
  };

  private readonly _onMenuClick = (e: Event): void => {
    const option = (e.target as Element).closest<HTMLElement>('.ink-select__option');
    if (!option || option.getAttribute('aria-disabled') === 'true') return;
    this._selectOption(option.dataset['value'] ?? '');
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
    if (this._menu?.hidden || this._disabled) return;
    const current = this._optEls.indexOf(document.activeElement as HTMLElement);

    const navIndex = this._navigationIndex(e.key, current);
    if (navIndex != null) {
      this._focusOption(navIndex, e.key === 'ArrowUp' || e.key === 'End' ? -1 : 1);
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      const focused = document.activeElement as HTMLElement | null;
      if (
        focused?.classList.contains('ink-select__option') &&
        focused.getAttribute('aria-disabled') !== 'true'
      ) {
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
      this._placeholder = v || 'Select…';
      if (this._matchIndex() < 0 && this._triggerLabel) {
        patchText(this._triggerLabel, this._placeholder);
      }
      return;
    }
    if (name === 'disabled') {
      this._applyDisabled();
      return;
    }
    if (name === 'required' || name === 'required-message') {
      this._syncValidity();
      return;
    }
    if (name !== 'value') return;
    this._syncValueAttr(v);
  }

  private _syncValueAttr(v: string | null): void {
    const hasValue = v !== null;
    const newValue = v ?? '';
    if (hasValue === this._hasValue && newValue === this._value) return;
    this._hasValue = hasValue;
    this._value = newValue;
    this.internals.setFormValue(newValue);

    // Deselect previous — only touch the old element.
    if (this._selectedEl) {
      this._selectedEl.setAttribute('aria-selected', 'false');
      this._selectedEl.tabIndex = -1;
      this._selectedEl.querySelector('svg')?.remove();
    }
    // Select new — only touch the new element.
    const newIdx = this._matchIndex();
    const newEl = newIdx >= 0 ? (this._optEls[newIdx] ?? null) : null;
    if (newEl) {
      newEl.setAttribute('aria-selected', 'true');
      newEl.tabIndex = this._disabled || this._opts[newIdx]?.disabled ? -1 : 0;
      if (!newEl.querySelector('svg')) newEl.insertAdjacentHTML('beforeend', iconSvg('check', 16));
    }
    this._selectedEl = newEl;

    if (this._triggerLabel) {
      const opt = newIdx >= 0 ? this._opts[newIdx] : undefined;
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

  private _syncValidity(): void {
    this._trigger?.setAttribute('aria-required', String(this.hasAttribute('required')));
    this.applyRequiredValidity(
      !!this._value,
      this._trigger ?? undefined,
      'Please select an option.',
    );
  }

  protected override formDisabledChanged(): void {
    this._applyDisabled();
  }
}
define('e-select', ESelect);

/**
 * @summary Single option entry inside an `<e-select>`.
 *
 * @attr {string} value - Option value emitted by the parent's `e-change` event. An option
 *   without the attribute carries `''` and is only ever selected once the parent's own
 *   `value` attribute is written — an unset parent selects nothing.
 * @attr {string} [label] - Visible label. Falls back to text content.
 * @attr {boolean} [disabled] - Makes this single option unselectable: it is skipped by arrow-key
 *   navigation and type-ahead, ignores clicks, and is exposed as `aria-disabled="true"`. Follows
 *   the library's boolean-attribute convention, so `disabled="false"` leaves it selectable. Read
 *   once, when the parent `<e-select>` renders its option list.
 *
 * @example
 * <e-option value="a" label="Apples"></e-option>
 */
export class EOption extends HTMLElement {}
define('e-option', EOption);
