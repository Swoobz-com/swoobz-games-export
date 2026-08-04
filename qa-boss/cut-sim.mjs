// CUT SIMULATOR — read-only. Predicts where a clip's silhouette lands ON SCREEN and how far it JUMPS
// across a state change, by reproducing the engine's CSS placement offline.
//
// WHY IT EXISTS. STANDOFF has NO crossfade: src/ui/fight.css `.fr-state-video` transitions `filter`
// ONLY (the two opacity transitions in that file belong to `.fr-stage-video` and `.fr-pick`), and
// FightExperience.tsx sets `opacity: key === activeKey ? 1 : 0` with no transition. So every state
// change is a ONE-FRAME HARD CUT. "Is the pose gap visible?" therefore means "how far does the
// silhouette move in a single frame, in CSS px". `check-anchor-lock` cannot answer that: it compares
// bbox-NORMALISED silhouettes, so it measures POSE and is blind to PLACEMENT. `cal` governs placement.
// NOTHING ELSE MEASURES THE TWO COMPOSED — which is exactly what the player sees.
//
// ⛔ THE BUG THIS TOOL SHIPPED WITH, AND HOW IT WAS CAUGHT (phase 274). The first version resolved
// cal.h/cal.bottom against the STAGE height and cal.left against the STAGE width. That is wrong.
// FightExperience.tsx renders `.fr-fighter` as `position:absolute; left:cx%; top:feetY%; height:h%;
// aspect-ratio:1/1` (CAL.fighterP2 = {cx:76, feetY:96, h:58}), and the <video> lives inside THAT. So
// percentages resolve against a SQUARE fighter box = stageH * h/100 (measured live: 607.3x607.3 at a
// 1920x1047 stage), inflating h/bottom by 1.724x and left by 3.161x — two DIFFERENT factors, so the
// error was a plausible-looking distortion rather than an obvious one.
// It was caught by a CONTROL, not by inspection: the wrong model made lady-kurotachi look alarming
// (IoU 0.198) until the same run on three healthy kits put ir37 WORSE (0.134). A relative measurement
// means nothing until a known-good artefact has been through it. At the corrected basis this tool
// agrees with the live DOM to under 1px on lady-kurotachi, ir37 and ir48.
//
// ⚠ MIRROR. The fighter stack sits inside a wrapper carrying `scaleX(-1)` when the art must face the
// other way, so for a mirrored slot the LEFT and RIGHT deltas reported here are SWAPPED relative to
// what a player sees. Magnitudes are unaffected. This tool deliberately does not model the mirror —
// compare magnitudes, and swap L/R by hand for a mirrored slot.
//
// Usage: node cut-sim.mjs <stageW> <stageH> <fighterHPct> <out.png> <specA> <specB>
//   spec = clipPath:frameIdx|last:calH:calBottom:calLeft
//   fighterHPct = CAL.fighterP1/P2 `h` from FightExperience.tsx (58 today). The box is SQUARE.
// Exit: 0 measured · 2 refused (bad args, or the silhouette does not fit the fighter box — see GUARD).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const die = (m) => { console.error('REFUSED: ' + m); process.exit(2); };
if (argv.length !== 6) die('usage: node cut-sim.mjs <stageW> <stageH> <fighterHPct> <out.png> <specA> <specB>   spec=clip:frame|last:h:bottom:left');
const [sw, sh, fh, outPng, specA, specB] = argv;
const STAGE_W = Number(sw), STAGE_H = Number(sh), FH = Number(fh);
if (!Number.isFinite(STAGE_W) || STAGE_W < 100 || STAGE_W > 4096) die(`stageW must be 100..4096, got ${sw}`);
if (!Number.isFinite(STAGE_H) || STAGE_H < 100 || STAGE_H > 4096) die(`stageH must be 100..4096, got ${sh}`);
if (!Number.isFinite(FH) || FH <= 0 || FH > 100) die(`fighterHPct must be 0..100, got ${fh}`);

// THE CONTAINING BLOCK. `.fr-fighter` is height:FH% of the stage with aspect-ratio 1/1 => a SQUARE.
// Every cal percentage below resolves against THIS, never against the stage.
const BOX = Math.round((FH / 100) * STAGE_H);
if (BOX < 64) die(`fighter box computed as ${BOX}px — too small to measure`);

