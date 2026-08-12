import { boolAttr, define } from '../core/dom';

/**
 * @summary Page-level layout container that arranges header, sider, content and footer children.
 *
 * @attr {boolean} [has-sider] - Switches the inner direction so a sider can sit beside the content.
 *
 * @example
 * <e-layout has-sider>
 *   <e-layout-header></e-layout-header>
 *   <e-layout-sider width="240"></e-layout-sider>
 *   <e-layout-content></e-layout-content>
 *   <e-layout-footer></e-layout-footer>
 * </e-layout>
 */
export class ELayout extends HTMLElement {
  static observedAttributes = ['has-sider'];

  connectedCallback() {
    this.classList.add('ink-layout');
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    this.classList.toggle('ink-layout--has-sider', boolAttr(this, 'has-sider'));
  }
}
define('e-layout', ELayout);

/** @summary Header region inside an `<e-layout>`. */
export class ELayoutHeader extends HTMLElement {
  private _wired = false;
  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<header class="ink-layout__header">${this.innerHTML}</header>`;
  }
}
define('e-layout-header', ELayoutHeader);

/**
 * @summary Side rail rendered next to the content area.
 *
 * @attr {string} [width='220'] - Pixel width of the sider.
 */
export class ELayoutSider extends HTMLElement {
  static observedAttributes = ['width'];

  private _aside: HTMLElement | null = null;

  connectedCallback() {
    if (!this._aside) {
      const aside = document.createElement('aside');
      aside.className = 'ink-layout__sider';
      while (this.firstChild) aside.appendChild(this.firstChild);
      this.appendChild(aside);
      this._aside = aside;
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._aside) this._render();
  }

  private _render(): void {
    if (!this._aside) return;
    const w = `${this.getAttribute('width') || '220'}px`;
    if (this._aside.style.width !== w) this._aside.style.width = w;
  }
}
define('e-layout-sider', ELayoutSider);

/** @summary Main content region inside an `<e-layout>`. */
export class ELayoutContent extends HTMLElement {
  private _wired = false;
  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<main class="ink-layout__content">${this.innerHTML}</main>`;
  }
}
define('e-layout-content', ELayoutContent);

/** @summary Footer region inside an `<e-layout>`. */
export class ELayoutFooter extends HTMLElement {
  private _wired = false;
  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<footer class="ink-layout__footer">${this.innerHTML}</footer>`;
  }
}
define('e-layout-footer', ELayoutFooter);
