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

# ADD-ON REWRITTEN 2026-07-28 (phase 36) after Tim: "all specials from final boss look super super
# boring." He was right and it was MEASURED: special_2 scored minIoU 0.638 / 12px travel / 0% strong
# frames against idle's 0.700 / 16px / 0% — an idle with a flare painted on it. All three specials
# moved LESS than his own blocks and throws.
#
# ROOT CAUSE: the old add-on was 100% negation and 0% ambition — "compact", "NOT a beam, NOT a ring,
# NOT a jet, does NOT orbit or shoot outward" — stacked on a suffix that already says "WELL INSIDE
# the frame" and "the EXACT same reference stance". Nothing anywhere asked for POWER. Every reject
# last session was then fixed by DELETING motion, so the bodies ended up literally commanding
# "Only his wrist moves" and "HIS FEET STAY PLANTED ON THE SPOT". The model obeyed perfectly.
#
# THE RECONCILIATION (this is the load-bearing idea — see learning 2.1, action-vs-lock):
# the side-profile lock forbids TRANSVERSE motion — rotating the chest toward camera. It has never
# had anything to say about SAGITTAL motion — lunging, striding, sinking, rising. Sagittal motion is
# precisely what a side view renders BEST. The old prompts killed the wrong axis. Proof it costs
# nothing: throw_a runs 174px of travel at minIoU 0.114 and still anchor-locks at IoU 0.9931.
#
# CONTAINMENT BUDGET, measured off the kit anchor bbox {x0:239, y0:88, x1:721, y1:911} in a 960 frame.
#   *** THE FIRST VERSION OF THIS NOTE WAS WRONG AND COST TWO CLIPS (special_1 v5 and v6). ***
#   It said "239px spare on EACH side, so a full forward lunge is safe". That reasoning treats a
#   lunge as TRANSLATION. It is not: a lunge WIDENS the silhouette, roughly symmetrically, because
#   the back foot travels backward as far as the front foot travels forward. Measured:
#     anchor width 483px | v4 spanPeak 1.17 -> 565px (197px margin/side, fine)
#                        | v5 spanPeak 2.00 -> 966px in a 960px frame — CANNOT FIT
#                        | v6 spanPeak 1.95 -> 942px (9px margin/side) — CANNOT FIT
#   Both were geometrically doomed before the wording mattered. HARD RULE: keep spanPeak <= ~1.60
#   (773px, ~94px margin/side). Bound the lunge WIDTH in the prompt, do not just ask for depth.
#   vertical only 88px above / 49px below -> NO jumps, NO leaps, nothing rising above the hat.
#   A deep crouch or kneel is SAFE and cheap: it makes him shorter AND does not widen him at all.
SPECIAL add-on: This is a FINISHING BLOW and it must LOOK like one — the single most powerful and most
physically committed thing this character ever does. HE COMMITS HIS WHOLE BODY, NOT JUST AN ARM: the
action drives up out of his legs and hips through a big weighted change of stance, so that his whole
silhouette changes dramatically and his body visibly travels forward across the ground and drops in
height. ALL OF THAT HAPPENS FLAT SIDEWAYS-ON, in the plane of the picture, which is exactly what a side
view shows best: he moves FORWARD, DOWN and back UP, and his chest NEVER rotates toward the camera at any
point. HE HOLDS THE PEAK: he DRIVES into the committed position and STAYS THERE for a long sustained
beat, so the action FILLS the clip — it is NEVER one quick flick with the rest of the time spent standing
still, and he is NEVER merely standing on the spot moving only a wrist or a hand. The energy of the
finisher is CRIMSON and GOLD and WHITE, NEVER green, staying close around his own body with a wide empty
green margin on all four edges; it is NOT a beam, NOT a ring, NOT a jet, and does NOT orbit or shoot
outward.

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


## SUPERSEDED-special1d (HEX STORM — v4, SHIPPED BUT BORING: minIoU 0.475 / 68px travel, weaker than his own block)
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (hex storm): WITHOUT MOVING HIS ARM ANYWHERE ELSE, he gives the open war-fan ONE SHORT SHARP SHAKE exactly where it already sits beside his chest, and a SMALL tight flurry of glowing hexagon paper charms swirls close around his own body, no bigger than his torso, and EVERY SINGLE CHARM IS THE SAME DEEP BLOOD-CRIMSON AS HIS OWN WAR-FAN, with a thin GOLD edge — the charms are NEVER pink, NEVER pale, NEVER white, NEVER silver, NEVER grey, NEVER tan and NEVER pastel; only their brief burning-out FLASH is gold and white, while the charm bodies themselves stay that deep crimson from the moment they appear to the moment they vanish, burning away within a beat, then he settles back to the starting stance. THE FAN DOES NOT TRAVEL AT ALL: it STAYS IN THE EXACT SAME PLACE beside his chest for the whole clip, at the SAME height it sits at in the very first frame. It NEVER rises, NEVER goes above the brim of his hat, NEVER arcs up or over, NEVER crosses in front of his chest, NEVER cuts across his body and NEVER carries his arm to his far side. There is ALWAYS a WIDE band of empty green between the top of the fan and the top edge of the picture. Only his wrist moves. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. THE CHARMS STAY TIGHT AGAINST HIM: their paper bodies are DEEP CRIMSON with gold edges, NEVER green and NEVER pink or pale, and the ENTIRE swarm stays inside a SMALL AREA NO BIGGER THAN HIS OWN TORSO, hugging his chest and shoulders. NO charm EVER drifts further from his body than the width of his own shoulders, none of them scatters, drifts across the picture, wanders out into the open green or fills the frame, they do NOT orbit outward, do NOT shoot out and do NOT form a ring, and NOT ONE of them ever reaches, touches or crosses the top, bottom, left or right edge of the frame. A WIDE band of completely empty green surrounds him on all four sides at all times. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting. 

## SUPERSEDED-special2 (TALISMAN BRAND — v1r, SHIPPED BUT BORING: minIoU 0.638 / 12px travel / 0%% strong — an IDLE with a flare)
# First special_2 fire, pre-hardened with everything special_1 cost four cycles to learn:
#   1. NO SWEEP. Any large-fan sweep must either cross the chest (opens the torso) or arc upward
#      (breaks the height cap). The base body's "CLAPS it flat against the face of his own war-fan"
#      is already a small in-place gesture, so it is KEPT — but the fan is explicitly pinned in place.
#   2. SHOULDER-STACKING clause verbatim from special_1 v2, which took front-turn 57/97 -> 9/97.
#   3. COLOUR AT THE MOMENT OF APPEARANCE, separating the talisman/flare BODY from its burn-out
#      FLASH — the fix that took special_1 v4's charms from pink back to crimson.
#   4. EFFECT-PERMITTING background lock (his own flare allowed, intruders and edge-crossing closed).
# Tim's 2026-07-26 coherence rewrite is preserved intact: the talisman stays PINCHED IN HIS HAND
# against his own fan and never becomes a detached floating object (the hollow-pale rocket pattern).
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his
chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the
short black-bladed sword held reversed at his hip in the other, matching the reference image pose
EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the
last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same
raised-fan reference stance in the final frame. SPECIAL FINISHER (talisman brand): he snatches a single
white paper talisman off his own hat brim and CLAPS it flat against the face of his own war-fan, HOLDING
it pinched there in his fingers as it flares in a SMALL compact burst no bigger than his head and burns
to nothing between his fingers, then he settles back to the starting stance. THE FLARE IS DEEP CRIMSON
AND GOLD from the instant it appears — the same deep crimson as his own war-fan — and it is NEVER pink,
NEVER pale, NEVER lavender, NEVER silver, NEVER grey and NEVER pastel; only the final burning-out
FLASH is white. THE FAN DOES NOT TRAVEL: it STAYS IN THE EXACT SAME PLACE beside his chest at the SAME
height it sits at in the very first frame, NEVER rises, NEVER goes above the brim of his hat, NEVER arcs
up or over, NEVER crosses in front of his chest and NEVER cuts across his body. Only his free hand and
wrist move. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays
IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even
slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and
side-on from the first frame to the last. The talisman stays PINCHED IN HIS HAND against the fan the
whole time and the flare happens ON the fan, touching his own body — nothing leaves his hand, nothing
floats free in the air, nothing detaches, launches, flies or travels. Underneath the flare the war-fan
stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey,
silver or feathered. The flare stays TINY and CENTRAL, no bigger than his head, hugging his own hands
with a WIDE band of completely empty green on all four sides; it is NOT a beam, NOT a ring, NOT a
projectile, does NOT shoot out and NEVER reaches, touches or crosses any edge of the frame. APART FROM
HIS OWN FLARE THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the
picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN talisman
flare. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no
streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS
FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or
drifting.

