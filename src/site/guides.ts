// The long-form guides.
//
// These pages exist for reach. The six core pages answer "what is EPaper?",
// which only helps someone who already knows the name; the guides answer the
// questions people actually search for — how partial refresh works, whether
// to use Shadow DOM, how ElementInternals behaves — and reach the reader who
// has never heard of the library. EPaper appears in them as the worked
// example, not as the subject.
//
// That framing is also what makes them quotable. An answer engine will lift a
// passage that explains a mechanism; it will not lift a feature list. So each
// guide leads with the mechanism, states numbers as the orders of magnitude
// they really are, and says plainly where the library is the wrong choice.
import type { Article } from './articles';

/* --------------------------------------------------------------------- *
 * Guide 1 — partial refresh
 * --------------------------------------------------------------------- */
const PARTIAL_REFRESH: Article = {
  slug: 'partial-refresh',
  kind: 'guide',
  nav: 'Partial refresh',
  title: 'How E-Paper Partial Refresh Works — Waveforms, Ghosting and the Damaged Rectangle',
  heading: 'How partial refresh works',
  description:
    'An electrophoretic display redraws in discrete waveform modes, not in frames. This guide explains GC16, GL16, DU and A2, why ghosting happens, how the damaged rectangle is computed, and what all of that means for the DOM you write.',
  lede: 'An e-paper panel does not have a frame rate. It has waveform modes, each a different trade between speed, grey depth and how much of the last image it leaves behind. Understanding that trade is most of what separates a UI that feels instant on e-ink from one that flashes like a broken fluorescent tube.',
  published: '2026-06-24',
  updated: '2026-08-12',
  topics: ['e-paper', 'e-ink', 'partial refresh', 'waveform', 'ghosting', 'EPDC'],
  blocks: [
    {
      kind: 'p',
      text: 'On an LCD or OLED, pixels hold their state because the panel is continuously driven. Stop refreshing and the image is gone. An electrophoretic display works the other way round: the image is **bistable**, it persists with no power at all, and changing it costs energy and time. Every design consequence in this guide follows from that inversion.',
    },

    { kind: 'h2', text: 'What is physically happening' },
    {
      kind: 'p',
      text: 'The imaging layer is a sheet of microcapsules, each holding charged pigment particles suspended in a clear fluid — classically white titanium-dioxide particles with a negative charge and black particles with a positive one. A voltage applied across the capsule pulls one species to the surface and the other out of sight. Remove the voltage and the particles stay where the viscosity left them. That is the bistability.',
    },
    {
      kind: 'p',
      text: 'Moving those particles is slow in a way that has nothing to do with electronics. The switching time is dominated by the physical migration of pigment through fluid, which is why a full e-paper update takes hundreds of milliseconds while the controller driving it is idling. You cannot optimise your way past it; you can only avoid asking for it.',
    },
    {
      kind: 'p',
      text: 'Worse, a single voltage pulse does not reliably land a particle in a precise intermediate position. To render grey levels the controller applies a **waveform**: a timed sequence of positive, negative and zero voltage frames, calibrated per panel batch and per temperature, that walks the particles to a target optical state. The waveform table is why panels ship with a factory `.wbf` file and why the same code looks different at 5 °C than at 25 °C.',
    },

    { kind: 'h2', text: 'The waveform modes you actually choose between' },
    {
      kind: 'p',
      text: 'A controller — the EPDC on an i.MX SoC, or the vendor firmware on a small SPI panel — exposes a handful of named modes. The names below are the E Ink conventions and are near-universal, though timings vary by panel generation, size and temperature. Treat these as orders of magnitude, not datasheet values.',
    },
    {
      kind: 'table',
      head: ['Mode', 'Greys', 'Typical time', 'Flash', 'Leaves ghosting'],
      rows: [
        ['`INIT`', '—', '~2000 ms', 'Yes, repeatedly', 'No — this is the reset'],
        ['`GC16`', '16', '~450–750 ms', 'Yes, full inversion', 'No'],
        ['`GL16`', '16', '~450–750 ms', 'Minimal', 'Slight'],
        ['`DU`', '2', '~250 ms', 'No', 'Yes'],
        ['`A2`', '2', '~120 ms', 'No', 'Yes, accumulating'],
      ],
    },
    {
      kind: 'ul',
      items: [
        '**`INIT`** clears the panel to a known state. It is the flash you see when an e-reader boots. Nothing in an application should trigger it.',
        '**`GC16`** — *grayscale clearing, 16 levels* — is the quality mode. It drives every pixel in the update region to black and to white before settling on the target, which is why it visibly inverts. That round trip is also what erases residual charge, so `GC16` is the mode that clears ghosting.',
        '**`GL16`** reaches the same 16 levels without the full clearing cycle. It is the mode for a page of text on a white background: no flash, nearly the same quality, at the cost of letting a little residue accumulate.',
        '**`DU`** — *direct update* — is 1-bit. Pixels move to black or white and grey pixels are left alone. It is fast and completely flash-free, which makes it the right mode for a changing number, a checkbox, a cursor.',
        '**`A2`** is `DU` pushed further, fast enough for crude animation and menu scrolling. Every `A2` update leaves visible residue, so implementations track a counter and force a `GC16` after some number of them.',
      ],
    },
    {
      kind: 'note',
      label: 'Ghosting',
      text: 'Ghosting is not a rendering bug — it is unresolved charge and pigment that a fast waveform did not have the time to settle. The only cure is a clearing waveform. This is why every well-behaved e-paper application has a policy like "full refresh every N partial updates", and why an interface that changes a small region rarely is *structurally* better on e-ink than one that changes a large region often.',
    },

    { kind: 'h2', text: 'The damaged rectangle' },
    {
      kind: 'p',
      text: "A partial update is not free-form. The controller updates a **rectangle**, and everything inside that rectangle is driven with the chosen waveform whether or not it changed. The update pipeline is roughly: something marks a region dirty, the region is expanded to the controller's alignment constraints, a waveform mode is selected for it, and the panel is driven.",
    },
    {
      kind: 'p',
      text: 'The consequence is the single most important fact for anyone writing UI on e-paper: **the cost of an update is the bounding box of what changed, not the amount that changed.** Updating one character in a header and one digit in a footer produces a rectangle covering the entire page. Two separate small updates would have been dramatically cheaper than one union.',
    },
    {
      kind: 'p',
      text: 'It also explains why grey content is expensive to touch. If any pixel in the dirty region needs a grey level, the whole rectangle needs a 16-level waveform — the fast 1-bit mode is no longer available for it. A UI built out of pure black and white can stay in `DU` almost permanently; the same UI with a subtle grey background cannot.',
    },

    { kind: 'h2', text: 'What this means for the DOM' },
    {
      kind: 'p',
      text: 'The browser has no e-paper API. It paints, the framebuffer changes, and the controller — or a compositor shim above it — infers the damaged region from what actually differs. Every layer between your code and the panel is doing damage tracking, so the DOM operations you choose decide the rectangle you get.',
    },
    {
      kind: 'p',
      text: 'Reassigning `innerHTML` is the pathological case. Even when the resulting markup is byte-identical to what was there, the old subtree is destroyed and a new one is built, laid out and painted. Damage tracking sees the whole container as changed and the panel does a full-region refresh, in the slow grey-capable mode, for an update that changed one number.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `// Full container repaint. On a panel: one large rectangle, GC16-class cost.
el.innerHTML = \`
  <span class="label">Queue</span>
  <span class="value">\${count}</span>\`;

// Same visible result, one text node touched. On a panel: a small
// rectangle around the digits, eligible for a fast 1-bit update.
valueNode.textContent = String(count);`,
    },
    {
      kind: 'p',
      text: 'This is why EPaper components patch rather than re-render. Every component keeps references to the nodes it owns and updates them through helpers — `patchText`, `patchAttr`, `patchBoolAttr` — that compare before they write. A patch that finds no difference performs no DOM write, produces no damage, and costs the panel nothing.',
    },
    {
      kind: 'code',
      lang: 'ts',
      code: `// From core/dom.ts — the write only happens when the value really moved.
export const patchText = (node: Node, next: string): void => {
  if (node.textContent !== next) node.textContent = next;
};`,
    },
    {
      kind: 'p',
      text: 'The same reasoning rules out CSS transitions and animations outright. A 300 ms fade is not a smooth gradient on e-ink — it is a request for a few dozen full-region waveform cycles, each one a visible flash, queued faster than the panel can drain them. EPaper resets `transition` and `animation` globally inside `.ink-page` rather than trusting authors to remember.',
    },

    { kind: 'h2', text: 'Designing an update rhythm' },
    {
      kind: 'p',
      text: 'Once you accept the rectangle model, the design work becomes deciding *when* things change, not just how.',
    },
    {
      kind: 'ol',
      items: [
        '**Batch on a clock, not on an event.** A dashboard polling four endpoints should paint once when all four have answered, not once per response. Four small rectangles arriving together are cheaper than four unions arriving apart.',
        '**Keep volatile content spatially together.** Two numbers that change every minute belong in the same corner. Put them at opposite ends of the page and every update damages everything between them.',
        '**Keep volatile content pure black and white.** Grey in the dirty region forces the slow waveform. Grey outside it costs nothing.',
        '**Budget a clearing refresh.** Count your fast updates and spend a `GC16` when the residue becomes visible — commonly every 10 to 50 partial updates, tuned by eye on the actual panel.',
        '**Never update faster than the panel settles.** Queueing updates faster than roughly 4 Hz on a `DU`-class mode does not make the UI more responsive; it makes it permanently mid-transition.',
      ],
    },

    { kind: 'h2', text: 'Measuring it' },
    {
      kind: 'p',
      text: 'None of this is guesswork you have to do by eye. Damage is observable from JavaScript: a `MutationObserver` tells you exactly which nodes an interaction touched, and the union of their bounding boxes is a good proxy for the rectangle the panel will be asked to drive.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `// Rough dirty-rectangle probe. Union of every touched node's box,
// as a share of the viewport.
const seen = new Set();
new MutationObserver((records) => {
  for (const r of records) {
    seen.add(r.target.nodeType === 1 ? r.target : r.target.parentElement);
  }
}).observe(document.body, {
  subtree: true, childList: true, characterData: true, attributes: true,
});

function dirtyArea() {
  let box = null;
  for (const el of seen) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    box = box ? {
      top: Math.min(box.top, r.top), left: Math.min(box.left, r.left),
      right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom),
    } : { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
  }
  if (!box) return 0;
  return ((box.right - box.left) * (box.bottom - box.top)) /
         (innerWidth * innerHeight);
}`,
    },
    {
      kind: 'p',
      text: 'EPaper runs exactly this idea as a test gate. `npm run test:refresh` drives each component through a representative interaction and asserts a budget on mutation count, node churn and dirty area — so a change that quietly replaces a subtree fails CI instead of being discovered on a panel months later.',
    },

    { kind: 'h2', text: 'Summary' },
    {
      kind: 'ul',
      items: [
        'E-paper is bistable: holding an image is free, changing it is expensive.',
        'Grey levels require a multi-frame waveform; 1-bit updates can skip it and are 3–5× faster.',
        'Fast modes leave ghosting that only a clearing waveform removes.',
        'Update cost is the **bounding box** of the change, not its area — so scatter is expensive and grouping is cheap.',
        'In the browser, that makes surgical DOM patches a hardware concern rather than a micro-optimisation.',
      ],
    },
    {
      kind: 'p',
      text: 'EPaper encodes these rules so you do not have to re-derive them per component — see [the feature overview](/features/) for how they show up in the API, or [the component list](/components/) for what ships.',
    },
  ],
};

/* --------------------------------------------------------------------- *
 * Guide 2 — no Shadow DOM
 * --------------------------------------------------------------------- */
const NO_SHADOW_DOM: Article = {
  slug: 'web-components-without-shadow-dom',
  kind: 'guide',
  nav: 'Without Shadow DOM',
  title: 'Building Web Components Without Shadow DOM — What You Gain and What You Give Up',
  heading: 'Web components without Shadow DOM',
  description:
    'Shadow DOM is optional. This guide covers what encapsulation actually buys, the real costs — cross-root ARIA, styling friction, SSR and form participation — and how a light-DOM component library stays maintainable without it.',
  lede: 'Custom elements and Shadow DOM are two separate specifications that are almost always introduced together. You can use the first without the second, and for a component library with a single owner it is often the better trade. Here is the honest ledger.',
  published: '2026-07-02',
  updated: '2026-08-14',
  topics: ['web components', 'shadow dom', 'light dom', 'custom elements', 'css encapsulation'],
  blocks: [
    {
      kind: 'p',
      text: 'A custom element is a class registered against a tag name. Shadow DOM is a separate mechanism for attaching an encapsulated subtree to an element. Nothing in the custom-elements specification requires the second, and `customElements.define()` works exactly the same either way.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `class Card extends HTMLElement {
  connectedCallback() {
    // No attachShadow(). Children land in the ordinary document tree,
    // reachable by ordinary selectors.
    this.innerHTML = '<div class="card__body"></div>';
  }
}
customElements.define('x-card', Card);`,
    },

    { kind: 'h2', text: 'What Shadow DOM genuinely gives you' },
    {
      kind: 'p',
      text: 'The case for it is real and worth stating properly before arguing against it.',
    },
    {
      kind: 'ul',
      items: [
        '**Style isolation in both directions.** Page CSS cannot reach in, component CSS cannot leak out. No naming convention required, no specificity war to lose.',
        '**DOM privacy.** `querySelector` from the page does not traverse into an open shadow root by default, so a consumer cannot casually depend on your internal structure and break when you change it.',
        '**Scoped ids and slots.** An `id` inside a shadow root cannot collide with the page, and slot-based composition is genuinely elegant.',
      ],
    },
    {
      kind: 'p',
      text: "If you are shipping a widget that will be embedded in pages you do not control — an analytics badge, a payment button, an embeddable chat — take the encapsulation. Those costs below are worth paying when the alternative is a stranger's `* { box-sizing: content-box }` destroying your layout.",
    },

    { kind: 'h2', text: 'What it costs' },
    { kind: 'h3', text: 'Cross-root ARIA is still awkward' },
    {
      kind: 'p',
      text: 'This is the sharpest cost and the least discussed. ARIA relationships are expressed with IDREFs — `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-activedescendant`, the `for` attribute — and an IDREF does not cross a shadow boundary. A label in the light DOM cannot point at an input inside a shadow root by id.',
    },
    {
      kind: 'p',
      text: "The platform has been closing this gap: `ElementInternals` exposes ARIA reflection so a component can set its own role and state from inside, and the Reference Target proposal aims to let a shadow root nominate an element as the target of outside IDREFs. But reflection only covers the element's *own* semantics, not relationships you want a consumer to author, and the remaining gaps are exactly the composite widgets — comboboxes, grids, tab sets — where accessibility is hardest.",
    },
    {
      kind: 'p',
      text: 'In light DOM this problem does not exist. A `<label for>` finds its input because they are in the same tree, which is the whole mechanism.',
    },

    { kind: 'h3', text: 'Theming becomes an API surface you have to design' },
    {
      kind: 'p',
      text: 'Encapsulation blocks page CSS, so every property a consumer might want to change must be deliberately exposed — as a CSS custom property (which does pierce the boundary, being inherited), or via `::part()`. Both work. Both mean that "can I change the border radius?" is a feature request against your library rather than a line of CSS.',
    },
    {
      kind: 'p',
      text: 'For a design system with one owner and known consumers, that gate is pure overhead. The consumers are colleagues, the deviations are legitimate, and the answer is nearly always yes.',
    },

    { kind: 'h3', text: 'Server rendering and first paint' },
    {
      kind: 'p',
      text: 'Declarative Shadow DOM makes shadow roots server-renderable, and it is well supported now — but it is a second serialisation format to produce, and per-component styles inside a shadow root are not deduplicated across instances unless you reach for adopted stylesheets. Light DOM has none of this: markup is markup, one stylesheet is one stylesheet, and a page that never runs its JavaScript still shows content.',
    },
    {
      kind: 'p',
      text: 'That last point is decisive for anything that has to be *readable* without scripting, and it is why the pages of this site emit plain markup for text content and reserve custom elements for the parts where behaviour is the point.',
    },

    { kind: 'h3', text: 'Debugging and tooling friction' },
    {
      kind: 'ul',
      items: [
        '`document.querySelectorAll()` does not see into shadow roots, so ad-hoc console work, test selectors and third-party tooling all need shadow-aware traversal.',
        'Browser find-in-page and text selection across boundaries have historically been inconsistent.',
        'Print stylesheets and PDF pipelines frequently ignore what they cannot select.',
      ],
    },

    { kind: 'h2', text: 'The light-DOM approach in practice' },
    {
      kind: 'p',
      text: 'Dropping encapsulation means you owe the codebase a discipline in its place. Three rules cover it.',
    },
    {
      kind: 'p',
      text: '**One namespace, applied without exception.** Every class the library emits is prefixed. Collisions become a convention problem, which is a solved one, rather than a runtime accident.',
    },
    {
      kind: 'code',
      lang: 'html',
      code: `<!-- What <e-card> renders. Every class is ink-prefixed and documented;
     the tag itself is the styling hook for the outer box. -->
<e-card>
  <div class="ink-card__header">
    <h3 class="ink-card__title">Panel status</h3>
  </div>
  <div class="ink-card__body">…</div>
</e-card>`,
    },
    {
      kind: 'p',
      text: '**Theme through custom properties, not overrides.** A documented token layer means a consumer restyles the library by setting variables, not by writing more specific selectors. The escape hatch stays available, but it is not the intended path.',
    },
    {
      kind: 'code',
      lang: 'css',
      code: `/* A panel vendor rebrands the whole library without touching JavaScript. */
.ink-page {
  --ink-fg: #1a1a1a;
  --ink-bg: #f4f2ec;
  --ink-border-width: 3px;
  --ink-text-body: 18px;
}`,
    },
    {
      kind: 'p',
      text: '**Own the ids you mint.** Without shadow scoping, any `id` a component generates is global. Generate them from a counter with a namespace prefix and never hardcode one.',
    },

    { kind: 'h2', text: 'Choosing' },
    {
      kind: 'table',
      head: ['Situation', 'Shadow DOM', 'Light DOM'],
      rows: [
        ['Embedded in pages you do not control', 'Yes', 'Risky'],
        ['Design system, one owner, known consumers', 'Optional', 'Usually better'],
        ['Heavy composite ARIA (combobox, grid, tabs)', 'Painful', 'Straightforward'],
        ['Consumers expect to restyle freely', 'Friction', 'Natural'],
        ['Must render without JavaScript', 'Needs DSD', 'Free'],
        ['Third-party CSS is hostile', 'Protected', 'Exposed'],
      ],
    },
    {
      kind: 'note',
      label: 'Not a universal answer',
      text: 'This is a trade, not a verdict. EPaper skips Shadow DOM because its consumers are application teams and panel vendors who *should* be able to restyle it, and because the accessibility relationships in its form controls are easier to get right in one tree. A library with different consumers should reach a different conclusion.',
    },
    {
      kind: 'p',
      text: 'The one thing worth avoiding is deciding by default. Attaching a shadow root because every tutorial does is how a project inherits the costs above without ever having wanted the benefit.',
    },
  ],
};

/* --------------------------------------------------------------------- *
 * Guide 3 — form-associated custom elements
 * --------------------------------------------------------------------- */
const FORM_ASSOCIATED: Article = {
  slug: 'form-associated-custom-elements',
  kind: 'guide',
  nav: 'Form-associated elements',
  title: 'Form-Associated Custom Elements — ElementInternals in Practice',
  heading: 'Form-associated custom elements',
  description:
    'How to make a custom element participate in <form>, FormData and constraint validation using ElementInternals: setFormValue, setValidity, the four form lifecycle callbacks, and the pitfalls that are not in the specification summary.',
  lede: 'Before `ElementInternals`, a custom input had to smuggle a hidden `<input>` into the DOM to be submitted with a form. That workaround is obsolete. A form-associated custom element is a first-class form control — it submits, it validates, it resets, and it restores after a back-button navigation.',
  published: '2026-07-15',
  updated: '2026-08-16',
  topics: [
    'ElementInternals',
    'form-associated custom elements',
    'FormData',
    'constraint validation',
    'web components',
  ],
  blocks: [
    {
      kind: 'p',
      text: 'Two things make an element form-associated: a static flag the browser reads at definition time, and an internals object obtained in the constructor.',
    },
    {
      kind: 'code',
      lang: 'ts',
      code: `class EInput extends HTMLElement {
  // Read by the browser when the element is defined. Setting it later,
  // or on the instance, does nothing.
  static formAssociated = true;

  #internals: ElementInternals;

  constructor() {
    super();
    // Callable exactly once per element. A second call throws.
    this.#internals = this.attachInternals();
  }
}
customElements.define('e-input', EInput);`,
    },
    {
      kind: 'p',
      text: 'That alone gets you the association: the element now appears in `form.elements`, it inherits a `form` property, and the four lifecycle callbacks below start firing. What it does *not* get you is a value — you have to publish one.',
    },

    { kind: 'h2', text: 'Publishing a value' },
    {
      kind: 'p',
      text: "`setFormValue()` is what puts the control into `FormData` and into a submission. Call it whenever the value changes, and call it with the element's `name` already set on the element itself — the internals object reads the name from the DOM.",
    },
    {
      kind: 'code',
      lang: 'ts',
      code: `set value(next: string) {
  this.#value = next;
  // Accepts string | File | FormData | null.
  // null means "submit nothing" — not "submit an empty string".
  this.#internals.setFormValue(next === '' ? null : next);
}`,
    },
    {
      kind: 'note',
      label: 'The two-argument form',
      text: '`setFormValue(value, state)` takes an optional second argument: the value to submit, and the internal state to restore later. They differ whenever the submitted value is a projection of something richer — a date picker submits `2026-08-18` but wants to restore which month the user had scrolled to. The second argument is what `formStateRestoreCallback` receives.',
    },
    {
      kind: 'p',
      text: 'A control that needs to submit several entries under different names passes a `FormData` instead. This is how a range control submits `from` and `to` from one element.',
    },
    {
      kind: 'code',
      lang: 'ts',
      code: `const data = new FormData();
data.append(\`\${this.name}-from\`, this.#from);
data.append(\`\${this.name}-to\`, this.#to);
this.#internals.setFormValue(data);`,
    },

    { kind: 'h2', text: 'Validation' },
    {
      kind: 'p',
      text: '`setValidity()` wires the element into constraint validation, so `:invalid`, `form.checkValidity()` and `reportValidity()` all work. It takes three arguments and the third is the one people forget.',
    },
    {
      kind: 'code',
      lang: 'ts',
      code: `#validate() {
  if (this.required && this.#value === '') {
    this.#internals.setValidity(
      { valueMissing: true },
      'Please fill in this field.',
      // Third argument: the element the browser should focus and anchor
      // the validation bubble to. Omit it and reportValidity() throws
      // when the control is invalid.
      this.#field,
    );
    return;
  }
  // Empty flags object clears every constraint.
  this.#internals.setValidity({});
}`,
    },
    {
      kind: 'ul',
      items: [
        'The flags object is **replaced**, not merged. Passing `{ tooShort: true }` clears `valueMissing`.',
        'A non-empty flags object requires a non-empty message. The pair is validated together.',
        'The anchor must be a descendant of your element — in light DOM that is any node you rendered, in shadow DOM it must be inside your shadow root.',
        'Setting `willValidate` is not your job. The browser derives it from disabled state and ancestry.',
      ],
    },

    { kind: 'h2', text: 'The four lifecycle callbacks' },
    {
      kind: 'p',
      text: 'These fire only on form-associated elements, and only when the static flag was set at definition time.',
    },
    {
      kind: 'table',
      head: ['Callback', 'When', 'What you must do'],
      rows: [
        [
          '`formAssociatedCallback(form)`',
          'Element is associated with, or removed from, a form',
          'Rarely anything. `form` is `null` on removal.',
        ],
        [
          '`formDisabledCallback(disabled)`',
          'Own or ancestor `<fieldset>` disabled state changes',
          'Update your rendering and stop accepting input.',
        ],
        [
          '`formResetCallback()`',
          '`form.reset()` or a reset button',
          'Restore the value to its default and re-publish it.',
        ],
        [
          '`formStateRestoreCallback(state, mode)`',
          'Back/forward navigation, or browser autofill',
          'Adopt the restored state. `mode` is `restore` or `autocomplete`.',
        ],
      ],
    },
    {
      kind: 'p',
      text: '`formStateRestoreCallback` is the one that separates a control that feels native from one that does not. Without it, a user who submits a form, navigates back, and finds their custom controls blank while the native inputs are still filled in will — correctly — conclude the page is broken.',
    },
    {
      kind: 'code',
      lang: 'ts',
      code: `formResetCallback(): void {
  this.value = this.getAttribute('value') ?? '';
}

formStateRestoreCallback(state: string | File | FormData, _mode: string): void {
  // Whatever was passed as setFormValue()'s second argument comes back
  // here — parse it with the same code that produced it.
  this.value = typeof state === 'string' ? state : '';
}`,
    },

    { kind: 'h2', text: 'Labels, focus and the accessibility contract' },
    {
      kind: 'p',
      text: 'Form association gives you `this.#internals.labels`, and a `<label for>` pointing at your element will focus it — but only if the element is focusable and forwards that focus somewhere sensible. Set `tabindex` deliberately, and delegate to the interactive node you rendered.',
    },
    {
      kind: 'code',
      lang: 'ts',
      code: `// The host is the label target; the real focus goes to the field.
connectedCallback() {
  if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
}

focus(options?: FocusOptions) {
  this.#field.focus(options);
}`,
    },
    {
      kind: 'p',
      text: "`ElementInternals` also exposes ARIA reflection — `internals.role`, `internals.ariaRequired` and friends. These set defaults in the accessibility tree without writing attributes onto the element, which means a consumer can still override them with real attributes. That is the correct precedence and it is worth using rather than calling `setAttribute('role', …)` yourself.",
    },

    { kind: 'h2', text: 'Pitfalls' },
    {
      kind: 'ol',
      items: [
        '**`attachInternals()` in the constructor, once.** A second call throws `NotSupportedError`, and calling it before `super()` is a syntax-level mistake that class fields can cause silently.',
        '**Class fields fight custom element constructors.** With `useDefineForClassFields: true`, TypeScript emits field initialisers that run before the element is upgraded, clobbering attributes already in the DOM. Set it to `false` for a component library.',
        '**`setFormValue(null)` is not `setFormValue("")`.** The first omits the entry from `FormData` entirely; the second submits an empty string. Match whatever a native input would do for your control type.',
        '**Do not publish a value in the constructor.** The element may not be connected, and its `name` may not be set yet. Publish in `connectedCallback` and on every change after.',
        '**Disabled state has two sources.** Your own `disabled` attribute and an ancestor `<fieldset>`. `formDisabledCallback` reports the effective state — trust it over reading your own attribute.',
      ],
    },

    { kind: 'h2', text: 'A complete minimal control' },
    {
      kind: 'code',
      lang: 'ts',
      code: `class ECounter extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['value', 'disabled'];

  #internals: ElementInternals;
  #value = 0;
  #button!: HTMLButtonElement;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  connectedCallback() {
    this.innerHTML = '<button type="button" class="ink-btn"></button>';
    this.#button = this.querySelector('button')!;
    this.#button.addEventListener('click', () => { this.value = this.#value + 1; });
    this.value = Number(this.getAttribute('value') ?? 0);
  }

  get value() { return this.#value; }
  set value(next: number) {
    this.#value = next;
    this.#button.textContent = String(next);   // surgical, not innerHTML
    this.#internals.setFormValue(String(next));
    this.#internals.setValidity(
      next < 0 ? { rangeUnderflow: true } : {},
      next < 0 ? 'Must not be negative.' : '',
      this.#button,
    );
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: next } }));
  }

  formResetCallback() { this.value = Number(this.getAttribute('value') ?? 0); }
  formStateRestoreCallback(state: string) { this.value = Number(state) || 0; }
  formDisabledCallback(disabled: boolean) { this.#button.disabled = disabled; }
}`,
    },
    {
      kind: 'p',
      text: 'EPaper factors this pattern into a `BaseFormControl<T>` base class: subclasses implement `serialize(value)` and `parse(string)`, and inherit association, validation plumbing and all four callbacks. Fourteen input components share it, which is the point — the contract above is exactly the kind of thing that decays when it is reimplemented per control.',
    },

    { kind: 'h2', text: 'Support' },
    {
      kind: 'p',
      text: '`ElementInternals` with form association is available across current Chrome, Edge, Firefox and Safari. Safari was the last to land it and shipped form association in 16.4; if you must support older Safari, feature-detect with `"attachInternals" in HTMLElement.prototype` and fall back to a visually hidden `<input>` rather than shipping a control that silently submits nothing.',
    },
    {
      kind: 'p',
      text: 'See [the live showcase](/showcase/) for a form built entirely from these controls, including `FormData` output and validation.',
    },
  ],
};

