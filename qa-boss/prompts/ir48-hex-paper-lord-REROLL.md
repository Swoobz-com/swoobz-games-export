# IR48 HEX PAPER LORD — RE-ROLL prompts (browser Unlimited Seedance, GREEN, faces right)
# Same shared prefix/suffix as ir48-hex-paper-lord.md. Only the STATE bodies below are rewritten,
# each with the measured reason its v1 was rejected. Build with:
#   node qa-boss/build-prompt.mjs qa-boss/prompts/ir48-hex-paper-lord-REROLL.md <state>
#
# THE FAN-MORPH DEFECT (found on strike_a v1, 2026-07-27). The shared suffix locks the fan's identity
# once, at the END of the prompt, and for a big windup that is not enough: the model treats the fan
# as a generic prop mid-swing. Measured on strike_a v1 at FULL SIZE (f8-f20 and f48-f60): the deep
# crimson hex-bordered war-fan turned PALE GREY/LAVENDER and feathered, and the gold hex rim degraded
# into a thin yellow-green squiggle — it stopped being his fan. It also travelled well ABOVE his hat
# despite the v1 body already saying "NEVER above his head", because the body ALSO said "COILS back",
# and a coil-back with a big prop reads as "take it behind and over the shoulder".
# THE FIX, applied to every big-fan action below: (1) an in-body colour/material lock repeated at the
# moment of motion, not only in the suffix; (2) the windup is re-specified as a LOW FRONT cock — the
# fan may never pass BEHIND his shoulder or ABOVE his hat brim, which removes the trajectory where
# the morph happened. NOTE his body facing was NEVER wrong on v1 (side-profile right throughout) —
# do not "fix" that.

Character: a towering black-and-deep-crimson armored samurai warlord — a red oni demon face with glowing
red eyes and a fanged grin, a wide black pagoda-style kasa hat with white paper talismans hanging from its
brim, ornate black armor with deep-crimson plates, holding a LARGE deep-crimson war-fan with a black
hexagon-cut border raised in one hand and a short black-bladed sword held reversed at his hip in the
other. Faces: right (anchor faces screen-right, no flip). GREEN chroma. Node 10 = FINAL BOSS.
Anchor: qa-boss/anchors/ir48-hex-paper-lord-anchor-green.png.

Shared prefix:
> The EXACT SAME black-and-crimson armored samurai warlord from the reference image (identical red oni
> demon face with glowing red eyes and a fanged grin, a wide black pagoda-style kasa hat with white paper
> talismans hanging from the brim, ornate black armor with deep-crimson plates, holding a large
> deep-crimson war-fan with a black hexagon-cut border in one hand and a short black-bladed sword held
> reversed in the other), standing on a solid saturated GREEN chroma screen (bright green #00b140,
> nothing green on the character).

Shared suffix (locks live HERE only):
> His oni face, kasa hat, paper talismans, black-and-crimson armor, hex-bordered war-fan and short sword
> stay EXACTLY the same the entire clip; he keeps the war-fan and the sword in his hands the whole time
> and never drops or swaps them. The war-fan, the sword and every effect stay FULLY INSIDE the frame at
> ALL times and NEVER cross any edge, even at the peak of a swing — the whole action stays WELL INSIDE
> the frame with a wide margin on every side. He stays STRICTLY IN SIDE PROFILE FACING SCREEN-RIGHT the
> ENTIRE clip; his torso, shoulders and head NEVER rotate toward the camera, this is a locked side-view,
> he NEVER spins or turns front. The camera is absolutely locked, no zoom, no pan, his full body always
> fully in frame, he is the ONLY figure in frame at all times, nothing else added. He begins and ends on
> the EXACT same reference stance. 24fps.

SPECIAL add-on: The energy of the finisher is CRIMSON and GOLD and WHITE, NEVER green, compact, staying
in the CENTER of the frame with a wide empty green margin on all four edges; it is NOT a beam, NOT a
ring, NOT a jet, and does NOT orbit or shoot outward.

## strike_a (fan cleave — v2, LOW FRONT COCK)
STRIKE (fan cleave): keeping the great war-fan LOW and IN FRONT of his chest the whole time, he cocks it
back only a short way to his own chest — the fan NEVER travels behind his shoulder and its top edge NEVER
rises above the brim of his hat — then he DRIVES it down and forward in one fierce short vertical cleave
in front of his body like an executioner's blade, his hips and shoulders behind the cut with real
follow-through, then he flows back to the starting stance. Throughout the entire swing the war-fan stays
the SAME solid DEEP CRIMSON fan with its black hexagon-cut border and gold hexagon rim — it NEVER turns
pale, white, grey, silver or feathered, never becomes blades or feathers, and never changes its shape,
colour or material for even one frame. Big, heavy, total commitment, everything well inside the frame.

