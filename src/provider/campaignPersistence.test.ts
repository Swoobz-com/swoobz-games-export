import { describe, expect, it } from 'vitest';
import { frontierOf, markBeaten, parseCampaignBeaten } from './fightProvider';
import { CAMPAIGN_NODE_COUNT } from '../engine/fightCampaign';

const FRESH = new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);

describe('parseCampaignBeaten — corrupt-input recovery (spec §5)', () => {
  it('missing storage => fresh (all false, correct length)', () => {
    expect(parseCampaignBeaten(null)).toEqual(FRESH);
    expect(parseCampaignBeaten(null)).toHaveLength(CAMPAIGN_NODE_COUNT);
  });
  it('non-JSON garbage => fresh', () => {
    expect(parseCampaignBeaten('not json {[')).toEqual(FRESH);
    expect(parseCampaignBeaten('42')).toEqual(FRESH);
    expect(parseCampaignBeaten('"a string"')).toEqual(FRESH);
    expect(parseCampaignBeaten('null')).toEqual(FRESH);
  });
  it('wrong version or missing beaten array => fresh', () => {
    expect(parseCampaignBeaten(JSON.stringify({ v: 99, beaten: [true, true] }))).toEqual(FRESH);
    // v1 is REJECTED ON PURPOSE: it carried no stake stamp, so migrating it would grant one
    // free re-stamp at any stake — exactly the exploit the stake lock closes.
    expect(parseCampaignBeaten(JSON.stringify({ v: 1, beaten: [true, true] }))).toEqual(FRESH);
    expect(parseCampaignBeaten(JSON.stringify({ v: 1 }))).toEqual(FRESH);
    expect(parseCampaignBeaten(JSON.stringify({ v: 1, beaten: 'nope' }))).toEqual(FRESH);
  });
  it('valid payload round-trips, clamped to node count', () => {
    const beaten = [true, true, false, false, false, false, false, false, false, false];
    expect(parseCampaignBeaten(JSON.stringify({ v: 2, beaten, lockStake: '1000' }))).toEqual(beaten);
  });
  it('only strict boolean true counts (truthy junk is not conquered)', () => {
    const parsed = parseCampaignBeaten(JSON.stringify({ v: 2, beaten: [1, 'yes', true, {}, null], lockStake: '1000' }));
    expect(parsed).toEqual([false, false, true, false, false, false, false, false, false, false]);
  });
  it('an over-long stored array is truncated to the node count', () => {
    const parsed = parseCampaignBeaten(JSON.stringify({ v: 2, beaten: new Array(20).fill(true), lockStake: '1000' }));
    expect(parsed).toHaveLength(CAMPAIGN_NODE_COUNT);
    expect(parsed.every((b) => b === true)).toBe(true);
  });
  it('a short stored array pads the rest with false', () => {
    const parsed = parseCampaignBeaten(JSON.stringify({ v: 2, beaten: [true], lockStake: '1000' }));
    expect(parsed[0]).toBe(true);
    expect(parsed.slice(1).every((b) => b === false)).toBe(true);
    expect(parsed).toHaveLength(CAMPAIGN_NODE_COUNT);
  });
});

describe('frontierOf — first unbeaten index', () => {
  it('fresh progress => frontier 0 (node 1 is the active target)', () => {
    expect(frontierOf(FRESH)).toBe(0);
  });
  it('a conquered prefix advances the frontier', () => {
    expect(frontierOf([true, false, false, false, false, false, false, false, false, false])).toBe(1);
    expect(frontierOf([true, true, true, false, false, false, false, false, false, false])).toBe(3);
  });
  it('all conquered => frontier === count', () => {
    expect(frontierOf(new Array(CAMPAIGN_NODE_COUNT).fill(true))).toBe(CAMPAIGN_NODE_COUNT);
  });
  it('the FIRST unbeaten wins even with later conquered nodes (replay case)', () => {
    // Node 1 + 3 beaten but 2 not (a replayed conquered node never rewinds the frontier below the gap).
    expect(frontierOf([true, false, true, false, false, false, false, false, false, false])).toBe(1);
  });
});

describe('markBeaten — pure, marks the right node', () => {
  it('marks node n at index n-1 without mutating the input', () => {
    const before = FRESH.slice();
    const after = markBeaten(before, 3);
    expect(after[2]).toBe(true);
    expect(after.filter((b) => b).length).toBe(1);
    expect(before).toEqual(FRESH); // input untouched
  });
  it('ignores out-of-range node ids (no throw, no change)', () => {
    expect(markBeaten(FRESH, 0)).toEqual(FRESH);
    expect(markBeaten(FRESH, 11)).toEqual(FRESH);
    expect(markBeaten(FRESH, -1)).toEqual(FRESH);
  });
  it('marking then frontier advances past the conquered node', () => {
    const beaten = markBeaten(FRESH, 1);
    expect(frontierOf(beaten)).toBe(1);
  });
});
