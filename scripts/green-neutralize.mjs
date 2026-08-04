// GREEN-NEUTRALIZE second pass (ported from the eclipse QA agent, 2026-07-24) - sibling of
// magenta-neutralize.mjs for GREEN-chroma kits. CRITICAL LESSON: neutralize green on ALL pixels
// INCLUDING alpha=0 ones - VP9 4:2:0 chroma subsampling bleeds invisible-pixel green into
// visible edges after encode. Calibrated to 0.000% visible green on eclipse vs satoshi baseline.
// Scratch GREEN neutralizer/de-bloom for keyed frame dirs (green sibling of magenta-neutralize.mjs).
// key-idle-clips.mjs is magenta-tuned, so on GREEN chroma it leaves (a) green fringe on silver hair,
// (b) green BLOOM around bright special effects, and (c) — critically for VP9 yuva420p — green chroma
// on ALPHA=0 pixels that 4:2:0 subsampling bleeds into adjacent visible edge pixels.
// So we neutralize green chroma on EVERY pixel regardless of alpha (excess = G - max(R,B) > 0 -> G:=max),
// and additionally REMOVE (alpha 0 + neutral grey RGB) any visible pixel whose green bloom is strong.
// Character is safe: dark-olive undershirt G~=R (excess~0), armor black/gold, hair/skin neutral; white/gold
// effect cores are neutral (excess~0). Only true green screen/bloom/fringe is touched.
//
// ⛔ THIS TOOL MUTATES THE PNG FRAMES IN PLACE. Run it on a copy unless you mean it.
//
// ⛔ HARD ABOVE THE 8-BIT EXCESS CEILING SILENTLY KILLED THE REMOVAL BRANCH. (phase 262)
// HARD is compared against `excess = g - max(r,b)`, which is an 8-bit quantity, so any HARD past the
// largest excess the data actually contains makes `excess > HARD` false for EVERY pixel and the
// destructive removal branch never fires. It still prints a normal-looking line and exits 0.
// MEASURED on qa-boss/keyed/ir48-s1-v5 (97 frames, the dirtiest green dir in the repo, max green
// excess 184):
//     HARD=  4   removedPx=216810      <- documented pipeline value (FIRE-PLAN.md)
//     HARD= 32   removedPx=161940      <- this file's default
//     HARD=150   removedPx=21
//     HARD=180   removedPx=4
//     HARD=183   removedPx=4           <- LARGEST HARD THAT STILL CONVICTS
//     HARD=184   removedPx=0   exit 0  <- SILENT from here up
//     HARD=255   removedPx=0   exit 0
//     HARD=999999 removedPx=0  exit 0
// The band is therefore [0, 183] — set just inside the measured silence edge, not at the 8-bit
// bound 255, because 184..255 is already dead on real data.
//
// NO BLAST-RADIUS CEILING HERE, DELIBERATELY, AND THAT IS MEASURED TOO. Unlike edge-feather, this
// tool is SUPPOSED to delete a lot: FIRE-PLAN.md records `green-neutralize <dir> 4` costing kitsune
// −72% of its partial alpha and hollow-pale −29% of visible pixels as its NORMAL documented result.
// A ceiling low enough to catch a mistake would refuse the documented pipeline value, and one set
// above 72% would be decorative. The honest guard here is the argument band above plus the loud
// echo of dir + HARD below. (FIRE-PLAN.md also records the non-destructive alternative:
// scripts/green-despill.mjs reached the identical 0.00% plate result on kitsune deleting 0 px.)
//
// ⛔ TWO SILENT-SUCCESS DEFECTS FIXED (TOOLCHAIN-AUDIT §4, phase 261)
//
// 1. ZERO FRAMES USED TO EXIT 0. Pointed at an empty dir — or at a dir of mp4s, which is the
//    natural mistake because every neighbouring step in the run-book takes a video — it printed
//    `frames=0/0 removedPx=0 neutralizedPx=0` and exited 0. Inside an `&& ` chain a WRONG PATH was
//    therefore a GREEN LIGHT, and the clip went on to encode with its green fringe intact.
//    Now: exit 2, naming the directory.
//
// 2. `--hard 4` SILENTLY KILLED THE DESTRUCTIVE BRANCH. HARD was read POSITIONALLY
//    (`const [dir, hardS] = process.argv.slice(2)`), so the string `--hard` landed in hardS and
//    `Number('--hard')` is NaN. Every `excess > NaN` is false, so the `a > 0 && excess > HARD`
//    removal branch — the one that deletes strong bloom — NEVER FIRED. It printed `HARD=NaN`,
//    `removedPx=0`, and exited 0: a run that did nothing looked exactly like a clean clip.
//    ALL THREE SPELLINGS STILL WORK (`<dir> 32`, `--hard 4`, `--hard=4`) — the two non-canonical
//    ones are rewritten to the canonical flag form and then validated by argcheck. The local
//    validator that used to live in this file is DELETED: there is ONE door for arguments.
//
// Every check is ARGUMENT-TIME or DIRECTORY-TIME: it runs before a single pixel is written, so a
// refusal leaves every frame byte-identical (md5-verified). A guard that fires after the write is a
// post-mortem, not a guard (TOOLCHAIN-AUDIT §7, pad-anchor-plate).
//
// Usage: node scripts/green-neutralize.mjs <keyedFramesDir> [HARD | --hard N | --hard=N]   (default HARD=32)
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
import { makeArgs } from '../qa-boss/lib/argcheck.mjs';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const USAGE = 'usage: node scripts/green-neutralize.mjs <keyedFramesDir> [HARD | --hard N | --hard=N]';

