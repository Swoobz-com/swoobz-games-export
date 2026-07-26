# BRIEF — DOES THE ANIMATION MATCH THE CHARACTER? (visual sweep, read-only)

Tim (2026-07-26): "do a check on everyone if all animation match the character" — after a Hollow Pale
finisher rendered as a **detached flaming projectile** ("one shoots a rocket") and a throw re-roll
rendered a **phantom brown ball** in his fist. This roster is MELEE: nothing launches, throws, fires or
drops a separate object. Your job is to find every clip where the ANIMATION does not match the CHARACTER.

Repo root: C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter

## YOU ARE READ-ONLY
Do NOT edit, re-key, re-encode, or commit anything. Do NOT start a dev server. You inspect and REPORT.
The orchestrator decides re-rolls. Report defects even if you are unsure — flag with a confidence.

## THE CONTRACT
`qa-boss/arsenal.json` declares, per character: what they WIELD, their body, their effect palette, and
what is BANNED for them. Read your characters' entries FIRST — that is the ground truth you judge against.

## WHAT TO INSPECT
Your assigned characters' SHIPPED clips: `public/assets/characters/<id>/*.webm`
(These are the ones actually playing in-game.) Also read `qa-boss/<id>-clipdata.json` for prior verdicts,
but do NOT trust them — several recorded "PASS" on clips that later proved defective. TRUST YOUR EYES.

## METHOD (you MUST actually look at pixels — prose reasoning is not evidence)
For each clip:
1. Extract a frame strip over the WHOLE clip, e.g.
   `ffmpeg -y -i <clip.webm> -vf "select='eq(n\,8)+eq(n\,24)+eq(n\,40)+eq(n\,56)+eq(n\,72)+eq(n\,88)',setpts=N,tile=6x1,scale=1440:-1" -frames:v 1 <out.png>`
   Write outputs under `qa-boss/anim-match/<id>-<state>.png`.
2. **Read (VIEW) that PNG.** An unviewed strip is not evidence.
3. If anything looks off, extract the individual suspect frames full-size and VIEW them
   (`-vf "select='eq(n\,NN)',setpts=N" -frames:v 1`). The rocket was only obvious full-size.

## THE DEFECT CHECKLIST (per clip, answer each)
- **Phantom object**: is there ANY object in frame that is not part of the character? (ball, orb, head,
  debris, weapon that isn't his, floating shape). This is defect #1 — look hard.
- **Projectile / detached effect**: does any effect leave his body/weapon and hang or travel in open
  space? Effects must stay ON him or ON the weapon in his hand.
- **Wrong arsenal**: is he using a weapon he does not have (per arsenal.json)? A fan-user doing a
  sword-draw, a spear-user swinging a club, etc.
- **Weapon dropped / swapped / morphed**: does the weapon change shape, vanish, or get dropped?
  (EXCEPTION: `ko` clips may legitimately drop a weapon — but hollow-pale's blade IS his arm, so his
  must never detach.)
- **Facing**: does he face the direction his manifest declares? (`src/characters/<id>.ts` `faces:`.)
  eclipse-ofuda is intentionally `faces:'left'` — everyone else `'right'`.
- **Body integrity**: extra/missing limbs, the character turning to face camera when locked to profile,
  a 180 spin, or the body morphing mid-clip.
- **Edge overrun**: does the weapon/effect get sliced flat at a frame edge in a way that READS at normal
  speed (a held pose sliced is far worse than a 1-frame tip kiss)?
- **Action legibility**: does the clip clearly read as its state? A `throw` that looks like a vague
  hand-raise, a `block` that looks like nothing happening, etc.

## OUTPUT (structured, per character)
For EACH clip: `state | VERDICT (PASS / FLAG / FAIL) | what you saw | frame numbers | confidence`
- **FAIL** = a defect a player would notice (phantom object, projectile, wrong weapon, sliced held pose).
- **FLAG** = questionable / worth the orchestrator's eyes.
- Then a per-character summary: "does this character's animation set match who he is?" and a RANKED list
  of which clips most need a re-roll.
Quote the exact strip/frame paths you viewed so the orchestrator can re-check your claims.
