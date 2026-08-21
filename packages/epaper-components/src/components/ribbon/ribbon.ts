import { captureWrap, define, patchText } from '../../core/dom';

/**
 * @summary Decorative ribbon tag overlaid on a child element.
 * @since v1.0.1
 *
 * Children are wrapped and decorated with the ribbon tag.
 *
 * @attr {string} [text] - Text shown inside the ribbon tag.
 *
 * @example
 * <e-ribbon text="NEW"><e-card title="Hello"></e-card></e-ribbon>
 */
export class ERibbon extends HTMLElement {
  static readonly observedAttributes = ['text'];

  private _wrap: HTMLElement | null = null;
  private _tag: HTMLElement | null = null;

  connectedCallback() {
    if (!this._wrap) {
      this._wrap = captureWrap(this, 'span');
      this._wrap.className = 'ink-ribbon';
      this._tag = document.createElement('span');
      this._tag.className = 'ink-ribbon__tag';
      this._wrap.appendChild(this._tag);
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._tag) this._render();
  }

  private _render(): void {
    if (!this._tag) return;
    patchText(this._tag, this.getAttribute('text') || '');
  }
}

define('e-ribbon', ERibbon);
