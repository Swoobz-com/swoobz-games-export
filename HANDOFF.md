# HANDOFF — Swoobz Originals / Abyss Line session

For the next Fable 5 session. Read this, then `AGENTS.md` (framework map), then continue.
Working dir: `C:\Users\Erstr\OneDrive\Bureaublad\swoobz-games-export\swoobz-games-export`
(fallback `...\swoobz-games-export`). User is **Tim** (writes Dutch; reply in Dutch).
Everything below is client-side; on-chain + real audio/wallet are shims in this export.

---

## 0. How this work runs (the operating model)

- **You orchestrate, you don't build.** All game work goes through **fabi** (the
  orchestrator subagent), which dispatches the specialist roster (codotty, game-designer,
  artotty, jesse, autisk, verotty, the swoobz-*-qa gates, asset-curator,
  audio-design-director, taste-guardian, cohesion-reviewer, etc.). You talk to fabi via
  `SendMessage` to the **same agent id** to keep context; a fresh `Agent(fabi)` call
  starts clean. The live fabi id this session was `a633ee0abe0aa6af9` — a new session
  starts its own.
- **Every fabi round** = per-agent briefs (context + expected output + verification
  criterion), a recorded verdict per sub-agent, and a run-log + memory update at the end.
  fabi pauses and asks when something is a genuine product decision.
