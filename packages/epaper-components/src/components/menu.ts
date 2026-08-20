import {
  addCleanup,
  define,
  patchAttr,
  patchBoolAttr,
  patchClassModifier,
  runCleanups,
} from '../core/dom';
import { iconSvg } from '../core/icons';
import './badge';

interface MenuItem {
  value: string;
  label: string | null;
  icon: string | null;
  badge: string | null;
  children: MenuItem[];
}

interface RenderedItem {
  item: MenuItem;
  btn: HTMLButtonElement;
  badge: HTMLElement | null;
  childUl: HTMLUListElement | null;
  chevron: Element | null;
  hasKids: boolean;
  open: boolean;
}

/**
 * @summary Hierarchical navigation menu rendered from `<e-menu-item>` children.
 * @since v1.0.1
 *
 * @attr {'horizontal'|'vertical'} [mode='vertical'] - Menu orientation. Reactive.
 * @attr {string} [value] - Currently active item value. Reactive.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user activates a leaf item.
 *
 * @example
 * <e-menu value="home">
 *   <e-menu-item value="home" icon="home" label="Home"></e-menu-item>
 *   <e-menu-item value="docs" label="Docs">
 *     <e-menu-item value="docs/api" label="API"></e-menu-item>
 *   </e-menu-item>
 * </e-menu>
 */
export class EMenu extends HTMLElement {
  static readonly observedAttributes = ['mode', 'value'];

