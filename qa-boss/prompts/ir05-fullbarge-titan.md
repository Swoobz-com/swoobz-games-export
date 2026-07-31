# IR-05 FULLBARGE TITAN — XGundam roster. Full 13-clip kit. Phase 88.

Generated OFF THE PADDED PLATE `qa-boss/anchors/xg/ir05-fullbarge-titan-anchor-green.png`, never the raw
`input/MK FINAL/XGundam not sorted/IR-05 Fullbarge Titan.png`. The raw art measured L70 / R51 / T70 with a
span cap of 1.09x — completely unwritable; a single committed beat would have broken every edge at once.
Padded at fill 0.68 it measures **L296 / R296 / HEADROOM 468**, verified by
`node qa-boss/measure-anchor-budget.mjs`. Chroma-detail scan: 3172px of enclosed green = 0.42% of subject,
comfortably under the 1% CLEAN line — nothing on this mech keys out as backdrop, the green plate is safe.

## ★ IR-05 FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536 GREEN. Full subject **944w x 1044h** (fills 68.0% of frame height), bbox x296..x1239.
  LEFT **296px** · RIGHT **296px** · HEADROOM **468px** · bottom free (boots on the floor line).
  Max spanPeak that still fits = 1.63x; the HARD RULE caps it at **1.60x** — use 1.60x.
  Chroma-detail **CLEAN**.

**HIS ARSENAL, READ OFF THE PLATE — and what it forbids.** One weapon: a huge TWO-HANDED SPIKED MACE.
No gun. No missile. No blade. No shield. The blocky backpack is a BOOSTER PACK — a grid of six round
amber-lit exhaust ports and a large scorched booster cone angled down and back, not a launcher — so he
may BOOST and he may never FIRE. Nothing in this kit shoots, launches, beams or flies.

**HE IS PROP-EXTENDED AT BOTH ENDS — this is the whole containment problem.** Body-mass columns run
x302..x959 (**658px**). The mace runs butt-cap x≈354 to spike tip x=1239: **≈885px tip to tip, 85% of his
own 1044px standing height**, in a frame whose free interior is only 944px wide. It is therefore a
TWO-ENDED prop, unlike every single-ended club in the roster: the spiked head sits 296px off the RIGHT
edge and the counterweight butt-cap sits only **58px inside his own left silhouette edge**. Pulling the
head in PUSHES THE POMMEL OUT. The four rules that follow are the arithmetic of that:

  1. **The spiked head NEVER travels further screen-RIGHT than it does in the reference.** It has 296px
     and a horizontal swing or a forward thrust eats that instantly. Every committed beat drives it DOWN.
  2. **NEVER a full overhead raise, and bound the SPIKED HEAD, not the hands.** 885px of weapon against
     468px of ceiling — under half its length. A height bound on his gauntlets does not bound the head
     (the phase-58/61 lesson, learned four times); the head is bounded at his own shoulders and no higher.
  3. **THE GROUNDED CARRY is the only "out of the way" that fits.** "Tucked in close at his side" is
     geometrically impossible for an 885px haft — bring the head in and the butt-cap leaves the frame.
     When a beat needs the weapon parked, it goes to the GROUNDED CARRY: spiked head hanging low beside
     his leading boot, haft raked back and up so the butt-cap rides beside his own shoulder. Measured,
     that puts both ends 170px+ inside. Rotation SHORTENS his horizontal reach, so steep is always safer
     than shallow — and the rake that drops the head to the deck lifts the butt-cap only to shoulder height.
  4. **His direction is DOWN, and the bottom edge is free** — `check-containment.mjs` treats floor contact
     as expected and never counts it. Slams, plants, drags and stamps into the deck are both in character
     for a hunched brute and structurally the cheapest beats he owns.
  5. Effects are **SOLID MATERIAL** — torn deck plating, sheared steel chips, snapped rivets, grit,
     charcoal-black flakes of burnt scale off the booster cone lip. Never a glow, flame, aura, mist or
     shockwave of light: an emissive effect lights the chroma plate and the key keeps it as an olive halo.
     His OWN trim (cyan slits and forearm bars, blue optics, amber booster ports, the red mace core) stays
     lit inside its own housing exactly as in the reference and never throws light into the scene.

