#!/usr/bin/env node
// ############################################################################################
// # GLOW-SURVIVAL SCREEN — does the character KEEP its lit feature after keying? (phase 201)  #
// #                                                                                          #
// # WHY. ir52-umbra-pinions was found by ACCIDENT: an unrelated p99 warning made me render    #
// # its alpha, and every bright MAGENTA GLOW MEMBRANE between its wing blades had been keyed  #
// # away. The backdrop came off perfectly; part of the SUBJECT vanished. The character would  #
// # have shipped as a skeletal wing frame with holes where its signature feature belongs, and #
// # its kit is gate-clean and sits in the fire queue. Luck is not a method, so this is the    #
// # generalisation.                                                                           #
// #                                                                                          #
// # THE DISTINCTION THAT MATTERS, and no existing screen makes it:                            #
// #   RIM LIGHT / lit material  — OPAQUE. Survives the key. Ships fine if PINNED inline        #
// #                               (drake-glaive, raiju, lich all do this).                     #
// #   GLOW / bloom / aura       — SEMI-TRANSPARENT over the plate, so it BLENDS with the       #
// #                               backdrop and the border-seeded flood eats it.                #
// # emis% cannot tell them apart — it measures brightness+saturation, not opacity. This can,  #
// # because it just asks: of the pixels that read as emissive on the PLATE, how many are      #
// # still OPAQUE in the keyed alpha?                                                          #
// #                                                                                            #
// # READ IT AS: survival% near 100 = the lit feature is opaque material, pin it and ship.      #
// #             survival% low      = the lit feature is glow and it will be GUTTED. Render     #
// #                                  the mask and look before writing or firing a kit.         #
// # It is a SCREEN, not a verdict — the mask is still the verdict. It exists to tell you       #
// # WHICH masks are worth opening.                                                             #
// #                                                                                            #
// # CALIBRATED AGAINST GROUND TRUTH ON BOTH SIDES, which is the only reason the bands mean      #
// # anything (and the reason this shipped where the phase-186 hot-core metric did not):        #
// #   ir52-umbra-pinions   42.8%  GUTTED — confirmed by rendering the mask; membranes gone     #
// #   ir37-pink-tessen     94.7%  SHIPPED, 13 ACCEPTED CLIPS — so the middle band is FINE      #
// #   lich / drake / raiju / kitsune / ir60 and 17 others  100%  — opaque, several shipped     #
// # Swept the whole roster: ir52 is the ONLY plate whose lit feature keys away. The hazard is  #
// # real but it is RARE, so treat a sub-80% reading as a genuine alarm, not routine noise.     #
// #                                                                                            #
// # usage: node qa-boss/screen-glow-survival.mjs <plate.png> [...]                             #
// ############################################################################################
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

// ############################################################################################
// # ⚠ THE MAGENTA-FAMILY ESCAPE DESTROYS MAGENTA CHARACTERS (phase 203, proven by measurement) #
// #                                                                                          #
// # The candidate rule is  dist2 < LOOSE^2  OR  min(r-g, b-g) > 45. That second clause exists #
// # so MAGENTA PLATES key (onryo-katana uses one). But it is a HUE rule with no distance      #
// # term, so it fires on magenta ANYWHERE IN THE FRAME — including on the character.          #
// #                                                                                          #
// # ir52-umbra-pinions is the case. Its wing membranes are rgb(254,0,249): pure saturated     #
// # magenta, sitting a DISTANCE OF 420 from the plate colour when LOOSE is 70. They are       #
// # nowhere near the backdrop. They trip the escape at min(r-g,b-g)=249 and 51,252 subject    #
// # pixels are flooded away, gutting the character of its signature feature.                  #
// #                                                                                          #
// # MEASURED BOTH WAYS on that plate:                                                          #
// #     escape ON   glow survival  42.8%   backdrop pixels left opaque 376                    #
// #     escape OFF  glow survival 100.0%   backdrop pixels left opaque 381                    #
// # Backdrop removal is UNAFFECTED, because a GREEN plate is removed by the DISTANCE test.    #
// # The escape contributes nothing on a green plate and costs everything on a magenta subject.#
// #                                                                                          #
// # THE RULE, and it must be PER-CHARACTER because a global change would break magenta plates:#
// #     green plate + magenta identity colour  ->  escape OFF                                  #
// #     magenta plate                          ->  escape ON (it is what removes the plate)    #
// #                                                                                          #
// # Nothing else in the roster trips this: the glow-survival sweep put every other plate at    #
// # 94.7% or above. But screen ANY new magenta-accented character with                         #
// # qa-boss/screen-glow-survival.mjs before writing its kit.                                   #
// ############################################################################################
const TIGHT = 45, LOOSE = 70;   // must match scripts/key-idle-clips.mjs and check-plate-key.mjs
const EM_BRIGHT = 215, EM_SAT = 70;

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: node qa-boss/screen-glow-survival.mjs <plate.png> [...]');
  console.error('ERROR: no plates given — nothing was measured.');
  process.exit(2);
}

