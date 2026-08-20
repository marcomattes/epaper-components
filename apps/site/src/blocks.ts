// The article body format, and the two renderers that read it.
//
// Long-form pages (guides, recipes, FAQ answers) are authored as a list of
// typed blocks rather than as HTML strings. There is one reason for that: the
// site publishes every route twice — once as HTML for browsers and search
// crawlers, once as `.md` for answer engines that fetch the markdown
// alternate instead of rendering the page. Hand-writing both is how they
// drift, and a drifted markdown alternate is worse than none: it is the copy
// an LLM quotes.
//
// So the blocks below are the single source of truth. `blocksHtml()` and
// `blocksMarkdown()` are two projections of the same data, and neither can
// contain a sentence the other does not.
//
// Inline formatting is a deliberately tiny markdown subset — `code`, **bold**
// and [links](…). It is passed through verbatim on the markdown side, and
// expanded into markup on the HTML side *after* escaping, so an article can
// never inject tags.
import { esc } from '../../../packages/epaper-components/src/core/dom';

/** One node of an article body. */
export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'note'; label: string; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] };

/* --------------------------------------------------------------------- *
 * Inline formatting
 * --------------------------------------------------------------------- */

/**
 * Link targets an article may point at.
 *
 * Anything else throws at build time rather than shipping: the articles are
 * repository content, so a bad scheme is an authoring bug to fix, not a
 * runtime case to tolerate.
 */
function assertSafeHref(href: string): string {
  if (/^https?:\/\//i.test(href) || href.startsWith('/') || href.startsWith('#')) return href;
  throw new Error(`blocks: unsupported link target "${href}" — use https://, / or #`);
}

/**
 * Escape a run of plain text and expand the link syntax in it.
 *
 * Escaping happens first, so every character that could open a tag is already
 * inert and this pass only ever adds markup around known-safe text. Emphasis
 * is deliberately not handled here — see {@link inlineHtml} for why.
 */
function formatRun(run: string): string {
  return (
    esc(run)
      // The href was escaped along with everything else, so an `&` in a query
      // string is `&amp;` by now. It is unescaped for the safety check and
      // then re-escaped as an attribute value.
      .replace(/\[([^\]]{1,300})\]\(([^)\s]{1,2000})\)/g, (_m, label: string, href: string) => {
        const url = assertSafeHref(href.replaceAll('&amp;', '&'));
        const rel = /^https?:\/\//i.test(url) ? ' rel="noopener"' : '';
        return `<a class="ink-link" href="${esc(url)}"${rel}>${label}</a>`;
      })
  );
}

/**
 * Expand the inline subset into HTML.
 *
 * Emphasis is handled as a toggle over a token stream rather than as a regex
 * over each run, because the two constructs interleave: "**`GC16`**" puts a
 * code span between an opening and a closing marker, and a per-run regex
 * would find each marker stranded in a different run with no partner. The
 * stream is split so that code spans and emphasis markers become their own
 * tokens and everything else is escaped text.
 *
 * Alternation order matters: `**` must be offered before `*`, or every bold
 * marker would be consumed as two empty italics.
 */
interface InlineState {
  bold: boolean;
  italic: boolean;
}

/** Render a single token from the emphasis token stream, mutating the running toggle state. */
function renderInlineToken(token: string, state: InlineState): string {
  if (token === '**') {
    state.bold = !state.bold;
    return state.bold ? '<strong>' : '</strong>';
  }
  if (token === '*') {
    state.italic = !state.italic;
    return state.italic ? '<em>' : '</em>';
  }
  if (token.length > 1 && token.startsWith('`') && token.endsWith('`')) {
    return `<code>${esc(token.slice(1, -1))}</code>`;
  }
  return formatRun(token);
}