## SUPERSEDED-special3 (ZERO CITADEL EDGE — v1r, ALL FOUR LESSONS PRE-APPLIED)
# REJECTED: the edge-light DETACHES from the blade and flies off as free-floating gold arcs. VIEWED at
# f20 the light is correctly ON the blade — a thin gold line along the metal — and by f76 there are TWO
# detached arcs hanging in open green, one reaching y=16 (72px above his hat) with the sword still at
# his hip. That breaks "a SHORT THIN line hugging the blade itself ... does NOT travel outward, does NOT
# shoot away from him". Same ATTACHED-vs-DETACHED family as Tim's hollow-pale launched-rocket rule and
# special_2's pinched-in-hand fix — and special_2 shows the remedy: require the effect to TOUCH HIS OWN
# BODY/WEAPON at all times, not merely to be small.
# EVERYTHING ELSE PASSED: anchor lock 0.9943 with f0 == fEND == kit anchor exactly, containment CLEAR on
# all four edges, front-turn 1/97 at aspect 0.79, fan pinned and unmoved, feet planted.
# SECOND, MINOR: the clip is essentially FROZEN from f48 to f96 (IoU vs f0 ~0.994) — the cut lands in
# the first 40 frames and 2.4s of 4s is a static hold. v2 nudges the timing without changing the motion.
# Final clip of the kit. Same four pre-applied lessons as special_2, which cleared on fire one.
# NOTE this is the only special driven by the SWORD, not the fan — so the risk profile differs:
# the sword is small and already at his hip, so a short forward-down cut needs no torso rotation and
# no upward arc (unlike a fan sweep). The FAN is the thing that must not move here, since his other
# hand is doing the work; it is pinned explicitly. The edge-light is GOLD and WHITE by design (not
# crimson), so the colour lock states THAT palette at the moment of appearance and bans the pale
# pink/lavender drift that hit special_1 v3.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the
large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his
chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the
short black-bladed sword held reversed at his hip in the other, matching the reference image pose
EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the
last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same
raised-fan reference stance in the final frame. SPECIAL FINISHER (citadel edge): he snaps the reversed
black-bladed sword forward and down in ONE short compact executioner's cut kept BELOW SHOULDER HEIGHT and
close in front of his own hip, and a SHORT THIN edge of light traces the blade path and vanishes, then he
settles back to the starting stance. THE EDGE-LIGHT IS GOLD AND WHITE from the instant it appears — it is
NEVER green, NEVER pink, NEVER pale lavender, NEVER silver-grey and NEVER pastel — and it is a SHORT THIN
line hugging the blade itself, no longer than the blade, that fades within a beat. It is NOT a beam, NOT
a ring, NOT a jet, NOT a projectile, does NOT travel outward, does NOT shoot away from him and NEVER
reaches, touches or crosses any edge of the frame. THE CUT STAYS SMALL AND LOW: the sword NEVER rises
above his shoulder, NEVER goes above the brim of his hat and NEVER swings out to arm's length away from
his body; the whole cut happens close in front of him. THE WAR-FAN DOES NOT MOVE AT ALL: it STAYS EXACTLY
WHERE IT IS beside his chest at the SAME height it sits at in the very first frame, still fully open and
fanned out, NEVER rises, NEVER lowers, NEVER goes above the brim of his hat and NEVER crosses in front of
his chest — only his sword hand moves. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE
CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens
or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and
his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the
war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale,
white, grey, silver or feathered. APART FROM HIS OWN EDGE-LIGHT THE GREEN STAYS COMPLETELY EMPTY AND
UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN
war-fan, HIS OWN short sword and HIS OWN edge-light. No other person, no figure, no attacker, no second
weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and
nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED
exactly where he starts, never sliding, stepping or drifting.


## SUPERSEDED-special3b (ZERO CITADEL EDGE — v2, LIGHT WELDED TO THE BLADE)
# REJECTED, and WORSE than v1 on identity. VIEWED at f31: (a) THE WAR-FAN IS COMPLETELY ABSENT — he
# holds the sword two-handed with no fan anywhere, against "Both weapons stay present and clearly
# visible in EVERY SINGLE FRAME"; (b) the SHORT sword has become a LONG KATANA; (c) the edge-light STILL
# detaches, as a 2194px white crescent floating in open green (v1's was 730px).
# MY OWN WORDING CAUSED (a) AND (b): v2 added ~600 chars of sword-focused text ("welded to the metal",
# "never leaves his hand", "only his sword hand moves") and the prompt became SWORD-DOMINANT, so the fan
# dropped out and the blade grew. Same class as the block_a v1 fan-absence.
# THE GATE THAT CAUGHT IT: check-extra-objects.mjs, written for hit's invented attackers, flagged 2 blobs
# @f31 immediately - a gate built for one defect class catching an unrelated one two clips later.
# v3 keeps the welded-light wording but RE-BALANCES: fan presence and the SHORT blade are restated AT
# THE MOMENT OF THE CUT, which is the remedy that fixed strike_a's fan morph and special_1 v4's charms.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (citadel edge): after a brief still beat he snaps the reversed black-bladed sword forward and down in ONE short compact executioner's cut kept BELOW SHOULDER HEIGHT and close in front of his own hip, timed so the cut lands around the MIDDLE of the clip rather than right at the start, and a SHORT THIN edge of light traces the blade path and vanishes, then he settles back to the starting stance. THE EDGE-LIGHT IS GOLD AND WHITE from the instant it appears — it is NEVER green, NEVER pink, NEVER pale lavender, NEVER silver-grey and NEVER pastel. THE LIGHT EXISTS ONLY ON THE BLADE ITSELF AND STAYS WELDED TO THE METAL: it is a SHORT THIN glow lying directly along the sword's own edge, no longer than the blade, TOUCHING THE BLADE ALONG ITS WHOLE LENGTH IN EVERY SINGLE FRAME, and it fades away still on the blade. IT NEVER SEPARATES FROM THE SWORD: it never peels off, never slides off the tip, never leaves his hand, never lingers in the air behind the blade, and it NEVER becomes a free-floating arc, crescent, slash, streak, ribbon or trail hanging anywhere in the green. At NO moment is there any glowing shape in the picture that is not physically touching his own sword. It is NOT a beam, NOT a ring, NOT a jet, NOT a projectile, does NOT travel outward, does NOT shoot away from him and NEVER reaches, touches or crosses any edge of the frame. THE CUT STAYS SMALL AND LOW: the sword NEVER rises above his shoulder, NEVER goes above the brim of his hat and NEVER swings out to arm's length away from his body; the whole cut happens close in front of him. THE WAR-FAN DOES NOT MOVE AT ALL: it STAYS EXACTLY WHERE IT IS beside his chest at the SAME height it sits at in the very first frame, still fully open and fanned out, NEVER rises, NEVER lowers, NEVER goes above the brim of his hat and NEVER crosses in front of his chest — only his sword hand moves. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. APART FROM HIS OWN EDGE-LIGHT THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN edge-light. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting. 


