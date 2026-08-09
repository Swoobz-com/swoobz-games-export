# AGENTS.md — working in STANDOFF

Entry point for anyone touching this repo — CTO, engineer or agent. **Sections 1-5 are the orientation:
what this is, how to run it, how it works, what the money does, and what is actually proven.** Everything
from "The non-negotiables" down is a rule that cost real debugging time to learn — none of it is style
advice, and each one is written with the incident that produced it.

---

## 1. What this is

**STANDOFF** is a two-sided rock-paper-scissors fighting game dressed as a Mortal-Kombat-style versus
fighter. Two fighters occupy a p1 (left) and p2 (right) slot. Each exchange both sides secretly pick
**STRIKE / THROW / BLOCK** — an RPS triangle — and the winner lands a hit. First to 2 or 3 round wins
takes the match.

On top of that sits a **10-node campaign** ("CONQUEST · RONIN ZERO") with real stake/payout maths: you
wager from a practice bank, beat a boss, and get paid a fixed multiplier. Beating a boss also **unlocks
that boss as a playable fighter** — that is the game's whole progression loop.

Three modes: **VERSUS CPU** (quick duel, flat 1.92x at 96% RTP), **CONQUEST** (the staked campaign), and
**VS FRIEND** (real-time PvP over a websocket relay, room codes, winner-takes-the-pot).

| | |
|---|---|
| Stack | Vite + React 18 + TypeScript. **No runtime deps beyond React.** `ws` for the relay server. |
| Size | ~8.7k lines across the four files that matter (see the Map). 12 fighters, 10 arenas, 10 campaign nodes. |
| Money | A **practice bank**, not real funds. $1000, restorable in one click. Nothing here touches a payment rail. |
| Repo | Its own git repo. Remote `export` → `Swoobz-com/swoobz-games-export`, branch **`standoff`**. |
| State | Phase 300. `tsc` 0 · 276 tests / 17 files · build clean · 2M-match math sim passing. |

## 2. Running it

```bash
npm install
npm run dev        # http://localhost:5340  (vite.config.ts pins the port, strictPort)
npm run dev -- --port 5342 --strictPort   # if 5340 is taken — see Dev-server hygiene

npm run build      # tsc --noEmit && vite build  ->  dist/
npm start          # PRODUCTION: serves dist AND carries the VS FRIEND relay on one port
                   # PORT (default 5340) and HOST (default 0.0.0.0) come from the environment
```

Append `?dev=1` for the dev hooks (CONQUER NEXT / CONQUER ALL / RESET PROGRESS on the campaign map).
They touch campaign progress only, never money.

**Verify before you claim anything:**

```bash
npx tsc --noEmit                                                 # must be 0
npx vitest run --pool=forks --poolOptions.forks.singleFork=true  # 276 tests / 17 files as of phase 300
npm run build                                                    # tsc --noEmit && vite build
npx vite-node scripts/campaign-rtp-sim.mjs                       # 2M matches/node, proves the economy

# The UI gates need a dev server already running, and drive real Chrome against it:
node scripts/qa-phase294.mjs                    # 48 render assertions   (QA_PORT, default 5342)
node scripts/qa-phase294-receipt.mjs --port N   # plays real matches to reach the receipt states
```

⚠ **Use those vitest flags whenever a dev server or Chrome is running.** The shared worker pool
otherwise dies with `Worker exited unexpectedly` and reports something like `1 passed (2)` — one file
silently unreported, which looks exactly like a real failure. Reproduced repeatedly; it is
environmental, and it still happens WITH the flags under enough load. If you see it, stop your own dev
server and re-run before believing the number.

Gates live in `qa-boss/` and `scripts/`. **A gate that cannot do its job is not a pass.** This repo has
found and fixed EIGHT instances of a tool that refuses and then `exit 0` — it calls the class
`gate-vacuous-pass`. If a tool can't run, report it; never infer success from silence.

## 3. How it works — the architecture

Three layers, and the separation is load-bearing rather than decorative:

