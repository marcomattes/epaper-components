// The FAQ.
//
// This page exists as much for answer engines as for readers. A question and
// its answer, marked up as `FAQPage` structured data and present as real text
// in the document, is the shape a generative engine quotes most reliably —
// it needs no summarising, and the question already matches how someone asks.
//
// Two rules for adding to it:
//
//   1. Answer in the first sentence. An engine that truncates should still
//      have the answer, not the preamble to it.
//   2. Say no when the answer is no. "Can I use this with React?" and "does
//      it work on a phone?" are useful precisely because the honest answer
//      has a caveat in it. An FAQ that only markets is one an engine learns
//      to distrust.
import type { Block } from './blocks';

export interface FaqItem {
  /** The question, phrased the way it is asked. */
  q: string;
  /** The answer as paragraphs. The first one must answer the question. */
  a: string[];
  /** Optional code or list to follow the prose. Not included in the schema text. */
  extra?: Block[];
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is EPaper?',
        a: [
          'EPaper is an open-source library of 81 web components built for e-paper and e-ink (also spelled "eink") displays. The components are vanilla custom elements — they extend `HTMLElement` directly, use no Shadow DOM, ship no animations and depend on no framework.',
          'It is published as `@marcomattes/epaper-components` under the MIT licence, and the full barrel is roughly 58 KB brotli.',
        ],
      },
      {
        q: 'Do I need a build step or a framework?',
        a: [
          'No. The elements register themselves on import and upgrade any matching tags already in the document, so a plain `<script type="module">` in an HTML file is enough.',
          'A bundler helps if you want to import individual components rather than the whole barrel, but nothing about the library requires one.',
        ],
        extra: [
          {
            kind: 'code',
            lang: 'html',
            code: `<link rel="stylesheet" href="…/styles/tokens.css">
<link rel="stylesheet" href="…/styles/base.css">
<link rel="stylesheet" href="…/styles/components.css">
<script type="module" src="…/index.js"></script>

<div class="ink-page">
  <e-title level="1">Hello, e-paper.</e-title>
  <e-button variant="primary">Get started</e-button>
</div>`,
          },
        ],
      },
      {
        q: 'Can I import a single component instead of all of them?',
        a: [
          'Yes. Every component has its own sub-path export, so `@marcomattes/epaper-components/button` registers `<e-button>` and nothing else.',
          'Styles are separate from the JavaScript: the three stylesheets are shipped whole, so a page importing one component still links the same CSS.',
        ],
        extra: [
          {
            kind: 'code',
            lang: 'js',
            code: `import '@marcomattes/epaper-components/button';
import '@marcomattes/epaper-components/input';
// Only <e-button> and <e-input> are defined.`,
          },
        ],
      },
      {
        q: 'Which browsers are supported?',
        a: [
          'Evergreen Chrome, Edge, Firefox and Safari. The two hard requirements are custom elements and `ElementInternals` with form association, which Safari was last to ship in 16.4.',
          'There is no polyfill path for older browsers, and none is planned — the form controls depend on `ElementInternals` behaviour that a polyfill cannot reproduce faithfully.',
        ],
      },
    ],
  },

  {
    title: 'E-paper and rendering',
    items: [
      {
        q: 'Do I need an e-paper display to use this?',
        a: [
          'No. The components are ordinary web components and render normally on any screen. The e-paper constraints — no animation, no hover, high contrast — produce a stark, print-like interface that works fine in a browser.',
          'People use it for kiosks, embedded panels, print-oriented layouts and low-distraction interfaces as well as for actual e-ink hardware.',
        ],
      },
      {
        q: 'Why are there no animations or transitions?',
        a: [
          'Because an e-paper controller redraws in discrete waveform cycles rather than frames. A 300 ms fade is not a smooth gradient on e-ink — it is a few dozen full-region refreshes queued faster than the panel can drain them, each one a visible flash.',
          '`base.css` resets `transition` and `animation` globally inside `.ink-page`, so the guarantee holds even for markup the library did not render.',
        ],
      },
      {
        q: 'Why are there no :hover styles?',
        a: [
          'E-paper devices are touch or button driven and have no pointer, so `:hover` never matches and anything hidden behind it is unreachable.',
          'The library uses `:focus-visible`, `[aria-selected]`, `[aria-checked]` and `[data-active]` instead. These work on touchscreens generally, not only on e-ink.',
        ],
      },
      {
        q: 'What is a "surgical DOM update" and why does it matter?',
        a: [
          'It means patching individual text nodes and attributes in place rather than reassigning `innerHTML`. It matters because an e-paper update costs the bounding box of everything that changed — so rebuilding a container to change one number produces a full-panel refresh instead of a small, fast one.',
          'Every EPaper component keeps references to the nodes it owns and updates them through helpers that compare before writing, so an update with no actual change performs no DOM write at all.',
        ],
      },
      {
        q: 'Does EPaper talk to the display controller directly?',
        a: [
          'No, and nothing in a browser can. There is no web API for selecting a waveform mode or triggering a partial refresh.',
          'What the library does is shape the DOM changes so the layers below it — the compositor, the framebuffer, the EPDC — infer a small damaged region and can choose a fast update mode on their own. It is an indirect lever, but it is the only one available from a page.',
        ],
      },
      {
        q: 'Will this work on a colour e-paper panel like Kaleido?',
        a: [
          'Yes. The library is monochrome by default but themed entirely through CSS custom properties, so a colour panel is a matter of setting different token values.',
          'The design advice is to keep colour redundant with something already stated in text — colour e-paper has a narrow gamut and lower contrast than monochrome, so a design that depends on hue tends to disappoint on the actual hardware.',
        ],
      },
      {
        q: 'How do I stop ghosting?',
        a: [
          'Ghosting is residual charge left by fast partial-update waveforms, and the only cure is a periodic clearing refresh. Force a full-page repaint on a schedule — hourly is usually invisible in practice — so the controller selects a clearing waveform and resets the residue.',
          'Reducing the number of partial updates helps more than anything else, which is the point of batching updates onto a single timer rather than painting per event.',
        ],
      },
    ],
  },

  {
    title: 'Frameworks and integration',
    items: [
      {
        q: 'Can I use EPaper with React?',
        a: [
          'Yes, and it got much easier with React 19, which added proper custom-element support — attributes, properties and custom events now work as expected.',
          'On React 18 and earlier you need `ref`-based event wiring for custom events, because React 18 does not attach listeners for events it does not know about. That is the one genuine friction point, and it is a React limitation rather than a library one.',
        ],
        extra: [
          {
            kind: 'code',
            lang: 'jsx',
            code: `// React 19: this just works.
<e-input label="Name" onE-change={(e) => setName(e.detail.value)} />

// React 18: wire the listener through a ref.
const ref = useRef(null);
useEffect(() => {
  const el = ref.current;
  const on = (e) => setName(e.detail.value);
  el.addEventListener('e-change', on);
  return () => el.removeEventListener('e-change', on);
}, []);
return <e-input ref={ref} label="Name" />;`,
          },
        ],
      },
      {
        q: 'Does it work with Vue, Svelte or Angular?',
        a: [
          'Yes, all three handle custom elements and their events natively. Vue needs `compilerOptions.isCustomElement` configured so it does not warn about unknown tags; Angular needs `CUSTOM_ELEMENTS_SCHEMA` on the module. Svelte needs no configuration at all.',
        ],
      },
      {
        q: 'Can I server-render pages that use EPaper?',
        a: [
          'Yes, with a caveat about which components. Because there is no Shadow DOM, markup is just markup — an SSR framework emits the tags and the elements upgrade on the client.',
          "The caveat is that components building their DOM from attributes in `connectedCallback` show nothing until the JavaScript runs. Where content must be readable without scripting, emit the library's markup and class names directly; this site does exactly that for its prose pages.",
        ],
      },
      {
        q: 'Is TypeScript supported?',
        a: [
          "Yes. The package ships type declarations plus a generated `HTMLElementTagNameMap` augmentation, so `document.querySelector('e-input')` is typed as `EInput` without a cast.",
        ],
      },
      {
        q: 'How do I theme or rebrand it?',
        a: [
          'Set CSS custom properties on `.ink-page` or any ancestor. Colours, border widths, spacing scale and type sizes are all tokens, so a panel vendor can restyle the entire library without touching JavaScript.',
          'The full registry of properties is documented in `THEMING.md` in the repository.',
        ],
        extra: [
          {
            kind: 'code',
            lang: 'css',
            code: `.ink-page {
  --ink-fg: #1a1a1a;
  --ink-bg: #f4f2ec;
  --ink-border-width: 3px;
  --ink-text-body: 18px;
}`,
          },
        ],
      },
    ],
  },

  {
    title: 'Forms and accessibility',
    items: [
      {
        q: 'Do the inputs work inside a normal <form>?',
        a: [
          'Yes. Every input is a form-associated custom element built on `ElementInternals`, so it appears in `FormData`, participates in constraint validation, responds to `form.reset()` and restores its value after a back-button navigation.',
          'No hidden `<input>` shims are involved — the controls are real form participants.',
        ],
      },
      {
        q: 'How do I read values out of a form?',
        a: [
          'With `FormData`, exactly as you would for native inputs. The `e-submit` event carries the underlying `HTMLFormElement` in its detail.',
        ],
        extra: [
          {
            kind: 'code',
            lang: 'js',
            code: `document.querySelector('e-form')
  .addEventListener('e-submit', (e) => {
    const data = new FormData(e.detail.form);
    console.log(Object.fromEntries(data));
  });`,
          },
        ],
      },
      {
        q: 'Is the library accessible?',
        a: [
          'That is the intent, and several of its constraints push in that direction: no colour-only status cues, no hover-only information, high contrast by default and visible focus rings everywhere.',
          'Components carry appropriate roles and ARIA state, and the absence of Shadow DOM means `aria-labelledby` and `for` references work normally rather than needing to cross a shadow boundary. It has not been through a formal third-party audit, so treat it as accessible by design rather than certified.',
        ],
      },
      {
        q: 'Does it work with screen readers?',
        a: [
          'Yes. Interactive components expose their state through ARIA attributes rather than through visual styling alone, and content is in the light DOM where assistive technology reads it without shadow-root traversal.',
        ],
      },
    ],
  },

  {
    title: 'The project',
    items: [
      {
        q: 'Is EPaper based on Lit?',
        a: [
          'No. The components extend `HTMLElement` directly and have zero runtime dependencies. Lit appears only as a development dependency, used for templating in Storybook stories.',
        ],
      },
      {
        q: 'How big is it?',
        a: [
          'About 58 KB brotli for the full barrel with all 81 components registered. Individual components are far smaller — the size budget enforced in CI is 6 KB for `<e-button>` and 8 KB for `<e-input>`, both brotli.',
        ],
      },
      {
        q: 'What licence is it under, and can I use it commercially?',
        a: [
          'MIT, so yes — commercial use, modification and redistribution are all permitted, and the only requirement is that the licence and copyright notice travel with copies of the source.',
        ],
      },
      {
        q: 'Is it production ready?',
        a: [
          'It is at version 1.x with a stable public API, a test suite running in real browsers, visual regression baselines and size budgets enforced in CI.',
          'It is also a young project with a single maintainer. That is a reasonable trade for many teams and the wrong one for others — the code is MIT licensed and the repository is public, so the due diligence is available to anyone who needs to do it.',
        ],
      },
      {
        q: 'How do I contribute or report a bug?',
        a: [
          'Issues and pull requests go to the GitHub repository. `CONTRIBUTING.md` covers the component-author contract — the cleanup rules, the escaping requirement and the JSDoc the documentation generator reads.',
        ],
      },
    ],
  },
];

