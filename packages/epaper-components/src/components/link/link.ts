import { captureWrap, define, patchAttr } from '../../core/dom';

/**
 * @summary Inline anchor styled with the design-system underline.
 * @since v1.0.1
 *
 * Children are used as the link text.
 *
 * @attr {string} [href='#'] - Target URL.
 *
 * @example
 * <e-link href="/about">About</e-link>
 */
export class ELink extends HTMLElement {
  static readonly observedAttributes = ['href'];

  private _a: HTMLAnchorElement | null = null;

  connectedCallback() {
    if (!this._a) {
      this._a = captureWrap(this, 'a') as HTMLAnchorElement;
      this._a.className = 'ink-link';
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._a) this._render();
  }

  private _render(): void {
    if (!this._a) return;
    patchAttr(this._a, 'href', this.getAttribute('href') || '#');
  }
}

define('e-link', ELink);
