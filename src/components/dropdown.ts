import { addCleanup, define, onGlobal, randId, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';
import './button';

type DropdownItemDef =
  | { divider: true }
  | { header: string }
  | { icon: string | null; label: string; shortcut: string | null; disabled: boolean };

/**
 * @summary Trigger-driven menu with items, headers and dividers.
 * @since v1.0.1
 *
 * @attr {'left'|'right'} [align='left'] - Menu alignment relative to the trigger.
 *
 * @slot trigger - Element that opens the menu (typically an `<e-button>`).
 *
 * @fires {CustomEvent<{index: number}>} e-select - Fired when a non-disabled item is activated. `index` is the index of the item among activatable items.
 *
 * @example
 * <e-dropdown align="right">
 *   <e-button slot="trigger">Open</e-button>
 *   <e-dropdown-item header="Document"></e-dropdown-item>
 *   <e-dropdown-item icon="doc" label="New" shortcut="⌘N"></e-dropdown-item>
 *   <e-dropdown-item divider></e-dropdown-item>
 *   <e-dropdown-item icon="trash" label="Delete" disabled></e-dropdown-item>
 * </e-dropdown>
 */
export class EDropdown extends HTMLElement {
  static observedAttributes = ['align'];

  private _wired = false;
  private _menu: HTMLElement | null = null;
  private _trigger: HTMLElement | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const trigger = this.querySelector<HTMLElement>('[slot="trigger"]') ?? this._defaultTrigger();
      const items: DropdownItemDef[] = [...this.querySelectorAll('e-dropdown-item')].map((item) => {
        if (item.hasAttribute('divider')) return { divider: true as const };
        if (item.hasAttribute('header')) return { header: item.getAttribute('header') ?? '' };
        return {
          icon: item.getAttribute('icon'),
          label: item.getAttribute('label') ?? '',
          shortcut: item.getAttribute('shortcut'),
          disabled: item.hasAttribute('disabled'),
        };
      });
      this._build(trigger, items);
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
      if (e.key === 'Escape' && !this._menu!.hidden) {
        this._setOpen(false);
        this._triggerControl()?.focus();
      }
    });
  }

  private _defaultTrigger(): HTMLElement {
    const trigger = document.createElement('e-button');
    trigger.textContent = 'Open';
    return trigger;
  }

  private _build(trigger: HTMLElement, items: DropdownItemDef[]): void {
    const root = document.createElement('div');
    root.className = 'ink-dropdown';
    const triggerWrap = document.createElement('span');
    triggerWrap.dataset['trigger'] = '';
    triggerWrap.appendChild(trigger);

    const menu = document.createElement('div');
    menu.id = randId('ink-dropdown-menu');
    menu.className = 'ink-dropdown__menu';
    menu.classList.toggle(
      'ink-dropdown__menu--align-right',
      this.getAttribute('align') === 'right',
    );
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    for (const definition of items) {
      if ('divider' in definition) {
        const divider = document.createElement('div');
        divider.className = 'ink-dropdown__divider';
        divider.setAttribute('role', 'separator');
        menu.appendChild(divider);
      } else if ('header' in definition) {
        const header = document.createElement('div');
        header.className = 'ink-dropdown__header';
        header.setAttribute('role', 'presentation');
        header.textContent = definition.header;
        menu.appendChild(header);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ink-dropdown__item';
        button.setAttribute('role', 'menuitem');
        button.disabled = definition.disabled;
        if (definition.icon) {
          const icon = document.createElement('span');
          icon.innerHTML = iconSvg(definition.icon, 18);
          button.appendChild(icon);
        }
        const label = document.createElement('span');
        label.style.flex = '1';
        label.textContent = definition.label;
        button.appendChild(label);
        if (definition.shortcut) {
          const shortcut = document.createElement('span');
          shortcut.className = 'ink-dropdown__shortcut';
          shortcut.textContent = definition.shortcut;
          button.appendChild(shortcut);
        }
        menu.appendChild(button);
      }
    }

    root.append(triggerWrap, menu);
    this.replaceChildren(root);
    this._trigger = triggerWrap;
    this._menu = menu;
    const control = this._triggerControl();
    control?.setAttribute('aria-haspopup', 'menu');
    control?.setAttribute('aria-expanded', 'false');
    control?.setAttribute('aria-controls', menu.id);
  }

  private _triggerControl(): HTMLElement | null {
    return this._trigger?.querySelector<HTMLElement>('button, [role="button"]') ?? null;
  }

  private _setOpen(open: boolean): void {
    if (!this._menu) return;
    this._menu.hidden = !open;
    this._triggerControl()?.setAttribute('aria-expanded', String(open));
  }

  private _enabledItems(): HTMLButtonElement[] {
    return this._menu
      ? [...this._menu.querySelectorAll<HTMLButtonElement>('.ink-dropdown__item')].filter(
          (button) => !button.disabled,
        )
      : [];
  }

  private _focusItem(index: number): void {
    const items = this._enabledItems();
    if (items.length === 0) return;
    items[((index % items.length) + items.length) % items.length]?.focus();
  }

  private _onTriggerClick = (): void => this._setOpen(!!this._menu?.hidden);

  private _onTriggerKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    this._setOpen(true);
    const items = this._enabledItems();
    this._focusItem(e.key === 'ArrowDown' ? 0 : items.length - 1);
  };

  private _onMenuClick = (e: Event): void => {
    const item = (e.target as Element).closest<HTMLButtonElement>('.ink-dropdown__item');
    if (!item || item.disabled || !this._menu?.contains(item)) return;
    const menuItems = [...this._menu.querySelectorAll('.ink-dropdown__item')];
    this.dispatchEvent(
      new CustomEvent('e-select', {
        detail: { index: menuItems.indexOf(item) },
        bubbles: true,
      }),
    );
    this._setOpen(false);
    this._triggerControl()?.focus();
  };

  private _onMenuKeydown = (e: KeyboardEvent): void => {
    if (this._menu?.hidden) return;
    const items = this._enabledItems();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') this._focusItem(current < 0 ? 0 : current + 1);
    else if (e.key === 'ArrowUp') this._focusItem(current < 0 ? items.length - 1 : current - 1);
    else if (e.key === 'Home') this._focusItem(0);
    else if (e.key === 'End') this._focusItem(items.length - 1);
    else return;
    e.preventDefault();
  };

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback() {
    if (!this._menu) return;
    this._menu.classList.toggle(
      'ink-dropdown__menu--align-right',
      this.getAttribute('align') === 'right',
    );
  }
}
define('e-dropdown', EDropdown);

/**
 * @summary Single entry inside an `<e-dropdown>` menu.
 *
 * Acts as a data carrier; the parent renders the actual menu row.
 *
 * @attr {boolean} [divider] - Render a horizontal separator instead of an item.
 * @attr {string} [header] - Render a non-interactive section header with this text.
 * @attr {string} [icon] - Icon name displayed before the label.
 * @attr {string} [label] - Visible label text.
 * @attr {string} [shortcut] - Optional shortcut hint shown trailing.
 * @attr {boolean} [disabled] - Disables interaction for this entry.
 */
export class EDropdownItem extends HTMLElement {}
define('e-dropdown-item', EDropdownItem);
