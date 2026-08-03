// FACING gate — does a character's shipped clip kit actually face the way its manifest `faces:` claims?
//
// WHY THIS EXISTS. `faces:` is not a label, it is a CORRECTNESS input. FightExperience.tsx:920 decides
// the mirror with `def.faces !== (slot === 'p1' ? 'right' : 'left')`, so if the field disagrees with what
// the ART does, the engine skips (or applies) a mirror it shouldn't and the fighter faces AWAY from the
// opponent. Clips are generated one way and reused for both slots — that is by design and is fine. What
// is NOT fine is the field disagreeing with the pixels, or clips within one kit disagreeing with each other.
//
// THE MEASUREMENT. Eyeballing facing was wrong 2/2 on this project (a "which way do the helmet horns
// sweep" heuristic looked convincing and disagreed with the anchor test); measurement was right 4/4.
// So facing is decided ONLY by the anchor-IoU mirror test:
//   bbox-crop the anchor silhouette and the clip silhouette, normalise both to NORM x NORM, then compare
//   IoU(anchor, clip) against IoU(anchor, mirror(clip)). Whichever is higher is the clip's facing.
// `ratio = IoU_mirrored / IoU_asis`; ratio > 1 means the clip is mirrored relative to the anchor.
//
// A clip is judged at its EARLY frames. Mid-clip rotation is a separate defect class (LK throw_b is
// correct at f0 and only rotates at f40-f56) and must NOT be read as a whole-clip mirror — that mistake
// was made once already. --frames widens the sample; the per-frame spread is printed so a rotation shows
// up as disagreement across frames rather than as a bad verdict.
//
// CRITICAL: `-c:v libvpx-vp9` MUST precede `-i` on a .webm or ffmpeg silently drops the alpha plane and
// every silhouette becomes a filled rectangle (IoU ~1.0 both ways = a meaningless PASS).
//
// Usage:
//   node scripts/check-facing.mjs lady-kurotachi
//   node scripts/check-facing.mjs <id> [--frames 5] [--norm 64] [--anchor <path>] [--json]
//   node scripts/check-facing.mjs --all
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter';
const require = createRequire(`${ROOT}/package.json`);
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const has = (name) => argv.includes(name);

const NFRAMES = Number(opt('--frames', 5));  // early frames sampled per clip
const NORM = Number(opt('--norm', 64));      // silhouettes normalised to NORM x NORM
const ALPHA_MIN = 40;
const SCALE = 240;                           // decode width; facing is a gross-shape test
const TMP = path.join(process.env.TEMP || '/tmp', 'facing-gate');

const ids = has('--all')
  ? fs.readdirSync(path.join(ROOT, 'public/assets/characters')).filter((d) =>
      fs.statSync(path.join(ROOT, 'public/assets/characters', d)).isDirectory())
  : argv.filter((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--frames'
      && argv[argv.indexOf(a) - 1] !== '--norm' && argv[argv.indexOf(a) - 1] !== '--anchor');

if (!ids.length) {
  console.error('usage: node scripts/check-facing.mjs <character-id> [--frames N] [--norm N] [--anchor path] [--json]');
  console.error('       node scripts/check-facing.mjs --all');
  process.exit(2);
}

// --- silhouette helpers -------------------------------------------------------------------------

// Crop to the subject bounding box, then resample to NORM x NORM. Normalising away position and size
// is what makes this a SHAPE comparison: a clip that merely stands elsewhere in frame must not read
// as a different facing.
function normalise(mask, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null; // empty silhouette
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const out = new Uint8Array(NORM * NORM);
  for (let ny = 0; ny < NORM; ny++) {
    const sy = y0 + Math.floor((ny + 0.5) * bh / NORM);
    for (let nx = 0; nx < NORM; nx++) {
      const sx = x0 + Math.floor((nx + 0.5) * bw / NORM);
      out[ny * NORM + nx] = mask[sy * w + sx] ? 1 : 0;
    }
  }
  return out;
}

function mirror(sil) {
  const out = new Uint8Array(NORM * NORM);
  for (let y = 0; y < NORM; y++)
    for (let x = 0; x < NORM; x++) out[y * NORM + x] = sil[y * NORM + (NORM - 1 - x)];
  return out;
}

function iou(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) inter++;
    if (a[i] || b[i]) uni++;
  }
  return uni ? inter / uni : 0;
}

const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;

// mode: 'grey'  -> alphaextract output, alpha lives in the R channel
//       'alpha' -> ordinary RGBA png, alpha at +3
//       'green' -> a raw GREEN PLATE with no usable alpha; subject = "not green"
//
// The 'green' mode exists because qa-boss/anchors/<id>-anchor.png is an RGBA *container* whose alpha is
// 255 everywhere — it is the raw plate, not a cutout. Using it directly normalises to a filled rectangle,
// which is symmetric, so IoU(as-is) === IoU(mirrored) for every clip and the gate reports a confident,
// meaningless "0/13 mirrored". Always confirm an anchor mask covers well under 100% of its frame.
function maskFromPng(file, mode) {
  const p = PNG.sync.read(fs.readFileSync(file));
  const { width: w, height: h, data } = p;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    mask[i] = mode === 'grey' ? (data[k] > ALPHA_MIN ? 1 : 0)
      : mode === 'green' ? (isGreen(data[k], data[k + 1], data[k + 2]) ? 0 : 1)
      : (data[k + 3] > ALPHA_MIN ? 1 : 0);
  }
  return { mask, w, h };
}

