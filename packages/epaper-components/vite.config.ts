import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';

const componentsDir = resolve(__dirname, 'src/components');
const componentEntries = Object.fromEntries(
  readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, resolve(componentsDir, entry.name, `${entry.name}.ts`)])
    .filter(([, entryFile]) => existsSync(entryFile))
    .map(([name, entryFile]) => [`components/${name}`, entryFile]),
);

const coreEntries = {
  'core/dom': resolve(__dirname, 'src/core/dom.ts'),
  'core/icons': resolve(__dirname, 'src/core/icons.ts'),
  'core/types': resolve(__dirname, 'src/core/types.ts'),
  'core/date': resolve(__dirname, 'src/core/date.ts'),
  'core/base-form-control': resolve(__dirname, 'src/core/base-form-control.ts'),
};

export default defineConfig(({ command }) => ({
  server: {
    port: 8085,
    open: true,
  },
  build:
    command === 'build'
      ? {
          lib: {
            entry: {
              index: resolve(__dirname, 'src/index.ts'),
              ...coreEntries,
              ...componentEntries,
            },
            formats: ['es'],
          },
          outDir: 'dist',
          sourcemap: true,
          emptyOutDir: true,
          rollupOptions: {
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: 'chunks/[name]-[hash].js',
              manualChunks(id: string) {
                const m = id.match(/[\\/]src[\\/]core[\\/]([^\\/]+)\.ts$/);
                if (m) return `core/${m[1]}`;
                return null;
              },
            },
          },
        }
      : undefined,
}));
