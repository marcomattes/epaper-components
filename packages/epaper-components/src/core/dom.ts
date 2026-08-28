// Shared DOM/string helpers used by every component.

/**
 * Stringifies anything for `esc()`. Deliberately mirrors `String(s ?? '')`'s
 * behavior — including a bare object falling back to "[object Object]" and a
 * custom `toString()` being honored — just without the literal `String(x)`
 * call on a non-primitive that trips static "may stringify as an object"
 * analysis; `Object.prototype.toString` runs the same either way.
 */
function stringify(s: unknown): string {
  if (typeof s === 'string') return s;
  if (s == null) return '';
  return (s as { toString(): string }).toString();
}

export const esc = (s: unknown): string =>
  stringify(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

/**
 * Minimal HTML template helper. Interpolated values are always escaped;
 * authored markup belongs in the static template strings.
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce<string>((acc, s, i) => acc + s + (i < values.length ? esc(values[i]) : ''), '');

export const boolAttr = (el: Element, name: string): boolean =>
  el.hasAttribute(name) && el.getAttribute(name) !== 'false';

export function numAttr(el: Element, name: string, dflt: number): number {
  const v = el.getAttribute(name);
  if (v == null || v.trim() === '') return dflt;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : dflt;
}

/** Read a finite integer attribute, falling back for fractions and invalid input. */
export function intAttr(el: Element, name: string, dflt: number): number {
  const parsed = numAttr(el, name, dflt);
  return Number.isInteger(parsed) ? parsed : dflt;
}

/** Read a finite number attribute and clamp it to an inclusive range. */
export function clampedNumAttr(
  el: Element,
  name: string,
  dflt: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, numAttr(el, name, dflt)));
}

/**
 * The base class every component extends, instead of `HTMLElement` directly.
 *
 * In a browser this *is* `HTMLElement` — same object, no wrapper, no cost. On a
 * server (Next.js, Nuxt, Astro, a Vitest node-environment suite) there is no
 * `HTMLElement` binding at all, and a bare `class E extends HTMLElement` throws
 * `ReferenceError` while the module is still being evaluated. That made every
 * import of this library — the barrel and every subpath alike — unusable in a
 * server render, even from a file the framework only ever runs on the client.
 *
 * Extending this instead makes the import a no-op outside a browser: the
 * classes are constructed but never registered (see {@link define}) and never
 * instantiated, because an upgrade can only happen in a document. Nothing else
 * in the library touches a DOM global at module scope, so an SSR pass now
 * imports cleanly and the components upgrade on the client as usual.
 *
 * The stand-in is deliberately empty. It is never instantiated server-side, so
 * it needs no behaviour — only enough of a type to keep `extends` valid.
 */
export const EpaperElement: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/**
 * Register a custom element, once. Silently does nothing where there is no
 * `customElements` registry — see {@link EpaperElement} for why.
 */
export const define = (name: string, ctor: CustomElementConstructor): void => {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(name)) customElements.define(name, ctor);
};

export const randId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Tiny per-element cleanup registry used by components that attach global
 * listeners (document/window). Prevents the per-mount memory leaks that come
 * from anonymous handlers on `document.addEventListener`.
 *
 * Components call `addCleanup(this, fn)` when wiring; on `disconnectedCallback`
 * they call `runCleanups(this)` which invokes every registered fn once.
 */
const CLEANUPS = new WeakMap<object, Array<() => void>>();

export function addCleanup(host: object, fn: () => void): void {
  let arr = CLEANUPS.get(host);
  if (!arr) {
    arr = [];
    CLEANUPS.set(host, arr);
  }
  arr.push(fn);
}

/**
 * Drop a single previously registered cleanup without running it. Used by
 * components that re-register a listener while mounted (e.g. re-pointing a
 * scroll target) so the registry does not grow with every rebind.
 */
export function removeCleanup(host: object, fn: () => void): void {
  const arr = CLEANUPS.get(host);
  if (!arr) return;
  const i = arr.indexOf(fn);
  if (i !== -1) arr.splice(i, 1);
}

