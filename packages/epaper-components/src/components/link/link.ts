import { boolAttr, captureWrap, define, patchAttr, patchBoolAttr } from '../../core/dom';

/**
 * Minimum `rel` for a `target="_blank"` link: `noopener` cuts the new
 * document's `window.opener` handle back into this page, `noreferrer` stops
 * the referrer leaking. Applied only when the author states no `rel` of their
 * own — an explicit `rel` is a deliberate choice and is never rewritten.
 */
const BLANK_REL = 'noopener noreferrer';

/**
 * @summary Inline anchor styled with the design-system underline.
 * @since v1.0.1
 *
 * Children are used as the link text.
 *
 * @attr {string} [href='#'] - Target URL.
 * @attr {string} [target] - Browsing context for the link (`_blank`, `_self`, a frame name). @since v1.3.0
 * @attr {string} [rel] - Link relationship. When `target="_blank"` and no `rel` is authored, `noopener noreferrer` is applied automatically. @since v1.3.0
 * @attr {boolean} [external] - Marks the link as leaving the site. Sets `data-external` on the anchor for the outward marker. @since v1.3.0
 *
 * @example
 * <e-link href="/about">About</e-link>
 *
 * @example
 * <e-link href="https://bund.de" target="_blank" external>Bundesportal</e-link>
 */
export class ELink extends HTMLElement {
  static readonly observedAttributes = ['href', 'target', 'rel', 'external'];

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
    const target = this.getAttribute('target');
    patchAttr(this._a, 'target', target || null);
    const rel = this.getAttribute('rel');
    patchAttr(this._a, 'rel', rel?.trim() ? rel : target === '_blank' ? BLANK_REL : null);
    patchBoolAttr(this._a, 'data-external', boolAttr(this, 'external'));
  }
}

define('e-link', ELink);