## SUPERSEDED-special3c (ZERO CITADEL EDGE — v3, FAN PRESENCE + SHORT BLADE RESTATED AT THE CUT)
# TWO FIXES LANDED, TWO FAULTS REMAIN. FIXED: (a) DETACHMENT — check-extra-objects.mjs reports 1 blob,
# CLEAN, where v1 and v2 both showed a detached crescent; the welded-light wording finally held. (b) FAN
# PRESENCE — viewed at f40 the war-fan is plainly there, open and crimson with its gold rim, so
# restating it at the moment of the cut worked. REMAINING: (1) THE LIGHT IS WILDLY OVERSIZED, a giant
# gold crescent sweeping from y=4 at top right around to his left, against "no longer than the blade";
# (2) THE FAN HAS DROPPED to hip level, against "THE WAR-FAN DOES NOT MOVE AT ALL ... at the SAME height
# it sits at in the very first frame".
#   CAUSE OF (1) IS ANOTHER SELF-CONTRADICTION: the prompt says the light "TRACES THE BLADE PATH", and a
#   swept cut's PATH is a large arc — so tracing it necessarily produces a large arc, contradicting "no
#   longer than the blade" two clauses later. The model is obeying the wrong half. v4 deletes the
#   path-tracing phrase: the blade's own edge GLOWS, it does not mark where the sword has been.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (citadel edge): after a brief still beat he snaps the SHORT black-bladed sword forward and down in ONE short compact executioner's cut kept BELOW SHOULDER HEIGHT and close in front of his own hip, timed so the cut lands around the MIDDLE of the clip rather than right at the start. HE CUTS ONE-HANDED AND KEEPS THE WAR-FAN IN HIS OTHER HAND: all the way through the cut and every frame around it, the large DEEP-CRIMSON HEX-BORDERED WAR-FAN REMAINS FULLY OPEN AND PLAINLY VISIBLE, held raised beside his chest in his other hand — it NEVER disappears, NEVER vanishes, NEVER fades out, is NEVER put away and is NEVER absent for even one frame, and he NEVER takes the sword in both hands. THE SWORD STAYS SHORT: it is a SHORT reversed blade no longer than his own forearm and it NEVER becomes a long katana, a longsword or a great curved blade, and it NEVER grows in length. As the blade moves, a SHORT THIN edge of light traces the blade path and vanishes, then he settles back to the starting stance. THE EDGE-LIGHT IS GOLD AND WHITE from the instant it appears — it is NEVER green, NEVER pink, NEVER pale lavender, NEVER silver-grey and NEVER pastel. THE LIGHT EXISTS ONLY ON THE BLADE ITSELF AND STAYS WELDED TO THE METAL: it is a SHORT THIN glow lying directly along the sword's own edge, no longer than the blade, TOUCHING THE BLADE ALONG ITS WHOLE LENGTH IN EVERY SINGLE FRAME, and it fades away still on the blade. IT NEVER SEPARATES FROM THE SWORD: it never peels off, never slides off the tip, never leaves his hand, never lingers in the air behind the blade, and it NEVER becomes a free-floating arc, crescent, slash, streak, ribbon or trail hanging anywhere in the green. At NO moment is there any glowing shape in the picture that is not physically touching his own sword. It is NOT a beam, NOT a ring, NOT a jet, NOT a projectile, does NOT travel outward, does NOT shoot away from him and NEVER reaches, touches or crosses any edge of the frame. THE CUT STAYS SMALL AND LOW: the sword NEVER rises above his shoulder, NEVER goes above the brim of his hat and NEVER swings out to arm's length away from his body; the whole cut happens close in front of him. THE WAR-FAN DOES NOT MOVE AT ALL: it STAYS EXACTLY WHERE IT IS beside his chest at the SAME height it sits at in the very first frame, still fully open and fanned out, NEVER rises, NEVER lowers, NEVER goes above the brim of his hat and NEVER crosses in front of his chest — only his sword hand moves. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. APART FROM HIS OWN EDGE-LIGHT THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN edge-light. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting. 


## SUPERSEDED-special3d (ZERO CITADEL EDGE — v4, CONTAINMENT BLOCK — never re-fire)
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (citadel edge): after a brief still beat he snaps the SHORT black-bladed sword forward and down in ONE short compact executioner's cut kept BELOW SHOULDER HEIGHT and close in front of his own hip, timed so the cut lands around the MIDDLE of the clip rather than right at the start. HE CUTS ONE-HANDED AND KEEPS THE WAR-FAN IN HIS OTHER HAND: all the way through the cut and every frame around it, the large DEEP-CRIMSON HEX-BORDERED WAR-FAN REMAINS FULLY OPEN AND PLAINLY VISIBLE, held raised beside his chest in his other hand — it NEVER disappears, NEVER vanishes, NEVER fades out, is NEVER put away and is NEVER absent for even one frame, and he NEVER takes the sword in both hands. THE SWORD STAYS SHORT: it is a SHORT reversed blade no longer than his own forearm and it NEVER becomes a long katana, a longsword or a great curved blade, and it NEVER grows in length. As the blade moves, its own cutting edge GLOWS with a SHORT THIN line of light that fades out again, then he settles back to the starting stance. THE GLOW DOES NOT TRACE OR MARK THE PATH THE SWORD HAS TRAVELLED: it never leaves a trail, a streak, a swipe, a slash-mark, a ribbon or a long curved crescent hanging in the air behind the blade, and it is NEVER longer than the blade itself. It is simply the metal edge glowing, and it stays that small in every single frame. THE EDGE-LIGHT IS GOLD AND WHITE from the instant it appears — it is NEVER green, NEVER pink, NEVER pale lavender, NEVER silver-grey and NEVER pastel. THE LIGHT EXISTS ONLY ON THE BLADE ITSELF AND STAYS WELDED TO THE METAL: it is a SHORT THIN glow lying directly along the sword's own edge, no longer than the blade, TOUCHING THE BLADE ALONG ITS WHOLE LENGTH IN EVERY SINGLE FRAME, and it fades away still on the blade. IT NEVER SEPARATES FROM THE SWORD: it never peels off, never slides off the tip, never leaves his hand, never lingers in the air behind the blade, and it NEVER becomes a free-floating arc, crescent, slash, streak, ribbon or trail hanging anywhere in the green. At NO moment is there any glowing shape in the picture that is not physically touching his own sword. It is NOT a beam, NOT a ring, NOT a jet, NOT a projectile, does NOT travel outward, does NOT shoot away from him and NEVER reaches, touches or crosses any edge of the frame. THE CUT STAYS SMALL AND LOW: the sword NEVER rises above his shoulder, NEVER goes above the brim of his hat and NEVER swings out to arm's length away from his body; the whole cut happens close in front of him. THE WAR-FAN DOES NOT MOVE AT ALL AND STAYS UP AT CHEST HEIGHT: it STAYS EXACTLY WHERE IT IS, HELD RAISED BESIDE HIS CHEST AT ABOUT HEAD HEIGHT, at the SAME height it sits at in the very first frame, still fully open and fanned out. It NEVER rises, and just as importantly it NEVER DROPS, NEVER LOWERS toward his hip, waist, thigh or knee, NEVER sinks and NEVER swings down — its height above the ground is IDENTICAL in every single frame of the clip. It NEVER goes above the brim of his hat and NEVER crosses in front of his chest. ONLY HIS SWORD HAND MOVES; the arm holding the fan is completely still. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered. APART FROM HIS OWN EDGE-LIGHT THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN edge-light. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it. HIS FEET STAY PLANTED ON THE SPOT and he stays CENTERED exactly where he starts, never sliding, stepping or drifting. 