export function runCleanups(host: object): void {
  const arr = CLEANUPS.get(host);
  if (!arr) return;
  for (const fn of arr) {
    try {
      fn();
    } catch {
      /* ignore cleanup failures */
    }
  }
  arr.length = 0;
}

/**
 * Attach a global listener to `document` or `window` and auto-register the
 * removal under the host's cleanup registry. The host should call
 * `runCleanups(this)` from its `disconnectedCallback`.
 */
export function onGlobal<K extends keyof DocumentEventMap>(
  host: object,
  target: Document,
  type: K,
  listener: (ev: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function onGlobal<K extends keyof WindowEventMap>(
  host: object,
  target: Window,
  type: K,
  listener: (ev: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function onGlobal(
  host: object,
  target: Document | Window,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, listener, options);
  const remove = (): void => target.removeEventListener(type, listener, options);
  addCleanup(host, remove);
  return remove;
}

/**
 * Watch a host's authored data-carrier children (`<e-timeline-item>`,
 * `<e-desc-item>`, `<e-option>`, …) and re-run `sync` when they change.
 *
 * Components that read their entries from child elements used to do so once,
 * in `connectedCallback`, which froze them: an item appended later never
 * rendered. This gives them a single reactive contract instead.
 *
 * Two things make it safe to observe a host that also renders into itself:
 *
 * - `isOutput` marks the component's own rendered subtree. An incoming batch
 *   of records that only touches it is dropped, so it never even schedules a
 *   sync.
 * - Whatever `sync` itself writes — into the rendered output, or directly
 *   onto an authored carrier (e.g. hiding it with `display: none`, or an
 *   attribute `attributeFilter` is watching) — is drained with
 *   `observer.takeRecords()` right after `sync()` returns, still inside the
 *   same microtask. That empties the observer's pending record queue before
 *   the browser's own "notify mutation observers" step gets a chance to run,
 *   so those self-caused records never reach this callback and can't
 *   schedule a follow-up sync. This is what actually makes a sync loop-proof:
 *   `isOutput` alone cannot, since a self-write that lands on the carrier
 *   itself isn't "output" and would otherwise come back as a normal,
 *   `relevant` record in some future callback.
 *
 * Records that survive both of the above are coalesced into one `sync()` per
 * microtask, so a burst of appends repaints once rather than once per item —
 * the same reasoning as the patch helpers below.
 *
 * `attributeFilter` accepts either a list of attribute names to watch, or
 * `true` to watch every attribute in the subtree. Pass `true` when an edit
 * worth reacting to can land anywhere inside an item's markup — e.g. an
 * `href` on a link inside its default-slot content — rather than only on
 * the item element's own named attributes.
 *
 * The observer is disconnected through the host's cleanup registry, so a
 * component that already calls `runCleanups(this)` in `disconnectedCallback`
 * needs no extra teardown.
 */
export function observeItems(
  host: HTMLElement,
  sync: () => void,
  opts: { attributeFilter?: string[] | true; isOutput?: (node: Node) => boolean } = {},
): MutationObserver {
  const { attributeFilter, isOutput } = opts;
  let queued = false;

  const observer = new MutationObserver((records) => {
    if (queued) return;
    const relevant = isOutput ? records.some((r) => !isOutput(r.target)) : records.length > 0;
    if (!relevant) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      sync();
      // Drain records `sync()` itself just produced before the browser's own
      // microtask can deliver them back to this callback — see doc comment.
      observer.takeRecords();
    });
  });

  observer.observe(host, {
    childList: true,
    subtree: true,
    characterData: true,
    ...(attributeFilter
      ? { attributes: true, ...(attributeFilter === true ? {} : { attributeFilter }) }
      : {}),
  });
  addCleanup(host, () => observer.disconnect());
  return observer;
}

/**
 * Copy a data carrier's child nodes into `target`, replacing whatever was
 * there before.
 *
 * The nodes are cloned rather than moved, because the carrier stays in the
 * light DOM as the component's source of truth (see {@link observeItems}) and
 * must keep its own content to re-sync from. Cloning an `id` would put the
 * same one in the document twice, which is invalid HTML and quietly breaks
 * `getElementById` and every `label[for]` pointing at it — so ids are dropped
 * from the copy. The authored element keeps its id and remains the one a page
 * script addresses; edits to it flow back through the observer.
 */
export function cloneItemBody(item: Element, target: Element): void {
  const fragment = document.createDocumentFragment();
  for (const node of item.childNodes) fragment.appendChild(node.cloneNode(true));
  for (const el of fragment.querySelectorAll('[id]')) el.removeAttribute('id');
  target.replaceChildren(fragment);
}

/* ----------------------------------------------------------------------- *
 * Reactive patch helpers (E-paper friendly).
 *
 * These helpers mutate the DOM only when the new value actually differs from
 * the current value. That keeps the dirty-rectangle small so the EPDC can
 * choose a fast partial-refresh waveform (DU/A2, ~30-80 ms) instead of a
 * full GC16 flash (~200-800 ms). They never replace whole subtrees: child
 * nodes keep their identity, which is exactly what e-paper browsers reward.
 * ----------------------------------------------------------------------- */

/** Set `node.textContent` only if it changed. */
export function patchText(node: Node, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

/** Set or remove an attribute only if the value actually changed. */
export function patchAttr(el: Element, name: string, value: string | null | undefined): void {
  const cur = el.getAttribute(name);
  if (value == null) {
    if (cur !== null) el.removeAttribute(name);
  } else if (cur !== value) {
    el.setAttribute(name, value);
  }
}

/** Toggle a boolean attribute. */
export function patchBoolAttr(el: Element, name: string, on: boolean): void {
  const has = el.hasAttribute(name);
  if (on && !has) el.setAttribute(name, '');
  else if (!on && has) el.removeAttribute(name);
}

/**
 * Maintain a single class with the given `prefix` (e.g. `ink-btn--`). Removes
 * any existing class starting with `prefix` and adds `prefix + modifier` when
 * `modifier` is non-null. Other classes are preserved.
 */
export function patchClassModifier(el: Element, prefix: string, modifier: string | null): void {
  for (const c of [...el.classList]) {
    if (c.startsWith(prefix) && c !== prefix + modifier) {
      el.classList.remove(c);
    }
  }
  if (modifier && !el.classList.contains(prefix + modifier)) {
    el.classList.add(prefix + modifier);
  }
}

/** Wrap current children in a new element; returns the wrapper. */
export function captureWrap(host: HTMLElement, tag = 'span'): HTMLElement {
  const wrap = document.createElement(tag);
  while (host.firstChild) wrap.appendChild(host.firstChild);
  host.appendChild(wrap);
  return wrap;
}

/** Current eyebrow/title child elements tracked by {@link syncEyebrowTitle}'s caller. */
export interface EyebrowTitleRefs {
  eyebrow: HTMLElement | null;
  titleEl: HTMLElement | null;
}

/**
 * Shared by `e-card` and `e-card-image`: syncs the optional eyebrow label and
 * title heading inside a card header's left column, creating/removing each
 * element only as needed. Returns the (possibly updated) refs for the caller
 * to store back on its instance.
 */
export function syncEyebrowTitle(
  left: HTMLElement,
  eyebrow: string | null,
  title: string | null,
  refs: EyebrowTitleRefs,
): EyebrowTitleRefs {
  let { eyebrow: eyebrowEl, titleEl } = refs;
  if (eyebrow) {
    if (!eyebrowEl) {
      eyebrowEl = document.createElement('div');
      eyebrowEl.className = 'ink-card__eyebrow';
      left.insertBefore(eyebrowEl, left.firstChild);
    }
    patchText(eyebrowEl, eyebrow);
  } else if (eyebrowEl) {
    eyebrowEl.remove();
    eyebrowEl = null;
  }
  if (title) {
    if (!titleEl) {
      titleEl = document.createElement('h3');
      titleEl.className = 'ink-card__title';
      left.appendChild(titleEl);
    }
    patchText(titleEl, title);
  } else if (titleEl) {
    titleEl.remove();
    titleEl = null;
  }
  return { eyebrow: eyebrowEl, titleEl };
}