```
  src/engine/          PURE. BigInt money, no DOM, no React. The rules and the maths.
      |                fightEngine (RPS + rounds) · fightCampaign (nodes, payouts, probabilities)
      |                fightAi (CPU personalities) · fightStakes · secureRng
      v
  src/provider/        THE STATE MACHINE. One hook, useFightController().
  fightProvider.ts     Owns: phase, match state, balance/stake, campaign progress, persistence,
      |                the shot clock, and the friend-mode transport. Identity-agnostic — it never
      |                learns WHICH fighter you picked.
      v
  src/ui/              PRESENTATION ONLY. One big component + one stylesheet.
  FightExperience.tsx  Every screen, the fighter/clip choreography, the facing rule, all copy.
  fight.css
```

**The phase machine** (`Phase` in fightProvider.ts) is the spine of the whole app:

```
title -> mode -> [ campaignMap -> ] charSelect -> stake -> vsIntro -> roundIntro
      -> fightBanner -> picking -> reveal -> resolve -> roundEnd -> matchEnd
```

`picking` is where the player acts; a **5s shot clock** auto-picks a uniformly random move if they
don't. `matchEnd` renders the receipt. `mode` is `'cpu' | 'friend' | 'campaign'` and gates which
receipt and which economy apply.

**Money flow, single path:** `commitStake` deducts and freezes `committedStakeRef` → the match runs →
`settleCampaign` / `settleMatch` credits the payout exactly once (one-shot ref guard) → the receipt is
frozen at settle and the UI only reads it. Refunds exist only for matches that never started.

