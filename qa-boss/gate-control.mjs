// GATE CONTROL — run a character's ALREADY-SHIPPED clips through check-anchor-lock and print that
// character's CALIBRATION BASELINE, so a verdict on NEW clips can be read against the population the
// gate has already ACCEPTED.
//
// ############################################################################################
// # WHY THIS EXISTS. Session 30: check-anchor-lock reported 10 of 10 of lich-scythe's new      #
// # clips "break the anchor" at f0body 0.800-0.838 against its `>=0.90 ok` band. That was an   #
// # ARTIFACT, not 10 defects, and only a CONTROL could show it:                                #
// #                                                                                            #
// #   lich's already-SHIPPED, already-ACCEPTED attack-strike.webm scores f0body 0.851 and is    #
// #   ALSO reported "start drifts" by the same gate.                                           #
// #                                                                                            #
// # A shipped clip is an ACCEPTED clip. If accepted clips fail the band, the BAND is wrong for  #
// # that character — the clips are not. The cause is visible in the gate's own columns: lich's  #
// # f0all is 0.951-0.954 (fine) while f0body is 0.851 — the largest-connected-component "body"  #
// # heuristic mis-splits on a character whose scythe spans the frame. For lich, read `all`.     #
// # The SAME gate put thorn-warden's 11 shipped clips at 0.929-0.956, where it IS calibrated.   #
// # Same gate, opposite conclusion — and only the control tells you which case you are in.      #
// #                                                                                            #
// # Repo law §0.10: a relative measurement means nothing until a control has been through it.   #
// # HANDOFF-STREETFIGHTER.md:137-138 — "Before trusting ANY per-character gate verdict, run     #
// # that character's already-shipped clips through it as a control."                            #
// ############################################################################################
//
// A BARE RUN IS A NO-OP THAT EXITS 1 (repo law §0.4 — no repo .mjs may do work with no argv).
//   Usage: node qa-boss/gate-control.mjs --char <id> [--all] [--raw]
//          node qa-boss/gate-control.mjs --all
//
// READ-ONLY BY CONSTRUCTION. This file spawns check-anchor-lock.mjs as a CHILD PROCESS and parses
// its stdout. It contains NO copy of the gate's measurement logic (a re-implementation would be a
// second, differently-calibrated gate and would defeat the entire point of a control), it never
// imports or patches it, and it writes NOTHING — no asset, no report file, no temp file.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[/]+$/, '');
const GATE = `${ROOT}/qa-boss/check-anchor-lock.mjs`;
const CHARS = `${ROOT}/public/assets/characters`;

// The gate's OWN documented bands (check-anchor-lock.mjs:26 and its verdict ladder at :187-190).
// Mirrored here ONLY to describe them in the report; nothing here re-derives a verdict.
const OK = 0.90;      // f0 >= 0.90 => ok
const BROKEN = 0.80;  // f0 < 0.80 => START POSE BROKEN ; fLAST < 0.80 => END pose broken
// median = sorted[n>>1] — the UPPER median, deliberately the same convention check-anchor-lock uses
// at :154 and :156, so a number printed here can be re-derived against the gate's own arithmetic.
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null);
const f3 = (v) => (v === null || v === undefined ? '  n/a' : v.toFixed(3));

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };

const roster = fs.existsSync(CHARS)
  ? fs.readdirSync(CHARS, { withFileTypes: true }).filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((c) => fs.readdirSync(`${CHARS}/${c}`).some((f) => f.endsWith('.webm')))
      .sort()
  : [];

const one = flag('--char');
const all = argv.includes('--all');
const raw = argv.includes('--raw');

if (!one && !all) {
  console.error('usage: node qa-boss/gate-control.mjs --char <id> [--raw]');
  console.error('       node qa-boss/gate-control.mjs --all');
  console.error(`  --char must be one of: ${roster.join(', ') || '(no character dirs with .webm found)'}`);
  process.exit(1);
}
if (one && !roster.includes(one)) {
  console.error(`unknown --char ${one}; shipped character dirs are: ${roster.join(', ')}`);
  process.exit(1);
}
const targets = one ? [one] : roster;

