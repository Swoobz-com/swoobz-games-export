// CONTAINMENT PROFILER — the richer measurement behind qa-boss/CONTAINMENT-TRIAGE.md
//
// scripts/check-containment.mjs answers ONE question per edge: longest contiguous run of subject
// pixels at alpha > 40, worst frame only. This tool adds the two axes the triage calibration needs:
//
//   A40 / A128 / A200 — the same longest-run measurement at three alpha thresholds (the opacity
//                       axis: does the contact soften when you demand solid matter?)
//   dwell             — how many FRAMES of the clip carry an A200 run >= DWELL_MIN (90) source px
//                       on that edge (the persistence axis: blip vs sustained cut)
//
// Decode is IDENTICAL to check-containment.mjs, including the load-bearing detail:
//   `-c:v libvpx-vp9` MUST precede `-i` for .webm or ffmpeg silently drops the alpha plane and
//   every clip measures perfectly clean.
// Runs are reported in SOURCE pixels after analysing at --scale 480, same convention.
//
// This is a MEASUREMENT tool, not a gate. It always exits 0.
//
// Usage:
//   node qa-boss/profile-containment.mjs public/assets/characters --out qa-boss/containment-sweep.json
//   node qa-boss/profile-containment.mjs public/assets/characters/satoshi-odachi/special-c.webm
//   node qa-boss/profile-containment.mjs <file|dir> [--out <json>] [--scale 480] [--dwell-min 90]
//                                                   [--plate green|magenta]
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(
  'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json',
);
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const target = argv[0];
if (!target) {
  console.error('usage: node qa-boss/profile-containment.mjs <file|dir> [--out <json>] [--scale N] [--dwell-min N]');
  process.exit(0);
}
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const OUT = opt('--out', null);
const SCALE = Number(opt('--scale', 480));
const DWELL_MIN = Number(opt('--dwell-min', 90)); // source px, at alpha 200
const PLATE = String(opt('--plate', 'green'));
const LEVELS = [40, 128, 200];
const EDGES = ['top', 'left', 'right', 'bottom'];

const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;
const isMagenta = (r, g, b) => r > 90 && b > 40 && g < r - 40 && g < b + 20;

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file], { encoding: 'utf8' });
  const m = (r.stdout || '').trim().match(/(\d+)x(\d+)/);
  return m ? { w: +m[1], h: +m[2] } : null;
}

// Longest contiguous run of `true` along a scanline — a single stray keying crumb is not a slice.
function longestRun(get, n) {
  let best = 0, cur = 0;
  for (let i = 0; i < n; i++) {
    if (get(i)) { cur++; if (cur > best) best = cur; } else cur = 0;
  }
  return best;
}

function scanClip(file, tmpDir) {
  const dim = probe(file);
  if (!dim) return { file, error: 'ffprobe failed' };
  const srcW = dim.w;
  const isWebm = /\.webm$/i.test(file);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  // NOTE the decoder flag position — before -i, or alpha is dropped.
  const pre = isWebm ? ['-c:v', 'libvpx-vp9'] : [];
  const vf = isWebm ? `alphaextract,scale=${SCALE}:-1` : `scale=${SCALE}:-1`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...pre, '-i', file,
    '-vf', vf, '-vsync', '0', path.join(tmpDir, 'f_%04d.png')], { encoding: 'utf8' });
  if (r.status !== 0) { fs.rmSync(tmpDir, { recursive: true, force: true }); return { file, error: (r.stderr || '').split('\n')[0] }; }

  const frames = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.png')).sort();
  if (!frames.length) { fs.rmSync(tmpDir, { recursive: true, force: true }); return { file, error: 'decoded 0 frames' }; }

  const k = srcW / SCALE;                        // analysis px -> source px
  const dwellCut = DWELL_MIN;                    // compared against the SOURCE-px run

  // per edge: worst run + its frame, per alpha level; plus dwell frame count
  const acc = {};
  for (const e of EDGES) {
    acc[e] = { a40: 0, a128: 0, a200: 0, f40: -1, f128: -1, f200: -1, dwell: 0 };
  }

  frames.forEach((fn, idx) => {
    const p = PNG.sync.read(fs.readFileSync(path.join(tmpDir, fn)));
    const { width: w, height: h, data } = p;
    // subject test at a given alpha threshold; for raw plates the threshold is meaningless
    // (subject = "not plate"), so all three levels collapse to the same answer — documented.
    const present = (x, y, lvl) => {
      const kk = (y * w + x) * 4;
      if (isWebm) return data[kk] > lvl;                          // alphaextract -> grey = alpha
      const [r0, g0, b0] = [data[kk], data[kk + 1], data[kk + 2]];
      return PLATE === 'magenta' ? !isMagenta(r0, g0, b0) : !isGreen(r0, g0, b0);
    };
    const scan = {
      top: (lvl) => longestRun((x) => present(x, 0, lvl), w),
      bottom: (lvl) => longestRun((x) => present(x, h - 1, lvl), w),
      left: (lvl) => longestRun((y) => present(0, y, lvl), h),
      right: (lvl) => longestRun((y) => present(w - 1, y, lvl), h),
    };
    for (const e of EDGES) {
      for (const lvl of LEVELS) {
        const run = Math.round(scan[e](lvl) * k);                 // SOURCE px
        const key = `a${lvl}`;
        if (run > acc[e][key]) { acc[e][key] = run; acc[e][`f${lvl}`] = idx; }
        if (lvl === 200 && run >= dwellCut) acc[e].dwell++;
      }
    }
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });

  const edges = {};
  for (const e of EDGES) {
    edges[e] = {
      a40: acc[e].a40, a40Frame: acc[e].f40,
      a128: acc[e].a128, a128Frame: acc[e].f128,
      a200: acc[e].a200, a200Frame: acc[e].f200,
      dwell: acc[e].dwell,
    };
  }
  return { file, frames: frames.length, srcW, srcH: dim.h, edges };
}

