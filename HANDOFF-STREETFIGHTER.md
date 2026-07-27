# HANDOFF — STANDOFF (RPS-as-MK-fighter), for a fresh Fable 5 session

Branded **STANDOFF** (Tim's pick 2026-07-20, over CLASH / DUEL ZERO / THROWDOWN; was
working title Frozen Requiem). Folder `streetfighter/` (own git repo inside the
swoobz-games-export export). Dev server port **5340 strictPort**. Tim's art in `input/`
is canonical (`input/progressivemap.jpg` = ANOTHER GAME'S map, reference-only, never
ship or commit it). HEAD at handoff: `bb4f0e7` (phase 22b — arena stage-aspect
crop fix). `npx vitest run` prints **148/148**. **PHASE 23 (boss character clip
generation) is IN PROGRESS and UNCOMMITTED — it is generation-only (Tim's ruling:
do NOT wire into the game yet, keep generating first), so there are NO game/src
changes; all work lives in the untracked `qa-boss/` dir + `scripts/prep-boss-anchors.mjs`.
Read the "## PHASE 23" section below FIRST if continuing the clip work.** Everything
else below is VERIFIED, not self-reported: every phase was
live-driven headless (screenshots VIEWED) before its commit. Rewritten clean 2026-07-21
after phase 17b; phases 18-19 appended 2026-07-22 (see project memory for full logs):
phase 18 quick-duel economy (CPU picks randomMove, win pays 1.92x = 96% RTP,
exploit-regression test), 18b demo rewards removed from map ("for now", re-add = one
registry row), 18c CSPRNG behind every money pick (`src/engine/secureRng.ts`; seeded
mulberry32 = tests/sims only), 19 lacquer-blade HUD extension (timer/nameplates/pick
buttons in the 17b language) + map label de-overlap (MAP_LABEL transform-only offsets)
+ node hit-area fix (button box pinned to disc width; every node center resolves to
itself in all progress states). Phase 20 (2026-07-22, `6cf027c`): Tim's final
per-node enemy art wired in (`input/characters/.../npc boss/` map 1-9 + finalboss;
registry `CampaignNodeDef.enemy {id,name}`, money fields byte-identical, fighterId
stays volta for fight visuals until clips exist), frontier-only ink-silhouette tease
on the map (`.fr-map-sil`, pointer-events:none), node card = named-mystery silhouette
until beaten then color-PFP reveal, `scripts/key-enemies.mjs` keyer with
enclosed-pocket cut + bgLikeKept self-check. See project memory phase-20 entry for
the keying lesson (verify "own-art color" claims against SOURCE pixels; a builder
invented "fan gems" to justify background leaks) + known cosmetic residuals.
**STANDING RULING (Tim 2026-07-22): skip EVERYTHING RONIN ZERO VENDING MACHINE for
now** — the untracked `pack-machine/` demo stays untracked and unworked until Tim
reopens it.

## PHASE 23 — BOSS CHARACTER CLIP GENERATION (IN PROGRESS, RESUME HERE)

### ★★★★★★★★★ OPUS 5 — START HERE (SESSION 8, written 2026-07-27 ~12:50; SUPERSEDES every START-HERE block below) ★★★★★★★★★

**STATE.** HEAD `9ed9bfd`, `npx vitest run` = **157/157**, tsc clean, engines + `src/ui` byte-frozen all
session. Working tree clean except the pre-existing untracked dirs. **ZERO generation happened — the
browser extension never connected** (checked repeatedly; Tim was asked to reconnect and it stayed down).
Everything below was done locally.

#### WHAT SESSION 8 SHIPPED — three commits, all live-driven before commit

- **`07bcbfe` phase 26 — hollow-pale drop-ins.** Phase 25 generated four clean re-rolls but never keyed
  or wired them, so node 4 was running three states on a SINGLE take. Now `attack_block` 1→2 takes and
  `special` 1→3. `attack_throw` Take A **stays PULLED**: its v2 fixed the arsenal break (scythe full in
  all 97 frames) but reproduces the back-turn (f43–f62, ~0.8s, scapulae to camera). Orchestrator
  confirmed on the frames; doctrine 6 says never ship a known-defective take. **The keyed webm is on
  disk** — a re-roll or Tim overriding is a pure manifest swap, no re-key.
- **`3a894ef` phase 27 — the FACING GATE + Lady Kurotachi.** 11 of her 13 clips faced the wrong way.
- **`9ed9bfd` phase 28 — ir37 (2) + eclipse (4) hflipped.** Roster now self-consistent.

#### ★ TIM'S ORDERING RULE (2026-07-27, BINDING): FLIP ALL CLIPS TO THE SAME SIDE **BEFORE** DOING QA

Facing normalisation is a **precondition for QA, not a QA item.** A flip invalidates the side-dependent
output of every pixel gate — containment borders, feather args (`--left/--right`), edge-inset ring
profiles, weapon-exit-side notes. Proven here: the containment triage ran concurrently with the facing
fix, and after 17 clips flipped the SAME clips flagged with **identical magnitudes, LEFT↔RIGHT swapped**
(`lady-kurotachi attack-throw-b` LEFT 422px → RIGHT 422px, re-measured at HEAD). The triage's ranking
survives (it sorts on run length) but **its per-clip side data is stale for those 17 clips.**

Order for any kit: (1) normalise every clip — and the `still` — to ONE side; (2) then containment /
feather / effect-edge QA; (3) then re-rolls. **One convention for the WHOLE roster** — a lone exception
is how this class survives.

**SCOPED DELIBERATELY (Tim, 2026-07-27): this rule is STANDOFF-ONLY.** It lives in the REPO-LOCAL skill
`.claude/skills/standoff-clip-facing/SKILL.md`, NOT in the global `character-clip-qa`. It was briefly
added there as a "GATE 0" and that was **reverted** (stormforge `4dd33f9`) because `character-clip-qa` is
junctioned into every project and its reference implementation is a SLOT character. A slot has ONE main
character, no opposing slot, no per-slot mirror and no `faces:` field — "normalise the kit to one side"
is meaningless there and would cause pointless re-keys. **Do not re-add facing rules to the global slot
skills** (`character-clip-qa`, `slot-character-animation`, `character-assets`). The global memory entry
`~/.claude/memory/clip-facing-and-containment-are-pixel-measurements.md` carries the same scope warning.

**CONSEQUENCE FOR THE NEXT SESSION: re-run the containment sweep once facing is settled, and regenerate
`qa-boss/CONTAINMENT-TRIAGE.md` from it before acting on any per-clip border instruction in it.**

#### THE FACING DEFECT CLASS (new; `scripts/check-facing.mjs`)

`faces:` is a **CORRECTNESS input, not a label**. `FightExperience.tsx:920` computes
`isMirrored = faces !== (slot==='p1'?'right':'left')` and applies ONE mirror to the whole stack (:1087).
Because that decision is uniform per kit, **every clip must NATIVELY face the direction `faces:` states**.
Clips being generated one way and reused for both slots is by design and is fine (Tim confirmed); clips
disagreeing WITH EACH OTHER is the bug. Found: LK 11 wrong, eclipse 4, ir37 2 (`hit` — fires on nearly
every exchange). hollow-pale, ir56, satoshi, sora, thorn were clean.

Fix recipe that worked 17/17: **re-key FROM RAW with `-vf hflip` at the FRAME level**, never webm→webm.
Validate first by re-keying one clip UNFLIPPED and reproducing the shipped cal bit-exactly, then trust
the flipped run. `h`/`bottom` are flip-invariant; `left_new = 200·onCX − left_old` (= `100 − left_old`
when the still is centred) and must come from the KEYER'S EMISSION, never hand-applied. `contacts` are
timings — untouched.

**TWO TRAPS THIS GATE TAUGHT (both nearly shipped a confident wrong answer):**
1. `qa-boss/anchors/<id>-anchor.png` are RGBA **containers whose alpha is 255 everywhere** — raw plates,
   not cutouts. Anchoring on one normalises to a filled rectangle, which is symmetric, so
   `IoU(as-is) === IoU(mirrored)` for every clip and the gate prints a serene, meaningless "0/13
   mirrored". The gate now ABORTS on any anchor mask covering >95% of frame. Use `--still`.
2. **The gate reports agreement RELATIVE to its anchor, NOT absolute correctness.** On eclipse the STILL
   is itself the outlier, so reading the gate literally would have flipped the wrong 9 clips. Verdicts
   come from viewing frames; the gate only tells you which clips disagree with which.

#### OPEN DECISIONS FOR TIM (asked, never answered — do NOT decide these unilaterally)
1. ~~**eclipse's still**~~ **RULED (Tim, 2026-07-27): normalise ECLIPSE TO `faces:'right'`** so the whole
   roster is one convention. Her still ALREADY faces right, so this fixes it for free and touches NO
   shared art. (Correction to an earlier note in this file: the node CARD uses a separate `<id>-pfp.webp`
   — `FightExperience.tsx:2382/2633` — so only the frontier silhouette tease `fr-map-sil` (:330) reads
   `<id>.webp`. The map-card risk was overstated.) Implementation: the 4 clips phase 28 flipped are
   RESTORED from `3a894ef` (bit-exact, no double re-key); the other 9 get the hflip re-key. **Her
   generation anchor faces LEFT, so every FUTURE eclipse re-roll must be hflipped at keying** — that note
   must not be lost or the drift returns one re-roll later.
2. **Delete the dead `qa-boss/prompts/onryo-katana.md`?** It is the superseded identity hollow-pale
   replaced. It is NOT "unchecked" as the old handoff claimed — `check-prompt-coherence.mjs:129` globs
   the prompts dir, so it IS scanned in degraded mode (`wields: (arsenal not declared)`) and emits a
   phantom BLOCK that holds the gate at **exit 1** for a character that cannot ship. Also
   `scripts/prep-boss-anchors.mjs:39` still lists onryo as map 4 and is **missing hollow-pale entirely** —
   out of sync in both directions.
3. **hollow-pale `attack_throw` Take A** — ship the back-turn for 2-take variety, or keep it pulled?

#### CONTAINMENT GATE IS NOW CALIBRATED — `qa-boss/CONTAINMENT-TRIAGE.md`
The old handoff's "48 of 104" was **measured on the wrong directory**: 104 is the file count of the
`qa-boss/webm/` STAGING dir. The real shipped set is **97 clips, 49 flagged**. And the "some contact is
expected and invisible" assumption is **FALSE** — derived from render geometry (`translate(-50%,-100%)`,
fighter box 58% at cx 24/76), every clip edge lands well inside the visible stage, and
`.fr-ko-zoom-active` scales 1.15× on KO, MAGNIFYING cuts in `ko`/`special`/`victory`. Opacity is not the
discriminator (A40/A128/A200 barely differ — it is solid matter); RUN LENGTH is, because it measures the
width of the flat cut face.
```
CLEAR   A200 < 32                                   bands: BLOCK 18 · REVIEW 14 · COSMETIC 16 · CLEAR 1
REVIEW  32 <= A200 < 90
BLOCK   A200 >= 200  OR  (A200 >= 90 AND dwell >= 3)
```
**thorn-warden (n3) is the re-roll priority** — 7 of 10 clips flagged, 3 BLOCK, earliest defective node.
satoshi (n5) and ir56 (n8) need kit-level re-rolls, 5 BLOCK each. hollow-pale is the cleanest kit.
**`special` is NOT a rare state** — `FightExperience.tsx:1789` swaps it in on EVERY round-ending win.

#### WHAT TO DO NEXT
1. **Get the browser up first** — everything valuable left is generation. Then, in order: Eclipse ×3
   finishers (her `special: []` means every win against her plays a plain attack — still the single
   highest-value fix), LK `throw_b` harvest from History, IR-48's July-26 renders (harvest before
   re-firing), hollow-pale `throw-a` re-roll (kill the back-turn), hollow-pale `special_3` for presence.
2. **thorn-warden n3 containment re-rolls** per the triage ranking.
3. Then the old queue: kitsune (still blocked on the baked-in tanto glow — Tim has not ruled),
   sora/thorn specials, ir56 light-arena alpha re-key, `input/MK FINAL/`.

#### LIVE-DRIVE HARNESS
`node qa-boss/phase28-drive.mjs` (needs `npm run dev -- --port 5340 --strictPort`) drives n4/n6/n7/n9,
probes that each boss's OWN webms mount AND play, and asserts the FACING RULE wrapper's computed
`scaleX` matches what the manifest implies for the p2 slot. All four PASS. Note it does not assert money
(its `$` regex found no balance text on these screens) — the wire2/wire3 drivers are the money check.

---

### ★★★★★★★★ (SUPERSEDED) OPUS 5 — START HERE (written 2026-07-27 ~03:20 by the SESSION-7 Opus 5 orchestrator) ★★★★★★★★

**YOU are the ORCHESTRATOR: plan / brief / verify / review / commit.** Generation runs in the BROWSER
(Higgsfield Unlimited, ZERO credits) — never MCP `generate_video`, which always bills. Full detail in
`qa-boss/SESSION7-FINDINGS.md`; read that file, it is the evidence behind everything below.

**STATE AT HANDOFF.** HEAD `11ae61d`, `npx vitest run` = **157/157**. Nothing wired into the game.
Working tree: `scripts/check-prompt-coherence.mjs` (2 bug fixes) + `scripts/check-containment.mjs`
(new) + `qa-boss/prompts/eclipse-ofuda-REROLL.md` facing fix are UNCOMMITTED. `qa-boss/` is untracked
as before. **The browser extension DISCONNECTED mid-session with LK `throw_b` rendering** — that clip
is probably finished in the cloud; re-open the tab and check History before re-firing it.

---

#### WHAT SESSION 7 DID

**HOLLOW PALE re-rolled 4/4, every one PASS, zero credits.** Raws in `qa-boss/raw/hollow-pale-*-v2.mp4`.

| clip | defect it fixes | anchor IoU | containment |
|---|---|---|---|
| `block-b-v2` | scythe VANISHED | 0.991 | 14px R graze |
| `throw-a-v2` | phantom object in claw | 0.9925 | 0px |
| `special-1-v2` | DETACHED CRESCENT | 0.9936 | 16px L graze |
| `special-3-v2` | head swallowed + top-edge slab | 0.9895 | 0px |

