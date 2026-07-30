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
// Run it before firing anything, and after editing any prompt file.
//   node qa-boss/check-prompt-sections.mjs            -> whole prompts dir
//   node qa-boss/check-prompt-sections.mjs <file.md>  -> one file
// Exit 0 = every state builds a clean acting line. Exit 1 = at least one is poisoned or refused.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

for (const f of files) {
  // Not every .md in prompts/ is a fireable prompt file. Some are FRAGMENTS (re-roll scratch, notes)
  // with no "Shared prefix:" blockquote, so build-prompt.mjs cannot assemble them at all. Those are
  // not defects — report them as skipped rather than drowning the real findings in stack traces.
  if (!/^Shared prefix:/m.test(fs.readFileSync(f, 'utf8'))) {
    skipped.push(path.basename(f));
    continue;
  }
  for (const st of STATES) {
    let out, err = '';
    try {
      out = execFileSync('node', ['qa-boss/build-prompt.mjs', f, st], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      const msg = String(e.stderr || e.message);
      // "no state section" just means this character does not have that state — not a failure.
      if (/no state section/.test(msg)) continue;
      problems.push({ f, st, kind: 'REFUSED', detail: msg.trim().split('\n').slice(0, 6).join('\n      ') });
      continue;
    }
    const tells = TELL.filter((re) => re.test(out));
    if (tells.length) {
      problems.push({ f, st, kind: 'POISONED', detail: 'telemetry in built prompt: ' + tells.slice(0, 4).map(String).join(' ') });
    } else {
      clean++;
    }
  }
}

for (const p of problems) {
  console.log(`${p.kind.padEnd(9)} ${path.basename(p.f)} [${p.st}]\n      ${p.detail}`);
}
if (skipped.length) console.log(`skipped (fragment, no "Shared prefix:"): ${skipped.join(', ')}`);
console.log(`\nclean=${clean}  problems=${problems.length}`);
if (problems.length) {
  console.log('\nA REFUSED state has no live acting line written yet — write one into a section whose');
  console.log('heading does not say RESULT/REJECTED/SUPERSEDED and which carries no QA numbers.');
  console.log('A POISONED state means build-prompt.mjs\'s section rule let history through — fix the rule.');
}
process.exit(problems.length ? 1 : 0);