## SUPERSEDED-special1e (HEX STORM — v5, COMMITMENT SOLVED minIoU 0.109/140px/78%% but FRONT-TURN f6-f10 + charms cross LEFT edge)
# v4 shipped but Tim called it boring and the gate agrees: minIoU 0.475, 68px travel — LESS body
# change than his own block_a (0.323 / 92px). v4's body literally said "Only his wrist moves" and
# "HIS FEET STAY PLANTED ON THE SPOT". Both clauses are DELETED here and replaced with a lunge.
# KEPT VERBATIM because they each cost a cycle: the crimson-at-the-moment-of-appearance charm lock
# (v4's fix for pink charms), the shoulder-stacking clause (front-turn 57/97 -> 9/97), the
# effect-permitting background lock, and the torso-width charm containment (body-relative, so it
# survives the lunge). The fan is now capped at SHOULDER height, tighter than v4's hat-brim cap,
# because v4 still broke the brim by 43px — and a straight forward thrust has no reason to rise.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (hex storm): he DRIVES HIS WHOLE BODY FORWARD into a LONG DEEP LUNGE out onto his front leg, his back leg stretching out straight behind him and his hips sinking low, and at the end of that lunge he THRUSTS the open war-fan STRAIGHT FORWARD at chest height, out ahead of his own chest — a flat forward drive, never an arc, never a swing, never a lift. HE HOLDS THAT DEEP LUNGE WITH THE FAN EXTENDED, sunk low and stretched forward, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold, and only at the very end does he draw his weight back and rise to the starting stance. As the fan drives forward a TIGHT flurry of glowing hexagon paper charms BURSTS out around his own body and swirls there for the whole hold, and EVERY SINGLE CHARM IS THE SAME DEEP BLOOD-CRIMSON AS HIS OWN WAR-FAN, with a thin GOLD edge — the charms are NEVER pink, NEVER pale, NEVER white, NEVER silver, NEVER grey, NEVER tan and NEVER pastel; only their brief burning-out FLASH is gold and white, while the charm bodies themselves stay that deep crimson from the moment they appear to the moment they vanish. THE FAN STAYS LOW: it NEVER rises above the level of his own shoulder, NEVER goes above the brim of his hat, NEVER arcs up or over, and NEVER crosses in front of his chest or cuts across his body — it drives FORWARD and comes BACK, nothing more. There is ALWAYS a WIDE band of empty green between the top of the fan and the top edge of the picture. HE STAYS ON THE GROUND: he NEVER jumps, NEVER leaps and NEVER leaves the ground, and he travels forward no more than that one long lunge, with a WIDE band of empty green remaining ahead of him at all times. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered, and the short black-bladed sword stays clearly in his other hand the entire time. THE CHARMS STAY TIGHT AGAINST HIM: their paper bodies are DEEP CRIMSON with gold edges, NEVER green and NEVER pink or pale, and the ENTIRE swarm stays close around his own chest and shoulders. NO charm EVER drifts further from his body than the width of his own shoulders, none of them scatters, drifts across the picture, wanders out into the open green or fills the frame, they do NOT orbit outward, do NOT shoot out and do NOT form a ring, and NOT ONE of them ever reaches, touches or crosses the top, bottom, left or right edge of the frame. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.

## SUPERSEDED-special2b (TALISMAN BRAND — v2, never fired; superseded by v3 with the solid/forward-biased/broadside fixes)
# v1r was the worst clip in the kit by a distance: minIoU 0.638 / 12px travel / 0% strong frames,
# statistically indistinguishable from IDLE (0.700 / 16px / 0%). Its body said "Only his free hand
# and wrist move" and "HIS FEET STAY PLANTED ON THE SPOT" — both DELETED here.
# A deep CROUCH is chosen over a lunge for this one because it is the cheapest committed move in
# containment terms: it makes him SHORTER, which GROWS the 88px top margin rather than spending it.
# KEPT: Tim's 2026-07-26 coherence rewrite (the talisman stays PINCHED IN HIS HAND and never
# becomes a detached floating object), the colour-at-appearance split of flare BODY from burn-out
# FLASH, the shoulder-stacking clause, the effect-permitting background lock.
# DELIBERATE CHANGE, FLAG FOR TIM: the flare is upgraded from "no bigger than his head" to "no
# bigger than his own chest". The old head-size cap is part of why this read as nothing happening.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (talisman brand): he snatches a single white paper talisman off his own hat brim and, in the same movement, DROPS HIS WHOLE BODY DOWN INTO A DEEP SINKING CROUCH, his knees bending hard and his hips sinking far down toward the ground and his front foot sliding forward, and at the bottom of that drop he CLAPS the talisman flat against the face of his own war-fan and DRIVES the branded fan FORWARD and LOW, out ahead of his own chest. HE HOLDS THAT DEEP SUNKEN POSITION, low to the ground with the fan driven forward, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold, while the talisman flares and burns between his fingers; only at the very end does he push back up and rise to the starting stance. He keeps the talisman PINCHED IN HIS FINGERS against the fan the entire time and the flare happens ON the fan, touching his own body — nothing leaves his hand, nothing floats free in the air, nothing detaches, launches, flies or travels. THE FLARE IS DEEP CRIMSON AND GOLD from the instant it appears — the same deep crimson as his own war-fan — and it is NEVER pink, NEVER pale, NEVER lavender, NEVER silver, NEVER grey and NEVER pastel; only the final burning-out FLASH is white. The flare is no bigger than his own chest, hugging his own hands, with a WIDE band of completely empty green on all four sides; it is NOT a beam, NOT a ring, NOT a projectile, does NOT shoot out and NEVER reaches, touches or crosses any edge of the frame. THE FAN STAYS LOW: it NEVER rises above the level of his own shoulder, NEVER goes above the brim of his hat and NEVER arcs up or over — it goes DOWN with his body and FORWARD, nothing more. HE STAYS ON THE GROUND AND ON HIS FEET: he NEVER jumps, NEVER leaps, NEVER leaves the ground and never kneels all the way down or lies down, his head and hat stay WELL BELOW the top edge at every moment, and he travels forward no more than a single short step, with a WIDE band of empty green remaining ahead of him at all times. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Underneath the flare the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered, and the short black-bladed sword stays clearly in his other hand the entire time. APART FROM HIS OWN FLARE THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN talisman flare. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.