**Persistence** is three localStorage keys, all corrupt-safe: campaign progress `{v:2, beaten}`, the
practice bank, and the chosen arena. A `v1` campaign payload is **rejected on purpose**. (The campaign
payload used to carry a `lockStake`; it is gone, and an old save that still has the key parses fine —
the version deliberately stayed at 2 so nobody's run was disturbed by the removal.)

**Characters** are data, not code. Each fighter is a manifest in `src/characters/<id>.ts` pointing at a
still, a cutout, a portrait and a set of alpha-WebM clips per state (idle / attacks / hit / ko / …).
The UI picks a clip by exact state match. Adding one is a documented 6-step process (see below).

**VS FRIEND** is a thin relay, not a server-authoritative game: `src/server/matchRelay.ts` pairs two
sockets by room code and forwards picks. Both clients run the same engine. It carries **no money**. It
attaches to any Node `http.Server` — vite's in dev, and `server.mjs` in production.

## 4. The money model — read this before touching a `multBps`

The campaign is the only staked surface. Each node has a fixed win probability (set by its difficulty)
and a fixed payout multiplier. **The one equation that governs everything is `RTP = P(win) × multiplier`.**
The multiplier is not a free dial.

| node | fight | win chance | pays | returns |
|---|---|---|---|---|
| 1 KUROHAMA DOCKS | to2, no defense | 50.0000% | x1.32 | 66.0% |
| 2 ASHEN TORII | to2, no defense | 50.0000% | x1.49 | 74.6% |
| 3 WHISPERING BAMBOO | to2, +1 | 27.3254% | x1.68 | 46.1% |
| 4 SNOWFANG PASS | to2, +1 | 27.3254% | x1.91 | 52.1% |
| 5 KAWA CROSSING | to2, +1 | 27.3254% | x2.16 | 59.0% |
| 6 HOLLOW SHRINE | to3, +1 | 22.5546% | x2.44 | 55.1% |
| 7 BURNED PAGODA | to3, +1 | 22.5546% | x2.76 | 62.3% |
| 8 RED MIST GORGE | to2, +2 | 13.0733% | x3.12 | 40.8% |
| 9 CRIMSON GATES | to2, +2 | 13.0733% | x3.53 | 46.2% |
| 10 ZERO CITADEL | to3, +3 | **2.4025%** | **x4.00** | **9.6%** |

**Mean return 51.2%, a 48.8% house edge.** Verified two ways: exact bigint rationals in
`fightCampaign.test.ts`, and a 2M-matches-per-node Monte Carlo (`scripts/campaign-rtp-sim.mjs`) that
lands within 0.003pp of the closed form on every node. **Tim confirmed this number in session 33** against
three costed alternatives — it is a decision, not a drift. Details under "The non-negotiables".

Three invariants a CTO should know are enforced, not hoped for:
- **No node may return more than 96%.** Pinned in exact integer arithmetic with a positive control.
- **All money is BigInt lamports with floor truncation.** No float ever touches a payout.
- **No RTP is ever typed into the UI.** Every percentage the player sees is derived from the same
  rationals that price the ladder, so the screen cannot contradict the maths.

## 5. What is proven, and what is not

Stated plainly, because this repo's worst incidents all began with a confident unverified claim.

**Proven by execution:** the economy (2M matches/node); the 96% ceiling (exact integer test + positive
control); 286 unit tests over engine, provider, persistence, roster and the relay; 46 real-Chrome render
assertions; the production server booted and probed (200/404/403/206/416 + two real websocket clients
completing create → join → pair → pick).

**Known gaps, none of them silent:**
- **There is no deploy target.** `npm start` works, but the repo contains no Dockerfile, Procfile,
  netlify/vercel/render/fly config or CI. If the target is a purely static host, no Node server runs
  there and VS FRIEND needs a hosting decision. **This is the open question.**
- **No browser has played video through the server's Range implementation.** Byte-exact 206/416 verified
  with curl; the iOS-Safari behaviour that motivates it is untested.
- **`npm ci --omit=dev && npm start` has not been run.** `ws` is now a real dependency, but that is
  reasoned from the import graph, not measured.
- **JSX has zero unit coverage** — no jsdom, and vitest only matches `src/**/*.test.ts`. A green
  `vitest` says nothing about the UI. The two drivers in `scripts/` are the only mechanical guard.
- **This is a practice bank.** Before real money: server-held balance, server-side settle re-derived
  from the server's own node table, dev-gate `resetBank`, and commit-reveal for PvP picks.

---

```bash
npx tsc --noEmit                                              # must be 0
npx vitest run --pool=forks --poolOptions.forks.singleFork=true  # 276 tests / 17 files as of phase 300
npm run build                                                 # tsc --noEmit && vite build
npm start                                                     # serve dist + the VS FRIEND relay (PORT, default 5340)
```

⚠ **Use those vitest flags whenever a dev server or Chrome is running.** The shared worker pool
otherwise dies with `Worker exited unexpectedly` and reports something like `1 passed (2)` — one file
silently unreported, which looks exactly like a real failure. Reproduced repeatedly; it is
environmental, and it still happens WITH the flags under enough load. If you see it, stop your own dev
server and re-run before believing the number.

Gates live in `qa-boss/` and `scripts/`. **A gate that cannot do its job is not a pass.** This repo has
found and fixed EIGHT instances of a tool that refuses and then `exit 0` — it calls the class
`gate-vacuous-pass`. If a tool can't run, report it; never infer success from silence.

## The non-negotiables

**Money is BigInt lamports. Never a float, never a Number.** Payouts are integer BPS math with
floor truncation (`campaignPayout = stake * multBps / 10000n`). Floor-vs-round divergence has already
produced a wrong number that became a spec — if you display money, call the real formatter.

**`getFighter(id)` THROWS on an unknown id, by contract — no silent fallback.** Removing or renaming a
fighter is therefore a BREAKING change: check `src/engine/fightCampaign.ts` (node `fighterId`s),
`src/ui/FightExperience.tsx` (the default `playerId`), and `src/characters/rosterGating.ts`.

**THE FACING RULE.** `FightExperience.tsx` computes
`isMirrored = def.faces !== (slot === 'p1' ? 'right' : 'left')` and applies ONE mirror to the whole
fighter stack. So **every clip in a kit must NATIVELY face the direction `faces:` states** — clips
disagreeing with *each other* is the bug. Roster convention: every fighter is `faces:'right'`.
Decide it by measuring (`node scripts/check-facing.mjs <id> --still`), never by eye — eyeballing was
wrong 2/2 on this project, measuring right 4/4. Full doctrine: `.claude/skills/standoff-clip-facing`.

**Clip lookup is EXACT-MATCH with no aliasing** (`types.ts` `clipVariants` is a bare `def.clips[state]`
index). A clip filed under a state the engine never emits, or a `url` pointing at a file that is not on
disk, throws nothing and logs nothing — the fighter just renders a still forever. `src/characters/
freeRosterFighters.test.ts` guards this; extend it when you add a character.

**Two clip states are load-bearing beyond their own animation:**
- `idle` — the ONLY fallback in the display ladder. Without it, a missing state mounts no video at all.
- `hit` — gates the entire clip beat as a *defender* (`useClipChoreo = attackerHasClip && defenderHasHit`).
  A fighter with no `hit` silently never triggers clip choreography against ANY opponent.

**`still` is mandatory.** Four unguarded consumers (fighter box, select tile, select preview, both HUD
medallions) and it is the whole character under `prefers-reduced-motion`.

**A STAKE CHANGE CAN NEVER DESTROY A RUN** (Tim, 2026-08-09). Pick any stake, any time. There is no
lock, no wipe, and nothing to warn about. Persisted schema is `{v:2, beaten}`; **a v1 payload is
rejected on purpose**. Guarded by `src/provider/campaignStakeFreedom.test.ts`, which is the old
stake-lock suite rewritten to assert the opposite property, plus G0-G7 in `scripts/qa-phase294.mjs`
(a legacy save committing at the MAX stake must lose nothing).

**THE STAKE LOCK EXISTED UNTIL 2026-08-09, AND IT COST A PLAYER A RUN. Read this before adding
anything like it back.** A run was locked to the stake it was played at, and committing above that lock
wiped all ten nodes and re-locked every fighter earned. It was written for a 39.959x finale, to stop
"conquer nodes 1-9 cheap, then cash the final multiplier at a huge stake". Two things killed it:

1. **It protected nothing.** Under the 4.00x cap every node returns under 100% — the best in the game
   is node 2 at 74.6%, the finale is 9.6% — so cashing progress at a high stake is a WORSE bet, not a
   better one. `fightCampaign.test.ts` pins that as "EVERY node is -EV at EVERY stake", and **that test
   is the guard**: if a re-tune ever lifts a node to 100%, it fails, and a protection has to come back
   with that change.
2. **It destroyed real progress on the DEFAULT path.** The lock adopted the current stake whenever
   progress was empty, and the stake is not persisted (every reload re-arms at `DEFAULT_STAKE` $5). So
   one commit at a low stake while the run happened to be empty silently re-based the run, and
   returning to the stake you had been playing at all along wiped it. Reproduced end to end: play at
   $10 → run empty for any reason → rebuild at $5 → the lock is now $5 → click $10 → ten nodes and
   nine fighters gone.

**If a protection is ever needed again, cap the picker at the run's stake — do not wipe.** Disabling a
chip protects the same invariant without ever taking a run away from someone. And note the parser rule
that had to go with it: it used to DROP any progress carrying no readable stamp, which would have wiped
every existing player's run the moment the stamp stopped being written.

**THE 96% CEILING is the reason this game is not a money printer, so treat it as an invariant.** No node
returns more than 96.0000%, and all money is BigInt with FLOOR truncation, so no stake/multiplier pair can
ever pay above its exact multiple — verified across every reachable stake including non-round ones
(`clampStake` can pin the stake to a non-round *balance*). `fightCampaign.test.ts` pins this in exact
integer arithmetic **with a positive control** (an over-priced node must fail the check), because the only
prior guard was a 2M-match script nobody runs in CI. If you touch a `multBps`, that test is the gate.

**There is NO RTP FLOOR, and NO node returns ~96% any more** (Tim, 2026-08-07). The ten prices form a
strictly ascending ladder from **1.32x on node 1 to the 4.00x cap on node 10** (even multiplicative steps,
ratio ~1.131), while EVERY win chance is byte-identical to before. Since RTP = P x mult, that puts the
return at 66.0 / 74.6 / 46.1 / 52.1 / 59.0 / 55.1 / 62.3 / 40.8 / 46.2 / 9.6 — **mean 51.2%, a 48.8%
house edge** — and it is NON-MONOTONIC, because the price climbs smoothly while the win chances step down
in chunks.

**THE 51.2% MEAN RETURN IS CONFIRMED, NOT INHERITED** (Tim, 2026-08-07, session 33). It shipped in phase
291 as the arithmetic *consequence* of "cap at 4x + freeze the win chances" and had never been separately
agreed, so it was re-derived from the shipped exact-rational functions and put back to Tim beside its three
legal alternatives: the steepest legal geometric ladder (1.75x -> 4.00x, node 2 exactly at its 1.92x
ceiling, **mean 60.5%**), the max-return ascending ladder (1.91x -> 4.00x hugging every ceiling, **mean
77.1%**, rejected shape — its steps degenerate to one-cent increments and it reads as four plateaus, not
ten rungs), and raising node 10's win chance (4.00x needs **24.00%** to return ~96%, which would make the
finale easier than node 6). **Tim chose to keep the shipped ladder.** So 51.2% mean / 48.8% house edge is
a decision, not a drift — do not "restore" it, and do not re-open it without a new ruling. Two things follow: paying BELOW a node's ceiling is always legal (that is what allows a 1.32x
opener at an unchanged 50% win chance), and **identical fights now pay different amounts** (nodes 3/4/5
are the same 27.3254% fight at 1.68x/1.91x/2.16x), so "same fight, same pay" is gone and a replaying
player should always farm the LAST node of a tier. Do not "fix" any of this by restoring fair prices — it
is a deliberate ruling. `fightCampaign.test.ts` asserts ten distinct STRICTLY ascending prices, a 13200n
opener, the 40000n close, and the exact per-node returns.

