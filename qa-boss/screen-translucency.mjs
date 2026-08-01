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
// grnDom% IS NOT A KEYING VERDICT — that claim was TESTED AND KILLED (phase 172).
// This header used to say a green character on a green plate "risks ALPHA HOLES", and on that basis
// recommended re-plating hydra-flail on magenta. Both green-dominant plates were then keyed and their
// alpha inspected: hydra-flail (49.6% grnDom) CLEAN, raiju-naginata (29.2%) CLEAN. No holes in either.
// THE REASON IS STRUCTURAL: the keyer is a BORDER-SEEDED FLOOD. It removes only green REACHABLE FROM
// THE FRAME EDGE, so an interior greenish body pixel is never a candidate however green it is. The
// real hazard would be green that CONNECTS to the border through a gap in the silhouette — which is a
// property of the SILHOUETTE, not of how green the character is, and this number cannot see it.
// So grnDom% is reported for ONE reason only: it explains an inflated transl%. It never suppresses
// the translucency verdict (doing so once hid elara-frostplate's real 6.01 "inspect" reading behind
// a confound warning); the verdict is printed alongside and marked as an upper bound.
//
// A BETTER GREEN-HAZARD METRIC THAN grnDom EXISTS, and it is recorded here UNCALIBRATED rather than
// shipped (phase 189). grnDom answers "is the character green", which phase 172 proved is not the
// hazard. The hazard is EDGE SEPARATION: how many subject pixels sit close to the PLATE colour, since
// that is where the keyer has to find a boundary. Measured as % of subject within L1 distance 120 of
// the sampled plate colour:
//     Kappa Bo      grnDom 48.0%  ->  0.72%   (deep saturated green, WELL separated from bright plate)
//     hydra-flail   grnDom 49.6%  ->  2.20%   (keys CLEAN — verified by alpha inspection, phase 172)
//     Yokai Kama    grnDom 37.3%  ->  3.16%   (worst; its yellow-green leaves are nearest the plate)
// Note the RANKING INVERTS against grnDom: the greenest character is the best separated. That is the
// point. NOT added as a column or a threshold because 3 points and ONE ground truth (hydra keys clean
// at 2.20%) cannot calibrate one, and an uncalibrated threshold would just be the hot-core mistake in
// screen-emissive.mjs again. Gather more keyed ground truth first, then decide.
//
// usage: node qa-boss/screen-translucency.mjs <plate.png> [...]
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(import.meta.url); const { PNG } = require('pngjs');

const LO = 18, HI = 130;
console.log('  transl%  grnDom%   subj px    plate');
console.log('  ' + '-'.repeat(74));
const rows = [], failed = [];
const asked = process.argv.slice(2);
if (!asked.length) { console.error('ERROR: no plates given — nothing was measured.'); process.exit(2); }
for (const f of asked) {
  // NEVER skip silently. A mistyped path used to `continue` here, so a screen over a bad path list
  // printed a short clean table and READ AS "all clean" — the vacuous-pass bug, the same one that
  // made check-extra-objects report CLEAN off zero frames. Collect failures and fail loudly below.
  let p; try { p = PNG.sync.read(fs.readFileSync(f)); } catch (e) { failed.push([f, e.code || e.message]); continue; }
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
  // A GREEN-COLOURED CHARACTER inflates transl%. Report the confound, but NEVER let it suppress the
  // verdict — grnDom% says the reading is an UPPER BOUND, not that the plate has a keying problem.
  const green = r.g >= 25;
  const verdict = r.t >= 7 ? 'TRANSLUCENT, will fringe' : (r.t >= 5 ? 'some see-through, inspect' : '');
  const flag = green
    ? `  <- ${r.g.toFixed(0)}% green-dominant: transl% is an UPPER BOUND (the character is green, not see-through)`
      + (verdict ? ` · at face value: ${verdict}` : '')
      + ` · NOT an alpha-holes signal — see header`
    : (verdict ? `  <- ${verdict}` : '');
  console.log(`  ${r.t.toFixed(2).padStart(6)}  ${r.g.toFixed(1).padStart(6)}   ${String(r.sub).padStart(8)}   ${r.f}${flag}`);
}
// Say plainly what was NOT measured. Silence here is indistinguishable from a clean result.
if (failed.length) {
  console.error(`\nERROR: ${failed.length} of ${asked.length} plate(s) could NOT be read — they were NOT measured:`);
  for (const [f, why] of failed) console.error(`  ${f}  (${why})`);
  console.error('The table above is INCOMPLETE. Do not read it as a verdict on the missing plates.');
  process.exit(2);
}
if (!rows.length) { console.error('ERROR: 0 plates measured.'); process.exit(2); }
