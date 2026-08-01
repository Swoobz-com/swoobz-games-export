// CHECK-PLATE-KEY — key a STILL anchor plate with the REAL keyer math and report whether the alpha
// comes out clean. The decisive pre-kit plate test, and it is free.
//
// ############################################################################################
// # WHY THIS EXISTS (phase 107, 2026-07-31).                                                  #
// # raiju-naginata sat BLOCKED for ~15 phases on a "two-tone plate", with a standing action of #
// # "re-plate it, or generate ONE clip first and key that". Nobody took the third option: the  #
// # plate is a STILL, so you can run the keyer on it and LOOK AT THE ALPHA without spending a  #
// # generation. Result: a clean silhouette, no rectangle, and the block was wrong.             #
// #                                                                                            #
// # The lesson that generalises: TOP-GREEN-BIN SHARE IS A SCREENING METRIC, NOT A VERDICT.     #
// # raiju's bin share (56.7% by one predicate, 62.7% by another) says "two-tone", but the      #
// # colour spread never approaches the keyer's threshold: 99.4% of backdrop pixels sit within  #
// # 29 of the border-sampled colour, against TIGHT=45. The eye sees a rectangle because it is  #
// # very sensitive to a FLAT-vs-NOISY boundary; the keyer cannot, because it only measures     #
// # distance. Both facts are true at once, which is why the visual and the metric disagreed.   #
// ############################################################################################
//
// WHAT IT DOES — a faithful port of scripts/key-idle-clips.mjs's alpha stage, and nothing else:
//   screen  = mean of the 2px border ring (exactly how the keyer picks the screen colour)
//   alpha=0 where dist2(px, screen) < TIGHT^2
//   cand    = dist2 < LOOSE^2  OR  min(r-g, b-g) > 45   (the magenta-family escape)
//   then a BORDER-SEEDED flood over cand sets alpha=0 — interiors stay protected
// It deliberately stops before feather/despill: those cannot create a rectangle, only soften one.
//
// READ THE OUTPUT LIKE THIS:
//   opaque%     — should be a plausible subject area. A padded MK plate runs ~10-20%. A number
//                 near the bbox-envelope fraction means backdrop SURVIVED: go look at the mask.
//   p99 / max   — distance of backdrop pixels from the sampled screen colour. p99 well under
//                 TIGHT (45) means the plate keys with margin. A large max is usually the flood
//                 touching an anti-aliased character edge, NOT a backdrop defect — which is the
//                 documented false-positive mode (see PLATE-PRECHECKS.md).
//   THE MASK IS THE VERDICT. Always open it. A rectangular alpha edge is instantly obvious and
//   no summary number reliably shows it.
//
// LIMIT, and it matters: this tests a STILL. A generated CLIP adds compression and motion blur
// that can widen the spread, so a clean plate here still owes you a check of the FIRST keyed clip.
//
// Usage: node qa-boss/check-plate-key.mjs <plate.png> [more.png ...] [--out-dir qa-boss/frames/platekey]
import fs from 'node:fs';
import path from 'node:path';
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
const TIGHT = 45, LOOSE = 70;          // must match scripts/key-idle-clips.mjs