## SUPERSEDED-special3e (ZERO CITADEL EDGE — v5, never fired; superseded by v6 with width bound + broadside fan)
# v3 is the ACCEPTED take (Tim, option A) and has the best motion in the kit — minIoU 0.220,
# 136px travel — but only 19% strong frames: one real cut, then 78% dead air at the anchor. So the
# fix here is DURATION, not more movement: drive into the cut and HOLD the finished position.
# THE CRESCENT FIX. v3's remaining fault was a giant gold crescent. Three cycles failed to shrink it
# with SIZE language ("no longer than the blade") because, per learning 2.1, a slash's path IS a long
# arc — size words fight the action. So this version stops describing a shape in the air ENTIRELY and
# describes the METAL ITSELF glowing white-hot, and names the shapes to avoid (crescent, moon,
# sickle, arc, swoosh) rather than bounding their length.
# KEPT: the welded-light wording that took extra-objects from a detached blob to a clean 1 blob on
# both v3 and v4, and the fan-presence restatement at the moment of the cut (v2's fix for the fan
# vanishing). The fan is ALSO height-pinned here — v3's fan dropped to hip.
# DO NOT RE-FIRE v4: it is a containment BLOCK.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. SPECIAL FINISHER (zero citadel edge): he DRIVES HIS WHOLE BODY FORWARD into a LONG DEEP LUNGE out onto his front leg, his back leg stretching out straight behind him and his hips sinking low, and drives the short black-bladed sword FORWARD and LOW through one flat committed cut at waist height, out ahead of his own hip. HE HOLDS THE FINISHED CUT, sunk deep in that lunge with the sword arm stretched out ahead of his own hip and the blade held still and level, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold; only at the very end does he draw his weight back and rise to the starting stance. THE BLADE ITSELF GLOWS: the metal of his own short sword burns white-hot along its own edge, a thin bright GOLD AND WHITE heat glowing ON the metal surface itself, so that it reads as a GLOWING BLADE and nothing else. There is NO separate shape of light anywhere in the picture: NO crescent, NO moon, NO sickle, NO arc, NO swoosh, NO ribbon, NO trail and NO band of light hanging in the air, and no light is ever drawn along the path the sword has travelled. THE LIGHT STAYS WELDED TO THE METAL: at NO moment is there any glowing shape in the picture that is not physically touching his own sword, and the glow never extends past the tip or the guard of that short blade. His war-fan STAYS FULLY OPEN AND CLEARLY VISIBLE IN HIS OTHER HAND THROUGHOUT THE ENTIRE CLIP, deep crimson with its gold hexagon-cut border, HELD UP BESIDE HIS OWN CHEST at his own chest height for the whole clip — it NEVER drops to his hip or his thigh, NEVER hangs down at his side, NEVER swings out away from his body, NEVER folds, NEVER closes and NEVER leaves the picture; and his sword stays SHORT, a short black-bladed sword, never lengthening into a long katana. HE STAYS ON THE GROUND: he NEVER jumps, NEVER leaps and NEVER leaves the ground, his head and hat stay WELL BELOW the top edge in every single frame including the deepest point of the lunge, and he travels forward no more than that one long lunge, with a WIDE band of empty green remaining ahead of him at all times. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. APART FROM HIS OWN GLOWING BLADE THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN blade glow. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.

## SUPERSEDED-special1f (HEX STORM — v6, wind-up FIXED but charms became RECTANGULAR STRIPS plastered on him + LEFT 110px)
# v5 SOLVED the boring problem outright — minIoU 0.109 (beats throw_a's 0.114), travel 140px,
# 78% strong frames, spanPeak 2.00. The lunge itself is exactly right and is KEPT WORD FOR WORD.
# Two defects to close, both caused by v5's own new text:
#  (1) FRONT-TURN f6-f10. Given a big forward action and no instruction about how to START it, the
#      model invented a wind-up: he rotates SQUARE TO CAMERA and DRAWS THE SWORD, then recovers.
#      Same class as strike_a v1's "COILS back". Fix: forbid the wind-up explicitly and pin the
#      sword hand, because banning the turn alone leaves the model free to wind up some other way.
#  (2) CHARMS CROSS THE LEFT EDGE (containment LEFT 80px @f51) and fill the whole frame. This is
#      learning 2.6 exactly: a big new block about the BODY silently stole from the CHARM
#      containment, and the add-on rewrite traded "compact, wide empty margin" for the weaker
#      "close around his own body". Fix uses learning 2.4 — ATTACHED beats SMALL: the charms are
#      TETHERED to his armour rather than merely bounded in size, which is the wording that finally
#      held special_3's edge-light and special_2's talisman.
# NOTE the charms are allowed to be BIGGER and denser than the old v4 flurry — the dome looks
# genuinely powerful and that is the point of the re-roll. It only has to stay off the edges.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. THERE IS NO WIND-UP OF ANY KIND: from the very first frame he moves STRAIGHT FORWARD into the action and NOTHING pulls back first. He NEVER coils back, NEVER rears back, NEVER draws his arm or the fan behind his shoulder, NEVER raises or draws or swings the short sword, and NEVER opens his chest toward the camera to gather himself. THE SWORD HAND DOES NOT ACT: the short black-bladed sword stays held reversed DOWN AT HIS HIP in his other hand for the ENTIRE clip, never lifted, never brandished, never swung, never pointed. SPECIAL FINISHER (hex storm): he DRIVES HIS WHOLE BODY FORWARD into a LONG DEEP LUNGE out onto his front leg, his back leg stretching out straight behind him and his hips sinking low, and at the end of that lunge he THRUSTS the open war-fan STRAIGHT FORWARD at chest height, out ahead of his own chest — a flat forward drive, never an arc, never a swing, never a lift. HE HOLDS THAT DEEP LUNGE WITH THE FAN EXTENDED, sunk low and stretched forward, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold, and only at the very end does he draw his weight back and rise to the starting stance. As the fan drives forward a TIGHT flurry of glowing hexagon paper charms BURSTS out around his own body and swirls there for the whole hold, and EVERY SINGLE CHARM IS THE SAME DEEP BLOOD-CRIMSON AS HIS OWN WAR-FAN, with a thin GOLD edge — the charms are NEVER pink, NEVER pale, NEVER white, NEVER silver, NEVER grey, NEVER tan and NEVER pastel; only their brief burning-out FLASH is gold and white, while the charm bodies themselves stay that deep crimson from the moment they appear to the moment they vanish. EVERY CHARM IS TETHERED TO HIM: each one hovers TOUCHING OR ALMOST TOUCHING his own armour, his own arms or his own war-fan, clinging to his body like paper stuck to him, and at NO moment is there any charm that is not within one hand's width of his own body or his own fan. The charms NEVER scatter out into the open green, NEVER form a big dome, cloud, wall, sphere or halo around him, NEVER fill the picture, and NEVER drift away from him. A WIDE BAND OF COMPLETELY EMPTY GREEN SURROUNDS HIM ON ALL FOUR SIDES IN EVERY SINGLE FRAME — above his hat, below his feet, behind his back leg and ahead of his fan — and NOT ONE charm, spark, glow or piece of paper EVER reaches, touches, overlaps or crosses the top, bottom, left or right edge of the picture. NOTHING is ever cut off by the edge of the frame. THE FAN STAYS LOW: it NEVER rises above the level of his own shoulder, NEVER goes above the brim of his hat, NEVER arcs up or over, and NEVER crosses in front of his chest or cuts across his body — it drives FORWARD and comes BACK, nothing more. HE STAYS ON THE GROUND: he NEVER jumps, NEVER leaps and NEVER leaves the ground, and he travels forward no more than that one long lunge, with a WIDE band of empty green remaining ahead of him and behind him at all times. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP, INCLUDING THE VERY FIRST FRAMES: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly and not even for one frame at the start, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered, and the short black-bladed sword stays clearly in his other hand the entire time. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.

