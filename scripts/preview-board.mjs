// Loopback-only static preview + the actual API handlers with local SQLite.
// Usage: node scripts/preview-board.mjs [port] [private data directory]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {openLocalD1} from './local-d1.mjs';
import {handleBoard} from '../lib/board.mjs';
import {handleBoardAdmin} from '../lib/board-admin.mjs';
import {recordPageView} from '../lib/page-counter.mjs';

const dist = fs.realpathSync(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.argv[2] || 4173);
const dataDir = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'fefw-board-preview'));
if (dataDir === dist || dataDir.startsWith(dist + path.sep)) throw new Error('Database must be outside dist.');
fs.mkdirSync(dataDir, {recursive: true});
const secretFile = path.join(dataDir, 'board-secret.txt');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(32).toString('hex'));
const env = {
  BOARD_ADMIN_PASSWORD: process.env.BOARD_ADMIN_PASSWORD,
  COUNTER_DB: openLocalD1(path.join(dataDir, 'counter.sqlite'), 'counter'),
  BOARD_DB: openLocalD1(path.join(dataDir, 'board.sqlite'), 'board'),
  BOARD_SECRET: fs.readFileSync(secretFile, 'utf8'),
};
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon'};
const server = http.createServer(async (req, res) => {
  try {
    const expectedHost = `127.0.0.1:${port}`;
    if (req.headers.host !== expectedHost) { res.writeHead(403); res.end(); return; }
    const url = new URL(req.url, `http://${expectedHost}`);
    if (url.pathname.startsWith('/api/')) {
      const headers = new Headers(req.headers);
      headers.set('CF-Connecting-IP', '127.0.0.1');
      const options = {method: req.method, headers};
      if (!['GET', 'HEAD'].includes(req.method)) { options.body = req; options.duplex = 'half'; }
      const context = {request: new Request(url, options), env};
      const response = url.pathname === '/api/board' ? await handleBoard(context) :
        url.pathname === '/api/board-admin' ? await handleBoardAdmin(context) :
        ['/api/page-view', '/api/home-view'].includes(url.pathname)
          ? await recordPageView(context, url.pathname === '/api/home-view' ? 'home' : url.searchParams.get('page'))
          : new Response('', {status: 404});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const segments = decodeURIComponent(url.pathname).split(/[\\/]/).filter(Boolean);
    if (segments.some(segment => segment.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    let target = path.resolve(dist, ...segments);
    if (!target.startsWith(dist + path.sep) && target !== dist) { res.writeHead(404); res.end(); return; }
    if (fs.statSync(target).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, {Location: url.pathname + '/' + url.search}); res.end(); return; }
      target = path.join(target, 'index.html');
    }
    target = fs.realpathSync(target);
    if (!target.startsWith(dist + path.sep)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(target).pipe(res);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}/other/board/`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => {
  env.COUNTER_DB.close(); env.BOARD_DB.close(); process.exit(0);
}));