- **Preview loop:** fabi edits → you restart the dev server → open the port. In THIS
  environment, background `npm run dev` shows "killed" notifications but the Vite process
  **keeps serving** — verify with `curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/`
  (expect 200), don't assume it's down. Starting a server repeatedly leaves **zombie Vite
  processes** that hold ports (so the port auto-increments). Periodically clean up with:
  `powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"`
  (Tim asked for this twice — he's fine with it; it kills MCP node too but that restarts).
- **Credit discipline:** Tim hit spend limits. Higgsfield image/audio gen flips on/off.
  **Higgsfield cannot generate standalone music** (audio suite = TTS only; music model is
  "game pipeline only"). Prefer sourcing CC0/CC-BY over generating. Always check tool
  availability (ToolSearch) before assuming gen is possible; stop at the first limit.

---

## 1. What this session produced

### 1a. Abyss Line — a NEW original game (the main deliverable)
Folder `originals/assay/` (slug stayed `assay` to avoid breaking paths), harness
`assay-run/` (canonical port **5182**). It went through many pivots — the history matters
so you don't re-litigate settled decisions:

- **Mechanic (LOCKED):** coin-collection trail. Player free-picks 8–60 tiles (a "line",
  **not required to be contiguous** — Tim decided this; "aaneengesloten trail" / Option B
  is **permanently off the table**), commits, reveals; safe tiles load the HAUL, a mine =
  **bust = payout 0** (no partial). Multi-line per session. 3 difficulty "depths":
  Reef Shelf / Midnight Zone / Hadal Trench (= more mines = higher multiplier).
- **Grid (LOCKED):** **14×14 = 196 tiles** (started 1024 → 400 → 100 → 196 as Tim traded
  board size for bigger, readable coins). Don't shrink/grow without re-running verotty RTP.
- **RTP (LOCKED):** flat **96.5%** for every trail length on every depth, BigInt-exact,
  independently re-verified by verotty. Frozen ladder in `assayMath.ts`; `mirrorRoundtripCheck`
  gates drift at load.
- **Theme (LOCKED):** **ABYSS LINE — Sunken Treasure** (wreck of the Golden Sledge, 3800m).
  Underwater trench, player sub casting a light cone at the board, gold doubloon coins,
  sea-mines = danger, haul-net multiplier gauge. **Rule of three: cyan = player,
  gold = value, red = danger.** Built from Tim's own supplied asset pack
  (`input/asset abyss/` — spec md + 2 SVGs + mockups). Prior themes (Deep-Current refinery,
  obsidian Aztec night-temple, vault/heist) were all REJECTED by Tim — don't revive them.
- **UI:** RoR-style transparent stacking gutter cards (bet console, TO WIN hero, HAUL
  gauge, depth selector, big CTA). Info/How-to-play "?" panel (top-right).
- **Fixes landed this session:** de-hazed board (removed a per-frame additive cyan wash),
  removed dark corner falloff (even lighting), receipt overlap fixed + full overlap audit,
  "randomly selected pod" resolved (was display-only: connector no longer draws across
  non-adjacent gaps + free-pick copy), instant-path bust no longer flies coins to the meter,
  a clear win screen ("SECURED THE HAUL" + amount + multiplier, **RG-C5 value-independent**).
- **Full consolidated QA end-gate: PASS / SHIP-READY.** Found + fixed 3 blockers no
  per-change gate had caught (stale win-hero over a bust on fast replay;
  prefers-reduced-motion not respected; "TO WIN" was tier-blind / showed wrong potential).
  All 15 gates green afterwards, 185/185 tests.

### 1b. Audio sourced for the whole roster (0 generation credits)
Every original now has a `used-assets/` folder + `MANIFEST.md` (files actually referenced,
with provenance). All CC0/CC-BY, byte-verified (OggS/cmp/ffprobe).
- **assay/Abyss:** Web-Audio (procedural) — no files needed.
- **pulse:** 6 Kenney CC0 SFX + 3 CC0 ambient tracks (OpenGameArt; the code cited the sources).
- **vault/RoR:** Kenney CC0 SFX.
- **oo_fisher:** 8 files (1 CC-BY track "Lazy Day" + 7 Kenney CC0 SFX). Boots + plays.
- **oo_rei:** 14 files (7 Kenney CC0 SFX interim-stubs + 7 tracks, 5 of them CC-BY).

### 1c. Docs
- **`AGENTS.md`** (repo root) — how to read the framework, how games are built (the
  math/provider/audio/experience quartet, Domain-A money discipline, provably-fair Glass
  Box, the load-time self-check, RG-C5), the run-harness pattern, and **how to port a game
  to a new ecosystem** incl. **§6.4 concrete audio-wiring instructions**. Scope: assay,
  pulse, vault, oo_fisher — **oo_rei deliberately excluded**.
- **`HANDOFF.md`** — this file.

---

## 2. Learnings (save yourself the mistakes I made / caught)

1. **The audio "added but not audible" trap.** All games run on the `_shared/audio`
   **no-op shim** (`isSampleLoaded()` returns false → WebAudio synth fallback). Sourced
   `.ogg` files **serve (HTTP 200) but do not play** until the shim is replaced by a real
   Howler impl. Always report "toegevoegd ≠ nu hoorbaar." Wiring recipe is `AGENTS.md §6.4`.
2. **Higgsfield can't make music.** Don't burn a credit discovering this — the music model
   is gated "game pipeline only." Source CC0/CC-BY (Kenney SFX, OpenGameArt music) instead.
   An earlier round mislabeled sourceable tracks as "waiting on generation"; the Pulse code
   already cited its OpenGameArt sources — read the code before assuming.
3. **Pivot fatigue is real — pitch before building.** Tim rejected 3 full themes before the
   supplied Abyss pack landed. When a look is subjective and expensive, have fabi **pitch
   2–3 concrete directions first** (cheap, no gen) and let Tim pick. Don't build a 4th
   wrong skin.
4. **Consolidated QA catches what per-change gates miss.** The final full sweep found 3 real
   blockers (reduced-motion, cross-state race, tier-blind projection) that every targeted
   gate had passed. Run a full `swoobz-game-qa-orchestrator` sweep before any "ship" claim.
5. **Display bug vs money bug — prove it.** The instant-bust "coins fly to meter" and the
   "randomly selected pod" were both **display-only** (verotty/game-flow confirmed the
   payout/selection state was correct). Diagnose before touching `*Math.ts` / settlement.
6. **RG-C5 is structural and non-negotiable.** Win celebration must be byte-identical
   regardless of win size (2× or 400×) — only the number differs. Zero-param `play*()`,
   module-const timings. The win-screen work respected this; keep it that way.
7. **Ask on genuine forks, default-safe when Tim is away.** Twice Tim went idle mid-question;
   I proceeded with the reversible/non-destructive option (Option A free-pick; option B
   left open) and said so. That was right. Don't make an irreversible gameplay/math change
   on a guess.
8. **"except or rei"** meant **exclude oo_rei** from the AGENTS.md scope. oo_rei is the odd
   one (has a `playground/`, and its runner doesn't even boot — see §3).
9. **Verify servers, don't trust "killed."** See §0.

---

## 3. Open follow-ups (nothing is blocking; Tim knows about all of these)

Ranked by how likely Tim is to want them:

1. **oo_rei boot-crash (real bug, not audio).** `oo-rei-run` renders a blank page:
   `oo-rei-run/vite.config.ts` pins `NODE_ENV=production`, which trips a **fail-closed VRF
   guard** in `ooReiProvider.ts:369` (client RNG is demo-only → throws in production).
   Pre-existing (proven by mtimes). Fix at the **runner scaffold** (don't pin NODE_ENV=production,
   or gate the throw behind a real prod build) — do **not** weaken the security guard.
   This is out-of-scope for the framework doc but a genuine defect.
2. **CC-BY attribution (ship-blocker before public release).** 6 CC-BY tracks need visible
   credits on a credits surface: "Lazy Day" (oo_fisher) + 5 in oo_rei. Listed in each
   `used-assets/MANIFEST.md`. Kenney SFX are CC0 (no obligation).
3. **Wire real audio** (make samples actually play) per `AGENTS.md §6.4` — a code change
   Tim hasn't requested yet; he was fine leaving it documented.
4. **Abyss non-blocker polish backlog** (from the full QA, all cosmetic): DIVE DEPTH names
   truncate on desktop; onboarding tooltip lingers over the board; mobile instant-win shows
   5/8 coin-flies; wager-"50" focus ring clipped; a couple of stray violet svg specks; copy
   nits (bust "CLAIMED"→"REVEALED", "provably fair" plain-language label); pre-Abyss audio
   const names; `void-field.ogg` is slightly warm vs Pulse's cold register.
5. **Wire Abyss into the `/originals` lobby catalog** (it runs standalone today).
6. **Git / PR.** Repo root appears **not** to be a git repo (only `originals/` has `.git`).
   Tim asked for an example prompt to commit/push/PR the whole export — I gave him one
   (branch, per-group commits, `gh` PR, exclude node_modules/vite logs/`_*.mjs` probes,
   confirm before push). If he wants it done, first resolve the repo/remote question.

---

## 4. Pointers

- **Ports:** assay-run 5182, pulse-run 5180, vault-run 5281, oo-fisher-run 5182 (clashes
  with assay), oo-rei-run 5185-ish (auto-increments; and it won't boot — see §3.1).
- **`pulse-run` bundles its own byte-identical copy** of the game under
  `pulse-run/src/framework/pulse/` — edits to `originals/pulse` don't propagate there.
- **Run folders are noisy** with `_*.mjs` QA probes + `vite-*.log` — ignore them; keep them
  out of any commit.
- **Reference assets Tim drops** go in `input/` (e.g. `input/asset abyss/`, `rugs.jpg`,
  `overlapping.jpg`, `mark.jpg`). When he says "check <name> in input," find + read it
  before acting — he marks bugs with an orange circle.
- **Roster memory** persists across sessions (AGENT_MEMORY + run logs); fabi reads it at
  start and writes verdicts at the end. Trust it but verify file/line refs still exist.

---

## 5. Rug or Riches (vault) UI/UX overhaul — separate track, appended 2026-07-09

**This is a DIFFERENT session/track than §§0-4 above** (which covered Abyss Line + audio
sourcing). This section covers a long, separate multi-day thread that iterated almost
entirely on **vault** (Rug or Riches)'s desktop/mobile UI. Read this before touching
`originals/vault/*` — a lot of layout ground has already been fought over and settled.
The operating model in §0 (fabi as sole orchestrator, maker→verifier loops, grounding
store) applies identically here; this section is the vault-specific history/state on
top of that.

### 5a. Where vault lives
- Source: `originals/vault/VaultExperience.tsx` (huge, 1.4MB+ — **grep for your target
  symbol first, never bare-Read the whole file**) + `VaultGridCanvas.tsx` (canvas render)
  + `vaultProvider.ts` (state machine) + `vaultCopy.ts` / `vaultMath.ts` / `vaultLedger.ts`
  / `vaultAudio.ts` / `vaultSignatures.ts` (each with a sibling `.test.ts`).
- Dev runner: `vault-run/` (`cd vault-run && npm run dev`; Vite auto-picks a free port —
  always check the actual printed port, don't assume 5181/5281; confirm via the page
  `<title>` = "Rug or Riches (Vault) — standalone runner", don't confuse with `assay-run`).
- **Currently-live art**: `originals/vault/used-assets/` is the verified source of truth
  (built by grepping the real code for actual asset references, byte-copied). Do **not**
  assume `generated/rug-or-riches/` is current — it still holds an entire superseded
  photoreal-trading-floor backdrop set (pre-dates a full art swap to a flat-illustrated
  vault-interior set) that looks plausible but isn't wired anywhere live. This bit me once
  this session (exported the wrong files into `output/background/`, caught via md5 diff
  against `used-assets/`, corrected — see that folder's `PROVENANCE.md` for the full story).

### 5b. What happened (arc, compressed)
1. Many rounds of panel/void/reachability polish on the old bottom-bar + "gutter glass
   card" system.
2. A full CSS-grid layout pivot (topbar / board / fixed ~300-320px right control column /
   statusbar) per a rough wireframe.
3. **Reverted** — Tim preferred the old gutter-card look after seeing it live. **No git
   existed, so this was a lossy RECONSTRUCTION from `AGENT_MEMORY.md`**, not a clean
   revert — expensive, imperfect. Strong argument for git (still not initialized as of
   this write-up — see §5f).
4. **Rebuilt forward again**, this time from 3 precise per-phase mockups Tim supplied
   (`input/newui1/2/3.jpg`) — this attempt stuck and is the layout family still live today.
5. Several rejected/accepted iterations on the control column's "dead space" problem —
   worth knowing the failure modes: attempt 1 just relocated the void via
   `marginTop:'auto'` (rejected, "you just moved it"); attempt 2 stretched the GAPS
   between elements to fill height (also rejected, same complaint); the fix that stuck
   gave the *selected* world-picker card genuine extra content (a "BEST Nx" personal-best
   pill) instead of manufacturing whitespace. **If a future void/dead-space complaint
   comes up on this column, don't retry either rejected approach.**
6. A **full authoritative rebuild** per a precise, ready-to-execute spec Tim dropped
   (`input/rugs or riches/README.md` + `spec/rug-or-riches-layout-spec.md` +
   `mockups/ror-bet-entry-picker.html`) — exact 544px board / 592px plate / 320px column /
   8-12-16-24px spacing scale, uniform 3-card world-picker (icon tile + tier pill + meta
   line + right-aligned MAX-multiplier + risk bar), full per-phase (Ready/Live/Result)
   behavior. **This is the layout system currently live.**
7. Removed the Lobby splash screen — game now lands directly on bet-entry ("PICK YOUR
   WORLD"); onboarding copy relocated into a "HOW IT WORKS" card, not deleted.
8. Per-world backdrop art moved from canvas-only to a full-bleed DOM layer behind the
   whole shell (board + control column) — fixed the "feels empty" complaint but exposed
   inconsistent panel edges (next item).
9. **VAULT-PLATE cohesion pass** — unified every control-column panel to one consistent
   opaque plate material (border/shadow/radius) after the full-bleed backdrop made the
   old inconsistent panels read as ugly disconnected black boxes.
10. Settled/win-screen-specific fix per another precise spec (`input/rugsui/`) — scrim
    gradient over the art, one panel token everywhere, win/loss banner relocated into the
    HUD zone (board never shifts vertically between phases), duplicate BET AGAIN button
    removed, board plate + 45% dim on unopened safes.
11. A full 11-dimension QA sweep (`swoobz-game-qa-orchestrator` + specialist roster) on
    the fully-composed game found real accumulated regressions (desktop ownership-points
    card had gone fully invisible; low-contrast coin numerals; em-dashes in copy; a Dutch
    string leak; mobile CTA below the fold) — all fixed + re-verified same round.
12. **7 explicitly-flagged follow-ups** (keyboard nav for WCAG 2.1.1, mobile HUD/board
    text overlap, mobile settled CTA fold, a backdrop-art artifact that turned out to be a
    non-issue, an unreachable game-mode tier, tiny shared touch targets, a dead "mixer"
    field on the fairness receipt) — all fixed. Surfaced 2 NEW blockers along the way
    (banned word "jackpot" leaking into copy/aria, a mobile header-clip bug) — fixed too.
13. 2 items from that sweep's final re-check turned out to be **false alarms from a stale
    Vite/HMR build**, not real code gaps — zero source changes needed on re-verify against
    a fresh build. **Lesson: if a verifier's re-check contradicts a maker's confident,
    well-evidenced report, try a fresh build (kill dev server, purge `node_modules/.vite`,
    restart) before assuming the maker was wrong.**
14. 3 final small mobile-touch nits (a vault-native stepper under the 44px touch-target
    floor, iPhone 14 Pro's SEND IT 15px below the fold, cash-out button missing
    `touchAction:manipulation`) — fixed + verified.

**As of this write-up, vault should be in a clean, fully-QA'd state** on both the layout
and the compliance/a11y axes — but a lot has landed since the last FULL 11-dimension
sweep (step 11 above; steps 12-14 were narrower). Recommend running the full
`swoobz-game-qa-orchestrator` sweep once more before treating this as a settled "done,"
given this thread's own recurring pattern of "narrow fixes hold individually, but
stacking many rounds occasionally surfaces one fresh collateral regression only a full
sweep catches."

### 5c. Open items on this track (need Tim's input — don't guess)
1. **RG-C8 `AutopickSafetySurface`** — a responsible-gambling safety component, fully
   coded, never mounted anywhere in the live tree. Flagged to Tim at least twice this
   thread with no answer yet. Needs an explicit decision: mount it, or delete the dead
   code + its RG-C8 compliance claim. This is compliance-adjacent — don't guess.
2. **Pre-existing sprite-art taste concerns** (loss-tile mascot face, some clip-art-ish
   coin/moon sprites, a `$`-symbol register collision) — flagged by taste-guardian,
   tempered by autisk's live-composited verdict (rated the actual game premium). Fixing
   means regenerating art = Higgsfield credits = needs Tim's explicit go-ahead first.
3. **Housekeeping**: agent-authored driver/screenshot scripts have accumulated in
   `vault-run/` (`_maker-*.mjs`, `_indep-verify-*.mjs`, `shots-*/` folders). Harmless
   (not imported by the build) but sloppy — worth a cleanup pass before any commit.
4. **Two stale, unwired copies** of an old artifact-bearing altseason backdrop still sit
   on disk (`generated/rug-or-riches/backdrop-altseason.png` + `.orig`) — confirmed dead,
   worth deleting or moving to a clearly-marked graveyard so a future grep doesn't mistake
   them for the live asset (see §5a — this already caused one real mistake).

### 5d. `output/background/` (built this thread, unrelated to §1)
A small export: the 3 currently-live vault world backdrops + Pulse's terminal backdrop +
Abyss Line's SVG backdrop, each with a `PROVENANCE.md` documenting its actual generation
style/prompt (reconstructed where no original prompt was on record — Pulse and Abyss had
none; vault's newer art also had none, only the OLD superseded set had documented
prompts). If vault's art changes again, re-verify this export against `used-assets/`
before trusting it as current.

### 5e. Vault-specific learnings (in addition to §2 above, which all still applies)
- **This game has been through MANY rapid layout pivots.** Before touching layout code,
  grep `AGENT_MEMORY.md` and recent `~/.claude/agents/logs/` for "vault" to see what's
  already been tried and rejected (§5b above is the compressed version) — don't re-propose
  something Tim already saw and didn't like.
- **When Tim provides a mockup image or an `input/*/README.md`+`spec/*.md`+`mockups/*.html`
  bundle, treat it as authoritative — match exact pixel values**, not just the vibe.
  Several rounds this thread were "redo it, this time exactly matching the spec" after an
  earlier pass took creative liberties.
- **`~/.claude/agents/logs/` and `learnings.jsonl` are shared across ALL concurrent
  projects/sessions on this machine** (confirmed directly this thread — found unrelated
  "Abyss/hotty/artotty/bearbonanza" entries interleaved with vault ones while grepping for
  status). Filter carefully by content/`task_category`, don't assume every recent-looking
  log entry is about the game you're working on.
- **Long fabi dispatches can hit session/weekly usage limits mid-run** without producing a
  clean final synthesis (happened once this thread — the dispatch's own final "report" was
  literally a rate-limit message). The specialist sub-agents had still done real,
  independently-verifiable work — recoverable by grepping `learnings.jsonl` for the
  relevant `task_category` and reading the individual specialist `run-<ts>-<agent>.md`
  logs directly, rather than assuming the whole dispatch was wasted.
- **RG-C5/RG-C3 discipline (see §2.6 above) gets checked on nearly every vault round** —
  module-const timings, zero-param audio, no auto-bet/rapid-fire, no near-miss reveals,
  symmetric win/loss CTA treatment, deterministic Glass Box receipts. A "reveal all bombs"
  feature request was refused outright; an "auto-repeat rounds" request was redirected to
  a manual-confirm "reuse last pattern" preset. Don't assume a betting-speed shortcut is
  fine without checking this precedent first.

### 5f. What to do next on this track
1. Ask Tim about the 4 open items in §5c — none are urgent blockers, but they're the
   honest known-open list for vault specifically.
2. If picking up general vault polish with no new specific ask: run a fresh full
   `swoobz-game-qa-orchestrator` sweep first (see §5b's closing note) to get current
   ground truth before doing anything else.
3. Coordinate with whoever's on the §§0-4 track (Abyss/audio/git) before initializing git
   — both tracks want it, better to do it once, together, than twice independently.
