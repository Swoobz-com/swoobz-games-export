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
// ############################################################################################
// # ⛔ IT WAS HUE-LOCKED TO GREEN AND RANKED A MAGENTA PLATE AS THE CLEANEST IN THE SET.       #
// #    --plate IS NOW REQUIRED AND THE BACKDROP IS CROSS-CHECKED AGAINST IT. (phase 261, §5)  #
// #                                                                                            #
// # THE DEFECT. `greenExcess = g - max(r,b)` cannot be positive over a magenta backdrop, so a  #
// # magenta plate counts almost nothing and sorts to the TOP of the table:                     #
// #   node qa-boss/screen-translucency.mjs qa-boss/anchors/mk/pale-choir-anchor-green.png \    #
// #        .../pale-choir-anchor-magenta.png .../hector-warhammer-anchor-green.png ...         #
// #     1.35   2.8  279848  pale-choir-anchor-magenta      <- "cleanest plate in the set"      #
// #     3.01   5.3  288501  hector-warhammer               <- the actual best plate            #
// #     3.58   5.4  287392  pale-choir                     <- the SAME character, green plate  #
// #   exit 0. The magenta row is not a measurement at all; it is the metric being blind.       #
// # pale-choir is one of the six MK FINAL kits queued to fire next, so this is a live path.    #
// #                                                                                            #
// # THE MIRROR. Green plate = one dominant channel, so excess = g - max(r,b). Magenta plate =  #
// # TWO dominant channels with green starved, so the strict mirror is min(r,b) - g: both plate #
// # channels must clear green. That is the same shape cut-bloom-plate.mjs uses for its magenta #
// # family test (`r > g+25 && b > g+25`, phase 260). The alternative ((r+b)/2 - g) was measured #
// # and changes nothing structural — the per-plate maxima move 10 -> 18.5 (pale-choir) and     #
// # 59 -> 88 (ir56), still far under the 130 cap.                                              #
// #                                                                                            #
// # ⚠ THE MAGENTA NUMBER IS NOT COMPARABLE TO THE GREEN 5/7 BANDS, AND THAT IS MEASURED, NOT   #
// # ASSUMED. Two independent reasons:                                                          #
// #  1. SCALE. The excess of a blend is (1-alpha) x the BACKDROP's own excess. The magenta      #
// #     plate in this repo is rgb(163,0,95) -> backdrop excess 95. The six GREEN plates the     #
// #     3.0/4.9/7.3/11.5 bands were calibrated on run 145-209. The same physical translucency   #
// #     therefore scores roughly HALF on magenta.                                              #
// #  2. THE MAGENTA ANCHORS IN THIS REPO CARRY NO BLEND PIXELS AT ALL. Hue-free check (L1       #
// #     distance to the sampled backdrop, no hue assumption): share of subject within L1 120    #
// #     of the plate —                                                                          #
// #        pale-choir-anchor-magenta 0.00%   pale-choir-anchor-green 1.16%                      #
// #        onryo-katana-anchor       0.01%   onryo-katana-anchor-green 3.68%                    #
// #        ir56-lion-serpent-anchor  0.14%   ir56-lion-serpent-anchor-green 1.41%               #
// #     Their mattes are HARD. Mirrored transl% then reads 0.00-0.04% on 8 of the 10 paired     #
// #     anchors while the green twins read 3.6-24.1. ir37-pink-tessen is the exception at       #
// #     21.72% — she is a PINK character, i.e. the exact mirror of the grnDom confound, which   #
// #     is why magDom% replaces grnDom% on this plate.                                          #
// # CONSEQUENCE, ENCODED BELOW: a HIGH magenta reading is still informative, but a LOW one is   #
// # NOT a clean bill and this tool will never print one as if it were. If the character has a   #
// # GREEN twin plate, screen that instead — it is the calibrated instrument.                    #
// #                                                                                            #
// # AND THE DECLARED PLATE IS NOW CROSS-CHECKED against the sampled backdrop, so `--plate green` #
// # on a magenta plate can no longer print 1.35%: it refuses (exit 2) and says which file.      #
// ############################################################################################
//
// § ZERO-SUBJECT PLATES ARE NO LONGER DROPPED IN SILENCE (phase 261, TOOLCHAIN-AUDIT §4).
// A readable plate with no subject pixels used to fall out of the table with no row and no word:
// 3 plates asked, 2 rows printed, exit 0. screen-emissive.mjs already handled the identical case
// correctly, so its handling is COPIED here rather than re-invented — the same
// `failed.push([f, 'no subject pixels — plate is entirely background?'])`, the same
// "N of M plate(s) measured" denominator printed above the table, the same exit 2.
//
// ############################################################################################
// # ⚠⚠ THIS IS A REPORTER, NOT A GATE. IT HAS NO FAILING EXIT CODE, AND THAT IS DELIBERATE.  #
// #                                                                                          #
// #   exit 0 = "every plate you named was MEASURED". It does NOT mean "every plate is clean". #
// #   exit 2 = "a plate could NOT be measured" (unreadable, wrong plate, no subject pixels).  #
// #   THERE IS NO EXIT 1. A row reading "TRANSLUCENT, will fringe" still exits 0.             #
// #                                                                                          #
// # ⛔ NEVER CHAIN THIS BEHIND `&&` EXPECTING A VERDICT. `screen-translucency ... && key ...`  #
// # proceeds on a plate this tool has just called unusable.                                   #
// #                                                                                          #
// # WHY REPORTER AND NOT GATE — the call sites decided this, not preference (phase 262):      #
// #  1. ITS OWN SIBLING ALREADY MADE THIS CALL FOR THE SAME REASON. screen-emissive.mjs has   #
// #     the identical shape (table, no exit 1, exit 2 only for unmeasured plates) and says so #
// #     inline: "It used to say 'reject' outright, which over-claimed: drake-glaive trips the #
// #     top band on baked orange rim light, and rim light SHIPS by pinning it inline (raiju,  #
// #     lich). The reject stays a human call."                                                 #
// #  2. IT IS SCREEN #4 OF A TRIAGE SET over CANDIDATE plates                                 #
// #     (qa-boss/anchors/MK-FINAL-WAVE2-SCREEN.md), whose whole calibration table was         #
// #     established BY EYE first. Its job is to rank a batch for a human to look at.          #
// #  3. THE NUMBER IS EXPLICITLY NOT A VERDICT ON ITS OWN. A plate-coloured character inflates #
// #     transl% (hydra-flail 36.15% and not translucent at all), so the tool prints the        #
// #     reading as an UPPER BOUND; and on magenta the green-calibrated bands do not transfer,  #
// #     so a LOW number is not a pass either. Neither of those can be an exit code.            #
// #  4. THE >= 7 BAND IS NOT AN AUTOMATIC REJECT. lich-scythe at 4.93 ships because its kit    #
// #     PINS the small translucent feature — the header's own calibration point.               #
// #  5. IT TAKES N PLATES AND PRINTS N ROWS. One exit code cannot carry a per-plate verdict,   #
// #     and a batch screen where one candidate is translucent is the NORMAL, EXPECTED result.  #
// #                                                                                            #
// # SO IT IS MADE HONEST RATHER THAN GIVEN A FAKE VERDICT: the banner below prints on BOTH     #
// # streams, and a SUMMARY LINE counts the rows in each band so a "will fringe" row cannot     #
// # scroll past unnoticed. If a real gate is ever wanted, it must be a separate tool that      #
// # takes ONE plate and states which band it demands — not an exit code bolted onto a table.   #
// ############################################################################################
//
// usage: node qa-boss/screen-translucency.mjs --plate green|magenta <plate.png> [...]
import { createRequire } from 'node:module'; import fs from 'node:fs';
import { makeArgs } from './lib/argcheck.mjs';
const require = createRequire(import.meta.url); const { PNG } = require('pngjs');

