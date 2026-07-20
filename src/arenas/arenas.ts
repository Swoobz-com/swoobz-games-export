// Arena registry — the selectable fight backgrounds. Mirrors the character registry pattern
// (data, not code): a new arena is a new ARENAS entry + its art file, zero edits elsewhere.
// The chosen arena lives in the EXPERIENCE (like playerId), persisted to localStorage — the
// provider stays identity-agnostic and never learns which arena is picked. `file` is relative
// to import.meta.env.BASE_URL, resolved in the Experience (same convention as FighterClip.url).

export interface ArenaDef {
  id: string;
  name: string;
  file: string;
}

// ONE real arena today: the baked frost-cathedral background the stage has always used. The
// mystery slots on the select screen are drawn by the UI (locked '?' tiles), not listed here.
export const ARENAS: ArenaDef[] = [
  { id: 'cathedral', name: 'FROZEN CATHEDRAL', file: 'assets/background.png' },
];

/** Resolve an arena by id, falling back to the first entry (never throws — an unknown/absent
 *  stored id must degrade to the default arena, not break the stage). */
export function getArena(id: string): ArenaDef {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0];
}
