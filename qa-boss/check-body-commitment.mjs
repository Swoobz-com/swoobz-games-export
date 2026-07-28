// BODY-COMMITMENT GATE — is this clip actually WORTH WATCHING, or is it the anchor pose with an
// overlay painted on it?
//
// ############################################################################################
// # WHY THIS EXISTS. Tim, 2026-07-28, on the finished IR-48 kit: "all specials from final boss #
// # look super super boring." He was right, and NOT ONE existing gate could see it. containment #
// # asks "does anything cross an edge", front-turn asks "does he rotate square to camera",      #
// # extra-objects asks "did something detach". All three are DEFECT detectors: a clip in which  #
// # the fighter does nothing at all passes every one of them PERFECTLY — a still frame is the   #
// # single most containable, most side-profile, most single-blob clip you can generate.         #
// #                                                                                             #
// # So the pipeline had a hole shaped exactly like "boring", and the session-12 prompt process  #
// # walked straight into it: every reject was fixed by DELETING motion ("delete the sweep",     #
// # "delete the vertical raise", "a wrist shake"), because deleting motion always satisfies a   #
// # containment lock. Optimising against defect-only gates converges on the most boring clip    #
// # that passes. This gate closes that hole by making "boring" a MEASURABLE reject reason.      #
// ############################################################################################
//
// THE FOUR SIGNALS, all read off the green-keyed silhouette of the RAW mp4:
//
//   minIoU   lowest IoU(f0, fN), bbox-NORMALISED to 64x64. PURE POSE change — translation and
//            scale are divided out, so this cannot be gamed by drifting across the frame.
//            LOWER = more committed. idle sits at ~0.70; a real throw reaches ~0.11.
//   travel   max |bbox centre-x - f0 centre-x|, in SOURCE px. Real footwork moves the centre.
//   strongPct  % of frames with IoU(f0,fN) < 0.60 — the DUTY CYCLE. This is the signal that
//            catches a clip with one big spike and 78% dead air, which is exactly how ir48
//            special_3 read as boring despite a good peak. A finisher has to SUSTAIN.
//   spanPeak max bbox width / f0 bbox width. A committed strike extends the frame.
//
// CRITICAL: travel/spanPeak are measured on a CORE mask that EXCLUDES bright gold/white glow
// pixels, so a big flashy effect CANNOT fake body commitment. That is the whole point — ir48
// special_2 has a large bright flare and a body that moves 12px, which is to say, not at all.
//
// ############################################################################################
// # CALIBRATION STATUS: CALIBRATED ON ONE CHARACTER (ir48-hex-paper-lord, 10 clips, 97 frames  #
// # each). **NOT CALIBRATED TO CONVICT ACROSS THE ROSTER.** This is the same trap that makes    #
// # check-frontturn.mjs flag 77 of 97 shipped clips at its defaults — read its calibration box. #
// # Treat a flag here as "go and LOOK at this clip", never as a defect on its own.              #
// ############################################################################################
//
// The floor is deliberately set from the character's OWN ordinary attacks, not an absolute:
// a SPECIAL that moves less than that character's blocks and throws is failing on its own terms.
// Measured on ir48 (2026-07-28):
//
//   ORDINARY ATTACKS   minIoU 0.114-0.323 | travel  76-174px | strong 46-68%
//   idle               minIoU 0.700       | travel  16px     | strong  0%
//   SPECIAL_1 v4       minIoU 0.475       | travel  68px     | strong 53%   <- fidget: busy but weak
//   SPECIAL_2 v1       minIoU 0.638       | travel  12px     | strong  0%   <- an IDLE with a flare
//   SPECIAL_3 v3       minIoU 0.220       | travel 136px     | strong 19%   <- one spike, 78% dead air
//
// Hence the defaults below: a special must be at least as committed as the character's WEAKEST
// ordinary attack. All three ir48 specials fail, each for its own correct reason.
//
// BLIND SPOTS — this gate measures MOTION, NOT QUALITY:
//   - Wild flailing scores EXCELLENT. A high score is permission to look, not a pass.
//   - It says nothing about whether the effect is good, on-palette, or attached.
//   - `idle` and `ko` are EXEMPT (idle is meant to be near-anchor; ko is off-anchor by spec and
//     its collapse would score as huge commitment for the wrong reason). Both are skipped.
//   - It needs the green plate. Run it on the RAW mp4, before keying.
//
// USAGE
//   node qa-boss/check-body-commitment.mjs <clip.mp4> [more.mp4 ...] [--profile special|attack]
//                                          [--min-iou 0.32] [--travel 90] [--strong 40]
//   node qa-boss/check-body-commitment.mjs --kit ir48-hex-paper-lord     (whole kit, auto-profile)
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', 'noop.js'));
const { PNG } = require('pngjs');

const SCALE = 240;                 // decode width; source is 960 so results scale by 4
const SRC_W = 960;
const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;
// Bright gold/white glow — excluded from the CORE mask so an effect cannot fake commitment.
const isGlow = (r, g, b) => (r > 200 && g > 170) || (r > 230 && g > 230 && b > 200);

// Profiles. A special is held to the character's ordinary-attack floor; an ordinary attack to a
// looser one. Override any of them on the command line.
const PROFILES = {
  special: { minIoU: 0.32, travel: 90, strong: 40 },
  attack:  { minIoU: 0.45, travel: 60, strong: 30 },
};
const EXEMPT = /(^|[-_])(idle|ko)([-_.]|$)/i;

