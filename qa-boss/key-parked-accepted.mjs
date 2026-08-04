// KEY THE PARKED ACCEPTED CLIPS (phase 182, 2026-08-01).
//
// Four clips were fired, QA'd and ACCEPTED in earlier phases and then never keyed or wired, so they
// were invisible to every "what is shipped" count. This keys them to VP9-alpha webm in a STAGING
// directory. It does NOT wire them into public/assets — produce, verify by eye, THEN wire.
//
// WHICH RAW IS THE ACCEPTED TAKE WAS MEASURED, NOT GUESSED. lich has strike-b / strike-b2 /
// strike-b3 on disk and the acceptance commits record only "v3". But those commits also record the
// per-version raw-anchor f0/fLast, which is a fingerprint:
//   strike_b commit 4314644:  v1 .900/.904   v2 .901/.904   v3 .903/.901 (ACCEPTED)
//   measured now:             -b  .900/.904  -b2 .901/.904  -b3 .903/.901   -> -b3 IS v3
//   strike_a commit d959d43:  v1 .904/.905   v2 .900/.902   v3 .902/.905 (ACCEPTED)
//   measured now:             -   .904/.905  -v2 .900/.902  -v3 .902/.905   -> -v3 IS v3
// Every fingerprint matched to four decimals. Wiring the wrong take is SILENT, so this mattered.
//
// NO HFLIP. Both characters' f0 was VIEWED at full size: gargoyle's snout and spear point
// screen-RIGHT, lich's skull and scythe point screen-RIGHT, both matching the roster faces:'right'
// convention. Same call the eclipse specials script had to make, same way — by looking.
//
// RECIPE = the eclipse family recipe of record (qa-boss/key-eclipse-specials-v2.mjs): stock keyer
// (its own 3px edge-band despill is built in) + green-neutralize HARD=32, then VP9 yuva420p.
// The --still is each character's OWN anchor plate, so the emitted cal stays on the kit's
// placement convention.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\/]+$/, '');
const OUT = `${ROOT}/qa-boss/staged`;

const JOBS = [
  { char: 'gargoyle-spear', out: 'idle',            raw: 'gargoyle-idle.mp4'  },
  { char: 'lich-scythe',    out: 'idle',            raw: 'lich-idle-v2.mp4'   },
  { char: 'lich-scythe',    out: 'attack-strike',   raw: 'lich-strike-v3.mp4' },
  { char: 'lich-scythe',    out: 'attack-strike-b', raw: 'lich-strike-b3.mp4' },
];

const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 4).join(' ')}\n${r.stderr || r.stdout}`);
  return r.stdout;
};

const summary = [];
for (const j of JOBS) {
  const still = `${ROOT}/qa-boss/anchors/mk/${j.char}-anchor-green.png`;
  if (!fs.existsSync(still)) throw new Error(`no anchor plate: ${still}`);
  const rawPath = `${ROOT}/qa-boss/raw/${j.raw}`;
  if (!fs.existsSync(rawPath)) throw new Error(`no raw: ${rawPath}`);

  const base = `${OUT}/${j.char}`;
  const fdir = `${base}/frames/${j.out}`;
  const kdir = `${base}/keyed/${j.out}`;
  fs.rmSync(fdir, { recursive: true, force: true });
  fs.rmSync(kdir, { recursive: true, force: true });
  fs.mkdirSync(fdir, { recursive: true });
  fs.mkdirSync(`${base}/webm`, { recursive: true });

  // 1. frames — NO -vf hflip (both characters verified facing screen-right, see header)
  sh('ffmpeg', ['-y', '-v', 'error', '-i', rawPath, `${fdir}/f_%03d.png`]);
  const frames = fs.readdirSync(fdir).sort();
  if (!frames.length) throw new Error(`decoded 0 frames from ${j.raw} — nothing was measured`);

  // 2. key (emits the cal) + green-neutralize
  const keyOut = sh('node', [`${ROOT}/scripts/key-idle-clips.mjs`, fdir, kdir, '--still', still]);
  sh('node', [`${ROOT}/scripts/green-neutralize.mjs`, kdir, '32']);

  const calPath = `${kdir}.cal.json`;
  const cal = fs.existsSync(calPath) ? JSON.parse(fs.readFileSync(calPath, 'utf8')) : null;
  const bbox = (keyOut.match(/bbox x\d+ y\d+ (\d+x\d+)/) || [])[1] || '?';

  // 3. encode VP9 alpha
  const kept = fs.readdirSync(kdir).filter((f) => f.endsWith('.png')).sort();
  if (!kept.length) throw new Error(`keyer produced 0 png for ${j.char}/${j.out}`);
  const start = Number(kept[0].match(/(\d+)/)[1]);
  const webm = `${base}/webm/${j.out}.webm`;
  sh('ffmpeg', ['-y', '-v', 'error', '-framerate', '24', '-start_number', String(start),
    '-i', `${kdir}/f_%03d.png`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-b:v', '0', '-crf', '30', '-an', webm]);

  const bytes = fs.statSync(webm).size;
  summary.push({ ...j, frames: frames.length, kept: kept.length, bbox, bytes, cal });
  console.log(`${j.char.padEnd(16)} ${j.out.padEnd(16)} raw=${j.raw.padEnd(20)} frames=${frames.length} kept=${kept.length} bbox=${bbox} ${(bytes / 1024).toFixed(0)}KB`);
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
console.log(`\nwrote ${OUT}/summary.json — STAGED ONLY, nothing wired into public/assets yet.`);
