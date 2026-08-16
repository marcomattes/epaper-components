// EPaper marketing site — entry script.
// Registers every custom element via the library barrel, then wires the six
// pages and the persistent chrome (header anchor list, bottom pagination,
// floating "back to cover" button).
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import './site.css';
// Cover-only components (synchronous, ~7 of 43). The remainder is loaded
// after first paint via a dynamic import in boot() to slash Total Blocking
// Time. Anything pre-rendered into the cover or used by site chrome must
// be in this list.
import '../components/flex';
import '../components/tag';
import '../components/button';
import '../components/statistic';
import '../components/title';
import '../components/text';
import '../components/icon';
// Imported as a value, not just for its side effect: `wireChrome()` needs the
// class at runtime for the `instanceof` guard below, which also stops the
// bundler from eliding the module and leaving <e-site-pager> unregistered.
import { ESitePager } from './pager';
import { esc } from '../core/dom';
import {
  CALENDAR_EVENTS,
  CATEGORIES,
  COMPONENTS,
  FEATURES,
  IMPORT_SNIPPET,
  INSTALL_SNIPPETS,
  ROADMAP,
  STORYBOOK_BASE,
  storybookUrl,
  TABLE_COLUMNS,
  TABLE_ROWS,
  USE_SNIPPET,
  type ComponentCategory,
} from './data';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null =>
  document.querySelector(sel);

const sectionHeader = (num: string, kicker: string): string => `
  <header class="site-secthead">
    <e-title level="2">${esc(kicker)}</e-title>
    <span class="site-secthead__num">PAGE ${esc(num)}</span>
  </header>`;

/* --------------------------------------------------------------------- *
 * Page 1 — Cover
 * --------------------------------------------------------------------- */
function renderCover(host: HTMLElement): void {
  const totalComponents = COMPONENTS.length;
  host.innerHTML = `
    <div class="site-cover">
      <div class="site-cover__hero">
        <e-flex gap="8" align="center">
          <e-tag>OSS</e-tag>
          <e-tag>MIT</e-tag>
          <e-tag>Vanilla CE</e-tag>
        </e-flex>
        <h1>Web components<br/>for ink &amp; paper.</h1>
        <p class="site-cover__lede">
          EPaper is a vanilla custom-element library tuned for e-paper
          displays. Surgical DOM updates, no animations, no <code>:hover</code>,
          no Shadow DOM — just standards-based components your design system
          can ship on a Kaleido panel today.
        </p>
        <div class="site-cover__cta">
          <e-button variant="primary" id="cta-start">Get started</e-button>
          <e-button variant="secondary" id="cta-github">View on GitHub</e-button>
        </div>
      </div>

      <div></div>

      <div class="site-cover__stats" role="group" aria-label="Library at a glance">
        <e-statistic label="Components" value="${totalComponents}"></e-statistic>
        <e-statistic label="Bundle (gz)" value="40" suffix=" KB"></e-statistic>
        <e-statistic label="GitHub stars" value="${esc(__GITHUB_STARS__)}"></e-statistic>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------- *
 * Page 2 — Features
 * --------------------------------------------------------------------- */
function renderFeatures(host: HTMLElement): void {
  host.innerHTML = `
    ${sectionHeader('02', 'Built for ink, not pixels.')}
    <!-- Raw track list rather than cols="3": e-grid passes a non-numeric
         value straight to grid-template-columns, which is the only way to
         get a column count that adapts without a media query. The 300px
         floor is what keeps the widest layout at three columns (the page
         maxes out at 1180px) while dropping to two and then one. -->
    <e-grid cols="repeat(auto-fit, minmax(min(100%, 300px), 1fr))" gap="16" id="feature-grid">
      ${FEATURES.map(
        (f) => `
        <e-card title="${esc(f.title)}">
          <e-flex direction="column" gap="12">
            <e-icon name="${esc(f.icon)}" size="28" label="${esc(f.title)}"></e-icon>
            <e-text kind="body" as="p">${esc(f.body)}</e-text>
          </e-flex>
        </e-card>`,
      ).join('')}
    </e-grid>`;
}

/* --------------------------------------------------------------------- *
 * Page 3 — Components overview
 * --------------------------------------------------------------------- */
function renderComponents(host: HTMLElement): void {
  host.innerHTML = `
    ${sectionHeader('03', 'Every component, one tile each.')}

    <div class="site-comp__filter">
      <e-input id="comp-search" label="Search" placeholder="e.g. button, table, calendar"></e-input>
      <e-segmented id="comp-cat" value="all">
        ${CATEGORIES.map(
          (c) => `<e-segment value="${esc(c.value)}" label="${esc(c.label)}"></e-segment>`,
        ).join('')}
      </e-segmented>
    </div>

    <div class="site-comp__count" id="comp-count">${COMPONENTS.length} components</div>

    <div class="site-comp__grid" id="comp-grid">
      ${COMPONENTS.map(
        (c) => `
        <a class="site-comp__tile" href="${esc(storybookUrl(c))}"
           target="_blank" rel="noopener"
           data-name="${esc(c.name.toLowerCase())}"
           data-tag="${esc(c.tag)}" data-cat="${esc(c.category)}">
          <span class="site-comp__tile-name">${esc(c.name)}</span>
          <span class="site-comp__tile-tag">&lt;${esc(c.tag)}&gt;</span>
        </a>`,
      ).join('')}
    </div>`;

  const grid = host.querySelector<HTMLElement>('#comp-grid');
  const countEl = host.querySelector<HTMLElement>('#comp-count');
  const search = host.querySelector<HTMLElement>('#comp-search');
  const seg = host.querySelector<HTMLElement>('#comp-cat');

  let cat: ComponentCategory | 'all' = 'all';
  let q = '';

  const apply = (): void => {
    if (!grid) return;
    let visible = 0;
    for (const tile of grid.querySelectorAll<HTMLElement>('.site-comp__tile')) {
      const name = tile.dataset['name'] ?? '';
      const tag = tile.dataset['tag'] ?? '';
      const tcat = tile.dataset['cat'] ?? '';
      const matchCat = cat === 'all' || tcat === cat;
      const matchQ = q === '' || name.includes(q) || tag.includes(q);
      const ok = matchCat && matchQ;
      if (ok) {
        tile.removeAttribute('hidden');
        visible++;
      } else {
        tile.setAttribute('hidden', '');
      }
    }
    if (countEl) countEl.textContent = `${visible} components`;
  };

  search?.addEventListener('e-input', (e) => {
    q = ((e as CustomEvent<{ value: string }>).detail.value || '').trim().toLowerCase();
    apply();
  });
  seg?.addEventListener('e-change', (e) => {
    cat = (e as CustomEvent<{ value: ComponentCategory | 'all' }>).detail.value;
    apply();
  });
}

/* --------------------------------------------------------------------- *
 * Page 4 — Live showcase
 * --------------------------------------------------------------------- */
function renderShowcase(host: HTMLElement): void {
  const tableCols = esc(JSON.stringify(TABLE_COLUMNS));
  const tableRows = esc(JSON.stringify(TABLE_ROWS));
  const calendarEvents = esc(JSON.stringify(CALENDAR_EVENTS));
  host.innerHTML = `
    ${sectionHeader('04', 'Live showcase.')}

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

  // The form is re-mounted every time the user switches tabs (e-tabs replaces
  // its panel innerHTML on activate). We use event delegation on the tabs
  // container so the handler survives tab switches without re-binding.
  const tabs = host.querySelector('#showcase-tabs');
  const result = host.querySelector<HTMLElement>('#showcase-form-result');
  tabs?.addEventListener('e-submit', (e) => {
    const detail = (e as CustomEvent<{ form: HTMLFormElement }>).detail;
    const form = detail.form;
    if (!result) return;
    const fd = new FormData(form);
    const name = String(fd.get('name') || '(unnamed)');
    result.innerHTML = `<e-result status="success"
        title="Thanks, ${esc(name)}"
        description="Your form was captured locally."></e-result>`;
  });
}

