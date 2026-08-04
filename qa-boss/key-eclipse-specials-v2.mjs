// ECLIPSE OFUDA — key the session-9 special re-rolls (phase 31, 2026-07-27).
//
// These two raws were fired in the browser on the BASE plate
// qa-boss/anchors/eclipse-ofuda-anchor-green.png (which faces screen-RIGHT — the '-r' plate is the
// LEFT-facing mirror despite its filename) with prompts commanding SCREEN-RIGHT. Both were VIEWED
// at full size: nose / hat brim / boot-toes point RIGHT, ponytail trails LEFT, matching the roster's
// faces:'right' convention. So unlike every earlier eclipse re-roll THERE IS NO HFLIP HERE.
//
// Recipe = her v1-KEEP pipeline: stock keyer + green-neutralize, NO green-despill (with despill on,
// her keeps re-key to IoU 0.972 instead of reproducing; the specials family is keyed without it).
// The --still reference is the same plate the whole shipped kit was calibrated against, so the
// emitted cal stays on the kit's placement convention. Control run before this one:
// `node qa-boss/flip-eclipse.mjs flip special_1` reproduced the shipped cal exactly.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\/]+$/, '');
const STILL = `${ROOT}/qa-boss/anchors/eclipse-ofuda-anchor-green-r.png`;
const OUT = `${ROOT}/qa-boss/flip-ec/sp-v2`;

const JOBS = [
  { slug: 'special_1', out: 'special', raw: 'eclipse-ofuda-special-1-v2.mp4' },
  { slug: 'special_3', out: 'special-c', raw: 'eclipse-ofuda-special-3-v2.mp4' },
];

const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr || r.stdout}`);
  return r.stdout;
};

fs.mkdirSync(`${OUT}/frames`, { recursive: true });
fs.mkdirSync(`${OUT}/keyed`, { recursive: true });
fs.mkdirSync(`${OUT}/webm`, { recursive: true });

const summary = [];
for (const j of JOBS) {
  const fdir = `${OUT}/frames/${j.slug}`;
  const kdir = `${OUT}/keyed/${j.slug}`;
  fs.rmSync(fdir, { recursive: true, force: true });
  fs.rmSync(kdir, { recursive: true, force: true });
  fs.mkdirSync(fdir, { recursive: true });

  // 1. frames — NO -vf hflip (see header)
  sh('ffmpeg', ['-y', '-v', 'error', '-i', `${ROOT}/qa-boss/raw/${j.raw}`, `${fdir}/f_%03d.png`]);
  const frames = fs.readdirSync(fdir).sort();

  // 2. key (emits the cal) + green-neutralize (HARD=32), no despill
  const keyOut = sh('node', [`${ROOT}/scripts/key-idle-clips.mjs`, '--still', STILL, fdir, kdir]);
  sh('node', [`${ROOT}/scripts/green-neutralize.mjs`, kdir, '32']);

  const cal = JSON.parse(fs.readFileSync(`${kdir}.cal.json`, 'utf8'));
  const bbox = (keyOut.match(/bbox x\d+ y\d+ (\d+x\d+)/) || [])[1];

  // 3. encode VP9 alpha
  const first = fs.readdirSync(kdir).filter((f) => f.endsWith('.png')).sort()[0];
  const start = Number(first.match(/(\d+)/)[1]);
  const webm = `${OUT}/webm/${j.out}.webm`;
  sh('ffmpeg', ['-y', '-v', 'error', '-framerate', '24', '-start_number', String(start),
    '-i', `${kdir}/f_%03d.png`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-b:v', '0', '-crf', '30', '-an', webm]);

  summary.push({ slug: j.slug, out: j.out, raw: j.raw, frames: frames.length, bbox, cal });
  console.log(`${j.out.padEnd(12)} raw=${j.raw.padEnd(34)} frames=${frames.length} bbox=${bbox} cal=${JSON.stringify(cal)}`);
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
console.log('\nwrote', `${OUT}/summary.json`);