  private _wired = false;
  private _items: MenuItem[] = [];
  private readonly _byValue = new Map<string, RenderedItem>();
  private _rootUl: HTMLUListElement | null = null;

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this._items = this._collectItems(this);
      this._build();
    }
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  attributeChangedCallback(name: string) {
    if (!this._wired) return;
    if (name === 'value') this._applyValue();
    else if (name === 'mode') this._applyMode();
  }

  private readonly _onClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLElement>('.ink-menu__btn');
    if (!btn || !this.contains(btn)) return;
    const v = btn.dataset['value'] ?? '';
    const ri = this._byValue.get(v);
    if (!ri) return;
    if (ri.hasKids) {
      ri.open = !ri.open;
      this._applyOpen(ri);
    } else {
      this.setAttribute('value', v);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: v }, bubbles: true }));
    }
  };

  private readonly _onKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const btn = (ke.target as Element).closest<HTMLButtonElement>('.ink-menu__btn');
    if (!btn || !this.contains(btn)) return;
    const v = btn.dataset['value'] ?? '';
    const ri = this._byValue.get(v);
    if (!ri) return;
    const horiz = this.getAttribute('mode') === 'horizontal';
    const nextKey = horiz ? 'ArrowRight' : 'ArrowDown';
    const prevKey = horiz ? 'ArrowLeft' : 'ArrowUp';
    if (ke.key === nextKey) {
      ke.preventDefault();
      this._focusSibling(btn, 1);
    } else if (ke.key === prevKey) {
      ke.preventDefault();
      this._focusSibling(btn, -1);
    } else if (ke.key === 'ArrowRight' && !horiz) {
      ke.preventDefault();
      this._expandOrDescend(ri);
    } else if (ke.key === 'ArrowLeft' && !horiz) {
      ke.preventDefault();
      this._collapseOrAscend(ri, btn);
    } else if (ke.key === 'Home') {
      ke.preventDefault();
      this._visibleButtons()[0]?.focus();
    } else if (ke.key === 'End') {
      ke.preventDefault();
      this._visibleButtons().at(-1)?.focus();
    }
  };

  /** ArrowRight in vertical mode: open a collapsed submenu, or descend into an open one. */
  private _expandOrDescend(ri: RenderedItem): void {
    if (ri.hasKids && !ri.open) {
      ri.open = true;
      this._applyOpen(ri);
      return;
    }
    if (ri.hasKids && ri.childUl) {
      ri.childUl.querySelector<HTMLButtonElement>('.ink-menu__btn')?.focus();
    }
  }

  /** ArrowLeft in vertical mode: close an open submenu, or ascend to the parent item. */
  private _collapseOrAscend(ri: RenderedItem, btn: HTMLButtonElement): void {
    if (ri.hasKids && ri.open) {
      ri.open = false;
      this._applyOpen(ri);
      return;
    }
    this._focusParent(btn);
  }

  private _visibleButtons(): HTMLButtonElement[] {
    if (!this._rootUl) return [];
    return [...this._rootUl.querySelectorAll<HTMLButtonElement>('.ink-menu__btn')].filter((b) => {
      let p: HTMLElement | null = b.parentElement;
      while (p && p !== this._rootUl) {
        if (p.tagName === 'UL' && (p as HTMLUListElement).hidden) return false;
        p = p.parentElement;
      }
      return true;
    });
  }

  private _focusSibling(btn: HTMLButtonElement, dir: 1 | -1): void {
    const list = this._visibleButtons();
    const i = list.indexOf(btn);
    if (i < 0) return;
    const next = list[(i + dir + list.length) % list.length];
    next?.focus();
  }

  private _focusParent(btn: HTMLButtonElement): void {
    const li = btn.closest('li');
    const parentLi = li?.parentElement?.closest<HTMLLIElement>('li');
    const parentBtn = parentLi?.querySelector<HTMLButtonElement>(':scope > .ink-menu__btn');
    parentBtn?.focus();
  }

  private _collectItems(host: Element): MenuItem[] {
    return [...host.querySelectorAll(':scope > e-menu-item')].map((it) => ({
      value: it.getAttribute('value') ?? '',
      label: it.getAttribute('label'),
      icon: it.getAttribute('icon'),
      badge: it.getAttribute('badge'),
      children: this._collectItems(it),
    }));
  }

  private _build(): void {
    const horiz = this.getAttribute('mode') === 'horizontal';
    const value = this.getAttribute('value');

    this._byValue.clear();
    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    ul.className = 'ink-menu' + (horiz ? ' ink-menu--horizontal' : '');
    this._rootUl = ul;

    for (const it of this._items) ul.appendChild(this._buildItem(it, value));
    nav.appendChild(ul);
    this.replaceChildren(nav);
  }

  private _buildItem(item: MenuItem, value: string | null): HTMLLIElement {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ink-menu__btn';
    btn.dataset['value'] = item.value;
    const hasKids = item.children.length > 0;
    btn.dataset['hasKids'] = String(hasKids);
    btn.dataset['key'] = item.value;
    const on = value === item.value;
    btn.setAttribute('aria-current', on ? 'page' : 'false');

    this._appendIcon(btn, item.icon);

    const span = document.createElement('span');
    span.style.flex = '1';
    span.textContent = item.label ?? '';
    btn.appendChild(span);

    const badgeEl = this._appendBadge(btn, item.badge, on);

    const isOpen = hasKids && item.children.some((c) => c.value === value);
    const chevron = hasKids ? this._appendChevron(btn, isOpen) : null;

    li.appendChild(btn);

    const childUl = hasKids ? this._buildChildList(li, item.children, value, isOpen) : null;

    this._byValue.set(item.value, {
      item,
      btn,
      badge: badgeEl,
      childUl,
      chevron,
      hasKids,
      open: isOpen,
    });
    return li;
  }

  private _appendIcon(btn: HTMLButtonElement, iconName: string | null): void {
    if (!iconName) return;
    const icon = this._svgFromString(iconSvg(iconName, 16));
    if (icon) btn.appendChild(icon);
  }

  private _appendBadge(
    btn: HTMLButtonElement,
    badge: string | null,
    on: boolean,
  ): HTMLElement | null {
    if (badge == null) return null;
    const badgeEl = document.createElement('e-badge');
    if (!on) badgeEl.setAttribute('inverted', '');
    badgeEl.textContent = badge;
    btn.appendChild(badgeEl);
    return badgeEl;
  }

  private _appendChevron(btn: HTMLButtonElement, isOpen: boolean): Element | null {
    const chevron = this._svgFromString(iconSvg(isOpen ? 'chevU' : 'chevD', 14));
    if (chevron) btn.appendChild(chevron);
    return chevron;
  }

  private _buildChildList(
    li: HTMLLIElement,
    children: MenuItem[],
    value: string | null,
    isOpen: boolean,
  ): HTMLUListElement {
    const childUl = document.createElement('ul');
    for (const c of children) childUl.appendChild(this._buildItem(c, value));
    childUl.hidden = !isOpen;
    li.appendChild(childUl);
    return childUl;
  }

  private _svgFromString(svg: string): Element | null {
    const tpl = document.createElement('template');
    tpl.innerHTML = svg;
    return tpl.content.firstElementChild;
  }

  private _applyValue(): void {
    const value = this.getAttribute('value');
    for (const ri of this._byValue.values()) {
      const on = ri.item.value === value;
      patchAttr(ri.btn, 'aria-current', on ? 'page' : 'false');
      if (ri.badge) patchBoolAttr(ri.badge, 'inverted', !on);
    }
    if (value != null) this._openAncestorsOf(value);
  }

  private _openAncestorsOf(value: string): void {
    const path: RenderedItem[] = [];
    const walk = (items: MenuItem[]): boolean => {
      for (const it of items) {
        if (it.value === value) return true;
        if (it.children.length && walk(it.children)) {
          const ri = this._byValue.get(it.value);
          if (ri) path.push(ri);
          return true;
        }
      }
      return false;
    };
    walk(this._items);
    for (const ri of path) {
      if (!ri.open) {
        ri.open = true;
        this._applyOpen(ri);
      }
    }
  }

  private _applyOpen(ri: RenderedItem): void {
    if (!ri.childUl) return;
    patchBoolAttr(ri.childUl, 'hidden', !ri.open);
    if (ri.chevron) {
      const next = this._svgFromString(iconSvg(ri.open ? 'chevU' : 'chevD', 14));
      if (next) {
        ri.chevron.replaceWith(next);
        ri.chevron = next;
      }
    }
  }

  private _applyMode(): void {
    if (!this._rootUl) return;
    const horiz = this.getAttribute('mode') === 'horizontal';
    patchClassModifier(this._rootUl, 'ink-menu--', horiz ? 'horizontal' : null);
  }
}
define('e-menu', EMenu);

/**
 * @summary Single entry inside an `<e-menu>`. Can nest further `<e-menu-item>` children.
 *
 * @attr {string} value - Identifier emitted by the parent's `e-change` event.
 * @attr {string} [label] - Visible label.
 * @attr {string} [icon] - Icon name displayed before the label.
 * @attr {string} [badge] - Badge text shown trailing the label.
 */
export class EMenuItem extends HTMLElement {}
define('e-menu-item', EMenuItem);