**Never type an RTP into the UI.** Because the return varies per node, every RTP the player sees is
derived by `campaignRtpRange()` from the same exact rationals that price the ladder. A hardcoded "96%" is
precisely how a game ends up telling the player a number its own math contradicts — that string shipped
for weeks and only stopped being true the moment the cap landed. The quick duel is still genuinely 1.92x
at 96%, so its copy is a literal and that is fine.
(The node card carried a per-node RETURNS stat from `nodeRtpPercent()` until phase 299; Tim removed it —
WIN CHANCE and PAYS are the two numbers a player acts on and RETURNS was their product. The map's
computed range is now the only place a return is shown. If a per-node figure ever comes back, import
`nodeRtpPercent` again rather than typing a number.)

Two things are NOT leaks but must be understood: **`RESET PRACTICE BANK` restores $1000 in one click with
no gate** (`FightExperience.tsx`), which is correct for a practice bank and is also what makes every other
client-side trick pointless — and **`DEV_MODE` is a `?dev` query param**, so the CONQUER NEXT/ALL hooks are
live in a production build. They touch `beaten[]` only, never money.
⚠ **A dev-conquered ladder used to be bounced by the stake lock. That lock is gone (phase 300), so the
hooks now hand out PERMANENT progress.** Measured: `?dev=1` -> CONQUER ALL -> reload without `?dev` gives
`beaten` all-true and **12 of 12 fighters selectable, 0 locked**. Previously the next stake commit
cancelled it. This is NOT a money leak — every node is -EV, so a free ladder only buys access to losing
bets and a payout still requires winning the fight — but it does mean two clicks permanently unlock the
whole roster, which is the progression the unlock announcement exists to make feel earned. Dev-gate the
hooks properly before real money, or before anyone plays this who should not have them. Before real money:
server-held balance + server-side settle re-derived from the server's own node table; then dev-gate
`resetBank` and add commit-reveal for PvP picks. Note PvP has no house exposure today — the relay carries
no money. (Until phase 295 the relay was attached ONLY to the vite dev/preview servers, so a static
`dist` deploy could not open a room at all. `npm start` now serves `dist` and carries the relay on the
same port; see "Running it" above.)

