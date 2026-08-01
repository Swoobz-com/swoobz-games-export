#!/usr/bin/env node
// ############################################################################################
// # FIRE QUEUE — what is actually left to fire, DERIVED, never hand-maintained (phase 173).   #
// #                                                                                          #
// # After 173 phases there was no ledger. "Which states are already shipped?" was answerable  #
// # only by reading git log or listing webm files by hand, so every session re-derived it and #
// # the answer drifted. A hand-written ledger would drift too. This derives it from the two   #
// # sources that cannot lie:                                                                  #
// #                                                                                          #
// #   SUPPLY  = states that BUILD via build-prompt.mjs    (what can actually be fired)        #
// #   SHIPPED = public/assets/characters/<char>/<state>.webm   (what is wired)                #
// #                                                                                          #
// # QUEUE = SUPPLY - SHIPPED. Run it any time; it is always current.                          #
// #                                                                                          #
// # ⚠ IT SHELLS OUT TO build-prompt.mjs AND DOES NOT PARSE THE MARKDOWN ITSELF. My first      #
// # version did parse it, with `/^##\s+([a-z][a-z0-9_]*)\s*$/` — and reported SUPPLY 26 across #
// # 30 kits (under one state per kit, when one kit has thirteen). Three separate reasons, all  #
// # of them documented in build-prompt.mjs and none of them guessable:                        #
// #   · headings carry trailing prose — "## attack_strike A  (falling crush of the head)"     #
// #   · a B-take is spelled "## attack_strike B", space + capital, NOT "_b"                   #
// #   · "## <state> ... RESULT/REJECTED/SUPERSEDED" sections are dead history, not supply,     #
// #     and analysis blocks must be disqualified by their body's telemetry tells              #
// # Re-implementing that rule set would have produced a second, silently-diverging parser.     #
// # Buildability is also a STRICTER test than a heading: a state with a heading that does not  #
// # build is not supply, and this counts it correctly as absent.                              #
// #                                                                                          #
// # It reports its own denominators because a ledger that says "0 remaining" after reading 0   #
// # kits is the vacuous-pass bug wearing a ledger's clothes.                                   #
// #                                                                                          #
// # usage: node qa-boss/fire-queue.mjs [--full]                                               #
// ############################################################################################
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PROMPTS = 'qa-boss/prompts';
const WIRED = 'public/assets/characters';
const full = process.argv.includes('--full');

// The canonical engine state set, mapped KIT NAME -> WIRED FILENAME. These differ and the difference
// is not guessable: the kits use underscores (`attack_strike_b`) while the wired clips use HYPHENS
// (`attack-strike-b.webm`), and the three specials are wired as `special` / `special-b` / `special-c`,
// NOT `special_1..3`. Matching kit ids against filenames directly reported SHIPPED 34 against 113
// real webm files, and showed fully-wired characters as barely started.
const STATES = [
  ['idle', 'idle'],
  ['attack_strike', 'attack-strike'],
  ['attack_strike_b', 'attack-strike-b'],
  ['attack_throw', 'attack-throw'],
  ['attack_throw_b', 'attack-throw-b'],
  ['attack_block', 'attack-block'],
  ['attack_block_b', 'attack-block-b'],
  ['hit', 'hit'],
  ['ko', 'ko'],
  ['victory', 'victory'],
  ['special_1', 'special'],
  ['special_2', 'special-b'],
  ['special_3', 'special-c'],
];

let kitFiles;
try {
  kitFiles = fs.readdirSync(PROMPTS).filter((f) => f.endsWith('.md'));
} catch (e) {
  console.error(`ERROR: cannot read ${PROMPTS} (${e.code || e.message}) — nothing was measured.`);
  process.exit(2);
}
// REROLL files are alternate takes of a state the base kit already supplies, not extra supply.
const base = kitFiles.filter((f) => !/-REROLL\.md$/.test(f));
if (!base.length) {
  console.error(`ERROR: no base kits in ${PROMPTS} (${kitFiles.length} files, all filtered) — nothing was measured.`);
  process.exit(2);
}

