// MEASURE-VS-ANCHOR — read-only. IoU of any ALPHA image/clip-f0 against a reference clip's f0,
// using check-turn's exact math (N=64 bbox-normalised silhouette, alpha > 8).
// Usage: node measure-vs-anchor.mjs <anchorClip.webm> <target1> [target2 ...]
// Targets may be .webm (f0 taken) or any still ffmpeg can read with alpha (.webp/.png).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const [anchorClip, ...targets] = process.argv.slice(2);
const die = (m) => { console.error('REFUSED: ' + m); process.exit(2); };
if (!anchorClip || !targets.length) die('usage: node measure-vs-anchor.mjs <anchorClip.webm> <target1> [target2 ...]');
for (const p of [anchorClip, ...targets]) if (!fs.existsSync(p)) die(`does not exist: ${p}`);

const N = 64;
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mva-'));
const cleanup = () => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ } };
function toPng(src) {
  const d = fs.mkdtempSync(path.join(tmpRoot, 'f-'));
  const isWebm = src.toLowerCase().endsWith('.webm');
  const args = ['-v', 'error', '-y'];
  if (isWebm) args.push('-c:v', 'libvpx-vp9');
  args.push('-i', src, '-pix_fmt', 'rgba', '-frames:v', '1', path.join(d, 'f.png'));
  try { execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { cleanup(); die(`ffmpeg failed on ${src}`); }
  const f = path.join(d, 'f.png');
  if (!fs.existsSync(f)) { cleanup(); die(`no frame produced from ${src}`); }
  return f;
}
function mask(file) {
  const p = PNG.sync.read(fs.readFileSync(file));
  const on = (x, y) => p.data[(y * p.width + x) * 4 + 3] > 8;
  let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
  for (let y = 0; y < p.height; y += 1) for (let x = 0; x < p.width; x += 1) {
    if (on(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, m = new Uint8Array(N * N);
  for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) {
    m[j * N + i] = on(x0 + Math.floor((i + 0.5) * w / N), y0 + Math.floor((j + 0.5) * h / N)) ? 1 : 0;
  }
  return { m, w, h };
}
const mir = (m) => { const o = new Uint8Array(N * N); for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) o[j * N + i] = m[j * N + (N - 1 - i)]; return o; };
const iou = (a, b) => { let I = 0, U = 0; for (let k = 0; k < a.length; k += 1) { if (a[k] & b[k]) I += 1; if (a[k] | b[k]) U += 1; } return U ? I / U : 0; };

const A = mask(toPng(anchorClip));
if (!A) { cleanup(); die('anchor silhouette is blank'); }
console.log(`ANCHOR ${path.basename(anchorClip)} f0   bbox ${A.w}x${A.h}  aspect ${(A.w / A.h).toFixed(3)}\n`);
console.log('target                                        bbox   aspect | IoU as-is  hflip');
console.log('-'.repeat(84));
for (const t of targets) {
  const T = mask(toPng(t));
  if (!T) { console.log(`  ${path.basename(t).padEnd(42)} BLANK`); continue; }
  console.log(`  ${path.basename(t).padEnd(42)} ${String(T.w).padStart(4)}x${String(T.h).padEnd(4)} ${(T.w / T.h).toFixed(3)} |    ${iou(T.m, A.m).toFixed(3)}  ${iou(mir(T.m), A.m).toFixed(3)}`);
}
cleanup();
