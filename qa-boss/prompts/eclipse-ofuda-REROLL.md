# ECLIPSE OFUDA (node 6) — SPECIAL FINISHER RE-ROLL (special_1 / special_2 / special_3 ONLY)
# Author: promptotty, 2026-07-27. Replaces the three v1 specials that FAILED the full-frame sweep
# (detached blade fragment f74, ~60px air-gap talismans, lime chroma bleed on semi-transparent light).
# Everything above the first "## special_" heading is meta and is invisible to check-prompt-coherence.mjs.

# ---------------------------------------------------------------------------
# ARSENAL AS READ OFF THE PLATE (qa-boss/anchors/eclipse-ofuda-anchor-green.png)
# ---------------------------------------------------------------------------
# Silver-haired female ronin in strict side profile (plate faces screen-LEFT; the -r anchor tile
# medias[0] 5972e73a renders RIGHT-facing and the whole v2 energy wave is right-facing — these three
# prompts are written for the RIGHT-facing anchor, so NO hflip at keying, unlike the retired
# left-facing v1 specials which were hflipped).
# - Long silver-grey PONYTAIL falling from under a wide black woven conical KASA hat.
# - The hat brim carries BLACK TASSELS and WHITE PAPER OFUDA TALISMANS (inked kanji strips) hanging
#   on short cords — the talismans are physically TETHERED to the brim on the plate. This is her
#   signature motif and the honest fix for the air-gap defect: they flare ON their cords, never free.
# - Glowing red eyes, pale skin.
# - Black leather armored coat with heavy GOLD filigree trim over an olive undershirt, black obi
#   sash, black fingerless gloves, black-and-gold armored boots.
# - ONE weapon: a LONG BLACK-AND-GOLD KATANA, PLANTED POINT-DOWN on the ground in front of her feet,
#   BOTH hands stacked on the pommel. That planted-blade lean IS the anchor stance every clip must
#   begin and end on. No second weapon, no fan, no dagger.
# - Geometry warnings read off the plate: the katana is nearly leg-length — any raised or level hold
#   spans the frame (arsenal ban: no vertical blade hold; throw_b v2 sliced both side edges when
#   level). All three finishers below keep the blade point-down, low, or below shoulder height.
#   The silver ponytail hangs close to the green field — keying watches for spill on hair edges, so
#   no green-tinted effect light anywhere near her.

# ---------------------------------------------------------------------------
# WHY THE v1 SPECIALS FAILED, ONE LINE EACH (the wording that did it):
# - special_1 v1 "flings a tight fan of ... talismans forward that ... burn away in the air ..."
#   -> released paper = detached objects with a measured ~60px air gap. Fix: talismans stay tethered
#   to the hat brim on their cords, plus one talisman PINCHED and pressed flat onto the blade.
# - special_2 v1 "ring of light along the blade PATH" -> the effect was anchored to the path, not
#   the blade, and shed a detached blade FRAGMENT at f74. Fix: the arc's trailing edge stays fused
#   to the cutting edge, terminating ON the blade in every frame, blade one solid piece.
# - special_3 v1 "GLOWING paper talismans ... talisman-light fading" -> bloom-glow semi-transparency
#   half-keyed and drank lime chroma. Fix: all effect light specified SOLID and OPAQUE, pale-gold /
#   white, no glow, no bloom, no transparency.
#
# THE RE-ROLL RULE applied: the fix is NOT "less effect" — the arc must TERMINATE ON THE BLADE in
# every frame and the blade stays in hand. Each prompt says exactly that, in those words.

# ---------------------------------------------------------------------------
# PER-FINISHER DEFECT-PREVENTION NOTE (required one-liners):
# special_1 (OFUDA RITE)      — prevents the ~60px AIR-GAP talisman read: every talisman is either
#                               pinched in her fingers or tethered to the hat brim by its cord;
#                               nothing is released, and the pinched strip is consumed pressed
#                               flat against the steel.
# special_2 (ECLIPSE CRESCENT)— prevents the f74 DETACHED BLADE FRAGMENT: the light arc's trailing
#                               edge stays fused to the blade edge in every frame, the blade stays
#                               one solid piece in her hands, and nothing separates from the steel.
# special_3 (JUDGEMENT PLUNGE)— prevents the LIME CHROMA BLEED: the flare is solid, opaque,
#                               hard-edged pale-gold running along the blade only — no glow, no
#                               bloom, no transparency, no green tint — and the point-down plunge
#                               also dodges her vertical-hold top-edge ban.
#
# DISTINCTNESS: 1 = stationary two-hand RITUAL on the planted blade (no swing at all);
# 2 = explosive ONE-cut waist-height CRESCENT; 3 = two-hand reversed-grip DOWNWARD PLUNGE into the
# ground. Three different silhouettes, three different tempos.

