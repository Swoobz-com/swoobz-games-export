// GATE: every state in every prompt file must build to a REAL ACTING LINE — not a QA analysis
// block, not a concept Tim rejected, not a superseded first-match.
//
// WHY THIS EXISTS (phase 63). build-prompt.mjs used to take the FIRST '^## <state>' heading. These
// prompt files accumulate history ABOVE the live acting line — "## <state> v3 RESULT + v4" analysis
// blocks, "## <state> (REJECTED by Tim ...)" dead concepts — and all of those also match. So the
// first match silently stopped being the prompt. Measured across the whole prompt dir the day this
// was written: 14 of 109 state builds resolved to the WRONG section, including all three clips that
// were queued to fire next. Two of them would have fed the video model raw QA telemetry
// ("v3 measures: anchor-lock f0 0.993", "Pixel-sampled rgb(147,42,94)", "Same acting line as v3,
// with the petal sentence replaced by:"), and one would have re-fired the ODACHI CYCLONE concept
// Tim rejected as "looks bad".
//
// This defect class is expensive precisely because it is SILENT: it renders a plausible clip that
// then fails QA for reasons that have nothing to do with the acting, which is how a re-roll loop
// burns cycles rewriting prose that was never the problem.
//
// SECOND GATE GAP, CLOSED phase 96 — the TRAILING-EDITORIAL leak. The rule above bounds a section at
// the next '## ' heading, but these files also carry editorial blocks that are NOT '##'-headed: the
// shared prefix/suffix blockquotes, the "SPECIAL add-on:" block, ★-marked operator notes, bare '---'
// rules. Any of those trailing the LAST state section before the next heading was swallowed whole and
// shipped to the video model as prompt text. This gate reported clean=245 problems=0 while 4 of those
// 245 were carrying it — eclipse victory shipped an instruction ABOUT the prompt ("APPEND to EVERY
// remaining v2/v3 acting line before firing") plus six literal '>' markers plus the SPECIAL add-on on
// a non-special; ir37 strike_b shipped the ENTIRE shared prefix AND suffix a second time, 4523 chars
// against a ~2000 norm. Not catching it was half the bug, so LEAKED is checked TWO independent ways:
//   1. the builder's own "WARN: TRIMMED trailing editorial" on stderr — it cut something, so the FILE
//      is still malformed even though the prompt that came out is now clean;
//   2. editorial markers found in the ASSEMBLED prompt itself — which does not trust the builder's
//      rule at all, and is what catches the NEXT shape of this defect that the builder does not know.
//
// Run it before firing anything, and after editing any prompt file.
//   node qa-boss/check-prompt-sections.mjs            -> whole prompts dir
//   node qa-boss/check-prompt-sections.mjs <file.md>  -> one file
// Exit 0 = every state builds a clean acting line. Exit 1 = at least one is poisoned, leaked or refused.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Telemetry that can appear in a measurement note but NEVER in a director's instruction to a video
// model. Kept in sync with build-prompt.mjs's TELEMETRY_TELL — this gate is the independent check
// that the builder's own rule is actually holding.
const TELL = [
  /\bv\d+ measures\b/i, /\banchor-lock f0\b/i, /\bturn gate\b/i, /\bplate retention\b/i,
  /\bspanPeak\b/i, /\bminIoU\b/i, /\bfLast\b/i, /\bPixel-sampled\b/i,
  /\bSame acting line as\b/i, /\bcontainment (?:failed|only)\b/i,
  /\brgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/, /@f\d+/, /\bqa-boss\//, /\bre-roll\b/i,
  /\bCONCEPT REPLACED\b/i, /\bREJECTED by\b/i,
];

