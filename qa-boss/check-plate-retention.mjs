// PLATE-RETENTION GATE — did the chroma backdrop survive the key and end up INSIDE the
// visible silhouette?
//
// ############################################################################################
// # WHY THIS EXISTS. ir48 special_1 v5, 2026-07-29: key-idle-clips.mjs left 18.4% of the      #
// # OPAQUE pixels green-dominant. Every glowing charm shipped a thick opaque GREEN HALO,       #
// # invisible on the green plate and glaringly obvious the moment it was composited over the   #
// # dark stage. No existing gate could see it: containment measures EDGES, front-turn measures #
// # POSE, extra-objects measures BLOBS, body-commitment measures MOTION. None of them look at  #
// # whether the backdrop is still there.                                                       #
// #                                                                                             #
// # ROOT CAUSE: a big TRANSLUCENT effect. The backdrop seen THROUGH a glowing charm keys to a  #
// # DARKENED plate colour (measured r~70-108 g~141-155 b~62-84 vs the pure #00b140 screen)     #
// # which the tight global key misses, and the border-seeded flood fill cannot reach it        #
// # because the glow ring encloses it. FIX: scripts/green-neutralize.mjs (or magenta-          #
// # neutralize.mjs) as a MANDATORY pass. Measured 18.4% -> 0.00%.                              #
// ############################################################################################
//
// *** THE TRAP THIS TOOL ITSELF FELL INTO — READ BEFORE BELIEVING A RESULT ***
// The gate must test for the clip's OWN PLATE colour, not for green universally. ir56-lion-
// serpent is keyed from a MAGENTA plate and its character energy is legitimately GREEN, so a
// naive green test scored it 1.05% and looked like a defect. Tested for retained MAGENTA it is
// 0.00% — perfectly clean. ALWAYS resolve the plate from the character's clipdata `chroma`
// field (or its prompt's "solid saturated <COLOUR> chroma") before running this.
//
// Roster baseline, measured 2026-07-29 over every shipped special: ALL CLEAN. eclipse,
// hollow-pale, ir37, lady-kurotachi, satoshi all 0.00% green (green plates); ir56 0.00%
// magenta (magenta plate). So this defect class is a FORWARD risk introduced by the dense
// signature effects, not pre-existing debt.
//
// USAGE
//   node qa-boss/check-plate-retention.mjs --plate green  <clip.webm|frames-dir> ...
//   node qa-boss/check-plate-retention.mjs --plate magenta <clip.webm> ...
// Thresholds: >=5% BAD (visible halo) · 1-5% WATCH · <1% clean.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', 'noop.js'));
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const pi = argv.indexOf('--plate');
const PLATE = pi >= 0 ? argv[pi + 1] : 'green';
const targets = argv.filter((a) => !a.startsWith('--') && a !== PLATE);
if (!targets.length) {
  console.error('usage: check-plate-retention.mjs --plate green|magenta <clip.webm|framesDir> ...');
  process.exit(2);
}
const isPlate = PLATE === 'magenta'
  ? (r, g, b) => r > 90 && b > 90 && r > g + 30 && b > g + 30
  : (r, g, b) => g > 90 && g > r + 30 && g > b + 30;

function sample(target) {
  let dir = target, tmp = null;
  if (!fs.statSync(target).isDirectory()) {
    tmp = path.join(process.env.TEMP || HERE, 'pr_' + path.basename(target).replace(/\W/g, '_'));
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const pre = /\.webm$/i.test(target) ? ['-c:v', 'libvpx-vp9'] : [];
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...pre, '-i', target,
      '-vf', "select='not(mod(n\\,16))',scale=240:-1", '-vsync', '0', path.join(tmp, 'f_%03d.png')],
      { encoding: 'utf8' });
    if (r.status !== 0) { fs.rmSync(tmp, { recursive: true, force: true }); return { error: 'decode failed' }; }
    dir = tmp;
  }
  let plate = 0, opaque = 0;
  for (const fn of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    const p = PNG.sync.read(fs.readFileSync(path.join(dir, fn)));
    const d = p.data;
    for (let i = 0; i < p.width * p.height; i++) {
      const k = i * 4, R = d[k], G = d[k + 1], B = d[k + 2], A = d[k + 3];
      if (A <= 24) continue;
      opaque++;
      if (isPlate(R, G, B)) plate++;
    }
  }
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  return { pct: opaque ? 100 * plate / opaque : 0, opaque };
}

console.log(`plate=${PLATE}`);
console.log('clip'.padEnd(54) + 'plate%   opaquePx   verdict');
console.log('-'.repeat(88));
let bad = 0;
for (const t of targets.sort()) {
  const r = sample(t);
  const name = path.basename(path.dirname(t)) + '/' + path.basename(t);
  if (r.error) { console.log(name.padEnd(54) + r.error); bad++; continue; }
  const v = r.pct >= 5 ? 'BAD  plate halo — run the neutralize pass' : r.pct >= 1 ? 'WATCH' : 'clean';
  if (r.pct >= 5) bad++;
  console.log(name.padEnd(54) + r.pct.toFixed(2).padStart(6) + '   ' + String(r.opaque).padStart(8) + '   ' + v);
}
console.log('-'.repeat(88));
console.log(bad ? `${bad} clip(s) need the neutralize pass.` : 'all clean.');
process.exit(bad ? 1 : 0);
