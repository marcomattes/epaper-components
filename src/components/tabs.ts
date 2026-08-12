import { addCleanup, define, randId, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';
import './badge';

/**
 * @summary Tab strip with persistent panels rendered from `<e-tab>` children.
 *
 * All panels are built once at connect time and toggled with `hidden` on
 * tab switch — nested Custom Elements (form controls etc.) keep their state.
 *
 * @attr {string} [default-value] - Key of the tab active on first render. Defaults to the first tab.
 *
 * @fires {CustomEvent<{value: string}>} e-change - Fired when the user activates a different tab. `value` is the activated tab's `key`.
 *
 * @example
 * <e-tabs default-value="a">
 *   <e-tab key="a" label="Apples">Apple panel</e-tab>
 *   <e-tab key="b" label="Bananas" count="3">Banana panel</e-tab>
 * </e-tabs>
 */
export class ETabs extends HTMLElement {
  private _wired = false;
  private _active = '';
  private _buttons = new Map<string, HTMLButtonElement>();
  private _panels = new Map<string, HTMLElement>();

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      const dflt = this.getAttribute('default-value');
      const tabs = [...this.querySelectorAll('e-tab')].map((tab) => ({
        key: tab.getAttribute('key') ?? '',
        label: tab.getAttribute('label') || '',
        icon: tab.getAttribute('icon'),
        count: tab.getAttribute('count'),
        content: [...tab.childNodes],
      }));
      this._active = dflt || tabs[0]?.key || '';

      // Build all tab buttons and panels once. Panels are persistent — never rebuilt.
      const strip = document.createElement('div');
      strip.className = 'ink-tabs__list';
      strip.setAttribute('role', 'tablist');

      this._buttons.clear();
      this._panels.clear();

      for (const t of tabs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ink-tabs__tab';
        btn.setAttribute('role', 'tab');
        const tabId = randId('ink-tab');
        const panelId = randId('ink-tabpanel');
        btn.id = tabId;
        btn.setAttribute('aria-selected', String(t.key === this._active));
        btn.setAttribute('aria-controls', panelId);
        btn.tabIndex = t.key === this._active ? 0 : -1;
        btn.dataset['key'] = t.key;

        if (t.icon) {
          const iconWrap = document.createElement('span');
          iconWrap.innerHTML = iconSvg(t.icon, 16);
          btn.appendChild(iconWrap);
        }
        const labelSpan = document.createElement('span');
        labelSpan.textContent = t.label;
        btn.appendChild(labelSpan);

        if (t.count != null) {
          const badge = document.createElement('e-badge');
          badge.textContent = t.count;
          if (t.key === this._active) badge.setAttribute('inverted', '');
          btn.appendChild(badge);
        }

        strip.appendChild(btn);
        this._buttons.set(t.key, btn);

        const panel = document.createElement('div');
        panel.className = 'ink-tabs__panel';
        panel.setAttribute('role', 'tabpanel');
        panel.id = panelId;
        panel.setAttribute('aria-labelledby', tabId);
        panel.tabIndex = 0;
        panel.dataset['panel'] = t.key;
        panel.hidden = t.key !== this._active;
        panel.append(...t.content);
        this._panels.set(t.key, panel);
      }

      const wrap = document.createElement('div');
      wrap.className = 'ink-tabs';
      wrap.appendChild(strip);
      for (const panel of this._panels.values()) {
        wrap.appendChild(panel);
      }
      this.replaceChildren(wrap);
    }

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
    addCleanup(this, () => this.removeEventListener('click', this._onClick));
    addCleanup(this, () => this.removeEventListener('keydown', this._onKeydown));
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private _activate(key: string, emit: boolean): void {
    if (key === this._active || !this._buttons.has(key)) return;
    const oldButton = this._buttons.get(this._active);
    const oldPanel = this._panels.get(this._active);
    if (oldButton) {
      oldButton.setAttribute('aria-selected', 'false');
      oldButton.tabIndex = -1;
      oldButton.querySelector('e-badge')?.removeAttribute('inverted');
    }
    if (oldPanel) oldPanel.hidden = true;

    this._active = key;
    const newButton = this._buttons.get(key);
    const newPanel = this._panels.get(key);
    if (newButton) {
      newButton.setAttribute('aria-selected', 'true');
      newButton.tabIndex = 0;
      newButton.querySelector('e-badge')?.setAttribute('inverted', '');
    }
    if (newPanel) newPanel.hidden = false;
    if (emit) {
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: key }, bubbles: true }));
    }
  }

  private _onClick = (e: Event): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.ink-tabs__tab');
    if (button && this.contains(button)) this._activate(button.dataset['key'] ?? '', true);
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    const button = (e.target as Element).closest<HTMLButtonElement>('.ink-tabs__tab');
    if (!button || !this.contains(button)) return;
    const buttons = [...this._buttons.values()];
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
