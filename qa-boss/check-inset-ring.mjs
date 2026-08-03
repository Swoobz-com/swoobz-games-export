// check-inset-ring.mjs — THE INSET-RING FEATHER GATE for keyed alpha webms.
//
// WHY THIS EXISTS. `~/.claude/skills/character-clip-qa/SKILL.md` mandates this gate and the repo
// never had it — only `scripts/radial-feather.mjs`, which is the FIX. So the defect it catches has
// only ever been found by eye (Tim spotting it in a recording; a phase-236 agent spotting it on
// ir56's shipped attack-throw).
//
// THE DEFECT. A generated effect (flame, arc, trail) runs off the SOURCE frame. The clip's own
// border is NOT the screen border — the clip is composited mid-stage — so the cut floats in open
// air as a hard-edged slab. A later re-encode (any second-pass tool that decodes+re-encodes)
// can also CRUSH an existing 48px feather down to a few px, turning a fixed clip back into a cut.
//
// WHY NOT AN EDGE-TOUCH SCAN. The outermost-pixel test LIES after a re-encode: this project's
// specials read edge alpha 0 while alpha hit 255 just 10px in. So measure INSET RINGS, not the
// border: max alpha on the lines 2/10/25/49/80px in from each edge. Per the skill,
// 255 inside ~15px = CUT; a healthy wide feather ramps ~1/30/128/236/255 across 10-130px.
//
// THE DISCRIMINATOR THAT MAKES THIS ACTIONABLE. Max alpha alone cannot separate the two things
// that put opaque pixels near a border:
//   a RAZOR CUT  = a long CONTIGUOUS run of opaque pixels along the line (content sliced flat), and
//   a PROP TIP   = a short run (a weapon crossing the edge) — a known, accepted, feather-able case.
// So we also report the LONGEST RUN of alpha>=250 on each inset line, and its frame. Run length is
// what tells a sliced flame from a sword point.
//
// This tool MEASURES ONLY. It never writes a clip. Numbers convict; the eye judges — VIEW the
// peak frame of anything it flags before acting (that is the standing rule for this defect class).
//
// USAGE
//   node qa-boss/check-inset-ring.mjs <file.webm> [...]
//   node qa-boss/check-inset-ring.mjs --all          # every shipped clip, excluding /old/
//   node qa-boss/check-inset-ring.mjs --all --json    # machine-readable
//
// EXIT CODES (a gate that cannot fail cannot gate)
//   0 = every evaluated clip clean · 1 = at least one CUT · 2 = nothing could be evaluated

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const INSETS = [2, 10, 25, 49, 80];
const OPAQUE = 250;      // "essentially opaque" — the skill's 255-with-codec-slack
const CUT_INSET = 2;     // judge at the BORDER: opaque here means there is no feather at all

// TIERS, and the honest basis for each (measured over all 118 shipped clips, phase 239).
//
// `i2 max alpha` came back PERFECTLY BIMODAL: 47 clips at 255, 71 clips at 0-24, and ZERO clips
// anywhere between 25 and 249. So "has an edge feather" is a BINARY property of the encode, not a
// spectrum — 40% of the shipped corpus has none. That split needs no threshold; it is in the data.
//
// Whether a missing feather is VISIBLE depends on how much content sits on that border, which is
// what the contiguous RUN measures. Runs among those 47 span 3px to 480px.
//
// CUT_RUN = 100 is set BELOW the lowest run I confirmed by eye (134), for margin — not fitted to a
// gap. Confirmed visible razor cuts, composited over dark and viewed at full size:
//     thorn-warden/attack-block   RIGHT run 314  impact bloom + club thorns sliced flat
//     lady-kurotachi/attack-strike TOP  run 246  slash arc amputated by a flat horizontal line
//     ir56-lion-serpent/attack-throw RIGHT run 134  fire-breath plume cut mid-flame
// ⚠ NOTHING BELOW run 134 HAS BEEN VIEWED. The CUT/WATCH boundary is therefore UNVALIDATED in
// 100-133, and the WATCH tier is a to-look-at list, NOT a verdict. Do not report WATCH as a defect
// count without viewing.
const CUT_RUN = 100;
const CHAR_ROOT = 'public/assets/characters';

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
let files = args.filter((a) => !a.startsWith('--'));

