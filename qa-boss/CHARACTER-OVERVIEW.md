# STANDOFF — CHARACTER OVERVIEW (measured)

**Snapshot: 2026-08-06 16:37 · HEAD `e946af2` · branch `phase-275-session30-harvest`.**
Every number below came from a command run against the working tree at that moment. A concurrent
session is firing re-rolls, so `qa-boss/raw/` and `qa-boss/SESSION30-FIRE-LEDGER.md` are moving
targets — the raw column is a snapshot, not a steady state. **Nothing in this file was inferred from
another document's claim; where a document and the disk disagree, §5 says so.**

---

## 0. STATUS VOCABULARY (fixed — every row uses exactly one)

| verdict | means |
|---|---|
| **SHIPPED 13/13** | 13 clips in `public/assets/characters/<id>/`, a `FighterDef` `.ts`, in the `FIGHTERS` registry, reachable at a campaign node. Nothing outstanding. |
| **SHIPPED (n/13)** | Registered and reachable in-game, but fewer than 13 states wired. Playable today. |
| **SHIPPED (house)** | `gorvak` / `volta` — always-available roster fighters on the older 12-clip standard and the legacy `assets/fighter-N-*.webm` paths, not `assets/characters/`. |
| **ASSETS COMPLETE, NOT WIRED** | All 13 states exist as shipped+staged files, but the kit is not in `public/` / not in a manifest. Re-rolls may still be outstanding. |
| **PARTIAL, NOT WIRED** | Some states staged/shipped, at least one state has no usable asset. |
| **RAW ONLY** | Generated `.mp4` on disk, nothing keyed, nothing wired. |
| **KIT ONLY** | Prompt kit written + anchor plate screened. Zero clips generated. |
| **PLATE ONLY** | Anchor plate exists. No kit, no clips. |
| **BLOCKED (reason)** | Cannot advance on work alone — an open Tim decision, an out-of-spec plate, or a hard tool refusal. Carries its own row. |

---

## 1. MASTER TABLE — characters with any asset or any engine presence (15)

Sorted most-complete first. `wired clips` = files in `public/assets/characters/<id>/` **that a
`FighterDef` actually references** (disk count in brackets when it differs).

