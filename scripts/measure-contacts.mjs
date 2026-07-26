// MOTION-ENERGY contact measurer for keyed character clips (CHARACTER-CONTRACT §10/§11).
//
// `contacts` in a FighterDef is the ms offset inside the clip where the blow LANDS — the engine
// fires damage/impact FX on that beat. It must be MEASURED, never guessed. This reproduces the
// method recorded in qa-boss/lady-kurotachi-clipdata.json ("motion-energy argmax over keyed
// frames, 24fps"): per-frame energy = mean |premultiplied RGB delta| + |alpha delta| against the
// previous keyed frame; the argmax frame is the contact; ms = round(frameIndex / fps * 1000)
// with frameIndex 0-based (f_001.png == index 0), matching satoshi/LK's recorded values.
//
// Usage: node scripts/measure-contacts.mjs <keyedFramesDir> [--fps 24] [--top N]
//   Prints the ranked top-N energy peaks so the operator can sanity-check the argmax against the
//   clip's QA note (e.g. "peak extension is HELD f48-79" -> confirm the argmax is not recovery).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const dir = argv[0];
let FPS = 24;
let TOP = 8;
for (let i = 1; i < argv.length; i += 2) {
  if (argv[i] === '--fps') FPS = Number(argv[i + 1]);
  if (argv[i] === '--top') TOP = Number(argv[i + 1]);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
if (files.length < 2) throw new Error(`need >=2 frames in ${dir}`);

const load = (f) => PNG.sync.read(fs.readFileSync(path.join(dir, f)));
let prev = load(files[0]);
const energy = [{ idx: 0, e: 0 }];
for (let n = 1; n < files.length; n += 1) {
  const cur = load(files[n]);
  const a = prev.data;
  const b = cur.data;
  let acc = 0;
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3] / 255;
    const ba = b[i + 3] / 255;
    acc += Math.abs(a[i] * aa - b[i] * ba)
      + Math.abs(a[i + 1] * aa - b[i + 1] * ba)
      + Math.abs(a[i + 2] * aa - b[i + 2] * ba)
      + Math.abs(a[i + 3] - b[i + 3]);
  }
  energy.push({ idx: n, e: acc / (a.length / 4) });
  prev = cur;
}

const ranked = [...energy].sort((p, q) => q.e - p.e).slice(0, TOP);
const peak = ranked[0];
const ms = Math.round((peak.idx / FPS) * 1000);
console.log(`frames=${files.length} fps=${FPS}`);
console.log(`top${TOP}: ${ranked.map((r) => `f${r.idx}=${r.e.toFixed(2)}`).join(' ')}`);
console.log(`CONTACT frame=f${peak.idx} energy=${peak.e.toFixed(2)} ms=${ms}`);
console.log(JSON.stringify({ dir, frames: files.length, fps: FPS, contactFrame: peak.idx, contacts: [ms] }));
