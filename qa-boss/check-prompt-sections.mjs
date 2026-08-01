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
  // Per-kit tail record, for the ko-contamination check after the state loop (see below).
  const tails = new Map();
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
    tails.set(st, out.trim());
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

    // ##########################################################################################
    // # ROTATIONAL LICENCE in a facing-locked state (phase 137). PROVEN on lich idle v1: the    #
    // # facing bound was stated TWICE in the prompt and ignored, and the torso plus skull       #
    // # opened to camera for 11 frames (check-frontturn sym 0.075 -> 0.239). The cause was not  #
    // # a missing bound, it was the BEAT granting rotation:                                     #
    // #     "his shoulders ROLL up under the pauldron"                                          #
    // #     "his weight ROLLS slowly from his rear foot onto his leading foot"                  #
    // # A foot-to-foot weight transfer squares the hips in a 3/4 stance. v2 removed both, kept  #
    // # every facing sentence unchanged, and the defect went to 0/97 frames.                    #
    // #                                                                                         #
    // # Scoped to idle + the two strikes: those are the states where the construction was found #
    // # and fixed, and a strike's WIND-UP is the same shape as the idle's settling. Deliberately #
    // # NOT applied to hit/block/victory — "weight rolling BACK over his rear foot" in a recoil #
    // # is sagittal, not a lateral transfer, and there is no evidence against it yet. Do not     #
    // # widen this without a measured case; a gate red for unproven reasons stops being read.   #
    // #                                                                                         #
    // # Patterns are WHITESPACE-TOLERANT on purpose. These kits hard-wrap their prose, and three #
    // # separate cleanup passes each missed sites that a phrase grep could not see across a      #
    // # line break — the same way the debris contradiction survived a targeted search five times.#
    // ##########################################################################################
    if (st === 'idle' || st === 'attack_strike' || st === 'attack_strike_b') {
      // Both word orders, because the roster uses both and a one-order pattern missed a live site.
      // "rolls his shoulders back toward screen-LEFT" (lich attack_strike_b) survived THREE hand
      // sweeps that all matched only "shoulders roll...". It was caught by reading the acting line
      // before firing, which is the fourth distinct under-match this session after hyphens, hard
      // line wraps and the "roll ONCE" variant. Encoded here so the next one cannot be a surprise.
      //
      // Deliberately NOT matched: "rolling OVER/DOWN" (ir22, ir60) — those are directional FOLDS,
      // read in full and cleared. And "roll once" is left out because oni's ACCEPTED victory
      // contains it while pinning shoulders, hips and feet in the same sentence, which is measured
      // evidence that a BOUNDED roll is safe. This gate is scoped to idle + the two strikes anyway.
      const ROT = [
        ['shoulder roll', /shoulders\s+roll(?:ing|s)?\s+(?:up|forward|back)/i],
        ['shoulder roll (reversed order)', /roll(?:s|ing)?\s+(?:his|her|their|the)\s+shoulders/i],
        ['foot-to-foot weight transfer', /weight\s+rolls?\s+(?:slowly\s+)?from\s+(?:his|her|the|their)\s+rear\s+[a-z-]+\s+onto/i],
      ];
      const rot = ROT.filter(([, re]) => re.test(out));
      if (rot.length) {
        bad = true;
        problems.push({
          f, st, kind: 'ROTATIONAL-LICENCE',
          detail: 'the BEAT grants a rotation the facing lock forbids: ' + rot.map(([n]) => n).join(' | ') +
            '\n      Proven on lich idle v1 — facing bound stated twice, ignored, 11-frame front-turn.\n' +
            '      FIX THE BEAT, not the bound: "shoulders LIFT STRAIGHT up ... with neither one coming\n' +
            '      forward and neither one going back", and replace the foot-to-foot transfer with\n' +
            '      "whole weight sinks STRAIGHT DOWN through BOTH planted feet at once ... and it NEVER\n' +
            '      transfers from one to the other". Adding another facing sentence does NOT work.',
        });
      }
    }
    // ##########################################################################################
    // # DEBRIS-COUNT CONTRADICTION (phase 167). A debris beat states a SPAWN count ("EXACTLY   #
    // # FIVE chips") and, since phase 158, a POPULATION bound ("THERE ARE NEVER MORE THAN N    #
    // # PIECES OF DEBRIS IN THE FRAME AT ONCE"). They must agree, and the rule is not equality: #
    // #                                                                                        #
    // #   BURST beat   -> population == spawn                                                  #
    // #   STAGED beat  -> population <  spawn, AND the staging must be stated in the beat      #
    // #                   ("in stages", "in ones and twos", "never in one burst")              #
    // #   population > spawn is always wrong — it bounds nothing.                              #
    // #                                                                                        #
    // # I CREATED FOUR OF THESE MYSELF in phase 158, adding population bounds to gargoyle with #
    // # a blanket insert that used a fixed word per sentence-pattern instead of each beat's    #
    // # own count (FIVE/THREE, FIVE/THREE, SEVEN/FOUR, SIX/THREE). Neither this gate nor my    #
    // # own re-reads caught it — a kit-writing agent reading the exemplar did. Then my first   #
    // # repair over-corrected and forced equality everywhere, destroying a legitimate STAGED   #
    // # bound. Both mistakes are now mechanically impossible.                                  #
    // ##########################################################################################
    {
      const NUM = { ONE:1, TWO:2, THREE:3, FOUR:4, FIVE:5, SIX:6, SEVEN:7, EIGHT:8, NINE:9, TEN:10 };
      const spawnM = out.match(/EXACTLY\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\s+(?:small\s+)?(?:chips?|chunks?|shards?|splinters?|grains?|slabs?|pieces?|petals?|clods?)/i);
      const popM   = out.match(/NEVER\s+MORE\s+THAN\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\s+PIECES/i);
      if (spawnM && popM) {
        const spawn = NUM[spawnM[1].toUpperCase()], pop = NUM[popM[1].toUpperCase()];
        const staged = /in\s+stages|IN\s+STAGES|in\s+ones\s+and\s+twos|never\s+in\s+one\s+burst|rather\s+than\s+in\s+one\s+burst/i.test(out);
        if (pop > spawn) {
          bad = true;
          problems.push({ f, st, kind: 'DEBRIS-COUNT',
            detail: `population bound (${pop}) EXCEEDS the spawn count (${spawn}) — it bounds nothing. ` +
              `Set the population equal to the spawn for a burst beat.` });
        } else if (pop < spawn && !staged) {
          bad = true;
          problems.push({ f, st, kind: 'DEBRIS-COUNT',
            detail: `spawn ${spawn} but population ${pop}, and the beat never says the debris is STAGED.\n      ` +
              `A burst beat cannot show fewer pieces than it spawns — that is a contradiction inside one\n      ` +
              `acting line, and a beat always beats a bound. Either set population == ${spawn}, or state the\n      ` +
              `staging in the same sentence ("breaks loose in ones and twos ... never in one burst").` });
        }
      }
    }

    if (!bad) clean++;
  }

  // ##########################################################################################
  // # KO-CONTAMINATED SHARED SUFFIX (phase 133). build-prompt.mjs does NOT emit the Shared    #
  // # suffix verbatim for `ko` — koSuffix() rewrites it in four places. The one that bites is #
  // # the debris tail: "...the last frame shows ONLY the fighter and what the fighter holds,  #
  // # exactly as the first frame does." becomes "...anywhere in the shot." (a collapsed       #
  // # fighter holds nothing and does not return to the anchor).                               #
  // #                                                                                         #
  // # A kit author who READS an assembled `ko` and copies that tail back into `Shared suffix` #
  // # silently strips "exactly as the first frame does" — the anchor re-assertion — from       #
  // # EVERY standing state. This landed in FIVE kits at once (lich-scythe, hydra-flail,       #
  // # ir12-rose-lance, raiju-naginata, pale-choir) and no existing check saw it: the prompt   #
  // # still builds clean, exits 0, and the clause count is still exactly 1.                   #
  // #                                                                                         #
  // # Assert directly on the standing tail rather than diffing idle-vs-ko, so a kit that has  #
  // # no `ko` section is still covered.                                                       #
  // ##########################################################################################
  const STANDING_TAIL = /the last frame shows ONLY the fighter and what the fighter holds/i;
  const KO_TAIL = /at the end there is no shed, torn, broken or kicked-up material anywhere in the shot/i;
  for (const [st, out] of tails) {
    if (st === 'ko') continue;
    if (STANDING_TAIL.test(out)) continue;
    if (!KO_TAIL.test(out)) continue;   // no debris tail at all is a different (older) shape — not this defect
    problems.push({
      f, st, kind: 'KO-CONTAMINATED',
      detail: 'the Shared suffix carries the KO variant of the debris tail. build-prompt.mjs ' +
        'rewrites that tail for `ko` only — copying the rewritten wording back into the kit strips ' +
        '"exactly as the first frame does" (the anchor re-assertion) from every standing state.\n      ' +
        'FIX: restore the standing tail in `Shared suffix`:\n      ' +
        '"; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does."',
    });
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