**Money decisions read the CHARGED stake, never the live picker.** `committedStakeRef` is frozen at commit
and is what both settles and the refund use; `setStake` is phase-guarded. `stakeRef` keeps moving with the
chips, and paying out against it is the "charged $1, settled on $25" shape.

**The general rule: a correct pure function is not a correct feature.** If a rule's enforcement depends
on what the caller does with the return value, the CALLER'S DECISION must itself be a tested pure
function — otherwise the tests guard the arithmetic and the hole stays open. And play the thing: this
was found by playing the campaign, not by any gate.

**IF YOU EVER MAKE SOMETHING IRREVERSIBLE, DISCLOSE IT BEFORE THE BUTTON.** The stake lock shipped for
weeks announcing its wipe only AFTERWARDS, on the map, past the point of no return — every other
consequence on that screen (win chance, pays, defense) was disclosed before the stake. It was given a
pre-commit warning in phase 296 and then removed entirely in phase 299; the rule it taught outlives it.

**NEVER STALL A MATCH THAT HAS A SECOND HUMAN IN IT.** The portrait rotate prompt freezes the 5s shot
clock so a curtained player's committed stake is not spent on random auto-picks. It is deliberately
SINGLE-PLAYER ONLY. The first version paused in every mode on the reasoning that a stalled friend match
is "a mutual timeout"; measured, it is not. The relay's 10s reconnect grace and auto-play doctrine fire
on ws `'close'` ONLY and there is no heartbeat, so a CONNECTED-but-idle peer is invisible to them — the
victim's clock hit 0, `tryReveal` blocked forever on `if (p1 && p2)`, and 26s past the grace there was
still no settle and no receipt, with their stake committed. If you ever add another pause, ask first
who else is waiting on it.

