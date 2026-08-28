// Types and URL rules for the component preview images.
//
// The images themselves are indexed and copied by scripts/site-shots.mjs,
// which needs `node:fs`. This module is the browser-safe half: the shape of
// that index, plus the two pure functions that turn a component entry into a
// lookup key and a public URL. Both content.ts (markup) and seo.ts (structured
// data) go through here, so the slug rule is stated once.
import type { ComponentEntry } from './data';
import { withBase } from './routes';

/** One published preview image. Mirrors the `Shot` typedef in site-shots.mjs. */
export interface Shot {
  /** `category-name`, e.g. `primitives-button`. */
  slug: string;
  /** Source file name of the visual-regression baseline. */
  file: string;
  /** Intrinsic pixel width — emitted as the `width` attribute. */
  width: number;
  /** Intrinsic pixel height — emitted as the `height` attribute. */
  height: number;
}

/** Preview images keyed by `category-name`. Empty when none were generated. */
export type ShotIndex = Record<string, Shot>;

/** Directory the previews are served from. No trailing slash. */
export const SHOTS_URL_BASE = '/shots';

/**
 * Lookup key for a component: `category-name`, lowercased.
 *
 * Deliberately the same slug the Storybook deep-link is built from, because
 * both derive from the story's `title`. Keep the two in step.
 */
export function shotKey(entry: ComponentEntry): string {
  return `${entry.category}-${entry.name}`.toLowerCase().replaceAll(/[^a-z0-9-]+/g, '-');
}

/** Site-absolute URL of a preview image. */
export function shotUrl(shot: Shot): string {
  // Site-absolute, so it has to carry the base: under a PR preview served
  // from a sub-directory these would otherwise resolve against the live site.
  return withBase(`${SHOTS_URL_BASE}/${shot.slug}.png`);
}

/**
 * Alt text for a preview.
 *
 * Written to be useful read aloud and specific enough to stand on its own in
 * an image search result: which component, which tag, and what the picture
 * actually shows.
 */
export function shotAlt(entry: ComponentEntry): string {
  return `EPaper ${entry.name} component — <${entry.tag}> rendered in the ink theme`;
}