Shared prefix:
> The EXACT SAME heavy blue-armoured war mech from the reference image (identical hulking humanoid mecha
> frame in weathered steel-blue and navy armour plating over bone-white chest and inner plates, with dark
> crimson-red rim trim on the pauldrons, the forearm bands, the knee edges and the splayed toe-caps of his
> boots, gunmetal joints, pistons and hoses, scuffed and paint-chipped plates, a crested helm carrying a
> swept-back fan of tall angular blade-fins above a mechanical faceplate with small blue optic lenses and a
> cluster of little blue sensor dots on the cheek plate, narrow cyan light slits on the chest block and
> three short cyan bars on each forearm, and a big blocky armoured booster backpack carrying a grid of six
> round amber-lit exhaust ports and a large scorched booster cone angled down and back, gripping in both
> gauntlets a huge two-handed spiked mace - a long plain gunmetal haft with a stepped counterweight
> butt-cap at the near end and a heavy gunmetal drum head ringed with long conical spikes and set with a
> round red core lens), standing on a solid saturated GREEN chroma screen (bright green #00b140, nothing
> pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His steel-blue and bone-white armour plates, crimson trim, crested helm, booster backpack and the spiked
> mace stay EXACTLY the same the entire clip. He keeps the mace in his hands the whole time and never
> drops or swaps it. He NEVER fires, launches or shoots anything at any moment - he carries no gun and no
> missile of any kind, and the ports on his backpack are thruster vents that never launch anything. The
> mace stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame, and its
> SPIKED HEAD never travels further toward screen-right than it does in the reference image. The SPIKED
> HEAD is NEVER raised above his own shoulders and the mace is NEVER swung fully vertical or overhead at
> any moment. HIS BOOTS STAY ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops,
> never flies, never lifts off the deck and never lunges out into a wide stance; he keeps his stance narrow
> and never spreads wider than about one and a half times his standing width. He stays FACING SCREEN-RIGHT
> the entire clip and NEVER rotates or turns to face the camera. The camera is absolutely locked, no zoom,
> no pan, his full body always fully in frame, he is the ONLY figure in frame at all times, nothing else
> added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside the blockquote is sent to the model as instructions.
Two wordings above are load-bearing and must not be paraphrased. (a) The weapon lock is its OWN sentence,
split off from the identity lock, because build-prompt.mjs's KO-SUFFIX RULE strips it with a leading
`[^.]*` that backtracks to the previous full stop — oni-tetsubo.md welds both into one sentence, so its
`ko` build loses the identity lock as collateral. Split here, `ko` keeps its identity and loses only the
weapon lock. (b) The anchor lock reads "begins and ends on the EXACT same reference stance" because the
stripper matches that exact literal; any rephrasing leaves `ko` ordered to end on the anchor while its
acting line has him collapse prone. (c) The boots line says STAY ON THE GROUND, not "stay FLAT on the
ground": the stripper does not touch that sentence, and "flat" would contradict the ko collapse in every
ko build. Law 7 (first==last) is carried per-state instead: every non-ko action line ends "back into the
EXACT same reference stance".

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN TORN DECK PLATING, STEEL CHIPS AND GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his spiked mace and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips of steel, broken plating, snapped rivets and grit, opaque and sharp-edged and lit like scrap metal - never a glow, never a flame, never an aura, never mist or smoke, and nothing is ever fired, launched or shot. All of it stays low and close to him, rising no higher than his own waist, crumbling away to nothing in mid-air as it falls back down, and never coming near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a huge grounded war-machine holding station under its own weight, his armoured
shoulders heaving slowly up and down as the booster block on his back settles and rocks a few degrees on
its mount, the long mace haft dipping and rising a gauntlet's width in his two-handed grip as he re-sets
his fingers on it, his hips rolling his mass slowly off the rear boot onto the leading boot and back, and
the crest fins on his helm lifting and settling with each shift. Boots planted, enormous and menacing.
Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (deck-breaker chop)
STRIKE A (deck-breaker chop): he begins in the EXACT reference stance in strict side profile facing
screen-right; he sinks his whole mass back over his rear boot and rolls the spiked head UP only as far as
his own hip, then drives his hips, shoulders and both gauntlets down together and SLAMS the spiked head
into the deck just in front of his leading boot, his knees folding under him as the long haft rakes over
and the counterweight butt-cap swings up to about his own shoulder height and no higher, and the impact
tears loose a burst of broken deck plating, sheared steel chips and grit that leaps UP around the spiked
head no higher than his own knee and crumbles away to nothing in mid-air as it falls. The whole slam is
COMPLETE by the halfway point of the clip; the whole second half is his slow heavy recovery back up into
the EXACT same reference stance. Heavy, brutal, final.

## attack_strike_b  (rising pommel drive)
STRIKE B (pommel drive): he begins in the EXACT reference stance in strict side profile facing
screen-right; he slides both gauntlets along the haft toward the spiked head, lets that head swing DOWN
and BACK low past his own rear boot, and drives the heavy counterweight butt-cap UP and ACROSS in one short
brutal rising jab that finishes level with his own chest, never turning the mace end for end, his rear leg
straightening and his whole torso and backpack lifting and rotating up behind the drive; as the spiked head
sweeps low past his rear
boot it tears loose a burst of grit and broken deck plating that leaps UP no higher than his own shin and
crumbles away to nothing in mid-air as it falls. The jab is COMPLETE by the halfway point of the clip; the
whole second half is his settle back down into the EXACT same reference stance. Short, mechanical, brutal.

## attack_throw A  (servo clamp and drive-down, solo-safe)
THROW A (servo clamp and drive-down): he begins in the EXACT reference stance in strict side profile
facing screen-right; he rolls the mace into the GROUNDED CARRY gripped in his leading gauntlet - spiked
head hanging low beside his leading boot, haft raked back and up so the butt-cap rides beside his own
shoulder - and reaches out with his free gauntlet through EMPTY AIR, snapping the servo fingers shut as if
clamping an unseen foe at chest height; then he drops his entire mass, hauls that seized weight down and
back past his own hip and drives it into the deck beside his leading boot, his knees folding and his
shoulders and backpack following it all the way down, and the drive tears loose a burst of broken deck
plating and grit that leaps UP no higher than his own knee and crumbles away to nothing in mid-air as it
falls. NO opponent, no second figure, empty air only. The throw is COMPLETE by the halfway point; the
second half is his heavy rise back into the EXACT same reference stance.

## attack_throw_b  (booster barge, solo-safe)
THROW B (booster barge): he begins in the EXACT reference stance in strict side profile facing
screen-right; he rolls the mace down into the GROUNDED CARRY - spiked head hanging low beside his leading
boot, haft raked back and up so the butt-cap rides beside his own shoulder - drops his leading shoulder
plate and coils down over his rear knee, and then the whole
booster block on his back shoves him into one short heavy barge forward from the hips WITHOUT stepping his
boots apart - his boots grinding barely a boot-length forward across the deck, his shoulder plate and the
mass of the backpack leading, tearing loose a low burst of grit and broken plating under them that leaps
UP no higher than his own ankle and crumbles away to nothing in mid-air as it falls. He barges through
empty air only - NO opponent, no second figure. The barge is COMPLETE by the halfway point; the second
half is his heavy settle back into the EXACT same reference stance.

## attack_block A  (haft brace)
BLOCK-COUNTER A (haft brace): he begins in the EXACT reference stance in strict side profile facing
screen-right; he hauls the whole mace straight UP in both gauntlets into a hard level brace held across
the front of his chest, the spiked head kept at chest height and no higher, and drives his leading
shoulder plate in behind the haft as his whole mass settles back over his rear boot and both knees fold
under the pressure; then he punches that braced haft down and forward off the rear boot in one short heavy
counter-shove that drops the spiked head back DOWN to knee height, his hips and shoulders driving through
it, and flows in one eased motion back into the EXACT same reference stance. Braced, immovable, brutal.

## attack_block_b  (pauldron guard into shoulder shove)
BLOCK-COUNTER B (pauldron guard): he begins in the EXACT reference stance in strict side profile facing
screen-right; he lets the mace roll down into the GROUNDED CARRY held in his leading gauntlet - spiked head
hanging low beside his leading boot, haft raked back and up so the butt-cap rides beside his own shoulder -
snaps his other armoured forearm up across his faceplate and turns his big crimson-rimmed pauldron into the
pressure, and his whole frame sinks back over his rear boot with both knees folding and his boots grinding
a short scuff backwards across the deck as he absorbs it; then he drives that pauldron forward in one short
heavy shoulder-shove at chest height and flows in one eased motion back into the EXACT same reference
stance. The mace stays in that grounded carry and never swings during this clip. Braced, compact, brutal.

## hit  (heavy stagger, quick recover)
HIT (heavy stagger): he begins in the EXACT reference stance in strict side profile facing screen-right;
his helm and shoulders snap back and to screen-LEFT with the crest fins whipping, his leading boot skids a
SHORT half-step backwards and both knees buckle under his own weight, and the long mace is jarred in his
gauntlets so the spiked head drops DOWN toward the deck while the counterweight butt-cap kicks up toward
his shoulder; the skidding boot tears loose a low burst of grit and broken deck plating that leaps UP no
higher than his own ankle and crumbles away to nothing in mid-air as it falls. He catches his balance,
plants both boots and flows in one eased recovery back into the EXACT same reference stance. His chest and
faceplate lead the recoil; his back is never shown. He is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time, and there is no light, no flare and no streak anywhere
in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on the deck)
KO (collapse): he begins in the EXACT reference stance in strict side profile facing screen-right; the
servos in his knees give way beneath him, the huge mace slides out of his gauntlets and drops to the deck
lying along his own body, and he pitches heavily forward and down, his whole armoured frame folding and
landing hard, coming to rest fully prone and motionless as the amber light inside the six ports on his
backpack and the cyan light inside the strips on his forearms goes out, the housings themselves unchanged;
where he lands a low burst of grit and broken deck
plating is knocked UP around him no higher than his own ankle and crumbles away to nothing in mid-air as it
falls. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at any
time. Only his own body moves. He does NOT get back up.