## SUPERSEDED-special1g (HEX STORM — v7, body+containment SOLVED but charms went HOLLOW/sparse and the fan folded EDGE-ON)
# v5 and v6 both scored EXCELLENT on body commitment and both failed containment on the LEFT edge
# (80px @f51, then 110px @f36). That was never a wording problem — see the corrected containment
# budget above. spanPeak 2.00 and 1.95 put him at 966px and 942px wide in a 960px frame. He could
# not fit. v7 bounds the WIDTH of the lunge instead of only asking for depth.
# v6's OTHER lesson: "clinging to his body like paper stuck to him" was taken literally — the charms
# became long RECTANGULAR talisman strips PLASTERED over his torso and legs, lost the hexagon shape
# and the gold rim entirely, and drifted toward his hat-talisman motif. Attachment language (2.4)
# works for an effect welded to a WEAPON; applied to a swarm it produces stickers. So v7 goes back
# to charms FLOATING FREE IN THE AIR near him, and bounds them by DISTANCE, not by attachment.
# KEPT from v6: the no-wind-up clause and the pinned sword hand (no front-turn seen in v6 — that fix
# worked). KEPT from v5: the lunge, the sustained hold, the colour-at-appearance lock.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. THERE IS NO WIND-UP OF ANY KIND: from the very first frame he moves STRAIGHT FORWARD into the action and NOTHING pulls back first. He NEVER coils back, NEVER rears back, NEVER draws his arm or the fan behind his shoulder, NEVER raises or draws or swings the short sword, and NEVER opens his chest toward the camera to gather himself. THE SWORD HAND DOES NOT ACT: the short black-bladed sword stays held reversed DOWN AT HIS HIP in his other hand for the ENTIRE clip, never lifted, never brandished, never swung, never pointed. SPECIAL FINISHER (hex storm): he DRIVES HIS WHOLE BODY FORWARD into a DEEP LUNGE onto his front leg, his hips sinking low and his weight driving forward, and at the end of that lunge he THRUSTS the open war-fan STRAIGHT FORWARD at chest height, out ahead of his own chest — a flat forward drive, never an arc, never a swing, never a lift. HE HOLDS THAT DEEP LUNGE WITH THE FAN EXTENDED, sunk low and stretched forward, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold, and only at the very end does he draw his weight back and rise to the starting stance. THE LUNGE IS DEEP BUT NARROW — THIS IS THE MOST IMPORTANT RULE IN THE CLIP: he sinks DOWN far more than he reaches OUT, his back foot stays UNDER him and does NOT slide far out behind him, and his feet NEVER end up far apart across the picture. FROM HIS BACK FOOT TO THE TIP OF HIS WAR-FAN HE NEVER FILLS MORE THAN ABOUT TWO-THIRDS OF THE WIDTH OF THE PICTURE. There is ALWAYS a BROAD band of completely empty green between his back foot and the LEFT edge of the picture, and an equally BROAD band of completely empty green between his fan and the RIGHT edge, in EVERY SINGLE FRAME, including the deepest point of the lunge. NOTHING — no foot, no leg, no hand, no fan, no charm — is EVER cut off by the edge of the picture, and nothing ever touches or crosses the left, right or top edge. As the fan drives forward a TIGHT flurry of glowing HEXAGON-SHAPED paper charms appears in the air around his own chest and shoulders and swirls there for the whole hold. EVERY CHARM IS A SMALL SIX-SIDED HEXAGON TILE the size of his own hand, with a thin GOLD hexagon rim, exactly like the hexagon border of his own war-fan — they are NEVER long rectangles, NEVER strips, NEVER ribbons, NEVER tags, NEVER rectangular paper slips like the ones on his hat, and they NEVER change shape. THE CHARMS FLOAT FREELY IN THE OPEN AIR a little way off his body: they are NOT stuck to him, NOT plastered onto him, NOT lying flat on his armour, and they NEVER cover, hide or obscure his armour, his chest, his arms, his legs or his face — his whole body stays clearly visible and unobstructed at all times. EVERY SINGLE CHARM IS THE SAME DEEP BLOOD-CRIMSON AS HIS OWN WAR-FAN with that thin GOLD edge — the charms are NEVER pink, NEVER pale, NEVER white, NEVER silver, NEVER grey, NEVER tan and NEVER pastel; only their brief burning-out FLASH is gold and white, while the charm bodies themselves stay that deep crimson from the moment they appear to the moment they vanish. THE SWARM STAYS SMALL AND CLOSE: every charm stays within about one arm's length of his own chest, the whole flurry stays inside a compact area around his upper body, and the charms NEVER scatter out into the open green, NEVER form a big dome, cloud, wall, sphere or halo, NEVER fill the picture and NEVER drift away from him. THE FAN STAYS LOW: it NEVER rises above the level of his own shoulder, NEVER goes above the brim of his hat, NEVER arcs up or over, and NEVER crosses in front of his chest or cuts across his body — it drives FORWARD and comes BACK, nothing more. HE STAYS ON THE GROUND: he NEVER jumps, NEVER leaps and NEVER leaves the ground. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP, INCLUDING THE VERY FIRST FRAMES: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly and not even for one frame at the start, his far arm and far shoulder stay HIDDEN BEHIND his body, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered, and the short black-bladed sword stays clearly in his other hand the entire time. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.

