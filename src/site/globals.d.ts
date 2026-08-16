/// <reference types="vite/client" />

// Vite handles CSS side-effect imports; tell TS to treat them as opaque modules.
declare module '*.css';

/**
 * GitHub star count, already formatted ("29", "1.2k"). Replaced at build time
 * by the `define` in vite.site.config.ts — see scripts/github-stars.mjs.
 */
declare const __GITHUB_STARS__: string;

/** Package version from package.json, injected by vite.site.config.ts. */
declare const __SITE_VERSION__: string;