function bbox(m, w, h) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
function norm(m, w, h, b) {
  const N = 64, out = new Uint8Array(N * N);
  const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const sx = b.x0 + Math.floor((x + 0.5) * bw / N);
    const sy = b.y0 + Math.floor((y + 0.5) * bh / N);
    out[y * N + x] = m[sy * w + sx];
  }
  return out;
}
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] || b[k]) u++; if (a[k] && b[k]) i++; } return u ? i / u : 0; };

export function measure(file) {
  const tmp = path.join(process.env.TEMP || HERE, 'bcg_' + path.basename(file).replace(/\W/g, '_'));
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  try {
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', `scale=${SCALE}:-1`,
      '-vsync', '0', path.join(tmp, 'f_%04d.png')], { encoding: 'utf8' });
    if (r.status !== 0) return { error: (r.stderr || 'ffmpeg failed').split('\n')[0] };
    const files = fs.readdirSync(tmp).filter((f) => f.endsWith('.png')).sort();
    if (files.length < 2) return { error: `decoded ${files.length} frames` };

    const rows = [];
    for (const fn of files) {
      const p = PNG.sync.read(fs.readFileSync(path.join(tmp, fn)));
      const { width: w, height: h, data } = p;
      const all = new Uint8Array(w * h), core = new Uint8Array(w * h);
      for (let i = 0; i < all.length; i++) {
        const k = i * 4, r0 = data[k], g0 = data[k + 1], b0 = data[k + 2];
        if (isGreen(r0, g0, b0)) continue;
        all[i] = 1;
        if (!isGlow(r0, g0, b0)) core[i] = 1;
      }
      const bA = bbox(all, w, h), bC = bbox(core, w, h);
      if (bC.x1 < 0 || bA.x1 < 0) continue;          // fully-empty frame: skip, don't crash
      rows.push({ n: norm(all, w, h, bA), core: bC });
    }
    if (rows.length < 2) return { error: 'no non-empty frames' };

    const f0 = rows[0], S = SRC_W / SCALE;
    const cx0 = (f0.core.x0 + f0.core.x1) / 2;
    const span0 = f0.core.x1 - f0.core.x0 + 1;
    let minIoU = 1, travel = 0, spanPeak = 1, strong = 0, active = 0;
    for (const r2 of rows) {
      const v = iou(f0.n, r2.n);
      minIoU = Math.min(minIoU, v);
      if (v < 0.80) active++;
      if (v < 0.60) strong++;
      travel = Math.max(travel, Math.abs((r2.core.x0 + r2.core.x1) / 2 - cx0) * S);
      spanPeak = Math.max(spanPeak, (r2.core.x1 - r2.core.x0 + 1) / span0);
    }
    return {
      frames: rows.length, minIoU, travel, spanPeak,
      strongPct: 100 * strong / rows.length, activePct: 100 * active / rows.length,
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function judge(m, th) {
  const fails = [];
  if (m.minIoU > th.minIoU) fails.push(`POSE minIoU ${m.minIoU.toFixed(3)} > ${th.minIoU} (barely leaves the anchor pose)`);
  if (m.travel < th.travel) fails.push(`TRAVEL ${m.travel.toFixed(0)}px < ${th.travel}px (no footwork / weight shift)`);
  if (m.strongPct < th.strong) fails.push(`DUTY ${m.strongPct.toFixed(0)}% < ${th.strong}% strong frames (action is a blip, rest is dead air)`);
  return fails;
}

// ---- CLI ----------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const kit = flag('--kit', null);
  const forced = flag('--profile', null);
  let files = argv.filter((a) => /\.mp4$/i.test(a));
  if (kit) {
    const dir = path.join(HERE, 'raw');
    files = fs.readdirSync(dir).filter((f) => f.startsWith(kit) && f.endsWith('.mp4')).map((f) => path.join(dir, f));
  }
  if (!files.length) { console.error('usage: check-body-commitment.mjs <clip.mp4 ...> | --kit <character-id>'); process.exit(2); }

  console.log('clip                                    frames  minIoU  travel  strong%  spanPk  verdict');
  console.log('-'.repeat(104));
  let failed = 0, skipped = 0;
  for (const f of files.sort()) {
    const name = path.basename(f, '.mp4');
    if (EXEMPT.test(name)) { console.log(name.padEnd(40) + '  — EXEMPT (idle/ko are near-anchor or off-anchor by spec)'); skipped++; continue; }
    const m = measure(f);
    if (m.error) { console.log(name.padEnd(40) + '  ERROR ' + m.error); failed++; continue; }
    const prof = forced || (/special/i.test(name) ? 'special' : 'attack');
    const th = { ...PROFILES[prof] };
    if (flag('--min-iou')) th.minIoU = +flag('--min-iou');
    if (flag('--travel')) th.travel = +flag('--travel');
    if (flag('--strong')) th.strong = +flag('--strong');
    const fails = judge(m, th);
    if (fails.length) failed++;
    console.log(
      name.padEnd(40) + String(m.frames).padStart(6) + m.minIoU.toFixed(3).padStart(8) +
      m.travel.toFixed(0).padStart(8) + m.strongPct.toFixed(0).padStart(8) +
      m.spanPeak.toFixed(2).padStart(8) + '  ' + (fails.length ? `FLAG [${prof}]` : `ok   [${prof}]`)
    );
    for (const x of fails) console.log(' '.repeat(42) + '· ' + x);
  }
  console.log('-'.repeat(104));
  console.log(`${files.length - skipped} judged, ${failed} flagged, ${skipped} exempt.`);
  console.log('A FLAG MEANS GO AND LOOK. This gate measures motion, not quality — flailing scores well.');
  process.exit(failed ? 1 : 0);
}
