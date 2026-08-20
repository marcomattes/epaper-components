// Per-page <head> metadata and structured data.
//
// Imported by vite.site.config.ts in Node only — the browser never runs this.
//
// Two audiences:
//   • Search crawlers — title, description, canonical, Open Graph, sitemap.
//   • Generative engines (ChatGPT, Claude, Perplexity, AI Overviews) — which
//     mostly do not execute JavaScript and lean heavily on JSON-LD and plain
//     prose. Everything asserted here is also present as readable text on the
//     page; structured data restates it, it never replaces it.
import { esc } from '../../../packages/epaper-components/src/core/dom';
import {
  absoluteUrl,
  ALL_ROUTES,
  isNotFound,
  NOT_FOUND_PATH,
  PACKAGE_NAME,
  REPO_URL,
  ROUTES,
  SITE_BASE,
  SITE_NAME,
  SITE_ORIGIN,
  withBase,
  type Route,
} from './routes';
import { ARTICLES, articlePath, articlesOfKind, readingMinutes, type Article } from './articles';
import { blocksMarkdown } from './blocks';
import { FAQ, faqItems } from './faq';
import {
  COMPONENTS,
  FEATURES,
  IMPORT_SNIPPET,
  INSTALL_SNIPPETS,
  ROADMAP,
  ROADMAP_INTRO,
  USE_SNIPPET,
} from './data';
import { shotAlt, shotKey, shotUrl, type ShotIndex } from './shots';

const AUTHOR = { '@type': 'Person', name: 'Marco Mattes', url: 'https://mattes.dev' } as const;

const OG_IMAGE = `${SITE_ORIGIN}/og.png`;
const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;

/** JSON-LD needs to survive inside <script>; only "</" is dangerous there. */
function jsonLd(data: unknown): string {
  const json = JSON.stringify(data, null, 2).replace(/<\//g, '<\\/');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

/** The library itself. Repeated on every page as the site's primary subject. */
function softwareGraph(version: string): Record<string, unknown> {
  return {
    '@type': 'SoftwareSourceCode',
    '@id': `${SITE_ORIGIN}/#software`,
    name: SITE_NAME,
    alternateName: PACKAGE_NAME,
    description:
      'A vanilla custom-element library for e-paper displays. Surgical DOM updates, no animations, no :hover states and no Shadow DOM, so partial-refresh panels stay legible.',
    codeRepository: REPO_URL,
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Web browser',
    license: 'https://spdx.org/licenses/MIT.html',
    version,
    author: AUTHOR,
    maintainer: AUTHOR,
    url: SITE_ORIGIN,
    keywords: [
      'web components',
      'custom elements',
      'e-paper',
      'e-ink',
      'eink',
      'design system',
      'form-associated',
      'accessibility',
      'zero dependencies',
    ],
  };
}

/** Breadcrumbs give engines the site's shape without crawling every link. */
function breadcrumb(route: Route): Record<string, unknown> {
  const items = [{ name: 'Home', item: SITE_ORIGIN + '/' }];
  // An article sits one level deeper, under the section index. Saying so is
  // what lets a result render "epaper-components.dev › Guides › …" instead of
  // flattening every page onto the domain root.
  if (route.article) items.push({ name: 'Guides', item: absoluteUrl('/guides/') });
  if (route.dir) items.push({ name: route.nav, item: absoluteUrl(route.path) });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

/**
 * `ImageObject` for a component's preview, or undefined when it has none.
 *
 * The picture is already on the page with alt text; this restates it in a form
 * an image crawler can resolve without parsing the markup, and gives the
 * caption an engine quotes when it surfaces the thumbnail.
 */
function shotImage(
  entry: (typeof COMPONENTS)[number],
  shots: ShotIndex,
): Record<string, unknown> | undefined {
  const shot = shots[shotKey(entry)];
  if (!shot) return undefined;
  return {
    '@type': 'ImageObject',
    contentUrl: `${SITE_ORIGIN}${shotUrl(shot)}`,
    width: shot.width,
    height: shot.height,
    caption: shotAlt(entry),
    encodingFormat: 'image/png',
    license: 'https://spdx.org/licenses/MIT.html',
  };
}

/**
 * Strip the inline markdown subset back to prose.
 *
 * Structured data carries plain text, not markup: an `acceptedAnswer` reading
 * "extend \`HTMLElement\`" is what gets read aloud by an assistant that quotes
 * it. The visible page keeps the formatting; only the schema copy is flattened.
 */
function plainText(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1');
}

/** Rough word count of an article body, for `wordCount` in the schema. */
function articleWordCount(article: Article): number {
  const md = blocksMarkdown(article.blocks);
  return `${article.lede} ${md}`.trim().split(/\s+/).length;
}

/**
 * `TechArticle` for one guide or recipe.
 *
 * This is the schema type search engines and assistants associate with
 * developer documentation, and it is what carries the two dates. Publication
 * and modification dates are the strongest signal available that a technical
 * page is maintained — worth more here than any keyword field.
 */
function articleGraph(route: Route, article: Article): Record<string, unknown> {
  const url = absoluteUrl(route.path);
  return {
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    headline: article.title,
    name: article.heading,
    description: article.description,
    abstract: plainText(article.lede),
    articleSection: article.kind === 'recipe' ? 'Recipes' : 'Guides',
    datePublished: article.published,
    dateModified: article.updated,
    wordCount: articleWordCount(article),
    timeRequired: `PT${readingMinutes(article)}M`,
    keywords: article.topics.join(', '),
    author: AUTHOR,
    publisher: AUTHOR,
    inLanguage: 'en',
    license: 'https://spdx.org/licenses/MIT.html',
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    mainEntityOfPage: { '@id': `${url}#page` },
    about: { '@id': `${SITE_ORIGIN}/#software` },
  };
}

/**
 * `FAQPage` for the FAQ route.
 *
 * Every question and answer here is also visible text on the page. That is
 * not merely good practice — structured data that does not match the rendered
 * page is a guideline violation, and the whole value of the markup is that an
 * engine can trust it without rendering.
 */
function faqGraph(): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl('/faq/')}#faq`,
    mainEntity: faqItems().map((item) => ({
      '@type': 'Question',
      name: plainText(item.q),
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a.map((p) => plainText(p)).join(' '),
      },
    })),
  };
}

