type Modifier =
  | { attr: string; type: "boolean"; className?: string }
  | {
      attr: string;
      type: "enum";
      values: readonly string[];
      classPrefix?: string;
      defaultValue?: string;
    };

type StyleVar = { attr: string; cssVar: string };

interface ComponentConfig {
  tag: string;
  baseClass: string;
  modifiers?: readonly Modifier[];
  styleVars?: readonly StyleVar[];
  ariaDefaults?: Record<string, string>;
}

const EPAPER_PREFIX = "epaper-";

const computeClasses = (host: HTMLElement, config: ComponentConfig): string[] => {
  const classes = [config.baseClass];

  (config.modifiers || []).forEach((mod) => {
    if (mod.type === "boolean") {
      const on = host.hasAttribute(mod.attr);
      if (on) classes.push(mod.className ?? `${config.baseClass}--${mod.attr}`);
    } else {
      const value = host.getAttribute(mod.attr);
      if (!value) return;
      if (!mod.values.includes(value)) return;
      if (mod.defaultValue && value === mod.defaultValue) return;
      const prefix = mod.classPrefix ?? `${config.baseClass}--`;
      classes.push(`${prefix}${value}`);
    }
  });

  return classes;
};

const applyStyleVars = (host: HTMLElement, config: ComponentConfig) => {
  (config.styleVars || []).forEach(({ attr, cssVar }) => {
    const val = host.getAttribute(attr);
    if (val) {
      host.style.setProperty(cssVar, val);
    } else {
      host.style.removeProperty(cssVar);
    }
  });
};

/** Create a light-DOM component that just manages classes/vars on its host. */
export const defineClassComponent = (config: ComponentConfig) => {
  const observed = [
    ...(config.modifiers?.map((m) => m.attr) ?? []),
    ...(config.styleVars?.map((v) => v.attr) ?? []),
  ];

  class EpaperClassComponent extends HTMLElement {
    static get observedAttributes() {
      return observed;
    }

    connectedCallback() {
      if (config.ariaDefaults) {
        for (const [attr, val] of Object.entries(config.ariaDefaults)) {
          if (!this.hasAttribute(attr)) this.setAttribute(attr, val);
        }
      }
      this.#sync();
    }

    attributeChangedCallback() {
      this.#sync();
    }

    #sync() {
      const keep = Array.from(this.classList).filter(
        (c) => !c.startsWith(EPAPER_PREFIX)
      );
      const next = computeClasses(this, config);
      this.className = [...keep, ...next].join(" ").trim();
      applyStyleVars(this, config);
    }
  }

  if (!customElements.get(config.tag)) {
    customElements.define(config.tag, EpaperClassComponent);
  }
};
