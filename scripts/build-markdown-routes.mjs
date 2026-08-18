import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

  await Promise.all(
    targets.map((target) => writeFile(join(distDir, target.file), target.markdown, 'utf8')),
  );
  return targets.map((target) => target.file);
}