// ---------------------------------------------------------------------------------------------
// Parse the gate's table. Row format is fixed by check-anchor-lock.mjs:196-197 —
//   name.padEnd(30) + f0body(8) + fLASTbody(10) + ' |' + f0all(7) + fLASTall(9) + '   ' + verdict
const ROW = /^(\S+\.webm)\s+(\d\.\d{3})\s+(\d\.\d{3})\s+\|\s+(\d\.\d{3})\s+(\d\.\d{3})\s{2,}(.*\S)\s*$/;
// The degenerate-anchor path never reaches that table. Since the rows-printing change it emits a
// two-column all-pixel table instead (f0 vs anchor, and that clip's median IoU against its peers).
const DEGROW = /^(\S+\.webm)\s+(\d\.\d{3})\s+(\d\.\d{3})\s*$/;

function runGate(char) {
  const r = spawnSync('node', [GATE, `${CHARS}/${char}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = (r.stdout || '') + (r.stderr || '');
  const lines = out.split(/\r?\n/);
  const rows = [];
  const degRows = [];
  const decodeFailed = [];
  for (const l of lines) {
    const m = ROW.exec(l);
    if (m) { rows.push({ clip: m[1], f0body: +m[2], fLASTbody: +m[3], f0all: +m[4], fLASTall: +m[5], verdict: m[6] }); continue; }
    const d = DEGROW.exec(l);
    if (d) { degRows.push({ clip: d[1], f0all: +d[2], peerMed: +d[3] }); continue; }
    if (/DECODE FAILED/.test(l)) decodeFailed.push(l.trim().split(/\s+/)[0]);
  }
  const anchorLine = lines.find((l) => /^anchor = /.test(l)) || '';
  const anchorClip = (anchorLine.match(/^anchor = (\S+)/) || [])[1] || null;
  const summary = lines.filter((l) => /break the anchor|kit anchor-locked\./.test(l)).pop() || null;
  return {
    exit: r.status, out, rows, degRows, decodeFailed, anchorClip, summary,
    degenerate: /DEGENERATE ANCHOR/.test(out),
    noIdle: /cannot establish the kit anchor/.test(out),
    degMedians: (out.match(/median IoU ([\d.]+)[\s\S]*?median ([\d.]+)\)/) || []).slice(1).map(Number),
  };
}

// ---------------------------------------------------------------------------------------------
function report(char) {
  const shipped = fs.readdirSync(`${CHARS}/${char}`).filter((f) => f.endsWith('.webm')).sort();
  console.log('='.repeat(104));
  console.log(`CONTROL: ${char}   ${shipped.length} SHIPPED clip(s) under public/assets/characters/${char}`);
  console.log('  Every clip here is already WIRED and ACCEPTED, so it defines this character\'s NORMAL,');
  console.log('  not its defects. A shipped clip that FAILS the gate convicts the BAND, not the clip.');
  console.log('='.repeat(104));

  const g = runGate(char);
  if (raw) { console.log('--- check-anchor-lock.mjs raw output ---'); console.log(g.out.replace(/\s*$/, '')); console.log('--- end raw ---'); }
  console.log(`gate: node qa-boss/check-anchor-lock.mjs public/assets/characters/${char}   -> exit ${g.exit}`);
  console.log(`gate says: ${g.summary || (g.degenerate ? 'DEGENERATE ANCHOR — refused to judge the kit' : g.noIdle ? 'no idle clip — no anchor' : '(no summary line)')}`);
  console.log('');

  if (g.noIdle) {
    console.log('⛔ NO CONTROL POSSIBLE — the gate cannot even establish an anchor for this character.');
    console.log('   No baseline exists; every anchor-lock verdict for this character is unfounded.');
    console.log('');
    return { char, state: 'no-anchor' };
  }

  if (!g.rows.length) {
    console.log('⛔ NO ROWS MEASURED — the gate reached a verdict WITHOUT scoring a single clip.');
    if (g.degenerate) {
      console.log('   It took the DEGENERATE-ANCHOR path (check-anchor-lock.mjs:157): the action clips agree');
      console.log(`   with each other (median peer IoU ${f3(g.degMedians[0])}) but all disagree with ${g.anchorClip} (median ${f3(g.degMedians[1])}),`);
      console.log('   so the gate refuses to judge and exits before the per-clip table is ever printed.');
      if (g.degRows.length) {
        console.log('');
        console.log('   Measured on that path (ALL-pixel only — the body columns are never computed there):');
        console.log('   ' + 'clip'.padEnd(30) + '   f0all   peerMED');
        for (const r of g.degRows) console.log('   ' + r.clip.padEnd(30) + f3(r.f0all).padStart(8) + f3(r.peerMed).padStart(10));
        const peers = g.degRows.filter((r) => r.clip !== g.anchorClip);
        const pv = peers.map((r) => r.peerMed), av = peers.map((r) => r.f0all);
        const pmed = med(pv);
        // A clip that does not even agree with its PEERS is not explained by the broken reference.
        const rogue = peers.filter((r) => pmed - r.peerMed > 0.25);
        console.log('');
        console.log(`   CALIBRATION BASELINE (peer-agreement, ${peers.length} non-anchor clip(s)):`);
        console.log(`     peer IoU   min ${f3(Math.min(...pv))}  median ${f3(pmed)}  max ${f3(Math.max(...pv))}   <- the kit's REAL cohesion`);
        console.log(`     vs anchor  min ${f3(Math.min(...av))}  median ${f3(med(av))}  max ${f3(Math.max(...av))}   <- what the broken reference reports`);
        console.log('');
        console.log(`   VERDICT: the SHIPPED population agrees with itself at median ${f3(pmed)} — a healthy anchor-locked kit —`);
        console.log(`            while scoring median ${f3(med(av))} against ${g.anchorClip}. The REFERENCE is the outlier.`);
        if (rogue.length) {
          console.log(`   ⚠ BUT ${rogue.length} clip(s) do not agree with the PEER majority either, which the broken anchor does NOT explain:`);
          for (const r of rogue) console.log(`       ${r.clip.padEnd(24)} peerMED ${f3(r.peerMed)}  vs peer median ${f3(pmed)}  <- REAL start-pose defect candidate`);
          console.log('     (f0 is checked for EVERY clip including ko — only ko\'s END is exempt by spec — so a ko listed');
          console.log('      here is a genuine finding, not the documented exception.)');
        }
        console.log(`   READ COLUMN: neither — there is no usable band for ${char} until the anchor is re-pointed.`);
        console.log('            Judge new clips against the PEER population, or fix/re-point the idle clip first.');
      }
    }
    console.log('');
    return { char, state: g.degenerate ? 'degenerate' : 'no-rows', peerMed: g.degRows.length ? med(g.degRows.filter((r) => r.clip !== g.anchorClip).map((r) => r.peerMed)) : null };
  }

  // POPULATIONS, and exactly why each row is in or out — nothing is dropped silently.
  //  * the anchor clip's own f0 is 1.000 BY CONSTRUCTION (it IS the reference), so it would drag
  //    every f0 statistic upward and hide a low band. Excluded from the f0 columns, printed below.
  //  * `ko` ends collapsed on the ground BY SPEC (the gate exempts its end at :189), so its fLAST
  //    is ~0.2-0.35 by design. Excluded from the fLAST columns, printed below.
  const f0pop = g.rows.filter((r) => r.clip !== g.anchorClip);
  const endpop = g.rows.filter((r) => !/(^|[-_])ko/.test(r.clip));
  const excluded = [
    ...g.rows.filter((r) => r.clip === g.anchorClip).map((r) => `${r.clip} (IS the anchor: f0 = 1.000 by construction; its fLAST ${f3(r.fLASTbody)}body/${f3(r.fLASTall)}all IS real loop-closure signal and stays in the end population)`),
    ...g.rows.filter((r) => /(^|[-_])ko/.test(r.clip)).map((r) => `${r.clip} (ko ends down BY SPEC — fLAST ${f3(r.fLASTbody)}body/${f3(r.fLASTall)}all excluded from end stats; its f0 ${f3(r.f0body)}body stays in the f0 population)`),
  ];

  const cols = [
    { key: 'f0body', pop: f0pop, thr: OK, thrLabel: `<${OK.toFixed(2)}` },
    { key: 'f0all', pop: f0pop, thr: OK, thrLabel: `<${OK.toFixed(2)}` },
    { key: 'fLASTbody', pop: endpop, thr: BROKEN, thrLabel: `<${BROKEN.toFixed(2)}` },
    { key: 'fLASTall', pop: endpop, thr: BROKEN, thrLabel: `<${BROKEN.toFixed(2)}` },
  ];
  const stat = {};
  for (const c of cols) {
    const v = c.pop.map((r) => r[c.key]);
    stat[c.key] = {
      n: v.length, min: v.length ? Math.min(...v) : null, med: med(v), max: v.length ? Math.max(...v) : null,
      fails: c.pop.filter((r) => r[c.key] < c.thr).map((r) => `${r.clip} ${f3(r[c.key])}`),
      hardFails: c.pop.filter((r) => r[c.key] < BROKEN).map((r) => `${r.clip} ${f3(r[c.key])}`),
      thr: c.thr, thrLabel: c.thrLabel,
    };
  }

  console.log(`CALIBRATION BASELINE — ${char}`);
  console.log(`  f0 population    ${stat.f0body.n} clip(s)  (all shipped clips except the anchor itself)`);
  console.log(`  fLAST population ${stat.fLASTbody.n} clip(s)  (all shipped clips except ko, which ends down by spec)`);
  console.log('');
  console.log('  column'.padEnd(14) + 'min'.padStart(8) + 'median'.padStart(9) + 'max'.padStart(8) + '    band     fail / n');
  console.log('  ' + '-'.repeat(66));
  for (const c of cols) {
    const s = stat[c.key];
    console.log('  ' + c.key.padEnd(12) + f3(s.min).padStart(8) + f3(s.med).padStart(9) + f3(s.max).padStart(8) +
      ('  ' + s.thrLabel + ' fails').padEnd(16) + `${s.fails.length} / ${s.n}`);
  }
  if (g.decodeFailed.length) console.log(`  ⚠ ${g.decodeFailed.length} clip(s) DECODE FAILED and are in no population: ${g.decodeFailed.join(', ')}`);
  for (const e of excluded) console.log(`  excluded: ${e}`);
  console.log('');

  // NO CONTROL AT ALL. If the only shipped clip IS the anchor, the f0 population is empty and there
  // is NOTHING to calibrate against — the gate's 1.000 for idle-vs-itself is a tautology, not
  // evidence. SESSION30-GATE-REPORT.md:66-69 flags exactly this for gargoyle-spear. Saying "ok"
  // here would be the worst possible answer: an unfalsifiable pass.
  if (!stat.f0body.n) {
    console.log('  ⛔⛔ NO CONTROL EXISTS FOR THIS CHARACTER.');
    console.log(`  The only shipped clip is the anchor (${g.anchorClip}) itself, and its f0 score of 1.000 is`);
    console.log('  true BY CONSTRUCTION. There is no accepted population, so there is no measured band, so');
    console.log('  NO anchor-lock verdict on this character\'s new clips can be trusted from the number alone.');
    console.log('  Confirm every finding BY EYE at full size until a second clip of this character ships.');
    console.log('');
    return { char, state: 'no-control' };
  }

  // --- BAND-CONSISTENCY VERDICT, per column. -------------------------------------------------
  // A shipped clip is an accepted clip. So a shipped clip below the band is, on its face, evidence
  // AGAINST the band. The one thing that can rescue the band is a LONE EXTREME outlier — a single
  // clip sitting far below an otherwise healthy population is a real defect (hollow-pale's
  // special-b at 0.231 against a 0.906-0.988 population is exactly that), not a band problem.
  // Anything else — a failure close to the band, or more than one failure — means the band does not
  // describe this character.
  const EXTREME = 0.25; // sits >0.25 below the population median => a real outlier, not the band
  const verdicts = {};
  for (const c of cols) {
    const s = stat[c.key];
    if (!s.n) { verdicts[c.key] = { bad: false, note: 'empty population' }; continue; }
    const failing = c.pop.filter((r) => r[c.key] < c.thr);
    const extremes = failing.filter((r) => s.med - r[c.key] > EXTREME);
    const nearBand = failing.filter((r) => s.med - r[c.key] <= EXTREME);
    if (!failing.length) {
      console.log(`  VERDICT ${c.key.padEnd(10)} ok — all ${s.n} shipped clip(s) sit inside the gate's own band (min ${f3(s.min)} >= ${c.thr.toFixed(2)}).`);
      console.log(`  ${' '.repeat(19)}The band DESCRIBES this character; a new clip failing this column is a real finding.`);
      verdicts[c.key] = { bad: false, fails: 0 };
    } else if (nearBand.length) {
      console.log(`  VERDICT ${c.key.padEnd(10)} ⛔⛔ MISCALIBRATED — ${failing.length} of ${s.n} SHIPPED (= ALREADY ACCEPTED) clip(s) FAIL the gate's own ${c.thrLabel} band.`);
      for (const r of nearBand) console.log(`  ${' '.repeat(19)}  ${r.clip} ${f3(r[c.key])}  (population median ${f3(s.med)}) — the gate calls this "${r.verdict.slice(0, 46)}"`);
      console.log(`  ${' '.repeat(19)}These clips SHIPPED. They cannot be defects and failures at the same time, so`);
      console.log(`  ${' '.repeat(19)}${f3(s.min)}-${f3(s.max)} is simply ${char}'s NORMAL on this column, not a defect band.`);
      console.log(`  ${' '.repeat(19)}⛔ DO NOT TRUST any NEW-clip verdict read off ${c.key} for ${char}.`);
      verdicts[c.key] = { bad: true, fails: failing.length, near: nearBand.length, min: s.min, max: s.max, list: s.fails };
    } else {
      console.log(`  VERDICT ${c.key.padEnd(10)} band holds, ${extremes.length} LONE OUTLIER — ${extremes.map((r) => `${r.clip} ${f3(r[c.key])}`).join(', ')}`);
      console.log(`  ${' '.repeat(19)}sits >${EXTREME} below the population median ${f3(s.med)} (rest of the population ` +
        `${f3(med(c.pop.filter((r) => !extremes.includes(r)).map((r) => r[c.key])))} median). That shape is a REAL DEFECT in that clip,`);
      console.log(`  ${' '.repeat(19)}not a miscalibrated band — the band still describes the other ${s.n - extremes.length} shipped clip(s).`);
      verdicts[c.key] = { bad: false, fails: failing.length, outlier: true, list: s.fails };
    }
  }
  console.log('');

  // --- WHICH COLUMN SEPARATES THIS CHARACTER'S POPULATION BETTER? ----------------------------
  // The gate itself calls `body` the pose verdict (:183) — correct in general, because it discards
  // shed debris. But the largest-connected-component split is a heuristic, and on a character whose
  // weapon spans the frame it mis-splits and drags `body` down while `all` stays healthy. The tell
  // is a systematic body-vs-all gap in the SHIPPED population, which is measurable right here.
  const gaps = f0pop.map((r) => ({ clip: r.clip, g: r.f0all - r.f0body }));
  const worst = gaps.slice().sort((a, b) => Math.abs(b.g) - Math.abs(a.g))[0];
  const maxGap = worst ? Math.abs(worst.g) : 0;
  // If body and all never diverge on this character, the two columns are measuring the SAME thing and
  // "which column" is a non-question. Saying "read body" there would imply a choice that does not
  // exist and would hide the actual fault — a threshold cut too tight for this character.
  const sameCols = maxGap < 0.02;
  const bodyBad = verdicts.f0body?.bad, allBad = verdicts.f0all?.bad;
  let pick;
  if (bodyBad && !allBad) pick = 'all';
  else if (allBad && !bodyBad) pick = 'body';
  else if (sameCols) pick = 'either';
  else if (!bodyBad && !allBad) pick = stat.f0all.min > stat.f0body.min + 0.02 ? 'all' : 'body';
  else pick = 'neither';
  console.log(`  READ COLUMN: ${pick === 'neither' ? '⛔ NEITHER' : '`' + pick + '`'}`);
  console.log(`    f0body  fails ${stat.f0body.fails.length}/${stat.f0body.n}  min ${f3(stat.f0body.min)}   |   f0all fails ${stat.f0all.fails.length}/${stat.f0all.n}  min ${f3(stat.f0all.min)}`);
  console.log(`    body-vs-all gap in the shipped population: median ${f3(med(gaps.map((x) => x.g)))}  max ${f3(maxGap)} on ${worst ? worst.clip : 'n/a'}`);
  if (pick === 'all') console.log('    -> the largest-connected-component "body" split MIS-SPLITS on this character. Read `all`.');
  else if (pick === 'body') console.log('    -> `body` is the pose verdict here (it discards shed debris) and the shipped population supports it.');
  else if (pick === 'either') {
    console.log(`    -> body ≡ all on this character (max divergence ${f3(maxGap)}), so the COLUMN CHOICE IS IRRELEVANT here.`);
    if (bodyBad && allBad) {
      console.log('       This is NOT lich\'s body-mis-split failure mode — it is the THRESHOLD being too tight for this');
      console.log(`       character. Judge new clips against the measured band above (${f3(stat.f0body.min)}-${f3(stat.f0body.max)}), NOT against 0.90.`);
    } else {
      console.log('       Both columns agree and both sit inside the band — a genuinely well-calibrated character.');
    }
  } else if (pick === 'neither') console.log('    -> BOTH columns convict shipped clips AND they diverge. No column of this gate has a usable band here.');
  console.log('');
  return { char, state: 'ok', bodyBad, allBad, pick, sameCols, stat, verdicts, n: stat.f0body.n };
}

