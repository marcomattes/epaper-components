import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, posix, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'storybook-static');
const port = Number(process.argv[3] ?? 6006);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

// Build a fixed manifest of every file this server is allowed to serve, up
// front, from trusted (non-request) input only — walking `root` once. The
// request handler below then only ever uses the incoming URL as a lookup key
// into this map; it never concatenates request data into a filesystem path,
// so there is no path-traversal sink to sanitize in the first place. This
// mirrors the fixed-manifest approach already used for sample-app's local
// static server.
async function collectFiles(dir, out) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(abs, out);
    else out.push(abs);
  }
}

async function buildManifest() {
  const files = [];
  await collectFiles(root, files);

  const manifest = new Map();
  for (const abs of files) {
    const urlPath = `/${posix.join(
      ...abs
        .slice(root.length)
        .split(/[/\\]+/)
        .filter(Boolean),
    )}`;
    manifest.set(urlPath, abs);
    if (posix.basename(urlPath) === 'index.html') {
      const dir = posix.dirname(urlPath);
      manifest.set(dir, abs);
      if (dir !== '/') manifest.set(`${dir}/`, abs);
    }
  }
  return manifest;
}

const manifest = await buildManifest();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const requestedPath = decodeURIComponent(url.pathname);
    const filePath = manifest.get(requestedPath);

    if (!filePath) {
      response.writeHead(404).end('Not found');
      return;
    }

    const fileStat = await stat(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': fileStat.size,
      'Content-Type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    response
      .writeHead(code === 'ENOENT' ? 404 : 500)
      .end(code === 'ENOENT' ? 'Not found' : 'Error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root} at http://0.0.0.0:${port}`);
});

const stop = () => server.close(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