// ---- band calibration (from the handoff; NOT invented here) -------------------------------
// Driven by the worst of TOP/LEFT/RIGHT only. BOTTOM never counts — feet are on the floor line.
//   CLEAR   A200 < 32
//   REVIEW  32 <= A200 < 90
//   BLOCK   A200 >= 200  OR  (A200 >= 90 AND dwell >= 3)
function band(row) {
  const tlr = ['top', 'left', 'right'];
  let worst = { edge: null, a200: -1, frame: -1, dwell: 0 };
  for (const e of tlr) {
    const d = row.edges[e];
    if (d.a200 > worst.a200) worst = { edge: e, a200: d.a200, frame: d.a200Frame, dwell: d.dwell };
  }
  const { a200, dwell } = worst;
  let b;
  if (a200 >= 200 || (a200 >= 90 && dwell >= 3)) b = 'BLOCK';
  else if (a200 >= 32) b = 'REVIEW';
  else b = 'CLEAR';
  return { ...worst, band: b };
}

// ---- file collection -----------------------------------------------------------------------
function collect(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return [p];
  const out = [];
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(webm|mp4)$/i.test(ent.name)) out.push(full);
    }
  };
  walk(p);
  out.sort();
  return out;
}

const files = collect(target);
const tmpRoot = path.join(process.env.TEMP || '.', `profile_containment_${process.pid}`);
const repoRoot = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter';
const rel = (f) => path.resolve(f).replace(/\\/g, '/').replace(repoRoot + '/', '')
  .replace('public/assets/characters/', '');
const W = 44; // clip-name column width

console.log('=== CONTAINMENT PROFILER ===');
console.log(`    A40 / A128 / A200 = longest contiguous border run at alpha > 40 / 128 / 200, SOURCE px`);
console.log(`    dwell = frames whose A200 run on that edge is >= ${DWELL_MIN} source px`);
console.log(`    bottom is measured but NEVER counts toward the band (feet on the floor line)`);
console.log(`    analysing at --scale ${SCALE}; ${files.length} file(s)\n`);

const rows = [];
const t0 = Date.now();
files.forEach((f, i) => {
  const r = scanClip(f, tmpRoot);
  if (!r.error) r.verdict = band(r);
  r.rel = rel(f);
  rows.push(r);
  const tag = r.error ? `ERR ${r.error}` : `${r.verdict.band.padEnd(6)} ${r.verdict.edge.toUpperCase().padEnd(5)} A200 ${String(r.verdict.a200).padStart(4)} @f${r.verdict.frame} dwell ${r.verdict.dwell}/${r.frames}`;
  console.log(`  [${String(i + 1).padStart(3)}/${files.length}] ${r.rel.padEnd(W)} ${tag}`);
});
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log('\n--- PER-CLIP DETAIL (source px; f = frame index of the worst run) ---');
const hdr = 'clip'.padEnd(W) + 'edge   A40   A128  A200  f     dwell  band';
console.log(hdr);
console.log('-'.repeat(hdr.length));
for (const r of rows) {
  if (r.error) { console.log(`${r.rel.padEnd(W)}ERROR: ${r.error}`); continue; }
  EDGES.forEach((e, j) => {
    const d = r.edges[e];
    const name = j === 0 ? r.rel.padEnd(W) : ' '.repeat(W);
    const bandCol = j === 0 ? `  ${r.verdict.band}` : '';
    console.log(
      name + e.padEnd(7) +
      String(d.a40).padStart(4) + '  ' + String(d.a128).padStart(5) + ' ' +
      String(d.a200).padStart(5) + '  ' + ('f' + d.a200Frame).padEnd(6) +
      String(d.dwell).padStart(4) + '  ' + bandCol,
    );
  });
}

const ok = rows.filter((r) => !r.error);
const counts = { CLEAR: 0, REVIEW: 0, BLOCK: 0 };
for (const r of ok) counts[r.verdict.band]++;
console.log(`\nscanned ${rows.length}  |  errors ${rows.length - ok.length}  |  ` +
  `CLEAR ${counts.CLEAR}  REVIEW ${counts.REVIEW}  BLOCK ${counts.BLOCK}   (${secs}s)`);

if (OUT) {
  const payload = {
    generatedAt: new Date().toISOString(),
    tool: 'qa-boss/profile-containment.mjs',
    target: rel(target),
    params: { scale: SCALE, alphaLevels: LEVELS, dwellMinSourcePx: DWELL_MIN, plate: PLATE },
    calibration: {
      note: 'band driven by worst of TOP/LEFT/RIGHT only; BOTTOM never counts',
      CLEAR: 'A200 < 32',
      REVIEW: '32 <= A200 < 90',
      BLOCK: 'A200 >= 200 OR (A200 >= 90 AND dwell >= 3)',
    },
    totals: { scanned: rows.length, errors: rows.length - ok.length, ...counts },
    clips: rows.map((r) => (r.error
      ? { clip: r.rel, error: r.error }
      : {
        clip: r.rel,
        character: r.rel.split('/').slice(-2)[0],
        frames: r.frames,
        source: { w: r.srcW, h: r.srcH },
        edges: r.edges,
        worstTLR: r.verdict,
        band: r.verdict.band,
      })),
  };
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`wrote ${OUT}`);
}

process.exit(0);
