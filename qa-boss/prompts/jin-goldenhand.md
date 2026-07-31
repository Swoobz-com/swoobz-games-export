# JIN GOLDENHAND — MK FINAL playable #4. Full 13-clip kit. Phase 97.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/jin-goldenhand-anchor-green.png`, never the raw
`input/MK FINAL/mythic/Jin_Goldenhand.png`. The raw plate is 1064x1536 with the subject at 953x1324 —
L48 / R63 / HEADROOM 144, filling 86.2% of frame height, own max span 1.12x. That is unusable for a
fighter whose highest point is a floating prop. The padded plate measures **L392 / R393 / HEADROOM
468**, verified by `node qa-boss/measure-anchor-budget.mjs` — the roomiest LATERAL margins of the MK
set. Plate uniformity: top green bin 0/248/0 at **99.25% of the green pixels**, second bin 0/240/0 at
0.10%, green covering 88.36% of the frame — single-tone, the cleanest plate of the set, far above the
~70% two-tone suspect threshold. No re-plate needed.

## ★ JIN FRAME BUDGET — applies to EVERY clip of hers

Plate 1536x1536. Full subject **751w x 1044h** (fills 68.0% of frame height), bbox x392..x1142,
y468..y1511.
  LEFT **392px** · RIGHT **393px** · HEADROOM **468px** · bottom free (slippers on the floor line).

