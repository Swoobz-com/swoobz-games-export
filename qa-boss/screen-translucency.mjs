// TRANSLUCENCY SCREEN — the hole in the emissive screen, closed (phase 171).
//
// WHY. The emissive test is BRIGHT (max channel >= 215) AND SATURATED (max-min >= 70). It is built
// to catch FLAME. It is completely blind to translucency, and translucency is the SAME shipping
// hazard: semi-transparent pixels over chroma key to an olive fringe (the session-14
// bloom-lit-plate defect). Two plates passed the emissive screen and are unusable for this reason:
//   umbra-jelly     0.04% emissive, SHEER LACE panels
//   kira-frostveil  0.26% emissive, baked white VAPOUR on the blades
// Twice is a pattern, so it gets a measurement instead of a note.
//
// HOW. A pixel that is partly transparent over a green plate is a BLEND of the backdrop and the
// material, so it carries GREEN EXCESS that opaque material does not:
//     greenExcess = g - max(r, b)
// Backdrop green is ~+180. Opaque material is <= 0 unless the character itself is green. A
// semi-transparent pixel lands in between. Counting subject pixels in that middle band measures
// how much of the subject is see-through.
//
// The band is deliberately generous at the bottom (>= 18) because a thin fringe matters, and capped
// at 130 so genuine backdrop is not counted as subject fringe.
//
// CALIBRATED against six plates whose truth was established by EYE first, which is the only reason
// the thresholds mean anything:
//     hector-warhammer  3.01   opaque — best plate in the set
//     gargoyle-spear    3.28   opaque — its idle passed on the first take
//     lich-scythe       4.93   opaque, plus a SMALL pinned violet flame; 3 accepted clips
//     umbra-jelly       7.30   sheer lace          — rejected on sight
//     ningara-silk      7.67   lace + stockings    — rejected on sight
//     kira-frostveil   11.49   baked blade vapour  — flagged on sight, and it scores highest
// Opaque cluster 3.0-4.9, translucent cluster 7.3-11.5, clean gap between. Hence:
//     < 5   clean
//   5 - 7   inspect
//   >= 7    translucent, will fringe
// lich at 4.93 is the useful calibration point: a SMALL localised translucent feature is tolerable
// IF the kit pins it (his violet crown flame is pinned, and he has three accepted clips).
//
// ⚠ KNOWN CONFOUND, REPORTED IN ITS OWN COLUMN: a GREEN-COLOURED CHARACTER inflates transl%,
// because greenExcess cannot tell "green showing through" from "the character is green".
// hydra-flail scored 36.15% and is not translucent at all — he is a green scaled hydra
// (mean subject rgb(74,83,54), 49.6% of his pixels green-dominant). raiju-naginata, 8.27%, is the
// same story at 29.2%.
// That is NOT a null result. A green character on a GREEN plate is the documented ALPHA-HOLES
// hazard: the keyer removes green and can eat parts of him. So the tool prints grnDom% alongside,
// and when grnDom% >= 25 it reports THAT risk instead of a translucency verdict.
//
// usage: node qa-boss/screen-translucency.mjs <plate.png> [...]
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(import.meta.url); const { PNG } = require('pngjs');

const LO = 18, HI = 130;
console.log('  transl%  grnDom%   subj px    plate');
console.log('  ' + '-'.repeat(74));
const rows = [];
for (const f of process.argv.slice(2)) {
  let p; try { p = PNG.sync.read(fs.readFileSync(f)); } catch { continue; }
  const { width: W, height: H, data: d } = p;
  const bi = 0, bg = [d[bi], d[bi+1], d[bi+2]];
  const isBg = (r,g,b,a) => a < 24 || (Math.abs(r-bg[0])<26 && Math.abs(g-bg[1])<26 && Math.abs(b-bg[2])<26);
  let sub = 0, tr = 0, gdom = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
    if (isBg(r,g,b,a)) continue;
    sub++;
    const ex = g - Math.max(r, b);
    if (ex >= LO && ex <= HI) tr++;
    if (g > r && g > b) gdom++;   // the CONFOUND: a green-coloured character, see header
  }
  if (sub) rows.push({ f: f.split(/[\/]/).pop().replace(/-anchor-green\.png|\.png/,''), t: (tr/sub)*100, g: (gdom/sub)*100, sub });
}
rows.sort((a,b) => a.t - b.t);
for (const r of rows) {
  // A GREEN-COLOURED CHARACTER inflates transl% — report it so the confound is visible here rather
  // than needing a separate investigation, and flag it as its own (real, different) hazard.
  const green = r.g >= 25;
  const flag = green
    ? `  <- ${r.g.toFixed(0)}% GREEN-DOMINANT SUBJECT: transl% is CONFOUNDED, and a green character on a green plate risks ALPHA HOLES`
    : (r.t >= 7 ? '  <- TRANSLUCENT, will fringe' : (r.t >= 5 ? '  <- some see-through, inspect' : ''));
  console.log(`  ${r.t.toFixed(2).padStart(6)}  ${r.g.toFixed(1).padStart(6)}   ${String(r.sub).padStart(8)}   ${r.f}${flag}`);
}
