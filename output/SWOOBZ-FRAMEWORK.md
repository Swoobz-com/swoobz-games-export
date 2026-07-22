# THE SWOOBZ FRAMEWORK
### One complete system: what Swoobz is, how it works, why it's fun, why players return, and why it has business value.

*Compiled 2026-07-01 from: the four shipped Swoobz Originals (Pulse, Rug or Riches, OO-Fisher, The Myth of REI), the Swoobz engagement-layer standard, the casino-math and responsible-gambling doctrine, the canonical design system, and the slot-R&D pipeline. Anything not found in these sources is clearly marked **[SUGGESTION]** or **[NEEDS CLARIFICATION]** — nothing is invented silently.*

---

## 1. EXECUTIVE SUMMARY

Swoobz is a crypto-native gaming platform built around one core belief:

> **"Players are stakeholders, not just customers."**

It delivers premium, provably-fair casino originals (crash, mines, fishing, adventure-slot) where every round — win **or lose** — earns the player **Ownership Points (OP)** toward a permanent progression identity: ranks, soulbound rewards, cosmetics, and loyalty perks. The money game is locked, audited, and transparent (the **Glass Box**: every round cryptographically verifiable by the player). The progression game is generous, permanent, and never touches the odds.

That separation — the **Two-Economy Iron Rule** — is the whole framework in one line:

- **Money economy**: fair, locked, transparent. You can verify every round yourself.
- **Progression economy**: yours forever, grows every round, never expires, never manipulates the odds.

The result is a casino that behaves like a game studio and treats its community like co-owners — which is exactly what makes players stay, tell friends, and defend the brand.

---

## 2. CORE SWOOBZ CONCEPT

**What it is:** a catalogue of original, in-house games ("Swoobz Originals") on a dark-glass, premium platform chassis, wagered in USDC on Solana, with on-chain settlement and player-verifiable fairness.

**What makes it different from every other crypto casino:**

1. **Glass Box fairness** — not a "provably fair" footnote, but a first-class UI: every settled round shows a receipt (server seed, hash, commitment) that the client re-derives and stamps **"✓ verified"** in front of the player. Custom game settings (e.g. custom mine counts) stay verifiable.
2. **The Ownership Engine** — every round earns OP; **losses earn 1.5×** the points of wins. The worst moment in gambling (losing) is the moment Swoobz gives you *more* ownership. This is engagement-on-loss done ethically: points are identity, never money, so it rewards loyalty without rewarding losing.
3. **Studio-quality originals, not clones** — each game has a full theme bible, a custom art register, cinematic payoffs, and passes a "fresh player understands it in 3 taps" comprehension gate before shipping.
4. **Structural responsible gambling** — RG isn't a settings page; it's built into the type system. Celebrations are byte-identical whether you're on a hot streak or your first spin (RG-C5). Loss screens are honest ("BUST −1.00", never a positive-looking multiplier). Sessions have natural stopping points built in.
5. **A "quiet expert at the table" brand** — premium and restrained where the platform speaks, loud and juicy only inside the games where it belongs.

---

## 3. KEY TERMS AND DEFINITIONS

