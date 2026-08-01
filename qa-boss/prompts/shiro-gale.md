# SHIRO GALE — MK FINAL playable. Full 13-clip kit. Written 2026-08-01 against KIT-WRITING-BRIEF (§2b/§2c/§4b/§4c/§5b applied).
#
# FIRST-CLIP WATCHES (author's):
#   · SAMURAI-GENRE INVENTION — a second sword, wakizashi, dagger, headband, straw hat, armour
#     plates, cloak or shield appearing from nowhere. All banned by name in the suffix; if one
#     appears the clip is dead on identity — reroll.
#   · BLADE-GLINT FLASH — the polished blade is the brightest thing on him. If a render "lights"
#     a cut as a white glint-streak or flash it reads as bloom and keys badly; brightness is
#     pinned to the reference in the suffix. Check white/p99 on the first keyed clip.
#   · STREAMING CLOTH AND HAIR — the gale name pulls the model toward billowing hair and a
#     flying mantle. Hair, mantle and hakama are pinned to ride with the body and NO moving air
#     is permitted anywhere in the kit. If hair or the mantle corner streams wide, mutates
#     between frames or nears an edge, the clip is dead — reroll, do not loosen the cloth law.
#   · THE TIP — the rightmost point of the subject at only 230px of margin. Every cut in this
#     kit travels DOWN or IN, and special_1's release stops AT the reference extension. Watch
#     the first fired special_1 for overshoot past the reference tip.
#   · LEFT EDGE 230px — owned low by the scabbard's end and at mid-back height by the mantle
#     corner. hit and ko absorb DOWNWARD on the spot for exactly this reason; if containment
#     LEFT ever flags, shrink the fold, not the bound.
#   · THE FREE HAND — it relocates deliberately in exactly two states (block A's forearm brace,
#     throw B's open-palm drive) and returns to the sash both times. It never touches the katana
#     anywhere in the kit; if a render shows it joining the hilt, that is a re-grip defect.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/shiro-gale-anchor-green.png`, pre-screened
before this kit was written: opaque 14.03%, emissive 0.07% (nothing baked-lit on him anywhere),
transl 4.48, grnDom 13.2% — CLEAN on every axis, standard keying language only, padded at the FULL
0.68 standard fill. He faces SCREEN-RIGHT in this plate as fired; this kit assumes no hflip. The
two facts that shape every line below: he has the TIGHTEST width budget in the batch — 230px both
sides, with a span ceiling that is literally the full frame, and the reference already spends both
edges (the katana's upswept tip owns screen-right, the scabbard's end and the mantle corner own
screen-left) — and the ENTIRE katana rides at his own BELT height in reference, far below both his
shoulder line and the headroom above his hair. So the kit's whole grammar is DOWN and IN.

## ★ SHIRO GALE FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **~1076w x ~1044h** (fills 68% of frame height — that is a RESOLUTION
budget: the engine upscales, so no beat may shrink him, move him off his spot or carry him away from
the camera).
  LEFT **230px** · RIGHT **230px** · HEADROOM **468px** · bottom free (geta soles on the floor line —
  `check-containment.mjs` treats feet-on-floor as expected and never counts it).
  Max spanPeak that still fits: **1.43x** standing width — that is the FULL FRAME, not slack. The
  reference silhouette already spends both margins, so the working ceiling for every beat is the
  reference span itself: nothing ever extends past either reference extreme.

