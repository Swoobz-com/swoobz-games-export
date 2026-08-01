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
// ############################################################################################
// # KIT-LEVEL BLOCK MARKER (phase 108). A kit whose PLATE cannot support its acting lines must #
// # be impossible to fire BY ACCIDENT, not merely documented.                                  #
// #                                                                                            #
// # ir41-kasa-oni is the case that forced this. Its plate is FRONT-FACING — legs planted wide   #
// # and symmetric, shoulders and hips square — which the handoff calls unusable, because "a     #
// # frontal stance has no side, so it cannot be mirrored into agreement with the rest of the    #
// # kit". That WAS written down, in prose, at line 111 of the kit. And it changed nothing:      #
// # every acting line still demanded "side profile facing screen-right", the shared suffix      #
// # still added "NEVER rotates or turns to face the camera", and the file ASSEMBLED CLEANLY at  #
// # LEN=3990. check-prompt-sections reported it among the clean. A session working the queue    #
// # would have fired it and forced the model to break either the anchor lock (start_image pins  #
// # the frontal plate at f0) or the facing lock. There is no third option.                      #
// #                                                                                            #
// # A warning a tool cannot read is a warning that gets fired anyway. So: any line beginning    #
// # "BLOCKED:" makes the builder REFUSE and print the reason. Deliberately kit-level, not       #
// # state-level — a plate that cannot carry one acting line cannot carry thirteen.              #
// ############################################################################################
const BLOCK_MARKER = /^\s*(?:⛔\s*)?BLOCKED:\s*(.+)$/m;

const src = fs.readFileSync(file, 'utf8');

// Refuse a BLOCKED kit before any assembly work. Exit 3 so callers can tell "deliberately blocked"
// apart from a real build failure (exit 1) — check-prompt-sections.mjs relies on that distinction to
// keep the gate green while still refusing to let the kit fire.
{
  const m = src.match(BLOCK_MARKER);
  if (m) {
    process.stderr.write(
      'BLOCKED: ' + m[1].trim() + '\n' +
      '  file  : ' + file + '\n' +
      '  This kit cannot be fired. The block is a property of the PLATE or the ruling, not of the\n' +
      '  acting line, so rewording a state will not clear it — fix the plate or get the ruling,\n' +
      '  then delete the BLOCKED: line.\n',
    );
    process.exit(3);
  }
}

// Blockquote sections: "Shared prefix:" / "Shared suffix ...:" followed by "> " lines.
//
// THE LABEL IS MATCHED BY REGEX, NEVER BY AN EXACT LITERAL (phase 173) — the same rule ADDON_LABEL
// already states below, which was applied to the add-on and NOT to the two shared blocks. The call
// sites were asymmetric: the suffix was looked up as the loose 'Shared suffix' (so a parenthetical
// after it was tolerated) while the prefix was looked up as the strict literal 'Shared prefix:'.
// Kits that write "Shared prefix (identity + magenta chroma, every prompt):" therefore threw
// `no section: Shared prefix:` and COULD NOT BUILD A SINGLE STATE — while passing
// check-prompt-sections completely clean, because that gate never tries to build them.
// Found by fire-queue.mjs: kitsune-tanto, sora-yari and ir41-kasa-oni built nothing, and sora-yari
// has 10 clips already wired, i.e. it was fired through some earlier path and then quietly became
// unbuildable by its own name. Silent, and it hides an entire character from the queue.
function quoted(label) {
  const re = label instanceof RegExp ? label : new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const m = src.match(re);
  if (!m) throw new Error('no section: ' + label);
  const lines = src.slice(m.index).split('\n').slice(1);
  const out = [];
  for (const l of lines) {
    if (l.startsWith('>')) out.push(l.replace(/^>\s?/, '').trim());
    else if (out.length) break;
  }
  return out.join(' ');
}

// The add-on's LABEL, matched by REGEX and never by an exact literal — see the BUG FOUND note below.
// Shared by paragraphAfter() (which reads the add-on) and EDITORIAL_BLOCK (which refuses to let that
// same label be swallowed into an acting line), so the two can never drift apart.
const ADDON_LABEL = /SPECIAL[^:\n]*add-on[^:\n]*:/i;

