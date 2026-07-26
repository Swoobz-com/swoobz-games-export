# MODEL BAKE-OFF — IR-48 HEX PAPER LORD clip-kit prompt (Opus 5 vs Fable 5)

Purpose: give BOTH models the identical picture + identical task, then score which one writes the
better generation prompts. Prompt quality is the real bottleneck on clip quality — this session
proved it (a badly-worded finisher produced a literal rocket; a badly-worded throw produced a
phantom ball in the character's fist).

**Picture to attach (pick ONE and use the SAME one for both models):**
- `input/characters/playable characters/npc boss/finalboss/IR-48 Hex Paper Lord.png` (original art), or
- `qa-boss/anchors/ir48-hex-paper-lord-anchor-green.png` (the green-screen anchor plate we'd actually generate from)

**Fairness rules:** same picture, same task text, fresh chat each, no follow-up coaching, no hints
from this file. Do NOT paste the "answer key" section to the models.

---

## PART A — THE TASK (paste this verbatim to BOTH models, with the picture attached)

```
Attached is the character art for the final boss of a 1-vs-1 fighting game. I need you to write the
image-to-video generation prompts that will turn this static character into his animated fighting kit.

FIRST: study the picture carefully and tell me exactly what you see — his silhouette, what he is
wearing, and critically EVERY weapon or prop he is holding or carrying, and which hand each is in.
Everything you write afterwards must be true to that description.

THEN write the generation prompts for these 13 clips:
  idle, strike_a, strike_b, throw_a, throw_b, block_a, block_b, hit, ko, victory,
  special_1, special_2, special_3   (the specials are his signature finishers)

TECHNICAL FACTS about the pipeline — these are fixed, design within them:
- Model: Seedance 2.0, image-to-video, 4 seconds, 1:1 square, 720p, 24fps.
- He is generated standing on a solid saturated GREEN chroma screen (#00b140). After generation we
  chroma-key the green away so he can be composited over a game background.
- The camera is fixed. There is no cut, no zoom, no pan. One continuous shot per clip.
- Each clip is triggered by the game engine when that action happens, and clips play back to back
  in any order. He is ALONE in frame — there is no opponent model to interact with.
- The clips are played at full size on screen, so anything at the edge of the frame is visible.

Write the actual prompt text you would submit for each of the 13 clips, ready to paste. Then briefly
explain the reasoning behind the choices you made that you think matter most for getting clean,
usable, on-model results.
```

---

## PART B — SCORING KEY (for Tim only — do NOT show the models)

Each item is a real defect class this project has actually shipped. Score 1 point per item the model
handles WITHOUT being told. Max 12.

**Identity / arsenal (does the prompt match THIS character?)**
1. Correctly reads BOTH of his weapons from the picture — the large crimson hex-bordered WAR-FAN and
   the short black-bladed SWORD held REVERSED — and names them in the prompts. (Most failures here
   read only the fan, then write sword actions he can't do, or vice versa.)
2. Notices the WHITE PAPER TALISMANS hanging from his kasa hat brim and uses them as his signature
   motif rather than inventing generic magic.
3. Locks the identity every clip ("the EXACT SAME character, armor/weapons unchanged") — otherwise
   the model drifts him into a different samurai by clip 6.
4. States he NEVER drops or swaps his weapons. (Our roster's #1 defect is weapons vanishing,
   morphing, or floating free mid-clip.)

**The projectile trap (the big one)**
5. Keeps every finisher effect ATTACHED to his body or to the weapon in his hand. Any wording that
   parks an effect "in the air in front of him" / "at his feet" / "beside him" renders as a DETACHED
   FLOATING OBJECT that reads as a launched rocket. A model that spontaneously writes "the light
   traces along the blade" or "the charms swirl around his own body" gets this point.
6. Explicitly bans projectile/beam/ring/orb wording in the negative section.
7. Handles the SOLO THROW correctly. There is no opponent — a prompt that says "grabs/seizes an
   unseen enemy" makes the model PAINT that enemy as a visible object (we got a brown ball in a
   fist). The good answer is a self-contained gesture through empty air with nothing seized.

**Chroma / keying awareness**
8. Realises effect colours must stay AWAY from green, because green gets keyed out. (Crimson/gold/
   white are correct for him. A green energy effect would be half-erased and leave teal fringe.)
9. Avoids specifying anything semi-transparent/glowing that would half-key (smoke, haze, glass).

**Loop + framing discipline**
10. Anchor-locks: the clip must BEGIN and END on the exact reference stance, or clips visibly jump
    when the engine chains them. (`ko` is the one clip allowed to end off-anchor, on the ground.)
11. Containment: keeps the whole action, weapons included, well inside the frame with a margin. His
    war-fan is wide and his blade is long — the #2 defect class is a weapon sliced flat at the edge.
12. Facing lock: he must stay in side profile facing one direction and never rotate to face the
    camera or turn his back. (We have clips where a boss turns his back for 1.3 seconds mid-throw.)

**Tie-breakers if both score similarly**
- Is the `idle` PROP-CENTRIC (he does something with the fan/sword) rather than body-language posing
  ("shifts his weight menacingly")? Body-language idles reliably produce a hidden 180° turn.
- Are the three specials genuinely DISTINCT actions, or three re-words of the same swing?
- Does `ko` correctly end collapsed and HOLD there, without a phantom cause?
- Are the prompts specific and physical (a real described motion), or vague adjectives ("epic",
  "powerful", "dynamic")? Vague adjectives are what produce generic, boring clips.
- Did it flag anything about the picture itself — e.g. a detail that will be hard to key or animate?

## PART C — the real test (optional round 2)
Take the winning model's `special_1` and `throw_a` prompts, fire them on Higgsfield Unlimited, key
the results, and look at the frames. Prompt quality only counts if the pixels come out clean.
Round-2 scoring is simply: how many of the 12 items above show up as actual defects in the video.
