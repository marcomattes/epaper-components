// Build-time GitHub star count for the marketing site.
//
// The cover used to hard-code "1.2k", which was never true and never updated.
// The site build now asks the GitHub REST API for the real number and bakes
// it into the static HTML. No client-side request is made — the deployed page
// stays a plain static document that renders the count on first paint.
//
// The API is anonymous by default (60 requests/hour/IP, plenty for a build).
// Set GITHUB_TOKEN to lift that to 5000/hour on shared CI runners.
//
// Every failure path falls back to FALLBACK_STARS instead of breaking the
// build: a landing page must still deploy when GitHub is unreachable.

/** Repository the cover reports on. */
export const REPO = 'marcomattes/epaper-components';

/**
 * Last known count, committed so offline builds and API outages still render
 * a plausible number. Refreshed whenever someone touches this file — it is a
 * floor, not the source of truth.
 */
export const FALLBACK_STARS = 29;

/**
 * Format a star count the way GitHub's own UI does:
 * 29 → "29", 1240 → "1.2k", 5000 → "5k", 12400 → "12k".
 *
 * @param {number} count
 * @returns {string}
 */
export function formatStars(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return String(FALLBACK_STARS);
  if (n < 1000) return String(Math.round(n));
  const k = n / 1000;
  // One decimal below 10k (1.2k), whole thousands above (12k).
  const rounded = k < 10 ? Math.round(k * 10) / 10 : Math.round(k);
  return `${rounded}k`;
}

/**
 * Resolve the star count for a build.
 *
 * Resolution order:
 *   1. GITHUB_STARS env var — escape hatch for offline/reproducible builds.
 *   2. GitHub REST API.
 *   3. FALLBACK_STARS.
 *
 * @param {{ repo?: string, token?: string, timeoutMs?: number }} [opts]
 * @returns {Promise<{ count: number, source: 'env' | 'api' | 'fallback', reason?: string }>}
 */
export async function resolveStars(opts = {}) {
  const repo = opts.repo ?? REPO;
  const token = opts.token ?? process.env['GITHUB_TOKEN'] ?? '';
  const timeoutMs = opts.timeoutMs ?? 5000;

  const override = process.env['GITHUB_STARS'];
  if (override != null && override !== '') {
    const n = Number(override);
    if (Number.isFinite(n) && n >= 0) return { count: Math.round(n), source: 'env' };
  }

  // AbortSignal.timeout keeps a hanging proxy from stalling the whole build.
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'epaper-components-site-build',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers, signal });
    if (!res.ok) {
      return { count: FALLBACK_STARS, source: 'fallback', reason: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const count = body?.stargazers_count;
    if (!Number.isFinite(count)) {
      return {
        count: FALLBACK_STARS,
        source: 'fallback',
        reason: 'no stargazers_count in response',
      };
    }
    return { count, source: 'api' };
  } catch (err) {
    return { count: FALLBACK_STARS, source: 'fallback', reason: String(err?.message ?? err) };
  }
}
