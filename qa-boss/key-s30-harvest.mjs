// KEY THE 35 SESSION-29 CLIPS harvested in session 30.
//
// STAGING ONLY. Writes nothing under public/assets — produce, verify by eye, THEN wire.
// Output tree: qa-boss/staged-s30/<char>/{frames,keyed}/<state> and .../webm/<state>.webm
//
// A BARE RUN IS A NO-OP THAT EXITS 1 (repo law §0.4 — no repo .mjs may do work with no argv).
//   Usage: node qa-boss/key-s30-harvest.mjs --char <id> [--state <state>] [--dry]
//
// RECIPE — the post-pass was DECIDED BY MEASUREMENT, not by picking a side in a documented
// three-way disagreement. The sources conflicted:
//   * key-parked-accepted.mjs + commit 7d3002e (gargoyle/lich, phase 182): green-neutralize 32
//   * HANDOFF:3083-3086 (phase 45, THREE DAYS EARLIER) + FIRE-PLAN.md:432-436 + oni-tetsubo.ts:15:
//     green-neutralize <dir> 4 — "at 32 it leaves 7% of pixels at exactly r==g, which renders as
//     sickly OLIVE; I shipped special_1 that way [and] only caught it at 3x zoom"
//   * FIRE-PLAN.md (annotation on that same block): "green-neutralize is DESTRUCTIVE and has a
//     non-destructive equal this file never mentions ... Prefer despill; reach for neutralize only
//     if despill leaves plate residue."
// MEASURED on gargoyle-spear attack_strike, 97 frames, native res, all three on identical copies
// of the SAME keyer output (qa-boss/check-plate-retention.mjs --plate green):
//   keyer only          plate 4.94%  WATCH   opaquePx 15,369,390   (a post-pass IS required)
//   green-despill       plate 0.00%  clean   opaquePx 15,369,390   0 px deleted   <-- WINNER
//   green-neutralize 4  plate 0.00%  clean   opaquePx 14,074,951   1,294,439 px deleted (-8.4%)
//   green-neutralize 32 plate 0.00%  clean   opaquePx 14,471,481   897,909 px deleted (-5.8%)
// despill reaches the IDENTICAL 0.00% clean verdict while deleting ZERO pixels and keeping the
// feather intact. It strictly dominates both neutralize settings, so the 4-vs-32 dispute is moot
// for this batch. olive% was 0.00 for all three here (gargoyle is grey stone; the olive defect bit
// ir48's GOLD TRIM), so 32's known olive risk simply did not arise — despill wins on deletion cost.
// FALLBACK, not an assumption: if despill leaves a clip in WATCH/BAD, that clip escalates to
// green-neutralize 4 (the pipeline-of-record value, NOT 32) and is recorded as an exception.
//
//   gargoyle-spear / lich-scythe / oni-tetsubo / thorn-warden  green   stock keyer + green-despill
//   ir56-lion-serpent                                        MAGENTA  stock keyer + magenta-neutralize
//
// ⚠ ir56 is the ONLY magenta plate here. The green-family tools must never touch it. In particular
// FIRE-PLAN.md:416-419: "cut-bloom-plate deleted 28.06% of ir56's visible pixels — its entire green
// armour — and exited 0 ... Do not run it on ir56." cut-bloom-plate is therefore NOT in any chain
// below; it is only reached if a measured residue demands it, and never for ir56.
// key-clips-green-pinksafe.mjs must never touch ANY of these five — it is the tool carrying the
// silent orange/warm greyscale defect (TOOLCHAIN-AUDIT.md:83-85), and no character in this batch
// has a pinksafe precedent.
//
// ⚠ NO HFLIP. All five kits were generated natively FACING SCREEN-RIGHT (SESSION29-FIRE-LEDGER.md),
// matching the roster faces:'right' convention. Per the standoff-clip-facing law this is VERIFIED
// per clip by looking at f0, not assumed — see the facing column in the run report.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[/]+$/, '');
const OUT = `${ROOT}/qa-boss/staged-s30`;
const MANIFEST = `${ROOT}/qa-boss/SESSION30-HARVEST-MANIFEST.tsv`;

