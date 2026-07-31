// Assemble ONE fire-ready prompt from a boss prompt file: shared prefix + the state's paragraph +
// shared suffix (+ the SPECIAL add-on for special_* states), FLATTENED to single spaces.
//
// WHY FLATTENED: clipboard paste into Higgsfield's Lexical editor silently DROPS newlines WITHOUT
// substituting a space, joining a word at every line break ("ends on" -> "endson"). Only a length
// check catches it. Flattening first makes the pasted length exactly equal to the source length, so
// the pre-fire assertion textContent.length === source.length is a real gate.
//
// Usage: node qa-boss/build-prompt.mjs <promptFile> <state>   -- prints the prompt, then LEN=<n>
import fs from 'node:fs';

const [file, state] = process.argv.slice(2);
const src = fs.readFileSync(file, 'utf8');

// Blockquote sections: "Shared prefix:" / "Shared suffix ...:" followed by "> " lines.
function quoted(afterLabel) {
  const i = src.indexOf(afterLabel);
  if (i < 0) throw new Error('no section: ' + afterLabel);
  const lines = src.slice(i).split('\n').slice(1);
  const out = [];
  for (const l of lines) {
    if (l.startsWith('>')) out.push(l.replace(/^>\s?/, '').trim());
    else if (out.length) break;
  }
  return out.join(' ');
}

// "SPECIAL add-on:" is a plain paragraph, not a blockquote.
// Matches the add-on heading by REGEX, not by an exact literal.
// BUG FOUND 2026-07-29: this used src.indexOf('SPECIAL add-on:'). satoshi-odachi.md and
// eclipse-ofuda.md head theirs "SPECIAL suffix add-on (the 3 specials only; Tim's
// contain-in-frame rule):", which does not contain that literal — so BOTH characters' specials
// were assembled with NO add-on at all and Tim's explicit contain-in-frame rule was silently
// dropped from every special they ever fired. satoshi carries 5 containment BLOCKs on record.
// A silent '' return is exactly the failure mode that hides this, so the caller now asserts.
function paragraphAfter(re) {
  const m = src.match(re);
  if (!m) return '';
  const rest = src.slice(m.index + m[0].length);
  const end = rest.search(/\n\s*\n/);
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, ' ').trim();
}

// "## <state> ..." heading, then the body until the next heading. '#' comment lines are DROPPED —
// they are notes to the operator (e.g. "REWRITTEN 2026-07-26 ..."), never part of the prompt.
//
// THE POISONED-SECTION RULE (phase 63). This used to take the FIRST '^## <state>' heading and emit
// its body with no further checks. These prompt files accumulate history ABOVE the live acting line
// — "## <state> v3 RESULT + v4" analysis blocks, "## <state> (REJECTED by Tim ...)" dead concepts —
// and every one of those also matches '^## <state>\b'. So the FIRST match silently stopped being the
// prompt. Measured across the whole prompt dir: 4 of 109 state builds were wrong, and they were
// exactly the 3 clips queued to fire next plus satoshi special_2:
//   ir37 attack_strike_b  -> emitted QA TELEMETRY as the prompt ("v3 measures: anchor-lock f0 0.993",
//                            "Pixel-sampled rgb(147,42,94)", "Same acting line as v3, with the petal
//                            sentence replaced by:") — a video model fed measurement notes.
//   hollow-pale special_b -> same class.
//   satoshi special_2     -> emitted the ODACHI CYCLONE concept Tim REJECTED as "looks bad", with the
//                            rejection sentence embedded; the live QUAKE replacement sits below it.
//   eclipse attack_strike -> emitted the stale v1 body while the v4 inserts sat unmerged below.
// A wrong prompt here is expensive and SILENT: it renders a plausible clip that fails QA for reasons
// that have nothing to do with the acting, which is how a re-roll loop burns cycles chasing prose.
//
// The fix is FAIL-LOUD, not clever. Candidates whose heading marks them as history, or whose body
// carries QA-telemetry tells that cannot occur in a director's instruction, are DISQUALIFIED. If
// that leaves exactly one, use it. If it leaves several, prefer the highest explicit vN (ties keep
// the earliest, which is the old behaviour). If it leaves none, THROW and list what was found —
// never emit a section this rule rejected.
// NARROW ON PURPOSE. A heading routinely describes the version it REPLACES — eclipse's live line is
// "## victory v2 (ENERGY flourish, no rotation — v1 FAILED on a 180 turn)", and a rule that fired on
// FAILED disqualified the very acting line it was meant to protect, falling back to the stale base.
// Same for QUEUED, which marks the clip staged to fire NEXT, i.e. exactly what we want to build.
// So this matches only words that describe THIS section as dead. Ordering between live candidates is
// the vN rank's job, and spotting analysis blocks is TELEMETRY_TELL's job — neither belongs here.
const DEAD_HEADING = /\b(RESULT|REJECTED|SUPERSEDED)\b/i;
const TELEMETRY_TELL = [
  /\bv\d+ measures\b/i, /\banchor-lock f0\b/i, /\bturn gate\b/i, /\bplate retention\b/i,
  /\bspanPeak\b/i, /\bminIoU\b/i, /\bfLast\b/i, /\bPixel-sampled\b/i,
  /\bSame acting line as\b/i, /\bcontainment (?:failed|only)\b/i,
  /\brgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/, /@f\d+/, /\bqa-boss\//, /\bre-roll\b/i,
];