// ⚠ THE CANVAS AND THE PERCENTAGE BASIS ARE INDEPENDENT — the second bug this tool shipped with.
// Every shipped cal.h is 100-129%, i.e. the video is DELIBERATELY TALLER than the fighter box and the
// character legitimately overflows it (`.fr-fighter` does not clip). A first fix made the mask canvas
// equal to BOX, which was the correct BASIS but too small a CANVAS, so ir37/ir48 silhouettes hit the
// canvas edge and the guard below refused three healthy kits. Percentages resolve against BOX; the
// mask is drawn on a canvas PAD-padded on every side so overflow is captured rather than clipped.
const PAD = BOX;
const CAN = BOX + 2 * PAD;

function parseSpec(s) {
  const p = s.split(':');
  const tail = p.slice(-4);
  const clip = p.slice(0, p.length - 4).join(':'); // a windows path carries a drive colon
  if (!clip) die(`bad spec (no clip path): ${s}`);
  if (!fs.existsSync(clip)) die(`clip does not exist: ${clip}`);
  const [fr, h, bottom, left] = tail;
  const nums = { h: Number(h), bottom: Number(bottom), left: Number(left) };
  for (const [k, v] of Object.entries(nums)) if (!Number.isFinite(v)) die(`bad cal.${k} in spec: ${s}`);
  if (fr !== 'last' && !Number.isFinite(Number(fr))) die(`frame must be an integer or 'last', got ${fr}`);
  return { clip, fr, ...nums };
}
const A = parseSpec(specA), B = parseSpec(specB);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cutsim-'));
const cleanup = () => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ } };
function frameOf(spec) {
  const d = fs.mkdtempSync(path.join(tmpRoot, 'f-'));
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', spec.clip, '-pix_fmt', 'rgba',
      path.join(d, 'f_%04d.png')], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { cleanup(); die(`ffmpeg failed on ${spec.clip}`); }
  const fr = fs.readdirSync(d).filter((f) => f.endsWith('.png')).sort();
  if (!fr.length) { cleanup(); die(`decoded 0 frames from ${spec.clip}`); }
  const i = spec.fr === 'last' ? fr.length - 1 : Math.min(fr.length - 1, Math.max(0, Number(spec.fr)));
  return { file: path.join(d, fr[i]), idx: i, total: fr.length };
}

