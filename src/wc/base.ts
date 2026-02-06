const EINK_PREFIX = "eink-";

/** Remove any existing eink-* classes then re-apply the desired ones, preserving third-party classes. */
export const syncClassList = (el: HTMLElement, next: string[]): void => {
  const keep = Array.from(el.classList).filter((cls) => !cls.startsWith(EINK_PREFIX));
  el.className = [...keep, ...next].join(" ").trim();
};

/** Helper to read a booleanish attribute. */
export const attrBoolean = (el: Element, name: string): boolean =>
  el.hasAttribute(name) &&
  el.getAttribute(name) !== "false" &&
  el.getAttribute(name) !== "0";

/** Ensure a child button exists; reuse if already created. */
export const ensureInnerButton = (host: HTMLElement): HTMLButtonElement => {
  const existing = host.querySelector("button");
  if (existing) return existing as HTMLButtonElement;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("eink-btn");

  // Move any existing child nodes into the button to preserve content.
  while (host.firstChild) {
    btn.appendChild(host.firstChild);
  }

  host.appendChild(btn);
  return btn;
};

/** Guarded registration to avoid double-define in HMR / multiple bundles. */
export const defineIfNeeded = (tag: string, ctor: CustomElementConstructor) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
};
