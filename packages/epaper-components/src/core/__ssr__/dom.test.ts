// Server-side behaviour of core/dom.ts.
//
// Runs in the `ssr` Vitest project, whose environment is Node rather than a
// browser — see vitest.config.ts. That is the point: these are the code paths
// that only exist because a server render has no DOM, so a browser can never
// reach them. A framework (Next.js, Nuxt, Astro, SvelteKit) evaluates every
// module it pulls into a render, including from a `'use client'` file, and
// before this the `extends` clause alone was enough to throw
// `ReferenceError: HTMLElement is not defined` and take the route down.
//
// The sibling ../dom.test.ts covers the same two exports from the browser
// side, where `EpaperElement` must be `HTMLElement` itself.
import { describe, it, expect } from 'vitest';

import { define, EpaperElement } from '../dom';

describe('core/dom without a DOM', () => {
  it('has no DOM globals to fall back on', () => {
    // Guards the guard: if some future setup file defined these, every
    // assertion below would pass for the wrong reason and the regression this
    // file exists to catch would sail through.
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    expect(typeof globalThis.customElements).toBe('undefined');
  });

  it('exports a stand-in base class that is extensible', () => {
    expect(typeof EpaperElement).toBe('function');
    class Host extends EpaperElement {}
    // Never instantiated in a real server render — an upgrade needs a
    // document — but constructing it here proves the stand-in is a usable
    // base rather than something that merely satisfies the type.
    expect(new Host()).toBeInstanceOf(Host);
  });

  it('skips registration instead of throwing', () => {
    class Host extends EpaperElement {}
    expect(() => define('e-ssr-probe', Host)).not.toThrow();
  });

  it('does not install DOM globals of its own', () => {
    // A library that shims `globalThis.HTMLElement` breaks the next thing to
    // install a real DOM: its classes are already bound to the fake base.
    // Importing this module must leave the environment as it found it.
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    expect(typeof globalThis.customElements).toBe('undefined');
  });
});