// ACTION add-on — appended to every state EXCEPT idle. Opt-in per kit: absent from most files, and
// silently skipped when absent (unlike the SPECIAL add-on, whose absence on a special is a WARN).
//
// WHY IT EXISTS (phase 102). eclipse-ofuda.md carried, since session 5, a ★ note reading "ECLIPSE
// ONE-ACTION LOCK ... APPEND to EVERY remaining v2/v3 acting line before firing". There was no
// mechanism to append anything, so it never shipped on ANY of eclipse's 13 states — measured:
// 0/13 contained the word "repeat" or "spin". The lock exists because strike_a v2 rendered as a
// SPINNING MULTI-ATTACK KATA, and the shared suffix bans rotation but says nothing about REPEATING
// the beat, so nothing in any eclipse prompt ever forbade the thing that actually happened.
//
// WHY IT SKIPS idle. The lock's payload is "ONE single action and nothing else ... does NOT repeat
// the move". An idle is a LOOP: repetition is its entire job. Appending it there would be the same
// acting-line-vs-law contradiction class as the five ko defects (phases 93-94). Every other state
// is a one-shot, so every other state takes it.
const ACTION_LABEL = /ACTION add-on[^:\n]*:/i;

// "SPECIAL add-on:" is a plain paragraph, not a blockquote.
// Matches the add-on heading by REGEX, not by an exact literal.
// BUG FOUND 2026-07-29: this used src.indexOf('SPECIAL add-on:'). satoshi-odachi.md and
// eclipse-ofuda.md head theirs "SPECIAL suffix add-on (the 3 specials only; Tim's
// contain-in-frame rule):", which does not contain that literal — so BOTH characters' specials
// were assembled with NO add-on at all and Tim's explicit contain-in-frame rule was silently
// dropped from every special they ever fired. satoshi carries 5 containment BLOCKs on record.
// A silent '' return is exactly the failure mode that hides this, so the caller now asserts.
// The add-on is normally a plain paragraph, but eclipse-ofuda.md and satoshi-odachi.md write theirs as
// a markdown BLOCKQUOTE. This used to keep the '>' markers, so the literal characters were shipped to
// the model as prompt text — "curling burning paper and dark ash, opaque with visible edges > NEVER a
// glow". That has been true of EVERY special those two characters ever fired. Strip the markers here
// rather than reformatting the files, so any future blockquote add-on is handled too.
function paragraphAfter(re) {
  const m = src.match(re);
  if (!m) return '';
  const rest = src.slice(m.index + m[0].length);
  const end = rest.search(/\n\s*\n/);
  const seg = end < 0 ? rest : rest.slice(0, end);
  return seg.split('\n').map((l) => l.replace(/^\s*>\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();
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

// ############################################################################################
// # THE TRAILING-EDITORIAL RULE (phase 96). THIRD INSTANCE OF THE SAME FAMILY.                #
// #                                                                                            #
// # A section used to be "everything from '^## <state>' until the NEXT '^## '". But these      #
// # files also carry EDITORIAL blocks that are NOT '##'-headed — the shared prefix/suffix      #
// # blockquotes, the "SPECIAL add-on:" block, ★-marked operator notes, bare '---' rules. When  #
// # such a block trails the LAST state section before the next heading, the old rule swallowed #
// # it whole and shipped it to the video model AS PROMPT TEXT. MEASURED, 4 of 245 assembled    #
// # prompts, all of them shipping:                                                             #
// #   eclipse-ofuda  victory   -> the "★ ECLIPSE ONE-ACTION LOCK ... APPEND to EVERY remaining #
// #                               v2/v3 acting line before firing:" note (an instruction ABOUT #
// #                               the prompt, naming a PAST FAILURE), six literal '>' markers, #
// #                               AND the whole SPECIAL add-on — on a state that is not a      #
// #                               special.                                                      #
// #   ir37-pink-tessen strike_b -> the ENTIRE "Shared prefix:" block, the ENTIRE "Shared        #
// #                               suffix ...:" block (including its "NOTE: v1 idle FAILED" QA  #
// #                               prose) and the SPECIAL add-on, all with their '>' markers —  #
// #                               so that prompt carried the prefix twice, the suffix twice,   #
// #                               and ran 4523 chars against a ~2000 norm.                     #
// #   thorn-warden  victory     -> the SPECIAL add-on debris rule, on a non-special.           #
// #   eclipse-ofuda special_3   -> a literal '---'.                                            #
// #                                                                                            #
// # FIX: the body ENDS at the first editorial-block line, and the cut is announced on stderr   #
// # naming file, state, heading, what it hit and every line it dropped. It is a WARN, not a    #
// # throw, so a fire is never blocked by a prompt file's layout — but check-prompt-sections    #
// # turns the same condition into a hard gate failure, so it cannot ship silently.             #
// # GENERIC ON PURPOSE: keyed on markdown/editorial STRUCTURE, no character is special-cased.  #
// ############################################################################################
const EDITORIAL_BLOCK = [
  ['a markdown BLOCKQUOTE (in these files a "> " block is always shared prefix/suffix/add-on ' +
   'material, never acting prose)', /^\s*>/],
  ['a ★-marked operator note', /^\s*[★☆]/],
  ['a "Shared prefix/suffix" block label', /^\s*Shared\s+(?:prefix|suffix)\b/i],
  ['a "SPECIAL ... add-on:" block label', new RegExp('^\\s*(?:' + ADDON_LABEL.source + ')', 'i')],
  ['an "ACTION add-on:" block label', new RegExp('^\\s*(?:' + ACTION_LABEL.source + ')', 'i')],
  ['a markdown horizontal rule', /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/],
];

// Index of the first line that opens an editorial block, or null if the section is all acting prose.
function firstEditorialLine(lines) {
  for (let i = 0; i < lines.length; i++) {
    for (const [what, re] of EDITORIAL_BLOCK) if (re.test(lines[i])) return { at: i, what };
  }
  return null;
}

function sectionsFor(st) {
  const re = new RegExp(headingPattern(st), 'gm');
  const found = [];
  for (const m of src.matchAll(re)) {
    const rest = src.slice(m.index + m[0].length);
    const nextH = rest.search(/^## /m);
    const seg = nextH < 0 ? rest : rest.slice(0, nextH);
    const lines = seg.split('\n').filter((l) => !l.trimStart().startsWith('#'));
    const flat = (ls) => ls.join(' ').replace(/\s+/g, ' ').trim();
    // The FULL body — editorial tail included — is what the history/analysis disqualification below
    // still judges, exactly as before. Keeping the trim OUT of that decision is deliberate: it
    // guarantees the trailing-editorial rule can never change WHICH section gets picked, only what
    // is emitted from the section already picked.
    const body = flat(lines);
    const heading = m[0].trim();
    const tells = TELEMETRY_TELL.filter((r) => r.test(body));
    const deadHead = DEAD_HEADING.test(heading);
    // Version rank from the heading: "## attack_strike_b v4 (...)" -> 4; a bare heading -> 1.
    const vm = heading.match(/\bv(\d+)\b/);
    const cut = firstEditorialLine(lines);
    found.push({
      heading, body, tells, deadHead, v: vm ? Number(vm[1]) : 1,
      acting: cut ? flat(lines.slice(0, cut.at)) : body,
      dropped: cut ? lines.slice(cut.at).filter((l) => l.trim()) : [],
      droppedWhat: cut ? cut.what : null,
    });
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
  if (chosen.dropped.length) {
    // A section that is editorial from its FIRST line has no acting prose at all. Emitting '' there
    // would hand the model a prefix+suffix with no action in between — silent, and worse than the
    // leak. Refuse instead.
    if (!chosen.acting) {
      throw new Error(
        'REFUSING to build "' + st + '" from ' + file + ': ' + chosen.heading + ' has NO acting prose ' +
        'before its first editorial block (' + chosen.droppedWhat + '), so there is nothing to fire.\n' +
        chosen.dropped.slice(0, 6).map((l) => '    | ' + l.trimEnd()).join('\n'));
    }
    process.stderr.write(
      'WARN: TRIMMED trailing editorial — ' + file + ' [' + st + '] ' + chosen.heading + '\n' +
      '  This section runs on past its acting line into ' + chosen.droppedWhat + '. The ' +
      chosen.dropped.length + ' line(s) below were about to be sent to the model AS PROMPT TEXT and ' +
      'were CUT:\n' +
      chosen.dropped.map((l) => '    | ' + l.trimEnd()).join('\n') + '\n' +
      '  FIX THE FILE: that block belongs above the first "## " state heading, or under a "## " ' +
      'heading of its own — otherwise it keeps attaching itself to whichever state precedes it.\n');
  }
  return chosen.acting;
}

// THE KO-SUFFIX RULE. `ko` is the ONE off-anchor state: the fighter DROPS the weapon and ENDS
// collapsed. Two sentences of the shared suffix directly contradict that — the weapon lock ("keeps
// X in his hands the whole time and never drops or swaps them") and the anchor lock ("begins and
// ends on the EXACT same reference stance"). Pasting the suffix verbatim on a ko hands the model
// two mutually exclusive orders and it will obey the wrong one. lady-kurotachi.md carries this as a
// hand-written operator note ("[Use ko-suffix: drop the ... lines]"); ir48-hex-paper-lord.md does
// NOT, so the rule is enforced HERE instead of relying on whoever fires remembering it.
// ############################################################################################
// # TWO MORE ko CONTRADICTIONS, FOUND phase 90 — and both were SHIPPING.                      #
// #                                                                                            #
// # 1. THE IDENTITY LOCK WAS BEING DELETED AS COLLATERAL. The weapon-lock rule below matched   #
// #    `[^.]*` back to the previous full stop, i.e. the WHOLE SENTENCE. But most files weld    #
// #    the identity lock and the weapon lock into ONE sentence:                                #
// #      oni : "His skin, horns, rope ... stay EXACTLY the same the entire clip, AND he keeps  #
// #             the tetsubo in his hands ... and never drops or swaps it."                     #
// #      ir37: "Her glossy black armor ... stay EXACTLY the same the entire clip; SHE keeps    #
// #             the war-fan in her right hand ... and never drops or swaps them."              #
// #    So every ko in the roster lost its "stay EXACTLY the same" instruction entirely.        #
// #    MEASURED on oni's ACCEPTED ko: 0 occurrences of the identity lock in the built prompt.  #
// #    The clip happened to come back on-model, which is precisely why nobody caught it.       #
// #    FIX: strip only the weapon-lock CLAUSE when it trails a separator, and fall back to     #
// #    whole-sentence removal only when the weapon lock stands alone.                          #
// #                                                                                            #
// # 2. THE FEET LOCK CONTRADICTS A COLLAPSE. "HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE  #
// #    CLIP" survived the strip and sat in the same prompt as "he crumples forward and down    #
// #    onto the ground, coming to rest fully prone". A ko cannot keep its feet flat for the    #
// #    entire clip. The anti-jump content is still wanted, so this REWORDS rather than         #
// #    deletes: feet never LEAVE the ground (true through a collapse) instead of staying FLAT  #
// #    for the whole clip (false the moment he goes down).                                     #
// #                                                                                            #
// # Both were found by a kit-writing agent reading an assembled ko end to end — no gate shows  #
// # either, which is the fifth time that has been the only thing that worked.                  #
// ############################################################################################
function koSuffix(s) {
  return s
    // 1a. weapon lock as a TRAILING CLAUSE — remove the clause, keep the sentence (and with it
    //     the identity lock that shares it).
    .replace(/\s*[,;]\s*(?:and\s+)?(?:he|she|they)\s+keeps?\s+the[^.]*never drops? or swaps?[^.]*(?=\.)/gi, '')
    // 1b. weapon lock as a STANDALONE SENTENCE — remove the whole sentence, as before.
    //     The "in his/her/their hands" phrase is OPTIONAL. It used to be required, which made the
    //     rule silently fragile: minotaur-axe's writer nearly shipped "keeps the axe in BOTH hands",
    //     which does not match `in (his|her|their) hands` and would have produced a ko ordering him
    //     to keep hold of an axe the same prompt tells him to drop. The load-bearing literal is
    //     "never drops or swaps" — key on that, and treat the grip phrasing as free text.
    .replace(/(?:^|(?<=\.))[^.]*keeps? the [^.]*never drops? or swaps?[^.]*\.\s*/gi, ' ')
    // 2. the feet lock: keep the anti-jump meaning, drop the "flat for the ENTIRE clip" clause
    //    that a prone collapse necessarily breaks.
    .replace(/(HIS|HER|THEIR) FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP/gi,
      (_m, p) => `${p.toUpperCase()} FEET NEVER LEAVE THE GROUND AT ANY POINT IN THE CLIP`)
    .replace(/[^.]*begins and ends on the EXACT same reference stance\.\s*/gi, ' ')
    // 3. THE DEBRIS-LAW TAIL. The global suffix ends "...the last frame shows ONLY the fighter and
    //    what the fighter holds, exactly as the first frame does." On a ko the fighter HOLDS NOTHING
    //    — the weapon is on the ground beside him by spec — so that clause is a literal order to
    //    make his own dropped weapon disappear, and "exactly as the first frame does" re-asserts the
    //    anchor that rule 2 just stripped. Rewritten to keep the part that matters (no shed material
    //    left in frame) and drop the part that only makes sense for a standing return.
    .replace(/;?\s*the last frame shows ONLY the fighter and what the fighter holds[^.]*\./gi,
      '; at the end there is no shed, torn, broken or kicked-up material anywhere in the shot.')
    // 4. THE STANCE-WIDTH CLAUSE. "he keeps his stance narrow and never spreads wider than about one
    //    and a half times his standing width" also survives, and a PRONE body measures ~1.66x its
    //    standing width — so the one state the ko rewrite exists to protect is the one state that
    //    clause contradicts. Scoped to standing: vacuous once he is down, unchanged for the other 12.
    //    TWO DEFECTS IN THIS REWRITE, both fixed in phase 103 and both found by a kit-writing agent
    //    READING an assembled ko — never by a gate:
    //    (a) IT DOUBLED ITS OWN SCOPE. A kit that had already scoped the clause itself ("WHILE HE IS
    //        ON HIS FEET he keeps his stance narrow and never spreads wider than ...") kept that
    //        prefix, because the match started at "he keeps", and then got a second one bolted on.
    //        MEASURED on skullrend-orcus's shipping ko: "WHILE HE IS ON HIS FEET WHILE ON HIS FEET he
    //        keeps his stance narrow". The optional leading group now swallows a pre-existing scope.
    //    (b) IT HARDCODED MALE PRONOUNS. The replacement was a fixed string, so a female fighter whose
    //        suffix reads "she keeps her stance narrow ..." would have had "he/his" injected into her
    //        ko. NO CURRENT KIT WAS AFFECTED — verified: eclipse, hollow-pale, ir37 and lady-kurotachi
    //        carry no stance clause in their ko at all — but every new female kit written to the
    //        canonical wording would have been. The pronouns are now CAPTURED and carried through.
    .replace(
      /(?:WHILE\s+(?:he|she|they)\s+(?:is|are)\s+ON\s+(?:his|her|their)\s+FEET\s+)?(?:and )?(he|she|they) keeps? (his|her|their) stance narrow and never spreads wider than[^.;]*/gi,
      (_m, subj, poss) => {
        const s = subj.toLowerCase(), p = poss.toLowerCase();
        return `WHILE ${s.toUpperCase()} ${s === 'they' ? 'ARE' : 'IS'} ON ${p.toUpperCase()} FEET ` +
               `${s} keeps ${p} stance narrow`;
      })
    .replace(/\s+/g, ' ')
    .trim();
}

const parts = [quoted(/^Shared prefix[^:\n]*:/mi), stateBody(state)];
if (state.startsWith('special')) {
  // Accepts "SPECIAL add-on:" and "SPECIAL suffix add-on (...):" alike. Same regex the
  // trailing-editorial rule uses, so what is APPENDED here and what is REFUSED there stay identical.
  const addon = paragraphAfter(ADDON_LABEL);
  if (addon) parts.push(addon);
  else process.stderr.write(
    'WARN: no SPECIAL add-on paragraph found in ' + file + ' — the contain-in-frame rule is NOT ' +
    'in this prompt. Add a "SPECIAL add-on:" paragraph before firing a special.\n');
}
if (state !== 'idle') {
  // Opt-in and silent when absent — only kits that declare an ACTION add-on get one. See the
  // ACTION_LABEL comment for why idle is the one state excluded.
  const action = paragraphAfter(ACTION_LABEL);
  if (action) parts.push(action);
}
const suffix = quoted(/^Shared suffix[^:\n]*:/mi);
parts.push(state === 'ko' ? koSuffix(suffix) : suffix);

const prompt = parts.join(' ').replace(/\s+/g, ' ').trim();
process.stdout.write(prompt + '\n');
process.stderr.write('LEN=' + prompt.length + '\n');
