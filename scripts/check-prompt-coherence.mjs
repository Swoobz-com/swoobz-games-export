// CHARACTER<->PROMPT COHERENCE GATE (Tim, 2026-07-26: "add a review page so you can match the prompt
// with the exact character so a swordsman never shoots something").
//
// Reads qa-boss/arsenal.json (what each boss actually WIELDS) and scans a character's prompt kit for
// lines that would make the model render something the character has no business producing:
//   1. UNIVERSAL BANNED phrases  -> projectile / launched / detached-object wording (the "rocket" class)
//   2. GRAB-FRAMING              -> "clamps onto an unseen enemy" makes the model PAINT the enemy
//   3. EFFECT ANCHORING          -> every special_* must anchor the effect to his body/weapon
//   4. PER-CHARACTER banned      -> e.g. satoshi spin-cyclone, eclipse vertical blade hold
//
// This is a PRE-FIRE gate: run it before generating a kit, and re-run after editing any prompt.
// It is advisory-but-loud: exit code 1 if any BLOCK-level finding exists, so it can gate a script.
//
// Usage:
//   node scripts/check-prompt-coherence.mjs                     # every character in qa-boss/prompts/
//   node scripts/check-prompt-coherence.mjs ir48-hex-paper-lord # one character
//
// Real defects this would have caught BEFORE burning a render slot:
//   hollow-pale special_3 v1 "smoke spikes just in front of him"      -> rendered a flaming ROCKET
//   hollow-pale throw_a   v2 "CLAMPS onto an unseen enemy"            -> rendered a brown BALL in his fist
//   ir48       special_2 v1 "SLAPS it onto the air in front of him"   -> same detached-object pattern

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARSENAL = JSON.parse(readFileSync(join(ROOT, 'qa-boss', 'arsenal.json'), 'utf8'));
const PROMPT_DIR = join(ROOT, 'qa-boss', 'prompts');

/** Split a prompt .md into { state, body } blocks on the "## state" headings. */
function parseStates(md) {
  const out = [];
  const lines = md.split(/\r?\n/);
  let cur = null;
  for (const line of lines) {
    const m = /^##\s+([a-z0-9_]+)/i.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { state: m[1], body: [] };
    } else if (cur) {
      if (!line.startsWith('#')) cur.body.push(line); // skip comment lines
    }
  }
  if (cur) out.push(cur);
  return out.map((s) => ({ state: s.state, body: s.body.join(' ').trim() }));
}

