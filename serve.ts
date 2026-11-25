// A tiny static server for game/ (Node 22, standard library only), so the
// entry can be played locally without a build step:
//   node serve.ts            serves game/ on http://localhost:8080
//   node serve.ts --port N   serves it on port N instead
// It sends the MIME types a browser game needs, refuses any path that climbs
// outside game/, and otherwise does nothing clever: a development convenience,
// not a web server for the internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const cleaned = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const joined = join(root, cleaned === '/' ? 'index.html' : cleaned);
  return joined === root || joined.startsWith(root + sep) ? joined : null;
}

const server = createServer((request, response) => {
  const file = safePath(request.url ?? '/');
  if (!file) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('forbidden\n');
    return;
  }
  let stat;
  try {
    stat = statSync(file);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found\n');
    return;
  }
  if (!stat.isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found\n');
    return;
  }
  response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving game/ at http://localhost:${port}`);
});
