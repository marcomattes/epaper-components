// The article model shared by the guides and the recipes.
//
// Both live under /guides/ as one flat namespace of long-form pages. They are
// separated by `kind` rather than by URL prefix because the distinction is
// editorial, not structural: a reader arriving from a search for "e-ink
// dashboard" should not have to know whether the answer was filed as a guide
// or as a recipe, and one namespace means one index, one prev/next sequence
// and one place to add the next piece.
//
// `guides.ts` and `recipes.ts` import the `Article` type from here while this
// module imports their content. That cycle is type-only in one direction —
// `import type` is erased at compile time — so nothing circular survives into
// the emitted JavaScript.
import type { Block } from './blocks';
import { GUIDES } from './guides';
import { RECIPES } from './recipes';

export type ArticleKind = 'guide' | 'recipe';

export interface Article {
  /** URL slug, unique across guides and recipes. */
  slug: string;
  /** Editorial category. Drives grouping on the index and the schema type. */
  kind: ArticleKind;
  /** Short label for the index card, breadcrumb and prev/next links. */
  nav: string;
  /** `<title>`, without the site-name suffix. */
  title: string;
  /** Visible `<h1>`. Shorter than the title — the title carries the keywords. */
  heading: string;
  /** `<meta name="description">` and og:description. */
  description: string;
  /** Opening paragraph, set larger than the body. The sentence most likely to be quoted. */
  lede: string;
  /** ISO date of first publication. */
  published: string;
  /** ISO date of the last substantive edit. */
  updated: string;
  /** Subject keywords for structured data. Not rendered as tags. */
  topics: string[];
  /** The body. */
  blocks: Block[];
}

/** Every long-form page, guides first. */
export const ARTICLES: Article[] = [...GUIDES, ...RECIPES];

/** Section root. The index page lives here and every article hangs off it. */
export const ARTICLES_ROOT = '/guides/';

/** Site-absolute path for an article, with the trailing slash the routes use. */
export function articlePath(article: Article): string {
  return `${ARTICLES_ROOT}${article.slug}/`;
}

/** Output directory under dist-site, e.g. `guides/partial-refresh`. */
export function articleDir(article: Article): string {
  return `guides/${article.slug}`;
}

export function articlesOfKind(kind: ArticleKind): Article[] {
  return ARTICLES.filter((a) => a.kind === kind);
}

/**
 * Estimated reading time in minutes.
 *
 * Computed from the body rather than authored, so it cannot go stale when an
 * article is extended. 200 words per minute is the conventional figure for
 * technical prose; code blocks are counted at a third of that because they are
 * scanned rather than read.
 */
export function readingMinutes(article: Article): number {
  let words = countWords(article.lede);
  for (const block of article.blocks) {
    switch (block.kind) {
      case 'p':
      case 'h2':
      case 'h3':
      case 'quote':
        words += countWords(block.text);
        break;
      case 'note':
        words += countWords(block.text);
        break;
      case 'ul':
      case 'ol':
        words += block.items.reduce((n, i) => n + countWords(i), 0);
        break;
      case 'table':
        words += [...block.head, ...block.rows.flat()].reduce((n, c) => n + countWords(c), 0);
        break;
      case 'code':
        words += countWords(block.code) / 3;
        break;
      default:
        break;
    }
  }
  return Math.max(1, Math.round(words / 200));
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Duplicate slugs would silently overwrite each other's output directory, so
 * the build fails loudly instead. Called once from routes.ts at module load.
 */
export function assertUniqueSlugs(): void {
  const seen = new Set<string>();
  for (const article of ARTICLES) {
    if (seen.has(article.slug)) {
      throw new Error(`articles: duplicate slug "${article.slug}"`);
    }
    seen.add(article.slug);
  }
}
