import {
  attrBoolean,
  defineIfNeeded,
  ensureInnerButton,
  syncClassList,
} from "./base.js";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "lg" | "default";

const TAG = "eink-button";

/** Light-DOM custom element that wraps a native <button> and maps attributes to eink classes. */
export class EinkButtonElement extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "size", "disabled"];
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
    const classes = ["eink-btn"];

    const variant = this.getAttribute("variant") as ButtonVariant | null;
    if (variant) classes.push(`eink-btn--${variant}`);

    const size = (this.getAttribute("size") as ButtonSize | null) || "default";
    if (size && size !== "default") classes.push(`eink-btn--${size}`);

    syncClassList(this.#btn, classes);
    this.#btn.disabled = this.disabled;
  }

  get disabled(): boolean {
    return attrBoolean(this, "disabled");
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
}

export const defineEinkButton = () => defineIfNeeded(TAG, EinkButtonElement);
