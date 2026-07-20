import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_NODES,
  CAMPAIGN_NODE_COUNT,
  campaignPayout,
  evaluateObjective,
  formatMult,
  formatWinChance,
  getCampaignNode,
  TIERS,
  type CampaignTier,
} from './fightCampaign';

const ALL_TIERS: CampaignTier[] = ['takeRound', 'winMatch', 'flawlessRound', 'win20', 'winWithFlawless', 'bossRequiem'];

describe('tier table — exact values (spec §1)', () => {
  it('probabilities and multipliers are the agreed exact values', () => {
    expect(TIERS.takeRound).toMatchObject({ pNum: 3, pDen: 4, multBps: 12800n });
    expect(TIERS.winMatch).toMatchObject({ pNum: 1, pDen: 2, multBps: 19200n });
    expect(TIERS.flawlessRound).toMatchObject({ pNum: 9, pDen: 32, multBps: 34100n });
    expect(TIERS.win20).toMatchObject({ pNum: 1, pDen: 4, multBps: 38400n });
    expect(TIERS.winWithFlawless).toMatchObject({ pNum: 7, pDen: 32, multBps: 43800n });
    expect(TIERS.bossRequiem).toMatchObject({ pNum: 7, pDen: 64, multBps: 87700n });
  });

  it('objective copy carries no em-dashes (RG-C5 copy law)', () => {
    for (const tier of ALL_TIERS) {
      expect(TIERS[tier].objective).not.toContain('—');
    }
  });

  it('every tier is priced at <= 96% RTP (spec §0: multBps * P <= 0.96)', () => {
    // exact integer form of multBps/10000 * pNum/pDen <= 9600/10000  ⇔  multBps*pNum <= 9600*pDen
    for (const tier of ALL_TIERS) {
      const { pNum, pDen, multBps } = TIERS[tier];
      expect(multBps * BigInt(pNum) <= 9600n * BigInt(pDen)).toBe(true);
    }
  });
});

// ── Closed-form probability regression ─────────────────────────────────────────────────────
// Recompute each objective's P(met) FROM FIRST PRINCIPLES by enumerating every match path over the
// fundamental round distribution (flawless win 1/8, non-flawless win 3/8, loss 1/2 — spec §1), then
// running the REAL evaluateObjective on each terminal state. Because the evaluator's terminal facts
// are monotonic in the accumulated round facts, evaluating at match-over reproduces the early-exit
// verdict. The measured P(met) must equal the stored exact rational — this ties the tier table AND
// the evaluator to the closed-form fractions in one check.
interface MatchPath {
  p1w: number;
  p2w: number;
  flaw: number; // p1 flawless round wins
  weight: bigint; // product of per-round weights (out of 8 each)
  rounds: number;
}
function enumerateMatches(): MatchPath[] {
  const out: MatchPath[] = [];
  const rec = (p1w: number, p2w: number, flaw: number, weight: bigint, rounds: number): void => {
    if (p1w >= 2 || p2w >= 2) {
      out.push({ p1w, p2w, flaw, weight, rounds });
      return;
    }
    rec(p1w + 1, p2w, flaw + 1, weight * 1n, rounds + 1); // flawless win  (1/8)
    rec(p1w + 1, p2w, flaw, weight * 3n, rounds + 1); // non-flawless win (3/8)
    rec(p1w, p2w + 1, flaw, weight * 4n, rounds + 1); // loss            (4/8)
  };
  rec(0, 0, 0, 1n, 0);
  return out;
}

describe('closed-form probability regression (spec §1 fractions)', () => {
  const paths = enumerateMatches();

  it('the enumerated distribution is complete (sums to 512 = 8^3)', () => {
    let total = 0n;
    for (const p of paths) total += p.weight * 8n ** BigInt(3 - p.rounds);
    expect(total).toBe(512n);
  });

  for (const tier of ALL_TIERS) {
    it(`P(met) for ${tier} equals ${TIERS[tier].pNum}/${TIERS[tier].pDen}`, () => {
      // scale every path to the common denominator 8^3 = 512 and sum the 'met' contributions.
      let met = 0n;
      for (const p of paths) {
        const contribution = p.weight * 8n ** BigInt(3 - p.rounds);
        if (evaluateObjective(tier, p.p1w, p.p2w, p.flaw, true) === 'met') met += contribution;
      }
      const { pNum, pDen } = TIERS[tier];
      // met/512 === pNum/pDen  ⇔  met * pDen === pNum * 512
      expect(met * BigInt(pDen)).toBe(BigInt(pNum) * 512n);
    });
  }
});

