import { clampedNumAttr, define, esc } from '../../core/dom';

/** Line spacing as a multiple of the font size. */
const LINE_HEIGHT = 1.25;

/**
 * Split `content` into watermark lines.
 *
 * Both a real newline (HTML attributes may contain them) and the two-character
 * `\n` escape work, because the second is what survives a value that travels
 * through JSON, a CMS field or a templating layer.
 */
export function watermarkLines(content: string): string[] {
  return content
    .split(/\r\n|\r|\n|\\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/**
 * @summary Repeating background watermark for the host's content area.
 * @since v1.0.1
 *
 * Renders an SVG-based, tiled watermark behind slotted children. Designed
 * for ownership/draft labels on printable e-paper layouts. The pattern is
 * a single SVG `<text>` element repeated via CSS `background-image`, which
 * means it scales sharply on Kaleido panels without dithering.
 *
 * The tile is a data-URI SVG, an isolated document: it inherits neither
 * `currentColor` nor a custom property from the host. The ink color is
 * therefore resolved here, at render time, from `--ink-fg` (falling back to
 * the computed text color) so the watermark follows a theme pack instead of
 * staying black on an inverted panel.
 *
 * @attr {string} content - Text to render on the watermark layer. Empty or absent leaves the layer blank. A newline — real or written as `\n` — starts a further line; lines are centred as a block. @since v1.3.0 (multi-line)
 * @attr {string} [color] - Explicit ink color. Defaults to the resolved `--ink-fg`. @since v1.3.0
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
 *
 * @example
 * <e-watermark content="ENTWURF\nNICHT ZUR VERÖFFENTLICHUNG" gap-y="120">
 *   <article>...</article>
 * </e-watermark>
 */
export class EWatermark extends HTMLElement {
  static readonly observedAttributes = [
    'content',
    'color',
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

  /**
   * The tile SVG cannot inherit anything from this document, so the ink color
   * is resolved to a literal here: an explicit `color` attribute, else the
   * computed `--ink-fg`, else the inherited text color, else black.
   */
  private _inkColor(): string {
    const explicit = this.getAttribute('color');
    if (explicit?.trim()) return explicit.trim();
    const styles = getComputedStyle(this);
    return styles.getPropertyValue('--ink-fg').trim() || styles.color || '#000';
  }

  private _apply(): void {
    if (!this._layer) return;
    const lines = watermarkLines(this.getAttribute('content') || '');
    const fs = clampedNumAttr(this, 'font-size', 16, 8, 512);
    const gx = clampedNumAttr(this, 'gap-x', 120, 20, 10000);
    const gy = clampedNumAttr(this, 'gap-y', 80, 20, 10000);
    const rot = clampedNumAttr(this, 'rotate', -22, -360, 360);
    const op = clampedNumAttr(this, 'opacity', 0.18, 0, 1);
    if (lines.length === 0) {
      this._layer.style.backgroundImage = '';
      this._layer.style.backgroundSize = '';
      return;
    }
    // The block is centred on the tile: the first line is lifted by half the
    // block height, every later line steps down by one line height.
    const step = fs * LINE_HEIGHT;
    const firstDy = (-(lines.length - 1) / 2) * step;
    const tspans = lines
      .map(
        (line, i) =>
          `<tspan x="50%" dy="${(i === 0 ? firstDy : step).toFixed(2)}">${esc(line)}</tspan>`,
      )
      .join('');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${gx}" height="${gy}">` +
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"` +
      ` transform="rotate(${rot} ${gx / 2} ${gy / 2})"` +
      ` fill="${esc(this._inkColor())}" fill-opacity="${op}"` +
      ` font-family="ui-sans-serif,system-ui,sans-serif"` +
      ` font-size="${fs}" font-weight="700" letter-spacing="2">` +
      tspans +
      `</text></svg>`;
    const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    this._layer.style.backgroundImage = url;
    this._layer.style.backgroundSize = `${gx}px ${gy}px`;
  }
}
define('e-watermark', EWatermark);
