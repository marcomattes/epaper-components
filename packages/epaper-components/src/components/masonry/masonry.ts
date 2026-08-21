import { define, intAttr, numAttr } from '../../core/dom';

/**
 * @summary CSS-columns based masonry layout for cards of varying height.
 * @since v1.0.1
 *
 * CSS selectors apply the configured gap to current and dynamically inserted
 * children without observers or JavaScript layout reads.
 *
 * @attr {string} [columns='3'] - Number of columns (forwarded to `column-count`).
 * @attr {string} [gap='16'] - Pixel gap between columns and items.
 *
 * @example
 * <e-masonry columns="3" gap="12">
 *   <e-card>…</e-card>
 *   <e-card>…</e-card>
 * </e-masonry>
 */
export class EMasonry extends HTMLElement {
  static readonly observedAttributes = ['columns', 'gap'];

  connectedCallback() {
    this.classList.add('ink-masonry');
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const cols = String(Math.max(1, Math.min(20, intAttr(this, 'columns', 3))));
    const gap = Math.max(0, numAttr(this, 'gap', 16));
    const gapPx = `${gap}px`;
    if (this.style.columnCount !== cols) this.style.columnCount = cols;
    if (this.style.columnGap !== gapPx) this.style.columnGap = gapPx;
    this.style.setProperty('--ink-masonry-gap', gapPx);
  }
}

define('e-masonry', EMasonry);