// ── evaluateObjective — scripted round sequences (met / failed / open + early-exit ordering) ──
describe('evaluateObjective — takeRound', () => {
  it('met the instant P1 takes a round', () => {
    expect(evaluateObjective('takeRound', 1, 0, 0, false)).toBe('met');
    expect(evaluateObjective('takeRound', 1, 1, 0, false)).toBe('met');
  });
  it('open while nobody has closed it out', () => {
    expect(evaluateObjective('takeRound', 0, 0, 0, false)).toBe('open');
    expect(evaluateObjective('takeRound', 0, 1, 0, false)).toBe('open');
  });
  it('failed only when P2 reaches 2 with P1 still at 0', () => {
    expect(evaluateObjective('takeRound', 0, 2, 0, true)).toBe('failed');
  });
});

describe('evaluateObjective — winMatch', () => {
  it('met on a P1 match win, failed on a P2 match win, open otherwise', () => {
    expect(evaluateObjective('winMatch', 2, 0, 0, true)).toBe('met');
    expect(evaluateObjective('winMatch', 2, 1, 1, true)).toBe('met');
    expect(evaluateObjective('winMatch', 0, 2, 0, true)).toBe('failed');
    expect(evaluateObjective('winMatch', 1, 1, 0, false)).toBe('open');
  });
});

describe('evaluateObjective — flawlessRound', () => {
  it('met on any P1 flawless win, even mid-match', () => {
    expect(evaluateObjective('flawlessRound', 1, 0, 1, false)).toBe('met');
    expect(evaluateObjective('flawlessRound', 1, 1, 1, false)).toBe('met');
  });
  it('failed at match over without a flawless win (even a 2-1 win)', () => {
    expect(evaluateObjective('flawlessRound', 2, 1, 0, true)).toBe('failed');
    expect(evaluateObjective('flawlessRound', 0, 2, 0, true)).toBe('failed');
  });
  it('open while the match runs and no flawless yet', () => {
    expect(evaluateObjective('flawlessRound', 1, 1, 0, false)).toBe('open');
  });
});

describe('evaluateObjective — win20', () => {
  it('failed the moment P1 loses a round (early, before match over)', () => {
    expect(evaluateObjective('win20', 0, 1, 0, false)).toBe('failed');
    expect(evaluateObjective('win20', 1, 1, 0, false)).toBe('failed');
  });
  it('met at a clean 2-0', () => {
    expect(evaluateObjective('win20', 2, 0, 0, true)).toBe('met');
  });
  it('open at 1-0', () => {
    expect(evaluateObjective('win20', 1, 0, 0, false)).toBe('open');
  });
});

describe('evaluateObjective — winWithFlawless', () => {
  it('failed on a P2 match win', () => {
    expect(evaluateObjective('winWithFlawless', 0, 2, 0, true)).toBe('failed');
    expect(evaluateObjective('winWithFlawless', 1, 2, 1, true)).toBe('failed');
  });
  it('met on a P1 match win that included a flawless round', () => {
    expect(evaluateObjective('winWithFlawless', 2, 1, 1, true)).toBe('met');
    expect(evaluateObjective('winWithFlawless', 2, 0, 2, true)).toBe('met');
  });
  it('failed on a P1 match win with no flawless round (too late)', () => {
    expect(evaluateObjective('winWithFlawless', 2, 0, 0, true)).toBe('failed');
    expect(evaluateObjective('winWithFlawless', 2, 1, 0, true)).toBe('failed');
  });
  it('open while the match runs, even with a flawless already banked (must still win)', () => {
    expect(evaluateObjective('winWithFlawless', 1, 0, 0, false)).toBe('open');
    expect(evaluateObjective('winWithFlawless', 1, 1, 1, false)).toBe('open');
  });
});

