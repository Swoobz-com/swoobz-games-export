/**
 * Analytic RTP harness for OO-Fisher. Computes the EXACT expected trip
 * multiplier (= RTP) per loadout, using the real production functions — no
 * Monte-Carlo noise. For each loadout it reports:
 *   - bestRtp: the RTP a SKILLED player gets (picks the EV-maximising power,
 *     lands every reel). This is the worst case for the house — it MUST be
 *     ≤ ~0.98 or skilled play drains the bank.
 *   - bestPower / bestDepth: where that optimum sits.
 *   - sampledRtp: RTP under the production power distribution + 0.62 reel.
 */
import {
  applyBaitWeights,
  castPowerToDepth,
  castsPerTrip,
  DEPTH_RARITY_WEIGHTS,
  type DepthTier,
  type FishRarity,
  type GearTier,
  JUNK_CATCH_BPS,
  outcomeBandForPower,
  payoutForCatch,
} from '../originals/oo_fisher/ooFisherMath'

const TIERS: GearTier[] = ['bronze', 'silver', 'gold', 'platinum', 'mythic']
const RARITIES: FishRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
const ONE_X = 10_000

/** Expected normal-catch value (bps) at a depth with a bait, using the real
 *  bait-shifted weights + the real payoutForCatch. */
function expectedValueBps(depth: DepthTier, bait: GearTier): number {
  const w = applyBaitWeights(DEPTH_RARITY_WEIGHTS[depth], bait)
  let totW = 0
  let acc = 0
  for (const r of RARITIES) {
    const wr = (w as Record<FishRarity, number>)[r]
    totW += wr
    acc += wr * Number(payoutForCatch(r, bait))
  }
  return totW > 0 ? acc / totW : 0
}

/** Expected per-cast effectiveBps at a given power, boat, bait, reel rate. */
function expectedPerCastBps(power: number, boat: GearTier, bait: GearTier, reel: number): number {
  const depth = castPowerToDepth(power, boat)
  const band = outcomeBandForPower(power)
  const normalPerMille = 1000 - band.missPerMille - band.snapPerMille - band.junkPerMille
  const ev = expectedValueBps(depth, bait)
  return (normalPerMille / 1000) * reel * ev + (band.junkPerMille / 1000) * Number(JUNK_CATCH_BPS)
}

/** Skilled player: scan all powers 0..100, perfect reel, take the EV-max. */
function bestPlay(boat: GearTier, bait: GearTier): { rtp: number; power: number; depth: DepthTier } {
  let best = -1
  let bestPower = 0
  for (let p = 0; p <= 100; p++) {
    const v = expectedPerCastBps(p, boat, bait, 1.0)
    if (v > best) {
      best = v
      bestPower = p
    }
  }
  return { rtp: best / ONE_X, power: bestPower, depth: castPowerToDepth(bestPower, boat) }
}

/** Sampled play: integrate over the production power distribution + 0.62 reel.
 *  samplePower ~ mean 60, two-uniform-mean; we numerically integrate. */
function sampledRtp(boat: GearTier, bait: GearTier): number {
  // Reproduce samplePower's distribution by scanning the (u1,u2) grid.
  let acc = 0
  let n = 0
  const STEP = 0.01
  for (let u1 = 0; u1 < 1; u1 += STEP) {
    for (let u2 = 0; u2 < 1; u2 += STEP) {
      const avg = (u1 + u2) / 2
      let power = Math.round(60 + (avg - 0.5) * 72)
      power = power < 0 ? 0 : power > 100 ? 100 : power
      acc += expectedPerCastBps(power, boat, bait, 0.98)
      n++
    }
  }
  return acc / n / ONE_X
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + '%'
}

console.log('E[value] per depth (bronze bait / mythic bait) — flat across depths = EV-fair:')
for (let d = 1 as DepthTier; d <= 5; d = (d + 1) as DepthTier) {
  console.log(
    `  d${d}: bronze ${Math.round(expectedValueBps(d, 'bronze')).toString().padStart(7)}  ·  mythic ${Math.round(expectedValueBps(d, 'mythic')).toString().padStart(7)}`,
  )
}
console.log('')
console.log('OO-Fisher RTP matrix — bestPlay (skilled: EV-max power, perfect reel) vs sampled\n')
console.log('rod/boat/bait        casts  bestRTP  @pwr depth   sampledRTP')
let worstBest = 0
let worstCfg = ''
for (const rod of TIERS) {
  for (const boat of TIERS) {
    for (const bait of TIERS) {
      const bp = bestPlay(boat, bait)
      const sp = sampledRtp(boat, bait)
      if (bp.rtp > worstBest) {
        worstBest = bp.rtp
        worstCfg = `${rod}/${boat}/${bait}`
      }
      // Only print the boat/bait grid once per (boat,bait) — rod only scales
      // casts, not per-cast EV, so RTP is rod-independent. Print all for clarity
      // but compact: skip duplicate rod rows except bronze + mythic.
      if (rod === 'bronze') {
        const tag = `${boat}/${bait}`.padEnd(20)
        console.log(
          `${tag} ${String(castsPerTrip(rod)).padStart(5)}  ${pct(bp.rtp).padStart(7)}  ${String(bp.power).padStart(3)}  d${bp.depth}     ${pct(sp).padStart(7)}`,
        )
      }
    }
  }
}
console.log(`\nWORST skilled RTP across all loadouts: ${pct(worstBest)}  (${worstCfg})`)
console.log('(RTP is rod-independent — trip mult = AVERAGE per-cast, so more casts ≠ more EV.)')