const coverage = (mask) => mask.reduce((n, v) => n + v, 0) / mask.length;

// --- per-character run --------------------------------------------------------------------------

// Ordered by trustworthiness of the silhouette, NOT by convenience:
//   *-anchor-still.png  = already keyed, real alpha            -> 'alpha'
//   *-anchor-green.png  = the plate the clips were generated from, keyable by chroma -> 'green'
//   *-anchor.png        = raw plate in an RGBA container, alpha is a LIE             -> 'green'
// `--still` anchors on public/assets/enemies/<id>.webp — the KEYED in-game cutout that the `faces:`
// field actually describes (it drives the HUD medallion and the select tile via isMirrored(def,'p1')).
// That makes it the right reference for "is this kit consistent with what the game shows", whereas the
// generation plate only answers "which plate was this clip generated from". pngjs cannot read webp, so
// it is transcoded to a temp png first.
function stillAnchor(id) {
  const src = path.join(ROOT, 'public/assets/enemies', `${id}.webp`);
  if (!fs.existsSync(src)) return null;
  const out = path.join(process.env.TEMP || '/tmp', `facing-still-${id}.png`);
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', src, out], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(out)) return null;
  return { path: out, mode: 'alpha' };
}

function anchorFor(id) {
  const explicit = opt('--anchor', null);
  if (explicit) {
    const p = path.isAbsolute(explicit) ? explicit : path.join(ROOT, explicit);
    return { path: p, mode: /green/.test(explicit) ? 'green' : 'alpha' };
  }
  if (has('--still')) {
    const s = stillAnchor(id);
    if (s) return s;
  }
  const cands = [
    [`qa-boss/proc/${id}-anchor-still.png`, 'alpha'],
    [`qa-boss/anchors/${id}-anchor-green.png`, 'green'],
    [`qa-boss/anchors/${id}-anchor.png`, 'green'],
    // The PADDED MK plates live in a subdirectory (added by pad-anchor-plate.mjs, phase 60) and this
    // resolver never learned about it — so every MK character was silently unevaluable. Caught by
    // `--all` reporting NOT EVALUATED for gargoyle-spear / lich-scythe / oni-tetsubo, all three of
    // which HAVE shipped clips. Today that is 3 characters; the moment the MK FINAL kits fire it
    // would have been all of them. No id exists in both directories, so this fallback is
    // unambiguous; the unpadded location stays FIRST so an original plate always wins.
    [`qa-boss/anchors/mk/${id}-anchor-green.png`, 'green'],
    [`qa-boss/anchors/mk/${id}-anchor.png`, 'green'],
  ];
  for (const [rel, mode] of cands) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) return { path: p, mode };
  }
  return null;
}

function run(id) {
  const anchor = anchorFor(id);
  if (!anchor) return { id, error: 'no anchor png found' };
  const anchorPath = anchor.path;

  const a = maskFromPng(anchorPath, anchor.mode);
  const cov = coverage(a.mask);
  // A silhouette that fills its whole frame is symmetric, which forces ratio===1 on every clip and
  // produces a confident false PASS. Refuse to run rather than emit that.
  if (cov > 0.95) {
    return { id, error: `anchor mask covers ${(cov * 100).toFixed(1)}% of frame (mode=${anchor.mode}) `
      + '— not a silhouette. Pick a keyed or green-plate anchor via --anchor.' };
  }
  const anchorSil = normalise(a.mask, a.w, a.h);
  if (!anchorSil) return { id, error: 'anchor silhouette empty (is it really keyed?)' };

  const dir = path.join(ROOT, 'public/assets/characters', id);
  if (!fs.existsSync(dir)) return { id, error: 'no shipped clip dir' };
  const clips = fs.readdirSync(dir).filter((f) => f.endsWith('.webm')).sort();

  const rows = [];
  for (const clip of clips) {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    // decoder flag BEFORE -i, or alpha is dropped and every silhouette is a rectangle
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-c:v', 'libvpx-vp9', '-i', path.join(dir, clip),
      '-vf', `alphaextract,scale=${SCALE}:-1`, '-frames:v', String(NFRAMES), '-vsync', '0',
      path.join(TMP, 'f_%03d.png')], { encoding: 'utf8' });
    if (r.status !== 0) { rows.push({ clip, error: (r.stderr || '').split('\n')[0] }); continue; }

    const frames = fs.readdirSync(TMP).filter((f) => f.endsWith('.png')).sort();
    const per = [];
    for (const fn of frames) {
      const c = maskFromPng(path.join(TMP, fn), 'grey');
      const sil = normalise(c.mask, c.w, c.h);
      if (!sil) continue;
      per.push({ asis: iou(anchorSil, sil), mirrored: iou(anchorSil, mirror(sil)) });
    }
    fs.rmSync(TMP, { recursive: true, force: true });
    if (!per.length) { rows.push({ clip, error: 'no non-empty frames' }); continue; }

    const med = (xs) => xs.slice().sort((p, q) => p - q)[Math.floor(xs.length / 2)];
    const asis = med(per.map((p) => p.asis));
    const mir = med(per.map((p) => p.mirrored));
    // Per-frame disagreement = the clip turns during the sampled window. Reported, never silently averaged.
    const votes = per.map((p) => (p.mirrored > p.asis ? 'M' : 'A')).join('');
    rows.push({
      clip, asis: +asis.toFixed(4), mirrored: +mir.toFixed(4),
      ratio: asis > 0 ? +(mir / asis).toFixed(3) : Infinity,
      verdict: mir > asis ? 'MIRRORED' : 'as-is',
      votes, unstable: new Set(votes).size > 1,
    });
  }
  return { id, anchor: path.relative(ROOT, anchorPath).replace(/\\/g, '/'), rows };
}

