import type { Preview } from '@storybook/web-components';
import { MINIMAL_VIEWPORTS } from 'storybook/viewport';
import { html } from 'lit';

// The three CSS layers, in cascade order (tokens → base → components).
import '../src/styles/tokens.css';
import '../src/styles/base.css';
import '../src/styles/components.css';

// Side-effect import: registers every `e-*` custom element once for all stories.
import '../src/index';

const einkViewports = {
  kindle6: {
    name: 'Kindle 6"',
    styles: { width: '758px', height: '1024px' },
  },
  kindlePW: {
    name: 'Kindle Paperwhite 6.8"',
    styles: { width: '1236px', height: '1648px' },
  },
  koboSage: {
    name: 'Kobo Sage 8"',
    styles: { width: '1440px', height: '1920px' },
  },
  remarkable2: {
    name: 'reMarkable 2 (10.3")',
    styles: { width: '1404px', height: '1872px' },
  },
};

const preview: Preview = {
  decorators: [
    // `base.css` scopes its reset (no transitions, no animations) to
    // `.ink-page`, so every story has to render inside that scope.
    //
    // The wrapper must itself be a Lit template: every story returns a
    // `TemplateResult`, which only the web-components renderer knows how to
    // commit. Building the wrapper with `document.createElement` and trying
    // to append the story to it silently dropped the content — a
    // `TemplateResult` is neither a string nor a `Node`.
    (story) => html`
      <div
        class="ink-page"
        style="background-color: var(--ink-bg); color: var(--ink-fg); padding: var(--ink-space-4);"
      >
        ${story()}
      </div>
    `,
  ],
  parameters: {
    a11y: {
      test: 'error',
    },
    backgrounds: { disable: true },
    viewport: {
      options: { ...einkViewports, ...MINIMAL_VIEWPORTS },
    },
    options: {
      storySort: {
        // 'Introduction' first so a cold load lands on the intro page rather
        // than on whichever component happens to sort alphabetically first.
        order: [
          'Introduction',
          'Foundations',
          'Primitives',
          'Typography',
          'Display',
          'Inputs',
          'Layout',
          'Navigation',
          'Feedback',
          'Composite',
        ],
      },
    },
  },
};

export default preview;
