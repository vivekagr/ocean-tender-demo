#!/usr/bin/env node
/**
 * Optional static server for the front-end demo.
 *
 * You do NOT need this — index.html uses classic <script> tags precisely so that opening
 * it directly from the filesystem works. This exists only for people who prefer a URL.
 *
 * Usage: node serve.mjs [--port=4173] [--no-open]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.resolve(HERE, rel);

  // Contain the server to this directory.
  if (!file.startsWith(HERE)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // Unknown paths fall back to the SPA shell so hash routes work on refresh.
      fs.readFile(path.join(HERE, 'index.html'), (e2, shell) => {
        if (e2) { res.writeHead(404).end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES['.html'] }).end(shell);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(buf);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`Ocean Tender\n  ${url}\n  serving ${HERE}\n  Ctrl-C to stop`);
  if (!process.argv.includes('--no-open')) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    execFile(cmd, [url], () => { /* opening is best-effort */ });
  }
});