WHO OWNS EACH EDGE:
  · **RIGHT x1306** — the upswept TIP of the drawn katana, the forward-most point of the whole
    subject. The single most exposed pixel in the kit.
  · **LEFT x230** — shared: the end of the empty black SCABBARD (low, behind his hip) and the
    flared corner of the cloud-patterned MANTLE (mid-back height), with the hair mass just inside.
  · **TOP y468** — the crown of his own silver-white HAIR. The whole katana rides at his belt,
    far below it.
  · **BOTTOM** — his geta soles on the floor line.

  1. **THE TIGHTEST WIDTH BUDGET IN THE BATCH, SO THE KIT NEVER REACHES.** Every attacking beat
     travels DOWN and IN toward his own body; nothing steps, lunges, leans wide or extends past
     either reference extreme. Body commitment is spent on full-mass sinks, deep folds, one
     bounded trunk-drive, an explosive inward compression-and-release, and sustained loaded
     holds — never on lateral reach.
  2. **BOUND THE TIP, NOT THE HANDS.** The blade tip is the bounded object kit-wide: never
     further toward screen-right than it sits in reference, never above his own shoulder line,
     never swung round behind him. The katana never goes vertical and never overhead — a full
     blade length against 468px of headroom does not fit either way up. The one state that rides
     AT the shoulder cap is block A's close guard.
  3. **THE WRIST-LEVER GRAMMAR.** Every blade motion in the kit is one of exactly three things:
     a level slide along its own line (in toward his body, or back out no further than the
     reference extension), a short turn about his own wrist (tip-down crescents and the guards),
     or riding with his own sinking and rising body. His fist stays in the band between his own
     hip and ribs in every standing state; the pommel drive is capped by the toe of his own
     leading geta.
  4. **ONE-HANDED, FIXED GRIP, NOTHING DRAWN AND NOTHING SHEATHED.** The sword hand never
     slides, never re-seats, never opens. The free hand NEVER touches the katana anywhere in the
     kit; its two deliberate relocations (block A's forearm brace, throw B's open-palm drive)
     are stated in-beat and both return it to the sash before the anchor return. The empty
     scabbard stays thrust through the sash in all 13 states — never drawn, never removed, and
     the blade is never sheathed into it.
  5. **STREAMING-CLOTH LOCK AND STONE-ONLY EFFECTS.** Hair, cloud mantle and hakama ride with
     the body at their reference length and pattern — they never billow, never stream, never
     cross an edge, and NO moving air of any kind ever appears: the gale is his own speed, never
     wind. Effects are broken grey flagstone ONLY, sourced from the floor (a continuous surface
     that cannot visibly deplete), never chipped off his own gear. Every debris sentence carries
     an exact COUNT, a per-piece SIZE tied to one of his own small parts, a SPAN tied to the
     named impact point or his standing footprint, a POPULATION bound, and the inline solidity
     clause in the same sentence. No banned-class noun anywhere in any beat: no dust, no smoke,
     no spark, no grit, no flash, no spray.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME human swordsman from the reference image (a tall, lean, broad-shouldered ronin
> with a long full mane of straight silver-white HAIR swept back off his face and streaming loose
> down his back to mid-back, a stern weathered face with heavy brows and light stubble on his jaw
> and chin, his gaze fixed toward screen-right; wearing a WHITE short-sleeved kimono jacket with
> wide loose sleeves ending above the elbows; over both shoulders and his upper back a draped
> NAVY-BLUE cloth MANTLE patterned with curling WHITE CLOUD scrollwork, its lower corner hanging
> out behind him toward screen-left at mid-back height; a dark OBI sash wound at his waist; full
> pleated dark navy HAKAMA trousers, wide-legged and heavy, with a fold of white under-robe
> showing at the hip vent; dark tabi-wrapped feet on wooden GETA sandals with dark straps; his
> sword arm sheathed from the elbow to the back of the hand in a segmented BLACK ARMOURED BRACER;
> gripped ONE-HANDED in that black-bracered SWORD HAND the dark ribbed hilt of a long drawn
> KATANA held out level toward screen-RIGHT at his own belt height, the ribbed hilt and its steel
> POMMEL showing behind his fist, the bright polished curved blade running level with its gently
> upswept TIP the furthest-right point of him; his FREE hand resting closed on the dark sash at
> the front of his waist; and thrust through the sash behind his hip an EMPTY BLACK lacquered
> SCABBARD angling DOWN toward screen-LEFT behind him), standing on a solid saturated GREEN
> chroma screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His long silver-white hair, his stern face, the white short-sleeved kimono, the cloud-patterned
> navy mantle on his shoulders, the dark sash, the wide pleated hakama, the fold of white
> under-robe at his hip, his dark tabi and wooden geta, the segmented black bracer on his sword
> arm, the empty black scabbard through his sash and the whole drawn katana all stay EXACTLY the
> same the entire clip - nothing is ever added, lost, re-coloured or re-shaped, NO second sword,
> wakizashi, dagger, helmet, armour plate, headband, hat, cloak or shield ever appears, and the
> white cloud pattern on the mantle never changes. His hair, the mantle and the hakama keep the
> exact length, colour and pattern they have in the reference image and RIDE WITH HIS BODY - they
> sway only with his own motion, never stream out, never billow, never flare wide, never lift on
> any wind and never cross any edge of the frame, and NO wind, gust or moving air of any kind
> ever appears in the shot - nothing in the shot is ever blown. The drawn katana stays gripped
> ONE-HANDED in his black-bracered sword hand the entire clip - it is never released, never let
> go, never exchanged, never sheathed and never replaced by anything else, his sword hand stays
> closed on the ribbed hilt in every single frame and never slides along it, never re-seats and
> never changes its grip, his free hand never touches the katana or its hilt at any time, and no
> second katana and no other weapon or new object ever appears anywhere in the shot; the empty
> black scabbard stays thrust through his sash the entire clip, rides with his hips, is never
> drawn, never removed and never raised, and the blade is never sheathed into it. Every surface
> of him stays EXACTLY as bright as it is in the reference image - the polished blade never
> shines brighter, never glints into a flash, never flares and never blooms, nothing on him ever
> glows or lights up, and no glow, aura, beam, halo, ring of light, orb, fireball, projectile,
> wisp, mist, smoke, fog, fire or energy of any kind ever appears anywhere in the shot. The
> katana stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame:
> its tip never travels further toward screen-right than it sits in the reference image, the
> scabbard's end never travels further toward screen-left than it sits in the reference image,
> and NO PART of the katana is ever raised above the height of his own shoulders. While it is in
> his grip the katana is NEVER swung fully vertical, NEVER raised overhead and NEVER swung round
> so that its tip passes behind him - it only ever slides level along its own line, turns a short
> way about his own wrist and gripping hand, or rides with his own sinking and rising body. HIS
> FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops,
> never steps and never lunges out into a wide stance; he keeps his stance narrow and never
> spreads wider than about one and a quarter times his standing width. He stays planted on the
> same spot at the same distance from the camera the whole clip, with zero net drift in any
> direction. He stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the
> camera, and his body holds the SAME angle to camera it has in the reference image - it never
> opens further toward the viewer and never turns away. His face keeps the same stern set
> expression it has in the reference image - it never changes - and he never talks, never shouts
> and never cries out. The camera is absolutely locked, no zoom, no pan, his full body always
> fully in frame, he is the ONLY figure in frame at all times, nothing else added. He begins and
> ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. The literals below are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, following hector and gargoyle. The KO-SUFFIX
rule strips any sentence matching `keeps the ... never drops or swaps`; this character never drops
the katana in any state (his bracered fingers never open), so the lock is phrased "stays gripped
ONE-HANDED ... never released, never let go, never exchanged, never sheathed", which does not match
the strip, stays TRUE through a prone collapse, and sits in its own sentence so no strip takes the
identity lock with it. Verify on the built `ko` that both the identity sentence and the grip
sentence survive.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not GETA — the ko
rewrite matches that exact literal ("FEET NEVER LEAVE THE GROUND"); spell it any other way and the
rewrite silently misses. Consequence honoured kit-wide: NO standing state stamps, kicks or lifts a
geta — every impact is delivered flat-footed through sinks, folds, grinds and the blade. The only
knees-to-ground in the kit is the ko collapse, which the rewritten ko suffix governs.