## SUPERSEDED-hit (stagger — v2, TALISMANS ATTACHED + PLANTED)
# REJECTED: fixed the talisman debris and planted the feet, but the model filled the "unseen impact"
# gap with a REAL INCOMING BLADE flying in from the left edge (f16), and the waist recoil overshot
# into a 1.2s limbo backbend. Superseded by the "## hit" v3 section below. Renamed with a prefix
# rather than deleted because build-prompt.mjs matches the FIRST `^## <state>\b` heading, so two
# live sections named `hit` would silently keep firing the older one. A `hit-v2` rename would NOT
# work: `\b` treats the hyphen as a word boundary and it would still match.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan HELD OPEN AND RAISED beside his chest at about head height in one
hand — NOT lowered, NOT down at his hip, NOT at his waist — and the short black-bladed sword held reversed
at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly
visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never
appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final
frame. HIT REACTION: his head and armored torso rock sharply back from the WAIST as an unseen impact
lands, then he immediately reclaims and resolves back to the starting stance. HE BARELY TRAVELS: HIS FEET
STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, rocking from the waist only —
he NEVER slides, steps, stumbles or drifts sideways across the frame and NEVER moves more than HALF A
BODY-WIDTH from where he starts, staying in the SAME place in frame for the whole clip. The white paper
talismans hanging from his hat brim STAY FIRMLY ATTACHED TO THE HAT at all times — they may swing and
flutter on their strings, but they NEVER tear off, NEVER detach, NEVER come loose and NEVER fly away, and
there are NO loose paper scraps, NO torn paper, NO confetti and NO floating debris anywhere in the frame
at any moment. Nothing ever separates from his body, his hat, his armor or his weapons. He stays up —
NOT a slow topple — and ends at the starting stance. No opponent, empty air only.

## SUPERSEDED-hit3 (stagger — v3, NO PROJECTILE + SHORT RECOIL)
# REJECTED: fixed the travel and the backbend completely, but a blade STILL flew in - this time from
# the TOP edge (f9, 220px top run, containment BLOCK). Banning objects BY NAME does not work; the
# causal language ("HIT REACTION", "as an unseen impact lands") is what makes the model supply a
# visible attacker. Superseded by the "## hit" v4 section below, which removes the CAUSE entirely.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan HELD OPEN AND RAISED beside his chest at about head height in one
hand — NOT lowered, NOT down at his hip, NOT at his waist — and the short black-bladed sword held reversed
at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly
visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never
appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final
frame. HIT REACTION: his head and armored torso give ONE SHORT SHARP recoil backward from the waist as an
unseen impact lands, and he immediately reclaims it and resolves back to the starting stance. THE RECOIL
IS SMALL AND QUICK: his head and shoulders snap back only a SHORT distance and come straight back — he
does NOT bend over backwards, does NOT arch into a deep backbend or a limbo, his head NEVER drops below
the height of his own shoulders, and he is upright again almost immediately. HIS FEET STAY PLANTED ON THE
SPOT and he stays CENTERED exactly where he starts — he NEVER slides, steps, stumbles or drifts sideways
and NEVER moves more than HALF A BODY-WIDTH from where he starts. THE IMPACT IS COMPLETELY INVISIBLE:
NOTHING whatsoever enters the frame from outside at any moment — NO blade, NO sword, NO spear, NO arrow,
NO projectile, NO weapon, NO limb, NO object and NO streak of any kind ever flies in, appears at, or
crosses any edge of the frame. There is NO attacker and NO second weapon anywhere in the picture; the
ONLY objects in the entire frame are his own body, his own war-fan and his own short sword. The white
paper talismans hanging from his hat brim STAY FIRMLY ATTACHED TO THE HAT at all times — they may swing
and flutter on their strings, but they NEVER tear off, NEVER detach and NEVER fly away, and there are NO
loose paper scraps, NO torn paper, NO confetti and NO floating debris anywhere in the frame at any
moment. He stays up — NOT a slow topple — and ends at the starting stance. Empty air only.

