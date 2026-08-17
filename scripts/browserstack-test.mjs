import { readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, devices } from 'playwright';

const platformDefinitions = {
  chrome: {
    label: 'Chrome latest · Windows 11',
    capabilities: {
      browser: 'chrome',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11',
    },
    context: { viewport: { width: 1440, height: 900 } },
  },
  edge: {
    label: 'Edge latest · Windows 11',
    capabilities: {
      browser: 'edge',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '11',
    },
    context: { viewport: { width: 1440, height: 900 } },
  },
  firefox: {
    label: 'Playwright Firefox · Windows 11',
    capabilities: {
      browser: 'playwright-firefox',
      os: 'Windows',
      os_version: '11',
    },
    context: { viewport: { width: 1440, height: 900 } },
  },
  webkit: {
    label: 'Playwright WebKit · macOS Tahoe',
    capabilities: {
      browser: 'playwright-webkit',
      os: 'OS X',
      os_version: 'Tahoe',
    },
    context: { viewport: { width: 1440, height: 900 } },
  },
  'mobile-webkit': {
    label: 'Playwright WebKit · iPhone 15 emulation',
    capabilities: {
      browser: 'playwright-webkit',
      os: 'OS X',
      os_version: 'Tahoe',
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
const outputDirectory = resolve('reports', 'browserstack', platformKey);
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

const safeFileName = (value) => value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');

async function discoverRegisteredTags() {
  const componentDirectory = resolve('src', 'components');
  const files = (await readdir(componentDirectory)).filter((file) => file.endsWith('.ts'));
  const tags = new Set();

  for (const file of files) {
    const source = await readFile(join(componentDirectory, file), 'utf8');
    for (const match of source.matchAll(/define\(\s*['"](e-[a-z0-9-]+)['"]/g)) tags.add(match[1]);
  }

  if (tags.size === 0) throw new Error('No registered custom elements found in src/components');
  return [...tags].sort();
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
  return JSON.parse(readFileSync(resolve('node_modules/playwright/package.json'), 'utf8')).version;
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
    resolution: '1440x900',
  };
}

async function markSession(page, status, reason) {
  const command = {
    action: 'setSessionStatus',
    arguments: { reason: reason.slice(0, 255), status },
  };
  // BrowserStack's proxy recognizes this call by its literal evaluated source
  // text, not by an argument value — it must be the expression Playwright
  // sends over CDP, not a value passed into an unrelated function.
  await page.evaluate(`browserstack_executor: ${JSON.stringify(command)}`);
}

async function inspectStory(page, story, attempt, runtimeErrors) {
  const startedAt = Date.now();
  const url = `${remoteBaseUrl}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
  runtimeErrors.length = 0;

  try {
    await page.goto(url, { timeout: storyTimeout, waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const root = document.querySelector('#storybook-root');
        const error = document.querySelector('.sb-errordisplay, [data-storybook-error]');
        return Boolean(error) || (root && (root.childElementCount > 0 || root.textContent?.trim()));
      },
      undefined,
      { timeout: storyTimeout },
    );

    const earlyError = await page.evaluate(
      () =>
        document.querySelector('.sb-errordisplay, [data-storybook-error]')?.textContent?.trim() ??
        '',
    );
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
      ].sort();

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
      const errorText = document.querySelector(
        '.sb-errordisplay, [data-storybook-error]',
      )?.textContent;

      return {
        errorText: errorText?.trim() ?? '',
        failedUpgrades,
        height: bounds.height,
        tags,
        width: bounds.width,
      };
    });

    if (inspection.errorText) throw new Error(`Storybook render error: ${inspection.errorText}`);
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

if (dryRun) {
  console.log(
    `BrowserStack plan is valid: ${stories.length} stories, ${expectedTags.length} registered custom elements, ${platform.label}`,
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
  `Running ${stories.length} stories and ${expectedTags.length} registered custom elements on ${platform.label}`,
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
    if (message.type() === 'error') runtimeErrors.push(`Console error: ${message.text()}`);
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

  const missingTags = expectedTags.filter((tag) => !observedTags.has(tag));
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
      ? `${stories.length} stories passed; all ${expectedTags.length} custom elements covered`
      : `${failed.length} checks failed`,
  );
} catch (error) {
  const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
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
  duration: elapsed,
  expectedTags,
  failed: results.filter((result) => result.status === 'failed').length,
  observedTags: [...observedTags].sort(),
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
