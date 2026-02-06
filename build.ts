import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";
import { Eta } from "eta";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_SCSS = path.join(__dirname, "src", "scss");
const SRC_POLYFILLS = path.join(__dirname, "src", "polyfills");
const DEMO = path.join(__dirname, "demo");
const DIST = path.join(__dirname, "dist");

type Entry = { src: string; out: string };

const ENTRIES: ReadonlyArray<Entry> = [
  { src: "eink-ui.tokens.scss", out: "eink-ui.tokens.css" },
  { src: "eink-ui.base.scss", out: "eink-ui.base.css" },
  { src: "eink-ui.components.scss", out: "eink-ui.components.css" },
];

const BUNDLE_ENTRY: Entry = { src: "eink-ui.scss", out: "eink-ui.css" };

const POLYFILLS: ReadonlyArray<Entry> = [
  { src: "dialog.ts", out: "eink-ui.dialog.polyfill.js" },
];

let sass: typeof import("sass") | null = null;
try {
  sass = await import("sass");
} catch {
  console.warn(
    "sass not installed; using existing CSS in demo/. Install devDependency 'sass' to recompile."
  );
}

let ts: typeof import("typescript") | null = null;
try {
  ts = await import("typescript");
} catch {
  console.warn(
    "typescript not installed; copying polyfill sources without transpilation."
  );
}

const ensureDir = (targetPath: string) =>
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

type CompileResult = { css: string; map?: object };

const compileSass = (srcFile: string): CompileResult => {
  if (!sass) {
    const fallbackName = srcFile.replace(/\.scss$/, ".css");
    const candidates = [path.join(DIST, fallbackName), path.join(DEMO, fallbackName)];
    const existing = candidates.find((file) => fs.existsSync(file));
    if (!existing) {
      throw new Error(`sass not installed and no prebuilt CSS found for ${srcFile}`);
    }
    return { css: fs.readFileSync(existing, "utf8") };
  }

  const result = sass.compile(path.join(SRC_SCSS, srcFile), {
    style: "expanded",
    loadPaths: [SRC_SCSS],
    sourceMap: true,
    sourceMapIncludeSources: true,
  });

  return { css: result.css, map: result.sourceMap as object | undefined };
};

const writeCssWithMap = (targetPath: string, compiled: CompileResult) => {
  ensureDir(targetPath);

  let outputCss = compiled.css;
  if (compiled.map) {
    const mapFile = `${path.basename(targetPath)}.map`;
    outputCss += `\n/*# sourceMappingURL=${mapFile} */`;
    fs.writeFileSync(`${targetPath}.map`, JSON.stringify(compiled.map));
  }

  fs.writeFileSync(targetPath, outputCss);
};

const buildPolyfill = (entry: Entry) => {
  const sourcePath = path.join(SRC_POLYFILLS, entry.src);
  const targetPath = path.join(DIST, entry.out);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`Polyfill source not found: ${entry.src}`);
    return;
  }

  const source = fs.readFileSync(sourcePath, "utf8");
  let js = source;

  if (ts) {
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2019,
        module: ts.ModuleKind.ES2020,
        removeComments: false,
      },
      fileName: entry.src,
    });
    js = transpiled.outputText;
  }

  ensureDir(targetPath);
  fs.writeFileSync(targetPath, js);
  console.log(`dist/${path.basename(targetPath)}  ${(js.length / 1024).toFixed(1)} KB`);
};

// Ensure output folders
fs.mkdirSync(DEMO, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

// Compile individual files to demo/ and dist/
ENTRIES.forEach((entry) => {
  const result = compileSass(entry.src);
  writeCssWithMap(path.join(DEMO, entry.out), result);
  writeCssWithMap(path.join(DIST, entry.out), result);
});

// Compile bundle entry for distribution
const bundleResult = compileSass(BUNDLE_ENTRY.src);
writeCssWithMap(path.join(DIST, BUNDLE_ENTRY.out), bundleResult);

// Minify bundle with source maps preserved
const minifier = new CleanCSS({
  level: 2,
  sourceMap: true,
  sourceMapInlineSources: true,
});

const minified = minifier.minify({
  [BUNDLE_ENTRY.out]: {
    styles: bundleResult.css,
    sourceMap: bundleResult.map ? JSON.stringify(bundleResult.map) : undefined,
  },
});

if (minified.errors.length) {
  console.error("Minification errors:", minified.errors);
  process.exit(1);
}

const minPath = path.join(DIST, "eink-ui.min.css");
let minCss = minified.styles;
if (minified.sourceMap) {
  fs.writeFileSync(`${minPath}.map`, minified.sourceMap.toString());
  minCss += "\n/*# sourceMappingURL=eink-ui.min.css.map */";
}
fs.writeFileSync(minPath, minCss);

// Build polyfills
POLYFILLS.forEach(buildPolyfill);

const fullKB = (bundleResult.css.length / 1024).toFixed(1);
const minKB = (minified.styles.length / 1024).toFixed(1);

console.log(`dist/${BUNDLE_ENTRY.out}      ${fullKB} KB`);
console.log(`dist/eink-ui.min.css  ${minKB} KB`);

// Compile HTML pages from ETA templates
const TEMPLATES = path.join(__dirname, "src", "templates");
const eta = new Eta({ views: TEMPLATES, autoEscape: false });
const pagesDir = path.join(TEMPLATES, "pages");

for (const file of fs.readdirSync(pagesDir)) {
  if (!file.endsWith(".eta")) continue;
  const name = file.replace(/\.eta$/, "");
  const html = eta.render(`pages/${name}`, {});
  const outPath = path.join(DEMO, `${name}.html`);
  fs.writeFileSync(outPath, html);
  console.log(`demo/${name}.html`);
}

// Compile Web Component demo pages
const DEMO_WC = path.join(__dirname, "demo-wc");
fs.mkdirSync(DEMO_WC, { recursive: true });
const wcPagesDir = path.join(TEMPLATES, "wc-pages");

if (fs.existsSync(wcPagesDir)) {
  for (const file of fs.readdirSync(wcPagesDir)) {
    if (!file.endsWith(".eta")) continue;
    const name = file.replace(/\.eta$/, "");
    const html = eta.render(`wc-pages/${name}`, {});
    const outPath = path.join(DEMO_WC, `${name}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`demo-wc/${name}.html`);
  }
}

// Compile root-level pages (landing page)
const rootPagesDir = path.join(TEMPLATES, "root");
if (fs.existsSync(rootPagesDir)) {
  for (const file of fs.readdirSync(rootPagesDir)) {
    if (!file.endsWith(".eta")) continue;
    const name = file.replace(/\.eta$/, "");
    const html = eta.render(`root/${name}`, {});
    const outPath = path.join(__dirname, `${name}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`${name}.html (root)`);
  }
}
