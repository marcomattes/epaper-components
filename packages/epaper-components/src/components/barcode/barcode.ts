import { define, intAttr } from '../../core/dom';
import { t } from '../../core/i18n';

/* ============================================================================
 * Self-contained linear barcode encoder.
 *
 * Covers the four symbologies a retail label actually needs — EAN-13, EAN-8,
 * UPC-A and Code 128 — and nothing else. Written from the symbology
 * specifications rather than ported from a library, so the component keeps
 * the zero-runtime-dependency policy the rest of this package follows, and
 * emits the same kind of output as `<e-qrcode>`: one dark path on a white
 * rect, `shape-rendering="crispEdges"`, every bar a whole number of pixels.
 * ============================================================================ */

/** Left-hand odd-parity ("L") patterns for digits 0–9. */
const L_CODES = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
/** Left-hand even-parity ("G") patterns — the reverse of the R patterns. */
const G_CODES = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
/** Right-hand ("R") patterns — the complement of the L patterns. */
const R_CODES = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
/** Which of the first six digits use G parity, selected by the leading digit. */
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

const GUARD = '101';
const CENTER = '01010';

/** Code 128 element widths, one entry per symbol value 0–106 (106 = stop). */
const CODE128_WIDTHS = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];

const CODE128_START_B = 104;
const CODE128_START_C = 105;
const CODE128_STOP = 106;

export type BarcodeFormat = 'ean13' | 'ean8' | 'upca' | 'code128';

/** Total digits each fixed-length symbology carries, check digit included. */
const FIXED_LENGTH: Record<Exclude<BarcodeFormat, 'code128'>, number> = {
  ean13: 13,
  ean8: 8,
  upca: 12,
};

const isDigits = (value: string): boolean => /^\d+$/.test(value);

/**
 * Modulo-10 check digit. Weights alternate 3 and 1 from the right of the
 * payload, which is the same rule for EAN-13, EAN-8 and UPC-A.
 */
