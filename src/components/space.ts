import { boolAttr, define, numAttr } from '../core/dom';

/**
 * @summary Inline-flex container that distributes children with a uniform gap.
 * @since v1.0.1
 *
 * @attr {string} [size='8'] - Pixel gap between children.
 * @attr {'horizontal'|'vertical'} [direction='horizontal'] - Stacking direction.
 * @attr {boolean} [wrap] - Allow children to wrap onto multiple lines.
 *
 * @example
 * <e-space size="12" wrap><e-button>A</e-button><e-button>B</e-button></e-space>
 */
export class ESpace extends HTMLElement {
  static observedAttributes = ['size', 'direction', 'wrap'];

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const size = Math.max(0, numAttr(this, 'size', 8));
    const direction = this.getAttribute('direction') || 'horizontal';
    const flexDir = direction === 'vertical' ? 'column' : 'row';
    const wrap = boolAttr(this, 'wrap') ? 'wrap' : 'nowrap';
    const gap = `${size}px`;
    if (this.style.display !== 'inline-flex') this.style.display = 'inline-flex';
    if (this.style.flexDirection !== flexDir) this.style.flexDirection = flexDir;
    if (this.style.flexWrap !== wrap) this.style.flexWrap = wrap;
    if (this.style.gap !== gap) this.style.gap = gap;
  }
}

define('e-space', ESpace);
