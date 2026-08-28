import {
  addCleanup,
  define,
  observeItems,
  patchAttr,
  patchBoolAttr,
  patchText,
  randId,
  runCleanups,
} from '../../core/dom';
import { iconSvg } from '../../core/icons';
import '../badge/badge';

/** Rendered tab button + its persistent panel, plus the cached parts patched from `<e-tab>` attributes. */
interface TabRow {
  btn: HTMLButtonElement;
  panel: HTMLElement;
  labelSpan: HTMLElement;
  iconWrap: HTMLElement | null;
  iconName: string | null;
  badge: HTMLElement | null;
  /** Content is moved into the panel once, at row creation, and never revisited — see class doc. */
  contentMoved: boolean;
}

/**
 * @summary Tab strip with persistent panels rendered from `<e-tab>` children.
 * @since v1.0.1
 *
 * Reads its entries from child `<e-tab>` elements and keeps the strip live:
 * the authored items stay in the light DOM as the source of truth, and a
 * `MutationObserver` re-syncs the tab buttons whenever one is added, removed,
 * reordered, relabelled, re-iconed or re-counted. Rows are keyed by the
 * `<e-tab>` element itself, so editing one in place keeps its button and
 * panel identity — including which tab is active, tracked by key.
 *
 * A tab's default-slot *content* is moved into its panel once, the first time
 * that tab is rendered, exactly as before — not re-derived on every sync. That
 * is what lets a nested Custom Element (a form control, say) keep its live
 * state indefinitely: the panel node holding it is never rebuilt or re-cloned.
 * The trade-off is that content appended to an `<e-tab>` *after* its panel
 * already exists does not appear — the same limit the original one-shot read
 * had for every attribute, just narrowed down to this one case. All panels
 * are still built once per tab and toggled with `hidden` on tab switch.
 *
 * Because the items stay put they would otherwise render twice, so each one is
 * hidden with an inline `display:none` when it is first wired. The stable form
 * of that is a `e-tab { display: none; }` rule in `components.css`; the
 * inline style is what guarantees it without one.
 *
 * @attr {string} [default-value] - Key of the tab active on first render. Defaults to the first tab when absent, empty or matching no tab.
 * @attr {string} [value] - Key of the active tab. Reactive: setting it after mount switches tabs without emitting `e-change`, which is what a wizard or a multi-section form host needs. Wins over `default-value` at mount. A key matching no tab is ignored. Not reflected — read the `value` property for the live key. @since v1.3.0
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user activates a different tab. `value` is the activated tab's `key`. Programmatic switches via the `value` attribute or property stay silent.
 *
 * @slot - Default slot for `<e-tab>` children.
 *
 * @example
 * <e-tabs default-value="a">
 *   <e-tab key="a" label="Apples">Apple panel</e-tab>
 *   <e-tab key="b" label="Bananas" count="3">Banana panel</e-tab>
 * </e-tabs>
 *
 * @example
 * // Wizard host driving the strip programmatically.
 * document.querySelector('e-tabs').value = 'step-2';
 */
export class ETabs extends HTMLElement {
  static readonly observedAttributes = ['value'];

  private _wired = false;
  private _wrap: HTMLElement | null = null;
  private _strip: HTMLElement | null = null;
  private _active = '';
  private readonly _rows = new WeakMap<Element, TabRow>();
  private _keys: HTMLElement[] = [];
  private _byKey = new Map<string, TabRow>();

  /** Key of the active tab. Assigning switches tabs without emitting `e-change`. @since v1.3.0 */
  get value(): string {
    return this._active;
  }
  set value(v: string) {
    // A setter takes no default parameter, and callers reach this from plain
    // JS where the declared type is not enforced.
    const key = typeof v === 'string' ? v : '';
    if (this._wired) this._activate(key, false);
    else this.setAttribute('value', key);
  }

  attributeChangedCallback(_name: string, _old: string | null, v: string | null) {
    // Panels stay mounted, so switching is a pure `hidden` flip: nested form
    // controls keep their state across a programmatic tab change.
    if (this._wired) this._activate(v ?? '', false);
  }

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const wrap = document.createElement('div');
      wrap.className = 'ink-tabs';
      const strip = document.createElement('div');
      strip.className = 'ink-tabs__list';
      strip.setAttribute('role', 'tablist');
      wrap.appendChild(strip);
      this._wrap = wrap;
      this._strip = strip;
      this.appendChild(wrap);