const RECIPE = {
  'gargoyle-spear':    { plate: 'qa-boss/anchors/mk/gargoyle-spear-anchor-green.png', chroma: 'green',   post: [['green-despill']] },
  'lich-scythe':       { plate: 'qa-boss/anchors/mk/lich-scythe-anchor-green.png',    chroma: 'green',   post: [['green-despill']] },
  'oni-tetsubo':       { plate: 'qa-boss/anchors/mk/oni-tetsubo-anchor-green.png',    chroma: 'green',   post: [['green-despill']] },
  'thorn-warden':      { plate: 'qa-boss/anchors/thorn-warden-anchor-green.png',      chroma: 'green',   post: [['green-despill']] },
  'ir56-lion-serpent': { plate: 'qa-boss/anchors/ir56-lion-serpent-anchor.png',       chroma: 'magenta', post: [['magenta-neutralize']] },
};
// Escalation when despill leaves residue — the pipeline-of-record value, never 32.
const ESCALATE = ['green-neutralize', '4'];

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const char = flag('--char');
const onlyState = flag('--state');
const dry = argv.includes('--dry');

if (!char || !RECIPE[char]) {
  console.error('usage: node qa-boss/key-s30-harvest.mjs --char <id> [--state <state>] [--dry]');
  console.error(`  --char must be one of: ${Object.keys(RECIPE).join(', ')}`);
  process.exit(1);
}

const rows = fs.readFileSync(MANIFEST, 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [c, state, stem, beat] = l.split('\t'); return { c, state, stem, beat }; })
  .filter((r) => r.c === char && (!onlyState || r.state === onlyState));

if (!rows.length) {
  console.error(`no manifest rows for --char ${char}${onlyState ? ` --state ${onlyState}` : ''}`);
  process.exit(1);
}

const rec = RECIPE[char];
const still = `${ROOT}/${rec.plate}`;
if (!fs.existsSync(still)) throw new Error(`no anchor plate: ${still}`);

