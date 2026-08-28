import { define, esc, intAttr, patchAttr } from '../../core/dom';
import { t } from '../../core/i18n';

/* ============================================================================
 * Self-contained QR Code encoder (byte mode).
 *
 * Implementation derived from Project Nayuki's reference QR Code generator
 * (MIT License, https://www.nayuki.io/page/qr-code-generator-library).
 * Stripped to byte mode only and inlined so the component has zero runtime
 * dependencies — required by the EPaper library policy.
 * ============================================================================ */

type Ecl = 'L' | 'M' | 'Q' | 'H';

const ECC_FORMAT_BITS: Record<Ecl, number> = { L: 1, M: 0, Q: 3, H: 2 };

const ECC_CODEWORDS_PER_BLOCK: Record<Ecl, number[]> = {
  L: [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30,
    30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  M: [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
  Q: [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30,
    30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  H: [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
};

const NUM_ERROR_CORRECTION_BLOCKS: Record<Ecl, number[]> = {
  L: [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 13, 14, 15,
    16, 17, 18, 19, 19, 20, 21, 22, 24, 25, 25,
  ],
  M: [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
    25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  Q: [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34,
    34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  H: [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35,
    37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
  ],
};

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(ver: number, ecl: Ecl): number {
  return (
    Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl][ver]
  );
}

// Galois field GF(2^8) reducer 0x11D (x^8 + x^4 + x^3 + x^2 + 1).
function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function reedSolomonComputeDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

function getAlignmentPositions(ver: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  let pos = ver * 4 + 10;
  while (result.length < numAlign) {
    result.splice(1, 0, pos);
    pos -= step;
  }
  return result;
}

class QrCode {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly _isFn: boolean[][];

  constructor(
    readonly version: number,
    readonly ecl: Ecl,
    dataCodewords: number[],
    explicitMask: number,
  ) {
    this.size = version * 4 + 17;
    this.modules = [];
    this._isFn = [];
    for (let i = 0; i < this.size; i++) {
      this.modules.push(new Array<boolean>(this.size).fill(false));
      this._isFn.push(new Array<boolean>(this.size).fill(false));
    }
    this._drawFunctionPatterns();
    const allCodewords = this._addEccAndInterleave(dataCodewords);
    this._drawCodewords(allCodewords);
    let mask = explicitMask;
    if (mask < 0) {
      let minPenalty = Number.POSITIVE_INFINITY;
      for (let m = 0; m < 8; m++) {
        this._applyMask(m);
        this._drawFormatBits(m);
        const p = this._getPenaltyScore();
        if (p < minPenalty) {
          minPenalty = p;
          mask = m;
        }
        this._applyMask(m);
      }
    }
    this._applyMask(mask);
    this._drawFormatBits(mask);
  }

  private _setFunctionModule(x: number, y: number, isDark: boolean): void {
    this.modules[y][x] = isDark;
    this._isFn[y][x] = true;
  }

  private _drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this._setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private _drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this._setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private _drawFunctionPatterns(): void {
    // Timing
    for (let i = 0; i < this.size; i++) {
      this._setFunctionModule(6, i, i % 2 === 0);
      this._setFunctionModule(i, 6, i % 2 === 0);
    }
    // Finders + separators
    this._drawFinderPattern(3, 3);
    this._drawFinderPattern(this.size - 4, 3);
    this._drawFinderPattern(3, this.size - 4);
    // Alignment patterns
    const align = getAlignmentPositions(this.version);
    const num = align.length;
    for (let i = 0; i < num; i++) {
      for (let j = 0; j < num; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === num - 1) || (i === num - 1 && j === 0))
          continue;
        this._drawAlignmentPattern(align[i], align[j]);
      }
    }
    // Reserve format and version areas
    this._drawFormatBits(0);
    this._drawVersion();
  }

  private _drawFormatBits(mask: number): void {
    const data = (ECC_FORMAT_BITS[this.ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) this._setFunctionModule(8, i, ((bits >>> i) & 1) !== 0);
    this._setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0);
    this._setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0);
    this._setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0);
    for (let i = 9; i < 15; i++) this._setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0);
    for (let i = 0; i < 8; i++)
      this._setFunctionModule(this.size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
    for (let i = 8; i < 15; i++)
      this._setFunctionModule(8, this.size - 15 + i, ((bits >>> i) & 1) !== 0);
    this._setFunctionModule(8, this.size - 8, true);
  }

  private _drawVersion(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this._setFunctionModule(a, b, bit);
      this._setFunctionModule(b, a, bit);
    }
  }

  private _addEccAndInterleave(data: number[]): number[] {
    const ver = this.version;
    const ecl = this.ecl;
    if (data.length !== getNumDataCodewords(ver, ecl)) throw new Error('Bad codeword length');
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][ver];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][ver];
    const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);
    const blocks: number[][] = [];
    const rsDiv = reedSolomonComputeDivisor(blockEccLen);
    let k = 0;
    for (let i = 0; i < numBlocks; i++) {
      const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
      const dat = data.slice(k, k + datLen);
      k += datLen;
      const ecc = reedSolomonComputeRemainder(dat, rsDiv);
      if (i < numShortBlocks) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const result: number[] = [];
    for (let i = 0; i < blocks[0].length; i++) {
      for (let j = 0; j < blocks.length; j++) {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(blocks[j][i]);
      }
    }
    return result;
  }

  private _drawCodewords(data: number[]): void {
    let i = 0;
    let right = this.size - 1;
    while (right >= 1) {
      if (right === 6) right = 5;
      i = this._drawColumnPair(right, i, data);
      right -= 2;
    }
  }

  /** Writes one zigzag two-column strip (right, right-1) starting at bit index `i`; returns the advanced index. */
  private _drawColumnPair(right: number, i: number, data: number[]): number {
    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < this.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = upward ? this.size - 1 - vert : vert;
        if (!this._isFn[y][x] && i < data.length * 8) {
          this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
    return i;
  }

  private _applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert: boolean;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          case 7:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          default:
            throw new Error('Bad mask');
        }
        if (!this._isFn[y][x] && invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  private _getPenaltyScore(): number {
    let result = 0;
    const size = this.size;
    // N1: rows, then columns — same run-length algorithm, just transposed.
    for (let y = 0; y < size; y++) result += this._runPenalty((x) => this.modules[y][x]);
    for (let x = 0; x < size; x++) result += this._runPenalty((y) => this.modules[y][x]);
    result += this._blockPenalty();
    result += this._balancePenalty();
    return result;
  }

  /** N1: penalizes runs of 5+ same-color modules, plus finder-like patterns, along one line. */
  private _runPenalty(at: (i: number) => boolean): number {
    let result = 0;
    let runColor = false;
    let runLen = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < this.size; i++) {
      const v = at(i);
      if (v === runColor) {
        runLen++;
        if (runLen === 5) result += PENALTY_N1;
        else if (runLen > 5) result++;
      } else {
        this._finderPenaltyAddHistory(runLen, runHistory);
        if (!runColor) result += this._finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
        runColor = v;
        runLen = 1;
      }
    }
    result += this._finderPenaltyTerminateAndCount(runColor, runLen, runHistory) * PENALTY_N3;
    return result;
  }

  /** N2: penalizes each 2x2 block of same-color modules. */
  private _blockPenalty(): number {
    let result = 0;
    const size = this.size;
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = this.modules[y][x];
        if (
          c === this.modules[y][x + 1] &&
          c === this.modules[y + 1][x] &&
          c === this.modules[y + 1][x + 1]
        )
          result += PENALTY_N2;
      }
    }
    return result;
  }

  /** N4: penalizes deviation from a 50/50 dark/light balance. */
  private _balancePenalty(): number {
    let dark = 0;
    for (const row of this.modules) for (const v of row) if (v) dark++;
    const total = this.size * this.size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return k * PENALTY_N4;
  }

  private _finderPenaltyAddHistory(currentRunLength: number, runHistory: number[]): void {
    if (runHistory[0] === 0) currentRunLength += this.size;
    runHistory.copyWithin(1, 0, runHistory.length - 1);
    runHistory[0] = currentRunLength;
  }

  private _finderPenaltyCountPatterns(runHistory: number[]): number {
    const n = runHistory[1];
    const core =
      n > 0 &&
      runHistory[2] === n &&
      runHistory[3] === n * 3 &&
      runHistory[4] === n &&
      runHistory[5] === n;
    return (
      (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) +
      (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0)
    );
  }

  private _finderPenaltyTerminateAndCount(
    currentRunColor: boolean,
    currentRunLength: number,
    runHistory: number[],
  ): number {
    if (currentRunColor) {
      this._finderPenaltyAddHistory(currentRunLength, runHistory);
      currentRunLength = 0;
    }
    currentRunLength += this.size;
    this._finderPenaltyAddHistory(currentRunLength, runHistory);
    return this._finderPenaltyCountPatterns(runHistory);
  }
}