## hit (stagger — v4, NO CAUSAL LANGUAGE, EMPTY-BACKGROUND LOCK)
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan HELD OPEN AND RAISED beside his chest at about head height in one
hand — NOT lowered, NOT down at his hip, NOT at his waist — and the short black-bladed sword held reversed
at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly
visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never
appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final
frame. RECOIL MOTION: his head and armored torso SNAP backward from the waist in ONE short sharp jolt and
then immediately come straight back to the starting stance, like a man absorbing a shove and instantly
recovering his balance. THE JOLT IS SMALL AND QUICK: his head and shoulders travel back only a SHORT
distance — he does NOT bend over backwards, does NOT arch into a deep backbend or a limbo, his head NEVER
drops below the height of his own shoulders, and he is upright again almost immediately. HIS FEET STAY
PLANTED ON THE SPOT and he stays CENTERED exactly where he starts — he NEVER slides, steps, stumbles or
drifts sideways and NEVER moves more than HALF A BODY-WIDTH from where he starts. THE GREEN BACKGROUND
AROUND HIM STAYS COMPLETELY EMPTY AND UNBROKEN FOR THE ENTIRE CLIP: the flat green area on all four sides
of him is PURE EMPTY GREEN in every single frame, and NOTHING is ever visible in it — no object, no shape,
no blur, no streak, no smear, no shadow and no motion of any kind ever appears in the green, and nothing
ever enters, touches or crosses the top, bottom, left or right edge of the picture. The ONLY things
visible anywhere in the entire frame, in every frame, are his own body, his own war-fan and his own short
sword. The white paper talismans hanging from his hat brim STAY FIRMLY ATTACHED TO THE HAT at all times —
they may swing and flutter on their strings, but they NEVER tear off, NEVER detach and NEVER fly away,
and there are NO loose paper scraps, NO torn paper, NO confetti and NO floating debris anywhere at any
moment. He stays up — NOT a slow topple — and ends at the starting stance.

## ko (cause-free collapse — v1r, EMPTY-BACKGROUND LOCK PRE-APPLIED)  [OFF-ANCHOR]
# Not a re-roll of a rejected clip: this is the FIRST ko fire, pre-hardened with the lesson that cost
# `hit` four cycles. The base ko body banned the cause by ENUMERATION ("NO blow, no impact, no
# opponent"), which is exactly the phrasing that let hit v1-v3 keep inventing an attacker at whatever
# edge was still unguarded. A DEFEAT state is the likeliest of all to invent one. So the enumerated
# ban is replaced by a POSITIVE whole-frame constraint — worded to still allow HIS OWN dropped fan,
# sword and hat, which is the whole point of this state.
# NOTE build-prompt.mjs applies the ko-suffix rule to this section automatically (it strips the
# weapon-lock and anchor-lock sentences), so do NOT hand-edit those out here.
DEFEAT COLLAPSE: his strength simply leaves him — the great war-fan and the short sword slip out of his
hands and fall to the ground beside him, he sinks to one armored knee, then crumples the rest of the way
down and lies motionless on the ground, his kasa hat settling beside him, and he holds there completely
still. This is his own collapse from within, under his own weight, and nothing else in the world touches
him. THE GREEN BACKGROUND AROUND HIM STAYS COMPLETELY EMPTY AND UNBROKEN FOR THE ENTIRE CLIP: the ONLY
things visible anywhere in the frame in any frame are HIS OWN body, HIS OWN war-fan, HIS OWN short sword
and HIS OWN kasa hat. No other person, no other figure, no attacker, no second weapon, no object, no
shape, no blur, no streak, no smear and no shadow ever appears in the green, and NOTHING ever enters,
touches or crosses the top, bottom, left or right edge of the picture. He begins on the reference stance
but ends collapsed on the ground, motionless, and does NOT return to standing. He stays in side profile
facing screen-right throughout, and his dropped fan, sword and hat all come to rest WELL INSIDE the
frame with a clear margin from every edge.

