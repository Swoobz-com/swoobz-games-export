import { describe, expect, it } from 'vitest';
import { applyCampaignStakeLock, campaignCommitAction, parseCampaignProgress } from './fightProvider';
import { CAMPAIGN_NODES, CAMPAIGN_NODE_COUNT, campaignPayout } from '../engine/fightCampaign';
import type { CampaignProgress } from './fightProvider';

// THE STAKE LOCK (Tim's rule, 2026-08-07): "if you bet 5 dollar, finish the map higher [than] the bet
// amount you have to start again; everything lower is fine and saves progress."
//
// A campaign run is locked to the stake it was played at. Entering the map at a HIGHER stake wipes
// progress and starts again; the same stake or LOWER keeps it.
const FRESH = new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);
const nine = (): boolean[] => {
  const b = FRESH.slice();
  for (let i = 0; i < 9; i += 1) b[i] = true;
  return b;
};
const progress = (beaten: boolean[], lock: bigint | null): CampaignProgress =>
  ({ beaten, lockStakeLamports: lock });

describe('applyCampaignStakeLock — the rule', () => {
  it('a run with NOTHING beaten adopts the stake and is not a reset', () => {
    const out = applyCampaignStakeLock(progress(FRESH, null), 5_000n);
    expect(out.reset).toBe(false);
    expect(out.progress.lockStakeLamports).toBe(5_000n);
    expect(out.progress.beaten).toEqual(FRESH);
  });

  it('the SAME stake keeps progress', () => {
    const out = applyCampaignStakeLock(progress(nine(), 5_000n), 5_000n);
    expect(out.reset).toBe(false);
    expect(out.progress.beaten).toEqual(nine());
    expect(out.progress.lockStakeLamports).toBe(5_000n);
  });

  it('a LOWER stake keeps progress, and the lock does NOT drop with it', () => {
    // Dropping to a cheaper stake must not punish the player later by re-locking them lower — going
    // back up to their original level would otherwise wipe a run they never raised above.
    const out = applyCampaignStakeLock(progress(nine(), 5_000n), 1n);
    expect(out.reset).toBe(false);
    expect(out.progress.beaten).toEqual(nine());
    expect(out.progress.lockStakeLamports).toBe(5_000n);
    // ...and returning to the original stake is still fine.
    const back = applyCampaignStakeLock(out.progress, 5_000n);
    expect(back.reset).toBe(false);
    expect(back.progress.beaten).toEqual(nine());
  });

  it('a HIGHER stake WIPES progress and re-stamps at the higher stake', () => {
    const out = applyCampaignStakeLock(progress(nine(), 5_000n), 5_001n);
    expect(out.reset).toBe(true);
    expect(out.progress.beaten).toEqual(FRESH);
    expect(out.progress.lockStakeLamports).toBe(5_001n);
  });

  it('one lamport over the lock is already a reset (no tolerance band)', () => {
    expect(applyCampaignStakeLock(progress(nine(), 10n), 11n).reset).toBe(true);
    expect(applyCampaignStakeLock(progress(nine(), 10n), 10n).reset).toBe(false);
  });

  it('is PURE — it never mutates the progress it was given', () => {
    const before = progress(nine(), 5_000n);
    const snapshot = before.beaten.slice();
    applyCampaignStakeLock(before, 999_999n);
    expect(before.beaten).toEqual(snapshot);
    expect(before.lockStakeLamports).toBe(5_000n);
  });
});

describe('applyCampaignStakeLock — the exploit it exists to close', () => {
  it('cheap progress cannot be cashed at a huge stake on the final node', () => {
    const finalNode = CAMPAIGN_NODES[CAMPAIGN_NODE_COUNT - 1];
    const cheap = 100n;
    const huge = 100_000_000n;
    // What the exploit would have paid: nine nodes conquered for ~nothing, then the 39.959x final
    // multiplier collected on a stake a million times larger.
    const exploitPayout = campaignPayout(huge, finalNode.multBps);
    expect(exploitPayout).toBeGreaterThan(campaignPayout(cheap, finalNode.multBps) * 1_000n);

    // With the lock, raising the stake wipes the nine cheap wins, so the final node is unreachable
    // until it is EARNED at the higher stake.
    const run = applyCampaignStakeLock(progress(nine(), cheap), huge);
    expect(run.reset).toBe(true);
    expect(run.progress.beaten.some((b) => b)).toBe(false);
  });
});