describe('evaluateObjective — bossRequiem', () => {
  it('failed the moment P1 loses a round', () => {
    expect(evaluateObjective('bossRequiem', 0, 1, 0, false)).toBe('failed');
    expect(evaluateObjective('bossRequiem', 1, 1, 1, false)).toBe('failed');
  });
  it('met at 2-0 with a flawless round', () => {
    expect(evaluateObjective('bossRequiem', 2, 0, 1, true)).toBe('met');
    expect(evaluateObjective('bossRequiem', 2, 0, 2, true)).toBe('met');
  });
  it('failed at 2-0 with no flawless round', () => {
    expect(evaluateObjective('bossRequiem', 2, 0, 0, true)).toBe('failed');
  });
  it('open at 1-0 with no flawless yet', () => {
    expect(evaluateObjective('bossRequiem', 1, 0, 0, false)).toBe('open');
  });
});

// ── campaignPayout — bigint floor truncation ──────────────────────────────────────────────
describe('campaignPayout — floor truncation (swoobz-casino-math)', () => {
  it('clean cases', () => {
    expect(campaignPayout(5_000_000n, 12800n)).toBe(6_400_000n); // 5.00 -> 6.40
    expect(campaignPayout(5_000_000n, 19200n)).toBe(9_600_000n);
    expect(campaignPayout(1_000_000n, 87700n)).toBe(8_770_000n);
  });
  it('floors odd-lamport stakes DOWN (never rounds up)', () => {
    // 1_000_001 * 12800 / 10000 = 1_280_001.28 -> 1_280_001
    expect(campaignPayout(1_000_001n, 12800n)).toBe(1_280_001n);
    // 3 * 87700 / 10000 = 26.31 -> 26
    expect(campaignPayout(3n, 87700n)).toBe(26n);
    // 7 * 34100 / 10000 = 23.87 -> 23
    expect(campaignPayout(7n, 34100n)).toBe(23n);
    // 1 * 12800 / 10000 = 1.28 -> 1
    expect(campaignPayout(1n, 12800n)).toBe(1n);
  });
  it('net on met is positive for every tier (mult > 1.00x)', () => {
    const stake = 3_333_333n; // odd
    for (const tier of ALL_TIERS) {
      const payout = campaignPayout(stake, TIERS[tier].multBps);
      expect(payout > stake).toBe(true);
    }
  });
});

// ── display helpers ────────────────────────────────────────────────────────────────────────
describe('display helpers', () => {
  it('formatWinChance is one decimal from the exact rational', () => {
    expect(formatWinChance('takeRound')).toBe('75.0');
    expect(formatWinChance('winMatch')).toBe('50.0');
    expect(formatWinChance('flawlessRound')).toBe('28.1');
    expect(formatWinChance('win20')).toBe('25.0');
    expect(formatWinChance('winWithFlawless')).toBe('21.9');
    expect(formatWinChance('bossRequiem')).toBe('10.9');
  });
  it('formatMult is two decimals from multBps', () => {
    expect(formatMult(12800n)).toBe('1.28');
    expect(formatMult(19200n)).toBe('1.92');
    expect(formatMult(34100n)).toBe('3.41');
    expect(formatMult(38400n)).toBe('3.84');
    expect(formatMult(43800n)).toBe('4.38');
    expect(formatMult(87700n)).toBe('8.77');
  });
});

// ── map registry ───────────────────────────────────────────────────────────────────────────
describe('conquest map registry (spec §2)', () => {
  it('has exactly 10 nodes with sequential ids', () => {
    expect(CAMPAIGN_NODE_COUNT).toBe(10);
    expect(CAMPAIGN_NODES.map((n) => n.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('every enemy is VOLTA and every arena is cathedral this phase', () => {
    for (const n of CAMPAIGN_NODES) {
      expect(n.fighterId).toBe('volta');
      expect(n.arenaId).toBe('cathedral');
    }
  });
  it('tiers ascend to the boss exactly per spec', () => {
    expect(CAMPAIGN_NODES.map((n) => n.tier)).toEqual([
      'takeRound',
      'takeRound',
      'winMatch',
      'winMatch',
      'winMatch',
      'flawlessRound',
      'win20',
      'win20',
      'winWithFlawless',
      'bossRequiem',
    ]);
  });
  it('getCampaignNode resolves by id and is safe on bad ids', () => {
    expect(getCampaignNode(1)?.name).toBe('KUROHAMA DOCKS');
    expect(getCampaignNode(10)?.name).toBe('ZERO CITADEL');
    expect(getCampaignNode(10)?.tier).toBe('bossRequiem');
    expect(getCampaignNode(11)).toBeUndefined();
    expect(getCampaignNode(0)).toBeUndefined();
    expect(getCampaignNode(null)).toBeUndefined();
  });
});