## SUPERSEDED-victory (imperial fan snap — v1r, EMPTY-BACKGROUND LOCK PRE-APPLIED)
# REJECTED on the START POSE, and the fault was in the prompt, not the model. The action said he
# "SNAPS the great war-fan fully open with a flourish" — which PRESUPPOSES the fan starts CLOSED —
# while the start-pose lock demanded it already be "HELD OPEN AND RAISED". Given two contradictory
# orders the model obeyed the ACTION: f0 has the fan folded to a bundle, bbox x1=595 instead of the
# anchor's 721, IoU vs the kit anchor 0.6424 and f0-vs-f96 only 0.7231. Superseded by the "## victory"
# v2 section below, which removes the OPENING from the action entirely.
# Not a re-roll: first victory fire, pre-hardened like ko. The base body's locks (start pose, fan below
# the hat brim, strict side profile, crimson colour) are all KEPT verbatim — they are what stopped the
# fan-morph and front-turn defects elsewhere in this kit. The only change is that the closing
# enumerated ban ("Alone, no opponent") is replaced by the positive whole-frame constraint that fixed
# hit v4. A VICTORY state is a strong candidate for inventing celebratory particles — confetti, petals,
# sparks, banners, energy — and the enumeration would not cover any of those, since none of them is an
# "opponent". The positive form closes all of it at once.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan HELD OPEN AND RAISED beside his chest at about head height in one
hand — NOT lowered, NOT down at his hip, NOT at his waist — and the short black-bladed sword held reversed
at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly
visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never
appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final
frame. VICTORY TAUNT: he SNAPS the great war-fan fully open with a flourish and raises it beside his oni
face, keeping the TOP EDGE OF THE FAN BELOW HIS HAT BRIM AT ALL TIMES and never letting any part of it
pass above the hat, striking one slow imperial pose as the talismans settle, his fanged grin widening,
then he lowers it back into the EXACT starting stance. The pose is struck IN STRICT SIDE PROFILE: his
near shoulder stays IN FRONT OF his far shoulder, his chest NEVER opens toward the camera, his feet stay
IN LINE both pointing SCREEN-RIGHT, and he NEVER squares up or spreads both arms into a frontal victory
pose; his silhouette stays NARROW and is NEVER wider than it is tall. Through the flourish and the hold
the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale,
white, grey, silver or feathered. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where
he starts, never sliding, stepping or drifting sideways across the frame. THE GREEN BACKGROUND AROUND HIM
STAYS COMPLETELY EMPTY AND UNBROKEN FOR THE ENTIRE CLIP: the ONLY things visible anywhere in the frame,
in every frame, are HIS OWN body, HIS OWN war-fan and HIS OWN short sword. No other person, no figure, no
object, no shape, no blur, no streak, no smear, no shadow, and NO celebratory effect of any kind — no
confetti, no petals, no sparks, no embers, no glow, no energy, no banner and no falling paper — ever
appears in the green, and NOTHING ever enters, touches or crosses the top, bottom, left or right edge of
the picture.

## SUPERSEDED-victory2 (imperial fan raise — v2, FAN ALREADY OPEN, NO OPENING ACTION)
# NEVER RENDERED — BLOCKED BY THE NSFW MODERATION FILTER, credits refunded. Nothing to QA. The clip
# fix itself (remove the opening from the action) is untested and is carried forward verbatim into v3.
# The only suspect is wording v2 INTRODUCED that v1 did not have: "SPREAD WIDE", twice. v1 (3579 chars,
# no such phrase) rendered fine; v2 (3975, "SPREAD WIDE" x2) was flagged. v3 removes every form of
# "spread", including "spreads both arms", since a single refusal does not say WHICH token tripped and
# "spread ... wide" adjacency is the most plausible. "wide"/"widens"/"wider" are deliberately KEPT —
# they all appear in v1, which rendered fine, so they are proven safe and removing them would be
# superstition rather than inference. Note the identity is NOT generally blocked: idle was fired first
# as the moderation test for it and cleared, and 10 clips have rendered since — a per-PROMPT trip.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND SPREAD WIDE and HELD RAISED beside his
chest at about head height in one hand — NOT closed, NOT folded, NOT a bundle, NOT lowered, NOT at his
hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference
image pose EXACTLY. THE WAR-FAN IS ALREADY FULLY OPEN AND SPREAD IN THE VERY FIRST FRAME AND STAYS FULLY
OPEN AND SPREAD WIDE IN EVERY SINGLE FRAME OF THE CLIP: it NEVER folds, NEVER closes, NEVER collapses
into a bundle, a stick or a thin edge-on line, because it is already open from the very first frame and
simply stays that way for the whole clip. Both weapons
stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent,
never stowed, never appearing out of nowhere. VICTORY TAUNT: keeping the fan fully open the whole time,
he RAISES the already-open war-fan up beside his oni face in one slow proud sweep, holds one imperial
pose there as the talismans settle and his fanged grin widens, then LOWERS it smoothly back down to the
EXACT same raised-beside-the-chest reference stance it started in, so the final frame matches the first
frame EXACTLY. He keeps the TOP EDGE OF THE FAN BELOW HIS HAT BRIM AT ALL TIMES and never lets any part
of it pass above the hat. The pose is struck IN STRICT SIDE PROFILE: his near shoulder stays IN FRONT OF
his far shoulder, his chest NEVER opens toward the camera, his feet stay IN LINE both pointing
SCREEN-RIGHT, and he NEVER squares up or spreads both arms into a frontal victory pose; his silhouette
stays NARROW and is NEVER wider than it is tall. Throughout, the war-fan stays the SAME solid DEEP
CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. HIS
FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or
drifting sideways. THE GREEN BACKGROUND AROUND HIM STAYS COMPLETELY EMPTY AND UNBROKEN FOR THE ENTIRE
CLIP: the ONLY things visible anywhere in the frame, in every frame, are HIS OWN body, HIS OWN war-fan
and HIS OWN short sword. No other person, no figure, no object, no shape, no blur, no streak, no smear,
no shadow, and NO celebratory effect of any kind — no confetti, no petals, no sparks, no embers, no glow,
no energy, no banner and no falling paper — ever appears in the green, and NOTHING ever enters, touches
or crosses the top, bottom, left or right edge of the picture.


