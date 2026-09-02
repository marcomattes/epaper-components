import {
  addCleanup,
  boolAttr,
  define,
  EpaperElement,
  observeItems,
  onGlobal,
  patchAttr,
  patchText,
  randId,
  runCleanups,
} from '../../core/dom';
import { ICONS, iconSvg } from '../../core/icons';
import { t } from '../../core/i18n';
import { BaseFormControl } from '../../core/base-form-control';

/** Rendered `<li role="option">` plus the label span it patches. */
interface SelectRow {
  li: HTMLElement;
  label: HTMLElement;
}

/**
 * @summary Single-select dropdown built from `<e-option>` children.
 * @since v1.0.1
 *
 * Reads its entries from child `<e-option>` elements and keeps them live: the
 * authored items stay in the light DOM as the source of truth, and a
 * `MutationObserver` re-syncs the rendered listbox whenever one is added,
 * removed, reordered, relabelled, re-valued or re-disabled. Rows keep their
 * DOM identity by position. Selection is always re-derived from the host's
 * own `value` attribute — never cached per row — so an unrelated option
 * changing never moves the current selection, and the selected option
 * disappearing simply leaves nothing selected (the trigger falls back to the
 * placeholder) without touching `value` itself, the same way an already
 * unmatched value behaves.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is first wired. `components.css` carries the
 * `e-option { display: none; }` rule that states it; the inline style is what
 * holds even where that stylesheet is not loaded.
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
 * @slot - Default slot for `<e-option>` children.
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
  private _wrap: HTMLElement | null = null;
  private _trigger: HTMLButtonElement | null = null;
  private _menu: HTMLElement | null = null;
  private _triggerLabel: HTMLElement | null = null;
  private _chevPath: SVGPathElement | null = null;
  private _opts: Array<{ value: string; label: string; disabled: boolean }> = [];
  private readonly _rows: SelectRow[] = [];
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
      const wrap = document.createElement('div');
      wrap.className = 'ink-select';

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'ink-select__trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', menuId);
      const triggerLabel = document.createElement('span');
      triggerLabel.dataset['current'] = '';
      trigger.appendChild(triggerLabel);
      trigger.insertAdjacentHTML('beforeend', iconSvg('chevD', 18));

      const menu = document.createElement('ul');
      menu.id = menuId;
      menu.className = 'ink-select__menu';
      menu.setAttribute('role', 'listbox');
      menu.hidden = true;

      wrap.append(trigger, menu);
      this.appendChild(wrap);

      this._wrap = wrap;
      this._trigger = trigger;
      this._menu = menu;
      this._triggerLabel = triggerLabel;
      this._chevPath = trigger.querySelector<SVGPathElement>('svg path');

      this.internals.setFormValue(this._value);
      this._sync();
      this._syncValidity();
    } else {
      this._sync();
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
    this.addEventListener('focusout', this._onFocusOut);
    addCleanup(this, () => this.removeEventListener('focusout', this._onFocusOut));
    onGlobal(this, document, 'keydown', (e) => {
      if (e.key === 'Escape' && !this._menu!.hidden && this.contains(document.activeElement)) {
        this._setOpen(false);
        this._trigger!.focus();
      }
    });
    observeItems(this, this._sync, {
      attributeFilter: ['value', 'label', 'disabled'],
      isOutput: (n) => this._wrap?.contains(n) ?? false,
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
      for (const row of this._rows) row.li.tabIndex = -1;
    } else {
      this._applySelectionUI();
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

  /**
   * Close on the way out of the component.
   *
   * Without this, tabbing past an open overlay left it on screen with no way
   * to dismiss it from the keyboard: the Escape handler above only fires while
   * focus is still inside. The decision is deferred by a microtask because not
   * every `focusout` is the user leaving — removing a focused element fires one
   * too, and at that moment the host still reports `isConnected`.
   */
  private readonly _onFocusOut = (e: FocusEvent): void => {
    const next = e.relatedTarget as Node | null;
    if (this._menu?.hidden !== false || (next && this.contains(next))) return;
    queueMicrotask(() => {
      if (!this.isConnected || this._menu?.hidden !== false) return;
      if (this.contains(this.ownerDocument.activeElement)) return;
      this._setOpen(false);
    });
  };

  private _setOpen(open: boolean): void {
    if (!this._menu || !this._trigger) return;
    if (open && this._disabled) return;
    this._menu.hidden = !open;
    this._trigger.setAttribute('aria-expanded', String(open));
    if (this._chevPath) this._chevPath.setAttribute('d', open ? ICONS.chevU : ICONS.chevD);
  }

  private get _optEls(): HTMLElement[] {
    return this._rows.map((r) => r.li);
  }

  /**
   * Move focus to option `index`, skipping over disabled options in the
   * direction of travel (`step`) so they are never a keyboard stop.
   */
  private _focusOption(index: number, step = 1): void {
    const count = this._rows.length;
    if (count === 0) return;
    const wrap = (i: number): number => ((i % count) + count) % count;
    let normalized = wrap(index);
    for (let tried = 0; tried < count && this._opts[normalized]?.disabled; tried++) {
      normalized = wrap(normalized + step);
    }
    const target = this._rows[normalized]?.li;
    if (!target || this._opts[normalized]?.disabled) return;
    for (const row of this._rows) row.li.tabIndex = -1;
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
      let target = this._matchIndex();
      if (target < 0) target = e.key === 'ArrowDown' ? 0 : this._rows.length - 1;
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
        return current < 0 ? this._rows.length - 1 : current - 1;
      case 'Home':
        return 0;
      case 'End':
        return this._rows.length - 1;
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
    this._applySelectionUI();
    this._syncValidity();
  }

  /** Authored options, excluding anything inside the rendered menu. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-option')].filter(
      (o) => !this._wrap?.contains(o),
    );
  }

  private readonly _sync = (): void => {
    const menu = this._menu;
    if (!menu) return;
    const items = this._items();

    while (this._rows.length > items.length) this._rows.pop()!.li.remove();

    this._opts = items.map((o) => {
      if (o.style.display !== 'none') o.style.display = 'none';
      return {
        value: o.getAttribute('value') ?? '',
        label: o.getAttribute('label') || o.textContent || '',
        // `<e-option>` is a plain data carrier, not a form-associated element,
        // so its `disabled` follows the library's boolean-attribute convention.
        disabled: boolAttr(o, 'disabled'),
      };
    });

    this._opts.forEach((opt, i) => {
      let row = this._rows[i];
      if (!row) {
        row = ESelect._makeRow();
        menu.appendChild(row.li);
        this._rows.push(row);
      }
      patchAttr(row.li, 'data-value', opt.value);
      patchAttr(row.li, 'aria-disabled', opt.disabled ? 'true' : null);
      patchText(row.label, opt.label);
    });

    this._applySelectionUI();
  };

  private static _makeRow(): SelectRow {
    const li = document.createElement('li');
    li.className = 'ink-select__option';
    li.setAttribute('role', 'option');
    const label = document.createElement('span');
    label.style.flex = '1';
    li.appendChild(label);
    return { li, label };
  }

  /**
   * Re-derive aria-selected/tabIndex/the check icon/the trigger label for
   * every row from the current `value` and option list. A full idempotent
   * pass rather than a targeted "old vs new" diff, like `e-segmented`'s
   * `_syncSelection` — the patch helpers still only touch the rows whose
   * selected state actually changed.
   */
  private _applySelectionUI(): void {
    const selIdx = this._matchIndex();
    const disabledAll = this._disabled;
    this._rows.forEach((row, i) => {
      const selected = i === selIdx;
      patchAttr(row.li, 'aria-selected', selected ? 'true' : 'false');
      const optDisabled = this._opts[i]?.disabled ?? false;
      const tabIndex = !disabledAll && !optDisabled && selected ? 0 : -1;
      if (row.li.tabIndex !== tabIndex) row.li.tabIndex = tabIndex;
      const icon = row.li.querySelector('svg');
      if (selected && !icon) row.li.insertAdjacentHTML('beforeend', iconSvg('check', 16));
      else if (!selected && icon) icon.remove();
    });

    const opt = selIdx >= 0 ? this._opts[selIdx] : undefined;
    if (this._triggerLabel) patchText(this._triggerLabel, opt ? opt.label : this._placeholder);
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
      t(this, 'requiredSelect'),
    );
  }

  protected override formDisabledChanged(): void {
    this._applyDisabled();
  }
}
define('e-select', ESelect);

/**
 * @summary Single option entry inside an `<e-select>`.
 * @since v1.0.1
 *
 * Acts as a data carrier; the parent renders the actual option row and hides
 * this element. Changing its attributes after mount updates the rendered
 * option — including moving `disabled` on or off it.
 *
 * @attr {string} value - Option value emitted by the parent's `e-change` event. An option
 *   without the attribute carries `''` and is only ever selected once the parent's own
 *   `value` attribute is written — an unset parent selects nothing.
 * @attr {string} [label] - Visible label. Falls back to text content.
 * @attr {boolean} [disabled] - Makes this single option unselectable: it is skipped by arrow-key
 *   navigation and type-ahead, ignores clicks, and is exposed as `aria-disabled="true"`. Follows
 *   the library's boolean-attribute convention, so `disabled="false"` leaves it selectable.
 *
 * @example
 * <e-option value="a" label="Apples"></e-option>
 */
export class EOption extends EpaperElement {}
define('e-option', EOption);