`special-1-v2` is the model finisher: gold light welded ALONG the bone edge, effect 1.83s peaking at
26% of subject pixels. **`special-3-v2` is defect-free but WEAK** — Seedance gave an internal ribcage
glow (0.67s, 3% peak) instead of the specified shroud. Re-roll it for presence when the queue clears.

**Two gate bugs fixed in `check-prompt-coherence.mjs`** — both were silently corrupting the pre-fire check:
1. A `<id>-REROLL.md` kit did not resolve to its base character, so it gated with **no arsenal** and
   printed a **false PASS**. Eclipse's first "PASS" was meaningless.
2. The scanner read the kits' own self-score TABLES and convicted them for documenting that they had
   banned projectile words → 8 phantom BLOCKs on LK. Now skips markdown table rows.
   Regression-checked: every pre-existing BLOCK still BLOCK, every PASS still PASS.

**New gate: `node scripts/check-containment.mjs <file|dir> [--min N]`.** The coherence gate reads
PROMPTS; this reads PIXELS — longest CONTIGUOUS run of subject pixels per border, bottom edge never
counts (feet on the floor line). Handles alpha-webm and chroma-mp4. **Sweep of all 104 shipped clips:
48 have TOP/LEFT/RIGHT contact**, worst `satoshi special_3` **LEFT 504px**, `ir56 special_3` RIGHT
437px, `LK throw_b` LEFT 422px. Calibrate like the coherence gate — flag for review, don't convict.

---

#### THE THREE LESSONS OF SESSION 7 (internalise before touching anything)

1. **MEASURE, NEVER EYEBALL.** Reading frames by eye was wrong **2/2**; measurement right **4/4**. I
   called a left-edge crossing on a clip whose LEFT contact measured **0px**, and called `LK throw_b`
   wholly mirrored when it is correct at f0 and rotates only at f40–f56. A "which way do the helmet
   horns sweep" heuristic looked convincing and **disagreed with the anchor test**. Contact sheets tell
   you WHAT happened; verdicts come from numbers.
2. **FACING IS DECIDED BY THE ANCHOR-IoU MIRROR TEST**, then cross-checked against the registry's
   `faces:` field. Bbox-normalise anchor + clip silhouettes to 64x64, compare `IoU(anchor,clip)` vs
   `IoU(anchor,mirror(clip))`. **A prompt that commands the opposite facing to its own plate reliably
   produces a 180-turn** — eclipse's clipdata already documented this as "the -r label lie", and the
   agent reproduced it anyway (see below).
3. **BROWSER UNLIMITED IS ONE-AT-A-TIME.** Four back-to-back fires registered as ONE; clips 2–4 were
   silent no-ops. Generation is strictly serial: fire → wait → verify → fire next. ~15–25 min/clip.

---

#### WHAT I CAUGHT IN AGENT OUTPUT (do not trust self-scores)

- **Eclipse's 3 finisher prompts commanded `FACING SCREEN-RIGHT` on a plate that faces screen-LEFT.**
  The agent's own header even said the plate faces LEFT. Registry is ground truth:
  `src/characters/eclipse-ofuda.ts` → `faces:'left'`. **I corrected all three to SCREEN-LEFT and
  re-gated PASS.** They are ready to fire as-is; do NOT re-invert them.
- Both agents self-scored 12/12 and both claimed a clean gate run. One had run the gate in its broken
  degraded mode; the other's kit failed on 8 phantom blocks. **Re-score independently, always.**

#### OPEN ISSUE FOR TIM (do not fix unilaterally)

**LK's kit is internally inconsistent.** Anchor-IoU: `idle` matches her anchor (0.546 vs 0.150) and her
registry `faces:'right'`; **the other 12 clips are MIRRORED against both** (`victory` 0.203 as-is vs
0.745 mirrored). Either those 12 need re-rolling or the registry needs flipping — Tim's call.
**Consequence:** her re-rolls generate right-facing (matching idle + anchor) so they MISMATCH the 12 →
**hflip them at keying** to sit with the shipped kit (hflip-at-keying is an established step; see
eclipse clipdata "HFLIP the 5 kept v1 clips at keying").

---

#### WHAT TO DO NEXT (in order)

1. **Reconnect the browser tab and check History for LK `throw_b`** — fired ~03:12, likely complete.
   Download, run `check-containment.mjs`, anchor-IoU, and confirm no rotation at f40–f56 (its actual
   defect; it is NOT a whole-clip mirror). Then fire **LK `special_3`** (prompt lines 130–191; its
   defect is a SILVER blade on a BLACK-bladed character).
2. **Eclipse ×3 finishers** — `qa-boss/prompts/eclipse-ofuda-REROLL.md`, facing already corrected,
   gate PASS. Her `special` array is EMPTY in-game so every win against her plays a plain attack —
   this is the single highest-value fix remaining. Prompt line ranges (unfenced, heading-delimited):
   `special_1` 99–133, `special_2` 136–172, `special_3` 175–211.
3. **Re-roll `hollow-pale special_3` for presence** (defect-free but a 0.67s/3% flicker; compare
   `special-1-v2` at 1.83s/26%).
4. **IR-48 (node 10, last kit, 13 clips).** `0` clips on disk, BUT finished renders from July 26 exist
   in the cloud History — the pane appears scoped to the loaded reference, so they surface once his
   anchor is loaded. **Harvest those before re-firing.** His anchor was in the picker at session start.
5. Remaining sweep re-rolls the gate still flags on SHIPPED kits: `ir37 special_1` ("in front of her"),
   `satoshi special_3` ("in front of him"), `LK throw_a` ("seizes an unseen"), `ir56` 3× unanchored WARN.
   **`onryo-katana` has NO arsenal entry** so it gates unchecked — confirm it is the dead superseded
   identity and delete it, or give it an entry.
6. Then: kitsune (still blocked on the baked-in tanto glow — Tim has not ruled), sora/thorn specials,
   ir56 light-arena alpha re-key, `input/MK FINAL/`.

#### BROWSER OPERATIONAL NOTES — NEW THIS SESSION (the older notes below still apply)

- **CLIPBOARD PASTE WORKS on the Lexical prompt field** and is far better than `computer type` for 5k
  chars: PowerShell `Set-Clipboard` → click field → `ctrl+a` → `Delete` → `ctrl+v`. Landed 4,826 chars
  exactly, no double-insert. **Always verify `el.textContent.length` against the source before firing.**
- **The Generate button reads `Generate2418` (credits) PRE-HYDRATION and `GenerateUnlimited` once the
  page settles.** Check AFTER load, and confirm the `Unlimited mode` toggle is ON, before EVERY fire.
- **MCP `show_generations` is DAYS stale** — it returned July 22 arena backgrounds while a July 27 job
  was processing. It CANNOT verify a fire. The tab is the only source of truth.
- Status progression is `Processing → Generating → (empty)`. Completion = status empty + the card gains
  a `Rerun` button. Get the mp4 URL by clicking the card's play button then reading `video.currentSrc`,
  and **pause the video immediately** (autoplay freezes the renderer → CDP timeouts).
- CloudFront filenames are **UTC**: `hf_20260726_235318` = 01:53 local on the 27th. Use this to confirm
  a URL is YOUR fire and not the previous one.
- Anchor swap is unchanged and reliable: click the reference thumb → `×` at its top-right → dropzone →
  click the image icon (an IN-APP picker, not an OS dialog) → `input[type=file]` now exists → `file_upload`.
  **Verify identity by enlarging the 48px thumb via injected CSS** (`position:fixed;width:320px;z-index:999999`)
  then reverting — the tile is too small to judge and the CORS block prevents canvas sampling.
  **A stale prompt in the box makes a WRONG anchor look right** — the box held a hollow-pale prompt
  while IR-48's anchor was loaded; I nearly fired that pairing.

### ★★★ (SUPERSEDED) OPUS 5 — START HERE (written 2026-07-27 by the Opus 4.8 orchestrator) ★★★

**YOU are the ORCHESTRATOR: plan / brief / verify / review / commit.** You run generation yourself
in the browser (Higgsfield Unlimited, ZERO credits); you dispatch Opus builder/reviewer subagents
(Agent tool + `subagent-briefing` skill) for keying, wiring and QA; then you RE-RUN every gate
yourself, review the diff with your own eyes, and LIVE-DRIVE the real game before committing.
Full operating model in §0, gates in §6.

**THE THREE HARD LESSONS OF SESSION 6 — internalise these before you touch anything:**
1. **NEVER trust a self-report — not a builder's, not a ledger's, not your own earlier one.** A
   builder died mid-response after doing the file work but before updating the manifest (only
   inspecting the tree caught it). The per-boss `qa-boss/<id>-clipdata.json` verdicts are
   **demonstrably wrong in many places** — they record "PASS" on clips that ship a floating blade
   fragment, a mirrored take, a silver blade on a black-blade character. **Trust the frames.**
2. **ffmpeg silently drops the alpha plane of these VP9 webms unless `-c:v libvpx-vp9` comes
   BEFORE `-i`.** A strip made without it shows the colour layer over its grey backing — NOT what
   the game renders. This burned the orchestrator: an eclipse finisher was hand-checked and called
   "attached in her palm", when in truth the talismans float with a measured ~60px air gap. **Force
   the decoder on every QA strip**, and composite over BOTH black and white (each hides a different
   defect: black hides dark smoke, white hides chalk bodies and shows chewed mattes).
3. **When the Fable 5 spend limit kills subagents** ("You've hit your monthly spend limit"),
   re-dispatch the SAME briefs with the Agent tool's `model: "opus"` override — they launch and run
   normally. Don't abandon a fan-out over the limit; switch the tier. (Tim's standing ruling.)

---

## WHAT SESSION 6 DID (HEAD `b62c3ca`, 157/157 vitest, engines byte-frozen, ZERO credits)

**Campaign went from 4 to 8 of 10 nodes fighting with their OWN animated character.** Live +
playable-after-beaten: n1 SORA YARI, n3 THORN WARDEN, n4 HOLLOW PALE, n5 satoshi, n6 eclipse,
n7 ir37, n8 IR-56 LION-SERPENT, n9 LADY KUROTACHI. Still VOLTA stand-in: **n2 KITSUNE (blocked)**
and **n10 IR-48 HEX PAPER LORD (finalboss, 0/13 — the last kit)**.

Commits, oldest first:
- `a78784a` **phase 24f** — wire SORA YARI→n1, THORN WARDEN→n3, HOLLOW PALE→n4. Node 4 was a full
  build: the superseded onryo identity replaced by HOLLOW PALE, 12-clip pinksafe kit, ko re-rolled
  compact (fixed a 212px right-edge slice on the HELD prone pose), and a new `interiorGreen` flag
  in `scripts/key-enemies.mjs` because his translucent smoke body let studio green through.
- `47da03c` → `dddbb62` — added then PULLED hollow-pale's smoke-spike finisher: **Tim's "one shoots
  a rocket"** — it rendered as a detached flaming projectile.
- `cf212f2` **phase 24g** — wire IR-56 LION-SERPENT→n8.
- `c6dbad6` **phase 24f-d** — hollow-pale special_3 re-roll → SMOKE SHROUD (effect now wraps HIM).
- `9a9e132` **phase 24h** — **the CHARACTER↔PROMPT COHERENCE GATE** (Tim's idea, see below).
- `1605582` **phase 24i** — pulled 6 defective takes on n4/n5 found by the animation sweep.
- `fa8eab7` **phase 24j** — head-trimmed IR-37 `hit`: **it had an actual grey, red-nosed, fin-tailed
  ROCKET flying into frame at f8-9.** `hit` fires constantly, so this was the most-seen defect in
  the game and is very likely the clip behind Tim's original report.
- `ffb6df3` **phase 24k** — LK `strike_b` fixed for FREE (wrong take had shipped) + 5 more pulls
  on n6/n9.
- `b62c3ca` — the IR-48 model bake-off harness (`qa-boss/MODEL-BAKEOFF-ir48.md`).

### The two tools this session added — USE THEM
- **`node scripts/check-prompt-coherence.mjs [<id>]`** — pre-fire gate. Checks every prompt kit
  against **`qa-boss/arsenal.json`** (what each boss actually WIELDS + the **MELEE ROSTER LAW**:
  nothing launches/throws/fires a separate object; effects stay attached to the character or the
  weapon in his hand). Catches projectile wording, grab-framing, detached-effect placement
  ("in front of him" / "at his feet"), and per-character banned actions. It retroactively flags
  both confirmed defects, and it caught ir48 special_2 **before it ever rendered** (rewritten:
  the talisman now stays pinched in his hand). **CALIBRATION: it flags WORDING for review, it does
  not convict** — two of its flags were visually cleared. Pixels decide.
- **`qa-boss/BRIEF-animation-character-match.md`** — the read-only visual sweep brief. Re-run any
  time (one agent per 2 characters, agentType `autisk`, model opus).

### What the animation↔character sweep found (Tim: "check on everyone if all animation match the character")
4 reviewers, ~90 shipped clips, every frame viewed. **Every character had defects.** Confirmed and
acted on: hollow-pale 4 FAILs (**the bone-scythe — which IS his arm — VANISHES** in block-b),
satoshi 2 (**both hands empty while a crescent floats free**), ir37 5 (**the rocket**; fan detaches
then becomes a banned pole-arm), ir56 5 (**breathes fire during a throw**, laser streak in hit),
thorn 1 severe (**a log appears, replaces his head, flies off frame**), sora 5 (helmet morphs in
`hit`, frontal 2.5s in block_b, magenta bleeding onto her spear), eclipse (**the only true phantom
OBJECT: a detached blade fragment at f74** + all three finishers failed), LK (**a mirrored take**
where she faces away from her opponent).

**Recurring root causes — these are the re-roll briefs:**
- **Weapon instability** — vanishes / shrinks / morphs / floats free (hollow-pale, ir37, ir56, thorn).
- **Rotation out of profile**, usually through the BACK, held 1–2.7s (systemic; ~10 clips).
- **Effects that outlive the blade** — the arc keeps going after the weapon stops = projectile read.
- **Chroma bleeding into effects** on blurred/semi-transparent frames (sora magenta, eclipse lime).

---

## WHAT TO DO NEXT

**0. Ask Tim two open questions first** (both are his calls, both were pending at handoff):
   (a) **Re-roll campaign vs ir48 first?** ~20 clips need re-rolls. The orchestrator's recommendation
   is re-rolls first — a broken live node hurts more than a missing one — but it is Tim's call.
   (b) **KITSUNE (node 2) is BLOCKED**: the tanto glow is baked into the ANCHOR ART and cannot be
   prompted or keyed away. Options: park it / ~1-2cr nano_banana anchor edit / free local
   pixel-surgery (Seedance-amplification risk). **Do NOT re-fire kitsune until he rules.**

**1. The re-roll queue** (all free; every prompt must pass the coherence gate before firing).
   Ranked by player impact:
   - **eclipse: all 3 finishers** — currently `special: []`, so every win against her plays a plain
     attack. Highest value: restores a whole boss's finisher.
   - **LK `attack-throw-b`** (mirrored; no clean fallback take exists) and **`special-c`** (silver blade).
   - **hollow-pale** `attack-block-b` (weapon vanish), `attack-throw` A, `special` A (detached
     crescent), `special-c` (shroud swallows his head + opaque top-edge slab).
   - **satoshi** `special-c` (empty hands + floating crescent), `attack-throw` A.
   - **thorn `hit`** (the flying log / decapitation) and **sora `hit`** + `block_b` — both are
     high-frequency states on the two lowest nodes.
   - **ir37** block-b / special-b / special-c, **ir56** throw / hit / block-b / specials.
   **THE RE-ROLL RULE the sweep taught us:** for slash-VFX the fix is NOT "less effect" — it is
   **"the arc must TERMINATE ON THE BLADE in every frame, and the blade stays in hand."**

**2. IR-48 HEX PAPER LORD (node 10, the last kit, 13 clips).** Prompts authored + gate-passing
   (`qa-boss/prompts/ir48-hex-paper-lord.md`). **His anchor is ALREADY SWAPPED INTO THE BROWSER**
   picker, so his kit can be fired immediately. Fire `idle` FIRST as a moderation test. Tim also
   set up a **model bake-off** (`qa-boss/MODEL-BAKEOFF-ir48.md`) — Opus 5 vs Fable 5 both write his
   kit from the picture and are scored on 12 real defect classes; the winner's prompts get fired.
   Check whether he has run it before generating from the existing prompts.

**3. Then:** ir56 throw_a re-fire; sora/kitsune/thorn 3 specials each (Tim: all bosses get specials);
   a light-arena alpha re-key of ir56's specials (grey haze, invisible on the dark gorge but a
   latent blocker); then `input/MK FINAL/` roster + its 134 backgrounds (animate like phase-22).