(c) THE STANCE CLAUSE USES THE CANONICAL `he keeps his stance narrow and never spreads wider than`,
so the ko rewrite rescopes it to while-standing. Do not re-word it. The ratio stays at one and a
quarter: his subject width is set by the blade tip and the scabbard, which are bounded to their
reference extremes separately, so the feet never need more.

(d) THE WEAPON-MOTION SENTENCE deliberately does NOT contain hector's "never thrust or reached out
ahead of him" clause — every shiro recovery re-extends the blade OUT to the reference line, so that
clause would fight all 12 anchor returns. The outward bound is carried entirely by the tip cap in
the containment sentence ("never further toward screen-right than it sits in the reference image"),
stated ONCE there and at most once per beat. The height ceiling is HIS OWN SHOULDERS kit-wide;
block A's close guard deliberately rides AT that cap — do not tighten the cap later without reading
that state.

(e) THE DEBRIS TAIL ends `exactly as the first frame does.` — the NON-ko form. The assembled `ko`
is rewritten by koSuffix() to end `...anywhere in the shot.`; build BOTH `idle` and `ko` and
confirm they DIFFER at the tail. Never copy the ko tail back into this file.

(f) ONE-HANDED THROUGHOUT: no beat in this kit ever opens the sword hand, slides it along the
hilt, or brings the free hand onto the katana (budget rule 4). The free hand's two deliberate
relocations are block A (presses flat on his OWN bracered forearm, arm only, never the weapon) and
throw B (an open-palm drive through empty air); both are stated in-beat and both return it to the
sash, so "his free hand never touches the katana or its hilt at any time" is true in all 13
states, including prone in the ko.

(g) HE IS SOFT CLOTH PLUS STREAMING HAIR, THE KIT'S BIGGEST CONSISTENCY HAZARD: the suffix pins
hair, mantle and hakama to ride with the body with NO wind ever. Watch the first keyed clip for
invented hair-billow, mantle-flutter or a rising gust — that is the gale-name failure mode, and it
is identity drift plus a containment risk at the 230px left edge, not life.

(h) ROTATIONAL-LICENCE HYGIENE, file-wide: no "roll", no "pivot", no "twist" and no foot-to-foot
weight transfer anywhere in this file — not only in the gated states. Settles are written
straight-down through BOTH feet at once; every blade beat is a level slide or "turns a short way
about" his own wrist, the exemplar's accepted lever form.

