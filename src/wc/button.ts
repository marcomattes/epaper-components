import {
  attrBoolean,
  defineIfNeeded,
  ensureInnerButton,
  syncClassList,
} from "./base.js";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "lg" | "default";

const TAG = "epaper-button";

/** Light-DOM custom element that wraps a native <button> and maps attributes to epaper classes. */
export class EpaperButtonElement extends HTMLElement {
  static get observedAttributes() {
    return [
      "variant",
      "size",
      "disabled",
      "aria-label",
      "aria-pressed",
      "aria-expanded",
      "aria-haspopup",
    ];
  }

  #btn: HTMLButtonElement | null = null;

  connectedCallback() {
    this.#ensure();
    this.#sync();
  }

  attributeChangedCallback() {
    this.#sync();
  }

  #ensure() {
    if (!this.#btn) {
      this.#btn = ensureInnerButton(this);
      this.#btn.addEventListener("click", (ev) => {
        if (this.disabled) ev.stopImmediatePropagation();
      });
    }
  }

  #sync() {
    if (!this.#btn) return;
    const classes = ["epaper-btn"];

    const variant = this.getAttribute("variant") as ButtonVariant | null;
    if (variant) classes.push(`epaper-btn--${variant}`);

    const size = (this.getAttribute("size") as ButtonSize | null) || "default";
    if (size && size !== "default") classes.push(`epaper-btn--${size}`);

    syncClassList(this.#btn, classes);
    this.#btn.disabled = this.disabled;

    for (const attr of [
      "aria-label",
      "aria-pressed",
      "aria-expanded",
      "aria-haspopup",
    ] as const) {
      const val = this.getAttribute(attr);
      if (val !== null) this.#btn.setAttribute(attr, val);
      else this.#btn.removeAttribute(attr);
    }
  }

  get disabled(): boolean {
    return attrBoolean(this, "disabled");
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
}

export const defineEpaperButton = () => defineIfNeeded(TAG, EpaperButtonElement);