// REGRESSION (found by playing the game, 2026-08-07). The lock function was correct and the exploit
// was still WIDE OPEN, because the provider wiped `beaten` and then entered the selected node anyway.
// Proven live: nine nodes conquered at $1, ZERO CITADEL opened, stake raised to $25 -> progress wiped,
// lock re-stamped at $25, and the player dropped straight into the 39.95x final node AT $25.
// The rule is therefore: A RESET CANCELS THE ATTEMPT, it does not merely erase the record.
describe('campaignCommitAction — a reset must cancel the attempt, not just the record', () => {
  const FINAL_NODE = CAMPAIGN_NODE_COUNT;

  it('THE EXPLOIT: cheap progress + a raised stake on the final node NEVER returns "play"', () => {
    const cheapRun = progress(nine(), 100n);
    const action = campaignCommitAction(cheapRun, 100_000_000n, FINAL_NODE);
    expect(action.kind).toBe('resetToMap');
    // The decisive assertion: no nodeId is handed back at all, so no caller can start the match.
    expect(action).not.toHaveProperty('nodeId');
    expect(action.progress.beaten.some((b) => b)).toBe(false);
    expect(action.progress.lockStakeLamports).toBe(100_000_000n);
  });

  it('one lamport over the lock already cancels the attempt', () => {
    expect(campaignCommitAction(progress(nine(), 10n), 11n, FINAL_NODE).kind).toBe('resetToMap');
    expect(campaignCommitAction(progress(nine(), 10n), 10n, FINAL_NODE).kind).toBe('play');
  });

  it('the same or a lower stake plays the node the player actually chose', () => {
    for (const stake of [5_000n, 1n]) {
      const action = campaignCommitAction(progress(nine(), 5_000n), stake, 7);
      expect(action.kind).toBe('play');
      if (action.kind === 'play') expect(action.nodeId).toBe(7);
      expect(action.progress.beaten).toEqual(nine());
      expect(action.progress.lockStakeLamports).toBe(5_000n); // never ratchets down
    }
  });

  it('a fresh run adopts any stake and plays — there is nothing to protect yet', () => {
    const action = campaignCommitAction(progress(FRESH, null), 999_999n, 1);
    expect(action.kind).toBe('play');
    if (action.kind === 'play') expect(action.nodeId).toBe(1);
    expect(action.progress.lockStakeLamports).toBe(999_999n);
  });

  it('no raised stake can reach ANY node — the whole ladder is cancelled, not just the last one', () => {
    for (let nodeId = 1; nodeId <= CAMPAIGN_NODE_COUNT; nodeId += 1) {
      expect(campaignCommitAction(progress(nine(), 1n), 2n, nodeId).kind).toBe('resetToMap');
    }
  });

  it('cannot strand a conquered node behind the new frontier', () => {
    // Winning the node you were wrongly let into wrote beaten=[F,F,F,T,...] — a conquered island
    // sitting behind fogged, locked ones. Unreachable now: the attempt never starts.
    const action = campaignCommitAction(progress(nine(), 100n), 100_000n, 4);
    expect(action.kind).toBe('resetToMap');
    expect(action.progress.beaten).toEqual(FRESH);
  });
});

describe('parseCampaignProgress — the stamp survives storage, and untrusted progress does not', () => {
  it('a v2 payload round-trips beaten AND the lock exactly', () => {
    const raw = JSON.stringify({ v: 2, beaten: nine(), lockStake: '5000' });
    const p = parseCampaignProgress(raw);
    expect(p.beaten).toEqual(nine());
    expect(p.lockStakeLamports).toBe(5_000n);
  });

  it('a lamport-scale stamp keeps FULL precision (a Number would not)', () => {
    // 2^53+1 — the classic float-precision cliff. Stored as a decimal string for exactly this reason.
    const big = 9_007_199_254_740_993n;
    const p = parseCampaignProgress(JSON.stringify({ v: 2, beaten: nine(), lockStake: big.toString() }));
    expect(p.lockStakeLamports).toBe(big);
    expect(Number(big).toString()).not.toBe(big.toString()); // proves the cliff is real
  });

  it('progress with NO readable stamp is DROPPED, not trusted', () => {
    // Missing, non-numeric and negative stamps all mean "cannot verify what this was earned at".
    for (const lockStake of [undefined, 'abc', '-5', '1.5', 12345]) {
      const p = parseCampaignProgress(JSON.stringify({ v: 2, beaten: nine(), lockStake }));
      expect(p.beaten).toEqual(FRESH);
      expect(p.lockStakeLamports).toBeNull();
    }
  });

  it('an UNSTAMPED but EMPTY run is fine (there is nothing to protect)', () => {
    const p = parseCampaignProgress(JSON.stringify({ v: 2, beaten: FRESH }));
    expect(p.beaten).toEqual(FRESH);
    expect(p.lockStakeLamports).toBeNull();
  });

  it('a v1 payload is rejected on purpose (it predates the stamp)', () => {
    const p = parseCampaignProgress(JSON.stringify({ v: 1, beaten: nine() }));
    expect(p.beaten).toEqual(FRESH);
    expect(p.lockStakeLamports).toBeNull();
  });
});
