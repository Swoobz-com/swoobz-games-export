# AGENTS.md — working in STANDOFF

Entry point for any agent (or human) touching this repo. Read this, then the spec for the area you are
changing. Everything here is a rule that cost real debugging time to learn — none of it is style advice.

**STANDOFF** is a two-sided rock-paper-scissors fighting game. Vite + React 18 + TypeScript, no runtime
deps beyond React. Two fighters occupy a p1 (left) and p2 (right) slot; STRIKE/THROW/BLOCK is an RPS
triangle; a campaign of 10 nodes sits on top, with real stake/payout math.

## Verify before you claim anything

```bash
npx tsc --noEmit                                              # must be 0
npx vitest run --pool=forks --poolOptions.forks.singleFork=true  # 286 tests / 17 files as of phase 296
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

**THE CAMPAIGN STAKE LOCK.** A run is locked to the stake it was played at. Entering the map at a
HIGHER stake wipes progress; the same or lower keeps it. It exists because node payouts are fixed
multipliers (node 10 is 39.959x) — without it a player could conquer cheap nodes and then cash the final
multiplier at a huge stake. Pure logic + tests: `applyCampaignStakeLock` in `src/provider/fightProvider.ts`
and `src/provider/campaignStakeLock.test.ts`. Persisted schema is `{v:2, beaten, lockStake}`; **a v1
payload is rejected on purpose** (no stamp ⇒ untrusted).

**A RESET CANCELS THE ATTEMPT, it does not merely erase the record** — and getting this wrong left the
exploit fully open while all 12 unit tests passed. The lock function was correct; the provider wiped
`beaten` and then entered the selected node anyway. Proven by PLAYING it: nine nodes conquered at $1,
open ZERO CITADEL, raise to $25 — progress wiped, lock re-stamped at $25, and the player handed the
39.95x final node AT $25. It also stranded a conquered island behind fogged nodes (`beaten=[F,F,F,T,…]`,
since `frontierOf` is the first unbeaten index). The decision now lives in the pure
`campaignCommitAction`, which returns `resetToMap` WITHOUT a `nodeId` so no caller can start the match;
the provider refunds (the match never started) and returns to the map with the reset announced.

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

**Never type an RTP into the UI.** Because the return now varies per node, every RTP the player sees is
derived by `nodeRtpPercent()` / `campaignRtpRange()` from the same exact rationals that price the ladder.
The map line and the node card's RETURNS stat both read from those. A hardcoded "96%" is precisely how a
game ends up telling the player a number its own math contradicts — that string shipped for weeks and only
stopped being true the moment the cap landed. The quick duel is still genuinely 1.92x at 96%, so its
copy is a literal and that is fine.

Two things are NOT leaks but must be understood: **`RESET PRACTICE BANK` restores $1000 in one click with
no gate** (`FightExperience.tsx`), which is correct for a practice bank and is also what makes every other
client-side trick pointless — and **`DEV_MODE` is a `?dev` query param**, so the CONQUER NEXT/ALL hooks are
live in a production build. They touch `beaten[]` only, never money, and a dev-conquered ladder is bounced
by the stake lock (unstamped progress ⇒ reset ⇒ attempt cancelled, verified live). Before real money:
server-held balance + server-side settle re-derived from the server's own node table; then dev-gate
`resetBank` and add commit-reveal for PvP picks. Note PvP has no house exposure today — the relay carries
no money and is attached only to the vite dev/preview servers (`vite.config.ts`), so a static `dist`
deploy cannot even open a room.

**Money decisions read the CHARGED stake, never the live picker.** `committedStakeRef` is frozen at commit
and is what both settles and the refund use; `setStake` is phase-guarded. `stakeRef` keeps moving with the
chips, and paying out against it is the "charged $1, settled on $25" shape.

**The general rule: a correct pure function is not a correct feature.** If a rule's enforcement depends
on what the caller does with the return value, the CALLER'S DECISION must itself be a tested pure
function — otherwise the tests guard the arithmetic and the hole stays open. And play the thing: this
was found by playing the campaign, not by any gate.

**THE STAKE LOCK MUST BE DISCLOSED BEFORE THE BUTTON, NOT AFTER THE WIPE.** Committing above a run's
`lockStake` wipes all ten nodes and re-locks every fighter earned. The trap is the DEFAULT path, not an
exotic one: the stake is not persisted, so a returning player whose run was locked at $1 re-arms at
`DEFAULT_STAKE` $5, opens a conquered node, and the single obvious button destroys the run. For weeks
that was announced only afterwards, on the map's RUN RESTARTED plate, and `lockStakeLamports` was
rendered NOWHERE — the player could not even compute the risk. The node card now carries
`.fr-stake-wipewarn` above the picker, the hint switches to "THIS STAKE RESTARTS THE RUN", and the
commit button reads RESTART THE RUN AT $X. **Any new copy about replaying must stay conditional on
`stakeWipesRun`**: above the lock, "costs the same stake and pays the same" is FALSE — nothing is
charged and nothing is paid, because the match never starts.

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

`scripts/qa-phase294.mjs` (46 render assertions) and `scripts/qa-phase294-receipt.mjs` (plays real
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

| path | what |
|---|---|
| `src/engine/` | pure game + campaign math (BigInt, no DOM) |
| `src/provider/fightProvider.ts` | state machine, stake/balance, persistence |
| `src/ui/FightExperience.tsx` | the whole presentation layer, incl. the facing rule |
| `src/characters/` | manifests + registry + gating |
| `qa-boss/` | gates, prompt kits, session ledgers |
| `HANDOFF-STREETFIGHTER.md` | session-to-session state; **read its top block first** |

Specs: `PRODUCT.md`, `DESIGN.md`, `FIGHT-SPEC.md`, `CAMPAIGN-SPEC.md`, `CHARACTER-CONTRACT.md`.

## Reporting

Quote real output. Distinguish measured from inferred. Say what you did NOT do. A plausible wrong number
is worse than an admitted gap — this repo's worst incidents all began with a confident unverified claim.
