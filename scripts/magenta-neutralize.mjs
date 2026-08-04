// Second-pass interior magenta neutralizer for a keyed frame dir: pixels where BOTH
// R and B exceed G by MIN are pulled toward neutral (KEEP of the excess kept).
//
// ⛔ THIS TOOL MUTATES THE PNG FRAMES IN PLACE. Run it on a copy unless you mean it.
//
// ⛔ TWO DISARMED-THRESHOLD DEFECTS FIXED (phase 262)
//
// 1. MIN ABOVE THE 8-BIT EXCESS CEILING SILENTLY NEUTRALIZED NOTHING. MIN is compared against
//    `ex = min(r-g, b-g)`, an 8-bit quantity, so any MIN past the largest excess in the data makes
//    `ex > MIN` false everywhere. MEASURED on qa-boss/keyed/ir37-hit-v3 (97 frames, ir37-pink-tessen
//    — a PINK character on a magenta plate, the dirtiest magenta dir in the repo):
//        MIN= 14   neutralized 3913684 px      <- this file's default, and the recorded value
//        MIN=100   neutralized  297889 px
//        MIN=200   neutralized       4 px
//        MIN=203   neutralized       4 px      <- LARGEST MIN THAT STILL CONVICTS
//        MIN=204   neutralized       0 px  exit 0   <- SILENT from here up
//        MIN=255   neutralized       0 px  exit 0
//        MIN=999999 neutralized      0 px  exit 0
//    Band set to [0, 203]: just inside the measured silence edge, NOT at the 8-bit bound 255,
//    because 204..255 is already dead on real data.
//
// 2. KEEP >= 1 AMPLIFIED THE SPILL IT CLAIMS TO REMOVE — AND KEEP=1 WROTE A BYTE-IDENTICAL FILE
//    WHILE REPORTING SUCCESS. KEEP is the FRACTION of the magenta excess kept:
//    `r := g + (r-g)*KEEP`, `b := g + (b-g)*KEEP`. At KEEP=1 both are identities. This file's own
//    header already named `KEEP=14` as "a nonsense keep that would have AMPLIFIED the spill" —
//    nothing stopped it. MEASURED on ir37-hit-v3 f_0050, max magenta excess after the run
//    (input 187; --min 14 throughout):
//        KEEP=0     ->  14                    KEEP=0.99  -> 185
//        KEEP=0.15  ->  28  (the default)     KEEP=1     -> 187  and the PNG is BYTE-IDENTICAL
//        KEEP=0.5   ->  94                    KEEP=1.01  -> 188      to its input (md5 unchanged)
//        KEEP=0.9   -> 168                    KEEP=2     -> 218
//                                             KEEP=14    -> 248   <- WORSE than the input
//    Every one printed `neutralized 34828 px across 1 frames` and exited 0, including the run that
//    changed nothing at all and the runs that made the fringe worse. Band set to [0, 0.99]: 0.99 is
//    the largest value that still pulls the excess down, 1 is the first that does not. (argcheck's
//    max is inclusive, so 0.99 is the tightest expressible bound strictly below the identity point.)
//
// ⛔ TWO SILENT-SUCCESS DEFECTS FIXED EARLIER (TOOLCHAIN-AUDIT §4, phase 261)
// This was the WORST OFFENDER of the four mutating tools, because it printed NEITHER THE
// DIRECTORY NOR THE PARAMETERS — `neutralized 0 px across 0 frames` is all scrollback ever had,
// so a run that touched nothing was indistinguishable from a run that worked.
//
// 1. ZERO FRAMES USED TO EXIT 0. On an empty dir — or on a dir of mp4s, the natural mistake since
//    the neighbouring run-book steps all take video — it printed `neutralized 0 px across 0 frames`
//    and exited 0. A WRONG PATH was a GREEN LIGHT inside an `&&` chain and the magenta clip encoded
//    with its interior spill intact. Now: exit 2, naming the directory.
//
// 2. `--min 14` SILENTLY MISPARSED TO `MIN=NaN` AND EXITED 0. MIN/KEEP were read POSITIONALLY
//    (`const [dir, minS, keepS] = process.argv.slice(2)`), so the string `--min` landed in minS and
//    `Number('--min')` is NaN — while the trailing `14` landed in keepS and became KEEP=14, a
//    nonsense keep that would have AMPLIFIED the spill had MIN been finite. Every `ex > NaN` is
//    false, so ZERO pixels were touched, and the output text `neutralized 0 px across 6 frames` is
//    the SAME SHAPE a genuinely clean clip produces: there was no tell at all.
//    ALL SPELLINGS STILL WORK (`<dir> 14 0.15`, `--min 14 --keep 0.15`, `--min=14`) — the
//    non-canonical ones are rewritten to the canonical flag form and then validated by argcheck.
//    The local validator that used to live in this file is DELETED: ONE door for arguments.
//
// Every check is ARGUMENT-TIME or DIRECTORY-TIME: it runs before a single pixel is written, so a
// refusal leaves every frame byte-identical (md5-verified). A guard that fires after the write is a
// post-mortem, not a guard (TOOLCHAIN-AUDIT §7, pad-anchor-plate).
//
// Usage: node scripts/magenta-neutralize.mjs <keyedFramesDir> [MIN [KEEP]]
//        node scripts/magenta-neutralize.mjs <keyedFramesDir> [--min N] [--keep F]   (defaults 14 / 0.15)
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
import { makeArgs } from '../qa-boss/lib/argcheck.mjs';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const USAGE = 'usage: node scripts/magenta-neutralize.mjs <keyedFramesDir> [MIN [KEEP]] | [--min N] [--keep F]';

