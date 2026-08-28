import remarkGfm from 'remark-gfm';
import type { StorybookConfig } from '@storybook/web-components-vite';

// Stories live in packages/epaper-components/src/stories — co-located with
// the components they document, per this repo's convention — not inside
// this app. This config only owns the Storybook runner.
const config: StorybookConfig = {
  stories: [
    '../../../packages/epaper-components/src/stories/**/*.stories.ts',
    '../../../packages/epaper-components/src/stories/**/*.mdx',
  ],
  framework: '@storybook/web-components-vite',
  addons: [
    '@storybook/addon-a11y',
    // GFM tables and strikethrough aren't enabled by default in addon-docs'
    // MDX compiler — without this, `| a | b |` tables in .mdx files render
    // as a flat run of text instead of an actual <table>.
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    '@storybook/addon-vitest',
  ],
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
