// EMISSIVE PRE-SCREEN for raw MK FINAL plates — screen #1 of the three in MK-FINAL-WAVE2-SCREEN.md.
//
// Uses the HUE-AGNOSTIC test that replaced the original warm-only one in phase 109: a pixel counts
// as emissive if it is BRIGHT (max channel >= 215) AND SATURATED (max-min >= 70). Ordinary lit
// material DESATURATES as it brightens; a flame does not. The old warm-only test scored
// drake-glaive 0.49% "clean" when it is actually >5% and had to be REJECTED.
//
// Subject = non-background. These raw plates are not chroma — background is detected from the
// four corners and matched with tolerance, so this works on white, black or transparent alike.
//
// usage: node qa-boss/screen-emissive.mjs <dir> [maxFiles]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url); const { PNG } = require('pngjs');

const dir = process.argv[2];
const files = fs.readdirSync(dir)
  .filter((f) => /\.png$/i.test(f) && !/ (PFP|TCG)\.png$/i.test(f))   // base plate only
  .sort();

const rows = [];
for (const f of files) {
  let p; try { p = PNG.sync.read(fs.readFileSync(path.join(dir, f))); } catch { continue; }
  const { width: W, height: H, data: d } = p;
  const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
  const corners = [at(0,0), at(W-1,0), at(0,H-1), at(W-1,H-1)];
  const bg = corners[0];
  const isBg = (r,g,b,a) => a < 24 || (Math.abs(r-bg[0])<26 && Math.abs(g-bg[1])<26 && Math.abs(b-bg[2])<26);
  let sub = 0, emis = 0, white = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
    if (isBg(r,g,b,a)) continue;
    sub++;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
    if (mx >= 215 && (mx - mn) >= 70) emis++;
    if (r >= 250 && g >= 250 && b >= 250) white++;
  }
  if (!sub) continue;
  rows.push({ f, sub, e: (emis/sub)*100, w: (white/sub)*100, fill: sub/(W*H)*100 });
}
rows.sort((a,b) => a.e - b.e);
console.log(`${rows.length} base plates in ${dir}\n`);
console.log('  emis%   white%  subj%   plate');
console.log('  ' + '-'.repeat(74));
for (const r of rows) {
  const flag = r.e >= 1.5 ? '  <- BAKED EMISSIVE, reject' : (r.e >= 0.8 ? '  <- has a lit feature, pin it' : '');
  console.log(`  ${r.e.toFixed(2).padStart(5)}   ${r.w.toFixed(2).padStart(5)}  ${r.fill.toFixed(1).padStart(5)}   ${r.f.replace(/\.png$/,'')}${flag}`);
}