| character | wired clips (public/) | engine `.ts`? | in roster/campaign? | staged (keyed) | raw canonical | prompt kit? | plate? | STATUS |
|---|---|---|---|---|---|---|---|---|
| **ir37-pink-tessen** | **13** / 13 on disk | ✅ registered · faces right · 13 cal · 9 contacts | node 7 BURNED PAGODA | 0 | 13 | ✅ | green + magenta | **SHIPPED 13/13** |
| **ir48-hex-paper-lord** | **13** / 13 on disk | ✅ registered · faces right · 13 cal · 9 contacts | node 10 ZERO CITADEL | 0 | 13 | ✅ +REROLL | green + magenta | **SHIPPED 13/13** |
| **ir56-lion-serpent** | 12 / 12 on disk | ✅ registered · faces right · 12 cal · 8 contacts | node 8 RED MIST GORGE | **1** (`attack_throw_b`) | 14 | ✅ | green + **MAGENTA** (kit fires magenta) | **SHIPPED (12/13)** — 13th clip staged, gate `kit anchor-locked` exit 0 |
| **eclipse-ofuda** | 12 / **13** on disk | ✅ registered · faces right · 12 cal · 8 contacts | node 6 HOLLOW SHRINE | 0 | 13 | ✅ +REROLL | green ×2 + magenta | **SHIPPED (12/13)** — `special-b.webm` on disk, unreferenced |
| **hollow-pale** | 12 / **13** on disk | ✅ registered · faces right · 12 cal · 8 contacts | node 4 SNOWFANG PASS | 0 | 14 | ✅ +REROLL | green only, **rgb(1,254,3)** | **SHIPPED (12/13)** + **BLOCKED** on Tim decision #3 (re-plate 720→1536) |
| **lady-kurotachi** | 12 / **13** on disk | ✅ registered · faces right · 13 cal · 8 contacts | node 9 CRIMSON GATES | 0 | 12 | ✅ +REROLL | green ×2 + magenta | **SHIPPED (12/13)** + **BLOCKED** on Tim decision #1 (idle, 4 priced options) |
| **satoshi-odachi** | 11 / **13** on disk | ✅ registered · faces right · 11 cal · 7 contacts | node 5 KAWA CROSSING | 0 | 2 (+11 legacy `satoshi-*`) | ✅ | green + magenta | **SHIPPED (11/13)** — 2 orphans on disk + 1 archived in `old/` |
| **gorvak** | 11 / 12 on disk (`fighter-1-*`) | ✅ registered · faces right · 11 cal · 6 contacts | always-available | 0 | 0 | ✗ | ✗ (pre-plate era) | **SHIPPED (house)** — `attack-strike` take A pulled at QA, documented in-file |
| **volta** | 11 / 12 on disk (`fighter-2-*`) | ✅ registered · faces right · 11 cal · 6 contacts | always-available + node 2 in-fight stand-in | 0 | 0 | ✗ | ✗ (pre-plate era) | **SHIPPED (house)** |
| **thorn-warden** | 10 / **11** on disk | ✅ registered · faces right · 10 cal · 6 contacts | node 3 WHISPERING BAMBOO | **2** (`special_1`, `special_3`) | 12 | ✅ +REROLL | green + magenta | **SHIPPED (10/13)** → 13/13 once staged clips land; `special_1` needs a re-roll (fLAST 0.359) |
| **sora-yari** | 10 / 10 on disk | ✅ registered · faces right · 10 cal · 6 contacts | node 1 KUROHAMA DOCKS | 0 | 10 | ✅ | green + magenta | **SHIPPED (10/13)** — no specials **by design** (`sora-yari.ts:27`: session-1 kit, `special` omitted) |
| **oni-tetsubo** | **0** wired / 3 on disk | ⚠ `.ts` EXISTS but **NOT in the `FIGHTERS` registry** · 2 cal · **0 contacts** | ✗ not reachable | **9** | 10 | ✅ +REROLL | green (mk) | **PARTIAL, NOT WIRED** — 12 of 13 states covered; `special_1` UNKEYABLE (keyer hard refusal), 3 re-rolls queued |
| **lich-scythe** | **0** wired / 3 on disk | ✗ **no `.ts`, no clipdata.json** | ✗ | **10** | 10 | ✅ +REROLL | green (mk) | **ASSETS COMPLETE, NOT WIRED** — 13/13 states covered · **BLOCKED** on Tim decision #13 |
| **gargoyle-spear** | **0** wired / 1 on disk (`idle` only) | ✗ **no `.ts`, no clipdata.json** | ✗ | **12** | 12 (+4 re-roll takes, **8 REJECTED**) | ✅ +REROLL | green (mk) | **ASSETS COMPLETE, NOT WIRED** — 13/13 covered but **6 need re-rolls** · **BLOCKED** on Tim decision #13 |
| **kitsune-tanto** | 0 | ✗ | node 2 **enemy ART only** (`fighterId: 'volta'`) | 0 | 10 (+2 `-v2/-v3`) | ✅ | green + magenta | **RAW ONLY** · **BLOCKED** on Tim decision #2 (canonical look) |

---

## 2. THE BACKLOG — 36 characters with a kit and/or a plate and zero clips

