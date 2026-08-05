# ONI TETSUBO — RE-ROLL prompts (browser Unlimited Seedance, GREEN, faces right)
# Same shared prefix/suffix as oni-tetsubo.md (qa-boss/anchors/mk/oni-tetsubo-anchor-green.png).
# Only the THREE state bodies below are rewritten, each with the measured reason its v1 failed. Build with:
#   node qa-boss/build-prompt.mjs qa-boss/prompts/oni-tetsubo-REROLL.md <state>
#
# special_1 (EARTHSHAKER) — THE HARDEST FAILURE IN THE BATCH. v1's ground-slam threw airborne debris
# specks that reached ALL FOUR frame extremes by f60, so the keyer's union bbox across all 97 frames
# spanned the ENTIRE 960x960 source and key-idle-clips.mjs REFUSED outright: "plate survived at every
# extreme, so nothing was actually keyed out." A rubble pile also persisted at the last frame. The old
# wording ("BLASTS a ring of solid stone chips... UPWARD and OUTWARD around his feet") describes an
# expanding shockwave, and an expanding shockwave is exactly the shape that reaches every edge. THE
# FIX: the slam throws only a FEW small chunks, kept LOW and CLOSE to the impact point, well inside the
# frame, never rising past his own waist and never travelling toward any edge — and every last chunk is
# GONE before the final frame, which shows clean empty green under him. No "ring", no "blast", no
# "outward".
#
# attack_strike (downward club slam) — v1's START POSE is broken: anchor f0 measures 0.629 (it recovers
# to 0.956 by the end, so only the OPENING is wrong). The clip must OPEN on the exact reference stance —
# planted wide brawler stance, tetsubo held two-handed across the body and angled forward — and only
# THEN begin the wind-up. The rest of the beat (the slam itself, already measuring fine) is unchanged.
#
# special_3 (OGRE STOMP) — the anchor gate's own annotation: "ENDS WITH DEBRIS ON SCREEN — pose ok, but
# fix the prompt: the shed material must be GONE by the last frame" (fLASTbody 0.952 vs fLASTall 0.536).
# The POSE is correct; only the debris is wrong, so this rewrite keeps the acting and hardens ONLY the
# vanish requirement, spending explicit clip-time on it rather than adding another restated bound.
#
# JUDGEMENT CALL: the SPECIAL add-on below has one word changed from oni-tetsubo.md's original — "HIS
# OWN KICKED GRIT, STONE CHIPS AND DUST" had a positive "DUST" noun, which is exactly the §4b class
# (a positive noun anywhere in a fired prompt can manifest, suffix ban or not) sitting right beside the
# worst debris failure in the batch. Changed to "HIS OWN KICKED GRIT AND STONE CHIPS" with an added
# "never dust" negation alongside the existing "never mist or smoke". Nothing else in either shared
# block was touched.

Character: a huge red-skinned oni demon brute — deep blood-red muscular skin, two long curved pale-tan
horns, a snarling fanged mouth, thick black twisted rope coiled over one shoulder and around his waist,
dark iron plate tassets over a ragged olive-brown kilt, dark leather bracers, black rope wound around
his shins over iron shin guards, bare feet, gripping a massive dark iron tetsubo war-club studded with
pale bone-coloured spikes. Faces: right (anchor faces screen-right, no flip). GREEN chroma. MK FINAL
playable #1.
Anchor: qa-boss/anchors/mk/oni-tetsubo-anchor-green.png.

Shared prefix:
> The EXACT SAME huge red-skinned oni demon brute from the reference image (identical deep blood-red
> muscular skin, two long curved pale-tan horns sweeping back from his forehead, a snarling fanged
> mouth and heavy brow, pointed ears, thick black twisted rope coiled over one shoulder and wrapped
> around his waist, dark iron plate tassets over a ragged olive-brown kilt, dark leather bracers on his
> forearms, black rope wound around his shins over iron shin guards, bare feet, gripping a massive dark
> iron tetsubo war-club studded with pale bone-coloured spikes), standing on a solid saturated GREEN
> chroma screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the seven prompt laws — every state inherits these):
> His skin, horns, rope, iron tassets, kilt, bracers and the iron tetsubo stay EXACTLY the same the
> entire clip, and he keeps the tetsubo in his hands the whole time and never drops or swaps it. The
> tetsubo stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame, and
> it NEVER travels further toward screen-right than it does in the reference image. The CLUB HEAD is
> NEVER raised above his own head and the club is NEVER swung fully vertical or overhead at any moment.
> HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and
> never lunges out into a wide stance; he keeps his stance narrow and never spreads wider than about
> one and a half times his standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera. The camera is absolutely locked, no zoom, no pan, his full body
> always fully in frame, he is the ONLY figure in frame at all times, nothing else added. He begins and
> ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN KICKED GRIT AND STONE CHIPS the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his iron tetsubo and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips of stone and grit and clods of earth, opaque and lit like rock - never a glow, never a flame, never an aura, never mist or smoke, never dust. All of it stays low and close to him, rising no higher than his own waist, crumbling away to nothing in mid-air before any of it reaches the floor, and never coming near the left, right or top edge of the frame.