# ---------------------------------------------------------------------------
# SELF-SCORE AGAINST THE 12 DEFECT CLASSES (promptotty contract)
# 1  Both weapons + grip read from plate ............ PASS (one katana, planted point-down, both
#    hands on pommel, named with grip in every prompt; talisman tethering read off the brim)
# 2  Signature motif as finisher vocabulary ......... PASS (ofuda strips carry all three finishers;
#    no invented generic magic)
# 3  Identity lock verbatim in every clip ........... PASS (full shared prefix repeated verbatim)
# 4  Weapons never dropped/swapped/duplicated ....... PASS (stated in every prompt; sp3 grip change
#    is scripted hand-over-hand, blade never leaves her hands)
# 5  Effect attached to body/weapon every frame ..... PASS (all light "along the blade"/on the steel;
#    talismans pinched or on their cords; nothing parked in space)
# 6  Negative block names the shapes ................ PASS (projectile/fireball/beam/laser/orb/
#    energy-ball named, all inside tight negation windows the checker recognises)
# 7  Solo-throw grab trap ........................... N/A-PASS (no throw in scope; re-read all three
#    anyway: nothing is grabbed, seized, gripped, hooked or held except her own katana and her own
#    hat's talisman)
# 8  Effect colours away from key green ............. PASS (pale-gold + white only, "no green light"
#    stated; her palette per arsenal.json)
# 9  Nothing semi-transparent / bloom ............... PASS (every effect "solid, opaque, hard-edged";
#    negative bans smoke/haze/fog/dust/transparency/bloom)
# 10 Anchor-lock start=end + 0.3s hold, all undone .. PASS (each ends re-planted, hands on pommel,
#    talisman consumed / light extinguished, explicit final freeze)
# 11 Containment + zero drift, plate geometry read .. PASS (blade point-down/waist-max; wind-up low
#    beside her hip below the hat brim; feet-planted or single scripted step returned; suffix
#    blade-containment lock carried)
# 12 Facing lock restated every clip ................ PASS (verbatim suffix: faces screen-right,
#    never rotates, back never to camera; plus the eclipse ONE-ACTION lock against her known
#    spin-kata failure class)
# Known blind spot (item 7) double-checked: no grab wording anywhere; sp1's only "pinch" targets
# her OWN talisman on her OWN hat — a real object in frame, not an unseen enemy.

# ---------------------------------------------------------------------------
# THE THREE PROMPTS — paste each block whole. Seedance 2.0, i2v on anchor media 5972e73a
# (right-facing green tile), 4 seconds, 1:1, 720p, 24fps, fixed camera, one continuous shot.
# ---------------------------------------------------------------------------

