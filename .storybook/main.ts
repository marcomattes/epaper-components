import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.ts", "../src/stories/**/*.mdx"],
  framework: "@storybook/html-vite",
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  docs: {
    autodocs: "tag",
  },
  async viteFinal(config) {
    // Allow deploying under a sub-path (e.g., GitHub Pages /storybook/)
    const base = process.env.STORYBOOK_BASE || "/";
    return {
      ...config,
      base,
    };
  },
};

export default config;
