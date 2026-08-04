// LADY KUROTACHI facing fix (2026-07-27). 11 of her 13 shipped clips were generated from
// qa-boss/anchors/lady-kurotachi-anchor-green-r.png (the MIRRORED plate) while idle/ko + the still
// came from the non-`-r` plate, so 11 clips face screen-LEFT against a manifest that says
// faces:'right'. Fix = HFLIP the 11 at the FRAME level and RE-KEY from raw (no generation loss),
// so the pink-safe green keyer re-emits each clip's cal itself (cal.left is NOT flip-invariant —
// see the report).
//
// Usage: node qa-boss/flip-lk.mjs [only-key]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const STILL = `${ROOT}/qa-boss/proc/lk-anchor-still.png`;

// shipped webm  <-  raw take (the PRIMARY take of record)  |  existing keyed dir for a dim cross-check
const JOBS = [
  { out: 'attack-block',    slug: 'block_a',   raw: 'lady-kurotachi-block-a-v2.mp4',        ref: 'lady-kurotachi-block_a' },
  { out: 'attack-block-b',  slug: 'block_b',   raw: 'lady-kurotachi-block-b.mp4',           ref: 'lady-kurotachi-block_b' },
  { out: 'attack-strike',   slug: 'strike_a',  raw: 'lady-kurotachi-strike-a-v2-energy.mp4',ref: 'lady-kurotachi-strike_a' },
  { out: 'attack-strike-b', slug: 'strike_b',  raw: 'lady-kurotachi-strike-b-v3.mp4',       ref: 'lady-kurotachi-strike_b_v3' },
  { out: 'attack-throw',    slug: 'throw_a',   raw: 'lady-kurotachi-throw-a-v2-energy.mp4', ref: 'lady-kurotachi-throw_a' },
  { out: 'attack-throw-b',  slug: 'throw_b',   raw: 'lady-kurotachi-throw-b.mp4',           ref: 'lady-kurotachi-throw_b' },
  { out: 'hit',             slug: 'hit',       raw: 'lady-kurotachi-hit-v2.mp4',            ref: 'lady-kurotachi-hit', trim: 10 },
  { out: 'special',         slug: 'special_1', raw: 'lady-kurotachi-special-1-v3.mp4',      ref: 'lady-kurotachi-special_1' },
  { out: 'special-b',       slug: 'special_2', raw: 'lady-kurotachi-special-2.mp4',         ref: 'lady-kurotachi-special_2' },
  { out: 'special-c',       slug: 'special_3', raw: 'lady-kurotachi-special-3-v2.mp4',      ref: 'lady-kurotachi-special_3' },
  { out: 'victory',         slug: 'victory',   raw: 'lady-kurotachi-victory.mp4',           ref: 'lady-kurotachi-victory' },
];

const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr || r.stdout}`);
  return r.stdout;
};

const FLIP = `${ROOT}/qa-boss/flip`;
fs.mkdirSync(`${FLIP}/frames`, { recursive: true });
fs.mkdirSync(`${FLIP}/keyed`, { recursive: true });
fs.mkdirSync(`${FLIP}/webm`, { recursive: true });

const summary = [];
for (const j of JOBS) {
  const fdir = `${FLIP}/frames/${j.slug}`;
  const kdir = `${FLIP}/keyed/${j.slug}`;
  fs.rmSync(fdir, { recursive: true, force: true });
  fs.rmSync(kdir, { recursive: true, force: true });
  fs.mkdirSync(fdir, { recursive: true });

  // 1. extract frames with the HFLIP applied at the frame level (before any keying/encode)
  sh('ffmpeg', ['-y', '-v', 'error', '-i', `${ROOT}/qa-boss/raw/${j.raw}`, '-vf', 'hflip', `${fdir}/f_%03d.png`]);
  let frames = fs.readdirSync(fdir).sort();
  // 2. preserve the head-trim of the take of record (hit drops f_001-f_010: a phantom bolt lives there)
  if (j.trim) {
    for (const f of frames.slice(0, j.trim)) fs.rmSync(path.join(fdir, f));
    frames = fs.readdirSync(fdir).sort();
  }

  // 3. pink-safe GREEN key (emits the cal) + the two green post-passes
  const keyOut = sh('node', [`${ROOT}/scripts/key-clips-green-pinksafe.mjs`, '--still', STILL, fdir, kdir]);
  sh('node', [`${ROOT}/scripts/green-despill.mjs`, kdir]);
  sh('node', [`${ROOT}/scripts/green-neutralize.mjs`, kdir, '32']);

  const cal = JSON.parse(fs.readFileSync(`${kdir}.cal.json`, 'utf8'));
  const bbox = (keyOut.match(/bbox x\d+ y\d+ (\d+x\d+)/) || [])[1];

  // 4. encode VP9 alpha
  const first = fs.readdirSync(kdir).sort()[0];
  const start = Number(first.match(/(\d+)/)[1]);
  const webm = `${FLIP}/webm/${j.out}.webm`;
  sh('ffmpeg', ['-y', '-v', 'error', '-framerate', '24', '-start_number', String(start),
    '-i', `${kdir}/f_%03d.png`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-b:v', '0', '-crf', '30', '-an', webm]);

  summary.push({ out: j.out, raw: j.raw, frames: frames.length, bbox, cal });
  console.log(`${j.out.padEnd(18)} raw=${j.raw.padEnd(40)} frames=${frames.length} bbox=${bbox} cal=${JSON.stringify(cal)}`);
}
fs.writeFileSync(`${FLIP}/summary.json`, JSON.stringify(summary, null, 2));
console.log('\nwrote', `${FLIP}/summary.json`);