### BROWSER OPERATIONAL NOTES (all verified this session)
- Tab: "Create AI Videos … | Higgsfield", Seedance 2.0, **1:1, 4s, 720p**, and the button MUST read
  **"GenerateUnlimited"** before EVERY fire (a reload resets it to credits = billing).
- **Kill autoplay `<video>` elements first** (`v.pause(); v.remove()`) — they freeze the renderer and
  cause CDP `Input.dispatchKeyEvent` timeouts. With them killed, `computer type` works fine; a
  timeout usually means the text LANDED but the click didn't, so VERIFY state, never blind-retry.
- Prompt field is a **Lexical contenteditable**: real `ctrl+a` + `Delete`, then `computer type`.
  `execCommand` paths double-insert or silently revert. ALWAYS verify `el.textContent` before firing.
- **ANCHOR SWAP (much easier than the old JS-injection dance):** click the small reference thumbnail
  → a "Use as…" menu opens and a **×** appears at its top-right → click the × → the "Upload media"
  dropzone appears → click its image icon → the Uploads picker opens → **the `input[type=file]` only
  exists once that dropzone is open**, then the native **`file_upload` MCP tool works directly**
  (copy the anchor into the session scratchpad first so the path is accepted). Verify the tile is
  the right character by ZOOMING it before selecting. NOTE: the left-panel **"Change" button opens
  the STYLE PRESET picker — do NOT click a preset**, it silently resets aspect to 16:9.
- **Chrome window OS-shrink** (viewport collapses to ~140x135, form at 0x0): `resize_window` reports
  success but may not take on the first call — **call it twice** with different sizes; that worked.
  Then `el.scrollIntoView()` since the form can sit off-screen.
- Renders were **15-25 min** at night (queue: Processing → Generating → done). `show_generations`
  lags several minutes behind the tab — poll the tab's badge, then use MCP for the rawUrl, and
  ALWAYS confirm `params.prompt` matches what you meant to fire.

### BINDING DOCTRINES (session 6; the session 4/5 ones below still apply)
1. **CONNECTED-EFFECT / ANTI-ROCKET**: an effect placed "at his feet / in front of him / beside him"
   renders as a DETACHED floating object that reads as a launched projectile. Lock it to erupt/wrap
   AROUND HIS OWN BODY or trace ALONG the blade — "stays CONNECTED to him, NOT a separate object,
   nothing detaches/launches/flies". The connected re-roll passed first try.
2. **PHANTOM-OBJECT from grab-framing**: a SOLO throw prompted as "grab/seize/clamp an unseen enemy"
   makes Seedance PAINT that enemy as a visible object (we got a brown ball in a fist). A solo throw
   must be a self-contained gesture with NO target — rake / smash / barge THROUGH EMPTY AIR — plus
   "no object, no ball, nothing in his hand, nothing enters the frame".
3. **interiorGreen keyer flag**: a semi-transparent body (smoke/glass) lets the chroma shine THROUGH
   where flood+despill can't reach; `scripts/key-enemies.mjs` has an opt-in alpha-estimate pass
   (hollow-pale only; the other 9 cutouts re-encode byte-identical). Watch for it on clip mattes too.
4. **cal-derivation without cal.json**: recompute from the shipped webm, but CROSS-CHECK the formula
   against a clip that HAS a known cal first (inverting satoshi's live cals recovers
   onH=1/onBG=0/onCX=0.5 = the full-bleed `qa-boss/anchors/<id>-anchor.png` convention). This caught
   a 0.732x stale-still trap in sora's ledger.
5. **The motion-energy argmax is often NOT the blow** — it can be the return-to-anchor or an effect
   collapsing. Verify with a reach/centroid trace (corrections made: ir56 block_b 3000→2083,
   smoke-shroud f72→f48, LK strike_b f23→f36).
6. **Pulling a bad take is cheap and reversible** — `clipVariants` treats a 1-element array like a
   bare clip, and an EMPTY `special: []` correctly falls back to the attack state
   (`FightExperience.tsx:1789`). Pull first, re-roll after; never ship a known-defective take while
   waiting on a render. Prove it with a throwaway integrity test (every non-special state resolves
   ≥1 take, every referenced webm exists on disk).

---

### ★★★★★★ SESSION 6 START HERE (written end of session 5, 2026-07-26 ~03:15) — SUPERSEDED BY THE OPUS 5 BLOCK ABOVE; kept for its browser/keying method detail ★★★★★★

You are the ORCHESTRATOR (plan / brief / verify / review / commit). You run generation
in YOUR loop (browser Higgsfield Unlimited, ZERO credits); Opus builder subagents do
keying + wiring from implementation-grade briefs, and you re-run every gate yourself
and live-drive before committing. Never trust a builder's self-report. Full operating
model in §0 below.

**WHERE THE GAME IS (HEAD `913b815`, 157/157 vitest, engines byte-frozen):**
The campaign has **5 of 10 nodes fighting with their OWN animated character** and
playable-after-beaten: node 5 SATOSHI ODACHI, 6 ECLIPSE OFUDA, 7 IR-37 PINK TESSEN,
9 LADY KUROTACHI are LIVE + wired; node 4 HOLLOW PALE kit is 11/13 generated (wiring
pending). Nodes still on VOLTA stand-in visuals: 1 (sora), 2 (kitsune - BLOCKED),
3 (thorn), 8 (ir56), 10 (ir48 finalboss - not started).

**WHAT SESSION 5 SHIPPED (commits, newest first):**
- `913b815` phase 24e: satoshi special_2 = ODACHI QUAKE (cyclone retired; keyed +
  drop-in swapped into his wired kit; left-edge feather f44-54; contact 2417ms).
- `2062dee` phase 24d: ECLIPSE (node 6, **faces:'left'** - first left-facing boss) +
  LADY KUROTACHI (node 9) WIRED as live node enemies + playable-after-beaten. Gates
  re-run by orchestrator, live-driven (qa-boss/wire2-drive.mjs + wire2-shots/, money
  to the cent 5.00 x3.51 -> -5.00, bank 995.00).
- `6adafd9` LK (13/13) + eclipse (8 energy takes) KEYED + ENCODED via two background
  Opus keyer agents, orchestrator-verified (matte proofs viewed, alpha_mode=1).
- `4f744a2` / `e2a26c8` LK kit + eclipse energy wave generation complete.
- `7d8f498` a prior handoff (night-shift). THIS block supersedes it.

**LIVE IN-FLIGHT AT HANDOFF — HOLLOW PALE (node 4) kit, 11/13 generated (all in
`qa-boss/hollow-pale-clipdata.json`, raws in qa-boss/raw/hollow-pale-*.mp4; NOT keyed,
NOT wired yet):** idle✓ strike_a(v2 low-wind-up)✓ strike_b(v1 primary +top-left
feather f32-40; v2=b-take) throw_a✓ throw_b✓ block_a(wing-wrap shield)✓
block_b(blade-tucks-behind note)✓ hit✓ ko✓ victory✓ + **special_1 (PALE HARVEST)
RENDERING at handoff**. STILL TO FIRE: special_1 (harvest — poll it), special_2 (INK
BLOOM), special_3 (SMOKE SPIKE) — prompts in qa-boss/prompts/hollow-pale.md. Anchor
in the browser slot is hollow-pale (media fd71787f in the picker / 2387650b MCP);
both moderation gates PASSED (upload + generation). HIS BONE-BLADE ARM has eclipse's
overlong-weapon geometry, so EVERY blade action already carries the "below his antlers
/ below shoulder height / low wind-up" caps — keep them on sp2/sp3.

**EXACT NEXT QUEUE (one render at a time, ~5-12min each, QA prev during next, ledger
every verdict):**
1. Finish HOLLOW PALE: poll special_1, fire special_2 (INK BLOOM), fire special_3
   (SMOKE SPIKE). Then his kit is 13/13.
2. KEY + WIRE hollow-pale (node 4) — dispatch the proven keyer + wiring Opus briefs
   (templates: the session-5 agent prompts; green pipeline = key-idle-clips.mjs +
   green-despill + green-neutralize; faces:'right', NO flip). Apply the recorded
   feathers (strike_a v1 was demoted — strike_a v2 is primary; strike_b v1 primary
   +top-left feather f32-40). Then it's node 4 live.
3. IR48 HEX PAPER LORD (node 10, FINALBOSS) kit — 13 clips. Anchors exist
   (qa-boss/anchors/ir48-*), prompts authored (qa-boss/prompts/ir48-hex-paper-lord.md).
   Upload his anchor via the MCP-upload -> browser-file-input method (see below), fire
   idle first as a moderation test.
4. STRAGGLERS: ir56 throw_a + special_3 re-fires (2); ir37 strike_a v3 + throws/blocks
   energy (5); sora/kitsune/thorn specials (9 — Tim: all bosses get specials).
5. WIRE WAVE 3 as kits complete (sora->n1, thorn->n3, ir56->n8, ir48->n10, kitsune->n2
   if unblocked). Same phase-24 pattern (manifest + node fighterId flip in ONE commit).
6. THEN: `input/MK FINAL/` roster (static cards) + its 134 backgrounds (animate like
   the phase-22 arena loops).