/** `ItemList` of every article, for the section index. */
function guidesGraph(): Record<string, unknown>[] {
  return [
    {
      '@type': 'CollectionPage',
      '@id': `${absoluteUrl('/guides/')}#collection`,
      name: 'EPaper guides and recipes',
      description:
        'Long-form guides on e-paper rendering and web component internals, plus complete recipes for real e-ink builds.',
      inLanguage: 'en',
    },
    {
      '@type': 'ItemList',
      name: 'Guides and recipes',
      numberOfItems: ARTICLES.length,
      itemListElement: ARTICLES.map((article, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: article.title,
        description: article.description,
        url: absoluteUrl(articlePath(article)),
      })),
    },
  ];
}

/** Route-specific structured data — the part an answer engine can cite. */
function routeGraph(
  route: Route,
  storybookBase: string,
  shots: ShotIndex,
): Record<string, unknown>[] {
  if (route.article) return [articleGraph(route, route.article)];

  switch (route.dir) {
    case 'guides':
      return guidesGraph();
    case 'faq':
      return [faqGraph()];
    case 'features':
      return [
        {
          '@type': 'ItemList',
          name: 'EPaper design principles',
          itemListElement: FEATURES.map((f, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: f.title,
            description: f.body,
          })),
        },
      ];
    case 'components':
      return [
        {
          '@type': 'ItemList',
          name: `EPaper components (${COMPONENTS.length})`,
          numberOfItems: COMPONENTS.length,
          itemListElement: COMPONENTS.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            description: `<${c.tag}> — ${c.category} component, importable as ${PACKAGE_NAME}/${c.tag.replace(/^e-/, '')}`,
            url: `${storybookBase}/?path=/docs/${`${c.category}-${c.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}--docs`,
            image: shotImage(c, shots),
          })),
        },
      ];
    case 'install':
      return [
        {
          '@type': 'HowTo',
          name: `Install ${PACKAGE_NAME}`,
          description: route.description,
          totalTime: 'PT30S',
          step: [
            {
              '@type': 'HowToStep',
              position: 1,
              name: 'Install',
              text: `Run npm install ${PACKAGE_NAME} (or pnpm add / yarn add).`,
            },
            {
              '@type': 'HowToStep',
              position: 2,
              name: 'Import',
              text: `Add a side-effect import of '${PACKAGE_NAME}' to your entry file, plus the tokens, base and components stylesheets.`,
            },
            {
              '@type': 'HowToStep',
              position: 3,
              name: 'Use',
              text: 'Write the tags in your HTML. The elements upgrade themselves — no framework, no build plugin and no polyfill for evergreen browsers.',
            },
          ],
        },
      ];
    default:
      return [];
  }
}

/** Markdown companion route for one HTML path (e.g. /install/ -> /install.md). */
export function markdownRoutePath(path: string): string {
  if (path === '/') return '/index.md';
  const slug = path.replace(/^\/+|\/+$/g, '');
  return `/${slug}.md`;
}

/** Markdown payload for one route, used by static .md alternates and llms-full.txt. */
export function routeMarkdown(route: Route, opts: { version: string; stars: string }): string {
  const canonical = absoluteUrl(route.path);

  // Articles carry their whole body. This is the copy an answer engine reads
  // when it follows the markdown alternate instead of rendering the page, so
  // a summary here would mean the engine sees less than a browser does.
  if (route.article) {
    const article = route.article;
    return [
      `# ${article.title}`,
      '',
      article.description,
      '',
      `Canonical: ${canonical}`,
      `Published: ${article.published} · Updated: ${article.updated} · ${readingMinutes(
        article,
      )} min read`,
      `Topics: ${article.topics.join(', ')}`,
      '',
      article.lede,
      '',
      blocksMarkdown(article.blocks),
      '',
    ].join('\n');
  }

  const lines = [`# ${route.title}`, '', route.description, '', `Canonical: ${canonical}`, ''];

  switch (route.dir) {
    case '':
      lines.push(
        '## Summary',
        '',
        `EPaper is a vanilla custom-element library tuned for e-paper displays. It ships ${COMPONENTS.length} components, no Shadow DOM, no animations and no \`:hover\`-only UI states.`,
        '',
        '## Install',
        '',
        '```bash',
        INSTALL_SNIPPETS.npm,
        '```',
        '',
        '```js',
        IMPORT_SNIPPET,
        '```',
      );
      break;
    case 'features':
      lines.push(
        '## Feature summary',
        '',
        ...FEATURES.flatMap((f) => [`- **${f.title}**: ${f.body}`]),
      );
      break;
    case 'components':
      lines.push(
        `## Components (${COMPONENTS.length})`,
        '',
        ...COMPONENTS.flatMap((c) => [`- \`<${c.tag}>\` — ${c.name} (${c.category})`]),
      );
      break;
    case 'showcase':
      lines.push(
        '## Live showcase',
        '',
        '- Form-associated custom-element form with validation and FormData output.',
        '- Sortable/selectable data table.',
        '- Calendar month view with event markers.',
      );
      break;
    case 'install':
      lines.push(
        '## Install commands',
        '',
        '```bash',
        INSTALL_SNIPPETS.npm,
        INSTALL_SNIPPETS.pnpm,
        INSTALL_SNIPPETS.yarn,
        '```',
        '',
        '## Import',
        '',
        '```js',
        IMPORT_SNIPPET,
        '```',
        '',
        '## Use',
        '',
        '```html',
        USE_SNIPPET,
        '```',
      );
      break;
    case 'guides':
      lines.push(
        '## Guides',
        '',
        ...articlesOfKind('guide').flatMap((a) => [
          `- [${a.heading}](${absoluteUrl(articlePath(a))}): ${a.description}`,
        ]),
        '',
        '## Recipes',
        '',
        ...articlesOfKind('recipe').flatMap((a) => [
          `- [${a.heading}](${absoluteUrl(articlePath(a))}): ${a.description}`,
        ]),
      );
      break;
    case 'faq':
      lines.push(
        ...FAQ.flatMap((group) => [
          `## ${group.title}`,
          '',
          ...group.items.flatMap((item) => [`### ${item.q}`, '', ...item.a, '']),
        ]),
      );
      break;
    case 'community':
      lines.push(
        '## Project facts',
        '',
        `- Version: ${opts.version}`,
        `- Components: ${COMPONENTS.length}`,
        `- Repository: ${REPO_URL} (${opts.stars} stars)`,
        '- License: MIT',
        '',
        '## Roadmap',
        '',
        ROADMAP_INTRO,
        '',
        ...ROADMAP.flatMap((r) => [`- **${r.time} — ${r.title}**: ${r.body}`]),
      );
      break;
    default:
      break;
  }

  return `${lines.join('\n')}\n`;
}