| Term | Plain-language definition |
|---|---|
| **Swoobz Originals** | The in-house game catalogue: Pulse, Rug or Riches, OO-Fisher, The Myth of REI (+ slot pipeline titles in R&D). |
| **OP / Ownership Points** | Points earned every round, win or lose (loss pays 1.5×). Lifetime, never reset, never expire. Drive your rank. Not money; never change odds. |
| **Ownership Engine** | The rule set that awards OP. "Every bet makes you more of a stakeholder." |
| **Rank ladder** | A permanent, monotonic progression spine per game (e.g. REI's Warden ranks). Early ranks come fast (~30 rounds to rank 2); apex ranks are a long-haul badge of honor. |
| **Soulbound reward** | A claimable, non-transferable NFT minted to your wallet at rank milestones. It's identity, not currency: it can't be sold, and it never changes game odds. |
| **The three benefit kinds** | Every reward is exactly one of: **loyalty** (tier eligibility → rakeback/daily-bonus, rates owned by the audited revenue router), **cosmetic** (skins, titles, music, codex, frames), or **agency** (EV-neutral choices, e.g. an extra ally slot or route choice). Nothing else is legal. |
| **Glass Box** | The provably-fair system: seed committed before the round, revealed after, re-verified client-side, shown as a receipt with "✓ verified". |
| **Two-Economy Iron Rule** | Money math (RTP, payouts) and progression (OP, ranks, rewards) NEVER cross. No reward may ever change what the math pays. |
| **RTP** | Return-to-player: the audited percentage paid back over time (Originals target ~96–97%; wilder modes disclosed lower, e.g. 93.5%). Always disclosed in-game in plain words. |
| **RG-C5** | The structural responsible-gambling rule: celebration size/length never scales with streak, session, or win size. Enforced in code (module constants, zero-parameter functions), not by policy. |
| **Bet Console** | The shared betting surface every Original uses: one big wager, quick chips, a live "TO WIN" preview, one options drawer, one commit button. Learn it once, play everything. |
| **Session arc** | A built-in natural stopping point (e.g. after 20 rounds: session summary + "close the vault") — informational, never blocking. |
| **Turnkey wallet** | The player's embedded wallet; rewards mint to it, wagers settle from it. |

---

## 4. FULL PLAYER JOURNEY

### Minute 0 — arrival
A new player lands on a dark, premium lobby — no neon chaos, no popups. Four distinctive games with clear one-line identities. Balance and wager are always in USDC with plain formatting.

### Minute 1 — first game (example: Rug or Riches)
- One big button ("APE IN"). One panel: **bet amount, world choice, TO WIN preview, one commit button.** The Bet Console pattern means there is exactly one obvious path.
- Three worlds with honest risk labels (3 rugs / 5 rugs / 24 rugs) and a personality each. Advanced options (custom mine counts, auto-exit target) are behind one OPTIONS drawer — the default flow is dead simple.

### Minute 2 — the core loop clicks
- Tap a sealed vault compartment → it cracks open → green coin, multiplier climbs.
- The screen answers the only two questions that matter, side by side: **RUG RISK %** (chance the next tap busts) and **NEXT SAFE → ×N** (what the next tap pays). Risk and greed, quantified, before every decision.
- Cash out any time. The gate for shipping was literally: *a stranger understands this in ~3 taps with zero instructions.* It passes.

### Minute 3 — first settle (win or lose)
- **Win:** "SECURED THE BAG · 2.44×, +12.20" — plus a "✓ verified" receipt they can expand.
- **Loss:** "RUGGED · BUST · −1.00" — honest, no fake-positive numbers — **and +OP at 1.5×.** The first loss is the first time Swoobz surprises them: *you lost the round, but you gained standing.*

### Session 2–10 — the hooks set
- **Personal bests** appear on world cards ("YOUR BEST · 4.73×") — a self-calibrating target.
- The **rank chip** ticks up; around round ~30 the first **rank-up moment** fires with a claimable reward and a tap-through to the **unlock showcase** — a full ladder of what's still ahead (skins, titles, region music, loyalty tiers).
- Play styles deepen: TRAIL path-planning, EXIT-AT discipline targets, custom risk tuning, Pulse auto-cashout slots (extra slots unlock at rank 3 and 9 — progression granting *agency*, never odds).

### Week 2+ — identity
- Their collection page shows earned soulbound seals/titles. Their loyalty tier grants real (audited) perks. Their lifetime OP never reset, so nothing was ever wasted — every round they ever played is still "in" their rank.
- Natural stop moments (session summary, "close the vault") keep the relationship healthy rather than compulsive.

**Where confusion can happen (verified by fresh-player testing):** crypto slang ("APE IN") is charming to degens but needs the always-present plain-language help overlay; "RTP %" means nothing to newcomers (fixed by leading with plain words); secondary modes (TRAIL) need one-shot gesture hints. These are known, tracked, and mostly fixed — see §10.

---

## 5. PRODUCT FRAMEWORK — how everything connects

```
                        ┌─────────────────────────────┐
                        │        SWOOBZ PLATFORM       │
                        │  lobby · wallet · loyalty    │
                        └──────┬───────────┬──────────┘
                MONEY ECONOMY  │           │  PROGRESSION ECONOMY
                (locked/audited)│           │ (EV-neutral, permanent)
                        ┌──────▼─────┐ ┌───▼──────────────┐
                        │  ORIGINALS │ │ OWNERSHIP ENGINE │
                        │ Pulse      │ │ OP every round   │
                        │ RugOrRiches│─▶ loss ×1.5        │
                        │ OO-Fisher  │ │ rank ladders     │
                        │ Myth of REI│ │ soulbound rewards│
                        └──────┬─────┘ └───┬──────────────┘
                        ┌──────▼─────┐ ┌───▼──────────────┐
                        │ GLASS BOX  │ │ UNLOCK SHOWCASE  │
                        │ receipts   │ │ cosmetics·titles │
                        │ ✓ verified │ │ music·loyalty    │
                        └────────────┘ └──────────────────┘
```

- **Shared chassis**: every game uses the same box-framed layout (board region + bounded control panel), the same Bet Console, the same receipt pattern, the same rank/reward surfaces. One design system (LAB tokens, accent-API), one number font, one voice per register. Players transfer knowledge between games instantly; the team ships new games faster because the chassis exists.
- **Per-game soul**: each Original owns a full theme bible, its own accent economy (e.g. Rug or Riches deliberately drops platform cyan for green/gold/red candle colors), its own copy voice, its own progression skin (Warden seals vs. fishing gear vs. vault worlds).
- **Money flow** (Domain A): BigInt/BPS math, house-favored flooring, deterministic, mirrored bit-for-bit on-chain; RTP simulated at scale before ship. Prices/antes are fixed for players; tuning happens inside the math, never on the price tag.
- **Casino + prediction-market logic**: the Originals are the live casino layer today. **[NEEDS CLARIFICATION]** — prediction-market mechanics are referenced in the vision but no spec exists in these sources; the Glass Box + settlement rails are designed to extend to them (commit → play → reveal → verify maps cleanly to markets).
- **Affiliate / dashboard**: loyalty tiers, rakeback and revenue routing exist as audited platform systems (the revenue router owns all rates — games only declare *eligibility*). **[NEEDS CLARIFICATION]** — the affiliate program's structure (codes? revenue share? OP bonuses?) is not specified in these sources; see §11 for a suggested shape.

---

## 6. GAMIFICATION FRAMEWORK

**The design doctrine (applies to every Original):**

1. **The money game must be fun with zero progression.** Each Original stands alone as a great 3-minute experience: readable risk, quantified reward, cinematic payoff moments (earned, not spammy).
2. **The progression game gives a reason to return that is NOT the next bet.** Ranks, collections, unlocks — always visible via the persistent rank chip and the unlock showcase ("what am I grinding toward?" answered at a glance: EARNED / NEXT / locked).
3. **Skill expression without EV change**: play-style depth (TRAIL planning, EXIT-AT discipline, risk tuning, gear/route choices) gives mastery feelings while every option stays EV-honest and disclosed.
4. **Self-calibrating goals**: personal bests per world/mode — a beginner chases 1.5×, a veteran chases 8.2×; the game never has to escalate anything (RG-safe flow, by design).
5. **The 4-beat rhythm**: every round has anticipation → action → payoff → settle, tuned per game category; celebrations are tiered by *named* outcome class, never scaled by value or streak.
6. **Anti-dark-pattern bans are structural** (not policy): no FOMO timers, no expiring rewards, no "almost there — keep going" copy, no near-miss manufacturing, no loss-indexed money rewards, no celebration escalation. The engagement layer is calm, in-world, "steady accrual".

---

## 7. OP / REWARDS FRAMEWORK

**Earning:** every settled round earns OP. Win = 1.0× base, **loss = 1.5× base** (the Ownership Engine's signature). Computed deterministically from the wager (BigInt, floored, auditable). OP is lifetime: never reset, never expired, never bought.

**Rank ladder (per game + platform):**
- Monotonic thresholds; rank 0 is everyone; rank 2 lands ~30 rounds in (early win); apex ranks are long-haul.
- Rank never pays money. Rank-up is a *moment* (banner + claimable reward + showcase link), byte-identical in intensity at every rank (RG-C5).

**Rewards (claimed, not auto-dropped — claiming is a moment):**
- Minted as **soulbound NFTs** to the player's Turnkey wallet via the originals-collection program. Explicit `soulbound: true` on every reward — structurally impossible to mint a tradable token by accident.
- Exactly three benefit kinds: **loyalty** (tier eligibility — rakeback %/amounts live only in the audited revenue router, never hardcoded in a game), **cosmetic** (seal-skins, symbol skins, titles, region music, codex/lore pages, panel frames), **agency** (EV-identical choices: extra auto-cashout slots, ally slots, route choices).
- The **unlock showcase** is the retention centerpiece: the full ladder, your standing, progress-to-next, and a collection tab. Most competitors have no persistent aspiration surface at all — this is the differentiator.

**The honesty footnote appears everywhere rewards do:** *"non-transferable, minted to your account, never changes the game odds."*

---

## 8. COMMUNITY & DISCORD FRAMEWORK

**What the product already gives community builders:** shareable result cards (every settle has a share action), verifiable receipts (screenshots that skeptics can check themselves), personal bests and rank identities (status worth showing off), soulbound collections (visible dedication), and a games catalogue with genuine personality (memeable moments: "RUGGED", the MOON, boss catches).

**[SUGGESTION — no Discord spec exists in these sources; this shape fits the existing systems:]**
- **Roles mirror in-game identity**: link wallet → Discord roles auto-map to rank tiers and notable soulbound items (e.g. "Warden III", "MOON finder"). Zero new economy needed — it's a *display* of what already exists.
- **Beta-tester track**: a soulbound "Founding Tester" reward (cosmetic kind) for the pre-launch cohort; early access channels per game; a visible changelog channel that shows player feedback shipping (the studio already runs a fresh-player comprehension gate — publish its wins).
- **Events that fit the Iron Rule**: screenshot/clip contests (biggest verified multiplier, best MOON), community-vote cosmetics (pick the next seal-skin), lore/codex hunts for REI. Prizes = cosmetics/titles/early access — never odds, never bankroll pressure.
- **KOLs & ambassadors**: give them the same rails as players (verifiable receipts make honest content easy) plus creator cosmetic codes. **[NEEDS CLARIFICATION]** — whether ambassador compensation ties into the affiliate/revenue-share system needs a business decision (see §11).
- **Tournaments**: **[NEEDS CLARIFICATION]** — no tournament system exists in these sources. If built, the compliant shape is: leaderboards on *verified multipliers or OP earned* (not net profit — that rewards over-wagering), fixed entry windows, cosmetic/loyalty prizes.

---

## 9. INVESTOR-FACING EXPLANATION

**Why this framework creates durable value:**

1. **Retention economics beat acquisition economics.** The Ownership Engine converts every wager — including losses (the majority of casino events) — into permanent account value. Lifetime OP means a lapsed player who returns finds their standing intact: reactivation cost approaches content-notification cost, not re-acquisition cost.
2. **Trust is the moat.** Provably-fair is common as a claim and rare as a *product surface*. Glass Box receipts turn every skeptical Reddit thread into a demo. In a market where operator distrust is the #1 objection, verifiability is a conversion asset, not a compliance cost.
3. **A studio, not a skin.** Original IP (REI's world, the degen vault, the fishing universe) compounds: characters, lore, cosmetics, music, and a reusable production pipeline (theme bible → art → QA gates → comprehension gate) that ships new titles on a shared chassis at decreasing marginal cost.
4. **Regulatory resilience by architecture.** RG is enforced in the type system (RG-C5 structural constants, honest loss displays, session arcs, the dark-pattern ban list) and the reward economy is *provably* odds-neutral (soulbound, three legal benefit kinds, audited revenue router owning all rates). That's a diligence story most competitors cannot tell.
5. **Monetization is clean and disclosed:** house edge on a locked RTP (~96–97% originals; disclosed wilder modes), with loyalty/rakeback as a routed cost of retention — no hidden levers, no pay-to-win, no token dependence in the core loop. **[NEEDS CLARIFICATION]** — any $SWOOBZ token/ownership-conversion story for OP is not specified in these sources and should be decided deliberately (see §11).
6. **Community as distribution**: shareable verified wins + identity systems give organic content loops; the affiliate/ambassador layer (once specified) plugs into an already-audited revenue router.

---

## 10. RISKS, CONFUSING PARTS, MISSING LINKS

**Player-facing friction (found via fresh-player testing; most already fixed):**
- Crypto-degen slang ("APE IN", "SEND IT") delights the target user but needs the plain-language help overlay as a permanent safety net (it exists — keep it excellent).
- "RTP 97%" is jargon; players read the *bigger number on the safer world* as "pays more". Fix pattern: lead with plain promises ("small steady pumps" vs "huge pumps + a MOON jackpot"), demote RTP to the receipt/footnote.
- Secondary modes (TRAIL) and rare events (MOON) are under-discovered; one-shot gesture hints and persistent "not found yet" chips are the pattern.
- The name "OP / Ownership Points" invites the question *"do I own equity?"* — copy must consistently say what it is (standing/loyalty) and isn't (equity/money) until a deliberate decision says otherwise.

**Missing links (exist in vision, not in these sources — need specs before anyone builds):**
1. **Prediction markets** — mechanics, settlement source, UI. The Glass Box rails extend naturally, but nothing is specified.
2. **Affiliate program** — structure, rates, tracking, dashboard.
3. **Tournaments/leaderboards** — no system exists; compliant shape sketched in §8.
4. **Discord/community program** — no formal spec; suggested shape in §8.
5. **OP → anything conversion** (token, revenue share, governance): currently OP is explicitly *not* money. Any change is a legal/regulatory event, not a feature toggle.
6. **Cross-game platform rank** — today ranks are per-game (REI's Warden ladder is the reference). A platform-level OP ledger exists conceptually (loyalty tiers) but the unified "Swoobz level" surface isn't specified.

**Business risks:**
- Loss-amplified OP (1.5×) is ethically defensible *because* OP is odds-neutral identity — but it must be messaged carefully or it reads as "rewarding losses". The RG framing (consolation → standing, never money) is the shield; keep it front and center.
- Premium restraint vs. degen energy is a deliberate tension (platform quiet, games loud). It works while the register discipline holds; it collapses if either voice leaks into the other's surface.

---

## 11. SUGGESTED IMPROVEMENTS (all clearly suggestions)

1. **Platform-level "Swoobz Rank"**: one lobby-visible rank fed by all games' OP (per-game ladders stay as flavor). One number a player can say out loud. Fits the existing ledger + showcase patterns.
2. **Affiliate v1 that matches the brand**: referral links that grant *both* sides a cosmetic + loyalty-tier boost (kind-only, routed through the audited tiers), with a simple dashboard (clicks, signups, OP earned by referred players). No cash-for-losses structures — they contradict the RG posture.
3. **Weekly community ritual**: one fixed, low-stakes event cadence (e.g. "MOON hunt Friday" clip contest) — rituals compound community better than sporadic campaigns.
4. **Onboarding as one shared system**: the comprehension-gate findings (TO-WIN preview, honest BUST, one-shot hints) are now per-game patterns; formalize them into the shared chassis so every new Original inherits them on day one (the Bet Console already proves this model works).
5. **Publish the fairness page**: a public "how the Glass Box works" explainer with a live verifier tool — turns the trust story into marketing.
6. **Name discipline pass**: unify "OP / Ownership Points / ownership engine / loyalty tier" naming across surfaces so the pitch, product, and Discord all say identical words.

---

## 12. FINAL SIMPLIFIED VERSION (pitch-deck ready)

> ### Swoobz — the casino where every bet makes you a stakeholder.
>
> **Play:** Original, studio-quality games (crash, mines, fishing, adventure) — premium design, instantly understandable, wagered in USDC.
>
> **Trust:** Every round is provably fair — and we show it. Each result comes with a receipt your own device verifies. Locked, disclosed odds. Honest screens, even when you lose.
>
> **Own:** Every round earns Ownership Points — and losses earn 1.5×. Points never expire and never reset. They build your rank, unlock soulbound rewards (skins, titles, music, real loyalty perks) minted to your wallet. Your history is never wasted.
>
> **Never crossed:** rewards never touch the odds. The money game is audited and locked; the progression game is yours forever. That separation is our ethics, our regulatory story, and our retention engine — the same feature, three ways.
>
> **Why it wins:** players return for who they've become, not just the next bet. Trust converts skeptics. Original IP compounds. And the whole machine ships on one reusable chassis — every new game is cheaper than the last.

---

*Framework compiled from live code + studio standards. Open items flagged in §10 need product decisions before external use of those specific sections.*