**A VISUAL COVER IS NOT A BARRIER.** The rotate curtain is opaque and full-viewport, and the covered
pick buttons were still in the tab order and the accessibility tree: one Tab reached a hidden STRIKE and
activating it committed a move against an already-committed stake. `.fr-stage` and the PLAY SAFE pill
carry `inert` while the curtain is up. Probe this with REAL keyboard Tabs — `element.click()` still
dispatches on an inert node, so a `.click()`-based probe measures nothing AND silently commits a pick.

## Generated-asset discipline

**Never commit generated pixels.** `qa-boss/raw/`, `qa-boss/staged-s30/`, `qa-boss/frames/` and
`qa-boss/decisions/` are gitignored and regenerable. Findings go in the markdown; the pixels stay local.
Shipped clips under `public/assets/` ARE tracked.

**Re-generating an artifact relocates its defect.** Measured 7 of 7: every re-roll fixed its named defect
and broke a *different* constraint the previous version satisfied (fixed a 222px overrun → went frontal;
removed a floor → leapt 82px off the ground). **Gate every re-roll on the FULL suite, never on the defect
it was written to fix.**

**Geometric gates measure WHERE things are, never WHAT the artifact IS.** One clip passed all six
(containment, feet-planted, floor-growth, extra-objects, anchor-pair, chroma) while being the wrong
move entirely — spear vertical, inverted, one-handed. Keep the by-eye montage read; it cannot be
replaced by adding more gates. Same class in the UI: an "is the RTP line in view?" check passed while
that line sat fully underneath 44px of dev buttons — a completely overlapped element is perfectly in
view. Assert real box INTERSECTION, and look at the screenshot.

## Gates that cannot fail

`scripts/qa-phase294.mjs` (48 render assertions) and `scripts/qa-phase294-receipt.mjs` (plays real
matches) are the ONLY mechanical guard on `FightExperience.tsx`: there is no jsdom and vitest only
matches `src/**/*.test.ts`, so **JSX has zero unit coverage and a green `vitest` proves nothing about
it.** Four holes were found in those drivers by mutation-testing them in a throwaway `git worktree`,
and every one is a pattern worth re-checking in any gate you write here:

1. **Gate the thing that MATTERS, not the thing that is easy to see.** Deleting the shot-clock freeze —
   the safety half of the portrait feature — left the suite at 30/30, exit 0. It checked the curtain
   existed and was opaque; it never entered a match. Part F now plays one, with a landscape CONTROL
   proving the clock runs before asserting that it stops.
2. **Case.** "No locked tile leaks a name" was `/[A-Z]{3,}/` over textContent, so a lowercase source
   string uppercased by CSS `text-transform` passed while every boss name was on screen.
3. **Liveness.** 11 of 30 assertions passed against an EMPTY PAGE — every "X must NOT be present" check
   is also true of a blank document. Each now carries an app-mounted term.
4. **Build identity.** Neither driver checked WHICH app it was measuring; a stale server on a port
   shared via an `::1` vs `127.0.0.1` split produced a confident 13/30 against a pre-phase-294 build.
   The suite now aborts (exit 2) if the served source lacks the markers it is testing.

**Verify with the user's input device, not with the DOM API.** `element.click()` dispatches on an
`inert` node, so an inert check written that way measures nothing — and worse, it commits a real pick
and silently advances the match under the rest of the run.

