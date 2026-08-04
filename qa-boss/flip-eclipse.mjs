// ECLIPSE OFUDA facing normalisation (phase 29, 2026-07-27). Tim's ruling: the whole roster runs
// ONE convention, faces:'right'. Seven of eight bosses already do; eclipse was the lone 'left'.
// Her generation ANCHOR (qa-boss/anchors/eclipse-ofuda-anchor-green-r.png) faces screen-LEFT, so
// every clip generated off it faces LEFT and must be HFLIPPED at keying.
//
// Four clips (attack-block, attack-strike, ko, special-b) were flipped right->left in phase 28 and
// are RESTORED from 3a894ef instead of being flipped twice. The OTHER NINE are re-keyed here FROM
// RAW with `-vf hflip` at the FRAME level (never webm->webm, which costs a VP9 generation).
//
// Usage:
//   node qa-boss/flip-eclipse.mjs verify [slug...]   -- UNFLIPPED reproduction of the shipped clip
//   node qa-boss/flip-eclipse.mjs flip   [slug...]   -- the production hflipped build
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\/]+$/, '');
const STILL = `${ROOT}/qa-boss/anchors/eclipse-ofuda-anchor-green-r.png`;
const OUT = `${ROOT}/qa-boss/flip-ec`;

// shipped webm  <-  raw take of record.
// despill: the session-6 ENERGY re-rolls were keyed WITH green-despill; the v1 KEEPS
// (hit, special_1/2/3, ko) were keyed WITHOUT it (ledger fact, phase 28: with despill ko re-keys
// to IoU 0.972, without it bit-exact).
// feather: recorded in CROPPED frame space. Under an hflip rows are unchanged (top stays top) but
// columns mirror, so a LEFT band must become a RIGHT band in the flipped build.
const JOBS = [
  { slug: 'idle',      out: 'idle',            raw: 'eclipse-ofuda-idle-v4.mp4',        despill: true  },
  { slug: 'strike_b',  out: 'attack-strike-b', raw: 'eclipse-ofuda-strike-b-v4-169.mp4', despill: true },
  { slug: 'throw_a',   out: 'attack-throw',    raw: 'eclipse-ofuda-throw-a-v2.mp4',     despill: true  },
  { slug: 'throw_b',   out: 'attack-throw-b',  raw: 'eclipse-ofuda-throw-b-v3.mp4',     despill: true  },
  { slug: 'block_b',   out: 'attack-block-b',  raw: 'eclipse-ofuda-block-b-v3.mp4',     despill: true  },
  { slug: 'hit',       out: 'hit',             raw: 'eclipse-ofuda-hit.mp4',            despill: false },
  { slug: 'special_1', out: 'special',         raw: 'eclipse-ofuda-special_1.mp4',      despill: false },
  { slug: 'special_3', out: 'special-c',       raw: 'eclipse-ofuda-special_3.mp4',      despill: false },
  // victory_v2's feather is top+left 48px WHOLE CLIP (27 frames touched). left -> right under flip.
  { slug: 'victory',   out: 'victory',         raw: 'eclipse-ofuda-victory-v2.mp4',     despill: true,
    feather: { top: 48, left: 48 } },
];

const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr || r.stdout}`);
  return r.stdout;
};

const mode = process.argv[2];
if (mode !== 'verify' && mode !== 'flip') throw new Error('mode must be verify|flip');
const only = process.argv.slice(3);
const flip = mode === 'flip';
const tag = mode;

fs.mkdirSync(`${OUT}/${tag}/frames`, { recursive: true });
fs.mkdirSync(`${OUT}/${tag}/keyed`, { recursive: true });
fs.mkdirSync(`${OUT}/${tag}/webm`, { recursive: true });

const summary = [];
for (const j of JOBS) {
  if (only.length && !only.includes(j.slug)) continue;
  const fdir = `${OUT}/${tag}/frames/${j.slug}`;
  const kdir = `${OUT}/${tag}/keyed/${j.slug}`;
  fs.rmSync(fdir, { recursive: true, force: true });
  fs.rmSync(kdir, { recursive: true, force: true });
  fs.mkdirSync(fdir, { recursive: true });

  // 1. frames, with the hflip applied BEFORE the key on the production run
  const vf = flip ? ['-vf', 'hflip'] : [];
  sh('ffmpeg', ['-y', '-v', 'error', '-i', `${ROOT}/qa-boss/raw/${j.raw}`, ...vf, `${fdir}/f_%03d.png`]);
  const frames = fs.readdirSync(fdir).sort();

  // 2. key (emits the cal) + the green post-passes
  const keyOut = sh('node', [`${ROOT}/scripts/key-idle-clips.mjs`, '--still', STILL, fdir, kdir]);
  if (j.despill) sh('node', [`${ROOT}/scripts/green-despill.mjs`, kdir, '--margin', '14', '--keep', '0.08']);
  sh('node', [`${ROOT}/scripts/green-neutralize.mjs`, kdir, '32']);

  // 3. feather, mirrored left<->right on the flipped build
  let featherArgs = null;
  if (j.feather) {
    const s = j.feather;
    const f = {
      top: s.top || 0,
      bottom: s.bottom || 0,
      left: flip ? (s.right || 0) : (s.left || 0),
      right: flip ? (s.left || 0) : (s.right || 0),
    };
    featherArgs = Object.entries(f).filter(([, v]) => v > 0).flatMap(([k, v]) => [`--${k}`, String(v)]);
    sh('node', [`${ROOT}/scripts/edge-feather.mjs`, kdir, ...featherArgs]);
  }

  const cal = JSON.parse(fs.readFileSync(`${kdir}.cal.json`, 'utf8'));
  const bbox = (keyOut.match(/bbox x\d+ y\d+ (\d+x\d+)/) || [])[1];

  // 4. encode VP9 alpha
  const first = fs.readdirSync(kdir).filter((f) => f.endsWith('.png')).sort()[0];
  const start = Number(first.match(/(\d+)/)[1]);
  const webm = `${OUT}/${tag}/webm/${j.out}.webm`;
  sh('ffmpeg', ['-y', '-v', 'error', '-framerate', '24', '-start_number', String(start),
    '-i', `${kdir}/f_%03d.png`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-b:v', '0', '-crf', '30', '-an', webm]);

  summary.push({ slug: j.slug, out: j.out, raw: j.raw, frames: frames.length, bbox, cal, feather: featherArgs });
  console.log(`${j.out.padEnd(18)} raw=${j.raw.padEnd(34)} frames=${frames.length} bbox=${bbox} cal=${JSON.stringify(cal)}${featherArgs ? ' feather=' + featherArgs.join(' ') : ''}`);
}
fs.writeFileSync(`${OUT}/${tag}-summary.json`, JSON.stringify(summary, null, 2));
console.log('\nwrote', `${OUT}/${tag}-summary.json`);