if (args.includes('--all')) {
  for (const d of fs.readdirSync(CHAR_ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(CHAR_ROOT, d.name);
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.webm')) files.push(path.join(dir, f));
    }
  }
}
if (!files.length) {
  console.error('usage: node qa-boss/check-inset-ring.mjs <file.webm>... | --all [--json]');
  process.exit(2);
}

function probe(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_read_packets',
    '-count_packets', '-of', 'csv=p=0', file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const [w, h, n] = r.stdout.trim().split(',').map(Number);
  return Number.isFinite(w) && Number.isFinite(h) ? { w, h, packets: n || 0 } : null;
}

/** Longest run of value>=OPAQUE, and the max, over an array of alpha samples. */
function scanLine(get, len) {
  let max = 0, run = 0, best = 0;
  for (let i = 0; i < len; i++) {
    const v = get(i);
    if (v > max) max = v;
    if (v >= OPAQUE) { run++; if (run > best) best = run; } else run = 0;
  }
  return { max, run: best };
}

const results = [];
let evaluated = 0, cuts = 0, watches = 0;

for (const file of files) {
  if (!fs.existsSync(file)) { results.push({ file, error: 'missing' }); continue; }
  const meta = probe(file);
  if (!meta) { results.push({ file, error: 'unreadable' }); continue; }
  const { w, h } = meta;

  // Decode the ALPHA plane only, as raw gray8.
  // `-c:v libvpx-vp9` IS LOAD-BEARING AND MUST STAY. VP9 alpha rides in an out-of-band track, so
  // ffprobe reports pix_fmt yuv420p and the DEFAULT decoder silently drops alpha — alphaextract
  // then fails on every clip. That failure is uniform, which is the tell: a 100% result in either
  // direction is an instrument error, not a finding. (Same trap the project already banked as
  // "do NOT test alpha via pix_fmt", which once flagged 119 of 119 healthy clips as broken.)
  const dec = spawnSync('ffmpeg', [
    '-v', 'error', '-c:v', 'libvpx-vp9', '-i', file,
    '-vf', 'alphaextract,format=gray',
    '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
  ], { maxBuffer: 1 << 30, encoding: 'buffer' });
  if (dec.status !== 0 || !dec.stdout || dec.stdout.length < w * h) {
    results.push({ file, error: 'alpha decode failed (no alpha track?)' });
    continue;
  }
  const buf = dec.stdout;
  const frameSize = w * h;
  const frames = Math.floor(buf.length / frameSize);
  if (!frames) { results.push({ file, error: 'zero frames decoded' }); continue; }

  // Per-inset, PER-EDGE aggregate across ALL frames: max alpha, longest opaque run, peak frame.
  // Per-edge matters because the BOTTOM edge is a legitimate special case (below).
  const agg = INSETS.map(() => ({
    TOP: { max: 0, run: 0, frame: -1 }, BOT: { max: 0, run: 0, frame: -1 },
    LEFT: { max: 0, run: 0, frame: -1 }, RIGHT: { max: 0, run: 0, frame: -1 },
  }));

  for (let f = 0; f < frames; f++) {
    const off = f * frameSize;
    for (let ii = 0; ii < INSETS.length; ii++) {
      const d = INSETS[ii];
      if (d * 2 >= Math.min(w, h)) continue;   // inset does not fit this clip
      const lines = [
        ['TOP', (i) => buf[off + d * w + i], w],
        ['BOT', (i) => buf[off + (h - 1 - d) * w + i], w],
        ['LEFT', (i) => buf[off + i * w + d], h],
        ['RIGHT', (i) => buf[off + i * w + (w - 1 - d)], h],
      ];
      for (const [name, get, len] of lines) {
        const s = scanLine(get, len);
        const A = agg[ii][name];
        if (s.max > A.max) A.max = s.max;
        if (s.run > A.run) { A.run = s.run; A.frame = f; }
      }
    }
  }

  // THE BOTTOM EDGE IS FREE — and the negative controls proved it must be.
  // These clips are union-bbox cropped, so a standing character's FEET sit exactly on the bottom
  // border. Judging BOT flagged every clean idle in the calibration set (eclipse/hollow-pale/
  // lady-kurotachi all "CUT BOT @f0-1", run 54-58 = the soles). `check-containment` already
  // exempts feet-on-floor contact for the same reason. So BOT is MEASURED AND PRINTED but never
  // convicts. A genuine effect sliced along the bottom would therefore be missed — that is a
  // deliberate false-negative, taken because the alternative is a gate that flags 100% of clips
  // and gets ignored.
  const JUDGED_EDGES = ['TOP', 'LEFT', 'RIGHT'];
  const cutRing = agg[INSETS.indexOf(CUT_INSET)];
  let worst = { edge: '-', max: 0, run: 0, frame: -1 };
  for (const e of JUDGED_EDGES) {
    if (cutRing[e].run > worst.run) worst = { edge: e, ...cutRing[e] };
  }
  const noFeather = worst.max >= OPAQUE;              // binary: opaque AT the border
  const isCut = noFeather && worst.run >= CUT_RUN;    // and enough of it to read as a wall
  const isWatch = noFeather && !isCut;
  evaluated++;
  if (isCut) cuts++;
  if (isWatch) watches++;
  // Per ring, report the worst JUDGED edge (what convicts) and BOT separately (context only).
  const rings = INSETS.map((d, i) => {
    let jw = { edge: '-', max: 0, run: 0, frame: -1 };
    for (const e of JUDGED_EDGES) {
      if (agg[i][e].max > jw.max) jw.max = agg[i][e].max;
      if (agg[i][e].run > jw.run) { jw.run = agg[i][e].run; jw.edge = e; jw.frame = agg[i][e].frame; }
    }
    return { inset: d, judged: jw, bot: agg[i].BOT };
  });
  results.push({ file, w, h, frames, rings, worst, cut: isCut, watch: isWatch, noFeather });
}