/**
 * `<meta name="robots">` for one page, or nothing when the default applies.
 *
 * Two reasons to write it, in this order:
 *
 *   • A PR preview is a throwaway copy of the whole site on the production
 *     host. Without this it would compete with the real pages in search
 *     results and outlive the branch in an index — the error page included,
 *     which is why the preview rule is checked first.
 *   • The error page is never a destination, but the links out of it are the
 *     site's own pages, so it is `follow` rather than `nofollow`.
 */
function robotsMeta(notFound: boolean): string {
  if (SITE_BASE !== '/') return '\n    <meta name="robots" content="noindex,nofollow" />';
  if (notFound) return '\n    <meta name="robots" content="noindex,follow" />';
  return '';
}

/**
 * The full <head> block for a route: title, description, canonical, Open
 * Graph, Twitter card and JSON-LD.
 */
export function headHtml(
  route: Route,
  opts: { version: string; storybookBase: string; shots: ShotIndex },
): string {
  const url = absoluteUrl(route.path);
  const markdownUrl = absoluteUrl(markdownRoutePath(route.path));
  // The error page is a real document but not a destination: it carries no
  // canonical, no markdown twin and no structured data, because every one of
  // those invites an engine to treat it as a page worth surfacing.
  const notFound = isNotFound(route);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      name: SITE_NAME,
      url: SITE_ORIGIN,
      inLanguage: 'en',
      publisher: AUTHOR,
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      url,
      name: route.title,
      description: route.description,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@id': `${SITE_ORIGIN}/#software` },
      inLanguage: 'en',
    },
    softwareGraph(opts.version),
    breadcrumb(route),
    ...routeGraph(route, opts.storybookBase, opts.shots),
  ];

  const noindex = robotsMeta(notFound);
  const canonical = notFound ? '' : `\n    <link rel="canonical" href="${esc(url)}" />`;
  const markdownAlternate = notFound
    ? ''
    : `\n    <link rel="alternate" type="text/markdown" href="${esc(markdownUrl)}" />`;

  // Articles are `og:type=article`, which unlocks the published/modified
  // timestamps and the section/tag fields. The core pages stay `website`.
  const article = route.article;
  const ogType = article ? 'article' : 'website';
  const articleMeta = article
    ? `
    <meta property="article:published_time" content="${esc(article.published)}" />
    <meta property="article:modified_time" content="${esc(article.updated)}" />
    <meta property="article:author" content="Marco Mattes" />
    <meta property="article:section" content="${esc(
      article.kind === 'recipe' ? 'Recipes' : 'Guides',
    )}" />${article.topics
      .map((t) => `\n    <meta property="article:tag" content="${esc(t)}" />`)
      .join('')}`
    : '';

  return `<title>${esc(route.title)}</title>
    <meta name="description" content="${esc(route.description)}" />${canonical}${noindex}${markdownAlternate}
    <meta name="author" content="Marco Mattes" />
    <link rel="author" href="https://mattes.dev" />
    <link rel="icon" href="${esc(withBase('/favicon.svg'))}" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="${esc(withBase('/apple-touch-icon.png'))}" />

    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${esc(SITE_NAME)}" />
    <meta property="og:title" content="${esc(route.title)}" />
    <meta property="og:description" content="${esc(route.description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:locale" content="en" />
    <meta property="og:image" content="${esc(OG_IMAGE)}" />
    <meta property="og:image:width" content="${OG_IMAGE_W}" />
    <meta property="og:image:height" content="${OG_IMAGE_H}" />
    <meta property="og:image:alt" content="EPaper — web components for e-paper displays" />${articleMeta}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(route.title)}" />
    <meta name="twitter:description" content="${esc(route.description)}" />
    <meta name="twitter:image" content="${esc(OG_IMAGE)}" />

    ${notFound ? '' : jsonLd({ '@context': 'https://schema.org', '@graph': graph })}`;
}

