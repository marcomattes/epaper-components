// Every page of the site, as real URLs.
//
// Two sequences live here. ROUTES is the numbered spine — the pages in the
// header nav, each with a folio, walked by the prev/next links and the pager
// keys. ARTICLE_ROUTES is the long-form section under /guides/, derived from
// the article content itself so adding a guide is one entry in guides.ts and
// nothing here.
//
// ALL_ROUTES is the union, and it is what the build, the sitemap, the
// markdown alternates and llms.txt iterate: those care about "every URL that
// exists", not about which sequence a page belongs to.
//
// This module is imported by the browser bundle *and* by vite.site.config.ts
// in Node, so it must stay free of browser-only APIs.
import { ARTICLES, articleDir, articlePath, assertUniqueSlugs, type Article } from './articles';

/** Canonical origin. No trailing slash. */
export const SITE_ORIGIN = 'https://epaper-components.dev';

/** Repository the site documents. */
export const REPO_URL = 'https://github.com/marcomattes/epaper-components';

/** npm package name, quoted verbatim in install instructions and structured data. */
export const PACKAGE_NAME = '@marcomattes/epaper-components';

export interface Route {
  /** Site-absolute path, always with a trailing slash. */
  path: string;
  /** Output directory under dist-site (empty for the home page). */
  dir: string;
  /** Short label in the header nav. */
  nav: string;
  /** <title>, without the site-name suffix. */
  title: string;
  /** <meta name="description"> and og:description. One or two sentences. */
  description: string;
  /** Visible page heading. The cover carries its own display headline. */
  heading: string;
  /** Page number printed in the section header, matching the paper metaphor. */
  folio: string;
  /**
   * Set when the route renders a long-form article rather than a core page.
   * Its presence is what switches the page header, the structured data and
   * the prev/next sequence over to the article treatment.
   */
  article?: Article;
}

export const SITE_NAME = 'EPaper Components';

export const ROUTES: Route[] = [
  {
    path: '/',
    dir: '',
    nav: 'Cover',
    // The head term this page competes for is "e-ink web components", and it
    // has to appear as that phrase — in the title, in the <h1> and in the
    // first paragraph of the body. Before that was true the FAQ outranked
    // the cover for the site's own subject, simply because the FAQ was the
    // only page that spelled "e-ink" next to "web components" in prose.
    title: 'EPaper — E-Ink Web Components for E-Paper Displays',
    description:
      'EPaper is an open-source library of 81 e-ink web components: vanilla custom elements for e-paper (eink) displays, with surgical DOM updates, no animations, no :hover and no Shadow DOM. 58 KB brotli, MIT licensed.',
    heading: 'Web components for e-ink & e-paper.',
    folio: '01',
  },
  {
    path: '/features/',
    dir: 'features',
    nav: 'Features',
    title: 'Features — Why EPaper is built for ink, not pixels',
    description:
      'Partial-refresh-friendly DOM patches for e-paper and e-ink displays, vanilla custom elements without Shadow DOM, form-associated inputs via ElementInternals, accessibility by default and theming through CSS custom properties.',
    heading: 'Built for ink, not pixels.',
    folio: '02',
  },
  {
    path: '/components/',
    dir: 'components',
    nav: 'Components',
    title: 'Components — All 81 EPaper custom elements',
    description:
      'The complete EPaper component inventory for e-paper and e-ink displays: buttons, inputs, pickers, tables, calendars and layout primitives, each shipped as a standalone custom element you can import on its own.',
    heading: 'Every component, one tile each.',
    folio: '03',
  },
  {
    path: '/showcase/',
    dir: 'showcase',
    nav: 'Showcase',
    title: 'Showcase — EPaper chat, dashboards, shelf labels and forms in action',
    description:
      'A live showcase of EPaper: a scripted AI chat with rich e-paper-safe replies, a sensor wall dashboard, an electronic shelf label, a meeting-room door sign, a parcel tracker, an e-reader page, a form-associated form with validation, a sortable selectable table and a month calendar — all running as plain custom elements.',
    heading: 'Live showcase.',
    folio: '04',
  },
  {
    path: '/install/',
    dir: 'install',
    nav: 'Install',
    title: 'Install — Add EPaper to your project in 30 seconds',
    description: `Install ${PACKAGE_NAME} with npm, pnpm or yarn, import the three stylesheets and drop the tags into your HTML. No build-step configuration, no framework required.`,
    heading: 'Install in 30 seconds.',
    folio: '05',
  },
  {
    path: '/community/',
    dir: 'community',
    nav: 'Community',
    title: 'Community & colophon — License, roadmap and maintainer',
    description:
      'EPaper is MIT licensed and maintained by Marco Mattes. Roadmap, repository, issue tracker and how to contribute.',
    heading: 'Community & colophon.',
    folio: '06',
  },
  {
    path: '/guides/',
    dir: 'guides',
    nav: 'Guides',
    title: 'Guides & recipes — Building interfaces for e-paper displays',
    description:
      'In-depth guides on e-paper partial refresh and waveforms, web components without Shadow DOM, form-associated custom elements, and e-ink interface design — plus complete recipes for dashboards, shelf labels, room displays and weather stations.',
    heading: 'Guides & recipes.',
    folio: '07',
  },
  {
    path: '/faq/',
    dir: 'faq',
    nav: 'FAQ',
    title: 'FAQ — Frequently asked questions about EPaper',
    description:
      'Answers on framework support, browser requirements, bundle size, theming, accessibility, form participation, ghosting and licensing for the EPaper web component library.',
    heading: 'Frequently asked questions.',
    folio: '08',
  },
];