**SHE IS DOUBLE-ENDED, AND ONE END IS A FLOATING PROP — read this before writing any beat.** Her own
body silhouette runs x810..x1142 above the waist and x659..x1093 at the floor. The **twin colossal
golden hands** account for the whole left half of the subject: cuffs-to-fingertips they occupy
x392..x803 / y468..y829, i.e. **412w x 362h**, a prop nearly as tall as her own torso that hangs in
the AIR on two brass chains anchored at her lower back. Nothing about her arms bounds it.

  1. **THE CEILING BELONGS TO THE PROP, NOT TO HER.** The topmost pixel of the entire subject is the
     LEADING GOLDEN HAND'S FINGERTIP at y468, x617 — **14px ABOVE her own hair bun** (y482, x847). So
     the 468px of headroom is measured to a floating hand, and raising the hands eats it 1:1 while
     raising her head is comparatively free. Bound the FINGERTIPS, never her hands or her shoulders:
     **the twin golden hands are NEVER raised above the height they have in the reference image.** (A
     height bound on the body has never once bounded a long prop — learned four times on this roster.)
  2. **THEY SWING, THEY DO NOT FLY.** They hang on slack chains, so their only honest motion is a
     pendulum ARC about that back anchor plus a chain snapping taut — never a free translation across
     the frame. A swing screen-LEFT drives the trailing hand's CUFF (x392, on rows 756..762, i.e. her
     own chest height) off the left edge; a swing UP drives the fingertips off the top. **DOWN and IN
     (toward screen-right, toward her own body) are the two free directions, and hauling them IN moves
     them up to 400px AWAY from the left edge — so every hand beat is a downward-and-inward arc, which
     is geometrically safer than the anchor pose itself.**
  3. **HER LEADING FIST OWNS THE RIGHT EDGE** — x1142, on rows 671..672, chin height, arm already out
     in guard. Any straight punch, forward reach or lunge toward screen-right drives it off. Her own
     striking is therefore DOWNWARD, HOOKING, INWARD, knife-hand, elbow, hip or heel — never a
     straight extension. And the golden hands are bounded on that side too: neither may pass the
     leading fist's reference position.
  4. **HER DIRECTION IS DOWN.** The bottom edge is free — `check-containment.mjs` treats
     slippers-on-floor as expected and never counts it. Anything driven into the stone shrinks her
     span, buys the debris beat, and costs nothing.
  5. **SPAN: the 1.60x HARD RULE governs.** 751 x 1.60 = 1202px, inside the 1536 plate (the plate's
     own arithmetic allows 2.05x, so 1.60 is the smaller and it wins). Width is NOT what kills her —
     the ceiling and the hands' swing direction are. **Her STANDING FOOTPRINT is x659..x1093 = 435px**
     (rear slipper toe to leading slipper toe), and every effect in this kit is bounded to it.
  6. **Effects are SOLID MATERIAL** — sharp chips of broken pale temple flagstone, chunks of cracked
     floor-stone, kicked grit. Never a glow, flame, aura, mist or smoke. **AND HER GOLD IS POLISHED
     METAL, NEVER A LIGHT SOURCE.** Over the whole subject there are only 5 pure-white pixels (all
     channels >=250) and 37 with every channel >=235; the brightest gold pixel is 255/252/199 at
     x875,y996 — one specular hit on her belt medallion. The chroma reads 3/252/2 at ONE pixel out
     from the gold edge and at every probe distance out to 160px, left and up alike: **zero bloom,
     zero baked glow, no emissive feature anywhere on this plate.** The kitsune-blocker class does NOT
     apply here. The risk is therefore an INVENTED glow, not an existing one, so the suffix pins the
     gold to reference brightness rather than trying to dim something.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME young female monk-warrior from the reference image (identical pale skin and lean
> athletic build, glossy black hair pulled up into a high topknot bun with a gold hairpin through it
> and a small gold ring-and-tassel ornament hanging beside her temple, a short swept fringe, a gold
> hoop earring, calm dark eyes; a cropped sleeveless top of cream-white panels with sage-green trim
> and thin gold piping, a high green mandarin collar, a round black-and-white YIN-YANG medallion at
> her sternum and gold-edged straps crossing her chest, bare midriff; flat gold banded armlets on both
> upper arms, a white cylindrical vambrace with two gold bands on her near forearm, a white wrap with
> gold bands and a sage-green FINGERLESS GLOVE on her other forearm, both hands closed into bare
> fists; a sage-green sash and belt with gold trim and a round embossed gold medallion at her hip,
> layered cream-white hip plates with gold edging over sage-green skirt panels, a long cream-white
> centre panel bordered in sage-green and marked with a gold flame-and-scroll motif hanging to her
> knees, sage-green thigh wraps, cream-white knee and shin guards with gold trim, and cream-white
> cloth slipper-boots with sage-green soles and gold trim; and floating in the air behind her toward
> screen-left, TWO COLOSSAL POLISHED GOLDEN IDOL-HANDS - each palm flat, fingers straight and pressed
> together, the two held palm-to-palm in a prayer mudra angled diagonally up toward screen-left, each
> hand nearly as tall as her own torso, each finished at the wrist with a wide banded gold cuff
> carrying a squared spur on its outer edge, and a heavy brass CHAIN running from each cuff, sagging
> down through the air, back to a gold ring at her lower back), standing on a solid saturated GREEN
> chroma screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> Her black topknot and gold hairpin, her hoop earring, the cream-and-green top with its yin-yang
> medallion, her gold armlets, the white vambrace, the green glove, her sash and gold belt medallion,
> the white hip plates, the gold-marked centre panel, her thigh wraps, shin guards and slipper-boots
> stay EXACTLY the same the entire clip. The twin colossal golden hands stay CHAINED to her the entire
> clip - they are never unclipped, never let go, never exchanged and never replaced by anything else,
> and both brass chains stay attached to her lower back in every frame. Her gold - the twin hands, the
> chains, her armlets, her belt medallion and every gold edge on her clothing - is POLISHED METAL that
> only CATCHES light: it stays exactly as bright as in the reference image and NEVER glows, brightens,
> flares, trails, sparkles or throws light onto anything, and no light, flame, aura, mist, smoke or
> energy of any kind ever appears anywhere in the shot. The twin golden hands stay FULLY INSIDE the frame at ALL
> times and NEVER extend past any edge of the frame: their FINGERTIPS are NEVER raised above the
> height they have in the reference image, the CUFF of the trailing hand NEVER travels further toward
> screen-left than it does in the reference image, and neither golden hand EVER travels further toward
> screen-right than her leading fist does in the reference image. Her LEADING FIST never travels
> further toward screen-right than it does in the reference image, and her REAR SLIPPER never travels
> further toward screen-left than it does in the reference image. HER FEET STAY FLAT ON THE GROUND FOR
> THE ENTIRE CLIP - she never jumps, never leaps, never hops and never lunges out into a wide stance;
> WHILE SHE IS ON HER FEET she keeps her stance narrow and never widens it past about one and a
> quarter times her own standing width. She stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera, and her body holds the SAME angle to camera it has in the
> reference image - it never opens further toward the viewer and never turns away. Her mouth stays as
> it is in the reference image - she never talks, never shouts and her jaw never chatters. The camera
> is absolutely locked, no zoom, no pan, her full body always fully in frame, and she is the ONLY
> figure in frame at all times - there is no second person and no other body, the twin golden hands
> are her own chained weapon and belong to nobody else, and nothing else is added.
> She begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. Three deliberate decisions above are load-bearing for `ko` and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN SO IT SURVIVES THE ko, ON PURPOSE. The KO-SUFFIX RULE strips any
sentence matching `keeps the ... never drops or swaps`, because every other fighter on the roster
DROPS their weapon when they go down. Jin cannot: the twin hands are CHAINED to her lower back, so
they fall WITH her and stay hers. Phrasing the lock as "stay CHAINED to her ... never unclipped,
never exchanged" therefore (i) does not match the strip, (ii) stays true through a prone collapse, and
(iii) keeps the identity lock in its own separate sentence so no strip can take it as collateral.
This is a deliberate divergence from minotaur/skullrend, not an oversight.

