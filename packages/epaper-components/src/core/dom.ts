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

export const define = (name: string, ctor: CustomElementConstructor): void => {
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
