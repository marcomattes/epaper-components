import {
  boolAttr,
  captureWrap,
  define,
  EpaperElement,
  patchAttr,
  patchBoolAttr,
  patchText,
} from '../../core/dom';

const PLACEMENTS = new Set(['top-right', 'top-left', 'bottom-right', 'bottom-left']);

/**
 * @summary Decorative ribbon tag overlaid on a child element.
 * @since v1.0.1
 *
 * Children are wrapped and decorated with the ribbon tag. The corner was
 * previously fixed in CSS; `placement` makes it addressable, because top-left
 * is the conventional spot for a promotion band on a shelf label.
 *
 * @attr {string} [text] - Text shown inside the ribbon tag.
 * @attr {'top-right'|'top-left'|'bottom-right'|'bottom-left'} [placement='top-right'] - Corner the ribbon sits in.
 * @attr {boolean} [inverted] - Renders the ribbon with inverted foreground/background.
 *
 * @example
 * <e-ribbon text="NEW"><e-card title="Hello"></e-card></e-ribbon>
 * @example
 * <e-ribbon text="AKTION" placement="top-left" inverted><e-card></e-card></e-ribbon>
 */
export class ERibbon extends EpaperElement {
  static readonly observedAttributes = ['text', 'placement', 'inverted'];

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
    if (!this._tag || !this._wrap) return;
    patchText(this._tag, this.getAttribute('text') || '');
    const placement = this.getAttribute('placement');
    patchAttr(
      this._tag,
      'data-placement',
      placement && PLACEMENTS.has(placement) ? placement : null,
    );
    patchBoolAttr(this._tag, 'data-inverted', boolAttr(this, 'inverted'));
  }
}

define('e-ribbon', ERibbon);
