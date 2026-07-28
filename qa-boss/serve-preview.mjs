/* Tiny static server for the boss animation review page. Run: node qa-boss/serve-preview.mjs
 * → http://localhost:5341/preview.html   (Range/206 for video seeking, no-store so refreshes see
 * new clips/ledgers immediately). Rooted at qa-boss/. */
import { createServer } from 'node:http';
import { statSync, createReadStream, existsSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 5341;
const MIME = { '.html':'text/html', '.json':'application/json', '.webm':'video/webm', '.mp4':'video/mp4', '.png':'image/png', '.mjs':'text/javascript' };

createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const file = normalize(join(ROOT, urlPath === '/' ? 'preview.html' : urlPath));
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('404'); return; }
    const size = statSync(file).size;
    const type = MIME[extname(file)] || 'application/octet-stream';
    const range = req.headers.range;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const m = range && /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      // Clamp: browsers probe past EOF on stalled retries; a raw out-of-range start must 416,
      // never crash the process (this killed the server once - keep the try/catch too).
      const start = +m[1];
      const end = Math.min(m[2] ? +m[2] : size - 1, size - 1);
      if (start >= size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
      createReadStream(file).pipe(res);
    }
  } catch (e) { try { res.writeHead(500); res.end('500'); } catch (_) {} }
}).listen(PORT, '127.0.0.1', () => console.log(`boss review → http://localhost:${PORT}/preview.html`));
