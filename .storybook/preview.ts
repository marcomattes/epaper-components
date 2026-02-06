import type { Preview } from "@storybook/html";
import { MINIMAL_VIEWPORTS } from "storybook/viewport";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import "../src/scss/eink-ui.tokens.scss";
import "../src/scss/eink-ui.base.scss";
import "../src/scss/eink-ui.components.scss";
import { defineEinkElements } from "../src/wc/index";

// Register custom elements once for all stories (guarded inside defineIfNeeded).
defineEinkElements();

const einkViewports = {
  kindle6: {
    name: 'Kindle 6"',
    styles: { width: "758px", height: "1024px" },
  },
  kindlePW: {
    name: 'Kindle Paperwhite 6.8"',
    styles: { width: "1236px", height: "1648px" },
  },
  koboSage: {
    name: 'Kobo Sage 8"',
    styles: { width: "1440px", height: "1920px" },
  },
  remarkable2: {
    name: 'reMarkable 2 (10.3")',
    styles: { width: "1404px", height: "1872px" },
  },
};

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: {
        Default: "default",
        Inverted: "inverted",
        "High Contrast": "high-contrast",
      },
      defaultTheme: "Default",
      parentSelector: "body",
      attributeName: "data-theme",
    }),
    (story) => {
      const wrapper = document.createElement("div");
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
    viewport: {
      options: { ...einkViewports, ...MINIMAL_VIEWPORTS },
    },
    options: {
      storySort: {
        order: [
          "Docs",
          ["Tokens & Themes", "Colors & Themes", "Layout", "Web Components"],
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