## victory  (mace planted, engine settle)
VICTORY (planted mace): he begins in the EXACT reference stance in strict side profile facing screen-right.
IN THE FIRST QUARTER OF THE CLIP he sinks his whole mass down and rolls the spiked head DOWN onto the deck
just in front of his own leading boot, the haft raking back and up at about forty-five degrees with the
counterweight butt-cap ending level with his own shoulder and never travelling further toward screen-LEFT
than it does in the reference image, and he leans his weight down onto the planted haft; the plant knocks
UP a low burst of grit and broken deck plating around the spiked head no higher than his own ankle, which
crumbles away to nothing in mid-air as it falls. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT
LEANING POSE and only his head, chest and backpack move - his shoulders heave, the crest fins on his helm
lift and settle, his faceplate tilts up no higher than the top of his own crest, and the big booster cone
on his back rocks once heavily on its mount; his hips, both gauntlets and both boots stay exactly where
they are, he does not step, does not pivot and does not straighten up, and the spiked head stays ON THE
DECK that entire time. IN THE FINAL QUARTER he hauls the spiked head back up off the deck to the EXACT
height and angle it has in the reference image - never higher, never vertical - and settles into the EXACT
same reference stance. The spiked head goes DOWN to the deck, never up. Proud, heavy, brutal.

