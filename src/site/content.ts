// Build-time markup for every page of the site.
//
// This module is imported by vite.site.config.ts in Node, never by the
// browser bundle: each page ships with its content already in the HTML, so
// there is nothing left for the client to render.
//
// Why plain library markup instead of the custom elements: e-card, e-steps,
// e-timeline, e-description-list and e-statistic all take their headings from
// *attributes* and build the DOM in connectedCallback. A crawler that does
// not execute JavaScript — which is most of them, and nearly all of the AI
// ones — would see `<e-card title="Form-Associated">` and extract no heading
// at all. Emitting the same class names the component would produce keeps the
// rendering identical and puts every word in the document as real text. This
// mirrors what the cover has always done for <e-statistic>.
//
// The trade-off is that this markup has to track the components' class
// structure. Interactive components (tabs, form, table, calendar, segmented,
// input) are still authored as custom elements — there the behaviour is the
// point, and their text is slotted content that crawlers can read anyway.
import { esc } from '../core/dom';
import { iconSvg } from '../core/icons';
import {
  CALENDAR_EVENTS,
  COMPONENTS,
  CATEGORIES,
  FEATURES,
  IMPORT_SNIPPET,
  INSTALL_SNIPPETS,
  ROADMAP,
  ROADMAP_INTRO,
  TABLE_COLUMNS,
  TABLE_ROWS,
  USE_SNIPPET,
  type ComponentEntry,
} from './data';
import { PACKAGE_NAME, REPO_URL, ROUTES, withBase, type Route } from './routes';
import { shotAlt, shotKey, shotUrl, type ShotIndex } from './shots';

export interface ContentOptions {
  /** Deployed Storybook base URL — resolved by the build, not by data.ts. */
  storybookBase: string;
  /** Formatted GitHub star count for the cover stat. */
  stars: string;
  /** Package version for the colophon. */
  version: string;
  /** Component preview images, keyed by `category-name`. May be empty. */
  shots: ShotIndex;
}

