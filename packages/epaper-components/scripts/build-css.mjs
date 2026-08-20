#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { transform } from 'lightningcss';

const distStylesDir = resolve('dist/styles');
const srcStylesDir = resolve('src/styles');

const coreCssFiles = ['tokens.css', 'base.css', 'components.css'];
const themeCssFiles = ['themes/mono-high-contrast.css', 'themes/kaleido.css'];
const cssFiles = [...coreCssFiles, ...themeCssFiles];

function minify(filename, code) {
  const result = transform({
    filename,
    code: Buffer.from(code),
    minify: true,
    sourceMap: true,
  });
  return { css: result.code.toString(), map: result.map ? result.map.toString() : null };
}

async function buildCSS() {
  // Create dist/styles directory
  mkdirSync(distStylesDir, { recursive: true });

  console.log('Building CSS files...\n');

  // 1. Copy and minify individual CSS files
  for (const file of cssFiles) {
    const srcPath = join(srcStylesDir, file);
    const distPath = join(distStylesDir, file);
    const minPath = join(distStylesDir, file.replace('.css', '.min.css'));
    mkdirSync(dirname(distPath), { recursive: true });

    // Read source file
    const source = readFileSync(srcPath, 'utf-8');

    // Write original to dist (for backward compatibility)
    writeFileSync(distPath, source);
    console.log(`✓ Copied  ${file} → dist/styles/${file}`);

    // Minify with source map
    const { css, map } = minify(basename(minPath), source);

    writeFileSync(
      minPath,
      map ? `${css}\n/*# sourceMappingURL=${basename(minPath)}.map */\n` : css,
    );
    if (map) {
      writeFileSync(`${minPath}.map`, map);
      console.log(`✓ Minified ${file} → dist/styles/${file.replace('.css', '.min.css')}`);
      console.log(`  + source map: dist/styles/${file.replace('.css', '.min.css.map')}`);
    } else {
      console.log(`✓ Minified ${file} → dist/styles/${file.replace('.css', '.min.css')}`);
    }
  }

  console.log('\n');

  // 2. Create combined bundle
  const allCSS = coreCssFiles
    .map((file) => {
      const srcPath = join(srcStylesDir, file);
      return readFileSync(srcPath, 'utf-8');
    })
    .join('\n');

  const bundlePath = join(distStylesDir, 'epaper.min.css');

  const { css, map } = minify(basename(bundlePath), allCSS);

  writeFileSync(
    bundlePath,
    map ? `${css}\n/*# sourceMappingURL=${basename(bundlePath)}.map */\n` : css,
  );
  if (map) {
    writeFileSync(`${bundlePath}.map`, map);
    console.log(`✓ Created combined bundle: dist/styles/epaper.min.css`);
    console.log(`  + source map: dist/styles/epaper.min.css.map`);
  } else {
    console.log(`✓ Created combined bundle: dist/styles/epaper.min.css`);
  }

  console.log('\n✓ CSS build complete!');
  console.log('\nGenerated files:');
  console.log('  - dist/styles/tokens.css');
  console.log('  - dist/styles/tokens.min.css (+.map)');
  console.log('  - dist/styles/base.css');
  console.log('  - dist/styles/base.min.css (+.map)');
  console.log('  - dist/styles/components.css');
  console.log('  - dist/styles/components.min.css (+.map)');
  console.log('  - dist/styles/themes/mono-high-contrast.css');
  console.log('  - dist/styles/themes/mono-high-contrast.min.css (+.map)');
  console.log('  - dist/styles/themes/kaleido.css');
  console.log('  - dist/styles/themes/kaleido.min.css (+.map)');
  console.log('  - dist/styles/epaper.min.css (+.map)');
}

try {
  await buildCSS();
} catch (err) {
  console.error('Error building CSS:', err);
  process.exit(1);
}