      // An authored `value` is the stronger statement of intent — it is the
      // attribute a host keeps in sync — so it outranks `default-value`.
      this._active = this.getAttribute('value') || this.getAttribute('default-value') || '';
    }
    this._sync();

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
    observeItems(this, this._sync, {
      attributeFilter: ['key', 'label', 'icon', 'count'],
      isOutput: (n) => this._wrap?.contains(n) ?? false,
    });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  /** Authored tabs, excluding anything inside the rendered strip/panels. */
  private _items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('e-tab')].filter((t) => !this._wrap?.contains(t));
  }

  private readonly _sync = (): void => {
    const wrap = this._wrap;
    const strip = this._strip;
    if (!wrap || !strip) return;
    const items = this._items();

    for (const stale of this._keys) {
      if (items.includes(stale)) continue;
      const row = this._rows.get(stale);
      if (row) {
        row.btn.remove();
        row.panel.remove();
      }
      this._rows.delete(stale);
    }
    this._keys = items;

    this._byKey = new Map();
    items.forEach((item, i) => {
      if (item.style.display !== 'none') item.style.display = 'none';
      let row = this._rows.get(item);
      if (!row) {
        row = ETabs._makeRow();
        this._rows.set(item, row);
        strip.appendChild(row.btn);
        wrap.appendChild(row.panel);
      }
      ETabs._patchRow(row, item);
      if (strip.children[i] !== row.btn) strip.insertBefore(row.btn, strip.children[i] ?? null);
      this._byKey.set(item.getAttribute('key') ?? '', row);
    });

    // A `default-value`/`value` matching no tab falls back to the first tab
    // (and an active tab whose own `key` just changed under it does too), so
    // exactly one tab is always selected and reachable by keyboard.
    if (!this._byKey.has(this._active)) {
      this._active = items[0]?.getAttribute('key') ?? '';
    }
    this._applyActiveUI();
  };

  private static _makeRow(): TabRow {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ink-tabs__tab';
    btn.setAttribute('role', 'tab');
    btn.id = randId('ink-tab');
    btn.setAttribute('aria-selected', 'false');
    btn.tabIndex = -1;
    const labelSpan = document.createElement('span');
    btn.appendChild(labelSpan);

    const panel = document.createElement('div');
    panel.className = 'ink-tabs__panel';
    panel.setAttribute('role', 'tabpanel');
    panel.id = randId('ink-tabpanel');
    panel.setAttribute('aria-labelledby', btn.id);
    panel.tabIndex = 0;
    panel.hidden = true;
    btn.setAttribute('aria-controls', panel.id);

    return {
      btn,
      panel,
      labelSpan,
      iconWrap: null,
      iconName: null,
      badge: null,
      contentMoved: false,
    };
  }

  private static _patchRow(row: TabRow, item: Element): void {
    const key = item.getAttribute('key') ?? '';
    row.btn.dataset['key'] = key;
    row.panel.dataset['panel'] = key;
    patchText(row.labelSpan, item.getAttribute('label') || '');

    const icon = item.getAttribute('icon');
    if (icon) {
      if (!row.iconWrap) {
        row.iconWrap = document.createElement('span');
        row.btn.insertBefore(row.iconWrap, row.labelSpan);
      }
      if (row.iconName !== icon) {
        row.iconWrap.innerHTML = iconSvg(icon, 16);
        row.iconName = icon;
      }
    } else if (row.iconWrap) {
      row.iconWrap.remove();
      row.iconWrap = null;
      row.iconName = null;
    }

    const count = item.getAttribute('count');
    if (count != null) {
      if (!row.badge) {
        row.badge = document.createElement('e-badge');
        row.btn.appendChild(row.badge);
      }
      patchText(row.badge, count);
    } else if (row.badge) {
      row.badge.remove();
      row.badge = null;
    }

    if (!row.contentMoved) {
      row.panel.append(...item.childNodes);
      row.contentMoved = true;
    }
  }

  /** Re-derive aria-selected/tabIndex/panel visibility/badge inversion for every row from `_active`. */
  private _applyActiveUI(): void {
    for (const [key, row] of this._byKey) {
      const isActive = key === this._active;
      patchAttr(row.btn, 'aria-selected', isActive ? 'true' : 'false');
      row.btn.tabIndex = isActive ? 0 : -1;
      row.panel.hidden = !isActive;
      if (row.badge) patchBoolAttr(row.badge, 'inverted', isActive);
    }
  }

  private _activate(key: string, emit: boolean): void {
    if (key === this._active || !this._byKey.has(key)) return;
    this._active = key;
    this._applyActiveUI();
    if (emit) {
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: key }, bubbles: true }));
    }
  }

  private readonly _onClick = (e: Event): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.ink-tabs__tab');
    if (button && this.contains(button)) this._activate(button.dataset['key'] ?? '', true);
  };

  private readonly _onKeydown = (e: KeyboardEvent): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.ink-tabs__tab');
    if (!button || !this.contains(button)) return;
    const buttons = this._keys
      .map((item) => this._rows.get(item)?.btn)
      .filter((b): b is HTMLButtonElement => b != null);
    const index = buttons.indexOf(button);
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else return;
    e.preventDefault();
    const target = buttons[next];
    if (!target) return;
    this._activate(target.dataset['key'] ?? '', true);
    target.focus();
  };
}
define('e-tabs', ETabs);

/**
 * @summary Single tab entry inside an `<e-tabs>`. Children are used as the panel content.
 *
 * Acts as a data carrier; the parent renders the actual tab button and panel
 * and hides this element. Changing `key`, `label`, `icon` or `count` after
 * mount updates the rendered tab. The default-slot content is only read the
 * first time this tab is rendered — see the parent's class documentation.
 *
 * @attr {string} key - Identifier emitted by the parent's `e-change` event.
 * @attr {string} [label] - Visible tab label.
 * @attr {string} [icon] - Icon name displayed before the label.
 * @attr {string} [count] - Trailing badge value (rendered as an `<e-badge>`).
 *
 * @example
 * <e-tab key="a" label="Apples">Apple panel content</e-tab>
 */
export class ETab extends HTMLElement {}
define('e-tab', ETab);