(b) THE STANCE-WIDTH CLAUSE IS PRE-SCOPED. It is phrased "never WIDENS IT PAST" and scopes itself
with "WHILE SHE IS ON HER FEET", so it is already vacuous once she is prone.
**UPDATED phase 103 — the reason this was written off the rewrite path is GONE.** When this kit was
authored, koSuffix replaced the clause with the literal string "WHILE ON HIS FEET he keeps his stance
narrow" — a hardcoded MALE pronoun that would have injected "he/his" into a female fighter's ko — and
it also DOUBLED any scope the kit had already applied (measured on skullrend: "WHILE HE IS ON HIS
FEET WHILE ON HIS FEET he keeps his stance narrow"). Both are fixed: the rewrite now CAPTURES the
pronouns and carries them through, and swallows a pre-existing scope instead of stacking a second one.
Verified: this kit's ko builds "WHILE SHE IS ON HER FEET she keeps her stance narrow …", skullrend's
builds it once. **So the canonical wording is now safe for a female fighter** — this phrasing is kept
because it is equivalent and already verified, not because the canonical one is dangerous.

(c) THE DEBRIS TAIL — REVERTED TO CANONICAL, phase 133. This kit used to follow skullrend's
divergence, ending "at the end there is no shed, torn, broken or kicked-up material anywhere in the
shot" instead of the canonical "the last frame shows ONLY the fighter and what the fighter holds,
exactly as the first frame does", on the grounds that Jin HOLDS nothing on a `ko`. **Skullrend's
divergence was itself a mistake and this kit inherited it.** `koSuffix()` rule 3 already performs
that exact rewrite for `ko` ONLY, so hardcoding it changed the `ko` prompt by nothing and stripped
the anti-phantom-object clause from all twelve standing states. See the fuller note in
skullrend-orcus.md; caught by the KO-CONTAMINATED check in `check-prompt-sections.mjs`.
Law 7 (first==last as its own sentence) is carried per-state as well: every non-ko action line ends
"back into the EXACT same reference stance".

FACING, judgement call: **PARTLY OPEN, not strict profile.** Read at FULL SIZE, not off a contact
sheet. Her HEAD is a clean strict profile facing screen-right — one eye, full profile of brow, nose,
lips and chin. Her TORSO is not: the round yin-yang medallion at her sternum reads as a near-full
circle rather than an edge-on sliver, the crossed chest straps read frontally, her navel reads face-on
and both deltoids are separately visible. Her HIPS are open too — both thighs read as separate
volumes, both slipper-boots present their tops to camera, and the long centre panel of her skirt hangs
down the middle showing its full gold-marked face to the viewer, which is impossible in true profile.
So no line orders "strict side profile", which would make the model re-pose her toward pure profile
mid-clip and fight her own anchor; every line says "angled to camera exactly as in the reference image
and facing screen-right", and the suffix bans the turn in BOTH directions. This is the same verdict as
minotaur-axe and skullrend-orcus, and it is NOT the frontal-plate blocker (IR-41 class) — her face,
her stance line and her whole line of attack are committed to screen-right.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HER OWN KICKED GRIT AND SPLINTERED FLOOR-STONE the green stays completely empty and unbroken; the ONLY things visible are HER OWN body, her twin chained golden hands and HER OWN debris. Every piece of debris is SOLID MATERIAL - real chips, shards and slivers of broken pale floor-stone and loose grit, opaque, sharp-edged and lit like rock - never a glow, never a flame, never a spark, never an aura, never mist or smoke, and never a whole intact object. All of it is knocked UPWARD and stays low and close to her, rising no higher than her own knee and spreading no wider than her own standing footprint - never past her leading foot toward screen-right and never past her rear slipper toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a rooted martial-arts guard, her weight low and even between both planted
slippers, both fists up exactly as in the reference and the twin golden hands hanging steady on their
chains behind her toward screen-left. ONE full slow breath fills the first half of the clip and a
second fills the second half: on each one her ribs and shoulders rise and settle, her chin dips a
fraction and lifts again, her fists roll and re-close, and her weight rolls slowly from her rear
slipper onto her leading slipper and back. The two brass chains at her lower back swing gently with
her and the twin golden hands ride a little DOWN and back on them and turn a finger's width in the
air, never rising above the height they have in the reference image and never drifting further toward
screen-left than they sit there. The long centre panel of her skirt and the loose ends of her sash
sway faintly with her. Feet planted, calm and dangerous. Returns to the exact start pose so it loops
seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (chained hammer-drop)
STRIKE A (chained hammer-drop): she begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER OF THE CLIP she drops her whole
weight onto her rear leg, snaps both fists DOWN past her own hips and hauls her shoulders down behind
them, and the two brass chains snap taut - so the twin golden hands whip DOWN and IN toward her in one
heavy arc, still pressed palm-to-palm, and hammer EDGE-ON into the stone floor just in front of her
leading slipper. Their fingertips travel only downward and toward screen-right and never rise above
the height they have in the reference image. Where they land they knock EXACTLY SIX chips of solid
splintered flagstone and grit UPWARD around them, each chip no longer than her own hand, rising no
higher than her own knee and spreading no wider than her own standing footprint - never past her
leading foot toward screen-right and never past her rear slipper toward screen-left - every piece
crumbling away to nothing in mid-air as it falls. THE HAMMER-DROP HAS LANDED BY THE HALFWAY POINT OF
THE CLIP; she then HOLDS her weight down over her rear leg through the third quarter while the last
chips crumble away, and only in the final second do the chains slacken, the twin hands ride back to
the EXACT height and angle they have in the reference image and she settles back into the EXACT same
reference stance, so that she is already standing completely still in the reference pose well before
the clip ends. Fast, heavy, brutal.

## attack_strike_b  (dropping knife-hand)
STRIKE B (dropping knife-hand): she begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER she coils her hips away, draws
her leading fist IN across her own chest and opens it into a flat blade-straight knife-hand while her
rear fist clamps hard against her own ribs; then she drives her hips back through and cuts that
knife-hand DOWN and IN across the front of her own body in one short savage diagonal, from her own
shoulder height to her own leading hip, her whole trunk dropping into a lower stance behind it - the
hand finishing nearer her body than her leading fist sits in the reference image and never travelling
further toward screen-right than that fist does. Her rear slipper grinds on the stone as she drives
and scuffs EXACTLY THREE small chips of grit UP off the floor, each no bigger than her own thumbnail,
rising no higher than her own ankle and spreading no wider than her own standing footprint - never
past her leading foot toward screen-right and never past her rear slipper toward screen-left - every
piece crumbling away to nothing in mid-air as it falls; nothing else sheds and nothing breaks, this is
a clean edge. The chains jolt the twin golden hands a short way DOWN and IN behind her as her hips
turn, and they never rise and never swing further toward screen-left than they sit in the reference
image. THE CUT IS COMPLETE BY THE HALFWAY POINT; she HOLDS the lower stance with the knife-hand still
low through the third quarter, and only in the final second does she rise and flow back into the EXACT
same reference stance, so that she is already standing completely still in the reference pose well
before the clip ends. Fast, precise, savage.

## attack_throw A  (golden clamp, solo-safe)
THROW A (golden clamp): she begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; she drives both fists IN toward her own chest and the two
brass chains draw taut, hauling the twin golden hands DOWN and IN out of the air behind her, and the
two flat palms CLAMP shut on an unseen weight at her own chest height in EMPTY AIR - there is NO
opponent and no second figure, and nothing else is in the frame at any time. THE CLAMP IS SET BY THE
END OF THE FIRST THIRD; then she wrenches her shoulders, spine and hips DOWN in one committed drive,
her knees folding deep and her whole mass going down behind it, and the clamped hands ride that drive
straight DOWN and slam the weight into the stone beside her leading slipper, so THE SLAM HAS LANDED BY
THE HALFWAY POINT. EXACTLY SIX chips of splintered flagstone and grit are knocked UPWARD off the floor
where it comes down, each chip no longer than her own hand, rising no higher than her own knee and
spreading no wider than her own standing footprint - never past her leading foot toward screen-right
and never past her rear slipper toward screen-left - every piece crumbling away to nothing in mid-air
as it falls. She HOLDS the low finish through the third quarter while the last chips crumble away, and
only in the final second does she rise, the chains slackening and the twin hands riding back to the
EXACT height and angle they have in the reference image, into the EXACT same reference stance, so that
she is already standing completely still in the reference pose well before the clip ends. Grounded,
crushing, final.

## attack_throw_b  (hip throw, solo-safe)
THROW B (hip throw): she begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD she opens her leading hand and closes it
on an unseen weight at her own chest height in EMPTY AIR - without ever reaching further toward
screen-right than her leading fist sits in the reference image, and with NO opponent, no second figure
and nothing else in the frame at any time. Then she drops her hips under it and rolls her leading
shoulder DOWN toward the stone beside her leading slipper - down, never opening toward the camera -
and hauls that weight down and IN across her own leading hip in one committed throw, her knees folding
and her whole mass going down behind it, so THE THROW HAS LANDED BY THE HALFWAY POINT. EXACTLY FIVE
chips of splintered flagstone and grit are knocked UPWARD off the floor where it comes down, each chip
no longer than her own hand, rising no higher than her own knee and spreading no wider than her own
standing footprint - never past her leading foot toward screen-right and never past her rear slipper
toward screen-left - every piece crumbling away to nothing in mid-air as it falls. The chains drag the
twin golden hands a short way DOWN and IN behind her as her hips drop, and they never rise and never
swing further toward screen-left than they sit in the reference image. She HOLDS the low finish
through the third quarter while the last chips crumble away, and only in the final second does she
rise back into the EXACT same reference stance, so that she is already standing completely still in
the reference pose well before the clip ends. Fast, rooted, brutal.

## attack_block A  (golden wall)
BLOCK-COUNTER A (golden wall): she begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER she hauls both fists IN and
ACROSS her own chest and the two brass chains draw taut, swinging the twin golden hands DOWN and IN
out of the air behind her until they stand edge-on close in front of her own chest, palms flat and
facing screen-right, a solid metal wall between her and the pressure - their fingertips no further
toward screen-right than her leading fist sits in the reference image and never higher than they sit
there - while her weight settles back onto her rear leg with her chin tucked and both elbows tight to
her ribs. SHE HOLDS THAT GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as she absorbs the pressure -
her slippers grind a fraction on the stone without either one leaving the spot it stands on, her
forearms shake under the load, her shoulders roll and reset and her chest heaves - but the golden wall
itself does not move and nothing else in her body travels. IN THE FINAL QUARTER she drives it one
short shove forward toward screen-right out of her chest, short enough that the fingertips are still
nearer her body at the end of it than her leading fist is in the reference image, then lets the chains
slacken so the twin hands swing back to the EXACT height and angle they have in the reference image
and flows in one eased motion back into the EXACT same reference stance. Braced, immovable, calm.

## attack_block_b  (crossed vambraces)
BLOCK-COUNTER B (crossed vambraces): she begins in the EXACT reference stance, angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER she snaps both
forearms UP and CROSSED in front of her own face, the white vambrace and the gloved wrist stacked over
one another so her armoured forearms are what meet the pressure - her fists rising no higher than her
own hair bun and never travelling further toward screen-right than her leading fist sits in the
reference image - her chin tucked hard, her back curving and her weight settling onto her rear leg.
Behind her the two brass chains go SLACK and the twin golden hands sink a little lower and hang
dead-still, taking no part in this beat. SHE HOLDS THAT CROSSED GUARD THROUGH THE WHOLE MIDDLE HALF OF
THE CLIP - her slippers grind a fraction on the stone without either one leaving the spot it stands
on, her forearms shudder under the load, her shoulders judder and her ribs heave, and the golden hands
never rise and never swing for one frame of it. IN THE FINAL QUARTER she drives up out of her knees
and shrugs one short forearm shove forward toward screen-right out of her chest, then lets the chains
draw taut again so the twin hands ride back to the EXACT height and angle they have in the reference
image and flows in one eased motion back into the EXACT same reference stance. Braced, compact,
immovable.

## hit  (recoil absorbed, quick recover)
HIT (stagger): she begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; her head and shoulders snap back and to screen-LEFT, her chin flying
up, her spine folding and her knees buckling under her own weight - but BOTH SLIPPERS STAY EXACTLY
WHERE THEY STAND, she does not step back and she does not skid, and every bit of the recoil is
absorbed in her knees, hips and trunk instead. Both fists are jarred IN tight against her own ribs.
The two brass chains snap taut with the jolt and the twin golden hands shudder and swing a short way
DOWN and IN behind her, never rising above the height they have in the reference image and never
travelling further toward screen-left than they sit there. THE RECOIL PEAKS BY THE END OF THE FIRST
QUARTER and she rides it off balance through the middle of the clip - her weight rolling back over her
rear leg, the long centre panel of her skirt whipping, her shoulders juddering and her ribs heaving.
IN THE LAST THIRD she catches her balance, straightens up out of her knees and flows in one eased
recovery back into the EXACT same reference stance, so that she is already standing completely still
in the reference pose well before the clip ends. Her chest and face lead the recoil; her back is never
shown. She is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at
any time, and there is no light, no flare and no streak anywhere in the shot. Only her own body and
her own chained hands move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): she begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP her knees give way beneath her, her head
drops, her arms go loose and both fists fall open. BY THE HALFWAY POINT she has crumpled heavily
forward and down onto the stone and come to rest fully prone and motionless, and the two brass chains
go slack so the twin golden hands sink DOWN out of the air with her and come to rest on the ground
beside her, still chained to her back and still pressed palm-to-palm. EXACTLY FIVE chips of solid grit
and splintered flagstone are knocked UPWARD off the floor where she lands, each chip no longer than
her own hand, rising no higher than her own fallen shoulder and spreading no wider than her own fallen
body, every piece crumbling away to nothing in mid-air as it falls. FOR THE WHOLE SECOND HALF OF THE
CLIP SHE LIES COMPLETELY STILL, face down and heavy - she does not stir, does not lift her head, does
not push up on an arm and she does NOT get back up - and the twin golden hands lie exactly where they
came to rest and do not move again. She is ALONE in an empty frame - nothing whatsoever enters,
crosses or appears in the frame at any time. Only her own body and her own chained hands move.