const LO = 18, HI = 130;
const USAGE = 'usage: node qa-boss/screen-translucency.mjs --plate green|magenta <plate.png> [...]';

// ONE DOOR FOR ARGUMENTS. The hand-rolled indexOf/skip-set/unknown-flag parser that used to sit here
// is DELETED — it had to re-derive "which argv slots were the flag's" by hand, which is exactly the
// bookkeeping argcheck exists to own. `--plate` required-ness, its value set, a repeated `--plate`,
// an empty-string value and unknown flags are all argcheck's now.
const A = makeArgs(process.argv.slice(2), { tool: 'screen-translucency', usage: USAGE });
// NO DEFAULT PLATE, DELIBERATELY. The silent green default is what ranked pale-choir's MAGENTA
// plate above hector-warhammer, the best plate in the calibration set. It will not guess.
const PLATE = A.str('--plate', null, {
  oneOf: ['green', 'magenta'],
  required: true,
  why: 'The metric is hue-directional. Read a MAGENTA plate with the green metric and it counts '
     + 'almost nothing and sorts to the TOP of the table as the cleanest plate (measured: '
     + 'pale-choir-anchor-magenta 1.35% vs its own green twin 3.58%). '
     + 'Magenta-plate characters: ir56-lion-serpent, onryo-katana, pale-choir.',
});
const asked = A.positionals();
A.done();