// THE B-TAKE NAMING RULE (phase 68). The canonical state name for a second take is `<base>_b`
// (`attack_strike_b`), which is what the engine manifests and every gate use. But the prompt files
// spell their second take `## attack_strike B` — a space and a capital letter. `^## attack_strike_b\b`
// does not match that, so EVERY B-take in the project was unbuildable by its own state name: 24
// headings across 8 characters silently returned "no state section".
// This is the same silent-miss class as the phase-63 poisoned sections, and it is why a caller could
// ask for `attack_strike_b` and get nothing at all rather than an error they would notice.
// Fixed here rather than by renaming 24 headings: one change, backwards-compatible, and the A/B
// wording in the files stays readable. `<base>_b` now also matches `## <base> B`.
function headingPattern(st) {
  const m = st.match(/^(.*)_b$/);
  if (!m) return '^## ' + st + '\\b.*$';
  return '^## (?:' + st + '|' + m[1] + ' B)\\b.*$';
}

function sectionsFor(st) {
  const re = new RegExp(headingPattern(st), 'gm');
  const found = [];
  for (const m of src.matchAll(re)) {
    const rest = src.slice(m.index + m[0].length);
    const nextH = rest.search(/^## /m);
    const seg = nextH < 0 ? rest : rest.slice(0, nextH);
    const body = seg.split('\n').filter((l) => !l.trimStart().startsWith('#')).join(' ')
      .replace(/\s+/g, ' ').trim();
    const heading = m[0].trim();
    const tells = TELEMETRY_TELL.filter((r) => r.test(body));
    const deadHead = DEAD_HEADING.test(heading);
    // Version rank from the heading: "## attack_strike_b v4 (...)" -> 4; a bare heading -> 1.
    const vm = heading.match(/\bv(\d+)\b/);
    found.push({ heading, body, tells, deadHead, v: vm ? Number(vm[1]) : 1 });
  }
  return found;
}

function stateBody(st) {
  const all = sectionsFor(st);
  if (!all.length) throw new Error('no state section: ' + st);
  const live = all.filter((s) => !s.deadHead && !s.tells.length && s.body.length);
  if (!live.length) {
    const why = all.map((s) => '  - ' + s.heading + '\n      ' +
      (s.deadHead ? 'heading marks it as history' : '') +
      (s.tells.length ? (s.deadHead ? ' + ' : '') + 'QA-telemetry in body: ' + s.tells.slice(0, 3).join(' ') : '') +
      (s.body.length ? '' : 'empty body')).join('\n');
    throw new Error(
      'REFUSING to build "' + st + '" from ' + file + ': every matching section is history or ' +
      'analysis, so there is NO live acting line to fire.\n' + why +
      '\nWrite the acting line into a section whose heading does NOT contain ' +
      'RESULT/REJECTED/SUPERSEDED/QUEUED/LESSON/CONDITIONAL/FAILED and which carries no QA numbers.');
  }
  live.sort((a, b) => b.v - a.v); // highest vN wins; sort is stable so ties keep document order
  const chosen = live[0];
  if (all.length > 1) {
    process.stderr.write('SECTION: ' + chosen.heading + '  (of ' + all.length + ' matching "' + st +
      '"; ' + (all.length - live.length) + ' disqualified as history/analysis)\n');
  }
  return chosen.body;
}

// THE KO-SUFFIX RULE. `ko` is the ONE off-anchor state: the fighter DROPS the weapon and ENDS
// collapsed. Two sentences of the shared suffix directly contradict that — the weapon lock ("keeps
// X in his hands the whole time and never drops or swaps them") and the anchor lock ("begins and
// ends on the EXACT same reference stance"). Pasting the suffix verbatim on a ko hands the model
// two mutually exclusive orders and it will obey the wrong one. lady-kurotachi.md carries this as a
// hand-written operator note ("[Use ko-suffix: drop the ... lines]"); ir48-hex-paper-lord.md does
// NOT, so the rule is enforced HERE instead of relying on whoever fires remembering it.
function koSuffix(s) {
  return s
    .replace(/[^.]*keeps? the [^.]*in (?:his|her|their) hands?[^.]*never drops? or swaps?[^.]*\.\s*/gi, ' ')
    .replace(/[^.]*begins and ends on the EXACT same reference stance\.\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const parts = [quoted('Shared prefix:'), stateBody(state)];
if (state.startsWith('special')) {
  // Accepts "SPECIAL add-on:" and "SPECIAL suffix add-on (...):" alike.
  const addon = paragraphAfter(/SPECIAL[^:\n]*add-on[^:\n]*:/i);
  if (addon) parts.push(addon);
  else process.stderr.write(
    'WARN: no SPECIAL add-on paragraph found in ' + file + ' — the contain-in-frame rule is NOT ' +
    'in this prompt. Add a "SPECIAL add-on:" paragraph before firing a special.\n');
}
const suffix = quoted('Shared suffix');
parts.push(state === 'ko' ? koSuffix(suffix) : suffix);

const prompt = parts.join(' ').replace(/\s+/g, ' ').trim();
process.stdout.write(prompt + '\n');
process.stderr.write('LEN=' + prompt.length + '\n');