## SUPERSEDED-victory3 (imperial fan raise — v3, v2 CLIP FIX + NSFW-SAFE WORDING)
# REJECTED on the FAN-HEIGHT lock, and it is the ACTION-vs-LOCK conflict again in a new form. The v2
# start-pose fix WORKED and is proven: f0 bbox == fEND == kit anchor exactly, anchor lock 0.9916, fan
# open at f0. NSFW wording fix also worked - it rendered. But the action said he "RAISES the already-
# open war-fan UP BESIDE HIS ONI FACE", and the fan is nearly as tall as his head, so raising it to
# face height NECESSARILY puts its top edge above the hat brim - which the very next sentence forbids.
# Measured: min y0 = 4 @f37 (4px from the frame top) against the f0 hat top at y=88, i.e. the fan ends
# up ~84px ABOVE the brim and within a hair of a containment BLOCK.
#   THE LESSON IS GEOMETRIC, not emphatic: when an action's GEOMETRY is incompatible with a constraint,
#   restating the constraint cannot win. Change the MOTION. v4 removes the vertical raise entirely.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his
chest at about head height in one hand — NOT closed, NOT folded, NOT a bundle, NOT lowered, NOT at his
hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference
image pose EXACTLY. THE WAR-FAN IS ALREADY FULLY OPEN AND FANNED OUT IN THE VERY FIRST FRAME AND STAYS FULLY
OPEN AND FANNED OUT IN EVERY SINGLE FRAME OF THE CLIP: it NEVER folds, NEVER closes, NEVER collapses
into a bundle, a stick or a thin edge-on line, because it is already open from the very first frame and
simply stays that way for the whole clip. Both weapons
stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent,
never stowed, never appearing out of nowhere. VICTORY TAUNT: keeping the fan fully open the whole time,
he RAISES the already-open war-fan up beside his oni face in one slow proud sweep, holds one imperial
pose there as the talismans settle and his fanged grin widens, then LOWERS it smoothly back down to the
EXACT same raised-beside-the-chest reference stance it started in, so the final frame matches the first
frame EXACTLY. He keeps the TOP EDGE OF THE FAN BELOW HIS HAT BRIM AT ALL TIMES and never lets any part
of it pass above the hat. The pose is struck IN STRICT SIDE PROFILE: his near shoulder stays IN FRONT OF
his far shoulder, his chest NEVER opens toward the camera, his feet stay IN LINE both pointing
SCREEN-RIGHT, and he NEVER squares up or throws both arms out into a frontal victory pose; his silhouette
stays NARROW and is NEVER wider than it is tall. Throughout, the war-fan stays the SAME solid DEEP
CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. HIS
FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or
drifting sideways. THE GREEN BACKGROUND AROUND HIM STAYS COMPLETELY EMPTY AND UNBROKEN FOR THE ENTIRE
CLIP: the ONLY things visible anywhere in the frame, in every frame, are HIS OWN body, HIS OWN war-fan
and HIS OWN short sword. No other person, no figure, no object, no shape, no blur, no streak, no smear,
no shadow, and NO celebratory effect of any kind — no confetti, no petals, no sparks, no embers, no glow,
no energy, no banner and no falling paper — ever appears in the green, and NOTHING ever enters, touches
or crosses the top, bottom, left or right edge of the picture.