// Place a decoded frame in the fighter box exactly as the CSS does.
function place(spec) {
  const f = frameOf(spec);
  const p = PNG.sync.read(fs.readFileSync(f.file));
  const videoH = (spec.h / 100) * BOX;
  const scale = videoH / p.height;
  const videoW = p.width * scale;                            // width:auto keeps the intrinsic aspect
  // basis = BOX, canvas = CAN (offset by PAD) — see the note at the top of the file.
  const originX = PAD + (spec.left / 100) * BOX - videoW / 2;      // left:% of the BOX + translateX(-50%)
  const originY = PAD + BOX - (spec.bottom / 100) * BOX - videoH;  // bottom:% of the BOX
  const mask = new Uint8Array(CAN * CAN);
  let x0 = CAN, x1 = -1, y0 = CAN, y1 = -1;
  for (let y = 0; y < CAN; y += 1) {
    const sy = Math.floor((y - originY) / scale);
    if (sy < 0 || sy >= p.height) continue;
    for (let x = 0; x < CAN; x += 1) {
      const sx = Math.floor((x - originX) / scale);
      if (sx < 0 || sx >= p.width) continue;
      if (p.data[(sy * p.width + sx) * 4 + 3] > 8) {
        mask[y * CAN + x] = 1;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) { cleanup(); die(`${path.basename(spec.clip)} frame ${f.idx} is blank in the fighter box`); }
  return { mask, x0, x1, y0, y1, f, videoW, videoH };
}

const pa = place(A), pb = place(B);

// ⛔ GUARD — THE VACUOUS PASS THIS TOOL COMMITTED BEFORE IT HAD THIS CHECK.
// The mask canvas IS the percentage basis, so a clip that renders WIDER than the fighter box has its
// silhouette CLIPPED to the canvas edge. Both frames then measure x 0..BOX-1, every delta comes out
// ZERO and the IoU comes out high — a confident "no movement" off a measurement that never happened.
// It fired for real on satoshi-odachi, whose video renders ~744-783px wide against a 607px basis.
// The canvas is now PAD-padded so legitimate overflow is captured; anything still touching the CANVAS
// edge is genuinely unrepresentable, and the tool must say so rather than answer.
for (const [tag, spec, p] of [['A', A, pa], ['B', B, pb]]) {
  if (p.x0 <= 0 || p.y0 <= 0 || p.x1 >= CAN - 1 || p.y1 >= CAN - 1) {
    cleanup();
    console.error(`REFUSED: ${tag} (${path.basename(spec.clip)}) touches the CANVAS edge.`);
    console.error(`         silhouette x ${p.x0}..${p.x1}  y ${p.y0}..${p.y1}  on a ${CAN}x${CAN} canvas (basis ${BOX});`);
    console.error(`         its video renders ${Math.round(p.videoW)}x${Math.round(p.videoH)}px, so the mask is CLIPPED and every`);
    console.error('         delta would read 0 off a measurement that never happened. Nothing was judged.');
    process.exit(2);
  }
}

const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(0);
console.log(`FIGHTER BOX ${BOX}x${BOX} px (square: ${FH}% of a ${STAGE_W}x${STAGE_H} stage) — cal % resolve against THIS, not the stage\n`);
// absolute coords are printed BOX-RELATIVE (0 = the fighter box's left/top edge; negative = overflow)
const rel = (v) => v - PAD;
console.log(`A  ${path.basename(A.clip)} f${pa.f.idx}/${pa.f.total - 1}  cal h${A.h} bottom${A.bottom} left${A.left}`);
console.log(`   silhouette  x ${rel(pa.x0)}..${rel(pa.x1)} (w ${pa.x1 - pa.x0 + 1})   y ${rel(pa.y0)}..${rel(pa.y1)} (h ${pa.y1 - pa.y0 + 1})`);
console.log(`B  ${path.basename(B.clip)} f${pb.f.idx}/${pb.f.total - 1}  cal h${B.h} bottom${B.bottom} left${B.left}`);
console.log(`   silhouette  x ${rel(pb.x0)}..${rel(pb.x1)} (w ${pb.x1 - pb.x0 + 1})   y ${rel(pb.y0)}..${rel(pb.y1)} (h ${pb.y1 - pb.y0 + 1})`);
console.log(`   (coords are BOX-RELATIVE: 0 = the fighter box edge, negative = legitimate overflow)\n`);
console.log('THE CUT — one hard frame, in CSS px on screen (L/R are SWAPPED for a mirrored slot):');
console.log(`   LEFT edge ${fmt(pb.x0 - pa.x0)}   RIGHT edge ${fmt(pb.x1 - pa.x1)}   TOP ${fmt(pb.y0 - pa.y0)}   BOTTOM ${fmt(pb.y1 - pa.y1)}`);
let inter = 0, uni = 0, onlyA = 0, onlyB = 0;
for (let k = 0; k < pa.mask.length; k += 1) {
  const a = pa.mask[k], b = pb.mask[k];
  if (a & b) inter += 1; if (a | b) uni += 1;
  if (a && !b) onlyA += 1; if (b && !a) onlyB += 1;
}
console.log(`   on-screen IoU ${(inter / uni).toFixed(3)}   px changing in one frame ${onlyA + onlyB} (A-only ${onlyA} · B-only ${onlyB})`);
console.log('   ⚠ A moving BOTTOM edge = the feet leave the floor line for a frame. That reads far worse');
console.log('     than a width change of the same magnitude — weight it accordingly.');

const out = new PNG({ width: CAN, height: CAN });
for (let k = 0; k < pa.mask.length; k += 1) {
  const a = pa.mask[k], b = pb.mask[k], o = k * 4;
  let r = 7, g = 8, bl = 12;
  if (a && b) { r = 210; g = 210; bl = 210; }
  else if (a) { r = 235; g = 40; bl = 60; }
  else if (b) { r = 40; g = 210; bl = 235; }
  out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = bl; out.data[o + 3] = 255;
}
fs.writeFileSync(outPng, PNG.sync.write(out));
cleanup();
console.log(`\noverlay -> ${outPng}   (RED = A only · CYAN = B only · GREY = both)`);
