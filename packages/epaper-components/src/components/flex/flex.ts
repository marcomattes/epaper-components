import { boolAttr, define } from '../../core/dom';

/**
 * @summary Flexbox container with attribute-driven layout.
 * @since v1.0.1
 *
 * @attr {'row'|'column'|'row-reverse'|'column-reverse'} [direction='row'] - `flex-direction` value.
 * @attr {'nowrap'|'wrap'|'wrap-reverse'} [wrap='nowrap'] - `flex-wrap` value.
 * @attr {string} [justify='flex-start'] - `justify-content` value.
 * @attr {string} [align='stretch'] - `align-items` value.
 * @attr {string} [gap='0'] - `gap` value. Bare numbers are treated as pixels.
 * @attr {boolean} [inline] - Use `inline-flex` instead of `flex`.
 *
 * @example
 * <e-flex direction="row" gap="8" align="center"><span>A</span><span>B</span></e-flex>
 */
export class EFlex extends HTMLElement {
  static readonly observedAttributes = ['direction', 'wrap', 'justify', 'align', 'gap', 'inline'];

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const direction = this.getAttribute('direction') || 'row';
    const wrap = this.getAttribute('wrap') || 'nowrap';
    const justify = this.getAttribute('justify') || 'flex-start';
    const align = this.getAttribute('align') || 'stretch';
    const gap = this.getAttribute('gap') || '0';
    const display = boolAttr(this, 'inline') ? 'inline-flex' : 'flex';
    if (this.style.display !== display) this.style.display = display;
    if (this.style.flexDirection !== direction) this.style.flexDirection = direction;
    if (this.style.flexWrap !== wrap) this.style.flexWrap = wrap;
    if (this.style.justifyContent !== justify) this.style.justifyContent = justify;
    if (this.style.alignItems !== align) this.style.alignItems = align;
    const gapVal = Number.isNaN(+gap) ? gap : `${gap}px`;
    if (this.style.gap !== gapVal) this.style.gap = gapVal;
  }
}

define('e-flex', EFlex);
