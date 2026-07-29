// ANCHOR-LOCK GATE — does every clip in a kit START and END on the SAME anchor pose?
//
// ############################################################################################
// # WHY THIS EXISTS. Tim, 2026-07-29, playing node 7: "the 7 map boss when she get hit her     #
// # model turns because she get hit in the back and then turns back."                          #
// # ir37-pink-tessen's `hit` clip STARTS hunched with her back to camera while every other     #
// # clip in her kit starts in a right-facing profile. The engine crossfades idle -> hit, so    #
// # she visibly rotates away, takes the hit in the back, and rotates home. `hit` fires on      #
// # nearly every exchange, so this was the most-seen animation in the game.                    #
// #                                                                                             #
// # NO EXISTING GATE COULD SEE IT. check-frontturn.mjs baselines on the clip's OWN frame 0, so #
// # a clip that starts broken measures everything against its own broken pose and reports the  #
// # defect as normal — it flagged only a 6-frame run at f52 and missed the f0-f12 back-turn    #
// # entirely. check-facing.mjs answers "is this MIRRORED", which is a different question: this #
// # clip is on the correct SIDE and still wrong. Only comparing against the KIT ANCHOR finds   #
// # it, and the kit anchor is idle's frame 0, not the clip's own.                               #
// ############################################################################################
//
// The contract (CHARACTER-CONTRACT / anchor-locked-character): every one-shot begins and ends on
// the ONE anchor pose, so clips chain without a snap. `ko` is the documented exception — it ends
// collapsed on the ground by spec — so its END is exempt while its START is still checked.
//
// USAGE
//   node qa-boss/check-anchor-lock.mjs <characterClipDir>
//   node qa-boss/check-anchor-lock.mjs public/assets/characters/ir37-pink-tessen
// Thresholds: f0 vs anchor  >=0.90 ok · 0.80-0.90 drifts · <0.80 BROKEN.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', 'noop.js'));
const { PNG } = require('pngjs');

const ALPHA = 24;
const dir = process.argv[2];
if (!dir) { console.error('usage: check-anchor-lock.mjs <characterClipDir>'); process.exit(2); }

function decode(file) {
  const t = path.join(process.env.TEMP || HERE, 'al_' + path.basename(file).replace(/\W/g, '_'));
  fs.rmSync(t, { recursive: true, force: true });
  fs.mkdirSync(t, { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-c:v', 'libvpx-vp9', '-i', file,
    '-vf', 'scale=200:-1', '-vsync', '0', path.join(t, 'f_%04d.png')], { encoding: 'utf8' });
  if (r.status !== 0) { fs.rmSync(t, { recursive: true, force: true }); return null; }
  const names = fs.readdirSync(t).filter((x) => x.endsWith('.png')).sort();
  if (!names.length) { fs.rmSync(t, { recursive: true, force: true }); return null; }
  const first = PNG.sync.read(fs.readFileSync(path.join(t, names[0])));
  const last = PNG.sync.read(fs.readFileSync(path.join(t, names[names.length - 1])));
  fs.rmSync(t, { recursive: true, force: true });
  return { first, last, n: names.length };
}

// bbox-normalised silhouette: compares POSE, with position and scale divided out, so a clip that
// merely sits lower or larger in frame is not mistaken for a broken start pose.
function norm(p) {
  const { width: w, height: h, data: d } = p;
  const m = new Uint8Array(w * h);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] > ALPHA) {
      m[i] = 1;
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const N = 64, o = new Uint8Array(N * N), bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    o[y * N + x] = m[(y0 + Math.floor((y + 0.5) * bh / N)) * w + (x0 + Math.floor((x + 0.5) * bw / N))];
  }
  return o;
}
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] || b[k]) u++; if (a[k] && b[k]) i++; } return u ? i / u : 0; };

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webm')).sort();
const idleName = files.find((f) => /^idle/.test(f));
if (!idleName) { console.error('no idle clip in ' + dir + ' — cannot establish the kit anchor'); process.exit(2); }
const idle = decode(path.join(dir, idleName));
const anchor = norm(idle.first);

// ############################################################################################
// # DEGENERATE-ANCHOR SELF-CHECK — DO NOT REMOVE.                                             #
// # This gate is RELATIVE, and a relative gate reports agreement with its REFERENCE, not       #
// # correctness. Run on lady-kurotachi it flagged ALL 13 clips; the truth was that her IDLE is #
// # the odd one out. Her 12 action clips agree with EACH OTHER at median IoU 0.932 (a healthy  #
// # anchor-locked kit) while every one of them scores ~0.38 against idle.                      #
// # Tell: near-identical scores across many different inputs. If the reference disagrees with  #
// # a majority that agrees among themselves, the REFERENCE is wrong — say so instead of        #
// # convicting the kit.                                                                        #
// ############################################################################################
const f0s = {};
for (const f of files) { const d = decode(path.join(dir, f)); f0s[f] = d ? norm(d.first) : null; }
const others = files.filter((f) => f !== idleName && f0s[f]);
if (others.length >= 3) {
  const pairs = [];
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) {
    pairs.push(iou(f0s[others[i]], f0s[others[j]]));
  }
  pairs.sort((a, b) => a - b);
  const medianPeer = pairs[pairs.length >> 1];
  const vsAnchor = others.map((f) => iou(anchor, f0s[f])).sort((a, b) => a - b);
  const medianVsAnchor = vsAnchor[vsAnchor.length >> 1];
  if (medianPeer >= 0.85 && medianVsAnchor < 0.70) {
    console.log('anchor = ' + idleName + ' f0   (' + path.basename(dir) + ')');
    console.log('');
    console.log('*** DEGENERATE ANCHOR — REFUSING TO JUDGE THE KIT ***');
    console.log('The action clips agree with EACH OTHER at median IoU ' + medianPeer.toFixed(3) +
      ', but all disagree with ' + idleName + ' (median ' + medianVsAnchor.toFixed(3) + ').');
    console.log('That means ' + idleName + ' is the OUTLIER, not the ' + others.length + ' clips it disagrees with.');
    console.log('FIX THE IDLE CLIP (or re-point the anchor) before reading any per-clip result here.');
    process.exit(1);
  }
}

console.log('anchor = ' + idleName + ' f0   (' + path.basename(dir) + ')');
console.log('clip'.padEnd(32) + 'f0 vs anchor   fLAST vs anchor   verdict');
console.log('-'.repeat(88));
const bad = [];
for (const f of files) {
  const d = decode(path.join(dir, f));
  if (!d) { console.log(f.padEnd(32) + 'DECODE FAILED'); bad.push(f); continue; }
  const a = norm(d.first), z = norm(d.last);
  const s = a ? iou(anchor, a) : 0;
  const e = z ? iou(anchor, z) : 0;
  const isKo = /(^|[-_])ko/.test(f);
  let v;
  if (s < 0.80) { v = '*** START POSE BROKEN — will SNAP on crossfade ***'; bad.push(f); }
  else if (s < 0.90) { v = 'start drifts'; bad.push(f); }
  else if (isKo) v = 'ok (end exempt: ko ends down by spec)';
  else if (e < 0.80) { v = 'END pose broken — will snap on return to idle'; bad.push(f); }
  else v = 'ok';
  console.log(f.padEnd(32) + s.toFixed(3).padStart(9) + e.toFixed(3).padStart(17) + '   ' + v);
}
console.log('-'.repeat(88));
console.log(bad.length ? bad.length + ' clip(s) break the anchor: ' + bad.join(', ') : 'kit anchor-locked.');
process.exit(bad.length ? 1 : 0);
