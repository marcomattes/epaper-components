import {
  boolAttr,
  captureWrap,
  define,
  EpaperElement,
  observeItems,
  patchAttr,
  patchClassModifier,
  runCleanups,
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
    this._ensureWrap();
    this._render();
    // A badge is the one component routinely written to from outside — a host
    // that keeps a count on it reaches for `textContent`, which replaces the
    // wrapper span with a bare text node and strips every `.ink-badge` style
    // for good. Re-wrapping on a child change makes that assignment work the
    // way a caller expects instead of quietly unstyling the badge.
    observeItems(this, this._resync, { isOutput: (n) => n !== this });
  }

  disconnectedCallback() {
    runCleanups(this);
  }

  private readonly _resync = (): void => {
    if (this._ensureWrap()) this._render();
  };

  /** True when the wrapper had to be (re-)created. */
  private _ensureWrap(): boolean {
    if (this._wrap && this._wrap.parentElement === this && this.childNodes.length === 1) {
      return false;
    }
    this._wrap = captureWrap(this, 'span');
    this._wrap.classList.add('ink-badge');
    return true;
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