// --- report -------------------------------------------------------------------------------------

const results = ids.map(run);

if (has('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const res of results) {
    console.log(`\n=== ${res.id} ===`);
    if (res.error) { console.log(`  ERROR: ${res.error}`); continue; }
    console.log(`  anchor: ${res.anchor}`);
    const decl = declaredFaces(res.id);
    console.log(`  manifest faces: ${decl ?? '(not found)'}`);
    console.log(`  ${'clip'.padEnd(22)} ${'as-is'.padStart(7)} ${'mirror'.padStart(7)} ${'ratio'.padStart(7)}  verdict   frames`);
    for (const r of res.rows) {
      if (r.error) { console.log(`  ${r.clip.padEnd(22)} ERROR ${r.error}`); continue; }
      console.log(`  ${r.clip.padEnd(22)} ${String(r.asis).padStart(7)} ${String(r.mirrored).padStart(7)} ${String(r.ratio).padStart(7)}  ${r.verdict.padEnd(9)} ${r.votes}${r.unstable ? '  <- TURNS mid-window' : ''}`);
    }
    const ok = res.rows.filter((r) => !r.error);
    const mirrored = ok.filter((r) => r.verdict === 'MIRRORED');
    console.log(`  -> ${mirrored.length}/${ok.length} clips mirrored vs the anchor.`);
    if (mirrored.length && mirrored.length < ok.length) {
      console.log('     KIT IS INTERNALLY INCONSISTENT — some clips disagree with their own siblings.');
      console.log(`     as-is:    ${ok.filter((r) => r.verdict === 'as-is').map((r) => r.clip).join(', ')}`);
      console.log(`     mirrored: ${mirrored.map((r) => r.clip).join(', ')}`);
    }
  }
}

// ############################################################################################
// # EXIT CODE (phase 230; wording corrected phase 233). This script had no TERMINAL exit — it   #
// # carried exactly ONE process.exit, the usage guard at the top, and then fell off the end of  #
// # the file, so every completed run returned 0 unconditionally: on a missing anchor, on an     #
// # unreadable clip, and even when it printed its own alarm "KIT IS INTERNALLY INCONSISTENT".   #
// # A gate that cannot fail cannot gate, and in a chain (`check-facing && next`) it waved       #
// # everything through. (The first version of this comment said "NO process.exit at all", which #
// # an independent verifier refuted against git history — the usage guard was always there.)    #
// #                                                                                            #
// # Deliberately conservative: only the two conditions the script ALREADY treats as wrong get  #
// # a nonzero code. Uniform mirroring vs the anchor stays informational — the manifest's        #
// # `faces` field legitimately handles that, and inventing a failure there is a domain ruling   #
// # this script has no business making.                                                        #
// ############################################################################################
const notEvaluated = results.filter((r) => r.error);
const inconsistent = results.filter((r) => {
  if (r.error || !r.rows) return false;
  const ok = r.rows.filter((x) => !x.error);
  const m = ok.filter((x) => x.verdict === 'MIRRORED').length;
  return m > 0 && m < ok.length;
});
if (notEvaluated.length) {
  console.error(`\nNOT EVALUATED: ${notEvaluated.length} character(s) — ${notEvaluated.map((r) => `${r.id} (${r.error})`).join('; ')}`);
  console.error('This is NOT a pass.');
  process.exit(2);
}
if (inconsistent.length) {
  console.error(`\nFAIL: ${inconsistent.length} kit(s) internally inconsistent — ${inconsistent.map((r) => r.id).join(', ')}`);
  process.exit(1);
}
process.exit(0);

function declaredFaces(id) {
  const f = path.join(ROOT, 'src/characters', `${id}.ts`);
  if (!fs.existsSync(f)) return null;
  const m = fs.readFileSync(f, 'utf8').match(/^\s*faces:\s*'(left|right)'/m);
  return m ? m[1] : null;
}
