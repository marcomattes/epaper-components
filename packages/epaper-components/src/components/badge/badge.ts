import {
  boolAttr,
  captureWrap,
  define,
  EpaperElement,
  patchAttr,
  patchClassModifier,
} from '../../core/dom';

const VARIANTS = new Set(['outline', 'solid', 'dashed']);
const SIZES = new Set(['sm', 'md', 'lg']);

/**
 * @summary Inline label badge with variant and size treatments.
 * @since v1.0.1
 *
 * Children are used as the badge text.
 *
 * `variant` and `size` are rendered as `data-*` attributes rather than class
 * modifiers so they compose freely with the pre-existing
 * `ink-badge--inverted` class, which stays exactly as it was.
 *
 * @attr {boolean} [inverted] - Renders the badge with inverted foreground/background.
 * @attr {'outline'|'solid'|'dashed'} [variant='outline'] - Border and fill treatment.
 * @attr {'sm'|'md'|'lg'} [size='md'] - Type scale. `lg` is sized for a discount stamp on a shelf label.
 *
 * @example
 * <e-badge inverted>NEW</e-badge>
 * @example
 * <e-badge variant="solid" size="lg">-30 %</e-badge>
 */
export class EBadge extends EpaperElement {
  static readonly observedAttributes = ['inverted', 'variant', 'size'];

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
    const variant = this.getAttribute('variant');
    const size = this.getAttribute('size');
    patchAttr(this._wrap, 'data-variant', variant && VARIANTS.has(variant) ? variant : null);
    patchAttr(this._wrap, 'data-size', size && SIZES.has(size) ? size : null);
  }
}

define('e-badge', EBadge);