// SPELLING NORMALISER, NOT A VALIDATOR. `<dir> 14 0.15` and `--min=14` are both documented
// spellings. argcheck matches flags by exact string, so both are rewritten to the canonical
// `--min N --keep F` form BEFORE argcheck sees them. This makes no accept/reject decision about any
// value: `--min=` becomes ['--min',''] and argcheck refuses the empty string, and a positional given
// alongside its flag produces a duplicate flag that argcheck refuses (it used to `die` locally).
const raw = process.argv.slice(2);
const argv = [];
const POSITIONAL_ORDER = ['--min', '--keep'];
const spelling = { '--min': null, '--keep': null };  // kept only so the echo can name the spelling
let nPos = 0;
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  const eq = a.startsWith('--') ? a.indexOf('=') : -1;
  if (eq !== -1 && POSITIONAL_ORDER.includes(a.slice(0, eq))) {
    spelling[a.slice(0, eq)] ??= a; argv.push(a.slice(0, eq), a.slice(eq + 1)); continue;
  }
  if (POSITIONAL_ORDER.includes(a)) { spelling[a] ??= a; argv.push(a); if (i + 1 < raw.length) argv.push(raw[++i]); continue; }
  if (a.startsWith('--')) { argv.push(a); continue; }
  nPos += 1;
  if (nPos === 1) { argv.push(a); continue; }               // <dir>
  if (nPos <= 3) {                                          // positional MIN, then KEEP
    const flag = POSITIONAL_ORDER[nPos - 2];
    spelling[flag] ??= `positional ${flag === '--min' ? 'MIN' : 'KEEP'}`;
    argv.push(flag, a); continue;
  }
  argv.push(a);                                              // 4th+ positional -> caught below
}

const MIN_MAX = 203;    // measured silence edge on ir37-hit-v3 — see header
const KEEP_MAX = 0.99;  // 1.0 is an identity (byte-identical output); above it the pass AMPLIFIES

const A = makeArgs(argv, { tool: 'magenta-neutralize', usage: USAGE });
const MIN = A.num('--min', 14, {
  min: 0,
  max: MIN_MAX,
  band: `MIN is compared against an 8-bit magenta excess min(r-g, b-g). Measured on ir37-hit-v3, `
      + `203 still neutralizes 4 px and 204 neutralizes none at all — from there up this pass `
      + `touches nothing and prints "neutralized 0 px" at exit 0, which is what a CLEAN clip prints.`,
});
const KEEP = A.num('--keep', 0.15, {
  min: 0,
  max: KEEP_MAX,
  band: `KEEP is the FRACTION of the magenta excess kept, so it belongs in [0,1). Measured on `
      + `ir37-hit-v3 f_0050: keep 0.99 leaves excess 185, keep 1 leaves 187 and writes a `
      + `BYTE-IDENTICAL PNG, and keep 14 leaves 248 — WORSE than the 187 it was given. All three `
      + `print the same "neutralized 34828 px across 1 frames" and exit 0.`,
});
const pos = A.positionals();
A.done();

const die = (...lines) => { for (const l of lines) console.error(l); console.error(USAGE); process.exit(2); };

if (pos.length === 0) die('ERROR: no frames directory given.');
if (pos.length > 1) die(`ERROR: unexpected extra argument "${pos[1]}".`);
const dir = pos[0];
if (!fs.existsSync(dir)) die(`ERROR: no such directory: ${dir}`);
if (!fs.statSync(dir).isDirectory()) die(`ERROR: not a directory (this tool takes a DIR of PNG frames): ${dir}`);

const files = fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort();
// A mutating tool that processes ZERO frames must never report success — it used to print
// "0 px across 0 frames" and exit 0, so a wrong path was a green light in a && chain
// (TOOLCHAIN-AUDIT §4).
if (!files.length) {
  const n = fs.readdirSync(dir).length;
  die(`ERROR: no .png frames in ${dir} — nothing was measured, nothing was neutralized.`,
      `  This tool takes a DIRECTORY OF PNG FRAMES, not a webm/mp4 (${n} entr${n === 1 ? 'y' : 'ies'} here, none .png).`);
}

// Echo the DIR and the RESOLVED parameters before touching a pixel. This tool used to print neither,
// which is precisely why a no-op run was invisible in scrollback.
console.log(`magenta-neutralize: dir=${dir}  frames=${files.length}  MIN=${MIN} (${spelling['--min'] ? `from ${spelling['--min']}` : 'default'})  KEEP=${KEEP} (${spelling['--keep'] ? `from ${spelling['--keep']}` : 'default'})`);

let px=0;
for (const f of files){
  const p = path.join(dir,f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const d = png.data;
  let changed=false;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]===0) continue;
    const r=d[i],g=d[i+1],b=d[i+2];
    const ex=Math.min(r-g,b-g);
    if(ex>MIN){
      d[i]=Math.round(g+(r-g)*KEEP);
      d[i+2]=Math.round(g+(b-g)*KEEP);
      changed=true; px++;
    }
  }
  if(changed) fs.writeFileSync(p, PNG.sync.write(png));
}
console.log(`neutralized ${px} px across ${files.length} frames`);