/* --------------------------------------------------------------------- *
 * Page 5 — Install & quickstart
 * --------------------------------------------------------------------- */
function renderInstall(host: HTMLElement): void {
  host.innerHTML = `
    ${sectionHeader('05', 'Install in 30 seconds.')}

    <e-steps current="1">
      <e-step title="Install" description="Add the npm package"></e-step>
      <e-step title="Import" description="Side-effect import in your entry"></e-step>
      <e-step title="Use" description="Drop tags into your HTML"></e-step>
    </e-steps>

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

    <e-title level="4">Import the styles</e-title>
    <pre class="site-code">${esc(IMPORT_SNIPPET)}</pre>

    <e-title level="4">Use it</e-title>
    <pre class="site-code">${esc(USE_SNIPPET)}</pre>

    <e-flex gap="16">
      <e-link href="https://github.com/marcomattes/epaper-components">README</e-link>
      <e-link href="${esc(STORYBOOK_BASE)}">Storybook</e-link>
      <e-link href="https://github.com/marcomattes/epaper-components/blob/main/CONTRIBUTING.md">Contributing</e-link>
    </e-flex>`;
}

/* --------------------------------------------------------------------- *
 * Page 6 — Community & colophon
 * --------------------------------------------------------------------- */
function renderCommunity(host: HTMLElement): void {
  host.innerHTML = `
    ${sectionHeader('06', 'Community & colophon.')}

    <e-description-list columns="2" bordered>
      <e-desc-item term="License">MIT</e-desc-item>
      <e-desc-item term="Repository">github.com/marcomattes/epaper-components</e-desc-item>
      <e-desc-item term="Maintainer"
        >Marco Mattes — <e-link href="https://mattes.dev">mattes.dev</e-link></e-desc-item
      >
      <e-desc-item term="Version">V${esc(__SITE_VERSION__)}</e-desc-item>
    </e-description-list>

    <e-title level="3">Roadmap</e-title>
    <e-timeline time-position="left">
      ${ROADMAP.map(
        (r) => `
        <e-timeline-item time="${esc(r.time)}" title="${esc(r.title)}">${esc(r.body)}</e-timeline-item>`,
      ).join('')}
    </e-timeline>

    <footer class="site-foot">
      <span>© 2026 EPaper · MIT · by
        <e-link href="https://mattes.dev">Marco Mattes</e-link></span>
      <div class="site-foot__links">
        <e-link href="https://mattes.dev">mattes.dev</e-link>
        <e-link href="https://github.com/marcomattes/epaper-components">GitHub</e-link>
        <e-link href="https://github.com/marcomattes/epaper-components/issues">Issues</e-link>
        <e-link href="https://github.com/marcomattes/epaper-components/discussions">Discussions</e-link>
      </div>
    </footer>`;
}