## victory  (temple salute, no turn to camera)
VICTORY (temple salute): she begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP she lets her guard down,
draws both hands IN to her own sternum and sets them into the formal salute - her leading fist pressed
flat into her other open palm at her own chest height, elbows out and level, both hands staying nearer
her body than her leading fist sits in the reference image - and she settles her weight evenly down
over both planted slippers. At the same moment the two brass chains draw taut and the twin golden
hands swing DOWN and IN behind her and settle pressed hard palm-to-palm, mirroring her, never rising
above the height they have in the reference image. FOR THE WHOLE MIDDLE HALF OF THE CLIP SHE HOLDS
THAT SALUTE and only her head and chest move - her ribs swell and sink with two slow deep breaths, her
chin dips once into a short controlled bow and lifts again no higher than it sits in the reference
image, and her shoulders drop and settle. Her slippers, hips and shoulders stay exactly where they
are: she does not step, does not pivot, does not straighten up onto her toes, does not raise a hand
above her own shoulder and does not turn her head or her body toward the camera at any point. Her
mouth stays exactly as it is in the reference image and her jaw stays shut. IN THE FINAL QUARTER she
opens the salute back into both fists, lets the chains slacken so the twin golden hands ride back to
the EXACT height and angle they have in the reference image, and settles into the EXACT same reference
stance, so that she is already standing completely still in the reference pose well before the clip
ends. Nothing sheds and nothing breaks. Composed, proud, spent.

