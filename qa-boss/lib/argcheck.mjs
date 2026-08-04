// argcheck — ONE door for every CLI argument in the qa-boss / scripts gate set.
//
// ⛔ WHY THIS MODULE EXISTS, AND WHY IT MUST NOT BE FORKED.
// "A gate that cannot fail" is this repo's most expensive recurring defect. It has now been fixed
// FOUR times in one session and found again each time, because each fix closed the door in the files
// that round happened to own:
//   round 1  a NaN threshold nothing can cross                    (mutating tools + cmp-alpha)
//   round 2  an absurd-but-VALID numeric threshold (999999)       (check-extra-objects, at the signature)
//   round 3  unvalidated thresholds in the four CHECKERS          (check-turn/-frontturn/-containment/-body-commitment)
//   round 4  the adversarial sweep defeated 8 of 12 tools anyway  <- you are here
// Every round the code was correct and the COVERAGE was not. So the fix is not another guard: it is
// ONE validator that every tool calls, so a tool cannot be forgotten and a new tool inherits it.
//
// ⛔ DO NOT COPY THIS FILE INTO A TOOL. Import it. A verbatim duplicate was made in round 3 (the
// agent could not create a shared module without touching a file it did not own) and that duplicate
// is exactly how coverage rots.
//
// THE THREE THINGS A DISARMED THRESHOLD DOES, all of which look like success:
//   1. NaN      — every comparison against NaN is false, so the bar stops rejecting AND stops
//                 accepting. check-turn printed "no turns." at exit 0 on the clip it was built to
//                 catch, with only a quiet "for >= NaN frames" to show.
//   2. UNREACHABLE — a finite bar past the data's ceiling (--min-run 9999 over a 97-frame clip,
//                 --min-iou 0). The tool measures everything and can then only conclude "ok".
//   3. EMPTY    — Number('') === 0, which passes isFinite AND >= 0 AND <= 1. A quoted empty string
//                 became a silent declared-zero in two separate tools.
//
// Exit code contract, shared with cut-bloom-plate.mjs (the phase-260 reference):
//   2 = usage / input error — REFUSED TO RUN, measured nothing
//   1 = a real detected failure
//   0 = pass
//
// Usage:
//   import { makeArgs } from './lib/argcheck.mjs';           // from qa-boss/
//   import { makeArgs } from '../qa-boss/lib/argcheck.mjs';  // from scripts/
//   const A = makeArgs(process.argv.slice(2), { tool: 'check-turn', usage: 'node ... <file|dir>' });
//   const MIN_RUN = A.num('--min-run', 4, { min: 1, integer: true, band: 'a run is a frame count.' });
//   const PLATE   = A.str('--plate', null, { oneOf: ['green', 'magenta'], required: true });
//   const DRY     = A.bool('--dry');
//   const targets = A.positionals();
//   A.done();   // <- REQUIRED. Rejects unknown flags. Without it a typo'd flag is silently dropped.

const ESC = 2;

