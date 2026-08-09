import { describe, expect, it } from 'vitest';
import { parseCampaignProgress, frontierOf, markBeaten } from './fightProvider';
import { CAMPAIGN_NODE_COUNT } from '../engine/fightCampaign';

// ── THIS FILE USED TO GUARD THE STAKE LOCK. The lock is gone (Tim, 2026-08-09) and the file now
// guards the OPPOSITE property: that a stake change can never destroy a run.
//
// The lock wiped every conquered node when the player committed above the stake their run was
// "locked" to. It was written for a 39.959x finale. Under the 4.00x cap it protected nothing — every
// node returns under 100%, pinned by fightCampaign.test.ts's "EVERY node is -EV at EVERY stake" —
// while its `!hasProgress` branch silently re-based the lock to whatever stake you committed at while
// the run was empty. Since the stake is not persisted (every reload re-arms at DEFAULT_STAKE $5),
// that re-based a $10 player's run to $5 without a word, and returning to $10 then destroyed it.
// Reproduced end to end before removal; see scripts/repro-stakelock2.mjs.
//
// The tests below are deliberately written as the ANTI-regression: if anyone reintroduces a
// stake-conditional wipe, the parser tests here go red because progress will stop surviving.

const FRESH = new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);

describe('campaign progress no longer depends on any stake (the lock is removed)', () => {
  it('a v2 payload with NO lockStake keeps its progress', () => {
    // THE LOAD-BEARING CASE. The parser used to drop any progress that carried no readable stamp
    // ("untrusted"). The moment the stamp stopped being written, that rule would have wiped every
    // existing player's run on their next load. This asserts it does not.
    const raw = JSON.stringify({ v: 2, beaten: [true, true, true, false, false, false, false, false, false, false] });
    expect(parseCampaignProgress(raw).beaten).toEqual(
      [true, true, true, false, false, false, false, false, false, false],
    );
  });

  it('an OLD payload that still carries a lockStake parses fine, and the stake is simply ignored', () => {
    // Existing saves in the wild have `lockStake`. The schema version deliberately stayed at 2, so
    // the extra key must be tolerated rather than treated as corrupt — nobody's run is disturbed by
    // the removal.
    const withStamp = JSON.stringify({ v: 2, beaten: new Array(10).fill(true), lockStake: '1000000' });
    const parsed = parseCampaignProgress(withStamp);
    expect(parsed.beaten.every(Boolean)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'lockStakeLamports')).toBe(false);
  });

  it('a huge lockStake in an old payload cannot lock anyone out', () => {
    // The exact shape that used to bite: a run stamped at a stake far above anything the player can
    // now pick. It must still simply load.
    const raw = JSON.stringify({ v: 2, beaten: new Array(10).fill(true), lockStake: '999999999999999999999' });
    expect(parseCampaignProgress(raw).beaten.every(Boolean)).toBe(true);
  });

  it('a v1 payload is still rejected as fresh (unchanged contract)', () => {
    expect(parseCampaignProgress(JSON.stringify({ v: 1, beaten: new Array(10).fill(true) })).beaten).toEqual(FRESH);
  });

  it('corrupt input is still fresh, never a throw', () => {
    for (const raw of ['not json {[', '', 'null', '[]', '{"v":2}', '{"v":2,"beaten":"nope"}']) {
      expect(() => parseCampaignProgress(raw)).not.toThrow();
      expect(parseCampaignProgress(raw).beaten).toEqual(FRESH);
    }
    expect(parseCampaignProgress(null).beaten).toEqual(FRESH);
  });

  it('progress round-trips through the shipped save shape at any stake', () => {
    // The save writes { v:2, beaten } and nothing else. Whatever the player was staking when they
    // earned it is now irrelevant to whether it survives — which is the whole point.
    let beaten = FRESH.slice();
    for (const id of [1, 2, 3]) beaten = markBeaten(beaten, id);
    const round = parseCampaignProgress(JSON.stringify({ v: 2, beaten }));
    expect(round.beaten).toEqual(beaten);
    expect(frontierOf(round.beaten)).toBe(3);
  });

  it('no exported stake-lock machinery survives', async () => {
    // A named tripwire: if someone re-adds applyCampaignStakeLock/campaignCommitAction, this fails
    // and sends them to the obituary in fightProvider.ts explaining what it cost.
    const mod = (await import('./fightProvider')) as Record<string, unknown>;
    expect(mod.applyCampaignStakeLock).toBeUndefined();
    expect(mod.campaignCommitAction).toBeUndefined();
  });
});
