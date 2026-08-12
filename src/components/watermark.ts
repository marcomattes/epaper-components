import { define, esc, numAttr } from '../core/dom';

/**
 * @summary Repeating background watermark for the host's content area.
 *
 * Renders an SVG-based, tiled watermark behind slotted children. Designed
 * for ownership/draft labels on printable e-paper layouts. The pattern is
 * a single SVG `<text>` element repeated via CSS `background-image`, which
 * means it scales sharply on Kaleido panels without dithering.
 *
 * @attr {string} content - Text to render on the watermark layer.
 * @attr {number} [font-size=16] - SVG font size in pixels.
 * @attr {number} [gap-x=120] - Horizontal tile size.
 * @attr {number} [gap-y=80] - Vertical tile size.
 * @attr {number} [rotate=-22] - Rotation of the text in degrees.
 * @attr {number} [opacity=0.18] - Watermark opacity, 0 to 1.
 *
 * @slot - Content rendered above the watermark layer.
 *
 * @example
 * <e-watermark content="DRAFT">
 *   <article>...</article>
 * </e-watermark>
 */
export class EWatermark extends HTMLElement {
  static observedAttributes = ['content', 'font-size', 'gap-x', 'gap-y', 'rotate', 'opacity'];

  private _wired = false;
  private _layer: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const wrap = document.createElement('div');
    wrap.className = 'ink-watermark';
    while (this.firstChild) wrap.appendChild(this.firstChild);
    const layer = document.createElement('div');
    layer.className = 'ink-watermark__layer';
    layer.setAttribute('aria-hidden', 'true');
    wrap.appendChild(layer);
    this.appendChild(wrap);
    this._layer = layer;
    this._apply();
  }

  attributeChangedCallback() {
    if (this._layer) this._apply();
  }

  private _apply(): void {
    if (!this._layer) return;
    const text = this.getAttribute('content') || '';
    const fs = Math.max(8, numAttr(this, 'font-size', 16));
    const gx = Math.max(20, numAttr(this, 'gap-x', 120));
    const gy = Math.max(20, numAttr(this, 'gap-y', 80));
    const rot = numAttr(this, 'rotate', -22);
    const op = Math.min(1, Math.max(0, Number(this.getAttribute('opacity') ?? 0.18)));
    if (!text) {
      this._layer.style.backgroundImage = '';
      return;
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${gx}" height="${gy}">` +
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"` +
      ` transform="rotate(${rot} ${gx / 2} ${gy / 2})"` +
      ` fill="#000" fill-opacity="${op}"` +
      ` font-family="ui-sans-serif,system-ui,sans-serif"` +
      ` font-size="${fs}" font-weight="700" letter-spacing="2">` +
      esc(text) +
      `</text></svg>`;
    const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    this._layer.style.backgroundImage = url;
    this._layer.style.backgroundSize = `${gx}px ${gy}px`;
  }
}
define('e-watermark', EWatermark);