(i) COUNT vs POPULATION COHERENCE: every single-burst beat here has POPULATION EQUAL TO ITS SPAWN
COUNT (3/3, 3/3, 4/4, 3/3, 3/3, 4/4, 2/2-per-pair). Only the STAGED beat (special_3's press) and
special_2's paired cadence carry a population below their clip totals, and each states its stagger
explicitly in the same sentence ("in three staged pairs", "in ones and twos ... never in one
burst").

(j) THE LEFT EDGE HAS NO RECOIL ROOM: 230px, owned by the scabbard's end and the mantle corner.
hit and ko therefore absorb DOWNWARD on the spot — the trunk folds over planted hips instead of
pitching back toward screen-left. If a fired hit drifts left, shrink the fold; the bound is
already correct.

FACING, judgement call: **NEAR-PROFILE toward screen-right, a few degrees CLOSED (turned slightly
away from camera) — NOT a strict profile**, so no line in this file orders "strict side profile".
The evidence, read at full size:
  · HEAD — the most profile-true part of him: nose, brow, stubbled jaw and a single visible eye
    silhouette cleanly against the green.
  · TORSO — the tell: the cloud-patterned mantle's BACK panel reads broadly and the chest is
    almost entirely hidden behind the near shoulder and the extended sword arm — he is a few
    degrees past side-on, closed away from the viewer, the opposite direction from hector.
  · WAIST — the free hand at the sash only just reads past the torso line; the white hip-vent
    fold shows on the near hip.
  · FEET — the decisive test: the leading foot points screen-right nearly side-on on its geta;
    the REAR foot is turned out across the line of the stance, which a strict profile would not
    show.
So every acting line says "his body angled to camera exactly as it is in the reference image and
facing screen-right", and the suffix bans the turn in BOTH directions. His face, blade line,
leading foot and every line of attack commit toward screen-right or straight down.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN BROKEN FLAGSTONE the green stays completely empty and unbroken; the ONLY things
visible are HIS OWN body, his katana and HIS OWN debris. Every piece of debris is SOLID MATERIAL -
real chips and shards of broken grey flagstone, opaque, sharp-edged, matte and lit like stone -
never a glow, never a flame, never a spark of light, never a wisp, never an aura, never mist,
never smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes
or crackles. All of it is knocked UPWARD and stays low and close to him, rising no higher than his
own waist and spreading no wider than HIS OWN STANDING FOOTPRINT - never past the toe of his
leading geta toward screen-right, never past the heel of his rear geta toward screen-left - and
every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor
and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN
ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the
one to obey.

## idle
IDLE COMBAT-READY LOOP: a master swordsman's dead-steady guard, his weight sunk and even over both
planted feet, the drawn katana held out ONE-HANDED on the exact level line it holds in the
reference image, his free hand closed on the sash at his waist. ONE slow full SETTLING of his
whole frame fills the first half of the clip and a second fills the second half, and EVERY PART of
that settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: on each settling his whole
weight sinks a fraction STRAIGHT DOWN through BOTH of his planted feet at once and rises again -
it NEVER transfers from one foot to the other and neither foot ever carries more of it than the
other - his shoulders sink a fraction STRAIGHT DOWN and lift again with neither one coming forward
and neither one going back, his head lowers a fraction STRAIGHT DOWN on his neck and rises again
without ever turning left or right, and the extended katana rides DOWN with him a finger's width
and back up, holding its exact reference angle and level height throughout, its upswept tip never
wavering toward any edge of the frame. The prop beat inside each settling: the fingers of his
sword hand re-close on the ribbed hilt one knuckle at a time WITHOUT the hand ever leaving its
grip or sliding along the hilt, and the long extended blade goes from the faintest hair's-breadth
tremble to PERFECTLY dead-level stillness - the stilling of the blade IS the beat - while the
fingers of his free hand press and re-close on the sash without leaving it. He breathes slow and
even, the rise of his chest barely lifting the white kimono, straight up and down. His long
silver-white hair and the cloud-patterned mantle hang exactly as they do in the reference image,
swaying only a hair's width with his own settling and returning to the same fall. THE LINE OF HIS
TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE
REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder
never swings round, and his chest never squares up toward the camera; he may SINK, but he never
TURNS. His face keeps its set stern expression and his gaze stays fixed toward screen-right. Feet
planted, silent, patient. Returns to the exact start pose so it loops seamlessly. Slow,
controlled, subtle motion.

## attack_strike A  (the drawn line - one level draw-cut hauled in, stopped dead through air)
STRIKE A (the drawn line): he begins in the EXACT reference stance, his body angled to camera
exactly as it is in the reference image and facing screen-right, the drawn katana already extended
level toward screen-right at his own belt height. THERE IS NO WIND-UP OF ANY KIND: he does NOT
raise the blade first, does NOT draw it back, does NOT lift it even slightly, his shoulders do NOT
rise, and NO PART of the katana travels upward before the cut - the cut starts from the exact
extension the blade ALREADY HAS in the reference image and only ever travels INWARD, riding DOWN
only as far as his own sinking body carries it. IN THE FIRST QUARTER his knees fold and his whole
mass sinks STRAIGHT DOWN over both planted feet, and through that sink his sword arm HAULS the
katana IN toward his own body in one long level hissing draw-cut through empty air: his fist comes
back beside his own leading hip and the blade slides level with it at his own belt height, staying
in the same vertical plane it holds in the reference image with its full length always seen
side-on, until the upswept tip hangs just ahead of his own leading thigh - the whole katana at
every moment NEARER to his own body than it sits in the reference image, NEVER thrust and NEVER
pushed out toward screen-right, and the further the cut travels the closer in it comes. THE CUT
HAS LANDED BY THE HALFWAY POINT and the blade never touches the ground - a clean draw-cut through
air, stopped dead by his own control. As his weight lands, the wooden sole of his rear geta grinds
hard DOWN into the stone and breaks EXACTLY THREE small chips of hard grey flagstone up off the
floor beside that foot, each chip no bigger than one knuckle of his own sword hand and each one
SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and never
haze - rising no higher than his own knee and spreading no wider than his own standing footprint -
never past the toe of his leading geta toward screen-right, never past the heel of his rear geta
toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER
MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. BOTH OF HIS FEET STAY FLAT ON THE STONE
THROUGHOUT - neither heel ever lifts. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS
HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near
shoulder never comes forward, his far shoulder never swings round, and his chest never squares up
toward the camera; he may FOLD and SINK, but he never TURNS. He HOLDS the drawn-in finish through
the third quarter, blade level beside his hip, while the last chips crumble away, and only in the
final quarter does he extend the katana slowly back OUT along the same level line to the EXACT
extension and height it has in the reference image and rise into the EXACT same reference stance,
so that he is already standing completely still in the reference pose well before the clip ends.
Level, silent, absolute.

## attack_strike_b  (the falling crescent - tip carved down to bite the stone)
STRIKE B (the falling crescent): he begins in the EXACT reference stance, his body angled to
camera exactly as it is in the reference image and facing screen-right, the drawn katana extended
level at his own belt height. THERE IS NO WIND-UP OF ANY KIND: he does NOT raise the blade first,
does NOT draw it back, and NO PART of the katana travels upward before the cut - the tip starts
from the level line it ALREADY HOLDS in the reference image and only ever travels DOWN and IN. IN
THE FIRST QUARTER his knees fold and his whole mass sinks STRAIGHT DOWN over both planted feet,
and through that sink his sword arm turns the katana tip-DOWN about his own wrist, his fist
staying low in front of his own hip: the upswept tip carves one short falling crescent DOWN and IN
through empty air until the blade hangs tip-low at his own shin height and the very tip BITES into
the flagstone just ahead of the toe of his own leading geta - the tip at every moment NEARER to
his own body than it sits in the reference image, never thrust out toward screen-right, the
falling blade staying in the same vertical plane it holds in the reference image with its full
length always seen side-on. THE BITE HAS LANDED BY THE HALFWAY POINT: the tip cracks the floor
where it strikes and EXACTLY THREE chips of hard grey flagstone burst UPWARD around the buried
tip, each chip no bigger than one knuckle of his own sword hand and each one SOLID, OPAQUE and
sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising no
higher than his own knee, staying within one hand's-breadth of the bite and never further toward
screen-right than the buried tip itself - every chip crumbling away to nothing in mid-air as it
falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. THE LINE OF HIS TWO
SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE
IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder never swings
round, and his chest never squares up toward the camera; he may FOLD and SINK, but he never TURNS.
He HOLDS the sunk finish with the tip in the stone through the third quarter while the last chips
crumble away, and only in the final quarter does he draw the tip free, the katana turning back up
about his own wrist to the EXACT level line and extension it has in the reference image as he
rises into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Short, falling, final.

## attack_throw A  (the pommel drive - hauled in tight, struck at nothing, solo-safe)
THROW A (the pommel drive): he begins in the EXACT reference stance, his body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in this clip - the drive passes through EMPTY AIR and strikes NOTHING;
nothing is ever caught, hooked, seized, lifted, dragged, carried or thrown, his free hand stays
closed on the sash and holds NOTHING, and no object of any kind ever appears anywhere in the
frame. IN THE FIRST THIRD he HAULS the drawn katana IN through empty air: his sword-hand fist
comes back beside his own ribs and the whole blade slides level with it at his own belt height
until the upswept tip hangs just ahead of his own leading thigh, the ribbed hilt and its steel
POMMEL riding close ahead of his own belly - the whole katana at every moment of this clip NEARER
to his own body than it sits in the reference image, NEVER thrust and NEVER pushed out toward
screen-right. THEN his knees fold and his entire mass drops STRAIGHT DOWN over both planted feet
in one committed sink as his sword arm drives the blunt steel POMMEL a short way DOWN and forward
through the empty air ahead of him, stopping DEAD above his own leading knee - his fist never
travelling further toward screen-right than the toe of his own leading geta below it, the level
blade riding back with the drive - a pommel blow through empty air, struck at NOTHING and stopped
by his own control. THE DRIVE HAS LANDED BY THE HALFWAY POINT. As his mass lands, the wooden sole
of his leading geta grinds hard DOWN into the stone and breaks EXACTLY FOUR chips of hard grey
flagstone up off the floor beside that foot, each chip no bigger than one knuckle of his own sword
hand and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never
smoke and never haze - rising no higher than his own knee and spreading no wider than his own
standing footprint - never past the toe of his leading geta toward screen-right, never past the
heel of his rear geta toward screen-left - every chip crumbling away to nothing in mid-air as it
falls. THERE ARE NEVER MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. He may FOLD and SINK,
but he never TURNS - his chest never squares up toward the camera and both feet stay flat and
planted. He HOLDS the sunk finish through the third quarter, fist low, blade level and close,
while the last chips crumble away, and only in the final quarter does he extend the katana slowly
back OUT along its level line to the EXACT extension and height it has in the reference image and
rise into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Compact, driving, contemptuous.

## attack_throw_b  (the open-palm drive - free hand through empty air, solo-safe)
THROW B (the open-palm drive): he begins in the EXACT reference stance, his body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in the frame at any time - the palm passes through EMPTY AIR and meets
NOTHING; nothing is ever caught, seized, gripped, pushed, lifted, dragged or thrown, and no object
of any kind ever appears anywhere in the frame. IN THE FIRST THIRD he coils STRAIGHT DOWN into a
deep crouch over both planted feet, knees folding, and DELIBERATELY his free hand leaves the sash:
it rises open, palm forward, to his own chest height close in front of his own breastbone, while
his sword arm draws the katana IN and DOWN a short way so the blade rides level and close at his
own hip height - the whole katana at every moment NEARER to his own body than it sits in the
reference image and NEVER thrust out toward screen-right. THEN he DRIVES his whole trunk a short
way toward screen-right from the hips - BOTH feet staying flat and planted exactly where they
stand, BOTH shoulders travelling together the same distance so that THE LINE OF HIS TWO SHOULDERS
AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN
EVERY SINGLE FRAME - and with the trunk drive the heel of his open FREE PALM drives a short way
forward through the empty air at his own chest height, stopping DEAD above the toe of his own
leading geta - that palm never travelling further toward screen-right than the toe of his own
leading geta below it - an open-handed blow through empty air, met by NOTHING, the hand staying
OPEN and EMPTY in every single frame; he may LEAN and SINK, but he never TURNS. THE DRIVE PEAKS BY
THE HALFWAY POINT. On the drive the wooden sole of his rear geta grinds hard DOWN into the stone
and breaks EXACTLY THREE chips of hard grey flagstone up off the floor beside that foot, each chip
no bigger than one knuckle of his own sword hand and each one SOLID, OPAQUE and sharp-edged -
never a puff, never a cloud, never dust, never smoke and never haze - rising no higher than his
own knee and spreading no wider than his own standing footprint, every chip crumbling away to
nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT
ONCE. THROUGH THE THIRD QUARTER he draws his trunk back upright over his planted hips and his free
hand returns to close on the sash at his waist while the last chips crumble away, and in the final
quarter he extends the katana back OUT along its level line to the EXACT extension and height it
has in the reference image and settles into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Coiled, driving,
empty-handed.

## attack_block A  (the close guard - blade drawn in and braced, riding AT the shoulder cap)
BLOCK-COUNTER A (the close guard): he begins in the EXACT reference stance, his body angled to
camera exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER he
SINKS his whole weight straight DOWN into a braced crouch over both planted feet, knees taking the
load, and draws the katana IN and UP a short way to a close guard across his own front: his
sword-hand fist comes back in front of his own ribs and the blade turns a short way up about his
own wrist to a shallow rising diagonal, its upswept tip capped exactly AT the height of his own
shoulder and never one finger above it, the whole katana at every moment NEARER to his own body
than it sits in the reference image - a bright steel bar set between him and the pressure.
DELIBERATELY his free hand leaves the sash and presses flat against the inside of his own
black-bracered forearm, bracing the sword arm from behind - that open palm presses on his OWN ARM
ONLY, it never touches the katana or its hilt, and the sword hand's grip never changes. HE HOLDS
THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs the pressure - both geta grind
a fraction on the stone without either one leaving the spot it stands on, his braced forearms
shudder under the load, his shoulders judder and settle straight up and down, his chin tucks a
fraction - but the guarded blade itself holds its diagonal DEAD-STILL, and nothing else in his
body travels. IN THE FINAL QUARTER he drives one short hard shove straight UP out of his knees
behind the braced blade, rising only back to his own standing height and no further, his free hand
returns to close on the sash at his waist, the katana turns back down about his own wrist and
slides out to the EXACT level line and extension it has in the reference image, and he flows in
one eased motion back into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing
breaks. Braced, immovable, silent.

## attack_block_b  (the hanging guard - blade turned low, a steel fence before his legs)
BLOCK-COUNTER B (the hanging guard): he begins in the EXACT reference stance, his body angled to
camera exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER he
drops his head a fraction, his near shoulder LIFTS STRAIGHT up a fraction under the
cloud-patterned mantle and his whole back hunches DOWN over it, his weight sinking straight DOWN
through both planted feet - and through that hunch his sword arm turns the katana tip-DOWN about
his own wrist into a low hanging guard: his fist rides in front of his own hip and the blade hangs
tip-low ahead of his own leading shin, its tip one hand's-breadth ABOVE the stone and never
touching it, at every moment NEARER to his own body than it sits in the reference image - the long
blade now a low steel fence across the front of his own legs. HE HOLDS THAT HUNCHED LOW GUARD
THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both geta grind a fraction on the stone without
leaving the spots they stand on, his neck, back and shoulders shudder under the load straight up
and down, his free hand stays closed on the sash - and the hanging blade stays DEAD-STILL, never
swinging, never rising and never dipping to touch the floor, for every frame of it. IN THE FINAL
QUARTER he drives straight up out of his knees with one short heavy shove - the top of his own
head rising no higher than it sits in the reference image - and the katana turns back up about his
own wrist and slides out to the EXACT level line and extension it has in the reference image as he
flows back into the EXACT same reference stance, so that he is already standing completely still
in the reference pose well before the clip ends. Nothing sheds and nothing breaks. Low, hunched,
immovable.

## hit  (the buckled ride - absorbed straight down, quick recover)
HIT (the buckled ride): he begins in the EXACT reference stance, his body angled to camera exactly
as it is in the reference image and facing screen-right; the blow lands and his head snaps a
fraction back and DOWN, both shoulders drop together, his spine folds and his knees buckle
STRAIGHT DOWN under it - but BOTH FEET STAY EXACTLY WHERE THEY STAND, he does not step back and he
does not skid, his hips stay over their own spot, and every bit of the recoil is absorbed DOWNWARD
into his knees, hips and folding trunk. His sword hand clamps harder on the ribbed hilt and the
whole katana is jolted straight DOWN with his folding body, holding the exact angle it has in the
reference image the whole way - it never turns, never swings and never rises, its tip dipping with
him and never travelling further toward screen-right than it sits in the reference image; his free
hand clamps the sash. His long silver-white hair and the cloud-patterned mantle are thrown a
hand's width by the jolt and settle straight back to the exact fall they have in the reference
image. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he rides it folded low through the
middle of the clip - trunk bowed over his planted hips, shoulders juddering straight up and down,
the extended blade trembling in his locked grip - his chest never squaring up toward the camera
and his back never shown. IN THE LAST THIRD he catches himself, straightens up out of his knees
and flows in one eased recovery back into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Nothing sheds and
nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in
the frame at any time, and there is no light, no flare, no wisp and no streak anywhere in the
shot. Only his own body and his own weapon move.

## ko  (cause-free collapse, ends on ground)
KO (the felled pine): he begins in the EXACT reference stance, his body angled to camera exactly
as it is in the reference image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees
give way beneath him, his head drops and his shoulders slump, and he goes STRAIGHT DOWN onto both
knees on the spot he stands on without travelling forward, the wide hakama folding beneath him.
Then he pitches slowly forward and down over his own thighs and FOLDS, and BY THE HALFWAY POINT he
has come to rest fully prone and motionless, folded down over his own knees with his head low
toward screen-right and his face still pointed that way, his long silver-white hair fallen forward
around his head and lying still. His bracered fingers never open: the drawn katana comes down WITH
him and comes to rest lying flat on the stone at a shallow slant ahead of him, still gripped in
his sword hand, its blade pointing toward screen-right along the ground with its tip finishing
NEARER to his own fallen body than it sits in the reference image and nowhere near any edge of the
frame; his free hand comes to rest at the sash, and the empty black scabbard rides down with his
hips and stays thrust through the sash. EXACTLY THREE small chips of hard grey flagstone are
knocked UPWARD where his knees strike the stone, each chip no bigger than one knuckle of his own
sword hand and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than his own fallen shoulder and staying within one
body-width of where he lands, every chip crumbling away to nothing in mid-air as it falls. THERE
ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. FOR THE WHOLE SECOND HALF OF THE
CLIP HE LIES COMPLETELY STILL - he does not stir, does not lift his head, does not push up on an
arm and he does NOT get back up - the fallen katana lies exactly where it came to rest and does
not move again, and his hair and the cloud-patterned mantle lie fallen and dead-still with him. He
is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at any
time. Only his own body and his own weapon move.

## victory  (the stilled blade - one ritual flick, then the held line, no turn to camera)
VICTORY (the stilled blade): he begins in the EXACT reference stance, his body angled to camera
exactly as it is in the reference image and facing screen-right. IN THE FIRST QUARTER he performs
the ritual settling of the blade after a kill: ONE crisp short downward FLICK of the katana - the
blade turning a short way tip-DOWN about his own wrist, the upswept tip dropping no lower than his
own knee, travelling only DOWN and IN and at every moment NEARER to his own body than it sits in
the reference image - then returning in one slow controlled turn back UP about his own wrist to
the EXACT level line and extension it has in the reference image, where it stops DEAD. FOR THE
WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT LINE in absolute stillness - the drawn katana
dead-level at his own belt height, one-handed, not a tremor in the blade - and only three small
motions live inside the hold: two slow settlings of his whole frame STRAIGHT DOWN through both
planted feet and back up, never transferring from one foot to the other; the fingers of his free
hand re-closing one by one on the sash at his waist; and ONE slow short bow of his head STRAIGHT
DOWN and back up, his face staying pointed toward screen-right throughout, his silver-white hair
swinging a fraction forward with the bow and settling straight back to the exact fall it has in
the reference image - he never turns his head or his body toward the camera at any point, and his
chest never squares up toward the viewer. His expression stays set and stern and he makes no
sound. IN THE FINAL QUARTER he sinks one last fraction STRAIGHT DOWN through both planted feet and
rises once more into the EXACT same reference stance - the blade already on its reference line -
so that he is already standing completely still in the reference pose well before the clip ends.
Nothing sheds and nothing breaks. Composed, ceremonial, absolute.

## special_1  (THE STILLED GALE) — slow inward compression, one blinding level release, frozen finish
SPECIAL FINISHER (the stilled gale): he begins in the EXACT reference stance, his body angled to
camera exactly as it is in the reference image and facing screen-right. ACROSS THE FIRST THIRD OF
THE CLIP he compresses with agonising slowness: his knees fold and his whole mass sinks STRAIGHT
DOWN over both planted feet into a deep coiled crouch while his sword arm HAULS the drawn katana
slowly IN through empty air, his fist coming back beside his own ribs and the blade sliding level
with it at his own belt height, staying in the same vertical plane it holds in the reference image
with its full length always seen side-on, until the upswept tip hangs just ahead of his own
leading thigh - the whole katana at every moment NEARER to his own body than it sits in the
reference image, the narrowest this silhouette ever becomes, loaded like a drawn bow. THEN, IN ONE
SINGLE TENTH OF THE CLIP, THE GALE: he DRIVES straight UP out of both folded knees to his full
reference height in the same breath as his sword arm sends the blade back OUT along the exact same
level line in one blinding level cut through empty air - the fastest single motion in his whole
repertoire - and stops it DEAD at the EXACT extension and height the katana has in the reference
image, the stop so absolute that the long blade quivers once from hilt to tip while his whole mass
lands STRAIGHT DOWN through both planted feet. As the cut stops, the wooden soles of BOTH geta
grind hard DOWN into the stone at once and break EXACTLY FOUR chips of hard grey flagstone up off
the floor, two beside each foot, each chip no bigger than one knuckle of his own sword hand and
each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and
never haze - rising no higher than his own waist and spreading no wider than his own standing
footprint - never past the toe of his leading geta toward screen-right, never past the heel of his
rear geta toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE
ARE NEVER MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. FROM THE FORTY PERCENT MARK TO THE
END OF THE CLIP HE DOES NOT MOVE AGAIN - the frozen finish IS the finisher: he stands already in
the EXACT reference stance holding the level line while the quiver dies out of the blade through
the third quarter, the last chips crumble to nothing in mid-air, his hair and the cloud-patterned
mantle settle back to the exact fall they have in the reference image, and one slow controlled
breath sinks his shoulders STRAIGHT DOWN a fraction and lifts them again - so that he is standing
completely still in the reference pose for the entire final quarter of the clip. Both feet stay
flat on the stone throughout; he may COIL and SINK, but he never TURNS. Stillness, one cut,
stillness.

## special_2  (THE THREE BREATHS) — three measured falling crescents, the tip tolling the same stone
SPECIAL FINISHER (the three breaths): he begins in the EXACT reference stance, his body angled to
camera exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP OF ANY
KIND: he does NOT raise the blade first and does NOT draw it back - each cut starts from the level
line the katana ALREADY HOLDS in the reference image and travels only DOWN and IN. ACROSS THE
FIRST SIXTY PERCENT OF THE CLIP he carves the upswept tip down into the flagstone just ahead of
the toe of his own leading geta THREE times, slow and measured as three long breaths - on each cut
his knees fold and his whole mass sinks a short way STRAIGHT DOWN over both planted feet as his
sword arm turns the katana tip-DOWN about his own wrist, the tip carving the same short falling
crescent DOWN and IN through empty air to BITE the stone at the same spot each time, his fist
riding in front of his own hip the whole time and the falling blade staying in the same vertical
plane it holds in the reference image - and between cuts the katana turns back up about his own
wrist only to the level line and extension it holds in the reference image, never higher and never
further out. EACH BITE knocks EXACTLY TWO chips of hard grey flagstone UPWARD around the buried
tip, each chip no bigger than one knuckle of his own sword hand and each one SOLID, OPAQUE and
sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising no
higher than his own knee, staying within one hand's-breadth of the bite and never further toward
screen-right than the buried tip itself - and BOTH chips of each bite crumble away to nothing in
mid-air before the next cut lands, so THERE ARE NEVER MORE THAN TWO PIECES OF DEBRIS IN THE FRAME
AT ONCE and SIX chips break in total across the clip, in three staged pairs, never in one burst.
AFTER THE THIRD BITE he holds the final cut dead-still through the third quarter, tip in the
stone, his shoulders juddering straight up and down under his own braced weight, while the last
chips crumble away, and IN THE FINAL QUARTER he draws the tip free, the katana turns back up about
his own wrist to the EXACT level line and extension it has in the reference image, and he rises
into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Measured, ceremonial, inevitable.

## special_3  (THE MOUNTAIN PRESS) — the tip set to the stone and his whole mass poured down the blade
SPECIAL FINISHER (the mountain press): he begins in the EXACT reference stance, his body angled to
camera exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP OF ANY
KIND: he does NOT raise the blade first, does NOT draw it back, and NO PART of the katana travels
upward before the press - it starts from the level line it ALREADY HOLDS in the reference image
and only ever goes DOWN. IN THE FIRST QUARTER his sword arm turns the katana tip-DOWN about his
own wrist and SETS the upswept tip down - not strikes it - onto the flagstone just ahead of the
toe of his own leading geta, his fist riding in front of his own hip, the tip at every moment
NEARER to his own body than it sits in the reference image and the blade staying in the same
vertical plane it holds in the reference image. FROM THE QUARTER MARK TO THE SEVENTY PERCENT MARK
he POURS his whole mass down the blade: his knees fold, his hips sink, his chest comes down over
his leading knee and his sword arm bears DOWN on the grounded katana, both feet flat and planted,
his free hand pressing closed on the sash - and under the grinding steel tip the floor GIVES WAY
IN STAGES: EXACTLY SIX chips of hard grey flagstone break loose in ones and twos spread across the
length of the press, never in one burst, each chip no bigger than one knuckle of his own sword
hand and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never
smoke and never haze - knocked UPWARD no higher than his own knee, staying within one
hand's-breadth of the buried tip and never further toward screen-right than the buried tip itself,
every chip cracking apart and crumbling away to nothing in mid-air as it falls. THERE ARE NEVER
MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. Through the whole press the grounded tip
GRINDS on its spot without ever sliding out toward screen-right and without ever lifting, his
shoulders judder straight up and down under the load, and he may FOLD and SINK, but he never TURNS
- his chest never squares up toward the camera. IN THE FINAL THIRTY PERCENT he eases his weight
back up off the blade, draws the tip free of the broken stone, the katana turns back up about his
own wrist to the EXACT level line and extension it has in the reference image, and he rises into
the EXACT same reference stance, so that he is already standing completely still in the reference
pose well before the clip ends. Slow, crushing, inexorable.