## special_1  (EARTHSHAKER) — v2, NO SHOCKWAVE, DEBRIS LOW/CLOSE/GONE
SPECIAL FINISHER (earthshaker): THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE, his body angled
toward screen-right exactly as it is in the reference image, the tetsubo gripped exactly as it sits
there. He raises the tetsubo only to CHEST height, coils his whole body down into a deep braced crouch,
then drives the club DOWN into the ground directly in front of his own planted feet with everything he
has. THIS IS A STOMP, NOT A BLAST: the impact is NOT a ring, NOT a shockwave, NOT an explosion and does
NOT expand outward in any direction - it POPS a few inches up around his own two feet and immediately
below the club head and goes no further. EXACTLY THREE small clods of broken earth and grit kick up at
the point of impact, each one no bigger than his own thumb, each one SOLID, OPAQUE and sharp-edged -
never a puff, never a cloud, never dust, never smoke and never haze - rising no higher than his own
KNEE (never past his waist), staying inside his own standing footprint the whole time and never
travelling toward the left, right or top edge of the frame at any point. There are NEVER more than
three pieces of debris in the frame at once, and each one CRUMBLES AWAY TO NOTHING IN MID-AIR before it
ever comes to rest - none of it lands, none of it settles and none of it is ever seen touching the
ground. THE SLAM IS COMPLETE by the halfway point of the clip; the whole second half is his slow heavy
rise back into the EXACT same reference stance, and BY THE FINAL FRAME the ground beneath and around
him is bare, clean, EMPTY SATURATED GREEN - no clod, no chip, no grain, no mound and no pile of rubble
anywhere in the shot, exactly as empty as it was in the very first frame. Heavy, brutal, final.

## attack_strike A  (downward club slam — v2, OPENS ON THE EXACT REFERENCE STANCE)
STRIKE (downward slam): THE VERY FIRST FRAME IS THE EXACT REFERENCE STANCE AND NOTHING ELSE: he is
already standing in his own planted wide brawler stance, both feet set apart exactly as they are in the
reference image, the tetsubo held TWO-HANDED across the front of his own body and angled forward
exactly as it sits in the reference - NOT raised, NOT drawn back, NOT already coiling - matching the
reference image pose EXACTLY, and he holds that exact opening pose for a beat before any wind-up
begins. ONLY THEN does he coil his weight down onto his back leg, draw the tetsubo back and slightly
DOWN, then drive it in one heavy committed slam DOWNWARD into the ground in front of his own feet, and
the impact kicks up a burst of solid grit and stone chips that leaps up around the club head no higher
than his own knee and crumbles away to nothing before it reaches the floor. The whole slam is COMPLETE
by the halfway point of the clip; the whole second half is his slow heavy settle back up into the EXACT
same reference stance. Heavy, brutal, final.

## special_3  (OGRE STOMP) — v2, DEBRIS FULLY GONE BEFORE THE LAST FRAME
SPECIAL FINISHER (ogre stomp): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image, the tetsubo held LOW and CLOSE at his side
throughout; he hauls one knee up only to hip height and STAMPS his bare heel down into the ground
beside his other foot with his full weight, and the floor CRACKS - solid clods of broken earth and
stone shards jump up around his own feet, rising no higher than his own knee, spreading no wider than
one body-width, and crumbling away to nothing before any of it reaches the floor while he holds the
braced landing. The debris is SOLID EARTH AND STONE: opaque, chunky, lit like rock - never a glow,
never a flame, never a ring of light. EVERY PIECE OF DEBRIS HAS FINISHED CRUMBLING AWAY TO NOTHING BY
THE HALFWAY POINT OF THE CLIP, THE MOMENT THE STOMP LANDS - none of it lingers, none of it is still
falling, settling or visible anywhere in the second half of the clip, and BY THE VERY LAST FRAME the
ground around his feet is bare, clean, EMPTY SATURATED GREEN, with not one clod, chip, shard or grain
of debris anywhere in the shot, exactly as empty as it was in the very first frame. Both feet are back
FLAT on the ground the instant the stomp lands and stay flat for the rest of the clip. The stomp is
COMPLETE by the halfway point; the second half is his settle back into the EXACT same reference stance,
already standing motionless in that exact pose well before the clip ends. Heavy, brutal, final.
