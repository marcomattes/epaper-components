import { clampedNumAttr, define, esc } from '../core/dom';

const KALEIDO_COLORS = [
  { name: 'Ink', hex: '#000000' },
  { name: 'Paper', hex: '#FFFFFF' },
  { name: 'Red', hex: '#D11A1A' },
  { name: 'Orange', hex: '#E26A1B' },
  { name: 'Yellow', hex: '#E8C81C' },
  { name: 'Green', hex: '#1F8A3B' },
  { name: 'Blue', hex: '#1E4FB8' },
] as const;

const DARK_TEXT_LABELS = new Set(['Paper', 'Orange', 'Yellow', 'Green']);

const BAYER_8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
] as const;

/** Edge length in CSS pixels of a single dither preview canvas. */
const SWATCH_PX = 88;

function hexToRgb(h: string): [number, number, number] {
  const n = Number.parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paintDither(canvas: HTMLCanvasElement, hex: string, size: number, cell: number): void {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, size, size);
  const up = hex.toUpperCase();
  if (up === '#FFFFFF') return;
  if (up === '#000000') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    return;
  }
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const density = 0.55 + (1 - lum) * 0.25;
  const cells = Math.ceil(size / cell);
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const t = BAYER_8[y % 8][x % 8] / 64;
      if (t < density) {
        ctx.fillStyle = hex;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      } else if (t < density + 0.12) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x * cell, y * cell, 1, 1);
      }
    }
  }
}

/**
 * @summary Color palette swatches with Bayer-dithered preview canvases.
 * @since v1.0.1
 *
 * @attr {number} [cell=3] - Pixel size of a single dither cell, clamped to 1..88 (the swatch is 88px). Smaller values produce a finer pattern.
 *
 * @example
 * <e-kaleido cell="3"></e-kaleido>
 */
export class EKaleido extends HTMLElement {
  static readonly observedAttributes = ['cell'];

  connectedCallback() {
    this._render();
  }
  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  private _render(): void {
    const cell = clampedNumAttr(this, 'cell', 3, 1, SWATCH_PX);
    // `c.hex`/`c.name` come from KALEIDO_COLORS, a hardcoded module-level
    // const array — never user-controlled — so they can't carry the
    // characters esc() escapes, and wrapping them would only cost bundle
    // bytes against the size-limit budget.
    /* eslint-disable local/no-unescaped-innerhtml */
    this.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
                                  gap:0;border:var(--ink-border);border-right:none;border-bottom:none">
      ${KALEIDO_COLORS.map(
        (c) => `
        <div style="border-right:var(--ink-border);border-bottom:var(--ink-border);
                    background:var(--ink-bg);font-family:var(--ink-sans);color:var(--ink-fg)">
          <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:var(--ink-border)">
            <div style="background:${c.hex};height:88px;border-right:var(--ink-border);
                        display:flex;align-items:flex-end;padding:6px 8px;
                        color:${DARK_TEXT_LABELS.has(c.name) ? '#000' : '#FFF'};
                        font-size:10px;font-weight:700;letter-spacing:0.18em">IDEAL</div>
            <div style="position:relative">
              <canvas data-color="${c.hex}" style="display:block;image-rendering:pixelated"></canvas>
              <span style="position:absolute;left:8px;bottom:6px;
                font-size:10px;font-weight:700;letter-spacing:0.18em;
                background:#FFF;color:#000;padding:1px 4px;border:1px solid #000">KALEIDO</span>
            </div>
          </div>
          <div style="padding:10px 12px;display:flex;align-items:baseline;justify-content:space-between">
            <span style="font-size:15px;font-weight:700">${esc(c.name)}</span>
            <span style="font-size:11px;font-family:var(--ink-mono);letter-spacing:0.04em">${c.hex}</span>
          </div>
        </div>`,
      ).join('')}
    </div>`;
    /* eslint-enable local/no-unescaped-innerhtml */
    this.querySelectorAll('canvas').forEach((cv) => {
      paintDither(
        cv as HTMLCanvasElement,
        (cv as HTMLElement).dataset['color'] ?? '#000000',
        SWATCH_PX,
        cell,
      );
    });
  }
}

define('e-kaleido', EKaleido);
