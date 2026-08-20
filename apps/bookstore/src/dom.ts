// Tiny DOM builders for the shop.
//
// Everything on this page is assembled with `document.createElement`, never
// with `innerHTML`: interpolated product copy therefore cannot be parsed as
// markup, and each update touches a node instead of re-parsing a subtree.
//
// Building is always bottom-up — children are appended to a detached parent
// and the finished tree is inserted last. That matters here more than in a
// plain app: most EPaper compound components read their `<e-tab>` /
// `<e-option>` / `<e-desc-item>` children once, in `connectedCallback`, so a
// child appended after the parent entered the document would never be picked
// up.

export type Attrs = Record<string, string | number | boolean | null | undefined>;
export type Child = Node | string | number | null | false | undefined;

/** Append `children`, skipping the falsy entries a conditional expression leaves behind. */
export function append(parent: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child == null || child === false || child === '') continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

/**
 * Create an element with attributes and children.
 *
 * Works for custom elements too — `h('e-button', …)` is just
 * `createElement('e-button')`, which upgrades immediately because
 * `src/main.ts` imports the library before any view is built.
 */
export function h(tag: string, attrs: Attrs = {}, children: readonly Child[] = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  append(node, children);
  return node;
}

/** `h()` for elements whose only content is one run of text. */
export function t(tag: string, attrs: Attrs, text: string): HTMLElement {
  const node = h(tag, attrs);
  node.textContent = text;
  return node;
}

/** A `<div>` with a class and children — the shop's most common wrapper. */
export function div(className: string, children: readonly Child[] = []): HTMLElement {
  return h('div', { class: className }, children);
}

/** Section eyebrow: the small mono label the whole shop uses above a heading. */
export function eyebrow(text: string): HTMLElement {
  return t('e-text', { kind: 'label', class: 'shop-eyebrow' }, text);
}

/** Subscribe to a `CustomEvent`, handing the callback its typed `detail`. */
export function onDetail<D>(
  target: EventTarget,
  type: string,
  handler: (detail: D, event: CustomEvent<D>) => void,
): void {
  target.addEventListener(type, (event) => {
    const custom = event as CustomEvent<D>;
    handler(custom.detail, custom);
  });
}

/** Replace `current` with `next` in the document and return `next`. */
export function swap<T extends Element>(current: Element, next: T): T {
  current.replaceWith(next);
  return next;
}

/** Set `textContent` only when it differs, keeping the repainted area minimal. */
export function setText(node: Node, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

/** Set or remove an attribute only when the value actually changes. */
export function setAttr(el: Element, name: string, value: string | null): void {
  if (value == null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

/** Add a boolean attribute, if it isn't already present. */
export function addFlag(el: Element, name: string): void {
  if (!el.hasAttribute(name)) el.setAttribute(name, '');
}

/** Remove a boolean attribute, if it is present. */
export function removeFlag(el: Element, name: string): void {
  if (el.hasAttribute(name)) el.removeAttribute(name);
}

/** Add or remove a boolean attribute only when it changes. */
export function setFlag(el: Element, name: string, on: boolean): void {
  el.toggleAttribute(name, on);
}

/**
 * Read the `value` property of a form-associated EPaper control.
 *
 * `<e-input>` and `<e-textarea>` deliberately do not reflect typing back to
 * the `value` attribute — the property is their documented public surface, so
 * that is what is read here.
 */
export function fieldValue(el: Element): string {
  const value = (el as { value?: unknown }).value;
  return typeof value === 'string' ? value : '';
}

/** Ask a form-associated control whether it currently satisfies its constraints. */
export function isValid(el: Element): boolean {
  const control = el as { checkValidity?: () => boolean };
  return typeof control.checkValidity === 'function' ? control.checkValidity() : true;
}

/** Ask a control to show its own constraint violation, the browser's way. */
export function reportValidity(el: Element): void {
  const control = el as { reportValidity?: () => boolean };
  if (typeof control.reportValidity === 'function') control.reportValidity();
}

/** The message a control would report for its current violation, if any. */
export function validationMessage(el: Element): string {
  const control = el as { validationMessage?: unknown };
  return typeof control.validationMessage === 'string' ? control.validationMessage : '';
}