## special_1  (FULLBARGE) — booster-driven grounded charge, ploughed plating
SPECIAL FINISHER (fullbarge): he begins in the EXACT reference stance in strict side profile facing
screen-right; he rolls the mace into the GROUNDED CARRY - spiked head hanging low beside his leading boot,
haft raked back and up so the butt-cap rides beside his own shoulder - coils his whole frame down into a
deep braced crouch with both knees folded and his leading shoulder
plate dropped, and then the entire booster block on his back drives him in ONE short heavy grounded charge
forward - his boots ploughing barely more than a boot-length across the deck with his shoulder plate and
the mass of the backpack leading, tearing loose a burst of broken deck plating, sheared steel chips and
grit ahead of them that is thrown UP no higher than his own knee and crumbles away to nothing in mid-air as
it falls back down, while charcoal-black flakes of burnt scale shake loose off the scorched lip of his
booster cone and crumble away to nothing at once. He charges through empty air only - NO
opponent, no second figure. The charge is COMPLETE by the halfway point of the clip; he holds the deep
braced finish for a beat and the rest of the clip is his slow heavy rise back into the EXACT same reference
stance. Heavy, brutal, final.

## special_2  (DECK-SPLITTER) — booster-assisted downward slam, ruptured plating
SPECIAL FINISHER (deck-splitter): he begins in the EXACT reference stance in strict side profile facing
screen-right; he lifts the spiked head only as far as his own hip and coils his whole frame down into a
deep braced crouch, then the booster cone on his back gimbals up and back and drives his entire mass
DOWNWARD as he slams the spiked head into the deck in front of his leading boot with everything he has, the
long haft raking over so the counterweight butt-cap swings up to about his own shoulder and no higher; the
impact BREAKS the deck open and throws UP a burst of solid slabs of torn deck plating, sheared steel chips
and snapped rivets around the spiked head - rising no higher than his own waist, spreading no wider than
one body-width to either side, and crumbling away to nothing in mid-air as it falls back down - while he
holds the deep crouch. The debris is SOLID METAL AND GRIT: opaque, sharp-edged, lit like scrap steel -
never a glow, never a flame, never a shockwave of light. The whole slam is COMPLETE by the halfway point of
the clip; the whole second half is his slow heavy rise back into the EXACT same reference stance. Heavy,
brutal, final.

## special_3  (GROUNDSPIKE) — spikes planted and hauled back in a ploughing drag
SPECIAL FINISHER (groundspike): he begins in the EXACT reference stance in strict side profile facing
screen-right; he drives the spiked head DOWN into the deck just ahead of his own leading boot, sets both
gauntlets hard on the haft, and then HAULS it back IN toward himself in one long ploughing drag - his whole
frame rocking back over his rear boot, his hips dropping and his shoulders and backpack swinging back with
the pull, his boots grinding for purchase, the spikes staying down on the deck for the entire drag and
tearing loose a low spray of broken deck plating, sheared steel chips and grit that is thrown UP no higher
than his own knee and crumbles away to nothing in mid-air as it falls back down. The debris is SOLID METAL
AND GRIT: opaque, sharp-edged, lit like scrap steel - never a glow, never a flame, never a ring of light.
The drag is COMPLETE by the halfway point of the clip; the whole second half is his heavy rise as he lifts
the spiked head clear of the deck and settles back into the EXACT same reference stance. Heavy, brutal,
final.
