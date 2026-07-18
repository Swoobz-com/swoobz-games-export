// Unit tests for the COMBO-STRING contact derivation (contract §9). Covers the pure helper only —
// the scale (/CLIP_RATE), the per-contact resolve-window clamp, and the contacts-supersede-contactMs
// precedence. No React / DOM: the helper is exported pure so this stays a fast node-env test.
import { describe, expect, it } from 'vitest';
import { deriveContactTimes } from './FightExperience';

// A generous window so nothing clamps unless a test forces it. CLIP_RATE is 2.0, so beat time is
// half of CLIP time; DEFAULT_CONTACT_MS is 1600 -> 800ms beat time.
const WIDE = 100000;
const HITSTOP = 100;

describe('deriveContactTimes (combo-string §9)', () => {
  it('a single contactMs -> a one-element list scaled by /CLIP_RATE (byte-identical to the old beat)', () => {
    expect(deriveContactTimes({ contactMs: 800 }, WIDE, HITSTOP)).toEqual([400]);
  });

  it('no contacts and no contactMs -> the DEFAULT_CONTACT_MS fallback, scaled', () => {
    expect(deriveContactTimes({}, WIDE, HITSTOP)).toEqual([800]);
  });

  it('a contacts array -> each entry scaled, order preserved (ascending stays ascending)', () => {
    expect(deriveContactTimes({ contacts: [600, 1200, 1800] }, WIDE, HITSTOP)).toEqual([300, 600, 900]);
  });

  it('contacts SUPERSEDES contactMs when both are present', () => {
    expect(deriveContactTimes({ contacts: [400], contactMs: 5000 }, WIDE, HITSTOP)).toEqual([200]);
  });

  it('clamps each contact to leave room for the hitstop + a 40ms tail inside the resolve window', () => {
    // latest = max(0, 500 - 100 - 40) = 360. 1000/2 = 500 -> clamped to 360.
    expect(deriveContactTimes({ contactMs: 1000 }, 500, 100)).toEqual([360]);
  });

  it('a whole string is bounded by the window; the LAST (largest) contact leaves hitstop room', () => {
    const out = deriveContactTimes({ contacts: [600, 1200, 1800] }, 800, 120);
    const latest = Math.max(0, 800 - 120 - 40); // 640
    for (const t of out) expect(t).toBeLessThanOrEqual(latest);
    expect(out[out.length - 1]).toBeLessThanOrEqual(latest);
  });

  it('never returns a negative contact time (degenerate window clamps to 0)', () => {
    expect(deriveContactTimes({ contactMs: 1000 }, 50, 100)).toEqual([0]);
  });
});
