# JOROGUMO-KUSARIGAMA — MK FINAL playable. Full 13-clip kit. Written 2026-08-01 against KIT-WRITING-BRIEF (§2b/§2c/§4b/§4c/§5b applied, plus bound-vs-anchor, hands-by-function, suffix hygiene).
#
# FIRST-CLIP WATCHES (author's):
#   · WEB-SHOOTING INVENTION — a spider character invites silk. She has NONE: no web is ever shot,
#     spun, cast or trailed in any state. New web, silk, thread, web-line and cocoon are banned BY
#     NAME in the suffix; if any strand appears the clip is dead — reroll, do not negotiate.
#   · THE SICKLE TIP OWNS THE RIGHT EDGE at 212px — and the chain is the classic long-extending
#     prop. No beat in this kit throws, whips, whirls or casts it; every chain beat is a fall, a
#     drag, a draw-IN or a ride. If RIGHT ever flags, shrink the beat's reach, not the bound.
#   · THE FOUR SPIDER LEGS OWN THE LEFT EDGE at 212px. Every leg beat is a fold IN toward her body
#     or a plant DOWN; nothing ever flares or spreads. If LEFT ever flags, shrink the fold.
#   · MEMBRANE DRIFT — the cyan web membranes between chain arm and torso are REAL translucency
#     (transl 5.98 with grnDom only 8.9). The suffix pins their size, shape, thickness, opacity and
#     brightness to the reference. Watch the first keyed clip for thinning, spreading, brightening
#     or mist-conversion; any of those is drift plus a key hazard.
#   · LIVING-CHAIN DRIFT — the chain must never animate itself, lengthen, or strike on its own.
#     Length and thickness are locked by name in the suffix.
#   · RE-GRIP — the FREE hand never touches handle, cord, chain or sickle in any state. If a render
#     shows a second hand on the weapon, that is a re-grip defect.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/jorogumo-kusarigama-anchor-green.png`,
pre-screened and cleared before this kit was written (ROSTER-VERDICTS: OK, phase 185): opaque
12.56, emissive 0.25, p99 5.9 — keys with margin. Translucency 5.98 with grnDom only 8.9, i.e.
REAL mild see-through from the cyan web membranes, not a green confound — so the membranes are
PINNED, not re-described. She is a back-three-quarter figure whose head faces SCREEN-RIGHT; no
hflip anywhere in this kit. The two facts that shape every line below: the SICKLE tip of the
kusarigama is the rightmost pixel of the subject (the cord and chain already spend their whole
reach toward screen-right in the anchor) and the FOUR SPIDER LEG tips are the leftmost — both
margins are only 212px with a 1.38x span ceiling — so this kit contains NO cast, no whirl, no
lunge and no leg-spread anywhere: every attack travels DOWN or IN, inside the reach the chain and
the legs already have, and body commitment is bought with depth, never with reach.

## ★ JOROGUMO-KUSARIGAMA FRAME BUDGET — measured, applies to EVERY clip of hers

Plate 1536x1536. Full subject **1112w x 1044h** (fills 68% of frame height — that is a RESOLUTION
budget: the engine upscales, so no beat may shrink her, move her off her spot or carry her away
from the camera).
  LEFT **212px** · RIGHT **212px** · HEADROOM **468px** · bottom free (boot soles on the floor
  line — `check-containment.mjs` treats feet-on-floor as expected and never counts it).
  Max spanPeak that still fits: **1.38x** — TIGHT, the same class as elara-frostplate. The
  standing width already includes the chain's full reach right AND the spider legs' full arch
  left, so the working ceiling for every beat is the reference span itself.

