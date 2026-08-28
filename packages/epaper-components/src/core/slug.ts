// Shared heading-id slug helper. Originally lived only in `e-title`; `e-toc`
// (Welle 3) reuses it verbatim so a raw `<h2>` scanned out of an `<e-prose>`
// document gets the same stable id an `<e-title>` would have generated.

/** German umlauts and ß transliterate before the accent strip, not through it. */
const TRANSLITERATE: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
};

/**
 * Turn heading text into a stable, DOM-id-valid slug.
 *
 * The result is also usable as a CSS id selector, which is why a slug that
 * would start with a digit is prefixed: `#2026-bilanz` is not a valid
 * selector, `#h-2026-bilanz` is.
 */
export function slugifyTitle(raw: string): string {
  const collapsed = raw
    .toLowerCase()
    .replaceAll(/[äöüß]/g, (c) => TRANSLITERATE[c] ?? c)
    .normalize('NFKD')
    .replaceAll(/[̀-ͯ]/g, '')
    .replaceAll(/[^a-z\d]+/g, '-');
  // Trimming with `/^-+|-+$/` is O(n^2) on a long run of separators: the engine
  // backtracks the `+` from every start position. The collapse above already
  // guarantees separators never repeat, so one unquantified character at each
  // end is both sufficient and linear.
  const base = collapsed.replace(/^-/, '').replace(/-$/, '');
  if (!base) return '';
  return /^\d/.test(base) ? `h-${base}` : base;
}

/**
 * Appends `-2`, `-3`, … until `slug` is free in the document, so repeated
 * headings still resolve to distinct fragments. `keepOwner` lets a caller
 * that already owns a candidate id keep it instead of being bumped by its
 * own previous render.
 */
export function uniqueSlugId(slug: string, keepOwner: (owner: Element) => boolean): string {
  let candidate = slug;
  for (let n = 2; n < 1000; n++) {
    const owner = document.getElementById(candidate);
    if (!owner || keepOwner(owner)) return candidate;
    candidate = `${slug}-${n}`;
  }
  return candidate;
}