// --no-magenta: model the keying that scripts/key-idle-clips.mjs will ACTUALLY use for a character
// whose own identity colour is magenta (see the escape note above). Without this the screen keeps
// reporting a SOLVED case as an alarm, and an alarm that stays lit after the fix is how a screen
// gets ignored.
const noMagenta = process.argv.includes("--no-magenta");

const dist2 = (r, g, b, c) => { const a = r - c[0], e = g - c[1], f = b - c[2]; return a * a + e * e + f * f; };

console.log('plate'.padEnd(32) + 'emisPx   survived  survival%   verdict');
console.log('-'.repeat(92));

const rows = [], failed = [];
for (const file of files) {
  let p; try { p = PNG.sync.read(fs.readFileSync(file)); }
  catch (e) { failed.push([file, e.code || e.message]); continue; }
  const W = p.width, H = p.height, d = p.data;

  // screen colour exactly as the keyer picks it: mean of the 2px border ring
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) { const i = (y * W + x) * 4; sr += d[i]; sg += d[i+1]; sb += d[i+2]; n++; }
  for (let y = 0; y < H; y++) for (const x of [0, 1, W - 2, W - 1]) { const i = (y * W + x) * 4; sr += d[i]; sg += d[i+1]; sb += d[i+2]; n++; }
  const screen = [sr / n, sg / n, sb / n];

  // same alpha stage as check-plate-key: tight kill, loose candidate, border-seeded flood
  const alpha = new Uint8Array(W * H).fill(255);
  const cand = new Uint8Array(W * H);
  const t2 = TIGHT * TIGHT, l2 = LOOSE * LOOSE;
  for (let q = 0, i = 0; q < W * H; q++, i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    const dd = dist2(r, g, b, screen);
    if (dd < l2 || (!noMagenta && Math.min(r - g, b - g) > 45)) cand[q] = 1;
    if (dd < t2) alpha[q] = 0;
  }
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  const seen = new Uint8Array(W * H);
  while (stack.length) {
    const q = stack.pop();
    if (seen[q] || !cand[q]) continue;
    seen[q] = 1; alpha[q] = 0;
    const x = q % W, y = (q / W) | 0;
    if (x > 0) stack.push(q - 1);
    if (x < W - 1) stack.push(q + 1);
    if (y > 0) stack.push(q - W);
    if (y < H - 1) stack.push(q + W);
  }

  // THE MEASUREMENT: of pixels that read EMISSIVE on the plate, how many are still opaque?
  let emisPx = 0, survived = 0;
  for (let q = 0, i = 0; q < W * H; q++, i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (!(mx >= EM_BRIGHT && mx - mn >= EM_SAT)) continue;
    // ignore the backdrop itself, which is bright+saturated on a chroma plate
    if (dist2(r, g, b, screen) < l2) continue;
    emisPx++;
    if (alpha[q]) survived++;
  }
  rows.push({ f: file.split(/[\\/]/).pop().replace(/-anchor-green\.png|\.png/, ''), emisPx, survived });
}

for (const r of rows) {
  const pct = r.emisPx ? (r.survived / r.emisPx) * 100 : 100;
  const verdict = r.emisPx < 500 ? 'no meaningful lit feature'
    : pct >= 95 ? 'OPAQUE lit feature — survives, PIN it inline'
    : pct >= 80 ? 'mostly survives — render the mask and check the edges'
    : 'GLOW — IT KEYS AWAY. Render the mask. The character will be GUTTED of this feature.';
  console.log(`${r.f.padEnd(32)}${String(r.emisPx).padStart(7)}${String(r.survived).padStart(10)}${pct.toFixed(1).padStart(10)}%   ${verdict}`);
}

if (failed.length) {
  console.error(`\nERROR: ${failed.length} of ${files.length} plate(s) could NOT be read — they were NOT measured:`);
  for (const [f, why] of failed) console.error(`  ${f}  (${why})`);
  console.error('The table above is INCOMPLETE. Do not read it as a verdict on the missing plates.');
  process.exit(2);
}
if (!rows.length) { console.error('ERROR: 0 plates measured.'); process.exit(2); }