## special_1  (OFUDA RITE — stationary talisman ritual on the planted blade)
The EXACT SAME silver-haired female ronin assassin from the reference image (identical long silver-grey
ponytail, pale skin, glowing red eyes, a wide woven straw conical hat with black tassels and hanging
white paper ofuda talismans, a black leather armored coat with gold filigree trim over an olive
undershirt, a black obi sash, black fingerless gloves, black-and-gold armored boots, wielding a long
black-and-gold katana), standing on a solid saturated GREEN chroma screen (bright green #00b140,
nothing pink or magenta anywhere).
SPECIAL FINISHER (ofuda rite): she begins in the EXACT reference pose, both hands on the pommel of the
planted katana. 0.0-0.8s: keeping one hand on the pommel, her free hand rises and PINCHES one white
paper ofuda talisman hanging from her own hat brim between two fingers, its cord staying attached to
the brim. 0.8-1.4s: she presses that pinched paper strip FLAT against the flat of the planted blade
just below the guard, the strip held firmly between her fingers and the steel the whole time.
1.4-2.6s: solid, opaque, hard-edged pale-gold kanji marks ignite along the blade, running from the
guard down the steel to the buried point, the light staying ON the metal in every single frame like
hot gilding fused to the blade, while the other paper talismans on her hat brim flare outward on
their short cords, every one of them staying attached to the brim, and her silver ponytail lifts with
the surge. 2.6-3.4s: the kanji light dies back into plain steel and the pinched paper strip is
consumed to nothing against the blade, still held between her fingers to its last scrap, nothing
released, nothing dropped. 3.4-4.0s: her free hand returns to the pommel and she settles into the
EXACT reference stance, holding perfectly still for the final beat. Her feet stay planted on the same
two spots the ENTIRE clip. The katana stays planted point-down the ENTIRE clip, never lifted, never
raised. The pale-gold light is fully solid and opaque with crisp hard edges, no green light, and it
never leaves the surface of the blade. NEGATIVE: no projectile, no fireball, no beam, no laser, no
orb, no energy ball, no ring of light leaving the blade, nothing detaches from her or the katana,
nothing launches, nothing floats free of her body or the blade, no loose paper drifting anywhere, no
opponent, no second figure, no smoke, no haze, no fog, no dust, no transparency, no glow bloom, no
lens flare. It is ONE single action and nothing else: she does NOT spin, does NOT turn, does NOT
repeat the move, her back NEVER faces the camera, and she keeps facing the SAME direction the entire
clip. The talisman-light / steel energy of the finisher stays FULLY INSIDE the frame and NEVER
extends past the edges. Her hair, hat, ofuda talismans, armor and katana stay EXACTLY the same the
entire clip; the katana is never dropped, never swapped between hands, never duplicated, and no new
weapon or object appears. Her katana blade stays FULLY INSIDE the frame at ALL times and NEVER
extends past any edge of the frame. She stays FACING SCREEN-RIGHT the entire clip and NEVER rotates
or turns to face the camera. The camera is absolutely locked, no zoom, no pan, her full body always
fully in frame, she is the ONLY figure in frame at all times, nothing else added. She begins and ends
on the EXACT same reference stance. 24fps.

## special_2  (ECLIPSE CRESCENT — one explosive waist-height draw-cut, light fused to the edge)
The EXACT SAME silver-haired female ronin assassin from the reference image (identical long silver-grey
ponytail, pale skin, glowing red eyes, a wide woven straw conical hat with black tassels and hanging
white paper ofuda talismans, a black leather armored coat with gold filigree trim over an olive
undershirt, a black obi sash, black fingerless gloves, black-and-gold armored boots, wielding a long
black-and-gold katana), standing on a solid saturated GREEN chroma screen (bright green #00b140,
nothing pink or magenta anywhere).
SPECIAL FINISHER (eclipse crescent): she begins in the EXACT reference pose, both hands on the pommel
of the planted katana. 0.0-1.0s: she rips the katana up from the ground and COILS into a deep draw
crouch, the blade drawn back LOW against her hip, angled down, staying BELOW the brim of her hat at
ALL times, never raised overhead at any point of the clip. 1.0-1.5s: she EXPLODES through exactly ONE
single fierce crescent cut at WAIST height along the direction she faces, hips and shoulders driving
the blade through with real follow-through, her silver ponytail whipping and the ofuda talismans
flaring on their cords on her hat brim, every talisman staying attached to the brim; a solid, opaque,
hard-edged crescent of pale-gold light runs along the blade during the cut, its trailing edge FUSED
to the cutting edge of the katana in every single frame, beginning on the steel and ending on the
steel, shrinking back into the blade as the swing finishes so that the arc TERMINATES ON THE BLADE in
every frame and never exists apart from it; the blade stays ONE solid piece held firmly in her hands
from first frame to last, never splitting, never leaving a piece behind. The blade never rises above
her shoulders. 1.5-2.6s: the follow-through eases out and the last of the pale-gold light sinks back
into the steel until the blade is plain. 2.6-4.0s: she steps back, PLANTS the katana point-down on
the ground, rests both hands on the pommel and settles into the EXACT reference stance, holding
perfectly still for the final beat. The pale-gold light is fully solid and opaque with crisp hard
edges, no green light, and it never leaves the surface of the blade. NEGATIVE: no projectile, no
fireball, no beam, no laser, no orb, no energy ball, no ring of light leaving the blade, no crescent
hanging in space apart from the blade, nothing detaches from her or the katana, nothing launches,
nothing floats free of her body or the blade, no fragment of blade or light left behind the swing, no
opponent, no second figure, no smoke, no haze, no fog, no dust, no transparency, no glow bloom, no
lens flare. It is ONE single action and nothing else: she does NOT spin, does NOT turn, does NOT
swing a second time, does NOT repeat the move, her back NEVER faces the camera, and she keeps facing
the SAME direction the entire clip. The talisman-light / steel energy of the finisher stays FULLY
INSIDE the frame and NEVER extends past the edges. Her hair, hat, ofuda talismans, armor and katana
stay EXACTLY the same the entire clip; the katana is never dropped, never swapped between hands,
never duplicated, and no new weapon or object appears. Her katana blade stays FULLY INSIDE the frame
at ALL times and NEVER extends past any edge of the frame, even at the peak of the swing. She stays
FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the camera. The camera is
absolutely locked, no zoom, no pan, her full body always fully in frame, she is the ONLY figure in
frame at all times, nothing else added. She begins and ends on the EXACT same reference stance. 24fps.

