// Green-screen despill post-pass for GREEN-chroma clips (the shipped key-idle-clips.mjs
// despill is MAGENTA-family only: it fires on r>g && b>g and leaves green fringe intact).
// Runs on the KEYED frames dir IN PLACE, AFTER key-idle-clips.mjs, BEFORE encode.
// Gate: only pixels where G dominates BOTH R and B by a hard margin count as green spill
// (true chroma fringe). Yellow/tan straw (r>=g), silver hair / steel (neutral, g~=r~=b),
// tan skin (r dominant), charcoal kimono (neutral dark) all FAIL the gate and are untouched.
// SAFE ONLY because nothing on this character is green.
//
// ⛔ THIS TOOL MUTATES THE PNG FRAMES IN PLACE. Run it on a copy unless you mean it.
//
// ⛔ THREE DISARMED-THRESHOLD DEFECTS FIXED (phase 262)
//
// 1. MARGIN ABOVE THE 8-BIT EXCESS CEILING SILENTLY DESPILLED NOTHING. MARGIN is compared against
//    `excess = g - max(r,b)`, an 8-bit quantity, so any MARGIN past the largest excess in the data
//    makes `excess > MARGIN` false everywhere. MEASURED on qa-boss/keyed/ir48-s1-v5 (97 frames, the
//    dirtiest green dir in the repo, max green excess 184):
//        MARGIN=  0   touched 97/97 frames
//        MARGIN= 14   touched 97/97 frames        <- this file's default, and the recorded value
//        MARGIN=150   touched  2/97 frames, 21 px
//        MARGIN=180   touched  1/97 frames,  4 px
//        MARGIN=183   touched  1/97 frames,  4 px  <- LARGEST MARGIN THAT STILL CONVICTS
//        MARGIN=184   touched  0/97 frames,  0 px  exit 0   <- SILENT from here up
//        MARGIN=255   touched  0/97 frames,  0 px  exit 0
//        MARGIN=999999 touched 0/97 frames,  0 px  exit 0
//    Band set to [0, 183]: just inside the measured silence edge, NOT at the 8-bit bound 255,
//    because 184..255 is already dead on real data.
//
// 2. KEEP >= 1 AMPLIFIED THE SPILL IT CLAIMS TO REMOVE, AND REPORTED THE SAME SUCCESS LINE.
//    KEEP is the FRACTION of the green excess kept: `g := max(r,b) + excess * KEEP`. At KEEP=1 that
//    is `g := g` — an identity, i.e. a silent no-op — and above 1 it pushes g HIGHER than it was.
//    Nothing bounded it. MEASURED on ir48-s1-v5 f_0050, max green excess of the frame after the run
//    (input 184; --margin 14 throughout):
//        KEEP=0     ->  14        KEEP=0.99  ->  90
//        KEEP=0.08  ->  14        KEEP=1     ->  91   <- warm branch is an IDENTITY here
//        KEEP=0.5   ->  46        KEEP=1.01  ->  92
//                                 KEEP=14    -> 252   <- WORSE than the input it was given
//    Every one of those printed `touched 1/1 frames, 71499 px` and exited 0 — the amplifying run is
//    textually indistinguishable from the correct one. Band set to [0, 0.99]: 0.99 is the largest
//    value that still pulls green down, 1 is the first that does not. (argcheck's max is inclusive,
//    so 0.99 is the tightest expressible bound strictly below the identity point.)
//
// 3. A REPEATED FLAG WAS SILENTLY LAST-WINS. This file's loop had no duplicate check at all (unlike
//    its magenta sibling), so `--margin 5 --margin 200` simply overwrote and ran at 200 while the
//    command line still read 5. argcheck refuses a repeated flag outright.
//
// ⛔ TWO SILENT-SUCCESS DEFECTS FIXED EARLIER (TOOLCHAIN-AUDIT §4, phase 261)
//
// 1. ZERO FRAMES USED TO EXIT 0. On an empty dir — or on a dir of mp4s, the natural mistake since
//    the neighbouring run-book steps all take video — it printed `touched 0/0 frames, 0 px` and
//    exited 0. A WRONG PATH was a GREEN LIGHT inside an `&&` chain and the clip encoded with its
//    green fringe intact. Now: exit 2, naming the directory.
//
// 2. `--margin` WITH NO VALUE BECAME NaN AND EXITED 0. The old parser walked argv with a FIXED
//    STRIDE OF TWO and did `MARGIN = Number(argv[i+1])` with no check, so a flag left last on the
//    line read `undefined` -> NaN. Every `excess > NaN` is false, so NOTHING was despilled and it
//    still printed a normal-looking `touched 0/6 frames, 0 px (margin NaN, keep 0.08)` at exit 0.
//    THE LOCAL VALIDATOR THAT USED TO CLOSE THIS WAS A NEAR-VERBATIM COPY OF edge-feather.mjs's.
//    It is DELETED. Both files now call qa-boss/lib/argcheck.mjs — there is ONE door for arguments,
//    which is the only way the coverage stops rotting (argcheck's own header, rounds 1-4).
//
// Every check is ARGUMENT-TIME or DIRECTORY-TIME: it runs before a single pixel is written, so a
// refusal leaves every frame byte-identical (md5-verified). A guard that fires after the write is a
// post-mortem, not a guard (TOOLCHAIN-AUDIT §7, pad-anchor-plate).
//
// Usage: node green-despill.mjs <keyedFramesDir> [--margin N|--margin=N] [--keep F|--keep=F]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { makeArgs } from '../qa-boss/lib/argcheck.mjs';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const USAGE = 'usage: node scripts/green-despill.mjs <keyedFramesDir> [--margin N] [--keep F]';

