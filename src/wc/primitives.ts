import { defineClassComponent } from "./component-factory.js";
import { defineIfNeeded, syncClassList } from "./base.js";

export const definePrimitiveComponents = () => {
  defineClassComponent({
    tag: "epaper-container",
    baseClass: "epaper-container",
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
    tag: "epaper-stack",
    baseClass: "epaper-stack",
    modifiers: [{ attr: "gap", type: "enum", values: ["sm", "lg"] }],
  });

  defineClassComponent({
    tag: "epaper-cluster",
    baseClass: "epaper-cluster",
    styleVars: [{ attr: "gap", cssVar: "--epaper-cluster-gap" }],
  });

  defineClassComponent({
    tag: "epaper-grid",
    baseClass: "epaper-grid",
    styleVars: [{ attr: "min", cssVar: "--epaper-grid-min" }],
  });

  defineClassComponent({
    tag: "epaper-divider",
    baseClass: "epaper-divider",
    modifiers: [
      { attr: "strong", type: "boolean", className: "epaper-divider--strong" },
    ],
    ariaDefaults: { role: "separator" },
  });

  defineClassComponent({
    tag: "epaper-section",
    baseClass: "epaper-section",
  });

  defineClassComponent({
    tag: "epaper-page-header",
    baseClass: "epaper-page-header",
  });

  defineClassComponent({
    tag: "epaper-page-footer",
    baseClass: "epaper-page-footer",
  });

  defineClassComponent({
    tag: "epaper-card",
    baseClass: "epaper-card",
    modifiers: [{ attr: "raised", type: "boolean", className: "epaper-card--raised" }],
  });

  // epaper-alert uses a custom class to set role dynamically based on variant
  class EpaperAlertElement extends HTMLElement {
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
      const classes = ["epaper-alert"];
      const variant = this.getAttribute("variant");
      if (variant && ["info", "success", "warning", "error"].includes(variant)) {
        classes.push(`epaper-alert--${variant}`);
      }
      syncClassList(this, classes);

      // Auto-set role: "alert" for error, "status" for everything else
      if (!this.#userRole) {
        this.setAttribute("role", variant === "error" ? "alert" : "status");
      }
    }
  }
  defineIfNeeded("epaper-alert", EpaperAlertElement);

  defineClassComponent({
    tag: "epaper-tag",
    baseClass: "epaper-tag",
    modifiers: [{ attr: "variant", type: "enum", values: ["filled", "muted"] }],
  });

  defineClassComponent({
    tag: "epaper-badge",
    baseClass: "epaper-badge",
  });
};