## special_1  (IRON PALM SEAL) — both golden palms driven flat into the floor
SPECIAL FINISHER (iron palm seal): she begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER she sinks her whole body
straight DOWN into a deep rooted horse stance, knees driving out and hips dropping without either
slipper leaving the spot it stands on, drives both fists DOWN past her own hips and hauls her
shoulders down behind them - and the two brass chains snap bar-taut, dragging the twin golden hands
DOWN and IN out of the air behind her, rolling them flat, and driving them PALM-DOWN into the stone
floor just in front of her leading slipper with everything she has. Their fingertips travel only
downward and toward screen-right and never rise above the height they have in the reference image. AT
THE HALFWAY POINT the flagstone SPLITS under both palms: EXACTLY EIGHT chips of solid broken
floor-stone are BLASTED UPWARD around them, each chip no longer than her own forearm, rising no higher
than her own knee and spreading no wider than her own standing footprint - never past her leading foot
toward screen-right and never past her rear slipper toward screen-left - every piece crumbling away to
nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque, chipped, sharp-edged and lit
like stone - never a glow, never a flame, never a ring of light. SHE HOLDS THE DEEP HORSE STANCE
THROUGH THE WHOLE THIRD QUARTER, shoulders heaving, both golden palms pressed flat into the split
stone and the chains still bar-taut, while the last chips crumble away. Only in the final second does
she rise slowly, the chains slackening and the twin golden hands lifting back to the EXACT height and
angle they have in the reference image, and settle into the EXACT same reference stance, so that she
is already standing completely still in the reference pose well before the clip ends. Heavy, rooted,
final.