| bucket | count | characters |
|---|---|---|
| **KIT ONLY** (kit written + plate screened, 0 clips) | **25** | elara-frostplate · hector-warhammer · hydra-flail · ir05-fullbarge-titan · ir08-bonepipe-grunt · ir10-night-howl · ir12-rose-lance · ir13-junkyard-king · ir16-crown-valiant · ir21-shirogiri-ace · ir22-akayari-vanguard · ir52-umbra-pinions · ir57-wolf-raven · ir60-tiger-mantis · jin-goldenhand · jorogumo-kusarigama · kira-foxflare · minotaur-axe · **onryo-katana** · pale-choir · raiju-naginata · reef-maw · shiro-gale · skullrend-orcus · wolfmark-hild |
| **BLOCKED — plate out of spec** | **1** | **ir41-kasa-oni** — kit written in full (13 gate-clean acting lines) then found FRONTAL. `BLOCKED:` line at `prompts/ir41-kasa-oni.md:3` is machine-read; `build-prompt.mjs` exits 3. Needs a re-plate, not a re-write. |
| **BLOCKED — open Tim decision** | **5** | **ir55-storm-valk** (#12, my override on emissive/detached-alpha evidence) · **iron-vow** (#6, taste call vs oni-tetsubo — kit-ready the day it is answered) · **golem-mace / nurikabe-shield / violet-contract** (#5, the FILL TRIO — `may-i-write-kit.mjs` REFUSES on a `TIM` verdict) |
| **PLATE ONLY** (no kit, no decision pending) | **5** | drake-glaive · kira-frostveil · ningara-silk · skeleton-nodachi · umbra-jelly |

Six kits are declared fire-ready today (HANDOFF §5.3): ir08-bonepipe-grunt, ir13-junkyard-king,
ir12-rose-lance, ir57-wolf-raven, ir10-night-howl, ir16-crown-valiant — 13 clips each.
⚠ ir57 is the weakest plate: I measured its top-left plate pixel at **rgb(67,182,73)** — the most
desaturated green in the set (roster-standard mk/xg plates run 0-38 / 130-252 / 0-73; ir60 and
skullrend are rgb(0,249,1)). Key ONE clip and look before batching.

**Plate chroma, measured** (`ffmpeg … crop=8:8:4:4,scale=1:1 -pix_fmt rgb24` on all 49 plates):
every `*-anchor.png` in `qa-boss/anchors/` is **magenta rgb(163,0,95)**; every `*-anchor-green.png`
there is **rgb(0,177,64)** — *except hollow-pale at rgb(1,254,3)*. All 26 `anchors/mk/` and all 13
`anchors/xg/` plates are green (shades vary), plus one `pale-choir-anchor-magenta.png` at rgb(163,0,95).

---

## 3. WHAT IS BLOCKING EACH UNFINISHED CHARACTER — one line each

**Blocked on Tim, not on work (10 characters):**
- **gargoyle-spear** — decision #13: campaign node or roster? Open since phase 182. Blocks writing its `.ts` at all.
- **lich-scythe** — decision #13, same one line unblocks both.
- **kitsune-tanto** — decision #2: canonical look. It is node 2's enemy art with `volta` standing in; 10 canonical raws sit unkeyed pending the identity ruling.
- **hollow-pale** — decision #3: re-plate 720→1536 would cost 12 already-shipped clips their anchor-lock. Nothing else blocks it.
- **lady-kurotachi** — decision #1: the idle, 4 priced options in `LK-ANCHOR-TRIAGE.md` §3.
- **ir55-storm-valk** — decision #12: I am overriding Tim's "all seven" on measured evidence (1.29% emissive on the keyed-subject denominator; its baked blade-trails key into detached islands of alpha). No re-plate fixes it. One line from Tim overrides me.
- **iron-vow** — decision #6: taste call, distinct enough vs oni-tetsubo. Fill and keying are explicitly *not* blockers.
- **golem-mace · nurikabe-shield · violet-contract** — decision #5, the FILL TRIO (fills 0.50 / 0.55 / 0.62). `may-i-write-kit.mjs` refuses until ruled.

**Blocked on work, with the specific blocker named:**
- **gargoyle-spear** — 6 of 12 staged clips need re-rolls (plinth under feet f0→f97 · pavement slab at fLAST · a whole clip FRONTAL at anchor 0.431 · LEFT 366px · LEFT 230px · persisting rubble). 4 non-rejected `-r2` takes are on disk; `attack_throw` and `attack_throw_b` have burned r2-r5 / r2-r4, **all REJECTED**. ⚠ *No control exists for gargoyle's anchor gate* — it ships only `idle.webm`.
- **lich-scythe** — 2 real end-pose breaks (`attack_throw` fLASTall 0.274, `special_1` 0.512). Also: **no keyed still exists**, so `rederive-cal.mjs` cannot run — the same missing artefact that blocks registration.
- **oni-tetsubo** — (a) not in the `FIGHTERS` registry, so it is unreachable even though its `.ts` exists; (b) `special_1` is UNKEYABLE (airborne debris reaches all four frame extremes by f60 → union bbox spans the whole 960×960 source; the keyer hard-refuses); (c) `attack_strike` f0 0.629; (d) `special_3` ends with debris on screen; (e) **0 contacts measured**.
- **thorn-warden** — `special_1` (thornbreak) end pose broken at fLAST 0.359. `special_3` is CLEAN and ready to wire *today* (0.932/0.933, verified against its own 11-clip control at 0.929-0.956 — the most trustworthy verdict in the batch).
- **ir56-lion-serpent** — nothing broken. Its staged 13th clip needs a per-edge feather (~2× the 48px house band: LEFT 86px @f24, RIGHT 94px @f60 on `--plate magenta`) then wiring. A tuning call, not a re-roll.
- **all five staged characters** — **no `contacts` measured** for any `attack_*` state (`scripts/measure-contacts.mjs` has not been run), and **`check-facing` was never run on this batch** — it resolves ids against `public/assets/characters/<id>/` and cannot read the staging tree at all.
- **eclipse-ofuda · lady-kurotachi · satoshi-odachi · thorn-warden · hollow-pale** — each has 1-2 keyed clips sitting in `public/` that no manifest references (see §5.3). Wiring is a one-line-per-clip edit, not a generation.
- **ir41-kasa-oni** — needs a re-plate to a side/three-quarter pose. The 13 acting lines are kept and become usable the moment the plate does.

---

## 4. COUNTS SUMMARY

| measure | value | command |
|---|---|---|
| Characters with a plate | **49** | `ls qa-boss/anchors/*.png qa-boss/anchors/mk/*.png qa-boss/anchors/xg/*.png` → 23 + 26 + 13 files, deduped by character |
| Characters with a written prompt kit | **39** | `ls qa-boss/prompts/*.md \| grep -v -- -REROLL \| sort -u \| wc -l` (+8 `*-REROLL.md` re-roll kits) |
| Characters in the whole universe (plated + 2 pre-plate house fighters) | **51** | union of the above with `src/characters/*.ts` and `public/assets/characters/*/` |
| **Fully shipped 13/13 and reachable** | **2** | ir37-pink-tessen, ir48-hex-paper-lord |
| Shipped + campaign-reachable but under 13 wired | **7** | ir56 (12) · eclipse (12) · hollow-pale (12) · lady-kurotachi (12) · satoshi (11) · thorn-warden (10) · sora-yari (10, by design) |
| Shipped house fighters (12-clip standard) | **2** | gorvak (11 wired), volta (11 wired) |
| **Characters reachable in-game at all** | **11** | `src/characters/index.ts` `FIGHTERS` — 9 bosses + gorvak + volta |
| Campaign nodes with a real boss fighter | **9 of 10** | node 2 ASHEN TORII runs `fighterId: 'volta'` as a stand-in |
| Assets-complete but **unwired** | **2** | gargoyle-spear (6 re-rolls out), lich-scythe (2 re-rolls out) |
| Partial + unwired | **1** | oni-tetsubo |
| Raw only | **1** | kitsune-tanto |
| Kit only | **25** | §2 |
| Plate only | **5** | §2 |
| **Characters blocked by an open Tim decision** | **10** | §3 |
| Characters blocked by an out-of-spec plate | **1** | ir41-kasa-oni |
| **Clips on disk under `public/assets/` (`.webm`)** | **143** | `find public/assets -name '*.webm' \| wc -l` → 119 under `characters/` + 24 flat `fighter-N-*` |
| **Clips reachable through the `FIGHTERS` registry** | **127** | sum of `grep -c "url:"` over the 11 registered defs |
| Clips referenced by any `FighterDef` (incl. unregistered oni) | **129** | + oni-tetsubo's 2 |
| **Clips on disk that NOTHING can reach** | **14** | 143 − 129 |
| Staged keyed clips (`qa-boss/staged-s30/`) | **34** | `find qa-boss/staged-s30 -name '*.webm' \| wc -l` — gargoyle 12 · lich 10 · oni 9 · thorn 2 · ir56 1 |
| Raw `.mp4` in `qa-boss/raw/` | **325** | `ls qa-boss/raw/*.mp4 \| wc -l` |
| — of which deliberately parked as REJECTED | **8** | `ls qa-boss/raw/*REJECTED*.mp4 \| wc -l` — all gargoyle-spear |
| — of which re-roll takes (`-rN`, not rejected) | **4** | gargoyle `attack_block-r2`, `attack_block_b-r2`, `attack_strike_b-r2`, `hit-r2` |

---

## 5. DISCREPANCIES — the sources disagree here. Read this before trusting any single one.

### 5.1 `oni-tetsubo.ts` exists but is NOT registered — the character is unreachable
`src/characters/oni-tetsubo.ts` exports a complete `ONI_TETSUBO: FighterDef` (id, name, still,
`faces: 'right'`, 2 clips). **`src/characters/index.ts` never imports it and it is absent from the
`FIGHTERS` record.** `grep -rn "oni-tetsubo\|ONI_TETSUBO" src/` returns only self-references inside
its own file. Its 3 `public/` clips and 9 staged clips cannot be reached by the engine at all. Its
`.ts` is also the most recently touched character file (Jul 31 13:19).

### 5.2 `oni-tetsubo.summary.json` disagrees with the disk AND has a different JSON shape
`qa-boss/staged-s30/oni-tetsubo/webm/` holds **9** `.webm`; `oni-tetsubo.summary.json` holds **1**
entry (`special_3`). It is also the only summary that is an object `{ "ok": [...], "failed": [] }` —
the other four are plain arrays. **Trust the disk.** The other four agree exactly:
gargoyle 12 = 12, lich 10 = 10, thorn 2 = 2, ir56 1 = 1.
All five summaries report `calDrift: null` — honestly reporting *could not measure*, not *agreed*.

### 5.3 Six keyed clips sit in shipped asset folders that no manifest references
Measured by diffing `ls public/assets/characters/<id>/*.webm` against `grep "url:" src/characters/<id>.ts`:

| character | on disk, unreferenced |
|---|---|
| eclipse-ofuda | `special-b.webm` (def wires `special` + `special-c`, skips `-b`) |
| hollow-pale | `attack-throw.webm` (the `attack_throw` state runs only the `-b` take) |
| lady-kurotachi | `special-c.webm` |
| satoshi-odachi | `attack-throw.webm`, `special-c.webm` |
| thorn-warden | `special-b.webm` — **and `thorn-warden.ts:28` says "No `special`: … `special` is OMITTED"**, so the file and the doc contradict each other |

Plus two legacy: `fighter-1-attack-strike.webm` (pulled at QA, documented in `gorvak.ts:18-27`) and
`fighter-2-attack-throw-b.webm` (unwired, **no note found explaining why — UNKNOWN**).

### 5.4 An archived clip is living inside the shipped asset tree
`public/assets/characters/satoshi-odachi/old/special-b-cyclone.webm` — the only nested `.webm` under
`public/assets/characters/` (`find … -mindepth 3`). It inflates `find`-based counts by 1 and is why
the per-directory sum (118) and the recursive count (119) differ.

### 5.5 DECISION REGISTER #12 describes a file that does not exist
`HANDOFF-STREETFIGHTER.md:215` states ir55-storm-valk *"kit carries a `BLOCKED:` line so
`build-prompt` refuses (exit 3). **Delete that line to override**."*
**There is no ir55-storm-valk kit.** `find qa-boss -iname "*ir55*"` returns exactly two files:
`qa-boss/anchors/xg/ir55-storm-valk-anchor-green.png` and
`qa-boss/frames/platekey/ir55-storm-valk-anchor-green-alpha.png`. `grep -rn "BLOCKED" qa-boss/prompts/`
never mentions ir55. **The stated override mechanism has nothing to act on** — the decision is real,
the enforcement is not. (The four real `BLOCKED` hits are: ir41 — a genuine kit-level block; ir08 —
prose saying explicitly *"no BLOCKED marker on purpose"*; raiju-naginata — *"That block is LIFTED"*;
ir48-REROLL:232 — a per-clip NSFW-moderation note, not a kit block.)

### 5.6 Two characters have campaign/asset presence with no fighter behind them
- **kitsune-tanto** — node 2's `enemy` art, with `public/assets/enemies/kitsune-tanto.webp` +
  `-pfp.webp` shipped and 10 canonical raws on disk. `fighterId` is `'volta'`. No `.ts`, no clips.
  The only placeholder node in the campaign.
- **onryo-katana** — has a keyed cutout **and** portrait in `public/assets/enemies/`, two anchor
  plates, and a written kit — but **zero references anywhere in `src/`** (`grep -rn "onryo" src/`
  returns one unrelated comment in `hollow-pale.ts`). An orphan asset set attached to no node. Note
  `hollow-pale.ts:6` records hollow-pale as the sanitized redesign that cleared upload moderation
  *"where onryo hard-blocked"* — which suggests onryo was superseded, but nothing states it.

### 5.7 gargoyle-spear's `hit` has two files in the same `-r2` slot, one unmarked
`qa-boss/raw/gargoyle-spear-hit-r2.mp4` (12:03→13:56 mtime 13:56) **and**
`gargoyle-spear-hit-r2-REJECTED-frontal.mp4` (12:03). Independently,
`SESSION30-FIRE-LEDGER.md:175` scores the *unmarked* `hit-r2` at **f0 selfSym 0.546 — FRONTAL**
(kit median 0.186, bar 0.306) and line 217 re-queues `hit` as *"now clip 13, v3"* at a new LEN.
**So neither `-r2` file is usable, and the bad one is not named REJECTED.** Do not treat
`hit-r2.mp4` as an asset.

### 5.8 The live fire ledger's status column trails the disk
`SESSION30-FIRE-LEDGER.md:146-157` reads: clips 1-2 DONE, clip 3 FIRED, clip 4 typing, clips 5-12
queued. On disk right now there are already non-rejected `-r2` takes for `attack_block`,
`attack_block_b`, `attack_strike_b` and `hit`, **plus 8 REJECTED takes for `attack_throw` (r2-r5) and
`attack_throw_b` (r2-r4) that the ledger's 12-row table does not show at all** (mtimes 12:03-16:06
today). The ledger is being edited by the live session; **read `ls -la qa-boss/raw/`, not the table.**

