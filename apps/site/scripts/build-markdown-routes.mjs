import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Write per-route markdown alternates from the build manifest.
 *
 * @param {string} distDir
 * @param {Array<{ markdownPath?: string, markdown?: string }>} routes
 * @returns {Promise<string[]>}
 */
export async function buildMarkdownRoutes(distDir, routes) {
  const targets = routes
    .map((route) =>
      route.markdownPath && route.markdown
        ? { file: route.markdownPath.replace(/^\/+/, ''), markdown: route.markdown }
        : undefined,
    )
    .filter((target) => target !== undefined);

  // Article alternates are nested (`guides/partial-refresh.md`). The HTML
  // pass happens to create those directories first, but relying on that would
  // make this function break the moment it is called on its own.
  await Promise.all(
    targets.map(async (target) => {
      const out = join(distDir, target.file);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, target.markdown, 'utf8');
    }),
  );
  return targets.map((target) => target.file);
}