/**
 * sitemap.xml over every route.
 *
 * Articles report their own `updated` date rather than the build date. A
 * sitemap that claims every page changed today on every deploy trains a
 * crawler to ignore the field; a date that only moves when the text moves is
 * the one worth sending.
 */
export function sitemapXml(lastmod: string): string {
  const urls = ALL_ROUTES.map((r) => {
    const changed = r.article ? r.article.updated : lastmod;
    const freq = r.article ? 'monthly' : 'weekly';
    const priority = r.dir === '' ? '1.0' : r.article ? '0.7' : '0.8';
    return `  <url>
    <loc>${absoluteUrl(r.path)}</loc>
    <lastmod>${changed}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * robots.txt.
 *
 * AI crawlers are allowed on purpose: this is MIT-licensed documentation that
 * benefits from being quoted. Flip a group to Disallow to opt out of one.
 */
export function robotsTxt(): string {
  const aiAgents = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'anthropic-ai',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'Bytespider',
    'meta-externalagent',
  ];
  // /preview/ holds per-pull-request copies of this same site. They are
  // deleted when the PR closes, so they must never enter an index.
  return `# https://epaper-components.dev
User-agent: *
Allow: /
Disallow: /preview/

${aiAgents.map((a) => `User-agent: ${a}\nAllow: /\nDisallow: /preview/`).join('\n\n')}

Content-Signal: search=yes, ai-input=yes, ai-train=yes

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
}

/**
 * llms.txt — the llmstxt.org convention: one markdown file an answer engine
 * can read instead of rendering six HTML pages.
 */
export function llmsTxt(opts: { version: string; stars: string }): string {
  const routeLines = ROUTES.map(
    (r) => `- [${r.nav}](${absoluteUrl(r.path)}): ${r.description}`,
  ).join('\n');

  const componentLines = COMPONENTS.map((c) => `- \`<${c.tag}>\` — ${c.name} (${c.category})`).join(
    '\n',
  );

  // Articles are listed with their markdown alternate rather than the HTML
  // page: an agent following this file wants the text, and the .md URL hands
  // it over without a render step.
  const articleLines = (kind: 'guide' | 'recipe'): string =>
    articlesOfKind(kind)
      .map(
        (a) =>
          `- [${a.title}](${absoluteUrl(articlePath(a))}) — ${a.description}\n  Markdown: ${absoluteUrl(
            markdownRoutePath(articlePath(a)),
          )}`,
      )
      .join('\n');

  return `# ${SITE_NAME}

> A vanilla custom-element library for e-paper displays. ${COMPONENTS.length} framework-agnostic
> components in about 40 KB gzipped, MIT licensed, zero runtime dependencies.

EPaper is built for electrophoretic (e-ink) panels rather than backlit screens. The
constraints that follow from that are deliberate and apply to every component:

- **No animations and no CSS transitions.** An e-paper controller redraws in discrete
  waveforms; an animation is a sequence of full-panel flashes.
- **No \`:hover\` states.** The devices are touch-driven and have no pointer.
- **No Shadow DOM.** Styling is a single CSS-custom-property layer, so a panel vendor can
  restyle the library without touching JavaScript.
- **Surgical DOM updates.** Components patch text nodes and attributes in place to keep the
  damaged rectangle small, which lets the controller pick a fast partial refresh instead of a
  full GC16 flash.
- **Form-associated custom elements.** Inputs, selects and pickers participate in
  \`<form>\` submission, \`FormData\` and \`ElementInternals\` validity.

## Install

\`\`\`
npm install ${PACKAGE_NAME}
\`\`\`

\`\`\`js
import '${PACKAGE_NAME}';
import '${PACKAGE_NAME}/styles/tokens.css';
import '${PACKAGE_NAME}/styles/base.css';
import '${PACKAGE_NAME}/styles/components.css';
\`\`\`

Single components can be imported on their own — \`${PACKAGE_NAME}/button\` — so a page
ships only what it uses.

## Facts

- Version: ${opts.version}
- License: MIT
- Repository: ${REPO_URL} (${opts.stars} stars)
- Author: Marco Mattes — https://mattes.dev
- Components: ${COMPONENTS.length}
- Bundle: about 40 KB gzipped for the full barrel
- Requires: evergreen browsers with custom elements and \`ElementInternals\`

## Pages

${routeLines}

## Guides

Long-form explanations of the medium and the platform APIs the library is built on.
Useful whether or not you install EPaper.

${articleLines('guide')}

## Recipes

Complete builds for real e-paper deployments.

${articleLines('recipe')}

## FAQ

${faqItems()
  .map((item) => `- **${item.q}** ${item.a[0] ?? ''}`)
  .join('\n')}

Full answers: ${absoluteUrl('/faq/')} (markdown: ${absoluteUrl('/faq.md')})

## Components

${componentLines}

## Full text

Every page above, concatenated as one markdown document:
${SITE_ORIGIN}/llms-full.txt
`;
}

/** Full one-fetch markdown dump across all routes for LLM and agent tooling. */
export function llmsFullTxt(opts: { version: string; stars: string }): string {
  const pages = ALL_ROUTES.map((route) => routeMarkdown(route, opts)).join('\n\n---\n\n');
  return `# ${SITE_NAME} — Full documentation

Canonical site: ${SITE_ORIGIN}
Repository: ${REPO_URL}

This file concatenates the complete EPaper documentation so AI agents can fetch it in one request.

${pages}`;
}

/**
 * Apache configuration for the deployed site.
 *
 * The site is published over FTP onto shared hosting, where `.htaccess` is
 * the only server configuration a deploy can carry. `_headers` beside it is
 * the Netlify/Cloudflare Pages format and has no effect on such a host, so
 * the two things that actually have to hold are stated here as well:
 *
 *   • the error document, so an address that does not exist lands on this
 *     site's own 404 instead of the provider's default page;
 *   • the media type of the markdown alternates, which Apache otherwise
 *     serves as `application/octet-stream` — a download rather than a
 *     document, which is exactly what an answer engine cannot read.
 *
 * `ErrorDocument` and `AddType` are core and mod_mime; the optional half is
 * wrapped in `<IfModule>` so a host without the module skips the block. What
 * no guard can cover is a host that forbids overrides altogether: there this
 * file has to be deleted from the server, and the deploy left alone.
 */
export function htaccessConfig(): string {
  return `# Generated by the site build (src/site/seo.ts). Edits made on the server are
# overwritten by the next deploy — change the generator instead.

# Written by the build next to index.html, and deliberately not in the
# sitemap: this is the page the host serves for an address that does not
# exist, not a page anyone navigates to.
ErrorDocument 404 ${withBase(NOT_FOUND_PATH)}

<IfModule mod_mime.c>
  # The .md twin of every page, linked from its <head> and from llms.txt.
  AddType text/markdown .md
  AddCharset utf-8 .md .txt .html .css .js .json .xml .svg
</IfModule>
`;
}

/** Netlify/Cloudflare-style static header rules for markdown alternates. */
export function markdownAlternateHeaders(): string {
  const safePath = (path: string): string => {
    if (/[\r\n]/.test(path)) {
      throw new Error(`Invalid header path: ${path}`);
    }
    return path;
  };
  const pairs = ALL_ROUTES.map((route) => ({
    html: safePath(withBase(route.path)),
    markdown: safePath(withBase(markdownRoutePath(route.path))),
  }));

  const htmlHeaders = pairs
    .map(
      (pair) => `${pair.html}\n  Link: <${pair.markdown}>; rel="alternate"; type="text/markdown"`,
    )
    .join('\n\n');
  const markdownHeaders = pairs
    .map((pair) => `${pair.markdown}\n  Link: <${pair.html}>; rel="alternate"; type="text/html"`)
    .join('\n\n');

  return `${htmlHeaders}\n\n${markdownHeaders}\n`;
}