## SUPERSEDED-special1h (HEX STORM — v8, fan BROADSIDE + density both FIXED, but the storm trailed BACKWARD as a wake: LEFT 378px BLOCK)
# THE STATE OF PLAY. Tim VIEWED v5 and v6 in Higgsfield and ruled: "the last two special attacks
# look WAY cooler like this is perfect". So v5's LOOK is the target and is not up for negotiation.
#   v5  commitment 0.109/140px/78%  LOOK: APPROVED BY TIM   containment: LEFT 80px  (fails)
#   v6  commitment 0.193/156px/72%  LOOK: approved by Tim    containment: LEFT 110px (fails)
#   v7  commitment 0.116/102px/69%  containment 28px (BEST)  LOOK: REGRESSION — my width bound and
#       "one arm's length" swarm cap turned the dense solid dome into ~8 SPARSE HOLLOW NEON OUTLINE
#       hexagons, and the war-fan folded to a thin EDGE-ON wedge so his signature prop stopped
#       reading at all. Body was right; the thing Tim actually approved was thrown away.
# SO v8 KEEPS v7's BODY VERBATIM (it fits the frame and scores 0.116) and rebuilds the EFFECT:
#   (a) SOLID not hollow. v7's charms were outlines because I asked for "a thin GOLD hexagon rim"
#       without ever saying the BODY of the tile is filled. State the fill explicitly.
#   (b) DENSE not sparse. v5 had dozens; v7 had eight. Say MANY.
#   (c) FORWARD-BIASED — this is the containment fix that does NOT cost drama. v5 wrapped the dome
#       symmetrically, so half of it trailed LEFT past his back leg and off the edge. Put the swarm
#       AHEAD of him and around his chest, on the fan side, and the left edge is then only his back
#       foot. Drama preserved, edge freed.
#   (d) FAN BROADSIDE. New in v8. Scoped to the FAN AND FOREARM ONLY — "broadside to camera" fights
#       the strict side-profile body lock if left unscoped (the known victory-v5 warning).
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. THERE IS NO WIND-UP OF ANY KIND: from the very first frame he moves STRAIGHT FORWARD into the action and NOTHING pulls back first. He NEVER coils back, NEVER rears back, NEVER draws his arm or the fan behind his shoulder, NEVER raises or draws or swings the short sword, and NEVER opens his chest toward the camera to gather himself. THE SWORD HAND DOES NOT ACT: the short black-bladed sword stays held reversed DOWN AT HIS HIP in his other hand for the ENTIRE clip, never lifted, never brandished, never swung, never pointed. SPECIAL FINISHER (hex storm): he DRIVES HIS WHOLE BODY FORWARD into a DEEP LUNGE onto his front leg, his hips sinking low and his weight driving forward, and at the end of that lunge he THRUSTS the open war-fan STRAIGHT FORWARD at chest height, out ahead of his own chest — a flat forward drive, never an arc, never a swing, never a lift. HE HOLDS THAT DEEP LUNGE WITH THE FAN EXTENDED, sunk low and stretched forward, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold, and only at the very end does he draw his weight back and rise to the starting stance. THE LUNGE IS DEEP BUT NARROW: he sinks DOWN far more than he reaches OUT, his back foot stays UNDER him and does NOT slide far out behind him, and from his back foot to the tip of his war-fan he NEVER fills more than about two-thirds of the width of the picture. There is ALWAYS a BROAD band of completely empty green between his back foot and the LEFT edge of the picture in EVERY SINGLE FRAME. THE WAR-FAN IS ALWAYS SHOWN BROADSIDE: throughout the whole clip his war-fan stays FULLY OPEN, FULLY FANNED OUT and turned so that its BROAD CRIMSON FACE IS PRESENTED FLAT TO THE CAMERA, big and unmistakable, with all of its ribs and its full gold hexagon-cut border clearly visible. His fan is NEVER folded, NEVER closed, NEVER half-open, NEVER seen edge-on, NEVER a thin dark wedge or a narrow sliver, and NEVER turned away from the camera. Only his fan and the forearm holding it are angled this way — his TORSO, SHOULDERS, HIPS AND HEAD stay in strict side profile the entire time. As the fan drives forward a BIG DENSE STORM of glowing hexagon paper charms ERUPTS around him and swirls there for the whole hold. THERE ARE MANY OF THEM — dozens, a thick crowded swarm that fills the air around his upper body, not a handful. EVERY CHARM IS A SOLID FILLED-IN SIX-SIDED PAPER TILE, opaque, its whole face a rich DEEP BLOOD-CRIMSON exactly like his own war-fan, with a bright GOLD glowing rim around the outside — the charms are NEVER hollow, NEVER empty outlines, NEVER wireframes, NEVER thin neon rings, NEVER see-through, and the green background is NEVER visible through the middle of a charm. They are NEVER pink, NEVER pale, NEVER white, NEVER silver, NEVER grey, NEVER tan and NEVER pastel; only their brief burning-out FLASH is gold and white. THE STORM GATHERS IN FRONT OF HIM: the charms crowd the air AHEAD of his chest and AROUND his outstretched fan arm, on the same side as his extended fan, and they stay ON THAT SIDE. NOTHING trails away behind his back leg, nothing gathers behind him, and nothing at all appears in the empty green to the LEFT of his back foot. The whole storm stays inside the picture with a BROAD band of empty green above it, below it and to the LEFT of him, and NOT ONE charm, spark or glow EVER reaches, touches, overlaps or crosses the top, bottom, left or right edge of the picture — nothing is ever cut off by the edge of the frame. HE STAYS ON THE GROUND: he NEVER jumps, NEVER leaps and NEVER leaves the ground. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP, INCLUDING THE VERY FIRST FRAMES: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly and not even for one frame at the start, and his silhouette stays NARROW and side-on from the first frame to the last. Throughout the whole clip the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered, and the short black-bladed sword stays clearly in his other hand the entire time. APART FROM HIS OWN CHARMS THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN crimson hex charms. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.

## special_2 (TALISMAN BRAND — v3, SINKING CROUCH + DENSE SOLID BRAND-FLARE)
# v1r was the WORST clip in the whole roster sweep: minIoU 0.638 / 12px travel / 0% strong frames,
# statistically indistinguishable from IDLE (0.700 / 16px / 0%). Its body literally said "Only his
# free hand and wrist move" and "HIS FEET STAY PLANTED ON THE SPOT". Both deleted.
# BODY = DEEP SINKING CROUCH, deliberately NOT a lunge. A crouch is the cheapest committed move in
# containment terms: it makes him SHORTER (growing the 88px top margin) and does NOT widen the
# silhouette at all, which is exactly what blew special_1 v5/v6 (spanPeak ~2.0 in a 960px frame).
# EFFECT lessons carried from the special_1 chain, all measured:
#   - SOLID NOT HOLLOW. v7's charms rendered as empty outlines because the prompt named a gold RIM
#     and never said the face was filled. State the fill.
#   - FORWARD-BIASED. Keep the flare ahead of him, never trailing behind the back foot.
#   - PROP BROADSIDE, scoped to fan + forearm only (unscoped it fights the side-profile lock).
# KEPT: Tim's 2026-07-26 coherence rewrite — the talisman stays PINCHED IN HIS HAND and never
# becomes a detached floating object; the colour-at-appearance split of flare BODY from burn-out
# FLASH; the shoulder-stacking clause; the no-wind-up + pinned-sword clauses that killed the
# special_1 v5 front-turn.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. THERE IS NO WIND-UP OF ANY KIND: from the very first frame he moves straight into the action and NOTHING pulls back first. He NEVER coils back, NEVER rears back, NEVER draws the fan behind his shoulder, NEVER raises or draws or swings the short sword, and NEVER opens his chest toward the camera to gather himself. THE SWORD HAND DOES NOT ACT: the short black-bladed sword stays held reversed DOWN AT HIS HIP in his other hand for the ENTIRE clip, never lifted, never brandished, never swung, never pointed. SPECIAL FINISHER (talisman brand): he snatches a single white paper talisman off his own hat brim and, in the same movement, DROPS HIS WHOLE BODY STRAIGHT DOWN INTO A DEEP SINKING CROUCH — his knees bending hard, his hips sinking far down toward the ground, his whole body becoming much LOWER — and at the bottom of that drop he CLAPS the talisman flat against the face of his own war-fan and DRIVES the branded fan FORWARD and LOW, out ahead of his own chest. HE HOLDS THAT DEEP SUNKEN POSITION, low to the ground with the fan driven forward, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold, while the talisman burns between his fingers; only at the very end does he push back up and rise to the starting stance. HE SINKS RATHER THAN REACHES: his feet stay close together under his body, he does NOT stride, does NOT split his legs wide apart and does NOT slide a foot far out behind him, and he never fills more than about two-thirds of the width of the picture. There is ALWAYS a BROAD band of completely empty green between him and the LEFT edge and between him and the RIGHT edge, in EVERY SINGLE FRAME. He keeps the talisman PINCHED IN HIS FINGERS against the fan the entire time and the flare happens ON the fan, touching his own body — nothing leaves his hand, nothing floats free in the air, nothing detaches, launches, flies or travels. THE BRAND FLARE IS BIG AND SOLID: a thick, dense, OPAQUE burst of DEEP CRIMSON AND GOLD fire blooming across the face of the fan and around his gripping hand, rich and filled-in and clearly visible — it is NEVER a thin outline, NEVER a hollow ring, NEVER a wireframe, NEVER a faint wisp and NEVER see-through. It is DEEP CRIMSON AND GOLD from the instant it appears, the same deep crimson as his own war-fan, and it is NEVER pink, NEVER pale, NEVER lavender, NEVER silver, NEVER grey and NEVER pastel; only the final burning-out FLASH is white. THE FLARE STAYS IN FRONT OF HIM: it blooms AHEAD of his chest and around the fan, on the same side as the fan, and NOTHING trails away behind his back leg or gathers behind him. It stays roughly the size of his own chest, hugging his hands, with a WIDE band of completely empty green on all four sides; it is NOT a beam, NOT a ring, NOT a projectile, does NOT shoot out, and NOT ONE spark or glow EVER reaches, touches or crosses any edge of the frame — nothing is ever cut off by the edge of the picture. THE WAR-FAN IS ALWAYS SHOWN BROADSIDE: throughout the whole clip the fan stays FULLY OPEN, FULLY FANNED OUT and turned so that its BROAD CRIMSON FACE IS PRESENTED FLAT TO THE CAMERA, big and unmistakable, with its ribs and its full gold hexagon-cut border clearly visible; it is NEVER folded, NEVER closed, NEVER half-open, NEVER seen edge-on and NEVER a thin dark wedge. Only his fan and the forearm holding it are angled this way — his TORSO, SHOULDERS, HIPS AND HEAD stay in strict side profile the entire time. THE FAN STAYS LOW: it NEVER rises above the level of his own shoulder and NEVER goes above the brim of his hat — it goes DOWN with his body and FORWARD, nothing more. HE STAYS ON THE GROUND AND ON HIS FEET: he NEVER jumps, NEVER leaps, NEVER leaves the ground, never kneels all the way down and never lies down, and his head and hat stay WELL BELOW the top edge at every moment. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP, INCLUDING THE VERY FIRST FRAMES: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, and his silhouette stays NARROW and side-on from the first frame to the last. Underneath the flare the war-fan stays the SAME solid DEEP CRIMSON fan with its gold hexagon-cut border and NEVER turns pale, white, grey, silver or feathered, and the short black-bladed sword stays clearly in his other hand the entire time. APART FROM HIS OWN FLARE THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN talisman flare. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.

