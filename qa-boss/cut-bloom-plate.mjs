// cut-bloom-plate — deletes BACKDROP THAT AN EMISSIVE EFFECT LIT UP.
//
// THE DEFECT (found on ir48 special_3 v6, session 14)
// A bright effect — a glowing blade, a beam, a hot edge — BLOOMS onto the green plate around it.
// Those plate pixels are now bright yellow-green, i.e. FAR from the sampled pure green, so the
// distance-based key in key-idle-clips.mjs keeps them. green-neutralize then forces g <= max(r,b)
// on them, which lands them at r ~= g and renders as a wide sickly OLIVE halo wrapped around the
// hero effect. On ir48 special_3 that halo was 3.04% of all visible pixels.
//
// WHY THE OBVIOUS FIX IS WRONG
// The halo looks like it wants to be recoloured gold. It must NOT be: it is not part of the
// effect, it is lit BACKDROP. Tinting it warm paints the plate and ships a fabricated bloom that
// tracks the plate's shape rather than the blade's. Compare the RAW frame before choosing —
// in the raw, the effect is a thin blade line and everything around it is visibly plate.
// Delete it; if the result wants bloom, add bloom in the engine where it can be art-directed.
//
// HOW TO SEE IT
// Invisible in a downscaled composite. Composite ONE peak frame over near-black and zoom >=2x
// with flags=neighbor. The tell is a broad elliptical chartreuse wash that does not follow the
// silhouette. Global olive% stays low (0.81% here) because the halo is small next to the body —
// a passing plate-retention number does NOT clear this.
//
// ORDER: key-idle-clips -> check-plate-retention (BEFORE) -> green-neutralize <dir> 4
//        -> cut-bloom-plate <dir> -> edge-feather (only where an edge overruns) -> ffmpeg VP9
//
// ⛔ IT USED TO DESTROY MAGENTA-PLATE CHARACTERS. --plate IS NOW REQUIRED. (phase 260)
// This test was green-family ONLY and had no plate flag. Run on ir56-lion-serpent — a GREEN creature
// keyed off a MAGENTA plate precisely because it is green — it deleted 28.06% of visible pixels
// (his entire armour) and EXITED 0, with check-plate-retention --plate magenta still reporting
// 0.00% clean afterwards. Every gate stayed green while the character was mutilated.
// THREE characters are magenta-plate: ir56-lion-serpent, onryo-katana, pale-choir — and pale-choir
// is one of the six MK FINAL kits queued to fire next.
// Confirm a kit's plate before running:
//   node qa-boss/build-prompt.mjs qa-boss/prompts/<kit>.md idle | grep -oiE "solid saturated [A-Z]+"
//
// Usage: node qa-boss/cut-bloom-plate.mjs <framesDir> --plate green|magenta [--dry] [--allow-large]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'package.json'));
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const dir = argv.find((a) => !a.startsWith('--'));
const dry = argv.includes('--dry');
const allowLarge = argv.includes('--allow-large');
const plateIdx = argv.indexOf('--plate');
const plate = plateIdx === -1 ? null : argv[plateIdx + 1];

const USAGE = 'usage: node qa-boss/cut-bloom-plate.mjs <framesDir> --plate green|magenta [--dry] [--allow-large]';
if (!dir) { console.error(USAGE); process.exit(2); }
// NO DEFAULT PLATE, DELIBERATELY. A silent green default is exactly what ate ir56's armour, and the
// failure is invisible: the tool reports success and the downstream retention check still passes.
if (plate !== 'green' && plate !== 'magenta') {
  console.error('ERROR: --plate is REQUIRED and must be green or magenta.');
  console.error('  This tool DELETES pixels. On the wrong plate it deletes the CHARACTER — it once');
  console.error('  removed 28% of ir56-lion-serpent and exited 0. It will not guess.');
  console.error('  Magenta-plate characters: ir56-lion-serpent, onryo-katana, pale-choir.');
  console.error(USAGE);
  process.exit(2);
}
if (!fs.existsSync(dir)) { console.error(`ERROR: no such directory: ${dir}`); process.exit(2); }

// The blade/effect CORE is near-white in all three channels and must survive. Lit plate is
// green-dominant with a starved blue. Dark armour, crimson lacquer and the gold fan trim all
// fail `g >= r * GREEN_PARITY` and are never touched.
const CORE_R = 205;
const CORE_G = 205;
const CORE_B = 170;
const BLUE_GAP = 25;      // g > b + BLUE_GAP == blue-starved == green-plate family
const GREEN_PARITY = 0.92; // g >= r*0.92 == green has caught red == not a warm effect pixel
const MAG_GAP = 25;       // BOTH r and b must clear g by this to be magenta-plate family