// ############################################################################################
// # BAKED-EMISSIVE SCREEN — AND WHY IT IS HUE-AGNOSTIC (phase 109).                            #
// # A character with baked flame/lightning is unusable (the "kitsune blocker"), so this is the  #
// # cheapest thing worth measuring on a plate. My first version of this screen tested for       #
// # NEAR-WHITE and for WARM emissives (r>=235, g>=200, b<160) — and it was WRONG, in a way that #
// # a whole 23-candidate screen was built on top of before a kit-writing agent caught it:       #
// #                                                                                            #
// #   lich-scythe carries a VIOLET crown flame, brightest rgb(214,157,255). Blue-dominant, so   #
// #   it fails the warm test AND the near-white test. Measured 0.00% warm — actually 0.77%.     #
// #   drake-glaive scored 0.49% "clean" on the warm test and 5.26% here: a clear REJECT that    #
// #   had already been promoted into a shortlist tier on the strength of the bad number.        #
// #   wight-spear scored 0.00% warm while its cyan glow was plainly visible in a contact sheet. #
// #                                                                                            #
// # A flame can be any colour. Test the two properties that make a pixel READ as emissive       #
// # regardless of hue: it is BRIGHT and it is SATURATED. Warm, violet, cyan and acid-green all  #
// # satisfy that; ordinary lit material does not, because lit material desaturates as it        #
// # brightens. Near-white is kept as a separate column because a white-hot CORE is often the    #
// # only part of a flame that is not saturated at all.                                          #
// ############################################################################################
const EM_BRIGHT = 215;   // max channel
const EM_SAT = 70;       // max - min
const argv = process.argv.slice(2);
const oi = argv.indexOf('--out-dir');
const OUT = oi >= 0 ? argv[oi + 1] : 'qa-boss/frames/platekey';
const files = argv.filter((a, i) => !a.startsWith('--') && (oi < 0 || (i !== oi + 1)));
if (!files.length) {
  console.error('usage: node qa-boss/check-plate-key.mjs <plate.png> [...] [--out-dir <dir>]');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

// --no-magenta: model the keying that scripts/key-idle-clips.mjs will ACTUALLY use for a character
// whose own identity colour is magenta (see the escape note above). Without this the screen keeps
// reporting a SOLVED case as an alarm, and an alarm that stays lit after the fix is how a screen
// gets ignored.
const noMagenta = process.argv.includes("--no-magenta");

const dist2 = (r, g, b, c) => {
  const a = r - c[0], e = g - c[1], f = b - c[2];
  return a * a + e * e + f * f;
};

console.log('plate'.padEnd(30) + 'opaque%  emis%  white%  p99  max   verdict');
console.log('-'.repeat(78));
let worst = 0;
for (const file of files) {
  const p = PNG.sync.read(fs.readFileSync(file));
  const W = p.width, H = p.height, d = p.data;

  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) { const i = (y * W + x) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; }
  for (let y = 0; y < H; y++) for (const x of [0, 1, W - 2, W - 1]) { const i = (y * W + x) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; }
  const screen = [sr / n, sg / n, sb / n];

  const alpha = new Uint8Array(W * H).fill(255);
  const cand = new Uint8Array(W * H);
  const t2 = TIGHT * TIGHT, l2 = LOOSE * LOOSE;
  for (let q = 0, i = 0; q < W * H; q++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const dd = dist2(r, g, b, screen);
    if (dd < l2 || (!noMagenta && Math.min(r - g, b - g) > 45)) cand[q] = 1;
    if (dd < t2) alpha[q] = 0;
  }
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  const seen = new Uint8Array(W * H);
  const dists = [];
  while (stack.length) {
    const q = stack.pop();
    if (seen[q] || !cand[q]) continue;
    seen[q] = 1; alpha[q] = 0;
    const i = q * 4;
    dists.push(Math.hypot(d[i] - screen[0], d[i + 1] - screen[1], d[i + 2] - screen[2]));
    const x = q % W, y = (q / W) | 0;
    if (x > 0) stack.push(q - 1);
    if (x < W - 1) stack.push(q + 1);
    if (y > 0) stack.push(q - W);
    if (y < H - 1) stack.push(q + W);
  }
  dists.sort((a, b) => a - b);
  const p99 = dists.length ? dists[Math.floor(dists.length * 0.99)] : 0;
  const max = dists.length ? dists[dists.length - 1] : 0;

  let opaque = 0, emis = 0, white = 0;
  for (let q = 0; q < W * H; q++) {
    if (!alpha[q]) continue;
    opaque++;
    const i = q * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx >= EM_BRIGHT && (mx - mn) >= EM_SAT) emis++;
    if (r >= 250 && g >= 250 && b >= 250) white++;
  }
  const op = 100 * opaque / (W * H);
  const emp = 100 * emis / (opaque || 1);
  const whp = 100 * white / (opaque || 1);

  const out = new PNG({ width: W, height: H });
  for (let q = 0; q < W * H; q++) { const i = q * 4; const v = alpha[q] ? 255 : 0; out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255; }
  const maskPath = path.join(OUT, path.basename(file).replace(/\.png$/i, '') + '-alpha.png');
  fs.writeFileSync(maskPath, PNG.sync.write(out));

  const keyOk = p99 < TIGHT;
  // Emissive is reported ALONGSIDE the key result, never folded into it: a plate can key
  // perfectly and still be unusable because a flame is baked into the character.
  // THE p99 WARNING CAN BE BACKWARDS — read it as "subject and backdrop are hard to separate", never
// as "the backdrop survives" (phase 200). ir52-umbra-pinions returned p99 404.6 against max 424 with
// the verdict "p99 >= TIGHT — backdrop may survive". Rendering the mask showed the OPPOSITE failure:
// the backdrop is removed perfectly, and part of the SUBJECT is what disappears — every bright
// magenta GLOW MEMBRANE between its wing blades keys away, because a semi-transparent glow over the
// plate blends into the backdrop. The character keeps its black wing frame and loses its signature
// feature entirely, which for a character named Umbra PINIONS is an identity kill.
// So a high p99 means the separation is unreliable IN EITHER DIRECTION. ALWAYS render the mask and
// compare it against the plate: the number cannot tell you which side lost.
//
// THIS SCREEN CANNOT TELL RIM LIGHT FROM FLAME — both are bright+saturated, and only the eye can
  // separate them. It used to auto-REJECT at >=3%, which over-claimed: drake-glaive trips this band
  // (4.63% on his keyed plate) and inspection showed BAKED ORANGE RIM LIGHT tracing his wings, scales
  // and limbs — the same class as raiju's pale blue-white fur rim (1.97%) and lich's violet crown
  // flame (0.77%), both of which SHIPPED by pinning the feature inline. So the high band routes to a
  // LOOK with the two outcomes named, and the reject stays a human call.
  const emVerdict = emp >= 3
    ? 'STRONG emissive — LOOK: rim light → PIN it inline ("stays exactly as bright as in the reference"); live flame/lightning → reject'
    : emp >= 1 ? 'emissive feature — LOOK' : '';
  const verdict = [keyOk ? 'keys with margin' : 'p99 >= TIGHT — backdrop may survive', emVerdict]
    .filter(Boolean).join(' · ');
  if (!keyOk || emp >= 3) worst = 1;
  console.log(
    path.basename(file).replace(/\.png$/i, '').padEnd(30) +
    op.toFixed(2).padStart(6) + '  ' + emp.toFixed(2).padStart(5) + '  ' + whp.toFixed(2).padStart(6) + '  ' +
    p99.toFixed(1).padStart(4) + ' ' + max.toFixed(0).padStart(4) + '   ' + verdict,
  );
}
console.log('-'.repeat(78));
console.log('masks -> ' + OUT + '   (THE MASK IS THE VERDICT — a rectangular alpha edge is obvious and no number shows it)');
process.exit(worst);
