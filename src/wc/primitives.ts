import { defineClassComponent } from "./component-factory.js";

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

  defineClassComponent({
    tag: "eink-alert",
    baseClass: "eink-alert",
    modifiers: [
      {
        attr: "variant",
        type: "enum",
        values: ["info", "success", "warning", "error"],
      },
    ],
  });

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
