// Shared DOM/string helpers used by every component.

export const html = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce<string>((acc, s, i) => acc + s + (values[i] == null ? '' : String(values[i])), '');

export const esc = (s: unknown): string =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const boolAttr = (el: Element, name: string): boolean =>
  el.hasAttribute(name) && el.getAttribute(name) !== 'false';

export function numAttr(el: Element, name: string, dflt: number): number {
  const v = el.getAttribute(name);
  return v == null || v === '' ? dflt : Number(v);
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
): void;
export function onGlobal<K extends keyof WindowEventMap>(
  host: object,
  target: Window,
  type: K,
  listener: (ev: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function onGlobal(
  host: object,
  target: Document | Window,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void {
  target.addEventListener(type, listener, options);
  addCleanup(host, () => target.removeEventListener(type, listener, options));
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
  let mutated = false;
  for (const c of [...el.classList]) {
    if (c.startsWith(prefix) && c !== prefix + modifier) {
      el.classList.remove(c);
      mutated = true;
    }
  }
  if (modifier && !el.classList.contains(prefix + modifier)) {
    el.classList.add(prefix + modifier);
    mutated = true;
  }
  void mutated;
}

/** Wrap current children in a new element; returns the wrapper. */
export function captureWrap(host: HTMLElement, tag = 'span'): HTMLElement {
  const wrap = document.createElement(tag);
  while (host.firstChild) wrap.appendChild(host.firstChild);
  host.appendChild(wrap);
  return wrap;
}