## special_3  (JUDGEMENT PLUNGE — two-hand reversed-grip downward stab into the ground)
The EXACT SAME silver-haired female ronin assassin from the reference image (identical long silver-grey
ponytail, pale skin, glowing red eyes, a wide woven straw conical hat with black tassels and hanging
white paper ofuda talismans, a black leather armored coat with gold filigree trim over an olive
undershirt, a black obi sash, black fingerless gloves, black-and-gold armored boots, wielding a long
black-and-gold katana), standing on a solid saturated GREEN chroma screen (bright green #00b140,
nothing pink or magenta anywhere).
SPECIAL FINISHER (judgement plunge): she begins in the EXACT reference pose, both hands on the pommel
of the planted katana. 0.0-1.2s: with slow ceremonial menace she lifts the katana off the ground and,
hand over hand with the blade never leaving her grip for an instant, turns it into a two-handed
reversed grip at chest height with the blade pointing STRAIGHT DOWN, the point aimed at the ground,
the whole blade staying below her shoulders and the point staying well above the bottom edge of the
frame. 1.2-1.6s: she DRIVES the katana straight down into the ground in one thunderous two-handed
stab, her whole body weight dropping through it, knees bending deep, silver ponytail snapping
downward with the force, the ofuda talismans on her hat brim whipping hard on their cords, every one
of them staying attached to the brim. 1.6-2.6s: solid, opaque, hard-edged white-and-pale-gold light
flares along the blade, running from the buried point up the steel to the guard and stopping dead at
the guard, the light staying ON the metal in every single frame like heated steel, never spreading
across the ground and never leaving the blade. 2.6-3.4s: the light dies back into plain steel as she
straightens up, draws the katana out of the ground and PLANTS it point-down back in the exact reference position.
3.4-4.0s: she rests both hands on the pommel and settles into the EXACT reference stance, holding
perfectly still for the final beat. Her feet stay planted through the stab, only her knees and torso
drop; she takes no steps. The pale-gold light is fully solid and opaque with crisp hard edges, no
green light, and it never leaves the surface of the blade. NEGATIVE: no projectile, no fireball, no
beam, no laser, no orb, no energy ball, no shockwave across the ground, no crack in the ground,
nothing detaches from her or the katana, nothing launches, nothing floats free of her body or the
blade, no opponent, no second figure, no smoke, no haze, no fog, no dust, no transparency, no glow
bloom, no lens flare. It is ONE single action and nothing else: she does NOT spin, does NOT turn,
does NOT repeat the move, her back NEVER faces the camera, and she keeps facing the SAME direction
the entire clip. The talisman-light / steel energy of the finisher stays FULLY INSIDE the frame and
NEVER extends past the edges. Her hair, hat, ofuda talismans, armor and katana stay EXACTLY the same
the entire clip; the katana is never dropped, never swapped between hands beyond the scripted
hand-over-hand grip turn in which it never leaves her hands, never duplicated, and no new weapon or
object appears. Her katana blade stays FULLY INSIDE the frame at ALL times and NEVER extends past any
edge of the frame; it points DOWN for the whole action and is never raised above her shoulders. She
stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the camera. The camera
is absolutely locked, no zoom, no pan, her full body always fully in frame, she is the ONLY figure in
frame at all times, nothing else added. She begins and ends on the EXACT same reference stance. 24fps.