**Calibrate per character before trusting a gate verdict.** `node qa-boss/gate-control.mjs --all` runs a
character's ALREADY-SHIPPED clips through a gate as a control. 5 of 12 characters have a miscalibrated or
unusable band — a shipped, accepted clip that fails a band convicts the BAND, not the clip.

## Dev-server hygiene

Start your OWN server on your OWN port with `--strictPort` (`vite.config.ts` pins 5340). Before killing
anything, verify via the PID's **command line** that it belongs to this project — other projects and
other agents run servers on neighbouring ports. Kill your own PID when you finish.

## Adding a character

1. Keyed clips → `public/assets/characters/<id>/`. Filenames use HYPHENS and the take ordinal is spelled
   *nothing / `-b` / `-c`*; the three specials map **positionally** to `special` / `special-b` / `special-c`.
2. Cutout → `public/assets/enemies/<id>.webp` (height 900) + `<id>-pfp.webp` (512², NOT keyed), via
   `scripts/key-enemies.mjs`.
3. Manifest `src/characters/<id>.ts` — model it on `oni-tetsubo.ts`, which documents its own provenance
   honestly. State per clip whether `cal` is re-derived or the keyer's emitted value.
4. Measure `contacts` for the `attack_*` states (`scripts/measure-contacts.mjs`) and frame-check the
   argmax — a contact must fire at the impact plane, not the wind-up.
5. Register in `src/characters/index.ts`. No campaign node ⇒ freely selectable; add it to
   `ALWAYS_AVAILABLE_FIGHTER_IDS` if it *is* a node body but should stay pickable.
6. Run `check-facing --still`, then the pixel gates, then extend `freeRosterFighters.test.ts`.

## Map

| path | what | size |
|---|---|---|
| `src/engine/` | pure game + campaign math (BigInt, no DOM, no React) | ~1.5k |
| `src/engine/fightCampaign.ts` | the node table, payouts, exact win probabilities, RTP derivation | 400 |
| `src/provider/fightProvider.ts` | state machine, stake/balance, persistence, shot clock, transport | 1709 |
| `src/ui/FightExperience.tsx` | the whole presentation layer, every screen, the facing rule | 3519 |
| `src/ui/fight.css` | the whole stylesheet (real CSS file, no CSS-in-JS) | 3051 |
| `src/characters/` | 12 fighter manifests + registry + the unlock gating | |
| `src/server/` | `matchRelay.ts` (VS FRIEND websocket relay) + `staticServer.ts` (production HTTP) | |
| `src/arenas/` | the 10 arena definitions | |
| `server.mjs` | production entry — `npm start` | 41 |
| `scripts/` | drivers + gates. `qa-phase294*.mjs` are the ONLY guard on the UI | |
| `qa-boss/` | asset gates, prompt kits, session ledgers | |
| `HANDOFF-STREETFIGHTER.md` | session-to-session state; **read its top block first** (429KB, only the top is current) | |

Specs, in the order they are useful: `PRODUCT.md` (what the product is), `DESIGN.md`,
`FIGHT-SPEC.md` (the combat rules), `CAMPAIGN-SPEC.md` (the staked layer),
`CHARACTER-CONTRACT.md` (what a fighter must provide).

## Where the bodies are buried — the five things most likely to bite

A short index into the rules above, for someone who has to prioritise:

1. **A stake change can never destroy a run** — the lock that used to do exactly that is gone. If you
   think you need it back, read its obituary in `fightProvider.ts` first; it protected nothing and it
   cost a real player a real run.
2. **`getFighter` throws by contract**, so removing or renaming a fighter is a breaking change across
   three files.
3. **A clip filed under a state the engine never emits fails silently** — no throw, no log, the fighter
   just renders a still forever.
4. **The UI has no unit tests.** Green `vitest` is not evidence about anything on screen.
5. **The shot clock is a money surface.** It auto-picks against a committed stake, which is why the
   portrait curtain freezes it in single-player and deliberately does NOT in friend mode.

## Reporting

Quote real output. Distinguish measured from inferred. Say what you did NOT do. A plausible wrong number
is worse than an admitted gap — this repo's worst incidents all began with a confident unverified claim.