WHO OWNS EACH EDGE:
  · **RIGHT x1324** — the twin-pointed SICKLE blade at the end of the cord-and-chain, riding at
    her own waist height: the forward-most point of the whole subject. The sickle tip is THE
    right-containment subject of this kit — bound the TIP, never her hands.
  · **LEFT x212** — the pointed TIPS of the UPPER SPIDER-LEG pair arching out toward screen-left,
    with the lower-left leg beneath them and her rear boot's heel further in. The leg tips are THE
    left-containment subject — bound the TIPS, reference-relative.
  · **TOP y468** — the crown of her own head (the gathered dreadlock bundle). The upper spider-leg
    joints ride just BELOW it at her jaw height, so the leg ceiling is the head-crown, NOT her
    shoulders. The kusarigama rides far lower, at her waist, so ITS ceiling is her shoulders.
  · **BOTTOM** — boot soles flat on the floor line.

  1. **THE CHAIN NEVER GAINS REACH — the kit's first law.** The sickle tip never travels further
     toward screen-right than it reaches in the reference image and no part of the kusarigama ever
     rises above her own shoulders. Every chain beat is a FALL, a DRAG along the ground, a DRAW-IN
     toward her own body, or a ride on her own sinking and rising body. A throw, a whip-crack, a
     whirl, an overhead swing and a circling spin were not "bounded" out — they were never
     designed in. A chain weapon that circles cannot be contained in 212px margins.
  2. **THE LEGS NEVER GAIN SPREAD.** Every spider-leg beat folds IN toward her body or plants
     straight DOWN; tips stay reference-relative left and under the head-crown ceiling. The legs
     buy the kit its signature floor work (throw B's pin, special_3's lockdown) without ever
     lifting a human sole or spending one pixel of the left margin.
  3. **WIND-UP-FREE BY DESIGN.** The chain already starts extended in the reference, so every
     strike starts from the reach and height it ALREADY HAS and travels only DOWN and IN. In-clip
     bounds are REFERENCE-RELATIVE ("never further than it reaches in the reference image"), never
     absolute "no upward travel ever" — the anchor return must re-rise to the reference curve, and
     an absolute ban would contradict the return itself (§2c).
  4. **GRIPS ARE FIXED.** The chain hand stays closed on the corded handle in all 13 states, prone
     included; the FREE hand never touches the weapon in any state and relocates deliberately in
     exactly ONE state (throw B's empty-air close), returning in-beat. A re-grip is a containment
     event and this kit has none.
  5. **EFFECTS ARE BROKEN FLAGSTONE ONLY, SOURCED FROM THE FLOOR** — a continuous surface that
     cannot visibly deplete — never chipped off her chitin, her gear or the weapon, which are
     countable identity features, and NEVER anything web-like or wet: no silk, no strand, no
     venom, no droplets, ever. Every debris sentence carries an exact COUNT, a per-piece SIZE tied
     to one link of her own chain, a SPAN tied to the named impact point, a POPULATION bound, and
     the inline solidity clause in the same sentence. No banned-class noun in any beat: no dust,
     no smoke, no spray, no mist, no vapour, no flash, no glow.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME jorogumo spider-woman from the reference image (a lean athletic woman seen from
> BEHIND in a back three-quarter view, her bare back to the camera and her head turned in profile
> facing screen-RIGHT; pale grey-white skin; one visible RED eye and black spider-leg MARKINGS
> painted across her brow and cheek; black hair in thick dreadlock braids gathered back into a low
> bundle; a black spider TATTOO between her shoulder blades; crossed RED cloth straps over her
> bare back and a red SASH at her waist with a small silver web-pattern CLASP at the small of her
> back and long red sash tails hanging beside her leading thigh; black trousers, steel-plated
> GREAVES bound with red wrappings, and dark armoured BOOTS; black-and-red bandage WRAPS on both
> forearms; FOUR jointed SPIDER LEGS of black chitin banded with dark red growing from her back -
> the UPPER PAIR arching up beside her head and out toward screen-LEFT with their pointed tips the
> furthest-left points of her, the LOWER PAIR at her hips, one arching low toward screen-left and
> one crossing low ahead of her with its pointed tip reaching down in front of her leading thigh;
> pale CYAN spiderweb MEMBRANES stretched in the gaps between her extended chain arm and her
> torso, and a thin cyan rim-light along her limbs; her CHAIN HAND extended toward screen-RIGHT at
> her own waist height, closed round the black corded HANDLE of her KUSARIGAMA with a short loop
> of slack chain hanging beneath her fist, the weapon's long dark woven CORD sweeping out LOW
> toward screen-right and joining a grey steel CHAIN that ends in a curved twin-pointed steel
> SICKLE blade with a red-bound collar, the sickle riding at her own waist height with its tip the
> furthest-right point of her; her FREE arm bent with its hand tucked ahead of her far hip, mostly
> hidden beyond her own body; standing in a wide grounded stance, leading boot toward screen-right,
> rear boot planted back), standing on a solid saturated GREEN chroma screen (bright green #00b140,
> nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> Her pale grey-white skin, her red eye and the black spider markings on her face, her dreadlock
> braids, the spider tattoo on her back, the crossed red straps, the red sash and its silver web
> clasp, her black trousers, greaves, red wrappings, boots and forearm wraps, all FOUR chitin
> spider legs and the ENTIRE kusarigama - corded handle, slack chain loop, woven cord, steel chain
> and twin-pointed sickle - all stay EXACTLY the same the entire clip - nothing is ever added,
> lost, re-coloured or re-shaped, and NO armour, helmet, cloak, mask, second weapon or new object
> ever appears. The kusarigama stays gripped in her chain hand the entire clip - it is never
> released, never let go, never exchanged and never replaced by anything else, that hand stays
> closed round the corded handle in every single frame, the handle never changes hands and her
> free hand never touches the handle, the cord, the chain or the sickle; the cord, the chain and
> the sickle keep the SAME length and the SAME thickness they have in the reference image the
> whole clip - the chain never grows, never lengthens, never stretches, never splits and never
> multiplies - and no second kusarigama and no other weapon ever appears anywhere in the shot. All
> FOUR spider legs stay ATTACHED to her back the entire clip and keep the same length, thickness
> and red-banded chitin they have in the reference image - they never lengthen, never multiply and
> never detach; their pointed tips never reach further toward screen-LEFT than they reach in the
> reference image, NO part of any spider leg ever rises above the crown of her own head, and the
> legs may flex, curl IN toward her own body and plant DOWNWARD onto the ground, but they never
> lash out, never spread wider than they sit in the reference image and never reach toward any
> edge of the frame. The pale cyan spiderweb membranes stretched between her chain arm and her
> torso and the thin cyan rim-light along her limbs stay EXACTLY as they are in the reference
> image the entire clip - the same size, the same shape, the same thickness and the same opacity,
> and exactly as bright as they are in the reference image - they never grow, never stretch, never
> spread, never thin, never fade, never brighten, never flare and never turn to mist; every other
> surface of her stays EXACTLY as bright as it is in the reference image, nothing on her ever
> glows or lights up, NO new web, NO strand of silk, NO thread, NO web-line and NO cocoon of any
> kind ever appears anywhere in the shot - nothing is ever spun, shot, cast, trailed or thrown
> from her hands, her spider legs or her body - and no glow, aura, beam, halo, ring of light, orb,
> fireball, projectile, wisp, mist, vapour, smoke, fog, fire, venom, dripping liquid or energy of
> any kind ever appears anywhere in the shot. The kusarigama stays FULLY INSIDE the frame at ALL
> times and NEVER extends past any edge of the frame: the sickle's tip never travels further
> toward screen-right than it reaches in the reference image, no part of the kusarigama ever
> travels further toward screen-left than her own body, and NO PART of it - handle, cord, chain or
> sickle - ever rises above the height of her own shoulders. While it is in her grip the
> kusarigama is NEVER thrown, NEVER cast out, NEVER flung, NEVER whipped out toward screen-right,
> NEVER cracked, NEVER whirled, NEVER spun in a circle, NEVER swung overhead and NEVER swung round
> behind her - the cord and chain only ever hang slack, fall, drag, draw IN toward her own body or
> ride with her own sinking and rising body, and the sickle only ever falls, drags along the
> ground or rides with the chain. HER FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - she never
> jumps, never leaps, never hops, never steps and never lunges out into a wide stance; she keeps
> her stance narrow and never spreads wider than the stance she already holds in the reference
> image. She stays planted on the same spot at the same distance from the camera the whole clip,
> with zero net drift in any direction. She stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera, and her body holds the SAME angle to camera it has in the
> reference image - the camera sees her back exactly as the reference does, her chest never comes
> round toward the viewer and she never turns further away. Her face keeps the same cold sidelong
> expression it has in the reference image and she never talks, never shouts and never cries out.
> The camera is absolutely locked, no zoom, no pan, her full body always fully in frame, she is
> the ONLY figure in frame at all times, nothing else added. She begins and ends on the EXACT same
> reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>`
line into the fired prompt, so an operator note written inside the blockquote is sent to the model
as an instruction. The literals below are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, following reef-maw and elara. The KO-SUFFIX
rule strips any sentence matching `keeps the ... never drops or swaps`; this character never lets
go of the kusarigama in any state (her chain hand never opens, even prone), so the lock is phrased
"stays gripped in her chain hand ... never released, never let go, never exchanged", which does
not match the strip, stays TRUE through the collapse, and sits in its own sentence so no strip can
take the identity lock with it. Verify on the built `ko` that the identity, grip, leg and membrane
sentences all survive.

(b) `HER FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET — the ko rewrite
matches that exact literal ("FEET NEVER LEAVE THE GROUND"); spell it any other way and the rewrite
silently misses. Consequence honoured kit-wide: NO standing state kneels, stamps or lifts a sole —
ALL floor work is delivered by the SICKLE and by the SPIDER-LEG TIPS (which are not her feet),
plus flat-soled grinds. The only knees-to-ground in the kit is the ko collapse, which the
rewritten ko suffix governs.

(c) THE STANCE CLAUSE USES THE CANONICAL `she keeps her stance narrow and never spreads wider
than`, so the ko rewrite rescopes it to while-standing and carries her pronouns through. Do not
re-word it. The ceiling is "the stance she already holds in the reference image" — ZERO widening
licence, because the measured 1.38x span ceiling is tied for tightest in the roster and her
reference stance is already wide.

(d) TWO DIFFERENT HEIGHT CEILINGS, both checked against the anchor (the ir41 bound-vs-anchor
class): the KUSARIGAMA's ceiling is her own SHOULDERS — valid, because the whole weapon rides at
her waist in frame 0, well below them (block B deliberately rides AT this cap with the raised
forearm). The SPIDER LEGS' ceiling is the CROWN OF HER OWN HEAD, NOT her shoulders — a shoulder
cap was REJECTED because the upper leg joints already ride at her jaw height in frame 0 and would
contradict the anchor. Their leftward bound is reference-relative on the TIPS. Do not tighten
either cap later without reading block B (weapon cap) and victory (leg display).

(e) THE DEBRIS TAIL ends `exactly as the first frame does.` — the NON-ko form. The assembled `ko`
is rewritten by koSuffix() to end `...anywhere in the shot.`; build BOTH `idle` and `ko` and
confirm they DIFFER at the tail. Never copy the ko tail back into this file.

(f) THE FREE HAND's reference station is tucked ahead of her far hip, mostly hidden beyond her own
body. It relocates deliberately in exactly ONE state — throw B's close on empty air at her own
chest height — and returns to its station in-beat. It NEVER touches the kusarigama in any state;
the suffix bans it by name. The chain hand's grip never changes in all 13 states, prone included.

(g) THE CYAN WEB MEMBRANES ARE REAL TRANSLUCENCY (measured transl 5.98, grnDom only 8.9 — not a
green confound), so the suffix pins size, shape, thickness, OPACITY and BRIGHTNESS to the
reference and bans mist-conversion. No beat ever stretches the membrane gap: the chain arm never
sweeps wide of the reference arc in any state, so the membranes are never pulled. Watch the first
keyed clip for thinning or bloom.

(h) ROTATIONAL-LICENCE HYGIENE, file-wide: no "roll", no "pivot", no "twist" and no foot-to-foot
weight transfer anywhere in this file — not only in the gated states. Settles are written
straight-down through BOTH feet at once; every chain beat is a fall, a drag, a draw-IN or a ride;
every leg beat is a curl-in, a plant or a lift-back; the trunk may FOLD and SINK but never TURNS.

(i) COUNT vs POPULATION COHERENCE: burst beats have population EQUAL to spawn (strike A 3/3,
throw A 5/5, throw B 4/4, ko 3/3); staged beats have population BELOW spawn with the staging
stated in the same sentence (strike B 4 spawned one after another / never more than 2; special_1
2 per toll, six total in three staged pairs / never more than 2; special_2 6 in ones and twos /
never more than 3; special_3 6 in ones and twos / never more than 3). Blocks, hit, victory and
idle shed nothing.

(j) THE LEFT EDGE HAS NO RECOIL ROOM: 212px, owned by the spider-leg tips, which RIDE WITH HER
TORSO — any leftward body snap pushes them past their reference x. hit and ko therefore absorb
DOWNWARD on the spot with zero leftward travel, and on the jolt the legs CLENCH IN toward her
back, never flare. If a fired hit drifts left, shrink the fold; the bound is already correct.

FACING, judgement call: **BACK THREE-QUARTER, head in profile toward screen-right — NOT strict
side profile**, so no line in this file orders "strict side profile". The evidence, read at full
size:
  · TORSO — the camera reads her full bare BACK: the spider tattoo between her shoulder blades,
    the crossed straps and the sash clasp at the small of her back all read fully; no chest line
    is visible at all.
  · HEAD — the most profile-true part of her: brow, nose, chin and a single visible red eye
    silhouette cleanly against the green, facing screen-right.
  · FEET — the decisive test: the LEADING boot points screen-right nearly side-on, but the REAR
    boot is turned out toward lower screen-left and shows the top of its instep. One clear instep
    is enough to fail strict profile.
So every acting line says "her body angled to camera exactly as it is in the reference image and
facing screen-right", and the suffix pins the angle in BOTH directions — the guarded rotation is
her chest coming round toward the viewer, and equally she never turns further away. Her gaze, the
chain's line and every line of attack in the kit commit toward screen-right or straight down.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HER OWN BROKEN FLAGSTONE the green stays completely empty and unbroken; the ONLY things visible are HER OWN body, her four spider legs, her kusarigama and HER OWN debris. Every piece of debris is SOLID MATERIAL - real chips and shards of broken hard grey flagstone, opaque, sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light, never a wisp, never an aura, never mist, never smoke, never a web, never a strand of silk, never venom, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles. All of it is knocked UPWARD and stays low and close to her, rising no higher than her own waist and spreading no wider than HER OWN STANDING FOOTPRINT plus one hand's-breadth - never further toward screen-right than the sickle reaches in the reference image, never further toward screen-left than her own spider-leg tips reach in the reference image - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a web-spider's dead-steady patience, her weight sunk and even over both
planted boots, the kusarigama held out toward screen-right in the exact low lazy curve it has in
the reference image, her free hand tucked ahead of her far hip. ONE slow full SETTLING of her
whole frame fills the first half of the clip and a second fills the second half, and EVERY PART of
that settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: on each settling her whole
weight sinks a fraction STRAIGHT DOWN through BOTH of her planted feet at once and rises again -
it NEVER transfers from one foot to the other and neither foot ever carries more of it than the
other - her shoulders sink a fraction STRAIGHT DOWN and lift again with neither one coming
forward and neither one going back, her head lowers a fraction STRAIGHT DOWN on her neck and
rises again without ever turning left or right, and the whole extended cord-and-chain rides DOWN
with her a finger's width and back up, holding its exact reference curve, the sickle staying on
its reference spot. The prop beats inside each settling: the short loop of slack chain hanging
beneath her fist sways a hair with the sink and stills again; the very TIP of the sickle dips a
half-fist's width STRAIGHT DOWN off its reference spot and rises back onto it - never travelling
further toward screen-right and never rising above the height it holds in the reference image -
while the fingers of her chain hand re-close on the corded handle one knuckle at a time WITHOUT
the hand ever leaving its station; and the pointed tips of her four spider legs FLEX a finger's
width and re-still, each tip staying on its own reference arc, never reaching further toward
screen-left and never rising. She breathes slow and even, straight up and down; the cyan web
membranes ride with her arm, exactly as they are in the reference image. THE LINE OF HER TWO
SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE
IMAGE IN EVERY SINGLE FRAME - her near shoulder never swings back, her far shoulder never comes
round, and neither her chest nor the flat of her back ever squares up toward the camera; she may
SINK, but she never TURNS. Her red eye keeps its cold sidelong watch toward screen-right. Feet
planted, silent, patient as a web. Returns to the exact start pose so it loops seamlessly. Slow,
controlled, subtle motion.

## attack_strike A  (the harvest hook — falling sickle-bite beside the leading boot)
STRIKE A (the harvest hook): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right, the kusarigama already extended
toward screen-right at her own waist height in its reference curve. THERE IS NO WIND-UP OF ANY
KIND: she does NOT draw the chain back, does NOT lift it, her shoulders do NOT rise, and NO PART
of the kusarigama ever travels further toward screen-right than it reaches in the reference image
or above the height it holds there - the strike starts from the reach and height the chain
ALREADY HAS and only ever travels DOWN and IN. IN THE FIRST QUARTER her knees fold and she DROPS
her whole weight STRAIGHT DOWN over both planted feet in one committed sink, trunk folding over
her leading knee - and through that same sink her CHAIN HAND hauls the corded handle sharply DOWN
and IN to her own hip, the pull running out along the cord and chain in one heavy wave: the
sickle carves one falling arc DOWN and IN through the empty air on her screen-right side and
BITES its twin points into the flagstone just beside the toes of her leading boot - landing
NEARER her own body than the sickle reaches in the reference image, never further toward
screen-right. THE BITE HAS LANDED BY THE HALFWAY POINT. Where the points strike, EXACTLY THREE
small chips of hard grey flagstone burst UPWARD around them, each chip no bigger than one link of
her own chain and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never
dust, never smoke and never haze - rising no higher than her own knee, staying within one
hand's-breadth of the bite and never further toward screen-right than the sickle reaches in the
reference image - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER
MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. BOTH OF HER FEET STAY FLAT ON THE STONE
THROUGHOUT - neither heel ever lifts. THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS
HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her near
shoulder never swings back, her far shoulder never comes round, and neither her chest nor the
flat of her back ever squares up toward the camera; she may FOLD and SINK, but she never TURNS.
She HOLDS the sunk finish through the third quarter, the points in the stone and the cord in one
low taut line, while the last chips crumble away, and only in the final quarter does she ease the
handle back out, the points pulling free and the sickle easing back OUT low - only as far as its
reference reach and only up to the height it holds in the reference image - as the cord and chain
settle back into their exact reference curve and she rises into the EXACT same reference stance,
so that she is already standing completely still in the reference pose well before the clip ends.
Heavy, hooked, final.

## attack_strike_b  (the reel rip — the sickle set down and dragged in along the stone)
STRIKE B (the reel rip): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP OF ANY KIND:
she does NOT draw the chain back, does NOT lift it, and NO PART of the kusarigama ever travels
further toward screen-right than it reaches in the reference image or above the height it holds
there - everything the weapon does in this clip is a fall, a drag IN toward her own body, and the
eased return to its reference place. IN THE FIRST QUARTER her knees fold and her weight sinks
STRAIGHT DOWN over both planted feet, and her chain hand LOWERS the corded handle so the sickle
SETS down - lowered, not struck - onto the flagstone a short way ahead of her leading boot's
toes, well INSIDE the reach it already has in the reference image. THEN, THROUGH THE SECOND
QUARTER, she RIPS the handle hard back IN to her own hip in one heavy pull and drags the twin
points a SHORT way in along the stone toward her own leading boot, the points plowing a shallow
furrow as they come - the sickle travelling only along the floor and only TOWARD her, the cord
and chain folding slack closer to her own body than they sit in the reference image, no part of
the weapon rising above the height it holds there. Along that short furrow EXACTLY FOUR chips of
hard grey flagstone break loose ONE AFTER ANOTHER, never in one burst, each chip no bigger than
one link of her own chain and each one SOLID, OPAQUE and sharp-edged - never a puff, never a
cloud, never dust, never smoke and never haze - rising no higher than her own shin, staying
within one hand's-breadth of the furrow and never further toward screen-right than where the
sickle first set down - each chip crumbling away to nothing in mid-air before the drag moves on,
so THERE ARE NEVER MORE THAN TWO PIECES OF DEBRIS IN THE FRAME AT ONCE. THE RIP IS DONE BY THE
HALFWAY POINT, the sickle resting on the stone beside her leading boot's toes. THE LINE OF HER
TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE
REFERENCE IMAGE IN EVERY SINGLE FRAME - her near shoulder never swings back, her far shoulder
never comes round, and neither her chest nor the flat of her back ever squares up toward the
camera; she may FOLD and SINK, but she never TURNS. She HOLDS the sunk finish with the sickle
beside her boot through the third quarter while the last chips crumble away, and only in the
final quarter does she lift the sickle off the stone and ease the handle back out ahead of her,
the cord and chain unfurling ONLY as far as their reference reach and the sickle settling back
onto its exact reference spot, as she rises into the EXACT same reference stance, so that she is
already standing completely still in the reference pose well before the clip ends. Short, raking,
vicious.

## attack_throw A  (the chain-bed slam — the whole cord-and-chain beaten flat, solo-safe)
THROW A (the chain-bed slam): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in this clip - nothing is ever caught, wrapped, hooked, snared,
dragged or carried by the chain at any time, the chain closes round NOTHING, and the ONLY thing
the weapon touches is the bare flagstone. IN THE FIRST THIRD she hauls the corded handle DOWN and
IN to her own belt in one slow loading pull while her knees fold and her trunk folds forward over
her leading knee, the whole cord-and-chain length swinging DOWN in one piece below the height it
holds in the reference image - and THEN she pours her whole weight down her chain arm and BEATS
the whole length FLAT onto the flagstone in one line on her screen-right side, from just ahead of
her own boots outward, every part of it landing INSIDE the reach it already has in the reference
image and the sickle finishing on the stone NEARER her own body than its reference reach. THE
SLAM HAS LANDED BY THE HALFWAY POINT. Along the line where the length strikes, EXACTLY FIVE chips
of hard grey flagstone burst UPWARD in a row, each chip no bigger than one link of her own chain
and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke
and never haze - rising no higher than her own knee, each staying within one hand's-breadth of
the lying length and never further toward screen-right than the sickle's own landing spot - every
chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN FIVE PIECES OF
DEBRIS IN THE FRAME AT ONCE. She may FOLD and SINK, but she never TURNS - neither her chest nor
the flat of her back ever squares up toward the camera, and both feet stay flat and planted. She
HOLDS the low finish through the third quarter, half-sunk, the length lying flat and dead-still
along the stone, her spider-leg tips holding their reference arcs, her shoulders juddering
straight up and down under her own weight, while the last chips crumble away. Only in the final
quarter does she draw the handle back up and IN, the length peeling up off the stone from handle
toward sickle and easing back into its exact reference curve with the sickle settling back onto
its reference spot, as she rises into the EXACT same reference stance, so that she is already
standing completely still in the reference pose well before the clip ends. Grounded, crushing,
final.

## attack_throw_b  (the widow's pin — spider-leg stake plus a close on empty air, solo-safe)
THROW B (the widow's pin): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in the frame at any time - her free hand closes on NOTHING and STAYS
EMPTY in every single frame, nothing is ever held, caught, seized, dragged or carried, and the
spider leg strikes ONLY the bare flagstone. IN THE FIRST THIRD she coils STRAIGHT DOWN into a
deep crouch over both planted feet, knees folding, while her chain hand holds its exact reference
station so the whole kusarigama stays exactly where it rides in the reference image and takes no
part - and DELIBERATELY her free hand leaves its station ahead of her far hip and rises OPEN to
her own chest height, close ahead of her own body. THEN, BY THE HALFWAY POINT, the low CROSSING
spider leg - the one whose pointed tip already hangs down ahead of her leading thigh in the
reference image - STABS STRAIGHT DOWN along its own line and drives its point into the flagstone
in front of her leading boot, directly below the place its tip holds in the reference image and
never further toward screen-left or screen-right than that place, while in the same beat the open
free hand sweeps one short flat arc through the EMPTY AIR at her own chest height and CLOSES ON
NOTHING, stopping directly above the toes of her own leading boot - THAT HAND CLOSES ON EMPTY AIR
AND STAYS EMPTY IN EVERY SINGLE FRAME, and it comes away still empty. Where the leg-point
strikes, EXACTLY FOUR chips of hard grey flagstone burst UPWARD around it, each chip no bigger
than one link of her own chain and each one SOLID, OPAQUE and sharp-edged - never a puff, never a
cloud, never dust, never smoke and never haze - rising no higher than her own knee, staying
within one hand's-breadth of the planted point and never further toward screen-right than the
toes of her leading boot - every chip crumbling away to nothing in mid-air as it falls. THERE ARE
NEVER MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. Both feet stay flat and planted; THE
LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN
THE REFERENCE IMAGE IN EVERY SINGLE FRAME - she may FOLD and SINK, but she never TURNS. She HOLDS
the pinned finish through the third quarter - the leg-point in the stone, the closed fist in the
air, the other three legs holding their reference arcs - while the last chips crumble away, and
in the final quarter the leg-point pulls free and lifts back to the exact arc it holds in the
reference image, her free hand returns to its station ahead of her far hip, and she rises into
the EXACT same reference stance, so that she is already standing completely still in the
reference pose well before the clip ends. Coiled, staked, empty-handed.

## attack_block A  (the chitin cage — all four legs folded in, chain gathered close)
BLOCK-COUNTER A (the chitin cage): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER she
SINKS her whole weight straight DOWN into a braced crouch over both planted feet and draws the
corded handle IN against her own sternum, the cord and chain folding IN with it into TWO heavy
slack loops hanging close ahead of her own body - every part of the weapon finishing NEARER her
own body than it sits in the reference image, the sickle hanging low by her own knee, no part of
it rising above the height it holds in the reference image - while all FOUR spider legs draw IN:
the upper pair folds forward and DOWN so their banded lengths come round to screen her head and
chest from ahead, their pointed tips hovering just ahead of her own shoulders, and the lower pair
tucks in against her flanks - every leg tip finishing NEARER her own body than it sits in the
reference image and none rising above the crown of her own head. SHE HOLDS THAT CAGE THROUGH THE
WHOLE MIDDLE HALF OF THE CLIP as she absorbs the pressure - both soles grind a fraction on the
stone without either one leaving the spot it stands on, her forearms shudder under the load, the
two hanging loops TREMBLE but never swing and never unwind, the folded leg tips TREMBLE but hold
their places, her shoulders judder and settle straight up and down, and neither her chest nor the
flat of her back ever squares up toward the camera; she may SINK, but she never TURNS. The weapon
does not strike and the floor does not break. IN THE FINAL QUARTER she drives one short hard
shove straight UP out of her knees, rising only back to her own standing height and no further,
the four legs unfold back OUT to their exact reference arcs, and she eases the handle back out
ahead of her only as far as its reference station, the cord and chain settling back into their
exact reference curve with the sickle back on its reference spot, into the EXACT same reference
stance, so that she is already standing completely still in the reference pose well before the
clip ends. Nothing sheds and nothing breaks. Caged, gathered, immovable.

## attack_block_b  (the forearm wall — wrapped forearm raised, chain hung as a curtain, one leg braced)
BLOCK-COUNTER B (the forearm wall): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER she
raises her wrapped chain FOREARM up in front of her own jaw, the corded handle rising only to the
height of her own shoulder and NEVER above it, and as the handle rises the cord and chain drain
straight DOWN from her fist into one slack hanging curve close along the front of her own body,
the sickle hanging just clear of the stone by her own shin - every part of the weapon staying
NEARER her own body than it sits in the reference image and NO part of it above her own shoulders
at any moment - while she hunches DOWN behind the raised forearm, her head lowering a fraction,
her weight sinking straight DOWN through both planted feet, and the low CROSSING spider leg sets
its point down onto the flagstone ahead of her leading boot - set down, not struck - bracing like
a stay, directly below the place its tip holds in the reference image. SHE HOLDS THAT WALLED
GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both soles grind a fraction on the stone
without leaving the spots they stand on, the raised forearm shudders under the load straight up
and down, the hanging length sways barely and never swings wide, the braced leg-point holds its
spot without sliding, her shoulders judder straight up and down, and neither her chest nor the
flat of her back ever squares up toward the camera; she may HUNCH and SINK, but she never TURNS.
Nothing sheds and the floor does not break. IN THE FINAL QUARTER the braced leg-point lifts back
to the exact arc it holds in the reference image, she lowers the forearm back down in one eased
motion, the handle sinking back to its exact reference station ahead of her waist and the cord
and chain easing back OUT only as far as their reference reach with the sickle settling back onto
its reference spot, as she rises out of the hunch into the EXACT same reference stance, so that
she is already standing completely still in the reference pose well before the clip ends. Walled,
braced, unmoved.

## hit  (downward stagger, zero leftward travel, legs clench in)
HIT (stagger): she begins in the EXACT reference stance, her body angled to camera exactly as it
is in the reference image and facing screen-right; the blow drives her DOWN, not back - her head
and both shoulders snap a SHORT way straight DOWN as her knees buckle and her spine folds forward
over her planted hips - BOTH FEET STAY EXACTLY WHERE THEY STAND, she does not step back and she
does not skid, NO PART of her - body or spider legs - travels further toward screen-LEFT than it
sits in the reference image, and every bit of the recoil is swallowed by her knees, hips and
folding trunk instead. On the jolt all four spider legs CLENCH a fraction IN toward her own back
- they never flare, never spread and never rise - and her chain hand clamps tighter on the corded
handle as the whole kusarigama is jolted straight DOWN with her body, holding its reference reach
the whole way - it never swings, never rises, and the sickle never travels further toward
screen-right. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and she rides it folded low
through the middle of the clip - trunk bowed over her planted hips, shoulders juddering straight
up and down, the slack chain loop beneath her fist swaying once and stilling. IN THE LAST THIRD
she straightens up out of her knees and flows in one eased recovery back into the EXACT same
reference stance, so that she is already standing completely still in the reference pose well
before the clip ends. Neither her chest nor the flat of her back ever squares up toward the
camera. Nothing sheds and nothing breaks. She is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time, and there is no light, no flare, no wisp and
no streak anywhere in the shot. Only her own body, her own spider legs and her own kusarigama
move.

## ko  (cause-free collapse, ends prone, kusarigama never released, legs come to rest)
KO (collapse): she begins in the EXACT reference stance, her body angled to camera exactly as it
is in the reference image and facing screen-right; IN THE FIRST THIRD OF THE CLIP her knees give
way beneath her, her head drops and her shoulders slump, and she goes STRAIGHT DOWN onto both
knees on the spot she stands on without travelling forward. Then she pitches forward and down
over her own thighs and FOLDS, and BY THE HALFWAY POINT she has come to rest fully prone and
motionless, folded down over her own knees with her head lying low toward screen-right, her face
still pointed that way. Her chain hand never opens: the kusarigama comes down WITH her, the
corded handle still closed in her fist and the cord and chain lying out along the floor toward
screen-right INSIDE the reach they already have in the reference image, the sickle finishing on
the stone NEARER her own fallen body than it reaches in the reference image and nowhere near any
edge of the frame, and it does not move again. All four spider legs fold down WITH her and come
to rest slack against her back and on the stone around her - none reaching further toward
screen-left than they reach in the reference image, none rising - and they do not stir again.
EXACTLY THREE small chips of hard grey flagstone are knocked UPWARD where her knees strike, each
chip no bigger than one link of her own chain and each one SOLID, OPAQUE and sharp-edged - never
a puff, never a cloud, never dust, never smoke and never haze - rising no higher than her own
fallen shoulder and staying within one body-width of where she lands, every chip crumbling away
to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME
AT ONCE. FOR THE WHOLE SECOND HALF OF THE CLIP SHE LIES COMPLETELY STILL - she does not stir,
does not lift her head, does not push up on an arm and she does NOT get back up - the fallen
kusarigama lies exactly where it came to rest and does not move again, and the cyan web membranes
settle with her arm and stay exactly as they are in the reference image. She is ALONE in an empty
frame - nothing whatsoever enters, crosses or appears in the frame at any time. Only her own
body, her own spider legs and her own kusarigama move.

## victory  (the mantle — chain gathered, four legs raised in slow display, no turn)
VICTORY (the mantle): she begins in the EXACT reference stance, her body angled to camera exactly
as it is in the reference image and facing screen-right. IN THE FIRST QUARTER she draws the
corded handle slowly IN against her own sternum, the cord and chain folding IN with it into two
heavy slack loops hanging close ahead of her own body - every part of the weapon finishing NEARER
her own body than it sits in the reference image, the sickle hanging low by her own knee, no part
of it rising above the height it holds in the reference image - while all FOUR spider legs rise
SLOWLY into a mantling display: the upper pair curls forward and a short way UP so their pointed
tips come to hover just ahead of her own shoulders, climbing no higher than her own shoulder
height and never above the crown of her own head, and the lower pair curls forward and IN at her
hip height - every tip finishing NEARER her own body than it sits in the reference image, never
reaching further toward screen-left. FOR THE WHOLE MIDDLE HALF OF THE CLIP SHE HOLDS that raised
mantle, and only three small motions live inside it: two slow settlings of her whole frame sink
STRAIGHT DOWN through both planted feet and rise again, never transferring from one foot to the
other; the four raised leg tips TREMBLE minutely in the display without leaving their places; and
the slack chain loop beneath her fist sways once and stills. Her face stays pointed toward
screen-right throughout - she never turns her head or her body toward the camera at any point,
and neither her chest nor the flat of her back ever squares up toward the viewer. IN THE FINAL
QUARTER the four legs uncurl back OUT and settle onto their exact reference arcs, the handle
eases back out to its reference station ahead of her waist, the cord and chain settle back into
their exact reference curve with the sickle back on its reference spot, and she settles into the
EXACT same reference stance, so that she is already standing completely still in the reference
pose well before the clip ends. Nothing sheds and nothing breaks. Silent, towering, cold.

## special_1  (THE WIDOW'S TOLL) — three measured sickle-bites toll the same spot of floor
SPECIAL FINISHER (the widow's toll): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP OF
ANY KIND: she never draws the chain back and NO PART of the kusarigama ever rises above the
height it holds in the reference image or travels further toward screen-right than it reaches
there - each toll starts from the reach and height the chain ALREADY HAS and travels only DOWN
and IN. ACROSS THE FIRST SIXTY PERCENT OF THE CLIP she bites the sickle's twin points down into
the SAME spot of flagstone directly beside the toes of her leading boot THREE times, slow and
measured as a tolling bell - on each toll her knees fold and her whole weight sinks a short way
STRAIGHT DOWN over both planted feet as her chain hand hauls the corded handle down and IN to her
own belt, the pull running out along the cord and chain, the sickle landing NEARER her own body
than its reference reach and lifting between tolls only back to the height and reach it already
holds in the reference image, never higher and never further out. EACH TOLL knocks EXACTLY TWO
chips of hard grey flagstone UPWARD around the bitten points, each chip no bigger than one link
of her own chain and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never
dust, never smoke and never haze - rising no higher than her own knee, staying within one
hand's-breadth of the struck spot and never further toward screen-right than the sickle reaches
in the reference image - and BOTH chips of each toll crumble away to nothing in mid-air before
the next toll lands, so THERE ARE NEVER MORE THAN TWO PIECES OF DEBRIS IN THE FRAME AT ONCE and
six chips break in total across the clip, in three staged pairs, never in one burst. THE LINE OF
HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE
REFERENCE IMAGE IN EVERY SINGLE FRAME - she may FOLD and SINK, but she never TURNS, and both
soles stay flat on the stone throughout. AFTER THE THIRD TOLL she holds the final bite dead-still
through the third quarter, the points in the stone and her shoulders juddering straight up and
down under her own braced weight, while the last chips crumble away, and IN THE FINAL QUARTER the
points pull free, the sickle eases back OUT low onto its exact reference spot as the cord and
chain settle back into their reference curve, and she rises into the EXACT same reference stance,
so that she is already standing completely still in the reference pose well before the clip ends.
Measured, ceremonial, final.

## special_2  (THE HOOK ANCHOR) — the sickle bitten into the stone, her whole weight poured down the taut line
SPECIAL FINISHER (the hook anchor): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP OF
ANY KIND: she does NOT raise the weapon first, does NOT draw it back, and NO PART of the
kusarigama ever travels further toward screen-right than it reaches in the reference image or
above the height it holds there - it starts from the reach and height it ALREADY HAS and only
ever goes DOWN and IN. IN THE FIRST QUARTER her chain hand lowers the corded handle and SETS the
sickle down - lowered, not struck - onto the flagstone directly beside the toes of her leading
boot, NEARER her own body than its reference reach, and presses the twin points in until they
BITE the stone, the cord and chain drawing into one low TAUT line between her fist at her own hip
and the bitten sickle, the whole line staying below her own waist height. FROM THE QUARTER MARK
TO THE SEVENTY PERCENT MARK she POURS her whole weight down that taut line: knees folding deep,
trunk folding over her leading knee, her chain arm hauling steadily DOWN and IN through the
handle, both soles flat and planted and grinding a fraction without leaving their spots - and
under the biting points the floor GIVES WAY IN STAGES: EXACTLY SIX chips of hard grey flagstone
break loose in ones and twos spread across the length of the press, never in one burst, each chip
no bigger than one link of her own chain and each one SOLID, OPAQUE and sharp-edged - never a
puff, never a cloud, never dust, never smoke and never haze - knocked UPWARD no higher than her
own knee, staying within one hand's-breadth of the bitten sickle and never further toward
screen-right than the sickle reaches in the reference image - every chip cracking apart and
crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF
DEBRIS IN THE FRAME AT ONCE. Through the whole press the bitten sickle GRINDS on its one spot
without ever sliding toward screen-right and without ever lifting, the taut line never rises
above her own waist, her four spider-leg tips hold their reference arcs trembling with the
effort, and she may FOLD and SINK, but she never TURNS - neither her chest nor the flat of her
back ever squares up toward the camera. IN THE FINAL THIRTY PERCENT she eases her weight back up
off the line, the twin points pull free of the broken stone, the cord and chain slacken back into
their exact reference curve as the sickle eases back OUT onto its reference spot, and she rises
into the EXACT same reference stance, so that she is already standing completely still in the
reference pose well before the clip ends. Slow, crushing, inexorable.

## special_3  (THE BROOD LOCKDOWN) — all four spider legs stake the floor around her
SPECIAL FINISHER (the brood lockdown): she begins in the EXACT reference stance, her body angled
to camera exactly as it is in the reference image and facing screen-right. IN THE FIRST QUARTER
she sinks STRAIGHT DOWN into a deep loaded crouch over both planted feet, knees folding fully,
while her chain hand draws the corded handle in against her own sternum and the cord and chain
fold into one slack hanging curve close ahead of her own body, the sickle hanging low by her own
shin - every part of the weapon NEARER her own body than it sits in the reference image and no
part of it above the height it holds there. FROM THE QUARTER MARK TO THE FORTY PERCENT MARK, ONE
AFTER ANOTHER, all FOUR spider legs stab their pointed tips DOWN into the flagstone around her -
each tip driving straight DOWN from the arc it holds in the reference image and planting directly
BELOW its own reference place or a short way IN toward her own body, never further toward
screen-left than it reaches in the reference image and never further toward screen-right than the
toes of her own leading boot - until she stands staked to the ground on four chitin points. SHE
HOLDS THAT LOCKDOWN FROM THE FORTY PERCENT MARK TO THE SEVENTY PERCENT MARK, loading harder the
whole time: her thighs, back and shoulders shudder under the load straight up and down, the four
planted points GRIND on their spots without sliding, the slack loops of cord tremble against her
body without unwinding - and under the four points the floor GIVES WAY IN STAGES: EXACTLY SIX
chips of hard grey flagstone break loose in ones and twos spread across the stakes and the hold,
never in one burst, each chip no bigger than one link of her own chain and each one SOLID, OPAQUE
and sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - knocked
UPWARD no higher than her own knee, each staying within one hand's-breadth of its own planted
point, never further toward screen-left than the leg tips reach in the reference image and never
further toward screen-right than the toes of her leading boot - every chip cracking apart and
crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF
DEBRIS IN THE FRAME AT ONCE. THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE
SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - she may SINK, but
she never TURNS, and both soles stay flat on the stone throughout. FROM THE SEVENTY PERCENT MARK
the four points pull free ONE AFTER ANOTHER and each leg lifts back onto the exact arc it holds
in the reference image, the handle eases back out to its reference station ahead of her waist,
the cord and chain settle back into their exact reference curve with the sickle back on its
reference spot, and THE WHOLE FINAL QUARTER is her slow controlled rise back up out of the
crouch, both soles never leaving the stone, into the EXACT same reference stance, so that she is
already standing completely still in the reference pose well before the clip ends. Staked,
loaded, patient.
