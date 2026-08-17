#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postcss from 'postcss';
import cssnano from 'cssnano';

const distStylesDir = resolve('dist/styles');
const srcStylesDir = resolve('src/styles');

const cssFiles = ['tokens.css', 'base.css', 'components.css'];

async function buildCSS() {
  // Create dist/styles directory
  mkdirSync(distStylesDir, { recursive: true });

  // Load PostCSS config
  const postcssPlugins = [
    cssnano({
      preset: ['default', { discardComments: { removeAll: true }, normalizeUnicode: false }],
    }),
  ];

  console.log('Building CSS files...\n');

  // 1. Copy and minify individual CSS files
  for (const file of cssFiles) {
    const srcPath = join(srcStylesDir, file);
    const distPath = join(distStylesDir, file);
    const minPath = join(distStylesDir, file.replace('.css', '.min.css'));

    // Read source file
    const source = readFileSync(srcPath, 'utf-8');

    // Write original to dist (for backward compatibility)
    writeFileSync(distPath, source);
    console.log(`✓ Copied  ${file} → dist/styles/${file}`);

    // Minify with source map
    const result = await postcss(postcssPlugins).process(source, {
      from: srcPath,
      to: minPath,
      map: { inline: false },
    });

    writeFileSync(minPath, result.css);
    if (result.map) {
      writeFileSync(`${minPath}.map`, result.map.toString());
      console.log(`✓ Minified ${file} → dist/styles/${file.replace('.css', '.min.css')}`);
      console.log(`  + source map: dist/styles/${file.replace('.css', '.min.css.map')}`);
    } else {
      console.log(`✓ Minified ${file} → dist/styles/${file.replace('.css', '.min.css')}`);
    }
  }

  console.log('\n');

  // 2. Create combined bundle
  const allCSS = cssFiles
    .map((file) => {
      const srcPath = join(srcStylesDir, file);
      return readFileSync(srcPath, 'utf-8');
    })
    .join('\n');

  const bundlePath = join(distStylesDir, 'epaper.min.css');

  const result = await postcss(postcssPlugins).process(allCSS, {
    from: undefined,
    to: bundlePath,
    map: { inline: false },
  });

  writeFileSync(bundlePath, result.css);
  if (result.map) {
    writeFileSync(`${bundlePath}.map`, result.map.toString());
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
  console.log('  - dist/styles/epaper.min.css (+.map)');
}

try {
  await buildCSS();
} catch (err) {
  console.error('Error building CSS:', err);
  process.exit(1);
}