// EDITORIAL MARKERS: markdown scaffolding and operator notes that belong to the FILE, never to a
// director's instruction. If any of these reach the assembled prompt, a non-'##' block was swallowed.
// Deliberately NOT imported from build-prompt.mjs — this list is the independent opinion, so a hole in
// the builder's EDITORIAL_BLOCK list still shows up here.
const LEAK = [
  ['literal ">" blockquote marker', /(?:^|\s)>\s/],
  ['a ★-marked operator note', /[★☆]/],
  ['an instruction ABOUT the prompt ("APPEND to EVERY ...")', /\bAPPEND to EVERY\b/i],
  ['the "Shared prefix:" block label', /\bShared prefix\s*:/i],
  ['the "Shared suffix" block label', /\bShared suffix\b/i],
  ['the "SPECIAL ... add-on:" block label', /SPECIAL[^:\n]*add-on[^:\n]*:/i],
  ['a bare markdown horizontal rule', /(?:^|\s)(?:-{3,}|\*{3,}|_{3,})(?:\s|$)/],
  ['a "FRAME BUDGET" measurement block', /\bFRAME BUDGET\b/i],
  ['a "(measured ...)" note', /\(measured\b/i],
];

const STATES = [
  'idle', 'attack_strike', 'attack_strike_b', 'attack_throw', 'attack_throw_b',
  'attack_block', 'attack_block_b', 'hit', 'ko', 'victory',
  'special_1', 'special_2', 'special_3',
  'strike_a', 'strike_b', 'throw_a', 'throw_b', 'block_a', 'block_b',
  'special_a', 'special_b', 'special_c',
];

const arg = process.argv[2];
const files = arg
  ? [arg]
  : fs.readdirSync('qa-boss/prompts').filter((f) => f.endsWith('.md')).map((f) => path.posix.join('qa-boss/prompts', f));

let clean = 0;
const problems = [];
const skipped = [];
const blocked = new Map();   // kit -> reason (BLOCKED: marker; intentional, never a 'problem')

for (const f of files) {
  // Not every .md in prompts/ is a fireable prompt file. Some are FRAGMENTS (re-roll scratch, notes)
  // with no "Shared prefix:" blockquote, so build-prompt.mjs cannot assemble them at all. Those are
  // not defects — report them as skipped rather than drowning the real findings in stack traces.
  if (!/^Shared prefix:/m.test(fs.readFileSync(f, 'utf8'))) {
    skipped.push(path.basename(f));
    continue;
  }
  for (const st of STATES) {
    // spawnSync, not execFileSync: stderr is needed on SUCCESS too, because the builder announces a
    // trailing-editorial cut there while still exiting 0.
    const r = spawnSync('node', ['qa-boss/build-prompt.mjs', f, st], { encoding: 'utf8' });
    if (r.error) { problems.push({ f, st, kind: 'REFUSED', detail: String(r.error.message) }); continue; }
    const err = r.stderr || '';
    // Exit 3 = the kit carries a BLOCKED: marker. That is INTENTIONAL, so it must not turn the gate
    // red — a permanently red gate is a gate people stop reading. But it must not count as clean
    // either, or the kit reads as fireable. Report it in its own bucket and move on.
    if (r.status === 3) {
      const why = (err.match(/^BLOCKED:\s*(.+)$/m) || [, '(no reason given)'])[1];
      blocked.set(path.basename(f), why.trim());
      break;   // kit-level, so the other 12 states would report the same thing
    }
    if (r.status !== 0) {
      // "no state section" just means this character does not have that state — not a failure.
      if (/no state section/.test(err)) continue;
      problems.push({ f, st, kind: 'REFUSED', detail: err.trim().split('\n').slice(0, 6).join('\n      ') });
      continue;
    }
    const out = r.stdout || '';
    let bad = false;

    // 1. the builder had to CUT a trailing editorial block out of this section. The prompt that came
    //    out is clean, but the FILE is malformed and the next state added under that block inherits it.
    //    The WARN is a block: its first line is flush-left and every continuation line is indented.
    const trimNote = err.match(/^WARN: TRIMMED trailing editorial.*(?:\n[ \t]+.*)*/m);
    if (trimNote) {
      bad = true;
      const lines = trimNote[0].split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
      const cut = lines.filter((l) => l.startsWith('|'));
      problems.push({
        f, st, kind: 'LEAKED',
        detail: 'build-prompt.mjs had to CUT a non-"##" editorial block out of this section — the ' +
          'FILE still has it attached:\n      ' +
          [lines[0], ...cut.slice(0, 4), cut.length > 4 ? `... +${cut.length - 4} more line(s)` : '']
            .filter(Boolean).join('\n      '),
      });
    }

    // 2. INDEPENDENT of the builder: editorial markers that actually reached the assembled prompt.
    const leaks = LEAK.filter(([, re]) => re.test(out));
    if (leaks.length) {
      bad = true;
      problems.push({
        f, st, kind: 'LEAKED',
        detail: 'editorial content IS IN the built prompt: ' + leaks.map(([n]) => n).join(' | '),
      });
    }

    const tells = TELL.filter((re) => re.test(out));
    if (tells.length) {
      bad = true;
      problems.push({ f, st, kind: 'POISONED', detail: 'telemetry in built prompt: ' + tells.slice(0, 4).map(String).join(' ') });
    }
    if (!bad) clean++;
  }
}

for (const p of problems) {
  console.log(`${p.kind.padEnd(9)} ${path.basename(p.f)} [${p.st}]\n      ${p.detail}`);
}
if (skipped.length) console.log(`skipped (fragment, no "Shared prefix:"): ${skipped.join(', ')}`);
if (blocked.size) {
  console.log(`
BLOCKED kits (${blocked.size}) — these CANNOT be fired and are deliberately not counted as clean:`);
  for (const [k, why] of blocked) console.log(`  ${k}
      ${why}`);
}
console.log(`\nclean=${clean}  problems=${problems.length}`);
if (problems.length) {
  console.log('\nA REFUSED state has no live acting line written yet — write one into a section whose');
  console.log('heading does not say RESULT/REJECTED/SUPERSEDED and which carries no QA numbers.');
  console.log('A POISONED state means build-prompt.mjs\'s section rule let history through — fix the rule.');
  console.log('A LEAKED state means an editorial block (shared prefix/suffix, SPECIAL add-on, a ★ note,');
  console.log('a "---" rule) sits INSIDE a state section instead of above the first "## " heading, so it');
  console.log('attaches to whichever state precedes it — fix the FILE by moving that block out, or give');
  console.log('it a "## " heading of its own. Do NOT edit the acting line to work around it.');
}
process.exit(problems.length ? 1 : 0);