// Lit-plate test, per plate. Both are written so the CHARACTER cannot match:
//  green  — plate is green-dominant with starved blue. Dark armour, crimson lacquer and gold trim
//           all fail `g >= r*GREEN_PARITY`.
//  magenta— plate is high-R AND high-B with starved GREEN. Requiring BOTH channels to clear green is
//           what makes it specific: a green creature fails both, gold/tan armour fails the blue leg
//           (b < g), a crimson effect fails the blue leg, a blue effect fails the red leg.
const isLitPlate = plate === 'green'
  ? (r, g, b) => g > b + BLUE_GAP && g >= r * GREEN_PARITY
  : (r, g, b) => r > g + MAG_GAP && b > g + MAG_GAP;

// A wrong-plate run announces itself by deleting a huge share of the subject: the real ir48 bloom was
// 3.04%, the ir56 disaster was 28.06%. Refuse past this unless explicitly overridden.
const LARGE_CUT_PCT = 12;

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
// A mutating tool that processes ZERO frames must never report success — it used to print
// "frames=0" and exit 0, so a wrong path was a green light in a && chain (TOOLCHAIN-AUDIT §4).
if (!files.length) {
  console.error(`ERROR: no .png frames in ${dir} — nothing was measured, nothing was cut.`);
  console.error('  This tool takes a DIRECTORY OF PNG FRAMES, not a webm/mp4.');
  process.exit(2);
}
console.log(`cut-bloom-plate: ${files.length} frame(s) in ${path.basename(dir)}  plate=${plate}${dry ? '  [DRY RUN]' : ''}`);

// TWO PASSES, AND THE ORDER IS THE WHOLE POINT. Pass 1 only MEASURES; the blast-radius check runs
// between them; pass 2 writes. A one-pass version would refuse only AFTER mutilating the frames —
// the exact "writes even when it refuses" defect TOOLCHAIN-AUDIT §7 records against
// pad-anchor-plate. A guard that fires after the damage is a post-mortem, not a guard.
const scan = (p) => {
  let hit = 0, vis = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    if (!p.data[i + 3]) continue;
    vis += 1;
    const r = p.data[i], g = p.data[i + 1], b = p.data[i + 2];
    if (r > CORE_R && g > CORE_G && b > CORE_B) continue;   // effect CORE survives
    if (isLitPlate(r, g, b)) hit += 1;
  }
  return { hit, vis };
};

let cut = 0;
let total = 0;
const pages = files.map((f) => PNG.sync.read(fs.readFileSync(path.join(dir, f))));
for (const p of pages) { const { hit, vis } = scan(p); cut += hit; total += vis; }

const pc = (cut / Math.max(1, total)) * 100;
if (pc > LARGE_CUT_PCT && !allowLarge) {
  console.error(`\n⛔ REFUSING — NOTHING WAS WRITTEN. ${pc.toFixed(2)}% of visible pixels matched, past the ${LARGE_CUT_PCT}% ceiling.`);
  console.error('  A real bloom halo is small (the ir48 case was 3.04%; the ir56 disaster was 28.06%).');
  console.error(`  A number this large is the signature of the WRONG --plate: you passed "${plate}".`);
  console.error('  Check the kit:  node qa-boss/build-prompt.mjs qa-boss/prompts/<kit>.md idle | grep -oiE "solid saturated [A-Z]+"');
  console.error('  If the plate is right and the bloom really is this big, re-run with --allow-large.');
  process.exit(1);
}

if (!dry) {
  files.forEach((f, n) => {
    const p = pages[n];
    let dirty = false;
    for (let i = 0; i < p.data.length; i += 4) {
      if (!p.data[i + 3]) continue;
      const r = p.data[i], g = p.data[i + 1], b = p.data[i + 2];
      if (r > CORE_R && g > CORE_G && b > CORE_B) continue;
      if (isLitPlate(r, g, b)) { p.data[i + 3] = 0; dirty = true; }
    }
    if (dirty) fs.writeFileSync(path.join(dir, f), PNG.sync.write(p));
  });
}

console.log(
  `cut-bloom-plate ${path.basename(dir)}: frames=${files.length} cutPx=${cut} (${pc.toFixed(2)}% of visible)${dry ? ' [DRY RUN]' : ''}${allowLarge && pc > LARGE_CUT_PCT ? '  [--allow-large]' : ''}`,
);
console.log('now composite a peak frame over near-black and zoom 2x — the halo must be gone.');