## victory (imperial fan present — v4, NO VERTICAL RAISE)
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT a bundle, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. THE WAR-FAN IS ALREADY FULLY OPEN AND FANNED OUT IN THE VERY FIRST FRAME AND STAYS FULLY OPEN AND FANNED OUT IN EVERY SINGLE FRAME OF THE CLIP: it NEVER folds, NEVER closes, NEVER collapses into a bundle, a stick or a thin edge-on line, because it is already open from the very first frame and simply stays that way for the whole clip. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere. VICTORY TAUNT: keeping the fan fully open the whole time and WITHOUT EVER LIFTING IT ANY HIGHER THAN IT ALREADY IS, he sweeps the already-open war-fan slowly SIDEWAYS ACROSS THE FRONT OF HIS CHEST and presents it there in one slow contemptuous imperial pose, tilting only his head as the talismans settle and his fanged grin widens, then draws it smoothly back to the EXACT same raised-beside-the-chest reference stance it started in, so the final frame matches the first frame EXACTLY. THE FAN NEVER RISES: the movement is PURELY SIDEWAYS AND HORIZONTAL, the fan NEVER travels upward, NEVER goes up beside his face, NEVER goes above his shoulder, and its TOP EDGE STAYS BELOW THE BRIM OF HIS HAT AND NO HIGHER THAN IT ALREADY SITS IN THE VERY FIRST FRAME, in every single frame of the clip. There is always a WIDE band of empty green between the top of the fan and the top edge of the picture. The pose is struck IN STRICT SIDE PROFILE: his near shoulder stays IN FRONT OF his far shoulder, his chest NEVER opens toward the camera, his feet stay IN LINE both pointing SCREEN-RIGHT, and he NEVER squares up or throws both arms out into a frontal victory pose; his silhouette stays NARROW and is NEVER wider than it is tall. Throughout, the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting sideways. THE GREEN BACKGROUND AROUND HIM STAYS COMPLETELY EMPTY AND UNBROKEN FOR THE ENTIRE CLIP: the ONLY things visible anywhere in the frame, in every frame, are HIS OWN body, HIS OWN war-fan and HIS OWN short sword. No other person, no figure, no object, no shape, no blur, no streak, no smear, no shadow, and NO celebratory effect of any kind — no confetti, no petals, no sparks, no embers, no glow, no energy, no banner and no falling paper — ever appears in the green, and NOTHING ever enters, touches or crosses the top, bottom, left or right edge of the picture.

## SUPERSEDED-special1 (HEX STORM — v1r, EFFECT-PERMITTING BACKGROUND LOCK)
# REJECTED on the SIDE-PROFILE lock — and it is the ACTION-vs-GEOMETRY conflict for the FOURTH time.
# The action said he sweeps the fan "LOW and IN FRONT OF HIS CHEST". Sweeping a large fan ACROSS your
# own chest forces the near arm over the body and the shoulders OPEN toward the camera; the motion
# cannot be performed in strict side profile. Measured: front-turn run 57/97 @f21, sym 0.234 -> 0.616.
# VIEWED at f21 and f40: torso at ~3/4 with both shoulders and the chest plate visible for 59% of the
# clip - far beyond the brief 9-frame (strike_a v2) and ~15-frame (block_b) rotations accepted earlier.
# Everything else PASSED: anchor lock 0.9913 with f0 == fEND == kit anchor exactly, top edge min y0 = 88
# so THE SWEEP STAYS LOW worked perfectly, containment CLEAR on all four edges, and the charms are
# genuinely good - crimson/gold/white, tight to the body, no green, nothing near an edge.
#   FIX: sweep FORWARD ALONG THE LINE OF HIS BODY in the direction he already faces, never across the
#   chest. That keeps both shoulders in the side-profile plane, so the lock and the motion agree.
# First special fire, pre-hardened. NOTE the blanket "the green stays COMPLETELY EMPTY, nothing visible
# in it" wording that fixed hit v4 and cleared ko/victory CANNOT be used verbatim here: every special
# has a LEGITIMATE finisher effect, and that wording would forbid the very thing the clip exists to
# show. This is the effect-permitting variant — his own charms are allowed, everything else is closed.
# Trap audit vs the two rules this kit has learned: (a) no causal language, there is no impact to
# justify; (b) the action "sweeps the OPEN war-fan" presupposes an open fan, which MATCHES the anchor,
# so no action-vs-start-pose conflict. The fan-height clause is kept LOW-compatible: the sweep is
# explicitly low, so the constraint and the motion agree (the lesson from victory v3).
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his
chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the
short black-bladed sword held reversed at his hip in the other, matching the reference image pose
EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the
last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same
raised-fan reference stance in the final frame. SPECIAL FINISHER (hex storm): he sweeps the open war-fan
once, LOW and IN FRONT OF HIS CHEST, and a SMALL tight flurry of glowing crimson hexagon paper charms
swirls close around his own body, no bigger than his torso, flaring gold and burning away within a beat,
then he settles back to the starting stance. THE SWEEP STAYS LOW: the fan NEVER rises above the brim of
his hat and NEVER goes higher than it already sits in the very first frame. Through the sweep the war-fan
stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey,
silver or feathered. THE CHARMS STAY TIGHT AGAINST HIM: they are CRIMSON and GOLD and WHITE, NEVER green,
small and clustered against his own body in the CENTRE of the picture with a WIDE band of empty green on
all four sides; they do NOT orbit outward, do NOT shoot out, do NOT form a ring, and NOT ONE of them ever
reaches, touches or crosses the top, bottom, left or right edge of the frame. APART FROM HIS OWN CHARMS
THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every
frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other
person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no
shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY
PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting.


