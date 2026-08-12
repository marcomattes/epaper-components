import { boolAttr, captureWrap, define, patchClassModifier } from '../core/dom';

/**
 * @summary Inline label badge with an optional inverted color treatment.
 *
 * Children are used as the badge text.
 *
 * @attr {boolean} [inverted] - Renders the badge with inverted foreground/background.
 *
 * @example
 * <e-badge inverted>NEW</e-badge>
 */
export class EBadge extends HTMLElement {
  static observedAttributes = ['inverted'];

  private _wrap: HTMLElement | null = null;

  connectedCallback() {
    if (!this._wrap) {
      this._wrap = captureWrap(this, 'span');
      this._wrap.classList.add('ink-badge');
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._wrap) this._render();
  }

  private _render(): void {
    if (!this._wrap) return;
    patchClassModifier(this._wrap, 'ink-badge--', boolAttr(this, 'inverted') ? 'inverted' : null);
  }
}

define('e-badge', EBadge);