export function makeArgs(argv, { tool = 'tool', usage = '', onFail } = {}) {
  const seen = new Set();          // flags this tool declared (so unknowns can be rejected)
  const consumed = new Set();      // argv indices used by a flag or its value

  const fail = (lines) => {
    for (const l of lines) console.error(l);
    if (usage) console.error(`\n${usage}`);
    if (onFail) onFail();          // lets a tool clean up its scratch dir before exiting
    process.exit(ESC);
  };

  // Locate a flag, rejecting duplicates. A duplicate is not harmless: indexOf reads the FIRST, so
  // the value visible on the command line is not the value that ran. Seen live with two different
  // --anchor paths, where the whole kit was judged against a reference that was not the winner.
  const locate = (flag) => {
    seen.add(flag);
    const at = [];
    argv.forEach((v, i) => { if (v === flag) at.push(i); });
    if (at.length > 1) {
      fail([
        `\nERROR: ${flag} was given ${at.length} times (as ${at.map((i) => JSON.stringify(argv[i + 1])).join(', ')}).`,
        '  Only the FIRST is read and the rest are silently ignored, so the argument you can read on',
        '  the command line is not the argument that ran. Give it exactly once.',
      ]);
    }
    return at.length ? at[0] : -1;
  };

  // A value slot is ABSENT if it ran off the end, is another flag, or is blank. The blank case is
  // the subtle one: Number('') === 0, which clears every finiteness and range check.
  const valueAt = (flag, i) => {
    const raw = argv[i + 1];
    if (raw === undefined || raw.startsWith('--') || raw.trim() === '') {
      fail([
        `\nERROR: ${flag} was given with no value (${raw === undefined ? 'it is the last argument on the line'
          : raw.trim() === '' ? 'its value is an empty string' : `the next argument is the flag ${JSON.stringify(raw)}`}).`,
        '  An absent value does not fall back to the default — it becomes NaN (or, for an empty',
        '  string, ZERO). Either way the threshold stops discriminating and the gate reports clean.',
      ]);
    }
    consumed.add(i); consumed.add(i + 1);
    return raw;
  };

  return {
    /**
     * A numeric argument with a MEANINGFUL band. `min`/`max` are not the mathematical domain —
     * they are the range over which the threshold can still convict on real data. Measure the band
     * against a known-bad input; do not reason it out. A bound of 0.90 where 0.86 already goes
     * silent leaves a hole that is the same defect wearing a believable number.
     * `band` is one sentence explaining the range, printed on refusal.
     */
    num(flag, dflt, { min = -Infinity, max = Infinity, integer = false, band = '' } = {}) {
      const i = locate(flag);
      if (i === -1) return dflt;
      const raw = valueAt(flag, i);
      const v = Number(raw);
      if (!Number.isFinite(v)) {
        fail([
          `\nERROR: ${flag} ${JSON.stringify(raw)} is not a finite number — Number() gives ${String(v)}.`,
          '  A non-finite threshold can never be crossed, so this tool measures its input in full and',
          '  then reports it clean. That is a disarmed gate, not a pass.',
        ]);
      }
      if (integer && !Number.isInteger(v)) {
        fail([
          `\nERROR: ${flag} ${JSON.stringify(raw)} is not a whole number, but it counts discrete items.`,
          '  A fractional count is always a typo, and it silently shifts the bar it is compared to.',
        ]);
      }
      if (v < min || v > max) {
        fail([
          `\nERROR: ${flag} ${v} is outside the meaningful band [${min}, ${max}].`,
          band ? `  ${band}` : '',
          '  A threshold outside this band cannot be crossed by real data: the tool measures every',
          '  frame and can then only ever conclude "ok". That is the disarmed-gate defect.',
        ].filter(Boolean));
      }
      return v;
    },

    /** A string argument, optionally constrained to a set. `required` refuses a silent default. */
    str(flag, dflt, { oneOf = null, required = false, why = '' } = {}) {
      const i = locate(flag);
      if (i === -1) {
        if (required) {
          fail([
            `\nERROR: ${flag} is REQUIRED and has no default.`,
            why ? `  ${why}` : '  Guessing it wrong is silent and the result still looks like a pass.',
            oneOf ? `  Valid values: ${oneOf.join(' | ')}` : '',
          ].filter(Boolean));
        }
        return dflt;
      }
      const raw = valueAt(flag, i);
      if (oneOf && !oneOf.includes(raw)) {
        fail([`\nERROR: ${flag} ${JSON.stringify(raw)} is not one of: ${oneOf.join(' | ')}.`, why ? `  ${why}` : ''].filter(Boolean));
      }
      return raw;
    },

    /** A boolean switch. Declared so done() will not reject it as unknown. */
    bool(flag) {
      seen.add(flag);
      const at = [];
      argv.forEach((v, i) => { if (v === flag) { at.push(i); consumed.add(i); } });
      return at.length > 0;
    },

    /**
     * An explicit OFF SWITCH must ANNOUNCE ITSELF on BOTH streams. A silent off-switch is
     * indistinguishable from a pass in scrollback and in a log file — cmp-alpha's `--min-iou 0`
     * disabled its only verdict and printed nothing at all to say so.
     */
    offSwitch(flag, what) {
      const on = this.bool(flag);
      if (on) {
        const msg = `⚠ ${tool}: ${flag} is set — ${what}. This run CANNOT FAIL.`;
        console.log(msg);
        console.error(msg);
      }
      return on;
    },

    positionals() {
      return argv.filter((v, i) => !v.startsWith('--') && !consumed.has(i));
    },

    /**
     * REQUIRED as the last argument step. An undeclared flag is otherwise silently dropped, so a
     * typo'd `--min-iuo 0.9` leaves the real threshold at its default and the caller believes they
     * set it. Measured live: cmp-alpha accepted `--bogus` without a word.
     */
    done() {
      const unknown = argv.filter((v, i) => v.startsWith('--') && !seen.has(v) && !consumed.has(i));
      if (unknown.length) {
        fail([
          `\nERROR: unknown flag(s): ${unknown.join(' ')}`,
          '  This tool does not read them, so they were silently doing nothing. If one is a typo of a',
          '  real flag, the threshold you meant to set is still at its default and this run does not',
          `  mean what you think. Declared flags: ${[...seen].sort().join(' ')}`,
        ]);
      }
    },
  };
}
