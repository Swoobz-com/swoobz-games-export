// measure-anchor-budget — print the FRAME BUDGET for a character's anchor plate.
//
// WHY. Every expensive prompt lesson in this project came from writing prose against a frame whose
// arithmetic nobody had measured: a lunge WIDENS the silhouette (back foot travels back as far as the
// front travels forward), and a long prop RAISED needs headroom the frame may simply not have. The
// budgets for eclipse / ir37 / hollow-pale were measured in phase 53 and are pasted at the top of
// their prompt files; satoshi, ir56, sora, thorn, lady-kurotachi and kitsune never got one, so beats
// for them are still being written blind. This prints the same numbers for any plate.
//
// Uses the SAME chroma test as pad-anchor-plate.mjs (and check-containment) so the numbers are
// comparable to the ones already in the prompt files. --magenta for the magenta-plate characters
// (ir56 is on magenta because his body is green-armored).
//
// Usage: node qa-boss/measure-anchor-budget.mjs <plate.png> [--magenta]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.cwd() + '/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const file = argv[0];
const MAGENTA = argv.includes('--magenta');
if (!file) { console.error('usage: node qa-boss/measure-anchor-budget.mjs <plate.png> [--magenta]'); process.exit(2); }

// Same green predicate as pad-anchor-plate.mjs:51.
const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;
// Magenta does NOT mirror it. A first draft used `r > 110 && b > 110 && ...` and read ir56's plate as
// 0% plate, because his actual chroma is rgb(163,0,95) — a deep magenta whose BLUE is only 95. The
// load-bearing part is that both r and b sit far above g; absolute blue is not a plate property.
const isMagenta = (r, g, b) => r > 110 && r > g + 40 && b > g + 40;
const isPlate = MAGENTA ? isMagenta : isGreen;

const p = PNG.sync.read(fs.readFileSync(file));
let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1, subject = 0;
for (let y = 0; y < p.height; y++) {
  for (let x = 0; x < p.width; x++) {
    const i = (p.width * y + x) << 2;
    if (p.data[i + 3] < 8) continue;                       // transparent counts as plate
    if (isPlate(p.data[i], p.data[i + 1], p.data[i + 2])) continue;
    subject++;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
}
if (x1 < 0) { console.error('REFUSING: no subject pixels found — wrong chroma? try ' + (MAGENTA ? '(drop --magenta)' : '--magenta')); process.exit(1); }

// REFUSE rather than emit bad output (pad-anchor-plate.mjs's discipline). If almost nothing keyed as
// plate, the chroma test is wrong for this file and the bbox degenerates to the whole frame — which
// prints as a confident "LEFT 0px · RIGHT 0px" instead of an error. That is the exact shape of the
// mistakes this project keeps paying for: a number that does not mean what it looks like.
const plateFrac = 1 - subject / (p.width * p.height);
if (plateFrac < 0.20) {
  console.error(`REFUSING: only ${(plateFrac * 100).toFixed(1)}% of pixels read as ${MAGENTA ? 'MAGENTA' : 'GREEN'} plate, ` +
    `so the bbox would be meaningless (corner pixel is rgb(${p.data[0]},${p.data[1]},${p.data[2]})). ` +
    `Wrong chroma flag, or this is not a chroma plate.`);
  process.exit(1);
}

const w = x1 - x0 + 1, h = y1 - y0 + 1;
const left = x0, right = p.width - 1 - x1, top = y0, bottom = p.height - 1 - y1;
const fillH = (h / p.height * 100).toFixed(1);
const plateShare = (100 - (subject / (p.width * p.height) * 100)).toFixed(1);

console.log(`${file}`);
console.log(`  plate ${p.width}x${p.height} (${MAGENTA ? 'MAGENTA' : 'GREEN'})   subject ${w}w x ${h}h   fills ${fillH}% of frame height`);
console.log(`  LEFT ${left}px · RIGHT ${right}px · HEADROOM ${top}px · bottom ${bottom}px (free — containment never counts feet-on-floor)`);
console.log(`  bbox x${x0}..x${x1}, y${y0}..y${y1}   dominant plate ${plateShare}% of pixels`);

// The two arithmetic rules that have actually cost rolls, evaluated for this plate.
const spanCap = ((p.width) / w).toFixed(2);
console.log(`\n  SPAN: a lunge widens BOTH ways, so max spanPeak that still fits = ${spanCap}x`);
console.log(`        (HARD RULE caps it at ~1.60 anyway — use whichever is SMALLER: ${Math.min(1.6, +spanCap).toFixed(2)}x)`);
console.log(`  RAISE: only ${top}px of ceiling. A prop lifted above the head needs its own length in`);
console.log(`        headroom — bound the PROP TIP, not the hands, or it overruns while the hands obey.`);
if (top < 150) console.log(`        ${top}px is TIGHT: design beats LATERAL or DIAGONAL-DOWNWARD, and use the free bottom edge.`);
if (Math.min(left, right) < 150) console.log(`  SIDES: ${Math.min(left, right)}px on the tighter side — no full-extension reach in that direction.`);
