// replate-chroma — swap a plate's BACKDROP colour without touching chroma-coloured pixels that
// belong to the CHARACTER.
//
// WHY THIS EXISTS (phase 71). Pale_Choir's teeth are bright green — measured rgb(20,189,12),
// rgb(17,191,3) — on a GREEN chroma plate. 25.6% of his mouth region passes the keyer's own isGreen
// test, so keying him on green punches a hole straight through his mouth and deletes his fangs. That
// is the ir56-lion-serpent defect class (green-armoured body, which is why he ships on MAGENTA), and
// it would have destroyed a whole 13-clip kit before anyone looked at a frame.
//
// A naive global colour replace cannot fix it: the teeth ARE the backdrop colour, so any test that
// finds the backdrop also finds them. What separates them is TOPOLOGY, not colour — the backdrop is
// connected to the frame border, the mouth interior is enclosed by the character. So this flood-fills
// the chroma region INWARD FROM THE FRAME EDGES ONLY. Anything chroma-coloured that the flood cannot
// reach is character detail and is left exactly as it was. Same idea as the enclosed-pocket cut in
// scripts/key-enemies.mjs.
//
// It prints how many enclosed chroma pixels it PRESERVED, because that number is the whole point of
// the tool — a run that preserves 0 has silently done a global replace and must not be trusted.
//
// Usage: node qa-boss/replate-chroma.mjs <in.png> <out.png> --to magenta|green [--tol 40]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.cwd() + '/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const [inFile, outFile] = argv;
const toArg = (argv[argv.indexOf('--to') + 1] || '').toLowerCase();
const TOL = Number(argv[argv.indexOf('--tol') + 1]) || 40;
if (!inFile || !outFile || !['magenta', 'green'].includes(toArg)) {
  console.error('usage: node qa-boss/replate-chroma.mjs <in.png> <out.png> --to magenta|green [--tol 40]');
  process.exit(2);
}

// Plate colours of record for this project: green #00b140, magenta rgb(163,0,95) (ir56's plate).
const TARGET = toArg === 'magenta' ? [163, 0, 95] : [0, 177, 64];
const isGreen = (r, g, b) => g > 110 && g > r + TOL && g > b + TOL;
const isMagenta = (r, g, b) => r > 110 && r > g + TOL && b > g + TOL;
// We flood the colour the plate currently IS, i.e. the opposite of what we are converting to.
const isSourcePlate = toArg === 'magenta' ? isGreen : isMagenta;

const p = PNG.sync.read(fs.readFileSync(inFile));
const W = p.width, H = p.height;
const at = (x, y) => (W * y + x) << 2;

// Count every chroma-coloured pixel first, so we can report how many were enclosed.
let chromaTotal = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = at(x, y);
  if (isSourcePlate(p.data[i], p.data[i + 1], p.data[i + 2])) chromaTotal++;
}
if (!chromaTotal) {
  console.error('REFUSING: no ' + (toArg === 'magenta' ? 'green' : 'magenta') + ' pixels found — is this already the target plate?');
  process.exit(1);
}

// Flood fill inward from the border. Iterative stack, not recursion — 1536x1536 overflows a call stack.
const seen = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) { stack.push(x, 0); stack.push(x, H - 1); }
for (let y = 0; y < H; y++) { stack.push(0, y); stack.push(W - 1, y); }

let filled = 0;
while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const idx = W * y + x;
  if (seen[idx]) continue;
  const i = idx << 2;
  if (!isSourcePlate(p.data[i], p.data[i + 1], p.data[i + 2])) continue;  // stop at the character
  seen[idx] = 1;
  p.data[i] = TARGET[0]; p.data[i + 1] = TARGET[1]; p.data[i + 2] = TARGET[2]; p.data[i + 3] = 255;
  filled++;
  stack.push(x + 1, y); stack.push(x - 1, y); stack.push(x, y + 1); stack.push(x, y - 1);
}

// SECOND PASS — and this is the part the first draft got wrong. Flooding from the border preserves
// EVERY enclosed chroma region, and not all of them are character detail. On Pale_Choir the flood
// preserved 6 components: two really were his teeth (54px + 38px at the mouth), but a 256px and a 60px
// blob were BACKDROP trapped in the gaps between his claws, which the flood could not reach. Left in,
// those render as bright green specks stuck to his hands and would survive the magenta key as blobs.
// Only viewing the composited plate caught it — the counts alone looked like a success.
//
// So enclosed regions are NOT preserved on trust. By default they are ALL converted, which is the safe
// outcome. --keep-box whitelists the one region that is genuinely character detail, and everything
// outside it is filled. Explicit beats clever: the tool refuses to guess which green is a tooth.
const keepArg = argv.indexOf('--keep-box') >= 0 ? argv[argv.indexOf('--keep-box') + 1] : null;
const keep = keepArg ? keepArg.split(',').map(Number) : null;
if (keep && keep.length !== 4) { console.error('--keep-box needs x0,y0,x1,y1'); process.exit(2); }

let secondPass = 0, kept = 0;
const seen2 = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const idx = W * y + x;
  if (seen2[idx] || seen[idx]) continue;
  const i0 = idx << 2;
  if (!isSourcePlate(p.data[i0], p.data[i0 + 1], p.data[i0 + 2])) continue;
  // Collect this enclosed component.
  const px = [];
  const st = [x, y];
  while (st.length) {
    const yy = st.pop(), xx = st.pop();
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const id2 = W * yy + xx;
    if (seen2[id2] || seen[id2]) continue;
    const j = id2 << 2;
    if (!isSourcePlate(p.data[j], p.data[j + 1], p.data[j + 2])) continue;
    seen2[id2] = 1; px.push(id2);
    st.push(xx + 1, yy); st.push(xx - 1, yy); st.push(xx, yy + 1); st.push(xx, yy - 1);
  }
  let cx = 0, cy = 0;
  for (const id of px) { cx += id % W; cy += (id - id % W) / W; }
  cx = Math.round(cx / px.length); cy = Math.round(cy / px.length);
  const inKeep = keep && cx >= keep[0] && cx <= keep[2] && cy >= keep[1] && cy <= keep[3];
  if (inKeep) { kept += px.length; continue; }
  for (const id of px) {
    const j = id << 2;
    p.data[j] = TARGET[0]; p.data[j + 1] = TARGET[1]; p.data[j + 2] = TARGET[2]; p.data[j + 3] = 255;
  }
  secondPass += px.length;
}

const preserved = kept;
fs.writeFileSync(outFile, PNG.sync.write(p));
console.log(`  enclosed regions converted (not whitelisted): ${secondPass}px`);

console.log(`${inFile} -> ${outFile}`);
console.log(`  plate ${W}x${H}, converted to ${toArg.toUpperCase()} rgb(${TARGET.join(',')})`);
console.log(`  chroma pixels total ${chromaTotal}  |  border-connected BACKDROP replaced ${filled}`);
console.log(`  ENCLOSED chroma pixels PRESERVED: ${preserved}  (${(preserved / chromaTotal * 100).toFixed(2)}% of chroma)`);
if (preserved === 0) {
  console.log('  ** WARNING: preserved 0 — this run did a global replace, which is exactly what the');
  console.log('     tool exists to avoid. If the character HAS chroma-coloured detail, do not ship this.');
} else {
  console.log('  Those preserved pixels are character detail (e.g. Pale_Choir\'s green teeth) that a');
  console.log('  global colour replace would have destroyed. VIEW the result before generating off it.');
}