/* --------------------------------------------------------------------- *
 * Site chrome wiring (header anchor list, footer pagination, fab, pager)
 * --------------------------------------------------------------------- */
/**
 * Publishes the measured height of the sticky header and the fixed footbar as
 * `--site-header-h` / `--site-footbar-h` on <html>.
 *
 * Both bars are out of flow, and the header in particular changes height when
 * the nav wraps onto its own row below 900px. The CSS defaults are close
 * enough for first paint; these keep the section min-height, the bottom
 * padding and the scroll offset exact at every width.
 */
function trackChromeHeights(): void {
  const header = $('#site-header');
  const footbar = $('#site-footbar');
  const root = document.documentElement;

  const sync = (): void => {
    if (header) root.style.setProperty('--site-header-h', `${Math.round(header.offsetHeight)}px`);
    if (footbar) {
      root.style.setProperty('--site-footbar-h', `${Math.round(footbar.offsetHeight)}px`);
    }
  };
  sync();

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(sync);
    if (header) ro.observe(header);
    if (footbar) ro.observe(footbar);
  } else {
    window.addEventListener('resize', sync);
  }
}

function wireChrome(): void {
  const pager = $<ESitePager>('#site-pager');
  const nav = $('#site-nav');
  trackChromeHeights();
  if (!(pager instanceof ESitePager)) return;

  // The header Storybook link is static markup (it has to survive first
  // paint), so its href points at the dev server until the build-time base
  // is known here.
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-storybook-link]')) {
    a.href = STORYBOOK_BASE;
  }

  // Pager → nav
  pager.addEventListener('e-page', (e) => {
    const page = (e as CustomEvent<{ value: number }>).detail.value;
    if (nav) {
      for (const a of nav.querySelectorAll<HTMLAnchorElement>('a[data-page]')) {
        const on = Number(a.dataset['page']) === page;
        if (on) {
          a.setAttribute('aria-current', 'true');
          // Below 900px the nav is a horizontal scroll strip, so the current
          // page can sit outside it. 'nearest' is a no-op when it doesn't.
          a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } else {
          a.removeAttribute('aria-current');
        }
      }
    }
  });

  // Header nav clicks → pager (don't rely on default hash jump because it
  // would race with the IntersectionObserver suppression window).
  nav?.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-page]');
    if (!a) return;
    e.preventDefault();
    const page = Number(a.dataset['page']);
    pager.goto(page);
  });

  // Cover CTAs — pre-rendered as native <button>, then upgraded to
  // <e-button> by hydration. Listening for plain 'click' on the parent
  // catches both states without re-binding after hydration.
  const ctaStart = document.getElementById('cta-start');
  const ctaGithub = document.getElementById('cta-github');
  ctaStart?.addEventListener('click', () => {
    pager.goto(5);
  });
  ctaGithub?.addEventListener('click', () => {
    window.open('https://github.com/marcomattes/epaper-components', '_blank', 'noopener');
  });
}

/* --------------------------------------------------------------------- *
 * Boot
 * --------------------------------------------------------------------- */
function boot(): void {
  // Render the cover synchronously so the LCP element is in the DOM ASAP.
  // Defer pages 2-6 to an idle callback so they don't block the main
  // thread before First Contentful Paint, slashing Total Blocking Time.
  const cover = $('#page-1');
  if (cover && !cover.hasAttribute('data-prerendered')) renderCover(cover);
  wireChrome();

  const renderRest = (): void => {
    // Dynamic import of the barrel registers the remaining ~36 components.
    // Vite emits this as a separate chunk that browsers fetch lazily and
    // parse off the critical path.
    void import('../index').then(() => {
      const deferred: Array<[string, (h: HTMLElement) => void]> = [
        ['#page-2', renderFeatures],
        ['#page-3', renderComponents],
        ['#page-4', renderShowcase],
        ['#page-5', renderInstall],
        ['#page-6', renderCommunity],
      ];
      for (const [sel, fn] of deferred) {
        const el = $(sel);
        if (!el) continue;
        if (el.hasAttribute('data-prerendered')) continue;
        fn(el);
      }
    });
  };
  // requestIdleCallback isn't in lib.dom.d.ts everywhere; fall back to rAF.
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(renderRest, { timeout: 1500 });
  } else {
    requestAnimationFrame(() => setTimeout(renderRest, 0));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