/** Storybook docs deep-link. Mirrors Storybook's slug rule. */
function storybookHref(base: string, entry: ComponentEntry): string {
  const slug = `${entry.category}-${entry.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return `${base}/?path=/docs/${slug}--docs`;
}

/**
 * Page heading block. The visible heading is the document's only <h1>; the
 * brand in the header bar is not a heading (see index.html).
 */
function pageHead(route: Route): string {
  return `
      <header class="site-secthead">
        <h1 class="ink-title ink-title--2">${esc(route.heading)}</h1>
        <span class="site-secthead__num">PAGE ${esc(route.folio)}</span>
      </header>`;
}

/* --------------------------------------------------------------------- *
 * Page 1 — Cover
 * --------------------------------------------------------------------- */
function coverMain(opts: ContentOptions): string {
  return `
        <div class="site-cover">
          <div class="site-cover__hero">
            <div class="site-cover__tags">
              <span class="site-cover__tag">OSS</span>
              <span class="site-cover__tag">MIT</span>
              <span class="site-cover__tag">Vanilla CE</span>
            </div>
            <h1 class="site-cover__headline">Web components<br />for ink &amp; paper.</h1>
            <p class="site-cover__lede">
              EPaper is a vanilla custom-element library tuned for e-paper displays. Surgical DOM
              updates, no animations, no <code>:hover</code>, no Shadow DOM — just standards-based
              components your design system can ship on a Kaleido panel today.
            </p>
            <div class="site-cover__cta">
              <a class="ink-btn ink-btn--primary" href="${esc(withBase('/install/'))}">Get started</a>
              <a class="ink-btn ink-btn--secondary" href="${esc(REPO_URL)}" rel="noopener"
                >View on GitHub</a
              >
            </div>
          </div>

          <div></div>

          <!-- Both figures are resolved at build time: the component count
               from data.ts, the star count from the GitHub API (falling back
               to the committed number in scripts/github-stars.mjs). Neither
               is maintained by hand. -->
          <div class="site-cover__stats" role="group" aria-label="Library at a glance">
            <div>
              <div class="site-cover__stat-label">Components</div>
              <div class="site-cover__stat-value" data-site-stat="components">${esc(
                String(COMPONENTS.length),
              )}</div>
            </div>
            <div>
              <div class="site-cover__stat-label">Bundle (gz)</div>
              <div class="site-cover__stat-value">40 KB</div>
            </div>
            <div>
              <div class="site-cover__stat-label">GitHub stars</div>
              <div class="site-cover__stat-value" data-site-stat="stars">${esc(opts.stars)}</div>
            </div>
          </div>
        </div>`;
}

/* --------------------------------------------------------------------- *
 * Page 2 — Features
 * --------------------------------------------------------------------- */
function featuresMain(route: Route): string {
  const cards = FEATURES.map(
    (f) => `
          <article class="ink-card">
            <header class="ink-card__header">
              <div><h2 class="ink-card__title">${esc(f.title)}</h2></div>
            </header>
            <div class="ink-card__body">
              <div class="site-feature">
                <span class="site-feature__icon">${iconSvg(f.icon, 28, f.title)}</span>
                <p class="ink-text">${esc(f.body)}</p>
              </div>
            </div>
          </article>`,
  ).join('');

  return `${pageHead(route)}
        <div class="site-feature-grid">${cards}
        </div>`;
}

/* --------------------------------------------------------------------- *
 * Page 3 — Components overview
 * --------------------------------------------------------------------- */

/**
 * Preview image for one tile.
 *
 * A real `<img>` rather than a CSS background: the picture is the tile's
 * content, so it needs alt text, and a background image is invisible to both
 * screen readers and image search.
 *
 * `width`/`height` carry the PNG's intrinsic size so the aspect ratio is known
 * before the bytes arrive; the CSS then fits the image inside a fixed-height
 * frame, which is what actually pins the grid against layout shift.
 *
 * Four components have no baseline yet (Layout, Affix, Anchor, BackTop — none
 * has a story the screenshot suite renders). They get a decorative placeholder
 * so the grid keeps its rhythm; the tile's name and tag are already text, so
 * nothing is lost by hiding it from assistive tech.
 */
function tileShot(entry: ComponentEntry, shots: ShotIndex): string {
  const shot = shots[shotKey(entry)];
  if (!shot) {
    return `<span class="site-comp__shot site-comp__shot--none" aria-hidden="true"></span>`;
  }
  return `<span class="site-comp__shot"
              ><img src="${esc(shotUrl(shot))}" alt="${esc(shotAlt(entry))}"
                    width="${shot.width}" height="${shot.height}"
                    loading="lazy" decoding="async"
              /></span>`;
}

function componentsMain(route: Route, opts: ContentOptions): string {
  const tiles = COMPONENTS.map(
    (c) => `
          <a class="site-comp__tile" href="${esc(storybookHref(opts.storybookBase, c))}"
             target="_blank" rel="noopener"
             data-name="${esc(c.name.toLowerCase())}"
             data-tag="${esc(c.tag)}" data-cat="${esc(c.category)}">
            ${tileShot(c, opts.shots)}
            <span class="site-comp__tile-name">${esc(c.name)}</span>
            <span class="site-comp__tile-tag">&lt;${esc(c.tag)}&gt;</span>
          </a>`,
  ).join('');

  const segments = CATEGORIES.map(
    (c) => `<e-segment value="${esc(c.value)}" label="${esc(c.label)}"></e-segment>`,
  ).join('');

  return `${pageHead(route)}
        <p class="site-lede">
          Every component is a standalone custom element. Import the barrel to register all
          ${esc(String(COMPONENTS.length))}, or import a single module — <code>${esc(
            PACKAGE_NAME,
          )}/button</code> — and ship only that. Each tile previews the component as it renders on
          an e-paper page and links to its Storybook documentation.
        </p>

        <!-- Search and category filter are progressive enhancement: the full
             list below is in the document whether or not the script runs. -->
        <div class="site-comp__filter">
          <e-input id="comp-search" label="Search" placeholder="e.g. button, table, calendar"></e-input>
          <e-segmented id="comp-cat" value="all">${segments}</e-segmented>
        </div>

        <div class="site-comp__count" id="comp-count">${esc(
          String(COMPONENTS.length),
        )} components</div>

        <div class="site-comp__grid" id="comp-grid">${tiles}
        </div>`;
}

/* --------------------------------------------------------------------- *
 * Page 4 — Live showcase
 * --------------------------------------------------------------------- */
function showcaseMain(route: Route): string {
  const tableCols = esc(JSON.stringify(TABLE_COLUMNS));
  const tableRows = esc(JSON.stringify(TABLE_ROWS));
  const calendarEvents = esc(JSON.stringify(CALENDAR_EVENTS));

  return `${pageHead(route)}
        <p class="site-lede">
          The three panels below are the shipped components, not screenshots. The form is
          form-associated — every control reports its value through <code>FormData</code> and
          validates through <code>ElementInternals</code>. The table sorts and selects, and the
          calendar renders a month with events.
        </p>

        <e-tabs default-value="form" id="showcase-tabs">
          <e-tab key="form" label="Form">
            <e-form id="showcase-form">
              <e-form-item label="Name" required>
                <e-input name="name" placeholder="Ada Lovelace"></e-input>
              </e-form-item>
              <e-form-item label="Role">
                <e-select name="role" placeholder="Pick one">
                  <e-option value="editor" label="Editor"></e-option>
                  <e-option value="reviewer" label="Reviewer"></e-option>
                  <e-option value="admin" label="Admin"></e-option>
                </e-select>
              </e-form-item>
              <e-form-item label="Start date">
                <e-date-picker name="start" value="2026-05-04"></e-date-picker>
              </e-form-item>
              <e-form-item label="Notification channels">
                <e-checkbox-group name="channels" value="email" layout="horizontal">
                  <e-cbox-option value="email" label="Email"></e-cbox-option>
                  <e-cbox-option value="rss" label="RSS"></e-cbox-option>
                  <e-cbox-option value="webhook" label="Webhook"></e-cbox-option>
                </e-checkbox-group>
              </e-form-item>
              <e-button variant="primary" type="submit">Submit</e-button>
            </e-form>
            <div id="showcase-form-result"></div>
          </e-tab>

          <e-tab key="table" label="Table">
            <e-table columns="${tableCols}" data="${tableRows}" selectable></e-table>
          </e-tab>

          <e-tab key="calendar" label="Calendar">
            <e-calendar value="2026-04-30" events="${calendarEvents}"></e-calendar>
          </e-tab>
        </e-tabs>`;
}

/* --------------------------------------------------------------------- *
 * Page 5 — Install & quickstart
 * --------------------------------------------------------------------- */
const INSTALL_STEPS: Array<{ title: string; desc: string }> = [
  { title: 'Install', desc: 'Add the npm package' },
  { title: 'Import', desc: 'Side-effect import in your entry' },
  { title: 'Use', desc: 'Drop tags into your HTML' },
];

function installMain(route: Route): string {
  // Mirrors ESteps._build() with current=1: step 0 done, step 1 active.
  const steps = INSTALL_STEPS.map((s, i) => {
    const done = i < 1;
    const active = i === 1;
    const bubble = done ? iconSvg('check', 14) : String(i + 1);
    return `
          <li class="ink-steps__item" data-done="${done}" data-active="${active}">
            <div class="ink-steps__bubble" aria-hidden="true">${bubble}</div>
            <div style="flex: 1">
              <div class="ink-steps__title">${esc(s.title)}</div>
              <div class="ink-steps__desc">${esc(s.desc)}</div>
            </div>
          </li>`;
  }).join('');

  return `${pageHead(route)}
        <ol class="ink-steps ink-steps--horizontal"
            style="grid-template-columns: repeat(${INSTALL_STEPS.length}, 1fr)">${steps}
        </ol>

        <e-tabs default-value="npm">
          <e-tab key="npm" label="npm">
            <pre class="site-code">${esc(INSTALL_SNIPPETS.npm)}</pre>
          </e-tab>
          <e-tab key="pnpm" label="pnpm">
            <pre class="site-code">${esc(INSTALL_SNIPPETS.pnpm)}</pre>
          </e-tab>
          <e-tab key="yarn" label="yarn">
            <pre class="site-code">${esc(INSTALL_SNIPPETS.yarn)}</pre>
          </e-tab>
        </e-tabs>

        <h2 class="ink-title ink-title--4">Import the styles</h2>
        <pre class="site-code">${esc(IMPORT_SNIPPET)}</pre>

        <h2 class="ink-title ink-title--4">Use it</h2>
        <pre class="site-code">${esc(USE_SNIPPET)}</pre>

        <p class="site-lede">
          Nothing else is required: no build plugin, no framework adapter and no polyfill for
          evergreen browsers. The elements register themselves on import and upgrade any matching
          tags already in the document.
        </p>

        <nav class="site-linkrow" aria-label="Further reading">
          <a class="ink-link" href="${esc(REPO_URL)}#readme" rel="noopener">README</a>
          <a class="ink-link" href="${esc(withBase('/components/'))}">Component list</a>
          <a class="ink-link" href="${esc(
            REPO_URL,
          )}/blob/main/CONTRIBUTING.md" rel="noopener">Contributing</a>
        </nav>`;
}

/* --------------------------------------------------------------------- *
 * Page 6 — Community & colophon
 * --------------------------------------------------------------------- */
function communityMain(route: Route, opts: ContentOptions): string {
  const pairs: Array<[string, string]> = [
    ['License', 'MIT'],
    [
      'Repository',
      `<a class="ink-link" href="${esc(REPO_URL)}" rel="noopener">${esc(
        REPO_URL.replace('https://', ''),
      )}</a>`,
    ],
    ['Package', `<code>${esc(PACKAGE_NAME)}</code>`],
    [
      'Maintainer',
      `Marco Mattes — <a class="ink-link" href="https://mattes.dev" rel="me author">mattes.dev</a>`,
    ],
    ['Version', `V${esc(opts.version)}`],
    ['Components', esc(String(COMPONENTS.length))],
  ];

  const dl = pairs
    .map(
      ([term, detail]) => `
            <div class="ink-desc-list__pair">
              <dt class="ink-desc-list__term">${esc(term)}</dt>
              <dd class="ink-desc-list__detail">${detail}</dd>
            </div>`,
    )
    .join('');

  const timeline = ROADMAP.map(
    (r) => `
            <li class="ink-timeline__item" data-variant="default">
              <div class="ink-timeline__time">${esc(r.time)}</div>
              <div class="ink-timeline__rail" aria-hidden="true">
                <span class="ink-timeline__marker"></span>
              </div>
              <div class="ink-timeline__content">
                <div class="ink-timeline__title">${esc(r.title)}</div>
                <div class="ink-timeline__body">${esc(r.body)}</div>
              </div>
            </li>`,
  ).join('');

  return `${pageHead(route)}
        <dl class="ink-desc-list ink-desc-list--horizontal ink-desc-list--bordered"
            style="grid-template-columns: repeat(2, minmax(0, 1fr))">${dl}
        </dl>

        <h2 class="ink-title ink-title--3">Roadmap</h2>
        <p class="site-lede">${esc(ROADMAP_INTRO)}</p>
        <ol class="ink-timeline ink-timeline--time-left">${timeline}
        </ol>

        <footer class="site-foot">
          <span>© 2026 EPaper · MIT · by
            <a class="ink-link" href="https://mattes.dev" rel="me author">Marco Mattes</a></span>
          <div class="site-foot__links">
            <a class="ink-link" href="https://mattes.dev">mattes.dev</a>
            <a class="ink-link" href="${esc(REPO_URL)}" rel="noopener">GitHub</a>
            <a class="ink-link" href="${esc(REPO_URL)}/issues" rel="noopener">Issues</a>
            <a class="ink-link" href="${esc(REPO_URL)}/discussions" rel="noopener">Discussions</a>
          </div>
        </footer>`;
}

/* --------------------------------------------------------------------- *
 * Chrome that differs per route
 * --------------------------------------------------------------------- */

/** Header navigation, with the current page marked. */
export function navHtml(route: Route, storybookBase: string): string {
  const links = ROUTES.map((r, i) => {
    const current = r.path === route.path ? ' aria-current="page"' : '';
    // The End key needs to know where the sequence stops.
    const last = i === ROUTES.length - 1 ? ' data-last' : '';
    return `
          <a href="${esc(withBase(r.path))}"${current}${last}>${esc(r.nav)}</a>`;
  }).join('');

  return `
        <nav id="site-nav" aria-label="Pages">${links}
          <!-- Storybook lives outside this site. -->
          <a class="site-nav__ext" id="nav-storybook" href="${esc(
            storybookBase,
          )}" data-storybook-link>Storybook ↗</a>
        </nav>`;
}

/** Footer previous/next links — the crawlable path through the six pages. */
export function pagenavHtml(route: Route): string {
  const i = ROUTES.findIndex((r) => r.path === route.path);
  const prev = i > 0 ? ROUTES[i - 1] : undefined;
  const next = i >= 0 && i < ROUTES.length - 1 ? ROUTES[i + 1] : undefined;
  const total = String(ROUTES.length).padStart(2, '0');

  return `
          <nav class="site-pagenav" aria-label="Page">
            ${
              prev
                ? `<a class="site-pagenav__prev" rel="prev" href="${esc(withBase(prev.path))}">← ${esc(
                    prev.nav,
                  )}</a>`
                : ''
            }
            <span class="site-pagenav__folio">${esc(route.folio)} / ${total}</span>
            ${
              next
                ? `<a class="site-pagenav__next" rel="next" href="${esc(withBase(next.path))}">${esc(
                    next.nav,
                  )} →</a>`
                : ''
            }
          </nav>`;
}

/* --------------------------------------------------------------------- *
 * Entry point
 * --------------------------------------------------------------------- */

/** Inner markup of <main> for one route, section wrapper included. */
export function mainHtml(route: Route, opts: ContentOptions): string {
  let body: string;
  switch (route.dir) {
    case '':
      body = coverMain(opts);
      break;
    case 'features':
      body = featuresMain(route);
      break;
    case 'components':
      body = componentsMain(route, opts);
      break;
    case 'showcase':
      body = showcaseMain(route);
      break;
    case 'install':
      body = installMain(route);
      break;
    case 'community':
      body = communityMain(route, opts);
      break;
    default:
      body = pageHead(route);
  }
  return `
      <section class="site-section" aria-label="${esc(route.nav)}">${body}
      </section>`;
}
