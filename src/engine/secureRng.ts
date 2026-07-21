// STANDOFF — cryptographically secure RNG for MONEY-RELEVANT runtime picks.
//
// THE UNPREDICTABILITY LAW (Tim, 2026-07-21): every random pick that money rides on
// (quick-duel CPU, campaign enemy, shot-clock auto-pick, friend-mode ghost) must be
// IMPOSSIBLE to reverse engineer. The previous streams were mulberry32 seeded with
// Date.now() ^ constant — recoverable two independent ways:
//   1. the seed: Date.now() at match start is known to an attacker within a tiny window
//      (their own clock), leaving only thousands of candidate seeds; two or three
//      observed picks disambiguate the exact stream and every FUTURE pick is known.
//   2. the state: mulberry32 has 32 bits of state; ~40 observed picks (log2(3) bits
//      each) pin it uniquely and 2^32 enumeration is minutes of offline work.
// Either attack turns a 50/50 match into a certainty and breaks the 96% pricing at
// every multiplier, campaign boss included.
//
// This module draws from the platform CSPRNG (crypto.getRandomValues) instead: no
// seed exists, outputs are unpredictable forward AND backward, and observing any
// number of picks reveals nothing about the next one. randomMove(rng) in the frozen
// engine accepts any rng function, so the engine stays byte-untouched.
//
// Seeded mulberry32 remains CORRECT for tests, sims and the RTP battery (they need
// bit-reproducibility and are not an attack surface). Never use it behind money at
// runtime. Presentation-only Math.random uses (take variants, victory quotes) are
// fine as documented — no money rides on them (RG-C5).
//
// Floor bias note: floor(rng() * 3) on a 32-bit draw carries a bias of one part in
// ~1.4e9 (2^32 mod 3 = 1) — nine orders of magnitude below the RTP band's noise
// floor and irrelevant to both fairness and security.

/**
 * A float in [0, 1) from the platform CSPRNG. Drop-in for the `rng` parameter of the
 * frozen engine's randomMove(). Throws loudly if the platform has no CSPRNG (never
 * the case in any browser or Node this game runs in) — a silent fallback to a weak
 * source would quietly void the unpredictability law.
 */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000; // 2^32 -> [0, 1)
}
