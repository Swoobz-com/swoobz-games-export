// F0 GRID — read-only. One cell per clip showing its FIRST frame, over mid-grey, labelled by order.
// Answers "which clip is the odd one out at the anchor pose" by eye. idle.webm is forced first.
// Usage: node f0-grid.mjs <charDir> <outPng> [cols=5] [which=first|last]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const [charDir, outPng, colsArg, whichArg] = process.argv.slice(2);
const die = (m) => { console.error('REFUSED: ' + m); process.exit(2); };
if (!charDir || !outPng) die('usage: node f0-grid.mjs <charDir> <outPng> [cols] [first|last]');
if (!fs.existsSync(charDir)) die(`charDir does not exist: ${charDir}`);
const COLS = Number(colsArg || 5);
if (!Number.isFinite(COLS) || COLS < 1 || COLS > 8) die(`cols must be 1..8, got ${colsArg}`);
const WHICH = whichArg || 'first';
if (!['first', 'last'].includes(WHICH)) die(`which must be first|last, got ${whichArg}`);

const clips = fs.readdirSync(charDir).filter((f) => f.endsWith('.webm')).sort();
if (!clips.length) die(`no .webm in ${charDir}`);
clips.sort((a, b) => (a === 'idle.webm' ? -1 : b === 'idle.webm' ? 1 : a.localeCompare(b)));

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'f0grid-'));
const cleanup = () => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ } };
function frameOf(webm) {
  const d = fs.mkdtempSync(path.join(tmpRoot, 'f-'));
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', webm, '-pix_fmt', 'rgba',
      path.join(d, 'f_%04d.png')], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { cleanup(); die(`ffmpeg failed on ${webm}`); }
  const fr = fs.readdirSync(d).filter((f) => f.endsWith('.png')).sort();
  if (!fr.length) { cleanup(); die(`decoded 0 frames from ${webm}`); }
  return path.join(d, WHICH === 'first' ? fr[0] : fr[fr.length - 1]);
}
// alpha bbox, so the printed geometry is comparable across clips
function bbox(p) {
  const s = PNG.sync.read(fs.readFileSync(p));
  let x0 = s.width, y0 = s.height, x1 = -1, y1 = -1;
  for (let y = 0; y < s.height; y += 1) for (let x = 0; x < s.width; x += 1) {
    if (s.data[(y * s.width + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, W: s.width, H: s.height };
}
const CELL = 300, BG = 96, PAD = 3;
function blit(src, out, ox, oy) {
  const s = PNG.sync.read(fs.readFileSync(src));
  const sc = Math.max(s.width, s.height) / CELL;
  for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) {
    const sx = Math.min(s.width - 1, Math.floor(x * sc)), sy = Math.min(s.height - 1, Math.floor(y * sc));
    const si = (sy * s.width + sx) * 4, di = ((oy + y) * out.width + (ox + x)) * 4;
    const a = s.data[si + 3] / 255;
    for (let c = 0; c < 3; c += 1) out.data[di + c] = Math.round(s.data[si + c] * a + BG * (1 - a));
    out.data[di + 3] = 255;
  }
}
const rows = Math.ceil(clips.length / COLS);
const out = new PNG({ width: COLS * (CELL + PAD) + PAD, height: rows * (CELL + PAD) + PAD });
out.data.fill(30);
clips.forEach((c, i) => {
  const f = frameOf(path.join(charDir, c));
  const b = bbox(f);
  blit(f, out, PAD + (i % COLS) * (CELL + PAD), PAD + Math.floor(i / COLS) * (CELL + PAD));
  console.log(`  ${String(i).padStart(2)} ${c.padEnd(22)} ${WHICH}  bbox ${b ? `${b.w}x${b.h} @${b.x0},${b.y0}  aspect ${(b.w / b.h).toFixed(3)}  of ${b.W}x${b.H}` : 'EMPTY'}`);
});
fs.writeFileSync(outPng, PNG.sync.write(out));
cleanup();
console.log(`grid ${COLS}x${rows} -> ${outPng}   (cell 0 = idle.webm)`);
