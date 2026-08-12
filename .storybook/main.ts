import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.ts', '../src/stories/**/*.mdx'],
  framework: '@storybook/web-components-vite',
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs', '@storybook/addon-vitest'],
  // No `docs.autodocs` — it was removed in Storybook 8; stories opt in with
  // `tags: ['autodocs']` instead, which every story in src/stories already does.
  async viteFinal(config) {
    // Allow deploying under a sub-path (the site serves Storybook at /storybook/).
    const base = process.env['STORYBOOK_BASE'] || '/';
    return {
      ...config,
      base,
    };
  },
};

export default config;