if (!asked.length) { console.error('ERROR: no plates given — nothing was measured.'); process.exit(2); }

// THE BANNER, ON BOTH STREAMS. stdout so it is in scrollback next to the table; stderr so it
// survives `> table.txt` and shows up in a log where only errors are kept.
const BANNER = '⚠ screen-translucency is a REPORTER, NOT A GATE: it has NO failing exit code. '
  + 'exit 0 = "measured", NOT "clean". Do not chain it behind && expecting a verdict.';
console.log(BANNER);
console.error(BANNER);

// green  — one dominant channel: how far g clears the highest other channel.
// magenta— TWO dominant channels with green starved: how far the LOWER of them clears green.
//          Strict mirror, and the same shape as cut-bloom-plate.mjs's magenta family test.
const plateExcess = PLATE === 'magenta'
  ? (r, g, b) => Math.min(r, b) - g
  : (r, g, b) => g - Math.max(r, b);
// The CONFOUND column: a character COLOURED like the plate inflates transl%. See header.
const isPlateDom = PLATE === 'magenta'
  ? (r, g, b) => r > g && b > g
  : (r, g, b) => g > r && g > b;
// Is the sampled backdrop actually the plate the caller declared? Every plate PNG in this repo has
// a flat, unambiguous backdrop (green plates rgb(0..52,130..252,0..64); magenta rgb(163,0,95)), so
// this separates them with room to spare at a 25-margin — the same margin cut-bloom-plate uses.
const backdropIsPlate = PLATE === 'magenta'
  ? (r, g, b) => r > g + 25 && b > g + 25
  : (r, g, b) => g > r + 25 && g > b + 25;

