import { define, EpaperElement } from '../../core/dom';

/**
 * @summary CSS grid container with attribute-driven columns and gap.
 * @since v1.0.1
 *
 * @attr {string} [cols='12'] - Number of equal columns or a raw `grid-template-columns` value.
 * @attr {string} [gap='0'] - `gap` value. Bare numbers are treated as pixels.
 *
 * @example
 * <e-grid cols="12" gap="6">
 *   <e-grid-item col="span 6">Left</e-grid-item>
 *   <e-grid-item col="span 6">Right</e-grid-item>
 * </e-grid>
 */
export class EGrid extends EpaperElement {
  static readonly observedAttributes = ['cols', 'gap'];

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const cols = this.getAttribute('cols') || '12';
    const gap = this.getAttribute('gap') || '0';
    const cssCols = Number.isNaN(+cols) ? cols : `repeat(${cols}, minmax(0, 1fr))`;
    const cssGap = Number.isNaN(+gap) ? gap : `${gap}px`;
    if (this.style.display !== 'grid') this.style.display = 'grid';
    if (this.style.gridTemplateColumns !== cssCols) this.style.gridTemplateColumns = cssCols;
    if (this.style.gap !== cssGap) this.style.gap = cssGap;
  }
}

define('e-grid', EGrid);

/**
 * @summary Single cell inside an `<e-grid>` with explicit column or row span.
 * @since v1.0.1
 *
 * @attr {string} [col] - `grid-column` value (e.g. `span 6`).
 * @attr {string} [row] - `grid-row` value.
 *
 * @example
 * <e-grid-item span="6">Half width</e-grid-item>
 */
export class EGridItem extends EpaperElement {
  static readonly observedAttributes = ['col', 'row'];

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const col = this.getAttribute('col') || '';
    const row = this.getAttribute('row') || '';
    if (this.style.gridColumn !== col) this.style.gridColumn = col;
    if (this.style.gridRow !== row) this.style.gridRow = row;
  }
}

define('e-grid-item', EGridItem);