export function inlineHtml(text: string): string {
  const state: InlineState = { bold: false, italic: false };
  const out = text
    .split(/(`[^`]+`|\*\*|\*)/g)
    .filter((token) => token !== '')
    .map((token) => renderInlineToken(token, state))
    .join('');

  // An unclosed marker would emit unbalanced tags into the page. Like a bad
  // link target, that is an authoring mistake worth failing the build for
  // rather than shipping — the markdown projection would still look correct,
  // so it is exactly the kind of defect nobody notices by reading.
  if (state.bold || state.italic) {
    throw new Error(`blocks: unbalanced ${state.bold ? '**' : '*'} in ${JSON.stringify(text)}`);
  }
  return out;
}

/** The inline subset is already markdown — only the safety check applies. */
function inlineMarkdown(text: string): string {
  for (const match of text.matchAll(/\[[^\]]{1,300}\]\(([^)\s]{1,2000})\)/g)) {
    assertSafeHref(match[1] ?? '');
  }
  return text;
}

/* --------------------------------------------------------------------- *
 * Headings
 * --------------------------------------------------------------------- */

/**
 * Stable fragment id for a heading, used by the in-page table of contents.
 *
 * Derived from the text rather than authored by hand so the two can never
 * disagree — a table of contents that links to a missing anchor is a broken
 * link the build would not otherwise catch.
 */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('`', '')
    .replace(/[^a-z0-9]{1,300}/g, '-')
    .replace(/^-{1,300}/, '')
    .replace(/-{1,300}$/, '');
}

/** The `h2` headings of a body, in order — the article's table of contents. */
export function tableOfContents(blocks: Block[]): Array<{ id: string; text: string }> {
  return blocks
    .filter((b): b is Extract<Block, { kind: 'h2' }> => b.kind === 'h2')
    .map((b) => ({ id: headingId(b.text), text: b.text }));
}

/* --------------------------------------------------------------------- *
 * HTML projection
 * --------------------------------------------------------------------- */

function blockHtml(block: Block): string {
  switch (block.kind) {
    case 'p':
      return `<p class="site-prose__p">${inlineHtml(block.text)}</p>`;

    case 'h2':
      // Articles are their own document, so the page heading is the <h1> and
      // section headings start at <h2>. Keeping the level honest is what lets
      // an answer engine tell a section apart from a caption.
      return `<h2 class="ink-title ink-title--3 site-prose__h2" id="${esc(
        headingId(block.text),
      )}">${inlineHtml(block.text)}</h2>`;

    case 'h3':
      return `<h3 class="ink-title ink-title--4 site-prose__h3" id="${esc(
        headingId(block.text),
      )}">${inlineHtml(block.text)}</h3>`;

    case 'ul':
      return `<ul class="site-prose__list">${block.items
        .map((i) => `<li>${inlineHtml(i)}</li>`)
        .join('')}</ul>`;

    case 'ol':
      return `<ol class="site-prose__list site-prose__list--num">${block.items
        .map((i) => `<li>${inlineHtml(i)}</li>`)
        .join('')}</ol>`;

    case 'code':
      // `data-lang` is presentational only. There is no syntax highlighter on
      // this site: colouring code costs a JavaScript payload and buys nothing
      // on a one-bit panel.
      return `<pre class="site-code site-prose__code" data-lang="${esc(block.lang)}"><code>${esc(
        block.code,
      )}</code></pre>`;

    case 'note':
      return `<aside class="site-note"><span class="site-note__label">${esc(
        block.label,
      )}</span><p class="site-note__body">${inlineHtml(block.text)}</p></aside>`;

    case 'quote':
      return `<blockquote class="site-quote">${inlineHtml(block.text)}</blockquote>`;

    case 'table': {
      const head = block.head.map((h) => `<th scope="col">${inlineHtml(h)}</th>`).join('');
      const rows = block.rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, i) =>
                i === 0
                  ? `<th scope="row">${inlineHtml(cell)}</th>`
                  : `<td>${inlineHtml(cell)}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('');
      // The wrapper scrolls instead of the page: a comparison table is the
      // one block that cannot always be made narrow enough for a phone.
      return `<div class="site-prose__tablewrap"><table class="ink-table site-prose__table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    default: {
      // Exhaustiveness guard: adding a Block variant without a renderer is a
      // compile error here rather than a silently missing paragraph.
      const never: never = block;
      throw new Error(`blocks: unhandled block ${JSON.stringify(never)}`);
    }
  }
}

/** Render an article body as HTML. */
export function blocksHtml(blocks: Block[]): string {
  return blocks.map((b) => blockHtml(b)).join('\n        ');
}

/* --------------------------------------------------------------------- *
 * Markdown projection
 * --------------------------------------------------------------------- */

function blockMarkdown(block: Block): string {
  switch (block.kind) {
    case 'p':
      return inlineMarkdown(block.text);
    case 'h2':
      return `## ${inlineMarkdown(block.text)}`;
    case 'h3':
      return `### ${inlineMarkdown(block.text)}`;
    case 'ul':
      return block.items.map((i) => `- ${inlineMarkdown(i)}`).join('\n');
    case 'ol':
      return block.items.map((i, n) => `${n + 1}. ${inlineMarkdown(i)}`).join('\n');
    case 'code':
      return ['```' + block.lang, block.code, '```'].join('\n');
    case 'note':
      return `> **${block.label}:** ${inlineMarkdown(block.text)}`;
    case 'quote':
      return `> ${inlineMarkdown(block.text)}`;
    case 'table': {
      const head = `| ${block.head.map((h) => inlineMarkdown(h)).join(' | ')} |`;
      const sep = `| ${block.head.map(() => '---').join(' | ')} |`;
      const rows = block.rows.map((row) => `| ${row.map((c) => inlineMarkdown(c)).join(' | ')} |`);
      return [head, sep, ...rows].join('\n');
    }
    default: {
      const never: never = block;
      throw new Error(`blocks: unhandled block ${JSON.stringify(never)}`);
    }
  }
}

/** Render an article body as markdown, for the `.md` alternate and llms-full.txt. */
export function blocksMarkdown(blocks: Block[]): string {
  return blocks.map((b) => blockMarkdown(b)).join('\n\n');
}
