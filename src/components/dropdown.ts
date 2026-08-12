import { define, esc, onGlobal, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';

type DropdownItemDef =
  | { divider: true }
  | { header: string }
  | { icon: string | null; label: string; shortcut: string | null; disabled: boolean };

/**
 * @summary Trigger-driven menu with items, headers and dividers.
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
    if (this._wired) return;
    this._wired = true;
    const align = this.getAttribute('align') === 'right' ? 'right' : 'left';
    const trigger = this.querySelector('[slot="trigger"]');
    const triggerHtml = trigger ? trigger.outerHTML : '<e-button>Open</e-button>';
    if (trigger) trigger.remove();

    const items: DropdownItemDef[] = [...this.querySelectorAll('e-dropdown-item')].map((it) => {
      if (it.hasAttribute('divider')) return { divider: true as const };
      if (it.hasAttribute('header')) return { header: it.getAttribute('header') ?? '' };
      return {
        icon: it.getAttribute('icon'),
        label: it.getAttribute('label') ?? '',
        shortcut: it.getAttribute('shortcut'),
        disabled: it.hasAttribute('disabled'),
      };
    });

    this.innerHTML = `
      <div class="ink-dropdown">
        <span data-trigger>${triggerHtml}</span>
        <div class="ink-dropdown__menu${align === 'right' ? ' ink-dropdown__menu--align-right' : ''}"
             role="menu" hidden>
          ${items
            .map((it) => {
              if ('divider' in it && it.divider) return `<div class="ink-dropdown__divider"></div>`;
              if ('header' in it)
                return `<div class="ink-dropdown__header">${esc(it.header)}</div>`;
              const item = it as Extract<DropdownItemDef, { label: string }>;
              return `<button class="ink-dropdown__item" role="menuitem"
                            ${item.disabled ? 'disabled' : ''}>
              ${item.icon ? iconSvg(item.icon, 18) : ''}
              <span style="flex:1">${esc(item.label)}</span>
              ${item.shortcut ? `<span class="ink-dropdown__shortcut">${esc(item.shortcut)}</span>` : ''}
            </button>`;
            })
            .join('')}
        </div>
      </div>`;
    this._menu = this.querySelector('.ink-dropdown__menu');
    this._trigger = this.querySelector('[data-trigger]');
    const setOpen = (v: boolean) => {
      this._menu!.hidden = !v;
      const t = this._trigger!.querySelector<HTMLElement>('button, [role="button"]');
      if (t) t.setAttribute('aria-expanded', String(v));
    };
    const enabledItems = (): HTMLButtonElement[] =>
      [...this._menu!.querySelectorAll<HTMLButtonElement>('.ink-dropdown__item')].filter(
        (b) => !b.disabled,
      );
    const focusItem = (idx: number): void => {
      const items = enabledItems();
      if (items.length === 0) return;
      const i = ((idx % items.length) + items.length) % items.length;
      items[i]?.focus();
    };
    this._trigger!.addEventListener('click', () => setOpen(!!this._menu!.hidden));
    this._trigger!.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'ArrowDown' || ke.key === 'ArrowUp') {
        ke.preventDefault();
        setOpen(true);
        const items = enabledItems();
        focusItem(ke.key === 'ArrowDown' ? 0 : items.length - 1);
      }
    });
    this.addEventListener('click', (e) => {
      const item = (e.target as Element).closest<HTMLButtonElement>('.ink-dropdown__item');
      if (item && !item.disabled) {
        const menuItems = [...this._menu!.querySelectorAll('.ink-dropdown__item')];
        this.dispatchEvent(
          new CustomEvent('e-select', {
            detail: { index: menuItems.indexOf(item) },
            bubbles: true,
          }),
        );
        setOpen(false);
      }
    });
    this._menu!.addEventListener('keydown', (e) => {
      if (this._menu!.hidden) return;
      const items = enabledItems();
      const cur = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusItem(cur < 0 ? 0 : cur + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusItem(cur < 0 ? items.length - 1 : cur - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusItem(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusItem(items.length - 1);
      }
    });
    onGlobal(this, document, 'mousedown', (e) => {
      if (!this.contains(e.target as Node)) setOpen(false);
    });
    onGlobal(this, document, 'keydown', (e) => {
      if (e.key === 'Escape' && !this._menu!.hidden) {
        setOpen(false);
        const t = this._trigger!.querySelector<HTMLElement>('button, [role="button"]');
        t?.focus();
      }
    });
  }

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