// SPELLING NORMALISER, NOT A VALIDATOR. `<dir> 32` and `--hard=32` are both documented spellings and
// both are in live use (qa-boss/flip-eclipse.mjs, flip-lk.mjs, key-parked-accepted.mjs and
// key-eclipse-specials-v2.mjs all call `green-neutralize.mjs <kdir> 32`). argcheck matches flags by
// exact string, so both are rewritten to `--hard N` here BEFORE argcheck sees them. This makes no
// accept/reject decision about any value — `--hard=` becomes ['--hard',''] and argcheck refuses the
// empty string, and a positional given alongside --hard produces a duplicate that argcheck refuses.
const raw = process.argv.slice(2);
const argv = [];
let sawDir = false;
let hardSpelling = null;   // kept only so the echo can say WHICH spelling set the value
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  if (a.startsWith('--hard=')) { hardSpelling ??= a; argv.push('--hard', a.slice('--hard='.length)); continue; }
  if (a === '--hard') { hardSpelling ??= '--hard'; argv.push('--hard'); if (i + 1 < raw.length) argv.push(raw[++i]); continue; }
  if (a.startsWith('--')) { argv.push(a); continue; }
  if (!sawDir) { sawDir = true; argv.push(a); continue; }
  hardSpelling ??= 'positional HARD';
  argv.push('--hard', a);   // the documented positional HARD
}

// 183 = the largest HARD that still removes a pixel on ir48-s1-v5, the dirtiest green dir in the
// repo (184 and up are silent — see the sweep in the header).
const HARD_MAX = 183;

const A = makeArgs(argv, { tool: 'green-neutralize', usage: USAGE });
const HARD = A.num('--hard', 32, {
  min: 0,
  max: HARD_MAX,
  band: `HARD is compared against an 8-bit green excess (g - max(r,b)). Measured on ir48-s1-v5, `
      + `HARD=183 still removes pixels and HARD=184 removes none at all — from there up the removal `
      + `branch is dead and this tool prints removedPx=0 at exit 0, which is what a CLEAN clip prints.`,
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
// "frames=0/0" and exit 0, so a wrong path was a green light in a && chain (TOOLCHAIN-AUDIT §4).
if (!files.length) {
  const n = fs.readdirSync(dir).length;
  die(`ERROR: no .png frames in ${dir} — nothing was measured, nothing was neutralized.`,
      `  This tool takes a DIRECTORY OF PNG FRAMES, not a webm/mp4 (${n} entr${n === 1 ? 'y' : 'ies'} here, none .png).`);
}

// Echo the DIR and the RESOLVED parameters before touching a pixel, so scrollback can never confuse
// a real run with a no-op one.
console.log(`green-neutralize: dir=${dir}  frames=${files.length}  HARD=${HARD} (${hardSpelling ? `from ${hardSpelling}` : 'default'})`);

let removed=0, neutralized=0, framesTouched=0;
for (const f of files){
  const p = path.join(dir,f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { data:d } = png; let changed=false;
  for (let i=0;i<d.length;i+=4){
    const r=d[i], g=d[i+1], b=d[i+2], a=d[i+3];
    const mx = Math.max(r,b);
    const excess = g - mx;
    if (excess <= 0) continue;               // no green chroma -> leave alone (incl neutral clear plane)
    if (a > 0 && excess > HARD){              // strong green bloom on a VISIBLE pixel -> drop to neutral clear
      d[i]=88; d[i+1]=88; d[i+2]=96; d[i+3]=0; removed++; changed=true;
    } else {                                  // any residual green (any alpha, incl 0) -> zero the green chroma
      d[i+1]=mx; neutralized++; changed=true;
    }
  }
  if (changed){ fs.writeFileSync(p, PNG.sync.write(png)); framesTouched++; }
}
console.log(`greenclean ${dir.replace(/.*keyed./,'')}: frames=${framesTouched}/${files.length} removedPx=${removed} neutralizedPx=${neutralized} (HARD=${HARD})`);