function checkCharacter(id) {
  const file = join(PROMPT_DIR, `${id}.md`);
  if (!existsSync(file)) return { id, missing: true, findings: [] };
  const md = readFileSync(file, 'utf8');
  const states = parseStates(md);
  // Re-roll kits live beside the original as `<id>-REROLL.md`. Resolve them back to the base
  // character so the arsenal + per-character banned actions are still enforced — without this
  // a *-REROLL file silently gates in degraded mode and reports a false PASS.
  const baseId = id.replace(/-REROLL$/i, '');
  const def = ARSENAL.characters[id] || ARSENAL.characters[baseId] || {};
  const U = ARSENAL.universalBanned;
  const findings = [];

  for (const { state, body: rawBody } of states) {
    // Strip markdown TABLE rows before scanning. Re-roll kits carry a self-score table whose
    // "named shapes banned in the NEGATIVE block: beam / laser / orb / ..." row is documentation
    // of compliance, not prompt text — scanning it convicts a kit for proving it obeyed the rule.
    // A real prompt never contains a pipe-delimited table row, so this cannot mask a true defect.
    const body = rawBody.split('\n').filter((l) => !/^\s*\|/.test(l)).join('\n');
    const low = body.toLowerCase();
    // NOTE: a prompt may legitimately NEGATE a banned word ("NOT a beam", "no projectile").
    // Only flag an occurrence that is NOT inside a negation window.
    const negated = (idx) => {
      const win = low.slice(Math.max(0, idx - 40), idx);
      return /\b(not|never|no|nothing|does not|doesn't|without)\b[^.]*$/.test(win);
    };

    // WORD-BOUNDARY match (plain indexOf gave false positives: "absorbs" -> "orb",
    // "dropping into the blow" -> banned "dropping").
    const findWord = (phrase) => {
      const re = new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i');
      const m = re.exec(low);
      return m ? m.index + (m[1] ? m[1].length : 0) : -1;
    };

    for (const p of U.phrases) {
      const i = findWord(p);
      if (i !== -1 && !negated(i)) {
        findings.push({ state, level: 'BLOCK', kind: 'projectile-wording', hit: p,
          ctx: body.slice(Math.max(0, i - 55), i + p.length + 55).replace(/\s+/g, ' ') });
      }
    }
    for (const p of U.grabFraming.phrases) {
      const i = findWord(p);
      if (i !== -1 && !negated(i)) {
        findings.push({ state, level: 'BLOCK', kind: 'grab-framing', hit: p,
          ctx: body.slice(Math.max(0, i - 55), i + p.length + 55).replace(/\s+/g, ' '), fix: U.grabFraming.fix });
      }
    }
    // DETACHED-EFFECT PLACEMENT: an effect noun parked in SPACE rather than on him.
    // This is the exact "rocket" signature (hollow-pale sp3 v1, ir48 sp2 v1).
    if (/^special/i.test(state)) {
      const placedInSpace = /(in front of (?:him|her)|beside (?:him|her)|at (?:his|her) feet|onto the air|in the air)/i.exec(body);
      const anchored = U.requiredEffectAnchoring.mustContainOneOf.some((p) => low.includes(p));
      if (placedInSpace && !negated(placedInSpace.index)) {
        findings.push({ state, level: 'BLOCK', kind: 'detached-effect-placement', hit: placedInSpace[0],
          ctx: body.slice(Math.max(0, placedInSpace.index - 60), placedInSpace.index + 80).replace(/\s+/g, ' '),
          fix: 'Anchor the effect to the character: erupt AROUND HIS OWN BODY / flare ON the weapon in his hand / trace ALONG the blade.' });
      } else if (!anchored) {
        findings.push({ state, level: 'WARN', kind: 'unanchored-effect',
          hit: '(no explicit body/weapon anchoring phrase)',
          ctx: 'Effect location is not stated. Prefer naming where it lives so it cannot drift into open space.',
          fix: `Consider: ${U.requiredEffectAnchoring.mustContainOneOf.slice(0, 5).join(' / ')}` });
      }
    }
    // Per-character banned: explicit phrases only (no fuzzy head-word guessing).
    for (const b of def.banned || []) {
      const phrase = b.split(' (')[0].toLowerCase();
      if (phrase.split(' ').length > 3) continue; // prose note, not a matchable phrase
      const i = findWord(phrase);
      if (i !== -1 && !negated(i)) {
        findings.push({ state, level: 'WARN', kind: 'character-banned', hit: b,
          ctx: body.slice(Math.max(0, i - 50), i + phrase.length + 50).replace(/\s+/g, ' ') });
      }
    }
  }
  return { id, missing: false, states: states.length, findings, def };
}

const only = process.argv[2];
const ids = only
  ? [only.replace(/\.md$/, '')]
  : readdirSync(PROMPT_DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

let blocks = 0;
console.log('=== CHARACTER<->PROMPT COHERENCE GATE ===');
console.log('    (a melee roster: nothing launches, throws or fires a separate object)\n');
for (const id of ids) {
  const r = checkCharacter(id);
  if (r.missing) { console.log(`${id}: (no prompts file)`); continue; }
  const wields = (r.def.wields || []).join(' + ') || '(arsenal not declared)';
  const b = r.findings.filter((f) => f.level === 'BLOCK');
  const w = r.findings.filter((f) => f.level === 'WARN');
  blocks += b.length;
  const tag = b.length ? 'BLOCK' : w.length ? 'WARN ' : 'PASS ';
  console.log(`[${tag}] ${id}  (${r.states} states)  wields: ${wields}`);
  for (const f of r.findings) {
    console.log(`    ${f.level}  ${f.state}  ${f.kind}: "${f.hit}"`);
    console.log(`           ...${f.ctx}...`);
    if (f.fix) console.log(`           FIX: ${f.fix}`);
  }
  if (r.findings.length) console.log('');
}
console.log(blocks ? `\n${blocks} BLOCK finding(s) - fix the prompt BEFORE firing.` : '\nNo BLOCK findings.');
process.exit(blocks ? 1 : 0);