function encodeText(text: string, ecl: Ecl): QrCode {
  // UTF-8 encode
  const bytes: number[] = [];
  for (const codeUnit of new TextEncoder().encode(text)) bytes.push(codeUnit);
  // Pick smallest version that fits with byte mode header (4 + length + data*8)
  // Length field: 8 bits (v1-9) or 16 bits (v10-40).
  let version = 1;
  for (; version <= 40; version++) {
    const cap = getNumDataCodewords(version, ecl) * 8;
    const lenBits = version < 10 ? 8 : 16;
    const need = 4 + lenBits + bytes.length * 8;
    if (need <= cap) break;
  }
  if (version > 40) throw new Error('Data too long for QR code');
  const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
  const lenBits = version < 10 ? 8 : 16;
  // Build bit buffer
  const bb: number[] = [];
  const appendBits = (val: number, len: number): void => {
    for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
  };
  appendBits(0x4, 4); // byte mode
  appendBits(bytes.length, lenBits);
  for (const b of bytes) appendBits(b, 8);
  // Terminator + bit padding
  appendBits(0, Math.min(4, dataCapacityBits - bb.length));
  while (bb.length % 8 !== 0) bb.push(0);
  // Byte padding
  let pad = 0xec;
  while (bb.length < dataCapacityBits) {
    appendBits(pad, 8);
    pad ^= 0xec ^ 0x11;
  }
  // Pack into bytes
  const codewords: number[] = new Array<number>(bb.length >>> 3).fill(0);
  for (let i = 0; i < bb.length; i++) codewords[i >>> 3] |= bb[i] << (7 - (i & 7));
  return new QrCode(version, ecl, codewords, -1);
}

