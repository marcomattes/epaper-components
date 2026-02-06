import { attrBoolean, defineIfNeeded, syncClassList } from "./base.js";

const inputAttrs = [
  "type",
  "name",
  "value",
  "placeholder",
  "autocomplete",
  "aria-invalid",
  "required",
];

const observedCommon = ["disabled", ...inputAttrs];

abstract class BaseInputElement extends HTMLElement {
  protected input!: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  protected abstract createControl():
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;
  protected abstract baseClass(): string;

  static get observedAttributes() {
    return observedCommon;
  }

  connectedCallback() {
    this.#ensure();
    this.#sync();
  }

  attributeChangedCallback() {
    this.#sync();
  }

  #ensure() {
    if (!this.input) {
      this.input = this.createControl();
      // Move existing children inside to preserve text/option content if present.
      while (this.firstChild) this.input.appendChild(this.firstChild);
      this.appendChild(this.input);
    }
  }

  #sync() {
    if (!this.input) return;
    syncClassList(this.input as HTMLElement, [this.baseClass()]);

    // Transfer common attrs
    inputAttrs.forEach((attr) => {
      const val = this.getAttribute(attr);
      if (val !== null) {
        this.input.setAttribute(attr, val);
      } else {
        this.input.removeAttribute(attr);
      }
    });

    (this.input as any).disabled = this.disabled;
  }

  get disabled() {
    return attrBoolean(this, "disabled");
  }

  set disabled(v: boolean) {
    if (v) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
}

export class EinkInputElement extends BaseInputElement {
  protected createControl(): HTMLInputElement {
    const input = document.createElement("input");
    input.type = this.getAttribute("type") ?? "text";
    return input;
  }
  protected baseClass() {
    return "eink-input";
  }
}

export class EinkTextareaElement extends BaseInputElement {
  protected createControl(): HTMLTextAreaElement {
    return document.createElement("textarea");
  }
  protected baseClass() {
    return "eink-textarea";
  }
}

export class EinkSelectElement extends BaseInputElement {
  static override get observedAttributes() {
    return ["disabled", "name", "aria-invalid", "required"];
  }

  protected createControl(): HTMLSelectElement {
    return document.createElement("select");
  }
  protected baseClass() {
    return "eink-select";
  }
}

export class EinkCheckboxElement extends HTMLElement {
  static get observedAttributes() {
    return ["checked", "disabled", "name", "value", "aria-invalid", "required"];
  }

  #input: HTMLInputElement | null = null;

  connectedCallback() {
    this.#ensure();
    this.#sync();
  }

  attributeChangedCallback() {
    this.#sync();
  }

  #ensure() {
    if (!this.#input) {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.classList.add("eink-checkbox");
      input.addEventListener("change", () => {
        this.checked = input.checked;
      });
      // move any text nodes/labels after the checkbox
      this.insertBefore(input, this.firstChild);
      this.#input = input;
    }
  }

  #sync() {
    if (!this.#input) return;
    this.#input.checked = this.checked;
    this.#input.disabled = this.disabled;
    ["name", "value", "aria-invalid", "required"].forEach((attr) => {
      const val = this.getAttribute(attr);
      if (val !== null) this.#input!.setAttribute(attr, val);
      else this.#input!.removeAttribute(attr);
    });
  }

  get checked() {
    return attrBoolean(this, "checked");
  }
  set checked(v: boolean) {
    if (v) this.setAttribute("checked", "");
    else this.removeAttribute("checked");
  }
  get disabled() {
    return attrBoolean(this, "disabled");
  }
  set disabled(v: boolean) {
    if (v) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
}

export class EinkRadioElement extends HTMLElement {
  static get observedAttributes() {
    return ["checked", "disabled", "name", "value", "aria-invalid", "required"];
  }

  #input: HTMLInputElement | null = null;

  connectedCallback() {
    this.#ensure();
    this.#sync();
  }

  attributeChangedCallback() {
    this.#sync();
  }

  #ensure() {
    if (!this.#input) {
      const input = document.createElement("input");
      input.type = "radio";
      input.classList.add("eink-radio");
      input.addEventListener("change", () => {
        this.checked = input.checked;
      });
      this.insertBefore(input, this.firstChild);
      this.#input = input;
    }
  }

  #sync() {
    if (!this.#input) return;
    this.#input.checked = this.checked;
    this.#input.disabled = this.disabled;
    ["name", "value", "aria-invalid", "required"].forEach((attr) => {
      const val = this.getAttribute(attr);
      if (val !== null) this.#input!.setAttribute(attr, val);
      else this.#input!.removeAttribute(attr);
    });
  }

  get checked() {
    return attrBoolean(this, "checked");
  }
  set checked(v: boolean) {
    if (v) this.setAttribute("checked", "");
    else this.removeAttribute("checked");
  }
  get disabled() {
    return attrBoolean(this, "disabled");
  }
  set disabled(v: boolean) {
    if (v) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
}

export const defineFormComponents = () => {
  defineIfNeeded("eink-input", EinkInputElement);
  defineIfNeeded("eink-textarea", EinkTextareaElement);
  defineIfNeeded("eink-select", EinkSelectElement);
  defineIfNeeded("eink-checkbox", EinkCheckboxElement);
  defineIfNeeded("eink-radio", EinkRadioElement);
};