## SUPERSEDED-special1b (HEX STORM — v2, FORWARD SWEEP, NO CROSS-CHEST)
# PARTIAL SUCCESS, REJECTED on two new faults. THE TORSO FIX WORKED: front-turn run 57/97 -> 9/97 and
# at f35 he is in clean side profile with the near shoulder in front. The shoulder-stacking clause is
# proven and is KEPT in v3. But re-aiming the sweep introduced TWO regressions:
#   (1) FAN HEIGHT BROKE: min y0 = 0 @f34 (the fan's rim touches the top row) where v1 held a perfect
#       88. "STRAIGHT FORWARD ALONG THE LINE OF HIS OWN BODY" reads as a forward OVERHEAD ARC - I
#       traded a cross-chest sweep for an upward one.
#   (2) THE CHARMS SCATTERED: roughly 420x630px across the right half of frame, against "no bigger
#       than his torso" and "do NOT orbit outward".
# CONCLUSION AFTER THREE GEOMETRY FAILURES ON ONE CLIP: the SWEEP is the problem. Any sweep of a large
# fan must either cross the chest (opens the torso) or arc upward (breaks the height cap). v3 therefore
# DELETES the sweep instead of re-aiming it a fourth time. On a special the EFFECT is the star; the
# body only needs to trigger it.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (hex storm): he sweeps the open war-fan once LOW and STRAIGHT FORWARD ALONG THE LINE OF HIS OWN BODY, in the same direction he is already facing, and a SMALL tight flurry of glowing crimson hexagon paper charms swirls close around his own body, no bigger than his torso, flaring gold and burning away within a beat, then he settles back to the starting stance. THE SWEEP STAYS LOW AND STAYS IN THE SIDE-PROFILE PLANE: the fan NEVER rises above the brim of his hat and NEVER goes higher than it already sits in the very first frame, and the sweep travels FORWARD AND BACK ALONG HIS OWN FACING DIRECTION ONLY — it NEVER crosses in front of his chest, NEVER cuts across his body, and NEVER carries his arm over to his far side. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Through the sweep the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. THE CHARMS STAY TIGHT AGAINST HIM: they are CRIMSON and GOLD and WHITE, NEVER green, small and clustered against his own body in the CENTRE of the picture with a WIDE band of empty green on all four sides; they do NOT orbit outward, do NOT shoot out, do NOT form a ring, and NOT ONE of them ever reaches, touches or crosses the top, bottom, left or right edge of the frame. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting. 