const results = targets.map(report);

if (targets.length > 1) {
  console.log('='.repeat(104));
  console.log('ROSTER SUMMARY — which characters this gate may be trusted on');
  console.log('='.repeat(104));
  console.log('char'.padEnd(22) + 'n'.padStart(3) + '  f0body min/med/max      f0all min/med/max      read   calibration');
  for (const r of results) {
    if (r.state !== 'ok') {
      const why = r.state === 'degenerate' ? `DEGENERATE ANCHOR — no rows measured; peer median ${f3(r.peerMed)}`
        : r.state === 'no-control' ? 'ONLY THE ANCHOR IS SHIPPED — no accepted population to calibrate against'
        : r.state === 'no-anchor' ? 'no idle clip — the gate cannot establish an anchor at all'
        : r.state;
      console.log(r.char.padEnd(22) + '  -  ' + why.padEnd(66) + ' none    ⛔ UNUSABLE');
      continue;
    }
    const b = r.stat.f0body, a = r.stat.f0all;
    const cal = r.bodyBad && r.allBad ? (r.sameCols ? '⛔ MISCALIBRATED — threshold too tight (body ≡ all)' : '⛔ MISCALIBRATED (both columns)')
      : r.bodyBad ? '⛔ MISCALIBRATED on body — read all'
      : r.allBad ? '⛔ MISCALIBRATED on all — read body'
      : 'ok';
    console.log(r.char.padEnd(22) + String(r.n).padStart(3) + '  ' +
      `${f3(b.min)}/${f3(b.med)}/${f3(b.max)}`.padEnd(22) + `${f3(a.min)}/${f3(a.med)}/${f3(a.max)}`.padEnd(22) +
      ' ' + r.pick.padEnd(8) + cal);
  }
  const broken = results.filter((r) => r.state !== 'ok' || r.bodyBad || r.allBad);
  console.log('');
  console.log(broken.length
    ? `${broken.length} of ${results.length} character(s) have a MISCALIBRATED or UNUSABLE anchor-lock band: ${broken.map((r) => r.char).join(', ')}`
    : `all ${results.length} character(s) have a calibrated band.`);
}
// This tool DIAGNOSES calibration; it is not itself a ship gate, so it exits 0 whenever it managed
// to measure. Exiting non-zero on "miscalibrated" would make a CI job treat a tooling fact as a
// content defect — the exact confusion this file exists to end. Exit 1 only if nothing was measured.
process.exit(results.every((r) => r.state === 'no-anchor') ? 1 : 0);