## special_2  (SEALED PRAYER) — she takes the mudra herself and the chains go bar-taut
SPECIAL FINISHER (sealed prayer): she begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER she draws both fists IN to her
own sternum, opens them and presses her own palms together in a prayer seal at her chest height, both
hands staying nearer her body than her leading fist sits in the reference image - and behind her the
two brass chains draw BAR-TAUT and haul the twin golden hands IN toward her until they are pressed
hard palm-to-palm and shuddering under the load, never rising above the height they have in the
reference image and never swinging further toward screen-left than they sit there. Then she drives her
whole weight straight DOWN through both planted slippers, sinking into a deep rooted stance with her
spine long, her elbows tight and her shoulders bearing down, and AT THE HALFWAY POINT the flagstone
SPLITS beneath her own feet: EXACTLY SEVEN chips of solid broken floor-stone are knocked UPWARD around
her slippers, each chip no longer than her own hand, rising no higher than her own knee and spreading
no wider than her own standing footprint - never past her leading foot toward screen-right and never
past her rear slipper toward screen-left - every piece crumbling away to nothing in mid-air as it
falls. The debris is SOLID BROKEN ROCK: opaque, chipped, sharp-edged and lit like stone - never a
glow, never a flame, never a halo of light, and NOTHING WHATSOEVER appears between her pressed palms
or between the golden palms at any moment. SHE HOLDS THE PRESSED SEAL AND THE ROOTED STANCE THROUGH
THE WHOLE THIRD QUARTER, her forearms trembling and the chains still bar-taut, while the last chips
crumble away. Only in the final second does she open her hands back into both fists, let the chains
slacken so the twin golden hands ride back to the EXACT height and angle they have in the reference
image, and settle into the EXACT same reference stance, so that she is already standing completely
still in the reference pose well before the clip ends. Still, immense, final.