// build-prompt exits 3 for a DELIBERATELY BLOCKED kit and 1 for a real build failure. Those are not
// the same thing and must never be reported as the same thing: ir41-kasa-oni is blocked on purpose
// (frontal plate — no side to mirror), which is the gate working, whereas kitsune-tanto simply could
// not assemble. Conflating them means the tool cries wolf about a correctly-blocked kit.
const BLOCKED_EXIT = 3;
const buildStatus = (file, state) => {
  try {
    execFileSync('node', ['qa-boss/build-prompt.mjs', file, state], { stdio: ['ignore', 'ignore', 'ignore'] });
    return 'ok';
  } catch (e) { return e.status === BLOCKED_EXIT ? 'blocked' : 'fail'; }
};
const builds = (file, state) => buildStatus(file, state) === 'ok';

const rows = [], unbuildable = [];
let supplyTotal = 0, shippedTotal = 0, queueTotal = 0;

for (const f of base.sort()) {
  const char = f.replace(/\.md$/, '');
  const file = path.join(PROMPTS, f);
  const supply = STATES.filter(([kit]) => builds(file, kit));

  let shipped = [];
  const dir = path.join(WIRED, char);
  if (fs.existsSync(dir)) {
    shipped = fs.readdirSync(dir)
      .filter((x) => x.endsWith('.webm'))
      .map((x) => x.replace(/\.webm$/, '').toLowerCase());
  }
  const missing = supply.filter(([, wired]) => !shipped.includes(wired)).map(([kit]) => kit);

  // A kit that builds NOTHING is not "complete" — it is broken, and silently reading as complete is
  // how kitsune-tanto (no `Shared prefix:` section, so no state can be assembled) sat in the roster
  // looking finished while being unfireable. It passes check-prompt-sections clean; only the builder
  // catches it. Segregate these instead of letting an empty set mean "nothing left to do".
  if (!supply.length) {
    unbuildable.push({ char, wired: shipped.length, why: buildStatus(file, 'idle') });
    continue;
  }

  supplyTotal += supply.length;
  shippedTotal += supply.length - missing.length;
  queueTotal += missing.length;
  rows.push({ char, supply: supply.length, shipped: supply.length - missing.length, missing });
}

// Untouched kits first (a character with zero clips is the biggest single win per fire), then by how
// much is left — that ordering IS the recommendation for what to fire next.
rows.sort((a, b) => (a.shipped - b.shipped) || (b.missing.length - a.missing.length) || a.char.localeCompare(b.char));

console.log(`FIRE QUEUE — derived from ${base.length} base kits (${kitFiles.length - base.length} REROLL variants excluded)`);
console.log(`states probed per kit: ${STATES.length}   (a state counts as SUPPLY only if build-prompt.mjs actually builds it)\n`);
console.log('  ship/sup  char                      remaining');
console.log('  ' + '-'.repeat(88));
for (const r of rows) {
  if (!r.missing.length && !full) continue;
  const tag = r.shipped === 0 ? '   <- NEVER FIRED' : '';
  const list = full || r.missing.length <= 5 ? r.missing.join(' ') : `${r.missing.slice(0, 5).join(' ')} +${r.missing.length - 5}`;
  console.log(`   ${String(r.shipped).padStart(2)}/${String(r.supply).padEnd(3)}  ${r.char.padEnd(24)}  ${list}${tag}`);
}
const done = rows.filter((r) => !r.missing.length);
if (done.length && !full) console.log(`\n  (${done.length} complete, hidden: ${done.map((r) => r.char).join(' ')})`);

