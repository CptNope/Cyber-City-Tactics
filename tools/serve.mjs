#!/usr/bin/env node
/* A tiny static server for local play and testing: `npm start`, then open the printed URL.
 * The service worker is off on localhost so your edits show up on reload; add ?sw=1 to test it. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || process.argv[2] || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

export function serve(port = PORT) {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(ROOT, p));
      // inside the project folder itself, not a sibling whose name merely starts the same way
      if (file !== ROOT && !file.startsWith(ROOT + sep)) throw new Error('outside root');
      const body = await readFile(file); // one read: no gap between checking a file and opening it
      res.writeHead(200, {
        'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(body);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  serve().then(() =>
    console.log(
      `Cyber City Tactics on http://localhost:${PORT}/  (service worker test: http://localhost:${PORT}/?sw=1)`
    )
  );
}