## special_3 (ZERO CITADEL EDGE — v6, SUSTAINED LOW LUNGE + WHITE-HOT BLADE, NO CRESCENT)
# v3 is the take Tim accepted (option A) and it has the best raw motion in the old kit — minIoU
# 0.220, 136px travel — but only 19% strong frames: one real cut, then 78% dead air at the anchor.
# So the fix here is DURATION, not more movement: drive into the cut and HOLD the finished position.
# THE CRESCENT FIX (v3's other fault, an oversized gold crescent). Three cycles failed to shrink it
# with SIZE language ("no longer than the blade") because, per learning 2.1, a slash's path IS a
# long arc — size words fight the action itself. So this version stops describing a shape in the
# air ENTIRELY and describes the METAL glowing white-hot, and NAMES the shapes to avoid rather than
# bounding their length.
# KEPT: the welded-light wording that took extra-objects from a detached blob to a clean 1 blob on
# both v3 and v4; the fan-presence restatement at the moment of the cut (v2's fix for the fan
# vanishing); the fan is ALSO height-pinned because v3's fan dropped to hip.
# WIDTH BOUNDED per the special_1 v5/v6 failure. DO NOT RE-FIRE v4 — it is a containment BLOCK.
THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE: he already stands in strict side profile with the large deep-crimson hex-bordered war-fan ALREADY FULLY OPEN AND FANNED OUT and HELD RAISED beside his chest at about head height in one hand — NOT closed, NOT folded, NOT lowered, NOT at his hip — and the short black-bladed sword held reversed at his hip in the other, matching the reference image pose EXACTLY. Both weapons stay present and clearly visible in EVERY SINGLE FRAME including the first and the last, never absent, never stowed, never appearing out of nowhere, and he RETURNS to that EXACT same raised-fan reference stance in the final frame. THERE IS NO WIND-UP OF ANY KIND: from the very first frame he drives STRAIGHT FORWARD into the action and NOTHING pulls back first. He NEVER coils back, NEVER rears back, NEVER raises the sword above his shoulder to gather himself, and NEVER opens his chest toward the camera. SPECIAL FINISHER (zero citadel edge): he DRIVES HIS WHOLE BODY FORWARD into a DEEP LUNGE onto his front leg, his hips sinking low and his weight driving forward, and drives the short black-bladed sword FORWARD and LOW through one flat committed cut at waist height, out ahead of his own hip. HE HOLDS THE FINISHED CUT, sunk deep in that lunge with the sword arm stretched out ahead of him and the blade held still and level, THROUGH THE WHOLE MIDDLE OF THE CLIP, a long sustained committed hold; only at the very end does he draw his weight back and rise to the starting stance. THE LUNGE IS DEEP BUT NARROW: he sinks DOWN far more than he reaches OUT, his back foot stays UNDER him and does NOT slide far out behind him, and from his back foot to the tip of his sword he NEVER fills more than about two-thirds of the width of the picture. There is ALWAYS a BROAD band of completely empty green between his back foot and the LEFT edge and between his blade and the RIGHT edge, in EVERY SINGLE FRAME, and nothing is EVER cut off by the edge of the picture. THE BLADE ITSELF GLOWS: the metal of his own short sword burns WHITE-HOT along its own cutting edge, a thick bright GOLD AND WHITE heat glowing ON the metal surface itself, brightest at the edge and fading into the steel, so that it reads as a GLOWING BLADE and nothing else. There is NO separate shape of light anywhere in the picture: NO crescent, NO moon, NO sickle, NO arc, NO swoosh, NO ribbon, NO trail and NO band of light hanging in the air, and no light is ever drawn along the path the sword has travelled. THE LIGHT STAYS WELDED TO THE METAL: at NO moment is there any glowing shape in the picture that is not physically touching his own sword, and the glow NEVER extends past the tip or the guard of that short blade. His war-fan STAYS FULLY OPEN AND CLEARLY VISIBLE IN HIS OTHER HAND THROUGHOUT THE ENTIRE CLIP, deep crimson with its gold hexagon-cut border, and it is SHOWN BROADSIDE with its BROAD CRIMSON FACE PRESENTED FLAT TO THE CAMERA — never folded, never closed, never edge-on, never a thin dark wedge. It is HELD UP BESIDE HIS OWN CHEST at his own chest height for the whole clip: it NEVER drops to his hip or his thigh, NEVER hangs down at his side, NEVER swings out away from his body and NEVER leaves the picture. Only the fan and the forearm holding it are angled this way — his TORSO, SHOULDERS, HIPS AND HEAD stay in strict side profile the entire time. His sword stays SHORT, a short black-bladed sword, and NEVER lengthens into a long katana. HE STAYS ON THE GROUND: he NEVER jumps, NEVER leaps and NEVER leaves the ground, and his head and hat stay WELL BELOW the top edge in every single frame including the deepest point of the lunge. HIS SHOULDERS STAY STACKED ONE BEHIND THE OTHER FOR THE WHOLE CLIP: his near shoulder stays IN FRONT OF his far shoulder in every single frame, his chest NEVER opens or turns toward the camera even slightly, and his silhouette stays NARROW and side-on from the first frame to the last. APART FROM HIS OWN GLOWING BLADE THE GREEN STAYS COMPLETELY EMPTY AND UNBROKEN: the ONLY things visible anywhere in the picture, in every frame, are HIS OWN body, HIS OWN war-fan, HIS OWN short sword and HIS OWN blade glow. No other person, no figure, no attacker, no second weapon, no other object, no shape, no blur, no streak and no shadow ever appears in the green, and nothing ever enters the picture from outside it.