const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 4).join(' ')} -> exit ${r.status}\n${r.stderr || r.stdout}`);
  return r.stdout;
};

console.log(`char=${char} chroma=${rec.chroma} plate=${rec.plate}`);
console.log(`post=${rec.post.map((p) => p.join(' ')).join(' -> ') || '(none)'}  clips=${rows.length}${dry ? '  [DRY]' : ''}`);
if (dry) { rows.forEach((r) => console.log(`  would key ${r.c}-${r.state}  <- ${r.beat}`)); process.exit(0); }

const summary = [];
const failures = [];
for (const j of rows) {
 try {
  const rawPath = `${ROOT}/qa-boss/raw/${j.c}-${j.state}.mp4`;
  if (!fs.existsSync(rawPath)) throw new Error(`no raw: ${rawPath}`);

  const base = `${OUT}/${j.c}`;
  const fdir = `${base}/frames/${j.state}`;
  const kdir = `${base}/keyed/${j.state}`;
  fs.rmSync(fdir, { recursive: true, force: true });
  fs.rmSync(kdir, { recursive: true, force: true });
  fs.mkdirSync(fdir, { recursive: true });
  fs.mkdirSync(`${base}/webm`, { recursive: true });

  // 1. frames — NO hflip (see header)
  sh('ffmpeg', ['-y', '-v', 'error', '-i', rawPath, `${fdir}/f_%03d.png`]);
  const frames = fs.readdirSync(fdir).sort();
  if (!frames.length) throw new Error(`decoded 0 frames from ${rawPath} — nothing was measured`);

  // 2. stock keyer (emits the cal)
  const keyOut = sh('node', [`${ROOT}/scripts/key-idle-clips.mjs`, fdir, kdir, '--still', still]);

  // 2a. plate retention BEFORE any post-pass — FIRE-PLAN.md:432 calls this "the real check",
  //     because after green-neutralize g<=max(r,b) by construction and the number is a
  //     tautological 0.00%. Measured, recorded, never skipped.
  const retention = (dir) => {
    const r = spawnSync('node', [`${ROOT}/qa-boss/check-plate-retention.mjs`, '--plate', rec.chroma, dir],
      { encoding: 'utf8' });
    const m = (r.stdout || '').match(/full\s+([\d.]+)\s+([\d.]+)\s+(\d+)/);
    return { plate: m ? Number(m[1]) : null, olive: m ? Number(m[2]) : null, opaque: m ? Number(m[3]) : null, exit: r.status };
  };
  const before = retention(kdir);

  // 2b. this character's post-pass, then RE-MEASURE. Escalate only on measured residue.
  for (const [tool, ...args] of rec.post) sh('node', [`${ROOT}/scripts/${tool}.mjs`, kdir, ...args]);
  let after = retention(kdir);
  let escalated = false;
  if (after.plate !== null && after.plate >= 1) {
    escalated = true;
    sh('node', [`${ROOT}/scripts/${ESCALATE[0]}.mjs`, kdir, ...ESCALATE.slice(1)]);
    after = retention(kdir);
  }

  const bbox = (keyOut.match(/bbox x\d+ y\d+ (\d+x\d+)/) || [])[1] || '?';

  // 3. encode VP9 alpha. -auto-alt-ref 0 is REQUIRED for yuva420p — it is in ir56's recorded
  //    encode line and in FIRE-PLAN.md:434; without it VP9's alt-ref frames corrupt the alpha plane.
  const kept = fs.readdirSync(kdir).filter((f) => f.endsWith('.png')).sort();
  if (!kept.length) throw new Error(`keyer produced 0 png for ${j.c}/${j.state}`);
  const start = Number(kept[0].match(/(\d+)/)[1]);
  const webm = `${base}/webm/${j.state}.webm`;
  sh('ffmpeg', ['-y', '-v', 'error', '-framerate', '24', '-start_number', String(start),
    '-i', `${kdir}/f_%03d.png`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-b:v', '0', '-crf', '30', '-auto-alt-ref', '0', '-an', webm]);

  // 4. RE-DERIVE the cal off the FINAL frames. The keyer emits its cal at KEY time, before the
  //    post-pass; any pass that moves the alpha bbox makes the emitted value stale by construction
  //    (oni-tetsubo.ts:21-24). Drift > 0.20 => the re-derived value is the one to wire.
  const calPath = `${kdir}.cal.json`;
  const emitted = fs.existsSync(calPath) ? JSON.parse(fs.readFileSync(calPath, 'utf8')) : null;
  let cal = emitted;
  let drift = null;
  const rd = spawnSync('node', [`${ROOT}/qa-boss/rederive-cal.mjs`, kdir, still,
    ...(emitted ? ['--emitted', JSON.stringify(emitted)] : [])], { encoding: 'utf8' });
  const rdj = (rd.stdout || '').match(/\{[\s\S]*\}/);
  if (rdj) {
    try {
      const o = JSON.parse(rdj[0]);
      if (o.rederived) { cal = o.rederived; drift = o.drift ?? null; }
    } catch { /* keep emitted; the drift column will read null and say so */ }
  }

  const bytes = fs.statSync(webm).size;
  summary.push({ ...j, frames: frames.length, kept: kept.length, bbox, bytes,
    plateBefore: before.plate, plateAfter: after.plate, oliveAfter: after.olive,
    opaqueBefore: before.opaque, opaqueAfter: after.opaque, escalated, cal, emittedCal: emitted, calDrift: drift });
  console.log(`  ${j.state.padEnd(18)} bbox=${String(bbox).padEnd(9)} plate ${String(before.plate).padStart(5)}%->${String(after.plate).padStart(5)}%${escalated ? ' ESC' : '   '} olive=${after.olive}% drift=${drift ?? 'n/a'} ${(bytes / 1024).toFixed(0)}KB`);
 } catch (e) {
  // A clip that REFUSES must not abort its siblings — that is how one bad clip hid the
  // other two specials of this character for a whole cycle. Record it, keep going, and
  // make the run exit non-zero at the end so the failure can never read as success.
  const first = String(e.message).split('\n').filter(Boolean).slice(0, 3).join(' | ');
  failures.push({ state: j.state, beat: j.beat, error: first });
  console.log(`  ${j.state.padEnd(18)} ⛔ REFUSED — ${first.slice(0, 150)}`);
 }
}
fs.mkdirSync(OUT, { recursive: true });
const sumPath = `${OUT}/${char}.summary.json`;
fs.writeFileSync(sumPath, JSON.stringify({ ok: summary, failed: failures }, null, 2));
console.log(`\nwrote ${sumPath} — STAGED ONLY, nothing wired into public/assets.`);
console.log(`${summary.length} keyed, ${failures.length} refused.`);
if (failures.length) {
  console.log('REFUSED:');
  for (const f of failures) console.log(`  ${f.state}  (${f.beat})`);
  process.exit(1);
}
