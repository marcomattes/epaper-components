import { defineClassComponent } from "./component-factory.js";
import { defineIfNeeded, syncClassList } from "./base.js";

export const definePrimitiveComponents = () => {
  defineClassComponent({
    tag: "eink-container",
    baseClass: "eink-container",
    modifiers: [
      {
        attr: "width",
        type: "enum",
        values: ["wide", "narrow"],
        defaultValue: "default",
      },
    ],
  });

  defineClassComponent({
    tag: "eink-stack",
    baseClass: "eink-stack",
    modifiers: [{ attr: "gap", type: "enum", values: ["sm", "lg"] }],
  });

  defineClassComponent({
    tag: "eink-cluster",
    baseClass: "eink-cluster",
    styleVars: [{ attr: "gap", cssVar: "--eink-cluster-gap" }],
  });

  defineClassComponent({
    tag: "eink-grid",
    baseClass: "eink-grid",
    styleVars: [{ attr: "min", cssVar: "--eink-grid-min" }],
  });

  defineClassComponent({
    tag: "eink-divider",
    baseClass: "eink-divider",
    modifiers: [{ attr: "strong", type: "boolean", className: "eink-divider--strong" }],
    ariaDefaults: { role: "separator" },
  });

  defineClassComponent({
    tag: "eink-section",
    baseClass: "eink-section",
  });

  defineClassComponent({
    tag: "eink-page-header",
    baseClass: "eink-page-header",
  });

  defineClassComponent({
    tag: "eink-page-footer",
    baseClass: "eink-page-footer",
  });

  defineClassComponent({
    tag: "eink-card",
    baseClass: "eink-card",
    modifiers: [{ attr: "raised", type: "boolean", className: "eink-card--raised" }],
  });

  // eink-alert uses a custom class to set role dynamically based on variant
  class EinkAlertElement extends HTMLElement {
    static get observedAttributes() {
      return ["variant"];
    }

    #userRole = false;

    connectedCallback() {
      // Track whether the user supplied a role in markup
      this.#userRole = this.hasAttribute("role");
      this.#sync();
    }

    attributeChangedCallback() {
      this.#sync();
    }

    #sync() {
      const classes = ["eink-alert"];
      const variant = this.getAttribute("variant");
      if (variant && ["info", "success", "warning", "error"].includes(variant)) {
        classes.push(`eink-alert--${variant}`);
      }
      syncClassList(this, classes);

      // Auto-set role: "alert" for error, "status" for everything else
      if (!this.#userRole) {
        this.setAttribute("role", variant === "error" ? "alert" : "status");
      }
    }
  }
  defineIfNeeded("eink-alert", EinkAlertElement);

  defineClassComponent({
    tag: "eink-tag",
    baseClass: "eink-tag",
    modifiers: [{ attr: "variant", type: "enum", values: ["filled", "muted"] }],
  });

  defineClassComponent({
    tag: "eink-badge",
    baseClass: "eink-badge",
  });
};
