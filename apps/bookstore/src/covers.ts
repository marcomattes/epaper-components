// Locally generated book covers.
//
// Every cover in the shop is an SVG built here and handed to `<e-image>` as a
// `data:` URI — no remote hosts, no copyrighted artwork, and nothing to fetch
// on a device that pays for each network round trip with a panel refresh.
//
// The drawing is strictly 1-bit: solid black on paper white, with texture
// carried by rules, hatches and dots rather than by grey. That survives a
// Floyd–Steinberg dither intact, which a photographic cover would not.

const WIDTH = 320;
const HEIGHT = 480;

/** Four motifs, picked per book so a shelf of covers does not look stamped. */
type Motif = 'rules' | 'hatch' | 'arc' | 'grid';

const MOTIFS: Motif[] = ['rules', 'hatch', 'arc', 'grid'];

const xml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Stable small integer for a book id, so a cover never changes between loads. */
function hash(seed: string): number {
  let value = 0;
  for (let i = 0; i < seed.length; i++) value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  return value;
}

/**
 * Greedy line breaking. SVG has no text flow, so the title is measured in
 * characters against a per-size budget and split here.
 */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]!.slice(0, maxChars - 1)}…`;
  return kept;
}

function motifMarkup(motif: Motif, seed: number): string {
  switch (motif) {
    case 'rules': {
      const rules = Array.from(
        { length: 7 },
        (_, i) => `<rect x="34" y="${300 + i * 12}" width="${252 - i * 26}" height="4"/>`,
      ).join('');
      return rules;
    }
    case 'hatch': {
      const lines = Array.from({ length: 16 }, (_, i) => {
        const x = 34 + i * 16;
        return `<line x1="${x}" y1="296" x2="${x - 60}" y2="380" stroke="#000" stroke-width="3"/>`;
      }).join('');
      return `<g>${lines}</g>`;
    }
    case 'arc': {
      const radius = 62 + (seed % 3) * 12;
      return (
        `<circle cx="160" cy="352" r="${radius}" fill="none" stroke="#000" stroke-width="6"/>` +
        `<path d="M ${160 - radius} 352 A ${radius} ${radius} 0 0 1 ${160 + radius} 352 Z"/>`
      );
    }
    case 'grid': {
      const dots: string[] = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 10; col++) {
          const filled = (row * 10 + col + seed) % 3 === 0;
          const x = 40 + col * 26;
          const y = 300 + row * 20;
          dots.push(
            filled
              ? `<rect x="${x}" y="${y}" width="10" height="10"/>`
              : `<rect x="${x}" y="${y}" width="10" height="10" fill="none" stroke="#000" stroke-width="2"/>`,
          );
        }
      }
      return dots.join('');
    }
  }
}

export interface CoverInput {
  id: string;
  title: string;
  author: string;
  publisher: string;
  /** Short mark printed on the spine rule, e.g. `SF` or `ARCH`. */
  imprint: string;
}

/**
 * Build the cover for one book and return it as a `data:` URI.
 *
 * Deterministic in its input, so the same book always gets the same picture
 * and the browser can reuse the decoded bitmap across pages.
 */
export function coverUri(book: CoverInput): string {
  const seed = hash(book.id);
  const motif = MOTIFS[seed % MOTIFS.length]!;
  const titleLines = wrap(book.title.toUpperCase(), 13, 4);
  const titleSize = titleLines.length > 3 ? 30 : 36;
  const titleTop = 108;

  const title = titleLines
    .map(
      (line, index) =>
        `<text x="34" y="${titleTop + index * (titleSize + 6)}" font-family="Georgia,'Times New Roman',serif"` +
        ` font-size="${titleSize}" font-weight="700" letter-spacing="0.5">${xml(line)}</text>`,
    )
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>` +
    `<rect x="4" y="4" width="${WIDTH - 8}" height="${HEIGHT - 8}" fill="none" stroke="#000" stroke-width="6"/>` +
    `<rect x="20" y="20" width="8" height="${HEIGHT - 40}" fill="#000"/>` +
    `<text x="34" y="62" font-family="ui-monospace,Menlo,monospace" font-size="13" font-weight="700"` +
    ` letter-spacing="4">${xml(book.imprint.toUpperCase())}</text>` +
    `<rect x="34" y="74" width="${WIDTH - 68}" height="4" fill="#000"/>` +
    title +
    motifMarkup(motif, seed) +
    `<rect x="34" y="404" width="${WIDTH - 68}" height="3" fill="#000"/>` +
    `<text x="34" y="428" font-family="Georgia,'Times New Roman',serif" font-size="17"` +
    ` font-style="italic">${xml(book.author)}</text>` +
    `<text x="34" y="452" font-family="ui-monospace,Menlo,monospace" font-size="11"` +
    ` letter-spacing="2">${xml(book.publisher.toUpperCase())}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Alt text that describes the cover rather than repeating the title verbatim. */
export function coverAlt(book: CoverInput): string {
  return `Cover of ${book.title} by ${book.author}, published by ${book.publisher}`;
}