/* --------------------------------------------------------------------- *
 * Guide 4 — designing for e-ink
 * --------------------------------------------------------------------- */
const DESIGNING_FOR_EINK: Article = {
  slug: 'designing-for-eink',
  kind: 'guide',
  nav: 'Designing for e-ink',
  title: 'Designing Interfaces for E-Ink — Contrast, Typography and Life Without Hover',
  heading: 'Designing for e-ink',
  description:
    'Practical interface rules for electrophoretic displays: why hover states cannot exist, how to signal state without colour or motion, typography that survives a 1-bit render, and what changes on colour e-paper.',
  lede: 'Most interface conventions assume a backlit screen, a pointer, and free redraws. E-ink has none of the three. The good news is that the constraints point in a consistent direction, and designs that respect them tend to be clearer than the ones they replace.',
  published: '2026-07-28',
  updated: '2026-08-15',
  topics: ['e-ink design', 'accessibility', 'typography', 'contrast', 'ui design'],
  blocks: [
    {
      kind: 'p',
      text: 'Three properties of the medium drive every rule below: the display is reflective rather than emissive, it has no pointer, and changing it is slow and visible. Everything else follows.',
    },

    { kind: 'h2', text: 'There is no hover, so there is no hidden affordance' },
    {
      kind: 'p',
      text: 'E-paper devices are touch or button driven. There is no cursor, so `:hover` never matches — and any information you put behind it is information the user cannot get. That rules out a surprising amount of common practice: tooltips as the only explanation, controls that appear on row hover, hover-underlined links, hover-revealed overflow menus.',
    },
    {
      kind: 'p',
      text: 'The replacement is not "show everything always", it is to move state into attributes that are visible and semantic.',
    },
    {
      kind: 'code',
      lang: 'css',
      code: `/* Not available on e-paper. */
.row:hover .row__actions { opacity: 1; }

/* Available, and better: real state, visible to CSS and to assistive tech. */
.ink-tab[aria-selected='true'] { border-bottom: var(--ink-border-strong); }
.ink-option[aria-checked='true']::before { content: '■'; }
.ink-row[data-active] { outline: var(--ink-border); }
.ink-btn:focus-visible { outline: 3px solid var(--ink-fg); outline-offset: 2px; }`,
    },
    {
      kind: 'p',
      text: 'This is the rare constraint that is purely a gift. Every one of those selectors works on a touchscreen phone too, where `:hover` has been a lie since 2007.',
    },

    { kind: 'h2', text: 'Signal state without colour and without motion' },
    {
      kind: 'p',
      text: 'A monochrome panel has no red for errors and no green for success, and you cannot animate a spinner. So state has to be carried by the three channels that remain: **text, shape and position.**',
    },
    {
      kind: 'ul',
      items: [
        '**Text first.** "Failed — retry in 30 s" outperforms any icon on any display. It also happens to be what a screen reader announces.',
        '**Shape and fill patterns for categories.** A hatched fill, a double border and a solid block are distinguishable at a glance and survive photocopying, which is roughly what 1-bit rendering is.',
        '**Position for status.** A metric that moves to the top of a list when it degrades communicates faster than one that changes colour in place.',
        '**Explicit progress over indeterminate progress.** A spinner is an animation you cannot have. A discrete step counter — "3 of 8" — carries more information and costs one small rectangle to update.',
      ],
    },
    {
      kind: 'p',
      text: 'This is the same discipline WCAG asks for when it says colour must not be the only means of conveying information. Designing for e-ink makes that criterion structural rather than a review checkbox.',
    },

    { kind: 'h2', text: 'Contrast is a physical budget' },
    {
      kind: 'p',
      text: 'A backlit screen emits; contrast ratios are stable regardless of the room. A reflective panel returns ambient light, so its contrast depends on the lighting the device happens to be in. Typical e-paper contrast ratios sit in the range of 12:1 to 16:1 under good light — respectable, but well below an OLED, and it degrades as the room dims.',
    },
    {
      kind: 'p',
      text: "The practical consequence is that mid-greys are not a safe design tool. A 40 % grey that tests fine on a monitor can be nearly indistinguishable from a 55 % grey on a panel in a dim corridor, and the panel's available grey levels — commonly 16 — are not evenly spaced perceptually.",
    },
    {
      kind: 'ol',
      items: [
        'Use pure black on pure white for anything that must be read.',
        'Reserve greys for large flat areas — a table zebra stripe, a disabled surface — never for text or thin lines.',
        'Do not encode meaning in the difference between two greys. If a reader must tell them apart, use pattern or a border instead.',
        'Draw separators as real borders, not as light-grey rules. Two solid pixels beat four grey ones on a panel.',
      ],
    },

    { kind: 'h2', text: 'Typography on a slow, high-DPI, 1-bit surface' },
    {
      kind: 'p',
      text: "E-paper panels are usually high-DPI and non-backlit, which is close to ideal for reading — the medium's one genuine advantage. It rewards typographic care more than a screen does.",
    },
    {
      kind: 'ul',
      items: [
        '**Serifs work here.** The resolution is high enough to render them cleanly, and the reflective surface makes long-form serif text genuinely comfortable. This is the opposite of the low-DPI screen advice most style guides inherited.',
        '**Set larger than you would on screen.** 16–18 px body text is a floor, not a ceiling, and readers frequently hold these devices further away than a phone.',
        '**Line length matters more.** 60–75 characters, enforced with `max-width` in `ch`, because there is no scrolling momentum to make a long line forgiving.',
        '**Avoid hairline weights.** A 200-weight face at small sizes disappears into anti-aliasing artefacts when the panel renders in a 1-bit mode.',
        "**Left-align.** Justified text without hyphenation opens rivers, and the panel's crisp rendering makes them more visible, not less.",
      ],
    },
    {
      kind: 'note',
      label: 'Anti-aliasing is not free',
      text: 'Anti-aliased glyph edges are grey pixels. A block of text containing greys cannot be updated with the fast 1-bit waveform — so on a panel where text updates frequently, such as a live clock, rendering that text without anti-aliasing is what makes a fast refresh mode available at all. This is a genuine trade between static beauty and update cost.',
    },

    { kind: 'h2', text: 'Layout for a display that never scrolls smoothly' },
    {
      kind: 'p',
      text: 'Scrolling on e-ink is either janky or ghosting-heavy, so the honest design target is a **page**, not a feed. Pagination beats infinite scroll on this medium by a wide margin — one update per page turn, arriving at a predictable moment, versus a continuous stream of partial updates the panel cannot keep up with.',
    },
    {
      kind: 'ul',
      items: [
        'Prefer fixed regions with stable positions over content that reflows as data arrives.',
        'Give volatile values a fixed-width slot — `font-variant-numeric: tabular-nums` and a `min-width` — so a number growing from 9 to 10 does not reflow its neighbours and enlarge the dirty rectangle.',
        'Group things that change together, as [the partial-refresh guide](/guides/partial-refresh/) explains: update cost is the bounding box of the change.',
        "Make touch targets generous — 48 px minimum. The panel's update latency means a missed tap costs a full second of confusion before any feedback arrives.",
      ],
    },

    { kind: 'h2', text: 'Feedback when nothing can move' },
    {
      kind: 'p',
      text: 'On a fast display, a button press is acknowledged by a ripple in 16 ms. On e-paper, the acknowledgement itself takes 150–300 ms, which is long enough for a user to conclude the tap missed and press again.',
    },
    {
      kind: 'ol',
      items: [
        'Acknowledge in the smallest possible region — invert the button, do not re-render the panel it sits in. A small rectangle in a fast mode is the closest thing to instant that the medium offers.',
        'Make the acknowledgement 1-bit. An inversion is exactly the update a `DU` waveform is good at.',
        'Never queue a second acknowledgement for a repeated tap. Debounce at the input layer, or the panel spends the next second replaying presses.',
        'For anything slower than about a second, show a real progress state with a number in it, not an indeterminate one.',
      ],
    },

    { kind: 'h2', text: 'Colour e-paper changes less than you would hope' },
    {
      kind: 'p',
      text: 'Colour panels — Kaleido, which puts a colour filter array over a monochrome panel, and Gallery/ACeP, which uses multiple pigments — are real and shipping. They do not lift the constraints above; they add one.',
    },
    {
      kind: 'ul',
      items: [
        'Colour filter arrays reduce effective resolution and lower contrast, because the filter absorbs light on a display that has no light to spare.',
        'The gamut is narrow and saturation is low. A colour chosen on a monitor will arrive muted and slightly shifted.',
        'Multi-pigment panels are dramatically slower on colour updates — full-colour refreshes are measured in seconds, not milliseconds.',
      ],
    },
    {
      kind: 'p',
      text: 'The workable approach is to design a complete monochrome interface first and treat colour as a **redundant** accent — a category tint that reinforces a label already carrying the meaning in text. That way the design still functions on a monochrome panel, in poor light, and for a colour-blind reader, which is the same requirement three times over.',
    },

    { kind: 'h2', text: 'A checklist' },
    {
      kind: 'ul',
      items: [
        'No `:hover`-only information anywhere.',
        'No animation, no transition, no indeterminate spinner.',
        'Every state readable as text, not only as colour or icon.',
        'Pure black on white for anything that must be read; greys only for large flat areas.',
        'Body text 16–18 px minimum, 60–75 characters per line, left-aligned.',
        'Touch targets 48 px and up.',
        'Volatile numbers in fixed-width slots, grouped together on the page.',
        'Pagination rather than infinite scroll.',
        'Colour, if present, redundant with something already stated.',
      ],
    },
    {
      kind: 'p',
      text: 'EPaper enforces the first two in code — `base.css` resets `transition` and `animation` inside `.ink-page`, and the library ships no `:hover` rule at all — so the remaining seven are the ones that stay a design responsibility.',
    },
  ],
};

export const GUIDES: Article[] = [
  PARTIAL_REFRESH,
  NO_SHADOW_DOM,
  FORM_ASSOCIATED,
  DESIGNING_FOR_EINK,
];
