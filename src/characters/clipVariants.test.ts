// Unit tests for the VARIANT LAW accessor (contract §10). Covers the pure normaliser only: a
// missing state -> [], a single clip -> [clip], a list -> the list as-is. No React / DOM, so it
// stays a fast node-env test alongside deriveContactTimes.
import { describe, expect, it } from 'vitest';
import { clipVariants } from './types';
import type { FighterClip, FighterDef } from './types';

const cal = { h: 100, bottom: 0, left: 50 };
const single: FighterClip = { url: 'a.webm', cal };
const takeA: FighterClip = { url: 'a.webm', cal, contactMs: 1000 };
const takeB: FighterClip = { url: 'b.webm', cal, contacts: [800, 1600] };

function defWith(clips: FighterDef['clips']): FighterDef {
  return {
    id: 'x',
    name: 'X',
    still: 'x.png',
    faces: 'right',
    portrait: { headX: 0.5, headY: 0.1, zoom: 4 },
    clips,
    quotes: [],
  };
}

describe('clipVariants (variant law §10)', () => {
  it('a state with no clip -> the empty list (drives the fallback ladder)', () => {
    expect(clipVariants(defWith({}), 'attack_strike')).toEqual([]);
  });

  it('a single clip -> a one-element list (byte-identical: the pick is forced to index 0)', () => {
    expect(clipVariants(defWith({ attack_strike: single }), 'attack_strike')).toEqual([single]);
  });

  it('a list of takes -> the same list, order preserved', () => {
    expect(clipVariants(defWith({ attack_strike: [takeA, takeB] }), 'attack_strike')).toEqual([takeA, takeB]);
  });

  it('reads per-state: an unlisted state is empty while a sibling has takes', () => {
    const def = defWith({ idle: single, attack_strike: [takeA, takeB] });
    expect(clipVariants(def, 'idle')).toEqual([single]);
    expect(clipVariants(def, 'attack_strike')).toEqual([takeA, takeB]);
    expect(clipVariants(def, 'hit')).toEqual([]);
  });

  it('preserves each take own cal + contacts (variants are not a re-timing of one clip)', () => {
    const [a, b] = clipVariants(defWith({ attack_throw: [takeA, takeB] }), 'attack_throw');
    expect(a.contactMs).toBe(1000);
    expect(b.contacts).toEqual([800, 1600]);
  });
});
