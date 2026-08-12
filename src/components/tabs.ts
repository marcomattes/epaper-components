import { addCleanup, define, esc, runCleanups } from '../core/dom';
import { iconSvg } from '../core/icons';

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

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const dflt = this.getAttribute('default-value');
    const tabs = [...this.querySelectorAll('e-tab')].map((t) => ({
      key: t.getAttribute('key') ?? '',
      label: t.getAttribute('label') || '',
      icon: t.getAttribute('icon'),
      count: t.getAttribute('count'),
      content: t.innerHTML,
    }));
    let active = dflt || tabs[0]?.key || '';

    // Build all tab buttons and panels once. Panels are persistent — never rebuilt.
    const strip = document.createElement('div');
    strip.className = 'ink-tabs__list';
    strip.setAttribute('role', 'tablist');

    const tabBtns = new Map<string, HTMLButtonElement>();
    const tabPanels = new Map<string, HTMLElement>();

    for (const t of tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ink-tabs__tab';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(t.key === active));
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
        badge.textContent = esc(t.count);
        if (t.key === active) badge.setAttribute('inverted', '');
        btn.appendChild(badge);
      }

      strip.appendChild(btn);
      tabBtns.set(t.key, btn);

      const panel = document.createElement('div');
      panel.className = 'ink-tabs__panel';
      panel.setAttribute('role', 'tabpanel');
      panel.dataset['panel'] = t.key;
      panel.hidden = t.key !== active;
      // One-time injection of authored content. Panel is never rebuilt on tab switch.
      panel.innerHTML = t.content;
      tabPanels.set(t.key, panel);
    }

    const wrap = document.createElement('div');
    wrap.className = 'ink-tabs';
    wrap.appendChild(strip);
    for (const panel of tabPanels.values()) {
      wrap.appendChild(panel);
    }
    this.replaceChildren(wrap);

    const activate = (key: string): void => {
      if (key === active) return;
      // Deselect old tab button and hide its panel.
      const oldBtn = tabBtns.get(active);
      const oldPanel = tabPanels.get(active);
      if (oldBtn) {
        oldBtn.setAttribute('aria-selected', 'false');
        oldBtn.querySelector('e-badge')?.removeAttribute('inverted');
      }
      if (oldPanel) oldPanel.hidden = true;

      // Activate new tab button and show its panel.
      active = key;
      const newBtn = tabBtns.get(active);
      const newPanel = tabPanels.get(active);
      if (newBtn) {
        newBtn.setAttribute('aria-selected', 'true');
        newBtn.querySelector('e-badge')?.setAttribute('inverted', '');
      }
      if (newPanel) newPanel.hidden = false;
    };

    const onClick = (e: Event) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('.ink-tabs__tab');
      if (!btn) return;
      const key = btn.dataset['key'] ?? '';
      activate(key);
      this.dispatchEvent(new CustomEvent('e-change', { detail: { value: key }, bubbles: true }));
    };
    this.addEventListener('click', onClick);
    addCleanup(this, () => this.removeEventListener('click', onClick));
  }

  disconnectedCallback() {
    runCleanups(this);
  }
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
