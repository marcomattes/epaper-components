import { readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

// `resolution` is the remote machine's screen size and is validated per OS by
// BrowserStack: 1440x900 is on the Windows list but not the macOS one, so a
// shared default silently breaks every OS X target at connect time. Keep it
// alongside the OS it belongs to, and at least as large as `context.viewport`.
const WINDOWS_RESOLUTION = '1440x900';
const MAC_RESOLUTION = '1920x1080';

const desktopViewport = { viewport: { width: 1440, height: 900 } };

const platformDefinitions = {
  chrome: {
    label: 'Chrome latest · Windows 11',
    capabilities: {
      browser: 'chrome',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11',
      resolution: WINDOWS_RESOLUTION,
    },
    context: desktopViewport,
  },
  edge: {
    label: 'Edge latest · Windows 11',
    capabilities: {
      browser: 'edge',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11',
      resolution: WINDOWS_RESOLUTION,
    },
    context: desktopViewport,
  },
  firefox: {
    label: 'Playwright Firefox · Windows 11',
    capabilities: {
      browser: 'playwright-firefox',
      os: 'Windows',
      os_version: '11',
      resolution: WINDOWS_RESOLUTION,
    },
    context: desktopViewport,
  },
  webkit: {
    label: 'Playwright WebKit · macOS Tahoe',
    capabilities: {
      browser: 'playwright-webkit',
      os: 'OS X',
      os_version: 'Tahoe',
      resolution: MAC_RESOLUTION,
    },
    context: desktopViewport,
  },
  'mobile-webkit': {
    label: 'Playwright WebKit · iPhone 15 emulation',
    capabilities: {
      browser: 'playwright-webkit',
      os: 'OS X',
      os_version: 'Tahoe',
      resolution: MAC_RESOLUTION,
    },
    context: devices['iPhone 15'],
  },
};

const readArgument = (name) => {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
};

const platformKey = readArgument('platform') ?? process.env.BROWSERSTACK_PLATFORM ?? 'chrome';
const platform = platformDefinitions[platformKey];
const dryRun = process.argv.includes('--dry-run');

if (!platform) {
  throw new Error(
    `Unknown BrowserStack platform "${platformKey}". Expected one of: ${Object.keys(platformDefinitions).join(', ')}`,
  );
}

const requiredEnvironment = ['BROWSERSTACK_USERNAME', 'BROWSERSTACK_ACCESS_KEY'];
if (!dryRun) {
  for (const variable of requiredEnvironment) {
    if (!process.env[variable]) throw new Error(`${variable} is required`);
  }
}

const localBaseUrl = process.env.BROWSERSTACK_INDEX_URL ?? 'http://127.0.0.1:6006';
const remoteBaseUrl = process.env.BROWSERSTACK_BASE_URL ?? 'http://localhost:6006';
const outputDirectory = resolve(repoRoot, 'reports', 'browserstack', platformKey);
const screenshotDirectory = join(outputDirectory, 'screenshots');
const storyTimeout = Number(process.env.BROWSERSTACK_STORY_TIMEOUT ?? 30_000);
const retries = Number(process.env.BROWSERSTACK_STORY_RETRIES ?? 1);

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const RESOURCE_LOAD_FAILURE = /Failed to load resource|net::ERR_|Load failed/i;

const storybookOrigin = new URL(remoteBaseUrl).origin;

function isStorybookOrigin(url) {
  try {
    return new URL(url).origin === storybookOrigin;
  } catch {
    return false;
  }
}

function safeFileName(value) {
  const cleaned = value.replace(/[^a-z0-9._-]+/gi, '-');
  let start = 0;
  while (start < cleaned.length && cleaned[start] === '-') start += 1;
  let end = cleaned.length;
  while (end > start && cleaned[end - 1] === '-') end -= 1;
  return cleaned.slice(start, end);
}

// Declarative authoring API only: the parent reads these as a data source while
// rendering and replaces them with its own markup, so they never survive into
// the rendered DOM. `e-menu` reading `:scope > e-menu-item` and emitting
// `.ink-menu__btn` (src/components/menu/menu.ts) is the canonical example. They are
// registered and stories do use them, but the coverage check cannot observe
// them — excluding them keeps that check meaningful for the elements that do
// render, instead of failing unconditionally. Remove a tag from this list as
// soon as its parent starts keeping the element in the DOM.
const CONSUMED_BY_PARENT = new Set([
  'e-anchor-item',
  'e-breadcrumb-item',
  'e-cbox-option',
  'e-collapse-panel',
  'e-desc-item',
  'e-dropdown-item',
  'e-menu-item',
  'e-option',
  'e-radio',
  'e-segment',
  'e-step',
  'e-tab',
  'e-timeline-item',
]);

async function discoverRegisteredTags() {
  const componentDirectory = resolve(repoRoot, 'packages/epaper-components/src', 'components');
  // Each component lives in its own <name>/<name>.ts folder.
  const componentNames = (await readdir(componentDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const tags = new Set();

  for (const name of componentNames) {
    const file = join(componentDirectory, name, `${name}.ts`);
    let source;
    try {
      source = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    for (const match of source.matchAll(/define\(\s*['"](e-[a-z0-9-]+)['"]/g)) tags.add(match[1]);
  }

  if (tags.size === 0) throw new Error('No registered custom elements found in src/components');
  return [...tags].sort((a, b) => a.localeCompare(b));
}

async function discoverStories() {
  const response = await fetch(`${localBaseUrl}/index.json`);
  if (!response.ok) throw new Error(`Storybook index returned HTTP ${response.status}`);

  const index = await response.json();
  const stories = Object.values(index.entries ?? {})
    .filter((entry) => entry.type === 'story' && entry.tags?.includes('test'))
    .sort((left, right) => left.id.localeCompare(right.id));

  if (stories.length === 0) throw new Error('Storybook index contains no testable stories');
  return stories;
}

function playwrightVersion() {
  return JSON.parse(readFileSync(resolve(repoRoot, 'node_modules/playwright/package.json'), 'utf8'))
    .version;
}

function capabilities(version) {
  const localIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
  const useLocal = process.env.BROWSERSTACK_LOCAL !== 'false';
  return {
    ...platform.capabilities,
    'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
    'browserstack.console': 'errors',
    'browserstack.debug': 'true',
    'browserstack.interactiveDebugging': 'true',
    'browserstack.local': String(useLocal),
    ...(useLocal && localIdentifier ? { 'browserstack.localIdentifier': localIdentifier } : {}),
    'browserstack.networkLogs': 'true',
    'browserstack.playwrightVersion': version,
    'browserstack.username': process.env.BROWSERSTACK_USERNAME,
    'client.playwrightVersion': version,
    build: process.env.BROWSERSTACK_BUILD_NAME ?? `epaper-components-${Date.now()}`,
    name: `All component stories · ${platform.label}`,
    project: process.env.BROWSERSTACK_PROJECT_NAME ?? 'epaper-components',
  };
}

async function markSession(page, status, reason) {
  const command = {
    action: 'setSessionStatus',
    arguments: { reason: reason.slice(0, 255), status },
  };
  // The marker has to reach BrowserStack's proxy verbatim, but it cannot be
  // evaluated as source: `browserstack_executor: {…}` is a labeled statement,
  // and page.evaluate(string) evaluates an *expression*, so every engine
  // rejects it with `SyntaxError: Unexpected token ':'` — WebKit and Chromium
  // alike. BrowserStack's documented form passes the marker as an argument to a
  // no-op function, which puts it in the CDP payload the proxy inspects.
  await page.evaluate(() => {}, `browserstack_executor: ${JSON.stringify(command)}`);
}

// Storybook ships its error-display markup inside iframe.html and keeps it
// `display: none` until a story actually fails, so the element — and its ~1 KB
// of boilerplate advice text — is present on every healthy page. Matching it by
// selector alone therefore fails every story unconditionally; only a box that
// actually has layout is a real render error. Kept as an expression string so
// waitForFunction and evaluate share one definition.
const VISIBLE_ERROR_TEXT = `(() => {
  const node = [...document.querySelectorAll('.sb-errordisplay, [data-storybook-error]')]
    .find((element) => element.getClientRects().length > 0);
  return node ? (node.textContent ?? '').trim() : '';
})()`;

async function inspectStory(page, story, attempt, runtimeErrors) {
  const startedAt = Date.now();
  const url = `${remoteBaseUrl}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
  runtimeErrors.length = 0;

  try {
    await page.goto(url, { timeout: storyTimeout, waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      `(() => {
        const root = document.querySelector('#storybook-root');
        return Boolean(${VISIBLE_ERROR_TEXT}) ||
          Boolean(root && (root.childElementCount > 0 || root.textContent?.trim()));
      })()`,
      undefined,
      { timeout: storyTimeout },
    );

    const earlyError = await page.evaluate(VISIBLE_ERROR_TEXT);
    if (earlyError) throw new Error(`Storybook render error: ${earlyError}`);

    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      await new Promise((resolveFrame) =>
        requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
      );
    });

    const inspection = await page.evaluate(async () => {
      const root = document.querySelector('#storybook-root');
      if (!(root instanceof HTMLElement)) throw new Error('Storybook root is missing');

      const tags = [
        ...new Set(
          [...root.querySelectorAll('*')]
            .map((element) => element.localName)
            .filter((tag) => tag.startsWith('e-')),
        ),
      ].sort((a, b) => a.localeCompare(b));

      await Promise.all(
        tags.map((tag) =>
          Promise.race([
            customElements.whenDefined(tag),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${tag} was not defined`)), 5_000),
            ),
          ]),
        ),
      );

      const failedUpgrades = tags.filter((tag) =>
        [...root.querySelectorAll(tag)].some((element) => element.constructor === HTMLElement),
      );
      const bounds = root.getBoundingClientRect();

      return {
        failedUpgrades,
        height: bounds.height,
        tags,
        width: bounds.width,
      };
    });

    // Re-checked after the render settles: a story can fail late, once its
    // custom elements start upgrading.
    const lateError = await page.evaluate(VISIBLE_ERROR_TEXT);
    if (lateError) throw new Error(`Storybook render error: ${lateError}`);
    if (inspection.failedUpgrades.length > 0) {
      throw new Error(`Custom element upgrade failed: ${inspection.failedUpgrades.join(', ')}`);
    }
    if (inspection.width === 0 || inspection.height === 0) {
      throw new Error(`Rendered story has zero bounds (${inspection.width}×${inspection.height})`);
    }
    if (runtimeErrors.length > 0) throw new Error(runtimeErrors.join('\n'));

    return {
      attempt,
      duration: Date.now() - startedAt,
      id: story.id,
      importPath: story.importPath,
      name: story.name,
      status: 'passed',
      tags: inspection.tags,
      title: story.title,
    };
  } catch (error) {
    const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
    return {
      attempt,
      duration: Date.now() - startedAt,
      id: story.id,
      importPath: story.importPath,
      name: story.name,
      reason,
      status: 'failed',
      tags: [],
      title: story.title,
    };
  }
}

