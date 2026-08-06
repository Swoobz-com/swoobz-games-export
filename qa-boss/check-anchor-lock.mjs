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

// THE DEBRIS-DRAG CORRECTION (phase 72). This gate bbox-NORMALISES, and that makes it acutely
// vulnerable to anything the beat leaves lying in frame. Session 12 already recorded the shape of it
// — "check-frontturn derives both signals from the bbox, so a detached object doesn't merely go
// unnoticed, it CORRUPTS the reading" — but anchor-lock inherited the same flaw unnoticed.
//
// Measured on eclipse attack_strike v4: the clip ends with her shed ofuda talismans lying on the
// FLOOR. Those few litter pixels push the frame's bbox from x0=65 out to x0=42, so the normalised
// grid samples a different part of her body in every cell:
//     fLast over ALL pixels        0.415   <- reads as a hard FAIL
//     fLast over the BODY only     0.930   <- she is back on the anchor, correctly
// Her pose was right the whole time. The number was measuring litter.
//
// This matters beyond one clip: v2 (0.502) and v3 (0.467) of the same state ALSO shed ofuda, so those
// two "failures" are suspect too, and a re-roll may have been spent chasing a corrupted number. Every
// signature beat in this project sheds something — petals, bone flakes, stone chips, burning paper —
// so unfixed, this gate would mis-score most of the roster's best clips.
//
// So the gate now reports BOTH: `body` (largest connected component = the fighter and whatever she
// holds) is the POSE verdict; `all` still includes debris and is what catches a genuinely displaced
// silhouette. A large gap between them IS the signal that the clip ends with litter on screen — which
// is a real defect worth fixing in the PROMPT (a clip that ends with debris crossfades badly back to
// idle), just not a pose failure.
function largestComponent(m, w, h) {
  const seen = new Uint8Array(w * h);
  let best = null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const id = w * y + x;
    if (!m[id] || seen[id]) continue;
    const px = [];
    const st = [x, y];
    while (st.length) {
      const yy = st.pop(), xx = st.pop();
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const i2 = w * yy + xx;
      if (seen[i2] || !m[i2]) continue;
      seen[i2] = 1; px.push(i2);
      st.push(xx + 1, yy); st.push(xx - 1, yy); st.push(xx, yy + 1); st.push(xx, yy - 1);
    }
    if (!best || px.length > best.length) best = px;
  }
  if (!best) return null;
  const out = new Uint8Array(w * h);
  for (const i of best) out[i] = 1;
  return out;
}

// bbox-normalised silhouette: compares POSE, with position and scale divided out, so a clip that
// merely sits lower or larger in frame is not mistaken for a broken start pose.
// bodyOnly=true first reduces to the largest connected component, discarding shed debris.
function norm(p, bodyOnly) {
  const { width: w, height: h, data: d } = p;
  let m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > ALPHA) m[i] = 1;
  if (bodyOnly) {
    const lc = largestComponent(m, w, h);
    if (lc) m = lc;
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    if (m[i]) {
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
    // ############################################################################################
    // # DECISION-REGISTER #7 — SHOW THE ROWS YOU MEASURED. ADDITIVE OUTPUT ONLY.                  #
    // # This branch used to announce a verdict on the whole kit without printing a single         #
    // # per-clip number, so a reader could not tell whether the conclusion rested on ONE outlier  #
    // # or on the entire population. That blindness is exactly how lich-scythe's f0body artifact  #
    // # survived a whole cycle (10 "defects" that were one mis-calibrated column). Every number   #
    // # below was ALREADY measured above — all-pixel f0-vs-anchor, and each clip's median IoU     #
    // # against its peers; the body columns are not computed on this path, so they are not shown. #
    // # Printing only: no threshold, comparison, verdict string or exit code is touched here.     #
    // ############################################################################################
    console.log('');
    console.log('MEASURED ROWS (all-pixel; the body columns are not computed on this path):');
    console.log('clip'.padEnd(30) + '   f0all   peerMED');
    for (const f of others) {
      const peers = others.filter((o) => o !== f).map((o) => iou(f0s[f], f0s[o])).sort((a, b) => a - b);
      console.log(f.padEnd(30) + iou(anchor, f0s[f]).toFixed(3).padStart(8) +
        (peers.length ? peers[peers.length >> 1] : 0).toFixed(3).padStart(10));
    }
    process.exit(1);
  }
}

console.log('anchor = ' + idleName + ' f0   (' + path.basename(dir) + ')');
// BODY columns are the POSE verdict (debris discarded); ALL columns still include everything, and a
// large body-vs-all gap means the clip ENDS WITH LITTER ON SCREEN — a real defect, but a prompt one.
const anchorBody = norm(idle.first, true);
console.log('clip'.padEnd(30) + '  f0body  fLASTbody |  f0all fLASTall   verdict');
console.log('-'.repeat(104));
const bad = [];
for (const f of files) {
  const d = decode(path.join(dir, f));
  if (!d) { console.log(f.padEnd(30) + 'DECODE FAILED'); bad.push(f); continue; }
  const a = norm(d.first), z = norm(d.last);
  const ab = norm(d.first, true), zb = norm(d.last, true);
  const sAll = a ? iou(anchor, a) : 0;
  const eAll = z ? iou(anchor, z) : 0;
  const s = ab ? iou(anchorBody, ab) : 0;   // POSE verdict
  const e = zb ? iou(anchorBody, zb) : 0;
  const isKo = /(^|[-_])ko/.test(f);
  let v;
  if (s < 0.80) { v = '*** START POSE BROKEN — will SNAP on crossfade ***'; bad.push(f); }
  else if (s < 0.90) { v = 'start drifts'; bad.push(f); }
  else if (isKo) v = 'ok (end exempt: ko ends down by spec)';
  else if (e < 0.80) { v = 'END pose broken — will snap on return to idle'; bad.push(f); }
  else v = 'ok';
  // Debris tell: pose is fine but the all-pixel number is far worse.
  if (!isKo && e >= 0.90 && eAll < e - 0.15) {
    v += '  [ENDS WITH DEBRIS ON SCREEN — pose ok, but fix the prompt: the shed material must be GONE by the last frame]';
  }
  console.log(f.padEnd(30) + s.toFixed(3).padStart(8) + e.toFixed(3).padStart(10) + ' |' +
    sAll.toFixed(3).padStart(7) + eAll.toFixed(3).padStart(9) + '   ' + v);
}
console.log('-'.repeat(88));
console.log(bad.length ? bad.length + ' clip(s) break the anchor: ' + bad.join(', ') : 'kit anchor-locked.');
process.exit(bad.length ? 1 : 0);