function qrToSvg(qr: QrCode, scale: number, border: number): string {
  const dim = (qr.size + border * 2) * scale;
  const parts: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) {
        parts.push(`M${(x + border) * scale} ${(y + border) * scale}h${scale}v${scale}h-${scale}z`);
      }
    }
  }
  // Inline SVG lives in the light DOM, so it inherits the page's colors:
  // `currentColor` for the modules and `--ink-bg` for the quiet zone make the
  // code follow both theme packs instead of staying black-on-white while the
  // rest of the panel inverts. The literal fallbacks keep a bare, unstyled
  // page (or a scraped standalone SVG) readable.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}"` +
    ` width="${dim}" height="${dim}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="var(--ink-bg, #fff)"/>` +
    `<path d="${parts.join('')}" fill="currentColor"/>` +
    `</svg>`
  );
}

/* ---------------------------------------------------------------------------
 * Public custom element
 * ------------------------------------------------------------------------- */

/**
 * @summary QR code rendered as inline SVG. Zero runtime dependencies.
 * @since v1.0.1
 *
 * Encodes text in byte mode (UTF-8) and selects the smallest version that
 * fits at the given error-correction level. The output is pure SVG with two
 * shapes (background rect + single dark path), which is the most
 * e-paper-friendly representation: every module is a sharp 1-bit cell.
 *
 * Colors come from the theme, not from hard-coded black and white: the modules
 * are painted with `currentColor` and the quiet zone with `--ink-bg`, so the
 * code inverts along with an inverted theme pack instead of staying stuck.
 *
 * @attr {string} value - Text or URL to encode.
 * @attr {'L'|'M'|'Q'|'H'} [level='M'] - Error-correction level (~7%, 15%, 25%, 30% recovery).
 * @attr {number} [scale=4] - Module pixel size. Ignored when `width` is set.
 * @attr {number} [width] - Target edge length in px. The module size is the largest whole number of
 *   pixels that fits, so the rendered code is never wider than `width` and every module stays on a
 *   pixel boundary — a fractional module size dithers into mush on an EPDC panel. @since v1.3.0
 * @attr {number} [border=2] - Quiet-zone width in modules.
 * @attr {string} [label] - Accessible name for the code. Defaults to `QR code for <value>`, which
 *   otherwise reads a raw URL out character by character. @since v1.3.0
 *
 * @example
 * <e-qrcode value="https://epaper.example.com" level="M" scale="4"></e-qrcode>
 *
 * @example
 * <e-qrcode value="https://amt.example.de/az/2026-0815" width="180" label="Vorgang 2026-0815"></e-qrcode>
 */
