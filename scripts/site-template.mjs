// Fills the per-route slots in the site shell (src/site/index.html).
//
// Shared by two callers so the substitution rule exists once:
//   • vite.site.config.ts — dev server and the home page of a build.
//   • scripts/build-site-routes.mjs — the five sub-pages, applied to the
//     already-inlined dist-site/index.html.
//
// The slots are HTML comments, which survive Vite's build untouched, and the
// closing marker is kept so a page can be re-processed.

/** @typedef {{ head: string, main: string, nav: string, pagenav: string, route: string }} RouteBlocks */

const SLOTS = /** @type {const} */ (['head', 'main', 'nav', 'pagenav']);

/**
 * @param {string} html Shell HTML containing the `<!--site:*-->` markers.
 * @param {RouteBlocks} blocks
 * @returns {string}
 */
export function applyRouteBlocks(html, blocks) {
  let out = html;
  for (const slot of SLOTS) {
    const re = new RegExp(`<!--site:${slot}-->[\\s\\S]*?<!--/site:${slot}-->`);
    if (!re.test(out)) {
      throw new Error(`site-template: slot "${slot}" not found — did the shell markers change?`);
    }
    // Function replacement: the injected HTML contains $ sequences (JSON-LD,
    // code snippets) that a string replacement would interpret.
    out = out.replace(re, () => `<!--site:${slot}-->${blocks[slot]}<!--/site:${slot}-->`);
  }
  out = out.replace(
    /<body([^>]*)\sdata-route="[^"]*"/,
    (_m, rest) => `<body${rest} data-route="${blocks.route}"`,
  );
  return out;
}