## SUPERSEDED-special1c (HEX STORM — v3, NO SWEEP AT ALL, CHARMS TORSO-BOUND)
# REJECTED on CHARM COLOUR only — the BODY is finally perfect and is kept VERBATIM in v4. Deleting the
# sweep worked completely: front-turn run 0/97, fan open and unmoved at the anchor position, min y0 = 80
# (only 8px over the f0 hat-top of 88, versus v2's 0 and v1's ~84px excursion), containment CLEAR on all
# four edges, anchor lock 0.9935 with f0 == fEND == kit anchor exactly. But the charms render PINK,
# WHITE, GREY and TAN instead of deep crimson and gold — VIEWED at f26 (igniting) and f39 (peak), so it
# is the base palette, not burn-out. Same defect family as the strike_a v1 fan morph, which was rejected.
#   LIKELY CAUSE: the shared SPECIAL add-on calls the energy "CRIMSON and GOLD and WHITE", and that
#   WHITE is licensing pale/pink charm BODIES. v4 fixes it the way strike_a v1 was fixed — state the
#   colour AT THE MOMENT THE CHARMS APPEAR, and separate the charm BODIES (deep crimson, gold edges)
#   from the FLARE (white/gold). The shared add-on is left alone so the other two specials are unaffected.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (hex storm): WITHOUT MOVING HIS ARM ANYWHERE ELSE, he gives the open war-fan ONE SHORT SHARP SHAKE exactly where it already sits beside his chest, and a SMALL tight flurry of glowing crimson hexagon paper charms swirls close around his own body, no bigger than his torso, flaring gold and burning away within a beat, then he settles back to the starting stance. THE FAN DOES NOT TRAVEL AT ALL: it STAYS IN THE EXACT SAME PLACE beside his chest for the whole clip, at the SAME height it sits at in the very first frame. It NEVER rises, NEVER goes above the brim of his hat, NEVER arcs up or over, NEVER crosses in front of his chest, NEVER cuts across his body and NEVER carries his arm to his far side. There is ALWAYS a WIDE band of empty green between the top of the fan and the top edge of the picture. Only his wrist moves. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. THE CHARMS STAY TIGHT AGAINST HIM: they are CRIMSON and GOLD and WHITE, NEVER green, and the ENTIRE swarm stays inside a SMALL AREA NO BIGGER THAN HIS OWN TORSO, hugging his chest and shoulders. NO charm EVER drifts further from his body than the width of his own shoulders, none of them scatters, drifts across the picture, wanders out into the open green or fills the frame, they do NOT orbit outward, do NOT shoot out and do NOT form a ring, and NOT ONE of them ever reaches, touches or crosses the top, bottom, left or right edge of the frame. A WIDE band of completely empty green surrounds him on all four sides at all times. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting. 


## special_1 (HEX STORM — v4, CRIMSON CHARM LOCK AT THE MOMENT THEY APPEAR)
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (hex storm): WITHOUT MOVING HIS ARM ANYWHERE ELSE, he gives the open war-fan ONE SHORT SHARP SHAKE exactly where it already sits beside his chest, and a SMALL tight flurry of glowing hexagon paper charms swirls close around his own body, no bigger than his torso, and EVERY SINGLE CHARM IS THE SAME DEEP BLOOD-CRIMSON AS HIS OWN WAR-FAN, with a thin GOLD edge — the charms are NEVER pink, NEVER pale, NEVER white, NEVER silver, NEVER grey, NEVER tan and NEVER pastel; only their brief burning-out FLASH is gold and white, while the charm bodies themselves stay that deep crimson from the moment they appear to the moment they vanish, burning away within a beat, then he settles back to the starting stance. THE FAN DOES NOT TRAVEL AT ALL: it STAYS IN THE EXACT SAME PLACE beside his chest for the whole clip, at the SAME height it sits at in the very first frame. It NEVER rises, NEVER goes above the brim of his hat, NEVER arcs up or over, NEVER crosses in front of his chest, NEVER cuts across his body and NEVER carries his arm to his far side. There is ALWAYS a WIDE band of empty green between the top of the fan and the top edge of the picture. Only his wrist moves. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. THE CHARMS STAY TIGHT AGAINST HIM: their paper bodies are DEEP CRIMSON with gold edges, NEVER green and NEVER pink or pale, and the ENTIRE swarm stays inside a SMALL AREA NO BIGGER THAN HIS OWN TORSO, hugging his chest and shoulders. NO charm EVER drifts further from his body than the width of his own shoulders, none of them scatters, drifts across the picture, wanders out into the open green or fills the frame, they do NOT orbit outward, do NOT shoot out and do NOT form a ring, and NOT ONE of them ever reaches, touches or crosses the top, bottom, left or right edge of the frame. A WIDE band of completely empty green surrounds him on all four sides at all times. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting. 