// SPELLING NORMALISER, NOT A VALIDATOR. `--margin=14` is a documented spelling; argcheck matches
// flags by exact string, so the `=` form is rewritten to the space form before argcheck sees it. It
// makes no accept/reject decision: `--margin=` becomes ['--margin',''] and argcheck refuses the
// empty string exactly as it refuses a missing one.
const VALUE_FLAGS = new Set(['--margin', '--keep']);
const argv = [];
const from = { margin: 'default', keep: 'default' };  // kept only so the echo can name the spelling
for (const a of process.argv.slice(2)) {
  const eq = a.startsWith('--') ? a.indexOf('=') : -1;
  if (eq !== -1 && VALUE_FLAGS.has(a.slice(0, eq))) {
    from[a.slice(2, eq)] = a;
    argv.push(a.slice(0, eq), a.slice(eq + 1));
  } else {
    if (VALUE_FLAGS.has(a)) from[a.slice(2)] = a;
    argv.push(a);
  }
}

const MARGIN_MAX = 183;  // measured silence edge on ir48-s1-v5 — see header
const KEEP_MAX = 0.99;   // 1.0 is an identity on the warm branch; above it the pass AMPLIFIES

const A = makeArgs(argv, { tool: 'green-despill', usage: USAGE });
const MARGIN = A.num('--margin', 14, {
  min: 0,
  max: MARGIN_MAX,
  band: `--margin is compared against an 8-bit green excess (g - max(r,b)). Measured on ir48-s1-v5, `
      + `183 still despills 4 px and 184 despills none at all — from there up this pass touches `
      + `nothing and prints "touched 0/N frames, 0 px" at exit 0, which is what a CLEAN clip prints.`,
});
const KEEP = A.num('--keep', 0.08, {
  min: 0,
  max: KEEP_MAX,
  band: `--keep is the FRACTION of the green excess kept, so it belongs in [0,1). Measured on `
      + `ir48-s1-v5 f_0050: keep 0.99 leaves green excess 90, keep 1 leaves 91 (an identity — the `
      + `warm branch writes g back unchanged) and keep 14 leaves 252, WORSE than the 184 it was `
      + `given. All three print the same "touched 1/1 frames, 71499 px" and exit 0.`,
});
const pos = A.positionals();
A.done();

const die = (...lines) => { for (const l of lines) console.error(l); console.error(USAGE); process.exit(2); };

if (pos.length === 0) die('ERROR: no frames directory given.');
// The old fixed-stride loop IGNORED stray positionals in silence; a mistyped `--margin 14` as
// bare `14` therefore ran on the default margin while the operator believed otherwise.
if (pos.length > 1) die(`ERROR: unexpected extra argument "${pos[1]}". MARGIN/KEEP must be passed as --margin N / --keep F.`);
const dir = pos[0];
if (!fs.existsSync(dir)) die(`ERROR: no such directory: ${dir}`);
if (!fs.statSync(dir).isDirectory()) die(`ERROR: not a directory (this tool takes a DIR of PNG frames): ${dir}`);

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
// A mutating tool that processes ZERO frames must never report success — it used to print
// "touched 0/0" and exit 0, so a wrong path was a green light in a && chain (TOOLCHAIN-AUDIT §4).
if (!files.length) {
  const n = fs.readdirSync(dir).length;
  die(`ERROR: no .png frames in ${dir} — nothing was measured, nothing was despilled.`,
      `  This tool takes a DIRECTORY OF PNG FRAMES, not a webm/mp4 (${n} entr${n === 1 ? 'y' : 'ies'} here, none .png).`);
}

// Echo the DIR and the RESOLVED parameters before touching a pixel, so scrollback can never confuse
// a real run with a no-op one.
console.log(`green-despill: dir=${dir}  frames=${files.length}  margin=${MARGIN} (${from.margin})  keep=${KEEP} (${from.keep})`);

let touched = 0;
let pxHit = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { width: W, height: H, data: d } = png;
  let changed = false;
  for (let i = 0; i < W * H * 4; i += 4) {
    if (d[i + 3] === 0) continue; // fully transparent, skip
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, b);
    const excess = g - mx;
    if (excess > MARGIN) {
      if (r >= b) {
        // WARM green-dominant = green spill on the tan/brown straw or skin: pull G down
        // toward max(R,B) and keep the warm base (straw stays brown).
        d[i + 1] = Math.round(mx + excess * KEEP);
      } else {
        // COOL green-dominant (B > R) = the effect's green screen-glow bloom (iai flash /
        // cyclone wind / crescent). Neutralise to luminance grey so it reads WHITE-family,
        // never teal. Nothing on this character's BODY is cool-green, so the body is untouched.
        const v = Math.round((r + g + b) / 3);
        d[i] = v; d[i + 1] = v; d[i + 2] = v;
      }
      changed = true;
      pxHit += 1;
    }
  }
  if (changed) { fs.writeFileSync(p, PNG.sync.write(png)); touched += 1; }
}
console.log(`green-despill: touched ${touched}/${files.length} frames, ${pxHit} px (margin ${MARGIN}, keep ${KEEP})`);
