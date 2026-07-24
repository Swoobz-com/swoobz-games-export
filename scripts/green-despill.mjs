// Green-screen despill post-pass for GREEN-chroma clips (the shipped key-idle-clips.mjs
// despill is MAGENTA-family only: it fires on r>g && b>g and leaves green fringe intact).
// Runs on the KEYED frames dir IN PLACE, AFTER key-idle-clips.mjs, BEFORE encode.
// Gate: only pixels where G dominates BOTH R and B by a hard margin count as green spill
// (true chroma fringe). Yellow/tan straw (r>=g), silver hair / steel (neutral, g~=r~=b),
// tan skin (r dominant), charcoal kimono (neutral dark) all FAIL the gate and are untouched.
// SAFE ONLY because nothing on this character is green.
//
// Usage: node green-despill.mjs <keyedFramesDir> [--margin N] [--keep F]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const dir = argv[0];
let MARGIN = 14; // min (G - max(R,B)) before a pixel counts as green spill
let KEEP = 0.08; // fraction of the green excess kept (0 = pull G fully to max(R,B))
for (let i = 1; i < argv.length; i += 2) {
  if (argv[i] === '--margin') MARGIN = Number(argv[i + 1]);
  if (argv[i] === '--keep') KEEP = Number(argv[i + 1]);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
let touched = 0;
let pxHit = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { width: W, height: H, data: d } = png;
  let changed = false;
  for (let i = 0; i < W * H * 4; i += 4) {
    if (d[i + 3] === 0) continue; // fully transparent, skip
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, b);
    const excess = g - mx;
    if (excess > MARGIN) {
      if (r >= b) {
        // WARM green-dominant = green spill on the tan/brown straw or skin: pull G down
        // toward max(R,B) and keep the warm base (straw stays brown).
        d[i + 1] = Math.round(mx + excess * KEEP);
      } else {
        // COOL green-dominant (B > R) = the effect's green screen-glow bloom (iai flash /
        // cyclone wind / crescent). Neutralise to luminance grey so it reads WHITE-family,
        // never teal. Nothing on this character's BODY is cool-green, so the body is untouched.
        const v = Math.round((r + g + b) / 3);
        d[i] = v; d[i + 1] = v; d[i + 2] = v;
      }
      changed = true;
      pxHit += 1;
    }
  }
  if (changed) { fs.writeFileSync(p, PNG.sync.write(png)); touched += 1; }
}
console.log(`green-despill: touched ${touched}/${files.length} frames, ${pxHit} px (margin ${MARGIN}, keep ${KEEP})`);