function createJUnit(results, elapsed) {
  const failures = results.filter((result) => result.status === 'failed').length;
  const cases = results
    .map((result) => {
      const failure =
        result.status === 'failed'
          ? `<failure message="${escapeXml(result.reason ?? 'Story failed')}">${escapeXml(result.reason ?? '')}</failure>`
          : '';
      return `<testcase classname="${escapeXml(result.title)}" name="${escapeXml(result.name)}" time="${(
        result.duration / 1000
      ).toFixed(3)}">${failure}</testcase>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="BrowserStack · ${escapeXml(platform.label)}" tests="${results.length}" failures="${failures}" time="${(
    elapsed / 1000
  ).toFixed(3)}">
${cases}
</testsuite>
`;
}

await mkdir(screenshotDirectory, { recursive: true });

const expectedTags = await discoverRegisteredTags();
const stories = await discoverStories();

// A renamed or deleted element would leave a dead entry behind and silently
// shrink what the coverage check below still guards, so fail loudly and early
// — this runs in --dry-run too, which is where it costs nothing to catch.
const staleAllowlist = [...CONSUMED_BY_PARENT].filter((tag) => !expectedTags.includes(tag));
if (staleAllowlist.length > 0) {
  throw new Error(
    `CONSUMED_BY_PARENT lists elements that are no longer registered: ${staleAllowlist.join(', ')}. ` +
      `Remove them so the coverage check keeps its reach.`,
  );
}

const coverageTags = expectedTags.filter((tag) => !CONSUMED_BY_PARENT.has(tag));

if (dryRun) {
  console.log(
    `BrowserStack plan is valid: ${stories.length} stories, ${coverageTags.length} of ${expectedTags.length} registered custom elements expected to render (${CONSUMED_BY_PARENT.size} consumed by their parent), ${platform.label}`,
  );
  process.exit(0);
}

const version = playwrightVersion();
const caps = capabilities(version);
const endpoint = `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`;
const suiteStartedAt = Date.now();
const results = [];
const observedTags = new Set();
let browser;
let context;
let page;

console.log(
  `Running ${stories.length} stories and ${coverageTags.length} rendering custom elements on ${platform.label}`,
);

try {
  browser = await chromium.connect(endpoint, { timeout: 120_000 });
  context = await browser.newContext({
    colorScheme: 'light',
    locale: 'en-US',
    reducedMotion: 'reduce',
    ...platform.context,
  });
  page = await context.newPage();

  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(`Page error: ${error.message}`));
  page.on('console', (message) => {
    // Subresource failures are judged by the `requestfailed` handler below
    // instead: the console wording and even whether the engine logs at all
    // differ per browser, which made Display/Image / Fallback Chain fail on
    // Chrome and pass on Edge for the same deliberate request.
    if (message.type() !== 'error') return;
    if (RESOURCE_LOAD_FAILURE.test(message.text())) return;
    runtimeErrors.push(`Console error: ${message.text()}`);
  });
  // Stories point at unreachable external hosts on purpose to exercise fallback
  // paths — Display/Image / Fallback Chain loads https://invalid.example/ to
  // prove `fallback` takes over, and through BrowserStack Local that surfaces
  // as ERR_TUNNEL_CONNECTION_FAILED. Only a request to the Storybook origin
  // failing means the library is actually missing an asset.
  page.on('requestfailed', (request) => {
    if (!isStorybookOrigin(request.url())) return;
    runtimeErrors.push(`Request failed: ${request.url()} (${request.failure()?.errorText})`);
  });

  for (const [index, story] of stories.entries()) {
    let result;
    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      result = await inspectStory(page, story, attempt, runtimeErrors);
      if (result.status === 'passed') break;
    }

    results.push(result);
    for (const tag of result.tags) observedTags.add(tag);

    const symbol = result.status === 'passed' ? '✓' : '✗';
    console.log(`${symbol} ${index + 1}/${stories.length} ${story.title} / ${story.name}`);

    if (result.status === 'failed') {
      const path = join(screenshotDirectory, `${safeFileName(story.id)}.png`);
      try {
        await page.screenshot({ fullPage: true, path });
        result.screenshot = path;
      } catch (error) {
        result.screenshotError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const missingTags = coverageTags.filter((tag) => !observedTags.has(tag));
  if (missingTags.length > 0) {
    results.push({
      attempt: 1,
      duration: 0,
      id: 'component-coverage',
      importPath: 'src/components',
      name: 'Every registered custom element is rendered by Storybook',
      reason: `Never rendered: ${missingTags.join(', ')}`,
      status: 'failed',
      tags: [],
      title: 'Component coverage',
    });
  }

  const failed = results.filter((result) => result.status === 'failed');
  await markSession(
    page,
    failed.length === 0 ? 'passed' : 'failed',
    failed.length === 0
      ? `${stories.length} stories passed; all ${coverageTags.length} rendering custom elements covered`
      : `${failed.length} checks failed`,
  );
} catch (error) {
  const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
  // Without this the CI log only shows "0 passed, 1 failed" and the cause is
  // reachable solely by downloading the run artifact.
  console.error(`BrowserStack session failed on ${platform.label}:\n${reason}`);
  results.push({
    attempt: 1,
    duration: Date.now() - suiteStartedAt,
    id: 'browserstack-session',
    importPath: '',
    name: 'Connect and execute BrowserStack session',
    reason,
    status: 'failed',
    tags: [],
    title: 'BrowserStack session',
  });
  if (page) {
    try {
      await markSession(page, 'failed', reason);
    } catch {
      // Preserve the original infrastructure failure.
    }
  }
} finally {
  if (context) await context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
}

const elapsed = Date.now() - suiteStartedAt;
const summary = {
  consumedByParent: [...CONSUMED_BY_PARENT].sort((a, b) => a.localeCompare(b)),
  coverageTags,
  duration: elapsed,
  expectedTags,
  failed: results.filter((result) => result.status === 'failed').length,
  observedTags: [...observedTags].sort((a, b) => a.localeCompare(b)),
  passed: results.filter((result) => result.status === 'passed').length,
  platform: { key: platformKey, label: platform.label },
  results,
  stories: stories.length,
};

await writeFile(join(outputDirectory, 'results.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(join(outputDirectory, 'junit.xml'), createJUnit(results, elapsed));

console.log(
  `BrowserStack ${platform.label}: ${summary.passed} passed, ${summary.failed} failed in ${(
    elapsed / 1000
  ).toFixed(1)}s`,
);

if (summary.failed > 0) process.exitCode = 1;
