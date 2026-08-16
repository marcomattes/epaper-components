// Component preview images for the marketing site.
//
// The site does not render its own component thumbnails. The visual-regression
// suite (src/components/__tests__/screenshots.test.ts) already renders one
// representative story per component and commits the PNG as a baseline, so the
// site build reuses those files instead of standing up a second renderer.
//
// The baselines are named `<category>-<name>--<story>.png`, which is the same
// `category-name` slug the component tiles already build for their Storybook
// deep-link. That is what makes the join possible without a hand-maintained
// mapping.
//
// Two families of files live in that directory:
//   • `primitives-button--allvariants.png`                — written by our test
//   • `primitives-button-allvariants-chromium-linux.png`  — Vitest's own copy
// Only the first is read here; the second is an implementation detail of the
// browser runner and is skipped.
//
// Published names drop the `--story` suffix (`/shots/primitives-button.png`)
// so that renaming a story does not change a public URL.
import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

/** Directory holding the committed visual-regression baselines. */
export const SHOTS_SRC = resolve(process.cwd(), 'src/components/__tests__/__screenshots__');

/** Site-absolute directory the previews are published under. No trailing slash. */
export const SHOTS_URL_BASE = '/shots';

/**
 * @typedef {object} Shot
 * @property {string} slug   `category-name`, e.g. `primitives-button`.
 * @property {string} file   Source file name inside SHOTS_SRC.
 * @property {number} width  Intrinsic pixel width, for the `width` attribute.
 * @property {number} height Intrinsic pixel height, for the `height` attribute.
 */

/**
 * Read a PNG's intrinsic size out of its IHDR chunk.
 *
 * A PNG is an 8-byte signature followed by IHDR, whose width and height are
 * the two big-endian uint32s at offsets 16 and 20. That is the whole format
 * we need, so there is no image dependency in the site build.
 *
 * @param {Buffer} buf
 * @returns {{ width: number, height: number } | null} null if not a PNG.
 */
export function pngSize(buf) {
  if (buf.length < 24) return null;
  // \x89PNG\r\n\x1a\n
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}

/**
 * Minimum fraction of non-white pixels for a baseline to be worth publishing.
 *
 * Not every committed baseline actually shows its component. Four of them are
 * blank white rectangles and a fifth is an empty container outline, because
 * the screenshot suite captured the story wrapper before the element had
 * rendered anything into it:
 *
 *   primitives-icon 0%   typography-text 0%   typography-title 0%
 *   primitives-badge 0.8%                     primitives-button 1.2%
 *
 * A blank tile is worse than no tile — it reads as "this component draws
 * nothing". They are filtered here rather than in a hard-coded deny list so
 * that fixing the underlying stories makes the previews appear on the next
 * build, with no change to this file.
 *
 * The floor sits below every baseline that does render: the sparsest real one
 * is composite-floatbutton at 2.5%.
 */
const MIN_INK = 0.015;

/** Channel value at or above which a pixel counts as paper rather than ink. */
const WHITE = 240;

/**
 * Fraction of a PNG's pixels that are not near-white, or null if the file is
 * in a format this reader does not decode.
 *
 * Every committed baseline is 8-bit truecolour (colour type 2), non-interlaced
 * — that is what the browser runner writes — so that is the only combination
 * decoded here. Anything else returns null and is published unchecked: an
 * unrecognised encoding is not evidence that the picture is empty.
 *
 * @param {Buffer} buf
 * @returns {number | null}
 */
export function inkRatio(buf) {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);
  const interlace = buf.readUInt8(28);
  if (bitDepth !== 8 || colorType !== 2 || interlace !== 0) return null;
  if (!width || !height) return null;

  // Concatenate the IDAT chunks — a PNG may split the stream across several.
  /** @type {Buffer[]} */
  const idat = [];
  let pos = 8; // past the signature
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    else if (type === 'IEND') break;
    pos += 12 + len; // length + type + data + crc
  }
  if (idat.length === 0) return null;

  /** @type {Buffer} */
  let raw;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }

  const bpp = 3; // RGB
  const stride = width * bpp;
  if (raw.length < height * (stride + 1)) return null;

  // Undo the per-scanline filters. Each scanline is a filter byte followed by
  // `stride` bytes; filters reference the pixel to the left (a), the one above
  // (b) and the one above-left (c). Reconstructed rows are written back into
  // `line`, which then becomes the previous row.
  const prev = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  let ink = 0;

  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const filter = raw[start];
    raw.copy(line, 0, start + 1, start + 1 + stride);

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let add = 0;
      switch (filter) {
        case 0:
          break;
        case 1:
          add = a;
          break;
        case 2:
          add = b;
          break;
        case 3:
          add = (a + b) >> 1;
          break;
        case 4: {
          // Paeth: pick whichever of a, b, c the linear estimate is nearest.
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default:
          return null; // unknown filter — do not guess
      }
      line[i] = (line[i] + add) & 0xff;
    }

    for (let x = 0; x < stride; x += bpp) {
      if (line[x] < WHITE || line[x + 1] < WHITE || line[x + 2] < WHITE) ink++;
    }
    line.copy(prev);
  }

  return ink / (width * height);
}

/**
 * Index every usable baseline by its `category-name` slug.
 *
 * Baselines that render (almost) nothing are reported separately instead of
 * being published — see MIN_INK.
 *
 * Never throws: a missing or unreadable directory yields an empty index, and
 * the site falls back to text-only tiles. A landing page must still build on a
 * checkout where the baselines were never generated.
 *
 * @returns {Promise<{ shots: Record<string, Shot>, blank: string[] }>}
 */
export async function readShots() {
  /** @type {Record<string, Shot>} */
  const shots = {};
  /** @type {string[]} */
  const blank = [];

  /** @type {string[]} */
  let files;
  try {
    files = await readdir(SHOTS_SRC);
  } catch {
    return { shots, blank };
  }

  for (const file of files.sort()) {
    if (!file.endsWith('.png')) continue;
    // Our own baselines are the only ones with the `--story` separator;
    // Vitest's `-chromium-linux` copies never match it.
    const slug = file.split('--')[0];
    if (!slug || slug === file) continue;
    if (shots[slug]) continue;

    /** @type {Buffer} */
    let buf;
    try {
      buf = await readFile(join(SHOTS_SRC, file));
    } catch {
      continue;
    }

    const size = pngSize(buf);
    if (!size) continue;

    const ink = inkRatio(buf);
    if (ink !== null && ink < MIN_INK) {
      blank.push(slug);
      continue;
    }

    shots[slug] = { slug, file, width: size.width, height: size.height };
  }

  return { shots, blank };
}

/**
 * Copy an index's PNGs into `<outDir>/shots/`, renamed to their slug.
 *
 * @param {Record<string, Shot>} shots
 * @param {string} outDir Build output directory (dist-site).
 * @returns {Promise<number>} How many files were written.
 */
export async function copyShots(shots, outDir) {
  const entries = Object.values(shots);
  if (entries.length === 0) return 0;

  const dest = join(outDir, 'shots');
  await mkdir(dest, { recursive: true });
  await Promise.all(
    entries.map((s) => copyFile(join(SHOTS_SRC, s.file), join(dest, `${s.slug}.png`))),
  );
  return entries.length;
}