// MEASURE FIRST, REPORT AFTER — so the "N of M" denominator is known before the table is printed
// and a dropped plate can never be a missing row nobody counted.
const rows = [], failed = [];
for (const f of asked) {
  // NEVER skip silently. A mistyped path used to `continue` here, so a screen over a bad path list
  // printed a short clean table and READ AS "all clean" — the vacuous-pass bug, the same one that
  // made check-extra-objects report CLEAN off zero frames. Collect failures and fail loudly below.
  let p; try { p = PNG.sync.read(fs.readFileSync(f)); } catch (e) { failed.push([f, e.code || e.message]); continue; }
  const { width: W, height: H, data: d } = p;
  const bi = 0, bg = [d[bi], d[bi+1], d[bi+2]];
  // THE WRONG-PLATE GUARD, BEFORE ANY NUMBER IS PRODUCED. A row printed off the wrong metric is
  // worse than no row: it is confidently clean.
  if (!backdropIsPlate(bg[0], bg[1], bg[2])) {
    failed.push([f, `backdrop is rgb(${bg.join(',')}) — that is not a ${PLATE} plate, so the ${PLATE} metric would measure nothing and print it as the cleanest plate in the set`]);
    continue;
  }
  const isBg = (r,g,b,a) => a < 24 || (Math.abs(r-bg[0])<26 && Math.abs(g-bg[1])<26 && Math.abs(b-bg[2])<26);
  let sub = 0, tr = 0, gdom = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
    if (isBg(r,g,b,a)) continue;
    sub++;
    const ex = plateExcess(r, g, b);
    if (ex >= LO && ex <= HI) tr++;
    if (isPlateDom(r, g, b)) gdom++;   // the CONFOUND: a plate-coloured character, see header
  }
  // Copied from screen-emissive.mjs, which already handled this correctly (TOOLCHAIN-AUDIT §4).
  if (!sub) { failed.push([f, 'no subject pixels — plate is entirely background?']); continue; }
  rows.push({ f: f.split(/[\/]/).pop().replace(/-anchor-green\.png|\.png/,''), t: (tr/sub)*100, g: (gdom/sub)*100, sub });
}
rows.sort((a,b) => a.t - b.t);
// The denominator screen-emissive prints and this tool did not. A short table is now visibly short.
console.log(`${rows.length} of ${asked.length} plate(s) measured  [--plate ${PLATE}]\n`);
console.log(`  transl%  ${PLATE === 'magenta' ? 'magDom%' : 'grnDom%'}   subj px    plate`);
console.log('  ' + '-'.repeat(74));
for (const r of rows) {
  // A PLATE-COLOURED CHARACTER inflates transl%. Report the confound, but NEVER let it suppress the
  // verdict — the dom% column says the reading is an UPPER BOUND, not that the plate has a keying problem.
  const green = r.g >= 25;
  const verdict = r.t >= 7 ? 'TRANSLUCENT, will fringe' : (r.t >= 5 ? 'some see-through, inspect' : '');
  const domWord = PLATE === 'magenta' ? 'magenta-dominant' : 'green-dominant';
  const domNote = PLATE === 'magenta' ? 'the character is magenta/pink, not see-through' : 'the character is green, not see-through';
  const flag = green
    ? `  <- ${r.g.toFixed(0)}% ${domWord}: transl% is an UPPER BOUND (${domNote})`
      + (verdict ? ` · at face value: ${verdict}` : '')
      + ` · NOT an alpha-holes signal — see header`
    : (verdict ? `  <- ${verdict}` : '');
  // A LOW magenta number is NOT a clean bill — the bands are green-calibrated and the magenta plate
  // is roughly half as saturated. Never let this tool print magenta silence as "clean".
  const mag = PLATE === 'magenta'
    ? `  [MAGENTA: green-calibrated bands DO NOT transfer — a low number is not a pass; screen the green twin if one exists]`
    : '';
  console.log(`  ${r.t.toFixed(2).padStart(6)}  ${r.g.toFixed(1).padStart(6)}   ${String(r.sub).padStart(8)}   ${r.f}${flag}${mag}`);
}
// THE BAND TALLY. A table is scanned, not read, and the row that matters can scroll past — so the
// count of rows in each band is stated in one line underneath it. This is the closest thing this
// tool has to a verdict, and it is deliberately a SENTENCE rather than an exit code: see the
// REPORTER banner at the top of this file for why.
const nFringe = rows.filter((r) => r.t >= 7).length;
const nInspect = rows.filter((r) => r.t >= 5 && r.t < 7).length;
const nClean = rows.filter((r) => r.t < 5).length;
console.log(`\n  bands: ${nClean} under 5 (clean) · ${nInspect} in 5-7 (inspect) · ${nFringe} at or over 7 (TRANSLUCENT, will fringe)`);
if (nFringe || nInspect) {
  const line = `⚠ ${nFringe} plate(s) read TRANSLUCENT and ${nInspect} need inspection — and this tool STILL EXITS 0. `
    + 'Look at those plates before keying: the reject is a human call (the >= 7 band is not automatic — '
    + 'lich-scythe ships at 4.93 because its kit pins the feature).';
  console.log(line);
  console.error(line);
}
if (PLATE === 'magenta') {
  const line = '⚠ --plate magenta: the 5/7 bands are GREEN-calibrated and do not transfer. A LOW number here '
    + 'is NOT a clean bill. Screen the green twin plate if one exists — that is the calibrated instrument.';
  console.log(line);
  console.error(line);
}

// Say plainly what was NOT measured. Silence here is indistinguishable from a clean result.
if (failed.length) {
  console.error(`\nERROR: ${failed.length} of ${asked.length} plate(s) could NOT be measured:`);
  for (const [f, why] of failed) console.error(`  ${f}  (${why})`);
  console.error('The table above is INCOMPLETE. Do not read it as a verdict on the missing plates.');
  process.exit(2);
}
if (!rows.length) { console.error('ERROR: 0 plates measured.'); process.exit(2); }