// Cache key type for the encoder result.
type QrData = ReturnType<typeof encodeText>;

export class EQrcode extends HTMLElement {
  static readonly observedAttributes = ['value', 'level', 'scale', 'border', 'width', 'label'];

  private _wired = false;
  private _wrap: HTMLElement | null = null;
  // Caches for the two expensive steps: encoding and SVG serialisation.
  private _cachedQrKey = '';
  private _cachedQr: QrData | null = null;
  private _lastContent = '';

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const wrap = document.createElement('div');
    wrap.className = 'ink-qrcode';
    this.replaceChildren(wrap);
    this._wrap = wrap;
    this._render();
  }

  attributeChangedCallback() {
    if (this._wrap) this._render();
  }

  private _render(): void {
    if (!this._wrap) return;
    const value = this.getAttribute('value') || '';
    const lvl = (this.getAttribute('level') || 'M').toUpperCase();
    const ecl: Ecl = lvl === 'L' || lvl === 'Q' || lvl === 'H' ? (lvl as Ecl) : 'M';
    const scale = Math.max(1, Math.min(64, intAttr(this, 'scale', 4)));
    const border = Math.max(0, Math.min(64, intAttr(this, 'border', 2)));

    if (!value) {
      const html = `<div class="ink-qrcode__empty" role="img" aria-label="Empty QR code">${esc('—')}</div>`;
      if (this._lastContent !== html) {
        this._wrap.innerHTML = html;
        this._lastContent = html;
      }
      return;
    }

    try {
      // Re-encode only when value or error-correction level changes.
      const qrKey = `${value}|${ecl}`;
      if (qrKey !== this._cachedQrKey) {
        this._cachedQr = encodeText(value, ecl);
        this._cachedQrKey = qrKey;
      }
      const qr = this._cachedQr!;
      const newSvg = qrToSvg(qr, this._effectiveScale(qr.size, border, scale), border);
      if (newSvg !== this._lastContent) {
        this._wrap.innerHTML = newSvg;
        this._lastContent = newSvg;
      }
      // Applied outside the content guard: `label` can change while the
      // geometry does not, and the cached-SVG comparison would swallow it.
      const svg = this._wrap.firstElementChild;
      if (svg) {
        patchAttr(svg, 'role', 'img');
        patchAttr(svg, 'aria-label', this.getAttribute('label') || t(this, 'qrCodeFor', { value }));
      }
    } catch (err) {
      const message = (err as Error).message;
      // Prefixed so a message can never collide with a symbol's markup.
      const key = `error:${message}`;
      if (this._lastContent !== key) {
        const node = document.createElement('div');
        node.className = 'ink-qrcode__error';
        node.setAttribute('role', 'img');
        node.setAttribute('aria-label', t(this, 'qrCodeError'));
        node.textContent = message;
        this._wrap.replaceChildren(node);
        this._lastContent = key;
      }
    }
  }

  /**
   * `width` wins over `scale` when present: it names the box the code has to
   * fit into. The module size is floored to whole pixels so the code never
   * exceeds `width` and never lands on half a pixel, which an EPDC panel
   * renders as a smeared edge rather than a crisp module.
   */
  private _effectiveScale(size: number, border: number, scale: number): number {
    if (!this.hasAttribute('width')) return scale;
    const width = intAttr(this, 'width', 0);
    if (width <= 0) return scale;
    const modules = size + border * 2;
    return Math.max(1, Math.min(64, Math.floor(width / modules)));
  }
}

define('e-qrcode', EQrcode);
