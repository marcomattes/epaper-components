import type { Preview } from "@storybook/html";
import "../src/scss/eink-ui.tokens.scss";
import "../src/scss/eink-ui.base.scss";
import "../src/scss/eink-ui.components.scss";
import { defineEinkElements } from "../src/wc/index";

// Register custom elements once for all stories (guarded inside defineIfNeeded).
defineEinkElements();

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "E-Ink theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "default", title: "Default" },
          { value: "inverted", title: "Inverted" },
          { value: "high-contrast", title: "High Contrast" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "default",
  },
  decorators: [
    (story, context) => {
      const theme = context.globals.theme || "default";
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-theme", theme);
      wrapper.style.backgroundColor = "var(--eink-bg)";
      wrapper.style.color = "var(--eink-fg)";
      wrapper.style.padding = "var(--eink-space-4)";
      const content = story();
      if (typeof content === "string") {
        wrapper.innerHTML = content;
      } else if (content instanceof Node) {
        wrapper.appendChild(content);
      }
      return wrapper;
    },
  ],
  parameters: {
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          "Layout (Docs)",
          "Tokens & Themes",
          "Colors & Themes",
          "Web Components (Docs)",
          "Foundations",
          "Components",
          "Forms",
          "Tables",
          "Web Components",
        ],
      },
    },
  },
};

export default preview;
