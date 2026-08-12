// Screenshot harness: renders every Storybook story once and captures a PNG
// into `__screenshots__/screenshots.test.ts/<title>--<storyName>.png`.
//
// Why this exists:
//   • We don't use Chromatic. This test gives us a versioned visual record
//     of every component without paying for a SaaS pipeline.
//   • The test is intentionally tolerant: any single story that throws
//     during render is logged and skipped, never failing the suite. The
//     goal is "have an image", not "match a baseline".
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
import { afterEach, beforeAll, describe, it } from 'vitest';
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function collectStories(): StoryEntry[] {
  const modules = import.meta.glob<StoryModule>('../../stories/**/*.stories.ts', {
    eager: true,
  });
  const out: StoryEntry[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const meta = mod.default;
    if (!meta || typeof meta.render !== 'function') continue;
    const title = meta.title ?? path;

    // Default args from argTypes (used when story doesn't provide its own).
    const argTypeDefaults: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta.argTypes ?? {})) {
      if (v && typeof v === 'object' && 'defaultValue' in v) {
        argTypeDefaults[k] = (v as { defaultValue?: unknown }).defaultValue;
      }
    }

    for (const [exportName, value] of Object.entries(mod as Record<string, unknown>)) {
      if (exportName === 'default') continue;
      const story = value as { args?: Record<string, unknown> } | undefined;
      if (!story || typeof story !== 'object') continue;
      const args = { ...argTypeDefaults, ...meta.args, ...(story.args ?? {}) };
      try {
        const template = meta.render(args);
        out.push({ title, storyName: exportName, template });
      } catch (err) {
        console.warn(`[screenshots] render failed for ${title} / ${exportName}:`, err);
      }
      // Only first story per title — one image per component is enough.
      break;
    }
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
      try {
        render(entry.template, container);
        await nextFrame();
      } catch (err) {
        console.warn(`[screenshots] mount failed for ${file}:`, err);
      }
      try {
        await page.screenshot({
          element: container,
          path: `__screenshots__/${file}.png`,
          save: true,
        });
      } catch (err) {
        console.warn(`[screenshots] capture failed for ${file}:`, err);
      }
    });
  }
});
