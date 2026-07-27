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
function paragraphAfter(label) {
  const i = src.indexOf(label);
  if (i < 0) return '';
  const rest = src.slice(i + label.length);
  const end = rest.search(/\n\s*\n/);
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, ' ').trim();
}

// "## <state> ..." heading, then the body until the next heading. '#' comment lines are DROPPED —
// they are notes to the operator (e.g. "REWRITTEN 2026-07-26 ..."), never part of the prompt.
function stateBody(st) {
  const re = new RegExp('^## ' + st + '\\b.*$', 'm');
  const m = src.match(re);
  if (!m) throw new Error('no state section: ' + st);
  const rest = src.slice(m.index + m[0].length);
  const nextH = rest.search(/^## /m);
  const seg = nextH < 0 ? rest : rest.slice(0, nextH);
  return seg.split('\n').filter((l) => !l.trimStart().startsWith('#')).join(' ').replace(/\s+/g, ' ').trim();
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
  const addon = paragraphAfter('SPECIAL add-on:');
  if (addon) parts.push(addon);
}
const suffix = quoted('Shared suffix');
parts.push(state === 'ko' ? koSuffix(suffix) : suffix);

const prompt = parts.join(' ').replace(/\s+/g, ' ').trim();
process.stdout.write(prompt + '\n');
process.stderr.write('LEN=' + prompt.length + '\n');