results.sort((a, b) => (b.worst?.run ?? -1) - (a.worst?.run ?? -1));

if (JSON_OUT) {
  console.log(JSON.stringify({ evaluated, cuts, watches, results }, null, 1));
} else {
  console.log('=== INSET-RING FEATHER GATE ===');
  console.log(`opaque>=${OPAQUE} · CUT = inset ${CUT_INSET}px reaches opaque AND runs >=${CUT_RUN}px contiguous\n`);
  console.log('BOT is excluded from the verdict (feet on the floor line) — printed for context.\n');
  console.log('clip'.padEnd(44) + 'dims'.padEnd(10) + INSETS.map((d) => `i${d}`.padEnd(10)).join('') + 'bot(i10)'.padEnd(11) + 'verdict');
  for (const r of results) {
    const name = r.file.split(/[\\/]/).slice(-2).join('/');
    if (r.error) { console.log(name.padEnd(44) + `ERROR: ${r.error}`); continue; }
    const cells = r.rings.map((g) => `${g.judged.max}/${g.judged.run}`.padEnd(10)).join('');
    const b = r.rings[INSETS.indexOf(CUT_INSET)].bot;
    const v = r.cut ? `CUT   ${r.worst.edge} run${r.worst.run} @f${r.worst.frame}`
      : r.watch ? `watch ${r.worst.edge} run${r.worst.run} @f${r.worst.frame}` : 'clean';
    console.log(name.padEnd(44) + `${r.w}x${r.h}`.padEnd(10) + cells + `${b.max}/${b.run}`.padEnd(11) + v);
  }
  const errs = results.filter((r) => r.error);
  console.log(`\ncells are MAXALPHA/LONGESTRUN on the worst JUDGED edge (TOP/LEFT/RIGHT) at that inset, over ALL frames.`);
  console.log(`evaluated ${evaluated} of ${results.length}   CUT ${cuts}   watch ${watches}   ` +
    `no-feather-at-border ${cuts + watches}   errors ${errs.length}`);
  if (errs.length) for (const e of errs) console.log(`  unevaluated: ${e.file} — ${e.error}`);
  console.log('\nA flag is not a verdict — VIEW the named frame at full size before acting.');
  console.log('WATCH is a to-look-at list, not a defect count: the CUT boundary is eye-confirmed');
  console.log('only down to run 134. Do not quote `watch` as a number of broken clips.');
}

if (!evaluated) process.exit(2);
process.exit(cuts ? 1 : 0);