## special_3  (SWEEPING LOTUS) — a coiled low crouch held, then one scything drag of the leading foot
SPECIAL FINISHER (sweeping lotus): she begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER she drops her whole weight
DOWN onto her rear leg into a deep low crouch, that knee folding hard beneath her, her trunk folding
forward over it and both fists drawn IN tight to her own ribs, while her leading leg stays long in
front of her with its slipper exactly where it stands in the reference image. SHE HOLDS THAT COILED
LOW CROUCH FROM THE END OF THE FIRST QUARTER UNTIL THE FIFTY PERCENT MARK, loading harder the whole
time - her thighs and shoulders shuddering under the load, her ribs heaving, her weight grinding down
over her rear slipper without either foot leaving the spot it stands on. THEN AT THE FIFTY PERCENT
MARK she RAKES that leading slipper back and IN across the stone toward her own rear foot in one low
flat scything drag - travelling toward screen-LEFT, the sole never leaving the floor line, and
stopping well short of her rear slipper so it never travels further toward screen-left than that rear
slipper stands in the reference image - her hips and shoulders driving the pull and her stance
NARROWING as it goes. The drag tears EXACTLY SIX chips of splintered flagstone and grit UPWARD off the
stone behind the sole, each chip no longer than her own hand, rising no higher than her own knee and
spreading no wider than her own standing footprint - never past her leading foot toward screen-right
and never past her rear slipper toward screen-left - every piece crumbling away to nothing in mid-air
as it falls. The debris is SOLID BROKEN ROCK: opaque, chipped, sharp-edged and lit like stone - never
a glow, never a flame, never a streak of light. Behind her the chains snap taut with the pull and jolt
the twin golden hands a short way DOWN and IN, never rising above the height they have in the
reference image and never swinging further toward screen-left than they sit there. THE RAKE IS
COMPLETE BY THE SEVENTY PERCENT MARK and she HOLDS the low finish while the last chips crumble away;
only in the final second does she slide that slipper back out to exactly where it stands in the
reference image and rise slowly up out of the crouch into the EXACT same reference stance, so that she
is already standing completely still in the reference pose well before the clip ends. Low, scything,
final.