export function checkDigit(payload: string): number {
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const digit = payload.charCodeAt(payload.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** Turn a Code 128 element-width string into its module bits, bar first. */
function widthsToBits(widths: string): string {
  let bits = '';
  for (let i = 0; i < widths.length; i++) {
    bits += (i % 2 === 0 ? '1' : '0').repeat(widths.charCodeAt(i) - 48);
  }
  return bits;
}

function encodeEan13(digits: string): string {
  const parity = PARITY[digits.charCodeAt(0) - 48];
  let bits = GUARD;
  for (let i = 1; i <= 6; i++) {
    const digit = digits.charCodeAt(i) - 48;
    bits += parity[i - 1] === 'L' ? L_CODES[digit] : G_CODES[digit];
  }
  bits += CENTER;
  for (let i = 7; i <= 12; i++) bits += R_CODES[digits.charCodeAt(i) - 48];
  return bits + GUARD;
}

function encodeEan8(digits: string): string {
  let bits = GUARD;
  for (let i = 0; i < 4; i++) bits += L_CODES[digits.charCodeAt(i) - 48];
  bits += CENTER;
  for (let i = 4; i < 8; i++) bits += R_CODES[digits.charCodeAt(i) - 48];
  return bits + GUARD;
}

/** UPC-A is EAN-13 with an implied leading zero, so it shares the encoder. */
const encodeUpcA = (digits: string): string => encodeEan13(`0${digits}`);

function encodeCode128(value: string): string {
  // Code C halves the symbol width for an all-numeric payload of even length;
  // everything else goes through Code B, which covers ASCII 32–126.
  const useC = isDigits(value) && value.length % 2 === 0 && value.length > 0;
  const values: number[] = [];
  if (useC) {
    values.push(CODE128_START_C);
    for (let i = 0; i < value.length; i += 2) values.push(Number(value.slice(i, i + 2)));
  } else {
    values.push(CODE128_START_B);
    for (const char of value) {
      const code = char.charCodeAt(0);
      if (code < 32 || code > 126) {
        throw new Error(`Code 128 cannot encode character "${char}".`);
      }
      values.push(code - 32);
    }
  }
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103, CODE128_STOP);
  return values.map((symbol) => widthsToBits(CODE128_WIDTHS[symbol])).join('');
}

/** True for a symbology this component knows how to encode. */
const isFormat = (value: string): value is BarcodeFormat =>
  value === 'ean13' || value === 'ean8' || value === 'upca' || value === 'code128';

/**
 * The symbology to encode with: what the author asked for, or one derived
 * from the value's shape when they asked for `auto` (or for nothing).
 */
export function resolveFormat(requested: string, value: string): BarcodeFormat {
  return isFormat(requested) ? requested : detectFormat(value);
}

/** Pick a symbology for `value` when the author did not name one. */
export function detectFormat(value: string): BarcodeFormat {
  if (!isDigits(value)) return 'code128';
  if (value.length === 12 || value.length === 11) return 'upca';
  if (value.length === 13) return 'ean13';
  if (value.length === 8 || value.length === 7) return 'ean8';
  return 'code128';
}

/**
 * Normalise a value for `format`: appends a missing check digit, and rejects
 * a payload of the wrong length or with a check digit that does not match.
 */
export function normalizeValue(value: string, format: BarcodeFormat): string {
  if (format === 'code128') {
    if (!value) throw new Error('Barcode value is empty.');
    return value;
  }
  if (!isDigits(value)) throw new Error(`${format.toUpperCase()} accepts digits only.`);
  const full = FIXED_LENGTH[format];
  if (value.length === full - 1) return value + String(checkDigit(value));
  if (value.length !== full) {
    throw new Error(`${format.toUpperCase()} needs ${full - 1} or ${full} digits.`);
  }
  const expected = String(checkDigit(value.slice(0, -1)));
  if (value.slice(-1) !== expected) {
    throw new Error(`Check digit is ${value.slice(-1)}, expected ${expected}.`);
  }
  return value;
}

/** Module bits ("1" = bar) for an already normalised value. */
export function encodeBarcode(value: string, format: BarcodeFormat): string {
  if (format === 'ean13') return encodeEan13(value);
  if (format === 'ean8') return encodeEan8(value);
  if (format === 'upca') return encodeUpcA(value);
  return encodeCode128(value);
}

/** Group the digits the way the symbology prints them under the bars. */
function humanReadable(value: string, format: BarcodeFormat): string {
  if (format === 'ean13') return `${value[0]} ${value.slice(1, 7)} ${value.slice(7)}`;
  if (format === 'ean8') return `${value.slice(0, 4)} ${value.slice(4)}`;
  if (format === 'upca')
    return `${value[0]} ${value.slice(1, 6)} ${value.slice(6, 11)} ${value.slice(11)}`;
  return value;
}

/** Serialise the module bits into a 1-bit SVG, one path for every bar. */
function barsToSvg(bits: string, moduleWidth: number, height: number, quietZone: number): string {
  const width = (bits.length + quietZone * 2) * moduleWidth;
  const parts: string[] = [];
  let index = 0;
  while (index < bits.length) {
    if (bits[index] === '0') {
      index++;
      continue;
    }
    let run = 1;
    while (bits[index + run] === '1') run++;
    const x = (index + quietZone) * moduleWidth;
    const w = run * moduleWidth;
    parts.push(`M${x} 0h${w}v${height}h-${w}z`);
    index += run;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"` +
    ` width="${width}" height="${height}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    `<path d="${parts.join('')}" fill="#000"/>` +
    `</svg>`
  );
}

/**
 * @summary Linear barcode (EAN-13, EAN-8, UPC-A, Code 128) rendered as inline SVG.
 * @since v1.3.0
 *
 * Built the same way as `<e-qrcode>`: a self-contained encoder, zero runtime
 * dependencies, and output of exactly two shapes — a white background and one
 * dark path — so every bar lands on a whole pixel and survives a partial
 * refresh without grey edges. A missing check digit is computed; a wrong one
 * is reported instead of being silently printed.
 *
 * @attr {string} value - Digits or, for Code 128, any ASCII 32–126 text.
 * @attr {'auto'|'ean13'|'ean8'|'upca'|'code128'} [format='auto'] - Symbology. `auto` picks one from the value's shape.
 * @attr {number} [height=80] - Bar height in pixels.
 * @attr {number} [module-width=2] - Width of one narrow bar in pixels.
 * @attr {number} [quiet-zone=10] - Silent margin either side, in modules.
 * @attr {boolean} [show-text] - Prints the human-readable line under the bars.
 *
 * @example
 * <e-barcode value="4006381333931" format="ean13" show-text></e-barcode>
 */
export class EBarcode extends HTMLElement {
  static readonly observedAttributes = [
    'value',
    'format',
    'height',
    'module-width',
    'quiet-zone',
    'show-text',
  ];

  private _wired = false;
  private _wrap: HTMLElement | null = null;
  private _text: HTMLElement | null = null;
  private _lastContent = '';

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const root = document.createElement('div');
    root.className = 'ink-barcode';
    const wrap = document.createElement('div');
    wrap.className = 'ink-barcode__bars';
    const text = document.createElement('div');
    text.className = 'ink-barcode__text';
    root.append(wrap, text);
    this._wrap = wrap;
    this._text = text;
    this.replaceChildren(root);
    this._render();
  }

  attributeChangedCallback() {
    if (this._wired) this._render();
  }

  private _render(): void {
    if (!this._wrap || !this._text) return;
    const raw = this.getAttribute('value') || '';
    const format = resolveFormat(this.getAttribute('format') || 'auto', raw);
    const height = Math.max(8, Math.min(600, intAttr(this, 'height', 80)));
    const moduleWidth = Math.max(1, Math.min(16, intAttr(this, 'module-width', 2)));
    const quietZone = Math.max(0, Math.min(64, intAttr(this, 'quiet-zone', 10)));

    if (!raw) {
      this._paintMessage('empty', '—', t(this, 'barcodeEmpty'));
      return;
    }

    try {
      const value = normalizeValue(raw, format);
      const bits = encodeBarcode(value, format);
      const svg = barsToSvg(bits, moduleWidth, height, quietZone);
      this._paintSymbol(svg, format, value);
      this._paintCaption(this.hasAttribute('show-text') ? humanReadable(value, format) : '');
    } catch (err) {
      this._paintMessage('error', (err as Error).message, t(this, 'barcodeError'));
    }
  }

  /**
   * Swap in a freshly encoded symbol. This is the only markup the component
   * writes, and it carries no author input: `barsToSvg` interpolates bar
   * offsets and widths — numbers it computed itself — and nothing else. The
   * symbol is a single `<svg>`, so replacing it keeps the dirty area to the
   * bars.
   */
  // `_render` is the only caller of the three painters, and it returns before
  // any of them when the refs are missing.
  private _paintSymbol(markup: string, format: BarcodeFormat, value: string): void {
    const wrap = this._wrap!;
    if (markup !== this._lastContent) {
      wrap.innerHTML = markup;
      this._lastContent = markup;
    }
    const svg = wrap.firstElementChild;
    if (svg) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `${format.toUpperCase()} barcode ${value}`);
    }
  }

  /**
   * Placeholder and error states are built as a node with `textContent`, not
   * as markup. Both quote the author's own `value` — the error message names
   * the check digit it found — and escaping it would still leave an
   * `innerHTML` sink one refactor away from being unescaped. There is no
   * reason to have the sink at all for a single line of text.
   */
  private _paintMessage(variant: 'empty' | 'error', message: string, label: string): void {
    // Prefixed so a message key can never collide with a symbol's markup.
    const key = `${variant}:${message}`;
    if (key !== this._lastContent) {
      const node = document.createElement('div');
      node.className = `ink-barcode__${variant}`;
      node.setAttribute('role', 'img');
      node.setAttribute('aria-label', label);
      node.textContent = message;
      this._wrap!.replaceChildren(node);
      this._lastContent = key;
    }
    this._paintCaption('');
  }

  private _paintCaption(text: string): void {
    const line = this._text!;
    if (line.textContent !== text) line.textContent = text;
    if (text) line.removeAttribute('hidden');
    else line.setAttribute('hidden', '');
  }
}

define('e-barcode', EBarcode);