/** Every question and answer, flattened — used by the structured data and llms.txt. */
export function faqItems(): FaqItem[] {
  return FAQ.flatMap((group) => group.items);
}

/**
 * Fragment id for a question or a group title, so an answer can be linked to
 * directly.
 *
 * Exported from here rather than from `content.ts` because the cover links
 * into this page by anchor and the markdown twin has to produce the same id.
 * One implementation, or the two drift and the deep links rot silently.
 */
export function faqId(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]{1,300}/g, '-')
    .replace(/^-{1,300}/, '')
    .replace(/-{1,300}$/, '')
    .slice(0, 60);
}

/**
 * The handful of questions the cover surfaces.
 *
 * Keyed by the exact question text so {@link homeQuestions} can fail the build
 * if one is reworded here and not there — a cover linking to `/faq/#…` that no
 * longer exists is a dead anchor no test would otherwise catch.
 *
 * The teaser is written for the cover, not copied from the answer. Reprinting
 * the FAQ's paragraphs would put the same text on two indexed URLs, which is
 * the thing this page is trying to stop doing.
 */
const HOME_QUESTIONS: Array<{ q: string; teaser: string }> = [
  {
    q: 'What is EPaper?',
    teaser:
      'An MIT-licensed set of 81 web components for e-paper and e-ink displays, published as `@marcomattes/epaper-components`.',
  },
  {
    q: 'Do I need an e-paper display to use this?',
    teaser:
      'No. The components render on any screen — the e-ink rules just produce a stark, print-like interface.',
  },
  {
    q: 'Do I need a build step or a framework?',
    teaser:
      'No. The elements register on import and upgrade tags already in the document, so one `<script type="module">` is enough.',
  },
  {
    q: 'How big is it?',
    teaser: 'About 58 KB brotli for all 81 components; a single component is far smaller.',
  },
];

export interface HomeQuestion {
  q: string;
  teaser: string;
  /** Fragment id of the full answer on `/faq/`. */
  anchor: string;
}

/** The cover's question list, with every anchor checked against the real FAQ. */
export function homeQuestions(): HomeQuestion[] {
  const known = new Set(faqItems().map((item) => item.q));
  return HOME_QUESTIONS.map((entry) => {
    if (!known.has(entry.q)) {
      throw new Error(`faq: cover question "${entry.q}" is not in FAQ`);
    }
    return { q: entry.q, teaser: entry.teaser, anchor: faqId(entry.q) };
  });
}
