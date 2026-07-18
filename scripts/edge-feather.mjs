// Post-key smoothstep edge feather (phase 11b law, ported from the session scratchpad):
// content that crosses the source frame boundary must DISSOLVE at the edge instead of
// cutting flat (the cut lives in the SOURCE pixels - wide-framing prompts shrink but never
// eliminate it; never re-generate for this). Applies an alpha ramp over an N-px band on the
// chosen edges of every keyed frame. Run AFTER key-idle-clips.mjs, on its output dir.
//
// Usage: node scripts/edge-feather.mjs <keyedFramesDir> [--top N] [--bottom N] [--left N] [--right N]
//   Only the edges you pass get feathered. Bands operate in the CROPPED frame space the
//   keyer emitted. A bottom band would eat planted feet - only pass it for effect clips
//   whose art floats (the phase 11b special used 40px bottom with a protected feet column).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const dir = argv[0];
const band = { top: 0, bottom: 0, left: 0, right: 0 };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace('--', '');
  if (!(k in band)) throw new Error(`unknown edge ${argv[i]}`);
  band[k] = Number(argv[i + 1]);
}

const smooth = (t) => t * t * (3 - 2 * t); // smoothstep 0..1

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
let touched = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { width: W, height: H, data: d } = png;
  let changed = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) continue;
      let m = 1;
      if (band.top && y < band.top) m = Math.min(m, smooth(y / band.top));
      if (band.bottom && y >= H - band.bottom) m = Math.min(m, smooth((H - 1 - y) / band.bottom));
      if (band.left && x < band.left) m = Math.min(m, smooth(x / band.left));
      if (band.right && x >= W - band.right) m = Math.min(m, smooth((W - 1 - x) / band.right));
      if (m < 1) {
        d[i + 3] = Math.round(d[i + 3] * m);
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(p, PNG.sync.write(png));
    touched += 1;
  }
}
console.log(`feathered ${touched}/${files.length} frames in ${dir} (bands ${JSON.stringify(band)})`);
