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
// Usage: node qa-boss/cut-bloom-plate.mjs <framesDir> [--dry]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const dir = process.argv[2];
const dry = process.argv.includes('--dry');
if (!dir) {
  console.error('usage: node qa-boss/cut-bloom-plate.mjs <framesDir> [--dry]');
  process.exit(1);
}

// The blade/effect CORE is near-white in all three channels and must survive. Lit plate is
// green-dominant with a starved blue. Dark armour, crimson lacquer and the gold fan trim all
// fail `g >= r * GREEN_PARITY` and are never touched.
const CORE_R = 205;
const CORE_G = 205;
const CORE_B = 170;
const BLUE_GAP = 25;      // g > b + BLUE_GAP == blue-starved == plate family
const GREEN_PARITY = 0.92; // g >= r*0.92 == green has caught red == not a warm effect pixel

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
let cut = 0;
let total = 0;

for (const f of files) {
  const p = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  let dirty = false;
  for (let i = 0; i < p.data.length; i += 4) {
    if (!p.data[i + 3]) continue;
    total += 1;
    const r = p.data[i];
    const g = p.data[i + 1];
    const b = p.data[i + 2];
    const isCore = r > CORE_R && g > CORE_G && b > CORE_B;
    if (isCore) continue;
    if (g > b + BLUE_GAP && g >= r * GREEN_PARITY) {
      if (!dry) {
        p.data[i + 3] = 0;
        dirty = true;
      }
      cut += 1;
    }
  }
  if (dirty) fs.writeFileSync(path.join(dir, f), PNG.sync.write(p));
}

const pc = ((cut / Math.max(1, total)) * 100).toFixed(2);
console.log(
  `cut-bloom-plate ${path.basename(dir)}: frames=${files.length} cutPx=${cut} (${pc}% of visible)${dry ? ' [DRY RUN]' : ''}`,
);
console.log('now composite a peak frame over near-black and zoom 2x — the halo must be gone.');