/* --------------------------------------------------------------------- *
 * Long-form section
 * --------------------------------------------------------------------- */

// A duplicate slug would collide in dist-site and silently drop a page.
assertUniqueSlugs();

/**
 * One route per article, derived from the content.
 *
 * These deliberately stay out of {@link ROUTES}: they are not in the header
 * nav and not part of the numbered spine. In place of a folio they carry
 * their editorial category, which is what the article header prints.
 */
export const ARTICLE_ROUTES: Route[] = ARTICLES.map((article) => ({
  path: articlePath(article),
  dir: articleDir(article),
  nav: article.nav,
  title: article.title,
  description: article.description,
  heading: article.heading,
  folio: article.kind === 'recipe' ? 'RECIPE' : 'GUIDE',
  article,
}));

/** Every URL the site publishes. Build, sitemap, alternates and llms.txt use this. */
export const ALL_ROUTES: Route[] = [...ROUTES, ...ARTICLE_ROUTES];

/* --------------------------------------------------------------------- *
 * Error page
 * --------------------------------------------------------------------- */

/** Where the error page is written, and what the host is pointed at. */
export const NOT_FOUND_PATH = '/404.html';

/**
 * The error page.
 *
 * Deliberately outside {@link ROUTES} and {@link ALL_ROUTES}: nobody
 * navigates here, this is what the host returns for a URL the build never
 * wrote. Keeping it out of both lists is what keeps it out of the header
 * nav, the sitemap, llms.txt, the markdown alternates and the prev/next
 * sequence — an indexable 404 is worse than none at all.
 */
export const NOT_FOUND_ROUTE: Route = {
  path: NOT_FOUND_PATH,
  dir: '',
  nav: 'Not found',
  title: 'Page not found',
  description:
    'This address does not exist on epaper-components.dev. Every page the site does publish is linked from here.',
  heading: 'Nothing at this address.',
  folio: '404',
};

/** True for the error page, which the head, body and pager each treat apart. */
export function isNotFound(route: Route): boolean {
  return route.path === NOT_FOUND_PATH;
}

/**
 * Path prefix the site is served under, with a leading and trailing slash.
 *
 * `/` in production. PR previews are published into a sub-directory of the
 * same host (`/preview/pr-42/`), and because every internal link in this file
 * is site-absolute, they would otherwise point back at the production site.
 * Read from the environment at build time so the browser bundle and the Node
 * side of the build agree; `import.meta.env` is absent in Node, hence the
 * optional chain.
 */
export const SITE_BASE: string = normalizeBase(readBase() ?? '/');

function readBase(): string | undefined {
  // Reached through globalThis rather than `process` / `import.meta.env`
  // directly: this module is type-checked without @types/node and without
  // vite/client, and is loaded in both runtimes.
  const g = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const fromNode = g.process?.env?.['VITE_SITE_BASE'];
  if (fromNode) return fromNode;
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  return meta.env?.['VITE_SITE_BASE'];
}

function normalizeBase(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '/') return '/';
  const lead = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return lead.endsWith('/') ? lead : `${lead}/`;
}

/**
 * Prefix a site-absolute path with {@link SITE_BASE}.
 *
 * Pass paths exactly as they appear in {@link ROUTES} (leading slash); the
 * function is a no-op when the site is served from the root.
 */
export function withBase(path: string): string {
  if (SITE_BASE === '/') return path;
  return `${SITE_BASE}${path.replace(/^\//, '')}`;
}

/** Look up a route by path, tolerating a missing trailing slash and the base. */
export function routeByPath(path: string): Route | undefined {
  const clean = (path.split('?')[0] ?? '').split('#')[0] ?? '';
  const withSlash = clean.endsWith('/') ? clean : `${clean}/`;
  const unprefixed =
    SITE_BASE !== '/' && withSlash.startsWith(SITE_BASE)
      ? `/${withSlash.slice(SITE_BASE.length)}`
      : withSlash;
  return ALL_ROUTES.find((r) => r.path === unprefixed);
}

/** Absolute URL for a route, for canonical tags and structured data. */
export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${withBase(path)}`;
}