// ── FIRED-BUT-NOT-WIRED ────────────────────────────────────────────────────────────────────────
// SHIPPED above counts WIRED webm files, which is the right measure of "done" but makes a whole
// class of work INVISIBLE: clips that were fired, QA'd and ACCEPTED, but never keyed and wired.
// Found phase 178 — the handoff said lich was 3/13 and gargoyle 1/13 accepted while this tool
// reported both 0/13 NEVER FIRED. Both were true: the accepted clips sit in qa-boss/raw/ as mp4.
// kitsune-tanto is the starkest case at 12 raws and 0 wired.
// Raw filenames are far too inconsistent to map onto states (lich-strike-v3, eclipse-ofuda-strike_a,
// ir37-pink-tessen-strike-b-v3 ...), so this deliberately reports a per-character COUNT only — a
// robust signal that work is parked, not a per-state claim it cannot honestly make.
// qa-boss/webm WAS CHECKED FOR PARKED FINISHED WORK AND IT IS NOT THERE (phase 208) — recorded as a
// NEGATIVE result so nobody repeats the search. It holds 137 keyed webm, but they belong to
// characters that are ALREADY WIRED (hollow-pale, ir37, satoshi, eclipse, lady-kurotachi, ir56,
// ir48, thorn-warden, sora-yari): intermediate working output, not shippable work sitting idle.
// The only exception is kitsune-tanto (idle + victory), and those have NO .cal.json alongside, so
// they cannot be placed correctly anyway — and that character is gated on a canonical-look ruling.
// The real parked work was in qa-boss/raw/ and is surfaced below.
// THE PARKED-ACCEPT SWEEP IS EXHAUSTIVE AS OF phase 213 — closed from THREE directions, so do not
// redo it without a reason. Two clips were recovered this session that had been accepted and left
// unkeyed for ~90 phases (thorn special_2 from phase 118; oni victory v2 from phase 125).
//   1. every ACCEPTED in commit SUBJECTS, cross-referenced against wired files
//   2. every **ACCEPTED in commit BODIES — only 3 lines exist, all already recovered
//   3. raws on disk vs wired, which is what the block below reports
// ONE TRAP WORTH KNOWING: an accept can be RETRACTED LATER. "ONI hit ACCEPTED" was reversed two
// phases on ("it has a phantom weapon" — an invented attacker mace). Never trust an accept line
// without reading FORWARD for a correction.
// Only kitsune-tanto remains parked, and it is gated on a canonical-look ruling, not on work.
const RAW = 'qa-boss/raw';
let raws = [];
try { raws = fs.readdirSync(RAW).filter((f) => /\.mp4$/i.test(f)); } catch { /* no raw dir */ }
if (raws.length) {
  const parked = [];
  for (const r of rows) {
    if (r.shipped) continue;
    // match on the character slug and on its short form (lich-scythe -> lich, gargoyle-spear -> gargoyle)
    const slug = r.char, short = r.char.split('-')[0];
    const n = raws.filter((f) => f.startsWith(`${slug}-`) || f.startsWith(`${short}-`)).length;
    if (n) parked.push({ char: r.char, n });
  }
  if (parked.length) {
    parked.sort((a, b) => b.n - a.n);
    console.log(`\n  ⓘ FIRED BUT NOT WIRED — raw mp4 exists in ${RAW}, nothing wired. This work is DONE-ISH`);
    console.log(`     and invisible to the SHIPPED count above; it needs keying + wiring, not firing,`);
    console.log(`     so it does NOT depend on account access:`);
    for (const p of parked) console.log(`       ${p.char.padEnd(24)} ${String(p.n).padStart(2)} raw file(s)`);
  }
}

const never = rows.filter((r) => r.shipped === 0).length;
console.log(`\n  SUPPLY ${supplyTotal} buildable states across ${rows.length} working kits`);
console.log(`  SHIPPED ${shippedTotal}   QUEUE ${queueTotal}   (${never} characters never fired at all)`);
console.log(`\n  ${queueTotal} verified gate-clean states are written and waiting. The kits are not the bottleneck.`);

const blocked = unbuildable.filter((u) => u.why === 'blocked');
const broken = unbuildable.filter((u) => u.why !== 'blocked');

if (blocked.length) {
  console.log(`\n  ⓘ ${blocked.length} kit(s) DELIBERATELY BLOCKED (the gate working as intended, not a defect):`);
  for (const u of blocked) console.log(`      ${u.char.padEnd(24)} ${u.wired} clip(s) wired — see the BLOCKED: line in its kit`);
}
if (broken.length) {
  console.error(`\n⛔ ${broken.length} KIT(S) BUILD NOTHING — they pass check-prompt-sections but cannot produce a`);
  console.error(`   single fireable prompt, so they are NOT in the queue above and are NOT "complete":`);
  for (const u of broken) {
    console.error(`     ${u.char.padEnd(24)} ${u.wired} clip(s) already wired`);
    try {
      execFileSync('node', ['qa-boss/build-prompt.mjs', path.join(PROMPTS, `${u.char}.md`), 'idle'], { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) {
      const why = String(e.stderr || '').split('\n').find((l) => /^Error:/.test(l)) || 'unknown';
      console.error(`       ${why.trim()}`);
    }
  }
  process.exit(2);
}
if (supplyTotal < rows.length) {
  console.error(`\nERROR: SUPPLY ${supplyTotal} < ${rows.length} kits — under one buildable state per kit is structurally impossible. The probe is broken, not the kits.`);
  process.exit(2);
}
