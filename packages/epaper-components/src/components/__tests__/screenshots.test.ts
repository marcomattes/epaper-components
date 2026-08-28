// Visual-regression harness: renders one representative story per component
// and compares it with the committed PNG baseline.
//
// Why this exists:
//   • We don't use Chromatic. This test gives us a versioned visual record
//     of every component without paying for a SaaS pipeline.
//   • Render, mount and pixel differences fail the suite.
//   • Run with `npm run test:ci -- screenshots` (or as part of the unit
//     project, since stories ship Lit templates that we render directly).
//
// How:
//   • Discover all `*.stories.ts` files via Vite's `import.meta.glob`.
//   • Combine `meta.args` + first story's `args` and call `meta.render`
//     to obtain a Lit TemplateResult.
//   • Mount it into a fresh container, await two frames so custom-element
//     upgrades can run, then call `page.screenshot({ element, path })`.
/// <reference types="vite/client" />
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render, type TemplateResult } from 'lit';

// Side-effect import: register every custom element before the first story
// is rendered.
import '../../index';
import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/components.css';

interface StoryModule {
  default?: {
    title?: string;
    args?: Record<string, unknown>;
    argTypes?: Record<string, { defaultValue?: unknown }>;
    render?: (args: Record<string, unknown>) => TemplateResult;
  };
  [key: string]: unknown;
}

interface StoryEntry {
  title: string;
  storyName: string;
  template: TemplateResult;
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/g, '-')
    // Single unquantified characters: `/^-+|-+$/` backtracks super-linearly,
    // and the collapse above already rules out repeats.
    .replace(/^-/, '')
    .replace(/-$/, '');

/** Default args from argTypes, used when a story provides none of its own. */
function argTypeDefaults(meta: NonNullable<StoryModule['default']>): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta.argTypes ?? {})) {
    if (v && typeof v === 'object' && 'defaultValue' in v) {
      defaults[k] = (v as { defaultValue?: unknown }).defaultValue;
    }
  }
  return defaults;
}

/** The first real story export in a module — one representative per component. */
function firstStory(
  mod: StoryModule,
  meta: NonNullable<StoryModule['default']>,
  title: string,
): StoryEntry | null {
  const defaults = argTypeDefaults(meta);
  for (const [exportName, value] of Object.entries(mod as Record<string, unknown>)) {
    if (exportName === 'default') continue;
    const story = value as { args?: Record<string, unknown> } | undefined;
    if (!story || typeof story !== 'object') continue;
    const args = { ...defaults, ...meta.args, ...(story.args ?? {}) };
    return { title, storyName: exportName, template: meta.render!(args) };
  }
  return null;
}

function collectStories(): StoryEntry[] {
  const modules = import.meta.glob<StoryModule>('../../stories/**/*.stories.ts', {
    eager: true,
  });
  const out: StoryEntry[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const meta = mod.default;
    if (!meta || typeof meta.render !== 'function') continue;
    const entry = firstStory(mod, meta, meta.title ?? path);
    if (entry) out.push(entry);
  }
  return out;
}

const stories = collectStories();

let container: HTMLDivElement;

beforeAll(() => {
  // Light background so ink-on-paper components show up correctly.
  document.body.style.background = '#fff';
});

afterEach(() => {
  if (container?.parentNode) container.parentNode.removeChild(container);
});

const nextFrame = (): Promise<void> =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

describe('storybook screenshots', () => {
  for (const entry of stories) {
    const file = `${slug(entry.title)}--${slug(entry.storyName)}`;
    it(file, async () => {
      container = document.createElement('div');
      container.className = 'ink-page';
      container.style.cssText =
        'background:#fff;color:#000;padding:24px;display:inline-block;min-width:320px;';
      document.body.appendChild(container);
      render(entry.template, container);
      await nextFrame();
      await expect.element(page.elementLocator(container)).toMatchScreenshot(file, {
        comparatorName: 'pixelmatch',
        comparatorOptions: { allowedMismatchedPixelRatio: 0.001 },
      });
    });
  }
});