### 5.9 The gate report's "would reach" column is a projection, not a state
`SESSION30-GATE-REPORT.md` §3b: gargoyle *"9/13 now"*, lich *"11/13"*, oni *"10/13"*, thorn
*"12/13"*. Those assume the staged clips are wired. **Wired today: gargoyle 0, lich 0, oni 0
(unregistered), thorn 10.** The report says so itself — *"Zero clips are wired"* — but the column
reads like inventory.

### 5.10 `fire-queue.mjs` structurally under-reports (documented, not a bug)
It derives SHIPPED from `public/assets/characters/<char>/<state>.webm`, so all 34 staged clips are
invisible to it and it reports them as still-queued. HANDOFF §6 restates this. **A fresh session that
trusts `fire-queue` will regenerate work that already exists on disk.**

### 5.11 `check-anchor-lock` is not calibrated per character — a number alone means nothing
lich-scythe's already-**shipped, accepted** `attack-strike.webm` scores f0body **0.851** and the gate
calls it *"start drifts"* against its own `>=0.90 ok` band. So 0.80-0.85 is lich's normal, not a
defect band — **for lich, read the `all` column.** The same gate puts thorn-warden's 11 shipped clips
at 0.929-0.956, where it *is* well calibrated. Same gate, opposite conclusion, and only running that
character's own shipped clips as a control tells you which case you are in. ⚠ **gargoyle-spear has no
control** — it ships only `idle.webm`.

### 5.12 Minor, but worth a line
- **hollow-pale's plate is the odd one out twice**: its green is **rgb(1,254,3)** where every other
  root-set green plate is **rgb(0,177,64)**, and it is the only root-set character with **no magenta
  plate** (the other 10 all have both). Measured on all 23 root plates.
- **`prompts/gargoyle-spear.md` calls itself *"the cleanest kit delivered so far: nothing needed
  fixing."*** On the actual pixels it is the dirtiest of the five — 6 of 12 defective. The prompt
  file's self-assessment is worthless as evidence.
- **No `contacts` exist for oni-tetsubo** (`grep -cE "^\s*contacts:\s*[\{\[]"` → 0) while every other
  def carries 6-9. It cannot populate a complete `FighterDef` until `measure-contacts.mjs` runs.
- **All 12 `FighterDef`s declare `faces: 'right'`** — no exceptions, so the STANDOFF facing rule is
  uniform across the wired roster. Unverified for the staging tree (§3, `check-facing` cannot read it).