**BLOCKED — NEEDS TIM'S DECISION: KITSUNE (node 2).** The matte moderation test PROVED
the tanto glow is BAKED INTO THE ANCHOR ART (gold-green flame aura with literal green
wisps on the blade — unkeyable; a quadruple matte-lock prompt could not override the
reference). Options recorded in kitsune-tanto-clipdata.json: (A) ~1-2cr nano_banana
anchor edit — plain matte steel tanto, no glow (needs Tim's credit approval); (B) free
local pixel-surgery on the blade region (Seedance-amplification risk); (C) keep parked.
Do NOT re-fire kitsune until Tim rules. **NEW LAW: a defect baked into the ANCHOR (glow,
dual-blade, wrong facing) can never be prompted away — VIEW the anchor full-size before
firing a kit, and fix the anchor, not the prompt.**

**★ SESSION-5 DOCTRINE ADDENDA (all binding, added to the session-4 doctrines below):**
1. **PHANTOM-PROJECTILE / INVISIBLE-FORCE**: hit-reaction prompts attract a phantom
   object flying in (LK got one twice). Fix = name the cause "an INVISIBLE force" +
   "NOTHING enters the frame, no object/weapon/debris/projectile". If it still appears
   only in the LEAD frames, HEAD-TRIM (LK hit_v2 = start at f10) beats a re-roll.
2. **HORIZONTAL-BAR PARRY LAW**: a long blade (eclipse katana, hollow-pale bone-scythe)
   crosses the top edge on ANY vertical hold. Parries must be explicitly HORIZONTAL /
   "level like a bar" / "below the antlers". (LK block_b, eclipse block_a v3.)
3. **ONE-ACTION LOCK**: energy verbs make some chars (eclipse) do a spinning multi-hit
   kata. Append "It is ONE single action and nothing else: does NOT spin, NOT turn,
   NOT repeat, back NEVER faces camera, faces the SAME direction the entire clip."
4. **PROP-CENTRIC IDLE (re-confirmed)**: "stalks in place / breathes / predator" =
   body-language verbs = a hidden 180 turn. Idle must be PLANTED prop business
   (finger drums, weapon lift+set, weight shift, feet never move). Eclipse needed v4.
5. **STEEL-BLADE DRIFT is a Seedance lighting prior**: a horizontal blade renders
   silver even on a black-blade char. A blade-colour lock ("glossy BLACK blade, crimson
   rings, NOT silver/steel/gold") pulls rings + wraps back fully but only reduces the
   blade to an edge highlight. (LK strike_b v4.)
6. **MOTION-FIRST SPECIALS**: containment wording that matches the resting pose makes
   Seedance paint a no-action glow on the static weapon. The acting line must LEAD with
   the violent cut; ignition happens DURING it. Also "snaps blade DOWN" can make f0
   start at the top of the stroke — name the raise INSIDE the clip. (LK special_1 v3.)
7. **16:9 SOURCES ARE FINE**: the keyer crops each clip to its action bbox + cal.json
   normalizes geometry, so an accidental 16:9 render is usable (eclipse strike_b). The
   1:1 rule is for ANCHOR PLATES, not shipped webms. STILL: after any UI mishap verify
   4s / 1:1 / 720p + button reads "GenerateUnlimited" before firing.
8. **"RIGHTS VERIFICATION REQUIRED" GATE (NEW platform behavior)**: Higgsfield now
   randomly blurs some outputs behind a "Rights verification required" / "Confirm
   rights" modal. Click "I own rights to this content" -> "I confirm" (Tim's own art;
   same attestation precedent as the session-3 upload agreement). It also DELAYS
   show_generations indexing by a few min — poll the tab's Processing badge, not the MCP.
9. **CHROME WINDOW OS-SHRINK**: the automation window can collapse to 301x110 and CDP
   resize_window reports success but does NOT take (the whole create form sits at 0x0).
   Generation is impossible until TIM manually restores the window. While blocked, do
   the keying + wiring of already-generated kits via background agents (that's how the
   night shift shipped 24d/24e). Poll window size with a JS innerWidth check.

**OPERATIONAL FIRE LOOP (proven this session, ONE javascript_tool call sets prompt):**
Browser tab titled "Create AI Videos ... | Higgsfield", Seedance 2.0, 1:1, 4s, 720p,
Unlimited ON. Set the Lexical prompt by: focus -> `document.execCommand('selectAll')`
-> `execCommand('insertText', false, TEXT.slice(0,240))` -> loop the rest in 240-char
chunks with ~300-400ms settle waits -> verify `el.textContent===TEXT` (a bare delete
is a Lexical no-op; ALWAYS selectAll+replace; a single long insert SILENTLY REVERTS).
Fire: `[...buttons].find(b=>/GenerateUnlimited/.test(b.textContent)).click()` (guard on
swOn && aspectOk). ANCHOR SWAP without OS dialog: MCP `media_upload` the plate -> curl
PUT to presigned -> `media_confirm` -> in the browser click the "Upload media" dropzone
-> in JS `input=document.querySelector('input[type=file]'); input.files=dt.files;
input.dispatchEvent(new Event('change'))` with the CloudFront blob -> wait for content
verify -> click the newest Uploads tile (VERIFY identity via the fired gen's
medias[0].url, download+view). Poll a render with a background `sleep 300-720` + a
zoomed screenshot of the top result card (Processing/Generating/rendered).

(The session-4/5 doctrine + method blocks below remain valid; this SESSION 6 block is
the resume point and supersedes their next-step lists.)

### ★★★★★ SESSION 5 START HERE (written end of session 4, 2026-07-24 afternoon) — SUPERSEDED BY SESSION 6 ABOVE ★★★★★

**WHERE THE GAME IS (HEAD ~2507ccf, 157/157 vitest, engine byte-frozen as always):**
- **Phase 24 SHIPPED (706effe): SATOSHI ODACHI (node 5) + IR-37 PINK TESSEN (node 7)
  are LIVE in-game as animated node enemies** (13-clip kits each: takes + specials +
  measured cals/contacts), plus the NEW **playable-after-beaten** unlock:
  `src/characters/rosterGating.ts` gates charSelect boss tiles on campaign
  beaten[] (gorvak/volta always available; locked boss = mystery "?" tile; grid
  fixed at 22). WIRING INVARIANT: register a boss manifest + flip its node
  fighterId in the SAME commit or the gate treats it as ungated.
- **Phase 24b (2507ccf): ir37's three ENERGY re-roll clips are live in-game**
  (idle fan-snap loop, lunging dagger strike contact 2167ms, fan-cleave arc) —
  Tim: "WAY better".
- **Kit pipeline state (per-boss QA ledgers = qa-boss/<id>-clipdata.json, THE
  source of truth; keyed webms in qa-boss/webm/ + matte proofs in qa-boss/proc/):**
  n1 SORA 10/10 keyed PASS (Tim's ALIVENESS BENCHMARK - never touch) ·
  n2 KITSUNE 2/10 (8 raws have GLOWING blades + baked VFX = unshippable; matte
  re-fires queued; the glow may be in the anchor - harden the matte lock, test one
  first) · n3 THORN 10/10 keyed PASS (block_a has a baked white flash - Tim call) ·
  n4 HOLLOW PALE 0/13 (kit AUTHORED doctrine-native in prompts/hollow-pale.md;
  MODERATION-TEST the idle first) · n5 SATOSHI 13/13 WIRED (special_2 cyclone
  REJECTED by Tim -> ODACHI QUAKE replacement authored, re-fire + swap) ·
  n6 ECLIPSE 11/13 keyed but Tim ruled the WHOLE action set static -> full ENERGY
  WAVE v2 blocks authored in prompts/eclipse-ofuda.md (8 re-fires; hit/ko/specials
  keep v1; victory v1 FAILED anyway; she faces LEFT - manifest faces:'left') ·
  n7 IR37 WIRED + energy-swapped (strike_a v3 queued: v2's glint grazes right edge
  146px; throws/blocks energy re-rolls queued last) · n8 IR56 12/13 keyed (specials'
  magenta fringe FIXED via adapted warm-haze neutralize; throw_a torso-rotation FAIL
  + special_3 degraded -> 2 re-fires queued) · n9 LADY KUROTACHI energy kit IN
  FLIGHT: idle v4 PASS, strike_a v2 PASS, throw_a v2 conditional-pass, throw_b
  conditional (amber wrap drift), **strike_b v3 (thrust) RENDERING at handoff**;
  still to fire: block_a, block_b, hit, ko, victory, special_1/2/3 (prompts all
  energy-passed in prompts/lady-kurotachi.md) · n10 IR48 0/13 (kit AUTHORED
  doctrine-native in prompts/ir48-hex-paper-lord.md).
- **Tim's review page: qa-boss/preview.html served by `node qa-boss/serve-preview.mjs`
  (port 5341)** - reads the clipdata ledgers live, dark/light/checker stage, lazy-
  loads videos (80+ eager videos WEDGE Chrome's media pool browser-wide until
  restart - happened once; page now lazy-loads; tell Tim to use Edge if Chrome's
  players are exhausted). Keep it running while Tim reviews.

**★ THE SESSION-4 DOCTRINES (all BINDING - these are the difference between boring
and alive; full detail in the blocks below):**
1. **ENERGY DOCTRINE**: locks live in the shared SUFFIX only; the acting line
   carries VIOLENCE (coil -> explosive whole-body commitment -> follow-through ->
   eased recovery) + the character's signature theatric (ir37 fan-SNAP, LK whipped
   guards, eclipse ponytail/ofuda flare). Over-locking = NO-ACTION clips (LK
   strike_b v2); under-locking horizontal sweeps = frontal turns (LK strike_b v1).
2. **IDLE = PROP-CENTRIC business** (fan twirl+snap, blade lift+re-grip), NEVER
   body-language verbs ("sizing up prey", "rolls her shoulders" = posing frontal:
   LK idle v3 FAIL). Idles must be ALIVE with end==start (near-static locks are
   RETIRED - the seal is the loop, not stillness). SORA (map 1) is the bar.
3. **EDGE-OVERRUN**: visible overrun at review speed = RE-ROLL; feather only for
   imperceptible tip kisses. Framing guard phrase for big actions: "the whole
   action stays WELL INSIDE the frame with a wide margin on every side."
4. **Spin specials are BANNED** (720p renders them as smear - satoshi cyclone).
5. **KEYER SELECTION LAW**: pink/crimson-trimmed chars on GREEN ->
   scripts/key-clips-green-pinksafe.mjs; green-chroma kits need
   scripts/green-despill.mjs + scripts/green-neutralize.mjs (neutralize alpha=0
   pixels too - VP9 4:2:0 bleeds); magenta kits: stock keyer + magenta-neutralize
   for emissive fringe (ir56 needed an adapted warm-haze two-axis test - see its
   clipdata orchestrator_notes). Global memory: chroma-key-despill-lessons.md.
6. **Lexical prompt box**: long single insertText SILENTLY REVERTS - chunk ~250
   chars after a real ctrl+a Delete; ALWAYS verify field text === TEXT before
   clicking Generate; CDP timeouts usually mean the insert LANDED but the click
   didn't - verify state, then fire, never blind-retry.

**SESSION 5 PROGRESS (2026-07-24 evening): LK KIT COMPLETE — 13/13 usable takes**
(primary takes + full verdicts in lady-kurotachi-clipdata.json: idle_v4, strike_a_v2,
strike_b_v4 [blade-color lock take], throw_a_v2, throw_b v1 [conditional; v2 re-roll
FAILED worse: phantom cylinder + frontal turn], block_a_v2 [v1 top-edge FAIL],
block_b, hit_v2 [HEAD-TRIM f10: phantom bolt lives f5-f9 only], ko, victory,
special_1_v3 [v1 no-action, v2 top-edge], special_2, special_3_v2 [conditional
steel-hold]). NEW SESSION-5 DOCTRINE ADDENDA: (a) hit-reaction prompts attract
PHANTOM PROJECTILES (2 in a row) - if the phantom lives only in the lead frames,
HEAD-TRIM beats a re-roll; (b) horizontal-blade STEEL drift is a Seedance lighting
prior - a blade-color lock line reduces it to an edge highlight (rings/wraps ARE
fully lockable) but cannot remove it; (c) specials need MOTION-FIRST acting lines -
containment wording that matches the resting pose gets a no-action glow clip; (d)
'snaps the blade down' can make f0 START at the top of the stroke - name the raise
INSIDE the clip. ECLIPSE WAVE STARTED: anchor swapped in Uploads picker, idle v2
fired. Remaining LK re-roll options (Tim call): sp3 v3 + throw_b v3 with locks.**

**SESSION 5 (cont, night 24->25 Jul): ECLIPSE ENERGY WAVE COMPLETE — all 8 states
banked** (ledger energy_rerolls block: idle_v4 [prop-centric fixed her 180-turns],
strike_a_v3 [ONE-action lock kills her spin-kata prior], strike_b_v4-16:9 [PIPELINE
CORRECTION: keyer crops to action bbox so 16:9 sources are FINE - an aspect-reset
mishap turned into this ruling], throw_a_v2, throw_b_v3 [tucked-blade law for her
overlong katana], block_a_v3 [HORIZONTAL-bar parry law - her blade is too long for
ANY vertical hold; top feather f71-76], block_b_v3 [LK-pattern arm-only brace],
victory_v2 [feather]). v1 keeps: hit/ko/sp1-3. FACES LEFT (anchor ground-truth
5972e73a viewed; the -r label lie confirmed; manifest faces:'left', no hflip).
NEW SESSION-5 ECLIPSE DOCTRINES: one-action lock, horizontal-parry law, tucked-carry
law, 16:9-sources-are-fine ruling, prop-centric idle (2nd confirmation). NEW GATE:
Higgsfield now randomly blurs outputs behind 'Rights verification required' -
confirm via 'I own rights' (Tim's own art, session-3 attestation precedent); the
gate also DELAYS show_generations indexing. PANEL LAW: after any UI mishap verify
4s/1:1/720p + GenerateUnlimited before firing (a preset-picker misclick silently
reset aspect to 16:9 for 2 fires).**

**SESSION 5 NIGHT SHIFT (25 Jul ~02-04h): while the browser was BLOCKED (Chrome
window OS-shrunk to 301x110 - CDP resize_window reports success but does NOT take;
the mini layout hides the whole create form at 0x0, so no fires possible until the
window is manually restored), the completed kits were KEYED + WIRED via background
builders, each independently verified by the orchestrator:**
- **KEYED (6adafd9)**: LK 13/13 via key-clips-green-pinksafe (pink trim/crimson
  rings intact - proofs viewed; hit head-trimmed to 87 frames), eclipse 8 energy
  takes via stock keyer + despill + neutralize (feathers: victory top+left; block_a
  f62/f73 - the agent RE-MEASURED my f71-76 note and was right), v1 webms archived
  qa-boss/webm/old-v1/, all alpha_mode=1 verified.
- **WIRED (2062dee, phase 24d)**: eclipse -> node 6 (faces:'left', FIRST left-facing
  boss - native facing = enemy side needs no mirror) + LK -> node 9. Gates re-run by
  orchestrator (tsc, 157/157, build, engines 0-diff, fightCampaign diff = ONLY two
  fighterId swaps). LIVE-DRIVEN (qa-boss/wire2-drive.mjs + wire2-shots/, screenshots
  VIEWED): both bosses animate in-fight, video-probe shows their webms mounted+
  playing, money to the cent (5.00 x3.51 defeat -> net -5.00, bank 995.00).
  DRIVER NOTES: title needs PRESS TO BEGIN first; campaign.v1 seeding shape differs
  - use the ?dev=1 CONQUER NEXT hook instead; node buttons carry the name in
  aria-label/textContent ('HOLLOW SHRINE' etc.).
- **SATOSHI QUAKE mid-flight**: anchor ALREADY SWAPPED to satoshi's tile in the
  Uploads picker (grid-index calibrated vs the Not-eligible onryo tile at index 11;
  satoshi = index 10) + the QUAKE prompt text is in window.__CUR of the tab; when
  the window is restored: verify 4s/1:1/720p + GenerateUnlimited, insert (selectAll
  -> chunked insertText with 400ms settle waits - delete is a Lexical no-op, only
  selectAll+replace works), fire, then verify the anchor identity via the fired
  generation's medias[0].url (download+view).

**WHAT TO DO NEXT (the exact queue, one render at a time, ~15min each, QA the
previous during the next render, record EVERY verdict in the clipdata ledger):**
1. ~~LK kit~~ DONE. 2'. ~~Eclipse wave~~ DONE + both KEYED + WIRED (see above).
2. ECLIPSE energy wave (8): swap anchor in the Uploads picker (her green -r tile;
   verify via the fired generation's medias[0]), fire idle v2..victory v2 per her
   prompts file.
3. SATOSHI ODACHI QUAKE (1 clip) -> key (green pipeline) -> swap special_2 into
   his wired kit (webm + cal + contacts, phase-24b pattern).
4. KITSUNE matte re-fires (8) - moderation of the glow: fire ONE strike with a
   hardened "plain matte steel tanto, NOT glowing, no energy effects" line; if the
   glow persists the ANCHOR needs replacing (prep-boss-anchors off Tim's original).
5. HOLLOW PALE kit (13; idle FIRST as moderation test - if hard-blocked like
   Onryo, STOP and tell Tim).
6. IR48 FINALBOSS kit (13).
7. Small stragglers: ir56 throw_a + special_3 re-fires, ir37 strike_a v3 +
   throws/blocks energy (5), nodes 1-3 specials (9 - Tim: all bosses get specials).
8. WIRE WAVE 2 as kits complete (phase-24 pattern, one builder brief per batch):
   sora-yari -> node 1, thorn-warden -> node 3, eclipse (faces:'left') -> node 6,
   ir56 -> node 8, LK -> node 9, kitsune -> node 2, hollow-pale -> node 4,
   ir48 -> node 10. Gates every time: tsc, vitest (157+), build, engine byte-frozen,
   live drive w/ VIEWED screenshots, money to the cent.
9. THEN: `input/MK FINAL/` roster (static cards) + its 134 backgrounds (animate
   like phase-22 arenas).
Energy re-rolls that pass DROP-IN replace wired webms (key + cal + contacts, no
code) - the phase-24b agent brief is the template.

**OPERATIONALLY:** browser tab "Create AI Videos... | Higgsfield" (Seedance 2.0,
1:1, 4s, 720p, Unlimited toggle ON - button MUST read "GenerateUnlimited" before
EVERY fire; a reload resets it to credits). ZERO credits spent again this session
(balance untouched). MCP show_generations lags ~5-15min - poll the tab's
Processing state for completion, then show_generations for the rawUrl. ONE
generation at a time (free tier). Fire cadence: harvest -> fire next -> QA the
harvested one during the render -> record verdict -> timer (background sleep
~800s) -> repeat.

(The SESSION 3/4 blocks below are historical detail; this section supersedes
their next-step lists.)

### ★★★ SESSION 4 RULING 2 (Tim, 2026-07-24): ENERGY DOCTRINE — BINDING ★★★
Tim: "ir37 pink tessen looks very boring compared to gorvak - strikes and idle."
ROOT CAUSE: the boss prompts' acting lines were written in containment language
("quick compact", "short compact", "subtle sway") — the defect locks leaked into the
ACTING. BINDING RULE for every remaining generation (LK rest-of-kit, hollow-pale,
ir48, all re-rolls): containment/profile locks live in the shared SUFFIX ONLY; the
acting line carries VIOLENCE per the GORVAK motion doctrine — anticipation/coil ->
explosive whole-body commitment -> follow-through -> eased recovery, plus each
character's signature theatric (ir37: the war-fan SNAPPING open; LK: whipped guards,
vicious counters). Over-locking has its own failure mode: LK strike_b v2 double-baked
the torso lock into the acting line and got a NO-ACTION clip (recorded in her
clipdata). ir37 idle/strike_a/strike_b v2 ENERGY prompts authored in her prompts file
- re-roll them (free) and drop-in replace the webms + cal/contacts when they pass.
Consider the same audit for eclipse/ir56/satoshi strikes after Tim reviews them
in-game (satoshi's odachi arcs measured with real wind-up; likely fine).
EXTENDED (Tim, same day, via the qa-boss/preview.html review page): "map 9 looks
bad super boring and static" -> LK's pre-doctrine clips (near-static idle v2,
compact strike_a, gentle throw_a) get ENERGY re-rolls too (v3/v2 prompts authored
in her file); the near-static idle LOCK is retired everywhere - idles must be ALIVE
with end==start (the hitch fix is the seal, not stillness). Review page:
qa-boss/preview.html + serve-preview.mjs on :5341 (reads clipdata ledgers live;
Chrome media stack can wedge under 80+ videos - lazy-load built in; use Edge if
this Chrome profile's players are exhausted).
★ EDGE-OVERRUN RULE TIGHTENED (Tim, 2026-07-24: "one of the strikes of ir37 goes
outside the box of animation"): the old rule accepted 1-few-frame tip grazes with a
48px edge-feather. NEW BAR: if the overrun is VISIBLE at review speed (weapon/effect
slicing or fading at an invisible line), it is a RE-ROLL, not a feather - feathers
are only for imperceptible tip kisses. Applies to ir37 strike_b v2's arc graze
(check the keyed result; if the slice reads, re-roll v3 with 'the arc stays well
inside the frame with a wide margin') and to the feathered v1 clips (throw-b/
block-a/block-b/sp1) - re-check each keyed webm at review speed and queue re-rolls
for any that read. Framing guard for future big-motion prompts: 'the whole action
stays WELL INSIDE the frame with a wide margin on every side'.
★ ALIVENESS BENCHMARK (Tim): "compare to map 1 - the character is way more alive in
her movement." SORA YARI (map 1) = the approved aliveness bar. Cause confirmed: her
kit is SESSION-1 (pre lock-creep); sessions 2-3 stacked containment locks that
strangled acting. Judge every new/re-rolled clip against sora's read; her kit stays
AS-IS.
TIM'S REVIEW VERDICTS (2026-07-24, via the page): map5 special_2 cyclone BAD (spin
= 720p smear -> CONCEPT REPLACED with ODACHI QUAKE, never re-roll a full spin);
map6 eclipse ALL poses+strikes static -> full energy wave v2 blocks authored in her
prompts file (8 re-rolls; hit/ko/specials keep v1); map7 ir37 v1 strikes boring but
strike a/b v2 "WAY better" (doctrine confirmed; her throws/blocks queued for the
same treatment last). BROWSER RE-FIRE QUEUE (order): ir37 idle v3 (in flight) ->
LK energy re-rolls idle v3/strike_a v2/throw_a v2 + her 8 remaining states +
throw_b v2 -> eclipse energy wave (8) -> satoshi QUAKE (1) -> kitsune matte
re-fires (8, check anchor glow first) -> hollow-pale kit (13, moderation-test
idle) -> ir48 finalboss kit (13) -> ir56 throw_a+special_3 (2) -> ir37
throws/blocks energy (4) -> nodes 1-3 specials (9). ~70 clips ≈ 17h render — keep
grinding sequentially across sessions; QA each during the next render; passing
energy re-rolls DROP-IN replace wired webms (key + cal + contacts, no code).

### ★★★ SESSION 4 RULING (Tim, 2026-07-24) — WIRING IS GREENLIT ★★★
Tim: "do QA on the animation we have from map 1 till final boss, if they go through add
them already in the game, dont make them playable characters only make them playable
after defeating the map." This SUPERSEDES ruling 2 below ("do NOT wire yet"):
1. QA every boss kit (contract §6 sweep), key + encode via the proven VOLTA/GORVAK
   pipeline (key-idle-clips.mjs -> VP9 alpha, measured contacts).
2. Passing kits get WIRED as node enemies (FighterDef manifest + registry + node
   fighterId in fightCampaign.ts; money fields byte-identical).
3. NEW FEATURE: each boss becomes a PLAYABLE character ONLY after its node is beaten
   (charSelect gates boss tiles on frozen-requiem.campaign.v1 beaten[]; locked = mystery
   "?" tile). GORVAK + VOLTA stay always-available.
Session 4 state: LK idle v2 QA-PASSED (clipdata updated), strike_a fired ~09:5x; four
Opus agents dispatched to QA+key+encode satoshi/eclipse/ir37/ir56 kits (outputs
qa-boss/webm/ + updated clipdata + matte proofs in qa-boss/proc/); harvest agent
inventorying sora/kitsune/thorn from account history (missing states get re-fired).
NEW LEXICAL GOTCHA (session 4): long single execCommand insertText is SILENTLY
REVERTED — insert in ~250-char chunks after selectAll; clear remnants with real
ctrl+Home + Delete keypresses; ALWAYS verify field text before clicking Generate.
NEW KEYER LAW (session 4, ir37 agent finding): scripts/key-idle-clips.mjs's global
magenta-family suppress CRUSHES hot-pink characters (pink IS magenta-family) and its
magenta despill leaves green halos on GREEN-screen clips. GREEN clips of pink/crimson
-trimmed bosses (ir37, lady-kurotachi, hollow-pale) key with
scripts/key-clips-green-pinksafe.mjs (ported fork, same cal math). ALSO (satoshi
agent finding): the stock keyer has NO green despill — green-chroma kits need the
ported scripts/green-despill.mjs post-pass (warm green-dominant -> max(R,B) so straw/
fur stays warm; cool green-dominant -> grey so blooms read white not teal); satoshi's
13 webms already have it applied. THIRD PORT scripts/green-neutralize.mjs (eclipse
agent): green-chroma kits need a post-key neutralize that covers ALPHA=0 pixels too
(VP9 4:2:0 subsampling bleeds hidden green into visible edges after encode). All 3
lessons also in global memory chroma-key-despill-lessons.md. ECLIPSE kit state:
11/13 usable keyed (victory FAIL 180-rotation -> browser re-roll queued; strike_b
aggressive edge overrun feathered, optional re-roll) and NOTE: eclipse anchor+clips
actually face SCREEN-LEFT despite the -r labels -> her manifest must set
faces:'left'. SATOSHI 13/13 keyed PASS (green-despill applied). IR56 note: its
specials' green bloom lit the magenta screen -> magenta FRINGE ring around effects in
the keyed webms; run scripts/magenta-neutralize.mjs + inset-ring recheck before wiring
(recorded in ir56 clipdata). Kit QA state in qa-boss/<id>-clipdata.json per boss:
ir37 13/13 PASS keyed; ir56 12/13 (throw_a torso-rotation FAIL + special_3 degraded
-> both in the free browser re-fire queue); satoshi/eclipse agents in flight.

### ★★★ SESSION 3 UPDATE (2026-07-24) — READ THIS FIRST ★★★

Still GENERATION-ONLY, still ZERO credits (browser Higgsfield Unlimited), balance
**1210 untouched**. Everything lives in untracked `qa-boss/`; per-boss clip media ids are
saved in **`qa-boss/<char>-clipdata.json`** (idle/strike_a/…/special_3 → Higgsfield media
id). Per-boss prompt kits in `qa-boss/prompts/<char>.md`. Anchors in `qa-boss/anchors/`.

**BOSS KIT STATUS (13 clips each = 10 base states + 3 specials; Tim: ALL bosses get the 3
specials "for everyone"):**
- node 5 **Satoshi Odachi** — ✅ 13/13 (`satoshi-odachi-clipdata.json`, GREEN)
- node 6 **Eclipse Ofuda** — ✅ 13/13 (`eclipse-ofuda-clipdata.json`, GREEN, anchor hflipped)
- node 7 **IR37 Pink Tessen** — ✅ 13/13 (`ir37-pink-tessen-clipdata.json`, GREEN)
- node 8 **IR56 Lion Serpent** — ✅ 13/13 (`ir56-lion-serpent-clipdata.json`, **MAGENTA** — green-armored body)
- node 9 **Lady Kurotachi** — 🔄 IN PROGRESS (`lady-kurotachi-clipdata.json`, GREEN, anchor hflipped, media c337bf7b). idle being re-rolled to a near-static lock at handoff; then grind strike_a…special_3.
- node 4 **Hollow_Pale** — ⏳ QUEUED (`prompts/lady-kurotachi.md` style TBD). NEW char Tim dropped in `input/.../npc boss/map 4/` to REPLACE the blocked Onryo. Anchor ready: `qa-boss/anchors/hollow-pale-anchor-green.png` (GREEN, already green-screened, faces RIGHT no flip). Pale antlered yokai, **serrated bone-blade arm** (long, points right → right-edge risk, keep compact) + **floats on black smoke, no legs** (ko = smoke sinks/dissipates, no weapon-drop). Effects pale-gold/white/crimson NEVER green. **Do a moderation-test with idle first** (creepy creature may hard-block like Onryo).
- node 10 **IR48 Hex Paper Lord** (FINALBOSS) — ⏳ NOT STARTED. Anchors exist (`ir48-hex-paper-lord-anchor{,-green}.png`). View art, pick chroma, upload via the SESSION-3 method, author kit, generate 13.
- node 4 **Onryo Katana** — ⛔ SUPERSEDED by Hollow_Pale (moderation hard-block, no override button). Old anchor/prompts remain but unused.
- nodes 1-3 (Sora Yari / Kitsune Tanto / Thorn Warden) — session-1/2 partial (see below); low-map non-special bosses.

**★★★ THREE MECHANICAL BREAKTHROUGHS THIS SESSION (all saved to global memory
`higgsfield-browser-lexical-input.md` — READ IT) ★★★**

1. **DEAD-KEYBOARD BYPASS (the CDP `type` can wedge completely).** The prompt box is a
   **Lexical contenteditable**. Set text WITHOUT the keyboard via:
   `el.focus(); document.execCommand('selectAll'); document.execCommand('insertText',false,TEXT);`
   This fires real `beforeinput` events Lexical processes → **syncs React state**. CRITICAL:
   `editor.setEditorState(...)` is **COSMETIC ONLY** — the field shows your text but Generate
   submits the STALE previous prompt (verified: made a duplicate idle). Always confirm the
   fired prompt afterward via `show_generations` newest `params.prompt`. `execCommand('delete')`
   after a manual DOM Range is a no-op (Lexical ignores foreign selections) → a bare insertText
   then DOUBLES the text; always use `selectAll` to replace.

2. **FIRE VIA JS, not coordinate clicks.**
   `[...document.querySelectorAll('button')].find(b=>/Generate/i.test(b.textContent)).click()`
   submits reliably (a mouse-click at the button sometimes no-ops). ALWAYS first verify Unlimited
   ON: `document.querySelector('button[role="switch"]').getAttribute('aria-checked')==='true'`
   (re-enable with `.click()`), and the button reads **"GenerateUnlimited"** (a reload resets it
   to "Generate NN" = credits — firing then would BILL). Kill autoplay `<video>` first (they
   freeze the renderer): `[...document.querySelectorAll('video')].forEach(v=>{v.pause();v.remove();})`.

3. **ANCHOR SWAP without the OS file picker (needed per new boss).** MCP-`media_upload`ed images
   do NOT appear in the browser Uploads modal (separate bucket). The left reference dropzone only
   OPENS the modal on click; synthetic DragEvents are ignored (untrusted). To upload THROUGH the
   browser: (a) remove the current anchor via the little **×** above its thumbnail; (b) fetch the
   anchor's CloudFront URL in-page → File; (c) persistently patch `HTMLInputElement.prototype.click`
   (a `type==='file'` input gets `Object.defineProperty(this,'files',{get:()=>dt.files})` + dispatch
   input/change instead of opening the dialog) AND `window.showOpenFilePicker` (return
   `[{getFile:async()=>file}]`); (d) do a **REAL TRUSTED click (computer tool)** on the modal's
   "Upload media" button — a JS `.click()` does NOT satisfy the user-activation gate (that was the
   missing piece); (e) the app uploads the injected file, mints a NEW browser media id, shows it as
   the newest Uploads thumbnail; (f) **TRUSTED-click that thumbnail** to load it into the reference
   slot ("Added to prompt box"). Verified lady-kurotachi (MCP id 4f7c57de → browser id c337bf7b).

**GRIND LOOP (one JS call per clip):** set prompt via execCommand + verify a keyword + Unlimited
ON + JS `.click()` Generate — all in ONE javascript_tool call that returns `{setOk,fired,banner}`.
Then PIPELINE: fire the NEXT clip immediately, and QA the JUST-FINISHED one during the ~15-min
render (curl the rawUrl → ffmpeg frame-strip `select='eq(n,0)+eq(n,24)+…',tile` → Read the PNG).
Congestion is ~15-18 min/clip at night. Use a background `sleep` + notification to wait.

**SEEDANCE DEFECT PLAYBOOK (what forced re-rolls on bosses 6-9 — bake into every prompt):**
- **Overhead raise clips the TOP edge** (strikes/victory/rising counters): constrain to
  "lift only to about head height, NEVER above the head, blade stays below the top edge."
- **Torso ROTATES to camera on blocks/guards** (the "why are they spinning" defect): make blocks
  **ARM-ONLY** — "keeping her torso LOCKED in strict side profile, ONLY her arms move … chest/hips/
  shoulders do NOT rotate or open toward the camera." Also keep counters LOW (no rising chop).
- **Specials balloon** into a **beam/stream/jet** (roar/energy) or a **ring/halo** that orbits, and
  overrun the frame edges. Fix: effect COLOR away from the chroma (on GREEN → pink/white/gold NEVER
  green; on MAGENTA → green/gold/white NEVER magenta), sized "no bigger than her head," CENTER of
  frame, "wide empty <chroma> margin on all four edges," and explicitly **"NOT a beam, NOT a stream,
  NOT a jet, NOT a ring, NOT a halo, does NOT orbit/shoot outward."**
- **EDGE-FEATHER vs RE-ROLL:** a marginal 1-few-frame TIP graze (weapon/tail tip crosses an edge) →
  ACCEPT + note a 48px edge-feather at keying (recorded in each clipdata `edge_feather_notes`).
  RE-ROLL only for gross overrun / torso-rotation / beam-ring / phantom-opponent / weapon-morph.
- **VERIFY-IDLE-FIRST with a near-static lock:** idle loops constantly, so the END pose must equal
  the START pose. Even a ~20° torso opening at frame 95 causes a visible loop hitch → re-roll idle as
  "holds the EXACT reference side-profile stance, ONLY breathes gently, does NOT step/turn/rotate/open,
  end pose IDENTICAL to start." Check full-size frames 0/48/95 (the small montage can mislead).
- **ko is the ONE off-anchor clip** (ends collapsed on the ground, not returning to stance) — use a
  ko-suffix that drops the "keeps weapon in hand"/"begins and ends same stance" lines; needs
  head-trim/lead-frame handling at keying (like volta/gorvak ko).

**CHROMA DECISIONS SO FAR (Tim's rule: default GREEN; MAGENTA only for a green-bodied char; NEVER
magenta on a pink/red char):** Satoshi GREEN, Eclipse GREEN, IR37 GREEN (black+pink), IR56 MAGENTA
(gold+GREEN armored body), Lady Kurotachi GREEN (black+pink/crimson), Hollow_Pale GREEN (pale+black).
Anchors that faced screen-left were hflipped to face RIGHT (roster faces right; engine mirrors).

**NEXT:** finish Lady Kurotachi (9) → Hollow_Pale (4, moderation-test) → IR48 finalboss (10) → then
the **game arena backgrounds** (Tim: "don't stop till all bosses finished and backgrounds are done").
Keying + dual-encode (mobile 400p/crf36 + desktop 540p/crf30 + WebP + lazy-load) stays DEFERRED per
Tim; edge-feather flagged clips per each clipdata's `edge_feather_notes`. Onryo rework optional.

---

**The job (Tim, 2026-07-23):** generate full animated fighter clip kits for all 10
CONQUEST bosses so each node fights with its OWN character (today node fights still
show VOLTA's clips + the enemy's face/name from phase 20-21). Also queued after:
`input/MK FINAL/` roster (mythic 63 / legendary 39 / XGundam 156 / rare 114) + its
`backgrounds/` (134, animate like the phase-22 arena loops). READ `CHARACTER-CONTRACT.md`
FIRST (THE LAW: anchor-lock, per-char acting §3, ≥2 takes/state §10, special §11,
cause-free ko, solo-safe throws, QA sweep §6). Also global memory
`genvideo-character-clip-lessons.md` + `higgsfield-generation.md` (skill).

**TIM'S PHASE-23 RULINGS (all binding):**
1. **ZERO CREDITS. Generate ONLY via browser Higgsfield Unlimited** (free). NEVER the
   Higgsfield MCP for generation (it bills credits). MCP is allowed ONLY for free
   storage/reads (media_upload, show_generations, job_status, curl downloads).
2. **Do NOT wire clips into the game yet** — "keep generating first, we add it later."
   So NO src/ or manifest changes this phase; all output stays in `qa-boss/`.
3. **Background color is PER-CHARACTER so the key never eats body colors:** pink/red/
   warm-bodied bosses (IR-37 Pink Tessen, IR-48 Hex Paper Lord, Kitsune) generate on
   GREEN; green-bodied (IR-56 Lion-Serpent) on MAGENTA; neutral/steel (Sora Yari) either.
4. **Maps 5-10 bosses get 3 SPECIAL ATTACKS each** (signature finishers, contract §11).
5. **When waiting on a generation, CHECK ~EVERY 1 MINUTE** if it's done.
6. **Use the Chrome extension** (mcp__claude-in-chrome__*) — the generation runs in the
   automation tab titled "Create AI Videos ... | Higgsfield"; Tim watches that tab.

**THE PROVEN FREE PIPELINE (works end-to-end, all steps zero-credit):**
- ANCHOR PLATES: `node scripts/prep-boss-anchors.mjs` → 1536² GREEN plates (default) for
  all 10 bosses at `qa-boss/anchors/<id>-anchor-green.png`; `node scripts/prep-boss-anchors.mjs
  magenta` → magenta plates. (Keys each boss's green original, composites feet-planted on
  the chroma plate.) Lion-serpent uses magenta; everyone else green.
- BROWSER SETUP: higgsfield.ai → Video → model **Seedance 2.0** (has [UNLIMITED] badge) →
  turn **"Unlimited mode" toggle ON** (Generate then reads "Generate Unlimited", no credit
  cost). Set aspect **1:1** (plates are square). A page refresh RESETS the Unlimited toggle
  OFF and Generate shows "24 18" credits — ALWAYS re-check the toggle is ON before firing.
- UPLOAD (no OS dialog): MCP `media_upload` the plate (free) → curl PUT to presigned →
  the CloudFront url is browser-fetchable → in the automation tab: empty the image slot
  (hover its thumb, click the ×), click the image icon to mount the dropzone, then JS:
  `const i=document.querySelector('input[type=file]'); const b=await(await fetch(CDNURL)).blob();
  const f=new File([b],'x.png',{type:'image/png'}); const dt=new DataTransfer(); dt.items.add(f);
  i.files=dt.files; i.dispatchEvent(new Event('change',{bubbles:true}));` (assignment sometimes
  needs a 2nd run) → one-time "Media upload agreement" modal (2 checkboxes = truthful for Tim's
  own art, tick both + "I agree, continue") → ~6s content-verify → it appears in the Uploads
  picker → click the tile to load it as the start image.
- PROMPT: the field is a **contenteditable (Lexical), NOT a textarea**. RELIABLE method =
  click it, `key ctrl+a`, `key Delete` (clears to 0), then computer `type` the prompt ONCE.
  (execCommand/value-setter double-insert or fail. VERIFY single copy via a textContent regex
  count.) Prompt scaffold (per §3): "The EXACT SAME <identity> ... on a solid saturated
  GREEN/MAGENTA chroma screen (<#00b140 green / #a3005f magenta>, nothing <opposite> anywhere)
  . <STATE acting> . <locks: armor/weapon EXACTLY same, camera locked no zoom/pan, full body in
  frame, ONLY figure in frame, begins+ends on EXACT reference stance, 24fps>". Sora Yari's full
  set is authored at `qa-boss/prompts/sora-yari.md` — clone its structure per boss.
- FIRE: click **Generate** (≈131,663). Takes ~4-5 min/clip (Unlimited is free but slow).
- **★ CRITICAL FIRING CADENCE (the big 2026-07-23 learning): fire ONE clip, then WAIT until
  the browser shows "Generating"/"Processing" (confirming it took) BEFORE firing the next.
  Rapid-firing Generate back-to-back DROPS the later clicks — they never submit.** This is
  exactly why Tim said "check every 1 min". Sequential only. (First attempt rapid-fired 10
  states/boss; only the 3-4 fired with a pause between them actually generated.)
- HARVEST: MCP `show_generations({type:'video',size:30})` lists completed clips + rawUrl
  (same account, free) — but it LAGS ~10min+ indexing browser jobs, so also read the result
  url off the played `<video>` in the tab (filter out the demo `seedance_2.mov`), and curl
  the `d8j0ntlcm91z4.cloudfront...hf_*.mp4`.
- KEY + ENCODE (all local, free, proven): extract frames (`ffmpeg -i clip.mp4 f_%03d.png`)
  → `node scripts/key-idle-clips.mjs <framesDir> <outDir> --still <keyedAnchorStill.png>`
  (magenta OR green — it border-samples the screen color automatically; emits cropped keyed
  frames + `<outDir>.cal.json`) → `ffmpeg -framerate 24 -i keyed/f_%03d.png -c:v libvpx-vp9
  -pix_fmt yuva420p -b:v 0 -crf 28 -an out.webm`. VERIFY the matte: composite a mid keyed frame
  over BLACK and WHITE (contract §6 sweep) — no chroma halo, body/weapon intact, no phantom
  opponent (throws are the risk — budget a re-roll). Measure attack `contacts` from motion-energy
  peak over the keyed frames (never guess).

**WHAT'S DONE (updated 2026-07-23 session 2; GENERATION only, keying DEFERRED per Tim):**
- 10 GREEN + 10 MAGENTA anchor plates (`qa-boss/anchors/`).
- **SORA YARI (node 1, MAGENTA):** ALL 10 clips generated on-model on the account (idle, strike-a,
  strike-b, throw-a, throw-b, block-a, block-b, hit, ko, victory). idle/strike-a/strike-b/throw-a
  also keyed+encoded to `qa-boss/webm/`. The rest raw/on-account (harvest via show_generations).
- **KITSUNE TANTO (node 2, GREEN):** ALL 10 clips generated. Kit RE-DONE single-blade + matte after
  the first idle came out DUAL-WIELDING (learning below). Prompts: `qa-boss/prompts/kitsune-tanto.md`
  (single-blade lock). NOTE: tanto renders with a gold sheen (not fully matte) — keys clean off green.
  Old green-GLOW idle/block discarded.
- **THORN WARDEN (node 3, GREEN, no specials):** ALL 10 clips generated + on-model (idle, strike-a,
  strike-b, throw-a, throw-b, block-a, block-b, hit, ko, victory). idle RE-ROLLED with a FACING lock
  (first idle rotated to frontal + broke the loop; v2 stays 3/4 screen-right, frame0==frame95, verified).
  anchor = browser media e3b4b549. Prompts: `qa-boss/prompts/thorn-warden.md` (facing lock in suffix).
- **ONRYO KATANA (node 4) — BLOCKED:** chroma = MAGENTA (green-flame katana makes green impossible;
  magenta keeps the flame + keys the white/grey/black body clean; anchor plate green-flame intact).
  MCP-uploaded anchor media 5d935d45. BUT the browser Uploads content-check flags it **"Not eligible"**
  (moderation false-positive — the ghost's tattered burial robe + pale translucent body reads as
  nsfw/gore). RESUME NEEDS an anchor rework: a less-tattered / more-covered onryo image (outpaint clothes
  or regenerate), then retry. Prompts already authored: `qa-boss/prompts/onryo-katana.md`.
- **SATOSHI ODACHI (node 5, GREEN, +3 specials/map5) — anchor uploaded, PENDING:** silver-haired ronin,
  tan skin, dark hakama, straw cape, plain steel odachi (no glow -> green fine). MCP anchor media
  fee7d25f uploaded; browser content-check was STUCK "Checking content..." (~30s, congestion). RESUME:
  reopen picker, wait for it to go eligible, select it, author prompts (samurai kit + 3 contained-effect
  specials), fire. NO prompts authored yet.
- **CONGESTION (2026-07-23 late):** Seedance degraded badly this session — 9-min generations (vs 4-5),
  submit POSTs hang ~90s then sometimes drop (re-verify each via show_generations; re-fire if absent),
  a full session/page RELOAD happened once (reset the Unlimited toggle -> ALWAYS re-verify the Generate
  button reads "Generate Unlimited" not credits before firing), and content-checks stall. When it clears,
  the loop is fast again. Refs go stale after any reload -> re-read_page for the Generate (submit) ref.

**SESSION-2 LEARNINGS (all baked into the prompt files above):**
1. **Free Unlimited = 1 generation at a time + rate-limited.** Rapid re-clicks -> silent HTTP 429 on
   POST `/fnf/jobs/v2/seedance_2_0` (no toast). Fire ONCE; confirm via the "Processing" banner or a 200
   in read_network_requests; on 429, back off ~2min then single-click. NEVER rapid-fire.
2. **Autoplaying feed videos freeze the renderer** -> `computer type` CDP-times-out (but often still
   lands — verify field via JS, don't blind-retry). Before each prompt type, JS-pause all `<video>`.
3. **Click Generate + focus the prompt field by REF** (ref_35 / the textbox ref) — the window keeps
   drifting size (even to mobile layout; resize_window back to ~1300x960), so coords are unreliable.
4. **Per-character chroma (Tim):** default GREEN; magenta ONLY for a green-bodied char (lion-serpent);
   NEVER magenta on pink/red chars. A GLOWING weapon on a matching screen is unrecoverable (Kitsune
   gold-GLOW went green) — spec MATTE weapons, add glow as an in-engine fx.
5. **VERIFY the idle of each new boss (frames 0/48/95) BEFORE firing its other 9 clips** — caught
   Kitsune dual-wield + Thorn frontal-rotation early. Add single-subject + facing/no-rotation locks.
6. **Encode standard (Tim, deferred phase):** mobile 400p/crf36 (~285KB) + desktop 540p/crf30 (~628KB)
   two-tier + WebP stills + lazy-load per node -> ~7MB/fight mobile. MK FINAL roster = NOT animated
   (static cards; a curated few become playable later). Account = cinematicpotato1507, 1210cr (browser
   Unlimited keeps them untouched).

**WHAT'S NEXT (resume the grind, sequential-fire cadence):**
1. RE-FIRE the states that got dropped by rapid-firing: Sora Yari {throw a/b, block a/b, hit,
   ko, victory} (magenta) and Kitsune {strike a/b, throw a/b, block a/b, hit, ko, victory}
   (green) — ONE at a time, wait-for-Generating between each. Prompts: sora-yari.md is written;
   author kitsune similarly (fox + gold tanto).
2. Then bosses 3-10 (thorn-warden, onryo-katana, satoshi-odachi, eclipse-ofuda, ir37-pink-tessen,
   ir56-lion-serpent[MAGENTA], lady-kurotachi, ir48-hex-paper-lord). VIEW each original first to
   pick green vs magenta. Maps 5-10 (satoshi..hex-lord) each get +3 specials (§11 finishers).
3. Key + encode every clip into `qa-boss/webm/<id>-<state>.webm` + save clipdata json per boss.
4. Then `input/MK FINAL/` roster + backgrounds.
5. WIRING INTO THE GAME IS A SEPARATE LATER PHASE (Tim's ruling) — when he greenlights it:
   per boss write `src/characters/<id>.ts` FighterDef (still/faces/portrait/clips with cal+
   contacts, contract §4), add to `src/characters/index.ts`, set that node's `fighterId` in
   `src/engine/fightCampaign.ts` (additive; money fields byte-identical), gates + live-drive.
   The cal system + VOLTA/GORVAK manifests are the template.

**GENERATION FACTS:** browser Unlimited = FREE (Tim's account, promo "top models unlimited");
MCP account token currently resolves to `user_3FzP62OkeSn8OYHW3kjt3xDrWKK` (browser account);
earlier arena uploads used a different token `user_3FLbEdg...`. Balance untouched by Unlimited
generation. ~4-5 min/clip; a full 10-13-clip boss kit ≈ 45-60 min sequential. This is a genuine
multi-session marathon; checkpoint progress to project memory each boss.

FRESH-SESSION START HERE (in this order, before touching anything):
1. Read this file fully, then `CAMPAIGN-SPEC.md` (campaign design of record) if the
   task touches the campaign, `CHARACTER-CONTRACT.md` (THE LAW) if it touches
   characters, `FIGHT-SPEC.md` §8 for duel rules.
2. Read project memory `frozen-requiem-state.md` (full phase log, phases 3-23).
3. `git log --oneline -20` to confirm HEAD (`bb4f0e7`); `npx vitest run` should print 148/148.
4. **If continuing the boss-clip work (the current active task), read the "## PHASE 23"
   section above — it is the resume point.** Otherwise ask Tim which backlog item to start.

## 0. Operating model (Tim's standing directive — read first)

You are the ORCHESTRATOR: plan, brief, verify, review, commit. Specialized subagents
(Opus builders via the Agent tool) do the building from implementation-grade briefs
(`subagent-briefing` skill); run generation (Higgsfield MCP) yourself — media ids, cost
preflights and Tim's approvals live in YOUR loop. NEVER trust a builder's self-report —
re-run its gates yourself, review the diff with your own eyes, then live-drive the real
game before committing. Keep ONE builder per feature; follow-ups via SendMessage to the
SAME agent (phases 13-14 ran 4 briefs, phase 17 ran 3 briefs through one agent each,
zero re-onboarding — a completed background agent RESUMES with full context). Tim
approves every credit spend per batch (hard law; when he explicitly asks for a
generated thing, preflight + state the cost and proceed on small spends). He answers
fast and concretely; treat his defect reports as correct SYMPTOMS and MEASURE the
mechanism (map-click complaint: my probe said center-clicks worked, the real causes
were parallax-moving targets + small discs — fix everything the measurement implicates,
not just the literal report). **Tim iterates design in rapid small rulings** (phase 17:
five sequential messages reshaped the campaign) — send delta briefs to the live builder
instead of restarting, and reconcile the design yourself before it lands. When he
overrules a design, rework BEFORE committing. Do the cheap reversible work immediately;
hold spends when he is AFK. Update project memory + this handoff at every phase
boundary; route durable lessons to global homes (SAVE-GLOBAL law).

## 1. What the game is now (state at HEAD)

A complete staked fighter with real multiplayer, a full Swoobz skin, and a SEASON
CAMPAIGN. Modes from the title screen: CONQUEST MAP (campaign), VERSUS CPU
(brute/warden/oracle quick duel - since phase 18 the personalities are FLAVOR only,
picks are uniform randomMove and a win pays 1.92x = 96% RTP, the campaign's pricing
doctrine; `cpuWinPayout` in fightStakes.ts), VS FRIEND (real ws multiplayer,
winner-takes-all 2S, unchanged - two humans trading stakes, no house edge).

### 1a. Core duel (phases 1-15, stable)
title -> mode -> charSelect (22-slot roster = GORVAK orc + VOLTA cyber-brawler + 20
mystery; live idle previews; ARENA picker) -> stake -> vsIntro -> rounds
(STRIKE>THROW>BLOCK>STRIKE, 3 HP, 5s shot clock, tie=CLASH) -> receipt. Both
characters ship the full contract kit (idle hub, variant attack takes, hit, SPECIAL
finisher w/ radial-feathered `-r2` fx, ko, victory chain); combo strings 1-3 contacts;
clip-driven CLASH. FRIEND MODE: ws room relay in vite dev+preview (`/fr-ws`), FRZxxx
codes, reconnect grace 10s + resume tokens, AUTO-PLAY on true disconnect (never
forfeit; ghost picks = uniform randomMove; leaver nets -stake), refunds ONLY for
never-started matches (stakeCommittedRef one-shot).

### 1b. CONQUEST MAP campaign (phases 16-17b, 2026-07-20/21) — RONIN ZERO season
Read `CAMPAIGN-SPEC.md` FIRST for campaign work. The compressed state:
- **10 nodes + 2 locked isles** on ORIGINAL generated sumi-e map art
  (`public/assets/campaign-map.webp`, no baked text) that is ALIVE: a Seedance
  image-to-video ambient loop (`campaign-map-loop.mp4`, trees sway/water flows/citadel
  fire, locked camera, muted, still-image fallback + reduced-motion) + CSS ambient
  (citadel glow breathe, seismic ring, cloud sweep) + pointer parallax that moves the
  SCENERY LAYER ONLY (node pins are static click targets - click-target law).
  Nodes/fog/flags/labels are code-drawn via MAP_CAL percent table.
- **PHASE-17 RULES (Tim): no quest objectives.** Every node = play normal RPS, WIN THE
  MATCH. Difficulty = two visible knobs: FORMAT (first-to-2 / first-to-3; the campaign
  judge reads round counts ONLY and plays PAST the frozen engine's 2-win matchOver —
  the engine's stale flag can even name the LOSER, never read it) and DEFENSE (enemy
  absorbs the player's first S decisive hits EACH ROUND; presented per node as
  'shield' = gold shard pips + SHIELDED deflection beat, or 'bulk' = visibly longer
  3+S segment health bar with normal hit beats — SAME math, +1 HP == 1 shield).
- **Ladder** (exact rationals, q(S)=1/2, 11/32, 29/128): n1-4 plain x1.92 | n5 bulk+1 /
  n6 shield1 x3.51 | n7 bulk+1 / n8 shield1 first-to-3 x4.25 | n9 bulk+2 x7.34 |
  n10 RONIN ZERO shield2 first-to-3 **x11.94** (8.0%). Every node <=96.00% RTP.
- **Money laws**: enemies pick `randomMove` ONLY (aiPick personalities are MEASURED
  exploitable: anti-brute 88% win = 176% RTP at 2x — never behind a real multiplier);
  flat 96% pricing at every node = grind/bet-size exploits structurally impossible;
  `applyCampaignExchange` in fightCampaign.ts is THE ONE shared absorb decision
  (provider + Monte-Carlo sim + tests import it — zero drift).
- Progression: beat node n -> n+1 unlocks forever (localStorage
  `frozen-requiem.campaign.v1` {v:1,beaten[10]}); conquered nodes replayable any bet.
  Demo cosmetic rewards REMOVED "for now" (Tim, phase 18b): the CampaignReward type,
  `reward?` registry field, all UI surfaces (map badge / node-card strip / receipt
  shine card), CSS and the two capsule webp assets stay WIRED - re-adding a reward is
  one registry-row edit on fightCampaign.ts.
- DEV force hooks (`?dev=1` on the map): CONQUER NEXT / RESET PROGRESS
  (progress-only, never money).
- HUD restyle (17b): lacquer-blade angled health plates + gold hairline, gold shard
  shield pips w/ blood crack when spent, hinomaru round pips. Presentation only.

## 2. Architecture map (learn before touching anything)

- `src/engine/fightEngine.ts` + `fightAi.ts` — **BYTE-FROZEN since phase 1**. Never
  edit; every commit checks `git diff --stat` shows them untouched. The campaign plays
  past their limits by COMPOSITION, never modification.
- `src/engine/fightCampaign.ts` — campaign brain: node registry (ONE row per node:
  roundsToWin/defense/multBps/fighterId/arenaId/reward — new enemy characters drop in
  by editing the row), `applyCampaignExchange` (shared absorb), `evaluateCampaignMatch`
  (round-count judge), `campaignPayout`, exact bigint-rational probabilities +
  displays. `scripts/campaign-rtp-sim.mjs` = the RTP battery (2M matches/node, seed
  0x7a11ce, bit-reproducible, FOREGROUND, band [95.0,96.1] — NOTE the ceiling is tight:
  plain nodes price at ~96.0 and some seeds bust by noise; the P-vs-exact 0.3% check
  pins the model seed-independently). RERUN IT after ANY campaign-math change.
- `src/engine/fightStakes.ts` — pure bigint stake math, TWO economies since phase 18:
  CPU duel house-priced via `CPU_WIN_BPS`/`cpuWinPayout` (1.92x = 96% RTP vs uniform-
  random); friend PvP winner-takes-all `potLamports`/`settle` (2S, no house edge).
- `src/engine/secureRng.ts` — `secureRandom()` = crypto.getRandomValues drop-in
  `() => number` (phase 18c UNPREDICTABILITY LAW): EVERY money-relevant runtime pick
  (CPU, campaign enemy, shot-clock/ghost auto-pick) draws from it. Seeded mulberry32
  is for tests/sims ONLY — never behind money at runtime.
- `src/provider/fightProvider.ts` — the state machine. Module-const timings (RG-C5),
  StrictMode-safe. Quick-duel/friend paths as at phase 15 (resolve windows, pick
  buffering, auto-play, stakeCommittedRef one-shot). Campaign layer: mode 'campaign' +
  phase 'campaignMap'; interception via applyCampaignExchange BEFORE the engine;
  defense buffer refills at match start + every startNextRound; judge after each round,
  'open' -> next round (even past engine matchOver), else round beat plays in
  ROUND_END_MS dwell -> settleCampaign (one-shot campaignSettledRef) -> matchEnd.
  Refund path (enterModeSelect) is GATED to friend+mode phase — campaign can never
  reach it (verified: no quit-mid-fight stake exploit).
- `src/transport/matchTransport.ts` + `src/server/matchRelay.ts` — friend-mode seam +
  dumb ws relay (vite plugin; server edits need a dev-server RESTART, no HMR).
- `src/characters/` + `src/arenas/` — registries; `clipVariants` resolver; facing rule.
- `src/ui/FightExperience.tsx` — zero-prop presentation. CAL block = baked-art
  geometry (values never change; drawn plates EXPAND past the CAL box at render time).
  MAP_CAL = campaign node positions (percent of the rendered map box; NEVER moves).
  MAP_LABEL = per-node {dx,dy} TRANSFORM-ONLY label offsets (phase 19 de-overlap;
  pointer-events:none). Campaign map = scenery layer (art+video+ambient, parallax
  target) UNDER static node pins; node hit boxes pinned to the DISC width (labels
  overflow without inflating the clickable box — no node's hit area may reach a
  neighbour's center; frontier z-top). Pips take `slots`, HealthBar takes
  `total` (bulk bars), ShieldPips re-key per round. fxReducer clipEnd stale-gate;
  victory-chain arm rides FxState; campaign end poses derive from campaignReceipt.met
  (NEVER engine matchOver). FINAL ROUND = round 2R-1; FINISH THEM reads display hp
  (engine hp + defense buffer).
- `src/ui/fight.css` — Swoobz DS tokens (ink #07080c / coal / bone #f2f3ef / fog;
  cyan #29E6FF, accent text <32px #00D0DE, fills #0EA5E9; gold #FFC83D; blood #FF4135
  == the Ronin Zero season red; Space Grotesk / JetBrains Mono / Anton hero). Cover-
  plate law: drawn HUD over baked art = alpha 1.0 + full footprint (0.94 ghosts, 0.97
  STILL ghosts — map scrim is opaque #07080c). Never -webkit-text-stroke with
  background-clip:text.
- `scripts/` — key-idle-clips / edge-feather (prop overflow only) / radial-feather
  (THE effect-clip feather) / magenta-neutralize (re-run inset-ring after ANY
  re-encode) / measure-contacts / campaign-rtp-sim.
- Storage keys ALL keep the historic `frozen-requiem.` prefix FOREVER (balance.v1,
  campaign.v1, arena.v1) — rebranding keys wipes player state. Hard-noted in code.

## 3. Hard-won learnings (26-38 new since phase 15; 39-44 new phases 18-19; 1-25 in
git history of this file @ 9372db9 + project memory — generation/keying/QA/timer laws
all still bind)

The phase 1-15 canon in brief: anchor hygiene, prompts paint what they narrate,
phantom-opponent class, effect clips run off the source frame -> radial-feather
doctrine (learning 23), head-trim free fixes, per-frame QA sweeps over dark AND white,
judge facing by the head, play-hook ground truth, click helpers must verify
registration + randomize picks, measured contacts, hidden videos are live actors,
curl is the dev-server truth, sequential downloads, absolute paths, one builder per
file, success paths must cancel their timeout timers + drives outlast the longest
timeout, isolated incognito contexts + frame-log for multiplayer, cover-plate law,
never live-drive a moving tree.

New (phases 16-17b):
26. **Skill-game RTP pricing law** (global memory `skill-game-rtp-pricing.md`): AI
    personalities are exploitable (MEASURED: anti-brute 88%/176% RTP, anti-warden
    73%/146%); price staked PvE to the uniform-random Nash baseline only. Difficulty
    that can back multipliers = structural handicaps with closed-form odds. Flat
    <=96% per node kills grind exploits structurally — no stake-cap rules needed.
27. **Difficulty knobs vs comprehension**: quest-style objectives (win 2-0, flawless)
    priced beautifully but FAILED Tim's comprehension bar; visible handicaps (longer
    HP bar, shield pips) price identically (+1 HP == 1 shield == P(3+S before 3)) and
    read instantly. Prefer knobs the HUD can SHOW.
28. **Playing past the frozen engine**: matchOver is advisory — the campaign judge
    reads round counts only. TRAP: applyExchange checks p1 first, so its stale
    matchOver can name the LOSER of a first-to-3 match. NEVER read engine matchOver
    in campaign code; end-poses derive from campaignReceipt.met.
29. **The shared-decision pattern**: any rule that must agree between provider, sim
    and tests (the absorb decision) lives in ONE exported pure function all three
    import. This is why the RTP battery is trustworthy.
30. **Moderation false-positives** (global: higgsfield-generation skill): a map
    animation died status:"nsfw" purely from "ember/fire/crimson" wording; sanitized
    re-roll ("warm red lantern glow") clean first try. Rewrite fire/blood-adjacent
    nouns, retry once.
31. **Living-map recipe** (same skill): image-to-video of a full illustrated scene
    with "camera absolutely locked + only ambient life moves + last frame matches
    first" keeps landmarks pinned (~0.8% aspect adaptation only). Ship muted (strip
    the audio track), still image stays as poster + reduced-motion fallback.
32. **Click-target law**: parallax/ambient may move SCENERY ONLY — never interactive
    pins (a 43px disc that drifts from the cursor is "really hard to click"). Give
    small targets enlarged invisible hit areas (::after inset), stack the primary
    target above neighbors, pointer-events:none on decorative siblings. Verify with
    elementFromPoint jitter probes (9 points, +-28px) AND a human-style approach that
    measures pin drift.
33. **Generated-art-for-UI law**: never bake text/numbers/labels into generated art
    (models render gibberish; content becomes uneditable). Nodes/fog/flags/labels are
    code-drawn; MAP_CAL percentages target the rendered image box. Spec estimates
    landed on-path first try; verify by VIEWING a live screenshot.
34. **Rebrand law**: renaming a game = visible brand only; localStorage keys keep the
    old prefix forever or every player's state silently wipes. Prove with seeded
    legacy-key data loading through the renamed build.
35. **Free-tier image gen is cheap** (nano_banana ~1cr/image, 2k) — map candidates and
    reward-card art cost 2-4cr total. Video is the expensive tier (Seedance 1080p 5s
    = 45cr). Preflight both (get_cost), state the number, spend small without
    ceremony when Tim asked for the thing explicitly.
36. **Tim's design-iteration pattern**: big features arrive as a stream of small
    corrective rulings (phase 17: five messages). Keep ONE builder alive, send delta
    briefs, reconcile the math/design yourself BEFORE the builder lands, and answer
    each ruling with what it costs (e.g. "all-normal fights => flat x1.92 unless we
    add a visible handicap").
37. Value-independent celebrations extend to REWARDS: identical fanfare/choreography
    for x1.28 and x8.77 payouts and for standard vs gold packs (RG-C5); reward cards
    are data on the node registry, EV-neutral, and never touch payout math (verified
    to the cent).
38. Sim assert ceilings need headroom: nodes priced at exactly 96.00% + a 96.1% upper
    assert = seed-dependent flakes. Pin the seed (bit-reproducible), keep an exact-P
    cross-check, and don't tighten the band below noise.

New (phases 18-19, 2026-07-21/22):
39. **Runtime-RNG unpredictability law** (global memory
    `runtime-rng-unpredictability.md`): a seeded non-crypto PRNG behind money voids
    the RTP pricing even when perfectly uniform — Date.now seeds are bracketed by the
    attacker's own clock (2-3 observed picks disambiguate the stream = all future
    picks known) and mulberry32's 32-bit state brute-forces from ~40 observed picks.
    CSPRNG (`secureRandom`) behind every money pick; engines taking injected
    `rng: () => number` swap sources with ZERO frozen-code changes. Audit grep:
    `mulberry32|Date\.now|Math\.random` over money paths.
40. **Bake the strongest exploit as a permanent test**: when a pricing claim rests on
    "no strategy beats X%", implement the best known counter-strategy (the
    frequency-counter that beat brute 88%) and pin it in the suite at a pinned seed
    (`quickDuelExploit.test.ts`: 100k matches, winRate in [0.49,0.51]). The claim
    stays enforced forever, not asserted once.
41. **CPU-mode pick reveal is SYNCHRONOUS**: pick() locks + reveals in one React
    commit, so the LOCKED/chosen pickbar state never paints a frame vs CPU (it shows
    only in friend mode where the reveal waits on the wire). Drive click-verify
    observable = the pickbar UNMOUNTS immediately after the click (an ignored click
    leaves it up for the full 5s shot clock) — NOT `.fr-pick-chosen`.
42. **REMATCH returns to the STAKE screen** (manual re-commit, spec: no auto-loop,
    RG-C5) — drivers must re-click "STAKE $x + FIGHT" per match; the stake deducts at
    the COMMIT, not at the rematch click.
43. **Mode-split settles keep the old path byte-provable**: the friend branch still
    calls the original `settle()` (never a hand-rolled equivalent) so "friend
    unchanged" is provable by construction + the mode-split test, not by review.
44. **Small map targets (phase 19)**: label text must never inflate the clickable
    box — pin the button box to the DISC width and let labels overflow
    (pointer-events:none); de-overlap labels via a per-node transform-only offset
    table (MAP_LABEL), never by moving MAP_CAL pins. Prove with an elementFromPoint
    all-nodes self-hit probe across progress states (fresh / mid / full-conquest).

## 4. Credits / generation facts (Higgsfield MCP)

- Balance ~103 (phase 22 spent 247.5cr on 10 arena ambient loops incl 1 nsfw re-roll; maze-runner night session spent ~440; was ~783 (phases 16-17b spent ~51cr: 4 map candidates, 45 living-map video,
  2 reward capsules; phases 18-19 spent ZERO — all engineering). Preflight
  `get_cost:true`; upload path media_upload -> presigned PUT (curl) -> media_confirm.
- Persistent media ids: GORVAK CLEAN anchor `35867470-54cd-4e75-94a6-10b915c61b19`,
  VOLTA anchor `19539771-3ddb-424d-a9af-a5bfc280957a`, black plate 1024
  `b757c6e3-263a-4eb6-a800-d37fd3391c77`, **campaign map source
  `fc814766-c746-479c-83f0-e7409e0d2357`** (2752x1536 sumi-e island — reuse for any
  map re-animation/variant). Job ids live in phase commit messages + project memory
  (map candidates 655e9040/c60a8ea0 + 2 frost spares, living-map b6e5ef74, capsules
  9617803e/a6c81d68).
- Seedance 2.0: 5s 1080p = 45cr, 720p = 22.5cr; nano_banana_2 image ~1cr @2k.

## 5. What to do next (Tim's likely priorities — ask him which)

**ACTIVE (2026-07-23): boss character CLIP GENERATION — see the "## PHASE 23" section
above for the full resume instructions. That is the live task.** Items 0-1 below are the
older framing of it; the phase-23 section supersedes them with the FREE browser-Unlimited
method, Tim's per-character green/magenta rule, the sequential-fire cadence, and the
"don't wire yet" ruling.

0. **Enemy identity done (phase 20)**: all 10 nodes have named enemies + map/card
   art (silhouette tease -> PFP reveal). Animated clip kits per enemy = the PHASE 23 job
   (generating now, browser Unlimited, FREE — no longer the credit-spend framing below).
   Also unused so far: the TCG card art (collection surface?), the empty
   `input/characters/background/` (now used for arenas) + `playable characters/` dirs.
1. **Final-boss real character art**: RULED (Tim, 2026-07-22, `d171988`): the boss
   IS IR-48 HEX PAPER LORD (lore 'Lord of the Zero Citadel'; RONIN ZERO = season
   brand in the map header only). Fight visuals still VOLTA until his clip kit
   ships. One art drop or a
   generation run -> keyed still -> clean anchor plate -> acting table (opponent-free
   acting; samurai kit) -> clip batch (~36cr/clip, per-batch OK) -> per-frame sweep ->
   key -> radial-feather fx -> contacts -> ONE manifest row + node 10 fighterId.
   Pipeline proven twice (GORVAK/VOLTA); CHARACTER-CONTRACT.md is the law.
2. **Per-node ARENAS: DONE phase 21** (10 clean arenas wired per node, code-drawn lacquer portrait frames replace the baked rings, campaign fights show enemy name+PFP; cathedral keeps a small baked-knob residual under the portraits). Per-node enemy CLIP KITS as the roster grows: each new character = manifest + one
   registry-row edit per node. Node arenas likewise (arenaId per node; arena registry
   takes one ArenaDef row per background).
3. **B1/B2 bonus isles**: cosmetic challenges (EV-neutral, swoobz-engagement-layer).
4. **Campaign polish candidates**: label overlap + node hit-area RESOLVED phase 19;
   still open: campaign uses last-confirmed fighter (no charSelect entry in the
   campaign flow — ask Tim if he wants one); real reward claim/delivery once
   cross-game plumbing exists.
5. **Quick-duel economy**: RESOLVED phase 18 (2026-07-21, Tim's ruling "do 1"): CPU
   picks randomMove only, win pays 1.92x = 96% RTP (`cpuWinPayout`); personalities are
   flavor. Exploit-regression test (quickDuelExploit.test.ts) pins the frequency-counter
   strategy at ~50% win / 96.0% RTP over 100k seeded matches. Friend PvP unchanged.
6. **Older backlog still open**: announcer VO (RG-C5), VS splash diagonal split,
   in-room friend rematch protocol, waiting-room tab-close stake loss. (HUD-language
   extension to timer/nameplates/pick buttons: DONE phase 19.)

## 6. Gates before ANY commit (all of them, quote real output)

`npx tsc --noEmit` clean; `npx vitest run` **137/137** (serial suite); `npm run build`
ok; `git diff --stat` shows fightEngine.ts + fightAi.ts untouched; campaign-math
changes ALSO rerun `npx vite-node scripts/campaign-rtp-sim.mjs` (foreground, all 10
nodes in band); live headless drive of the changed surface (randomized picks;
click-verify; screenshots you have VIEWED; money asserted to the cent; two isolated
contexts + frame-log for multiplayer; drives outlast the longest timeout); for
new/changed clips: contract §6-step-4 per-frame sweep + inset-ring profile + radial
feather for effects; no em-dashes in user-facing copy; RG-C5 (zero-param audio,
module-const timings, value-independent celebrations; ALL money picks — CPU, campaign,
auto-play — from randomMove(secureRandom) only: never aiPick, never a seeded PRNG at
runtime). Commit with Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>.
Repo git config: user.name Tim, user.email erstrijbis@gmail.com. DEV-SERVER HYGIENE:
kill only THIS project's stale 5340 vite (check the PID's command line) before
starting yours; kill your own when done.

## 7. Memory locations (SAVE-GLOBAL check before ending any task)

Project memory: `~/.claude/projects/...streetfighter/memory/frozen-requiem-state.md`
(full phase log through 19; the file keeps its historic name). Global
(`~/.claude/memory/` + MEMORY.md index): `skill-game-rtp-pricing.md` (the Nash
baseline + win-condition/handicap pricing law), `runtime-rng-unpredictability.md`
(CSPRNG-behind-money law, phase 18c), `effect-clip-edge-cut.md`,
`swoobz-ds-tokens.md` (+ cover-plate law), `stale-timeout-timer-phantom-events.md`,
`genvideo-character-clip-lessons.md`. Global skills (stormforge source of truth,
junctioned): `higgsfield-generation` (anchor hygiene + nsfw wording law + living-map
recipe, stormforge c6178e0), `character-clip-qa`, `character-assets` Rule 4,
`slot-known-regressions` A15-A18. Artifacts for Tim: `specials-preview.mp4` at the
repo root; CEO ship-readiness one-pager (85% to demo launch, area breakdown, honest
production caveats) at
https://claude.ai/code/artifact/4a85217d-f615-482f-8ba0-1d28179fc0ba — redeploy to the
SAME url (pass it as `url`) when the numbers move. Update project memory + this
handoff at every phase boundary.
