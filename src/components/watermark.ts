import { clampedNumAttr, define, esc } from '../core/dom';

/**
 * @summary Repeating background watermark for the host's content area.
 * @since v1.0.1
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
  static readonly observedAttributes = [
    'content',
    'font-size',
    'gap-x',
    'gap-y',
    'rotate',
    'opacity',
  ];

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
    const fs = clampedNumAttr(this, 'font-size', 16, 8, 512);
    const gx = clampedNumAttr(this, 'gap-x', 120, 20, 10000);
    const gy = clampedNumAttr(this, 'gap-y', 80, 20, 10000);
    const rot = clampedNumAttr(this, 'rotate', -22, -360, 360);
    const op = clampedNumAttr(this, 'opacity', 0.18, 0, 1);
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
