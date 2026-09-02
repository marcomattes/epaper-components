import { boolAttr, captureWrap, clampedNumAttr, define, EpaperElement } from '../../core/dom';

/**
 * @summary Page-level layout container that arranges header, sider, content and footer children.
 * @since v1.0.1
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
export class ELayout extends EpaperElement {
  static readonly observedAttributes = ['has-sider'];

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

/** @summary Header region inside an `<e-layout>`. *
 * @example
 * <e-layout-header>Masthead</e-layout-header>
 */
export class ELayoutHeader extends EpaperElement {
  private _wired = false;
  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    captureWrap(this, 'header').className = 'ink-layout__header';
  }
}
define('e-layout-header', ELayoutHeader);

/**
 * @summary Side rail rendered next to the content area.
 * @since v1.0.1
 *
 * @attr {string} [width='220'] - Pixel width of the sider.
 *
 * @example
 * <e-layout-sider width="220">Navigation</e-layout-sider>
 */
export class ELayoutSider extends EpaperElement {
  static readonly observedAttributes = ['width'];

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
    const w = `${clampedNumAttr(this, 'width', 220, 0, 10000)}px`;
    if (this._aside.style.width !== w) this._aside.style.width = w;
  }
}
define('e-layout-sider', ELayoutSider);

/** @summary Main content region inside an `<e-layout>`. *
 * @example
 * <e-layout-content>Page body</e-layout-content>
 */
export class ELayoutContent extends EpaperElement {
  private _wired = false;
  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    captureWrap(this, 'main').className = 'ink-layout__content';
  }
}
define('e-layout-content', ELayoutContent);

/** @summary Footer region inside an `<e-layout>`. *
 * @example
 * <e-layout-footer>Imprint</e-layout-footer>
 */
export class ELayoutFooter extends EpaperElement {
  private _wired = false;
  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    captureWrap(this, 'footer').className = 'ink-layout__footer';
  }
}
define('e-layout-footer', ELayoutFooter);
