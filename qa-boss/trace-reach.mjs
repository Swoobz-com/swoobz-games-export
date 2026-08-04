// Per-frame reach / centroid / effect trace for keyed frames — used to VERIFY that the
// motion-energy argmax from measure-contacts.mjs is the ACTION BEAT and not the recovery
// or an effect collapsing. Prints, per frame: alpha-pixel count, alpha centroid x/y,
// max reach (rightmost opaque column), min x (leftmost), min y (topmost), and a count of
// "hot" effect pixels (bright warm gold/crimson: r>170 && r-b>60).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const dir = process.argv[2];
const step = Number(process.argv[3] || 1);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const rows = [];
for (let n = 0; n < files.length; n += step) {
  const p = PNG.sync.read(fs.readFileSync(path.join(dir, files[n])));
  const { width: w, height: h, data } = p;
  let cnt = 0; let sx = 0; let sy = 0;
  let maxX = -1; let minX = w; let minY = h; let maxY = -1; let hot = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a > 24) {
        cnt += 1; sx += x; sy += y;
        if (x > maxX) maxX = x;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (a > 128 && data[i] > 170 && data[i] - data[i + 2] > 60) hot += 1;
    }
  }
  rows.push({ f: n, px: cnt, cx: +(sx / cnt).toFixed(1), cy: +(sy / cnt).toFixed(1), minX, maxX, minY, maxY, hot });
}
for (const r of rows) {
  console.log(`f${String(r.f).padStart(3)} px=${String(r.px).padStart(7)} cx=${String(r.cx).padStart(6)} cy=${String(r.cy).padStart(6)} x[${String(r.minX).padStart(3)}..${String(r.maxX).padStart(3)}] top=${String(r.minY).padStart(3)} bot=${String(r.maxY).padStart(3)} hot=${r.hot}`);
}
const maxHot = rows.reduce((a, b) => (b.hot > a.hot ? b : a));
const maxReach = rows.reduce((a, b) => (b.maxX > a.maxX ? b : a));
console.log(`\nMAX effect(hot) at f${maxHot.f} (${maxHot.hot}px) | MAX reach maxX=${maxReach.maxX} at f${maxReach.f}`);
