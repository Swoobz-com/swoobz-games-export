#!/usr/bin/env node
// ############################################################################################
// # THE GUARD THAT SHOULD HAVE EXISTED FOUR MISTAKES AGO (phase 179).                         #
// #                                                                                          #
// # Screening verdicts lived ONLY as prose in qa-boss/anchors/MK-FINAL-WAVE2-SCREEN.md. No    #
// # tool read them, so every survey built from the FILESYSTEM ("which plates have no kit?")   #
// # was structurally blind to them. That failed four times:                                   #
// #   nurikabe-shield  agent stopped mid-write (TIER C, Tim-gated)                            #
// #   kira-foxflare    a FULL KIT was written, verified and committed for a REJECTED char     #
// #   umbra-jelly      agent dispatched and stopped (view reject)                             #
// #   drake-glaive     agent dispatched and stopped (baked emissive, rejected phase 109)      #
// # The prose ledger literally contained a warning about this exact failure. Prose warnings   #
// # do not stop dispatches; a tool does.                                                      #
// #                                                                                          #
// # IT DEFAULTS TO REFUSE. An unknown character is REFUSED, not allowed — because "absent     #
// # from the reject list" most often means "never screened", and 50% of numerically-clean     #
// # plates fail the view. Permission must be positive and on the record.                      #
// #                                                                                          #
// # usage: node qa-boss/may-i-write-kit.mjs <character-slug> [...]                            #
// #        node qa-boss/may-i-write-kit.mjs --all      (audit every kit already on disk)      #
// ############################################################################################
import fs from 'node:fs';
import path from 'node:path';

const LEDGER = 'qa-boss/ROSTER-VERDICTS.json';
const PROMPTS = 'qa-boss/prompts';

let ledger;
try { ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')); }
catch (e) {
  console.error(`ERROR: cannot read ${LEDGER} (${e.code || e.message}) — refusing to answer.`);
  console.error('Without the ledger this tool cannot distinguish "cleared" from "never screened".');
  process.exit(2);
}
const V = ledger.verdicts || {};
// Match case/separator-insensitively: the ledger mixes "Sol Ofuda" and "kira-foxflare" because the
// prose does, and a lookup miss here would silently read as "unknown" and refuse a cleared char.
const norm = (s) => s.toLowerCase().replace(/[\s_]+/g, '-');
const INDEX = new Map(Object.entries(V).map(([k, v]) => [norm(k), { name: k, ...v }]));

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node qa-boss/may-i-write-kit.mjs <character-slug> [...] | --all');
  process.exit(2);
}

let names = args;
if (args.includes('--all')) {
  names = fs.readdirSync(PROMPTS)
    .filter((f) => f.endsWith('.md') && !/-REROLL\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
  console.log(`auditing ${names.length} kits already on disk against ${LEDGER}\n`);
}

const VERDICT = {
  OK:       { go: true,  mark: '✔ WRITE',   note: '' },
  UNVIEWED: { go: false, mark: '◐ VIEW IT FIRST', note: 'numbers are clean but nobody has LOOKED. 50% of numerically-clean plates fail the view — viewing is not optional and is not a formality.' },
  TIM:      { go: false, mark: '⏸ TIM CALL', note: 'gated on a ruling. A fresh measurement is NOT a fresh decision — do not reopen this unilaterally.' },
  REJECTED: { go: false, mark: '⛔ REJECTED', note: 'do not write a kit. Reopening a rejection is a DECISION to be taken explicitly and recorded, never a side effect of a survey.' },
};

// A character with WIRED CLIPS is self-evidently cleared — shipping accepted clips is stronger
// empirical evidence than any screen, and those decisions long predate this ledger. Without this,
// --all reported 30 of 33 REFUSED, almost all of them characters with 13 accepted clips each. A
// guard that cries wolf 30 times gets ignored, which is precisely how the PROSE warning failed. So
// refuse-by-default still governs anything NEW, while the established roster is grandfathered and
// reported separately instead of drowning the real findings.
const WIRED = 'public/assets/characters';
const wiredCount = (c) => {
  try { return fs.readdirSync(path.join(WIRED, c)).filter((f) => f.endsWith('.webm')).length; }
  catch { return 0; }
};

let refused = 0, grandfathered = [];
for (const raw of names) {
  const hit = INDEX.get(norm(raw));
  if (!hit) {
    const n = wiredCount(raw);
    if (n > 0) { grandfathered.push({ c: raw, n }); continue; }
    refused++;
    console.log(`⛔ REFUSED        ${raw}`);
    console.log(`                  NOT IN THE LEDGER and NOTHING WIRED. This is a refusal, not an`);
    console.log(`                  oversight: absent almost always means NEVER SCREENED. Screen it, view`);
    console.log(`                  it at full size, record the verdict in ${LEDGER} and in`);
    console.log(`                  the prose ledger, then ask again.\n`);
    continue;
  }
  const v = VERDICT[hit.status] || { go: false, mark: `? ${hit.status}`, note: 'unrecognised status — treated as refused.' };
  if (!v.go) refused++;
  console.log(`${v.mark.padEnd(16)} ${hit.name}`);
  console.log(`                  ${hit.why}`);
  if (v.note) console.log(`                  → ${v.note}`);
  console.log();
}

if (grandfathered.length) {
  console.log(`ⓘ ${grandfathered.length} grandfathered — not in the ledger, but they have WIRED CLIPS, which is`);
  console.log(`  stronger evidence than any screen. Not a finding:`);
  console.log(`  ${grandfathered.map((g) => `${g.c}(${g.n})`).join(' ')}\n`);
}
if (refused) {
  console.error(`${refused} of ${names.length} REFUSED. Do not dispatch a kit-writing agent for those.`);
  process.exit(1);
}
console.log(`all ${names.length} cleared (or grandfathered).`);
