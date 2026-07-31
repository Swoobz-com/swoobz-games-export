# SKULLREND ORCUS — MK FINAL playable #3. Full 13-clip kit. Phase 88.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/skullrend-orcus-anchor-green.png`, never the raw
`input/MK FINAL/mythic/Skullrend Orcus.png`. The raw plate is 1520x1536 with the subject at 1447x1466
— L18 / R55 / T56, filling 95% of frame height. Eighteen pixels of left margin is the tightest plate
in the whole MK FINAL set; on that plate his rear boot is already touching the edge before he moves.
The padded plate measures **L252 / R254 / HEADROOM 468**, verified by
`node qa-boss/measure-anchor-budget.mjs`. Plate uniformity: top green bin 0/248/0 at **94.2%**, second
bin 0/240/0 at 4.9% — single-tone, far above the ~70% two-tone suspect threshold, no re-plate needed.

## ★ SKULLREND FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **1030w x 1044h** (fills 68.0% of frame height), bbox x252..x1281,
y468..y1511.
  LEFT **252px** · RIGHT **254px** · HEADROOM **468px** · bottom free (boots on the floor line).

**HIS TWO EDGES ARE OWNED BY DIFFERENT THINGS — read this before writing any beat.** Measured
body-only (x<880) he is 628px wide; the cleaver adds the remaining 402px (x880..x1281, y716..y1041).
The **RIGHT 254px belongs to the CLEAVER TIP** (x1281, on rows y893..907, i.e. chest height, with his
arm already extended). The **LEFT 252px belongs to HIS OWN REAR BOOT TOE** (x252, on rows y1403..1438,
down on the floor line), with his free fist only 46px further in (x298 at hip height). That is NOT the
minotaur shape: nothing trades. Pulling the blade in does not push anything out on the left, so
bounding the blade is FREE and every beat should do it.

  1. **TRAVEL IS THE ONLY THING THAT EATS BOTH EDGES AT ONCE.** A step, a lunge or a widened stance
     moves the rear boot left and the blade right in the same frame. So the rule splits: the BLADE may
     move as much as the beat needs, the BODY may not leave the spot it stands on. His rear boot and
     his free fist never travel further screen-left than they do in the reference.
  2. **ONE-HANDED, AND ALREADY AT FULL REACH.** He holds the cleaver in a single hand with the arm
     extended and the tip at the extreme right of the subject. Any THRUST, stab, forward punch or
     lunge drives that tip straight off the right edge. Every beat is a ROTATION about his own fist —
     and rotating the blade DOWN or IN moves the tip up to 436px away from that edge, which makes a
     downward cleave geometrically *safer* than the anchor pose itself.
  3. **THE BLADE'S REACH FROM HIS FIST (~450px) IS THE ENTIRE HEADROOM (468px).** Grip centre sits at
     about (845,1005), the tip at (1281,900). Swung vertical from where that fist is now, the tip only
     just clears his horns; raise the FIST to shoulder height first and the barbed spine ends up ~300px
     above his horns and ~170px from the ceiling. So bound TWO things and never the hands alone: the
     CLEAVER TIP and its BARBED SPINE never rise above his own ram horns, and his weapon fist never
     rises above his own shoulder. Never fully vertical, never overhead. (A height bound on the body
     has never once bounded a long prop — learned four times.)
  4. **HIS DIRECTION IS DOWN.** The bottom edge is free — `check-containment.mjs` treats boots-on-floor
     as expected and never counts it. Anything driven into the stone shrinks his span AND buys the
     debris beat, at no cost.
  5. **SPAN CAP 1.49x — TIGHTER THAN THE 1.60 HARD RULE, so 1.49 governs.** 1030 x 1.49 = 1535px = the
     plate width exactly. Effects are **SOLID MATERIAL** — splintered bone shards, chips of broken
     floor-stone, kicked grit. Never a glow, flame, aura or mist. **He carries NO baked emissive
     feature**: measured over the whole subject there are 63 near-white pixels and they are all
     specular highlights on polished steel (brightest at x702,y724, on the pauldron), and the red marks
     across the blade are DARK dried blood, not light. The bloom risk here is therefore an INVENTED
     glow, not an existing one — so the suffix pins the steel highlights, the eye and the blade to
     reference brightness rather than trying to dim something.

Shared prefix:
> The EXACT SAME huge orc-brute from the reference image (identical deep burnt-orange hide over
> enormous slabbed muscle, a dark steel skullcap helmet with a pointed brow-and-nose guard down his
> face and a plated cheek-and-jaw guard, one big ridged grey-brown spiral RAM'S HORN curling forward
> and down from each side of that helmet, a heavy brow over a deep-set pale yellow-green eye, a broad
> flat hooked nose, deep hard folds beside a closed snarling mouth and one heavy ridged grey tusk
> curving up and forward from his lower jaw; a big layered dark steel pauldron of three riveted
> overlapping lames on the shoulder of his weapon arm, a dark leather strap-piece carrying three
> curved hooked steel spikes on his other shoulder, an X-crossed dark leather harness over his bare
> chest with a rectangular steel buckle plate where the straps cross, a plated dark steel vambrace on
> his weapon forearm, two banded dark leather straps around his other bare forearm, a wide dark
> leather belt with a second narrow strap and a steel buckle, a large polished steel SKULL mounted at
> his near hip, a long brown leather tasset flap with a torn pointed hem hanging at his other hip,
> dark leather shorts, bare heavily muscled orange thighs, heavy dark-brown leather boots with wrapped
> straps and steel-capped toes, and a steel greave plate strapped over the shin of his leading boot;
> he grips in ONE hand, that arm held out toward screen-right, a huge single-handed jagged black-steel
> CLEAVER - a broad wide blade with a row of hooked barbs along its spine and its lower edge, a pierced
> round hole near the tip, four dark dried-blood claw-rake gouges across its face, a short
> leather-wrapped grip and a hooked beak-shaped spur on the butt of that grip - while his other arm
> hangs at his side, bare and closed into a heavy fist), standing on a solid saturated GREEN chroma
> screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His orange hide, ram horns, tusk, steel helmet, plated pauldron, spiked shoulder strap, leather chest
> harness, vambrace, belt, the steel skull at his hip, the leather tasset, his boots and greave and the
> jagged cleaver stay EXACTLY the same the entire clip. He keeps the cleaver in that same one hand the
> whole time and never drops or swaps it. The polished steel of his armour, his eye and the dark red
> marks on the blade stay exactly as dim as they are in the reference image - nothing on him ever
> glows, brightens, flares, trails or throws light onto anything. The cleaver stays FULLY INSIDE the
> frame at ALL times and NEVER extends past any edge of the frame: the BLADE TIP never travels further
> toward screen-right than it does in the reference image, and his REAR BOOT and his free FIST never
> travel further toward screen-left than they do in the reference image. The BLADE TIP and the barbed
> spine of the cleaver are NEVER raised above his own ram horns, his weapon fist is NEVER raised above
> his own shoulder, and the cleaver is NEVER swung fully vertical or overhead at any moment. HIS FEET
> STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and never
> lunges out into a wide stance; WHILE HE IS ON HIS FEET he keeps his stance narrow and never spreads
> wider than about one and a quarter times his standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or
> turns to face the camera, and his body holds the SAME angle to camera it has in the reference image -
> it never opens further toward the viewer and never turns away. His mouth stays as it is in the
> reference image - he never talks, never shouts, never roars and his jaw never chatters. The camera is
> absolutely locked, no zoom, no pan, his full body always fully in frame, he is the ONLY figure in
> frame at all times, nothing else added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. Three literals above are load-bearing for `ko` and must not be re-worded. The KO-SUFFIX
RULE strips (a) the weapon-lock SENTENCE, which it matches on `keeps the ... never drops or swaps` —
it is written as its OWN sentence so the strip cannot take the identity lock with it as collateral;
(b) the anchor lock, matched on `begins and ends on the EXACT same reference stance`; and it REWORDS
(c) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` — spelled "BOOTS" that rewrite silently
misses and a prone collapse ships with its feet locked flat, so it says FEET.
REVERTED, phase 133. This kit used to diverge from the canonical suffix: its debris law ended "there
is no shed, torn, broken or kicked-up material anywhere in the shot" instead of "the last frame shows
ONLY the fighter and what the fighter holds, exactly as the first frame does". The stated reason was
that on a `ko` the fighter no longer HOLDS the cleaver, so the canonical tail orders his own weapon to
disappear. **That reason was already handled and the divergence was a net loss.** `koSuffix()` rule 3
in build-prompt.mjs rewrites the canonical tail into *exactly* this wording — for `ko` ONLY. So
hardcoding it changed the `ko` prompt by nothing at all, while stripping from all TWELVE standing
states the "ONLY the fighter and what the fighter holds" clause, which is the anti-phantom-object
clause `check-extra-objects.mjs` exists to police, plus the first==last binding on frame CONTENT.
It was NOT "same meaning": the per-state "back into the EXACT same reference stance" carried below
binds POSE, not the CONTENT of the frame, so nothing else forbade a phantom third object.
Caught by the new KO-CONTAMINATED check in `check-prompt-sections.mjs`; jin-goldenhand had copied
this same divergence and was reverted with it. **Do not re-derive it — read `koSuffix()` first.**
Law 7 (first==last as its own sentence) is carried per-state as well: every non-ko action line ends
"back into the EXACT same reference stance".
FACING, judgement call: **PARTLY OPEN, not strict profile.** His HEAD is a clean strict profile facing
screen-right - one eye, full profile of brow, hooked nose, jaw and tusk. His TORSO is not: both
pectorals read, the sternal line and the X-harness sit square to camera, and his free arm hangs clear
of the silhouette with its own bicep and bare fist showing. His HIPS are open too - both thighs read as
separate volumes, the leading thigh presents its quadriceps to camera and both boots are visible. So no
line orders "strict side profile", which would make the model re-pose him toward pure profile mid-clip
and fight his own anchor; every line says "angled to camera exactly as in the reference image and
facing screen-right", and the suffix bans the turn in BOTH directions.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN KICKED GRIT, SPLINTERED BONE SHARDS AND BROKEN FLOOR-STONE the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his jagged cleaver and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips, shards and slivers of dry pale bone and broken grey stone and loose grit, opaque, sharp-edged and lit like bone and rock - never a glow, never a flame, never an aura, never mist or smoke, and never a skeleton, a corpse, a severed head or any whole intact object. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own chest and spreading no wider than one body-width to either side, and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a heavy grounded brute stance, his weight low and even over both planted
boots, the cleaver held out steady in his one hand exactly as in the reference. ONE full slow breath
fills the first half of the clip and a second fills the second half: on each one his ribs and his
slabbed chest swell and sink, his shoulders lift STRAIGHT up and settle back down, his head lowers a fraction
on his thick neck the way a bull sizes up the ground in front of it and rises again, his nostrils
flare and he blows out through them, his free fist closes tight and eases open again, and his whole weight sinks a fraction STRAIGHT DOWN through BOTH of his planted boots at once and rises again, and it NEVER transfers from one to the other. The long leather tasset at his hip
sways faintly with him, the steel skull on his belt swings a little, and the cleaver rides a fraction
up and down in his fist without ever leaving the height it has in the reference image. Boots planted,
heavy and menacing. Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle
motion.

## attack_strike A  (cross-body cleave)
STRIKE A (cross-body cleave): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER OF THE CLIP he coils his weight down
onto his rear boot and rolls the cleaver back and UP only as far as his own near shoulder - the blade
turning about his fist so the TIP comes IN toward his own body - then he drives up out of his hips and
rips the blade DOWN across the front of his own body in one heavy committed diagonal, from that
shoulder to the outside of his leading knee, his skull and both shoulders snapping down with it and
his free fist driving down past his ribs as a counterweight. The blade finishes low and close, nearer
his body than it sits in the reference. His rear boot grinds on the stone as he drives and scuffs a
little grit UP off the floor, no higher than his own ankle, every piece crumbling away to nothing in
mid-air as it falls; nothing else sheds and nothing else breaks - this is a clean edge. THE CUT HAS
LANDED BY THE HALFWAY POINT OF THE CLIP; the whole second half is his slow controlled haul of the
blade back out to the EXACT height and angle it has in the reference image and his settle back into
the EXACT same reference stance. Fast for his size, savage, brutal.

## attack_strike_b  (low barbed rake)
STRIKE B (low barbed rake): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he rolls the cleaver over in his fist so
the HOOKED BARBS along its spine lead instead of the cutting edge, and drops his whole trunk into a low
heavy crouch over both planted boots, hauling the blade down and IN until the barbs are riding the
stone just in front of his leading boot. Then he RIPS them back and IN toward his own hip in one short
flat savage arc, his hips and shoulders driving the pull and his free fist punching down beside his
lead knee, the barbs tearing a burst of splintered bone shards and grit UP off the stone as they come,
rising no higher than his own knee, every piece crumbling away to nothing in mid-air as it falls. The
blade never leaves the low line and finishes tucked at his own hip, far nearer his body than it sits in
the reference. THE RAKE IS COMPLETE BY THE HALFWAY POINT; the whole second half is his slow rise back
out of the crouch, the cleaver rolling upright and riding back out to the EXACT height and angle it has
in the reference image, and his settle back into the EXACT same reference stance. Low, dragging,
vicious.

## attack_throw A  (bare-hand slam, solo-safe)
THROW A (bare-hand slam): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; he hauls the cleaver DOWN and IN across his own thighs where
it hangs low and still in his one hand, nearer his body than it sits in the reference, and reaches out
with his bare free fist to seize an unseen weight at his own chest height in EMPTY AIR - there is NO
opponent and no second figure, nothing else in the frame at any time. THE GRIP IS SET BY THE END OF
THE FIRST THIRD; then he wrenches his shoulders, spine and hips DOWN in one brutal committed drive and
slams that weight into the stone beside his leading boot, his knees folding deep and his whole mass
going down behind it, so THE SLAM HAS LANDED BY THE HALFWAY POINT. A burst of solid splintered bone
shards and grit is knocked UPWARD off the floor where that weight comes down, rising no higher than
his own knee,
every piece crumbling away to nothing in mid-air as it falls. The whole second half is his slow heavy
rise back up, the cleaver riding back out to the EXACT height and angle it has in the reference image,
into the EXACT same reference stance. Brutal, grounded, final.

## attack_throw_b  (spur hook and wrench, solo-safe)
THROW B (spur hook): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he rolls the whole cleaver over in his fist
so the HOOKED BEAK-SHAPED SPUR on the butt of the grip drops and points down and forward while the
blade itself tips back and IN toward his own chest - his fist never travelling further out than it sits
in the reference - and he hooks that spur under an unseen weight at his own hip height in EMPTY AIR,
with NO opponent, no second figure and nothing else in the frame at any time. Then he hauls it back and
DOWN across his own body, dropping his whole weight onto his rear boot and folding his trunk over the
pull, his free fist clamping down over his own weapon wrist to double the wrench, so THE HAUL HAS
FINISHED BY THE HALFWAY POINT with the blade tucked in at his own hip. Grit and splintered bone shards
are knocked UPWARD off the stone under the weight as it comes down, rising no higher than his own knee,
every piece crumbling away to nothing in mid-air as it falls. The whole second half is his slow rise,
the cleaver rolling back upright to the EXACT height and angle it has in the reference image, and his
settle back into the EXACT same reference stance. Heavy, hooking, brutal.

## attack_block A  (broad blade wall)
BLOCK-COUNTER A (blade wall): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he swings the broad cleaver IN and
ACROSS the front of his own chest into a hard braced guard, flat-on to the pressure with the blade
angled DOWNWARD and the tip pulled in nearer his body than in the reference, and braces the back of the
blade against his own free forearm, both elbows tight to his ribs, skull tucked down between his
shoulders and his weight settling back onto his rear boot. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE
HALF OF THE CLIP as he absorbs the pressure - his boots grind a fraction on the stone without either
one leaving the spot it stands on, his forearms shake under the load, his shoulders roll and reset and
his chest heaves - but the guard itself does not move and nothing else in his body travels. IN THE
FINAL QUARTER he drives the braced blade one short heavy shove forward out of his chest, short enough
that the tip is still nearer his body at the end of it than it is in the reference, and flows in one
eased motion back into the EXACT same reference stance. Braced, immovable, brutal.

## attack_block_b  (pauldron guard)
BLOCK-COUNTER B (pauldron guard): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER he hauls the cleaver DOWN and IN to
his own side, drops his skull between his shoulders with his horns levelled and rolls the big layered
steel pauldron on his leading shoulder forward so that plate is what meets the pressure, chin tucked
hard to his chest, back curved, his free forearm braced flat across his own ribs and his weight
settling onto his rear boot. HE HOLDS THAT HUNCHED GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - his boots grind a fraction on the stone without leaving the spot they stand on, his neck and shoulders
shudder under the load, his ribs heave, and the cleaver stays low and dead-still at his side and never
rises and never swings for one frame of it. IN THE FINAL QUARTER he drives up out of his knees and
shrugs one short heavy shoulder-and-horn shove forward, his skull rising no higher than it sits in the
reference image, then flows in one eased motion back into the EXACT same reference stance. Braced,
compact, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; his head and shoulders snap back and to screen-LEFT, his ram horns
swinging with the recoil, his spine folding and his knees buckling under his own weight - but BOTH
BOOTS STAY EXACTLY WHERE THEY STAND, he does not step back and he does not skid, and every bit of the
recoil is absorbed in his knees, hips and trunk instead. The cleaver is jarred DOWN and IN across his
own thighs and finishes nearer his body than it sits in the reference, and his free fist clenches hard
against his ribs. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he rides it off balance through
the middle of the clip - his weight rolling back over his rear boot, the leather tasset at his hip
whipping, his shoulders juddering and his chest heaving. IN THE LAST THIRD he catches his balance,
straightens up out of his knees and flows in one eased recovery back into the EXACT same reference
stance. His chest and face lead the recoil; his back is never shown. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at any time, and there is no light, no flare
and no streak anywhere in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath him, his skull
drops, his fingers open and the cleaver falls out of his hand to the stone beside him and stays lying
there for the rest of the clip. BY THE HALFWAY POINT he has crumpled heavily forward and down onto the
ground and come to rest fully prone and motionless, and a scatter of solid grit and splintered bone
shards is knocked UPWARD off the floor where he lands, rising no higher than his own fallen shoulder,
every piece crumbling away to nothing in mid-air as it falls. FOR THE WHOLE SECOND HALF OF THE CLIP HE
LIES COMPLETELY STILL, face down and heavy - he does not stir, does not lift his head, does not push up
on an arm and he does NOT get back up. He is ALONE in an empty frame - nothing whatsoever enters,
crosses or appears in the frame at any time. Only his own body moves.

## victory  (skull toll, no roar)
VICTORY (skull toll): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP he hauls the cleaver DOWN and
IN across his own thighs, where it rides low and nearer his body than it sits in the reference, and
sinks his weight into a heavy settled stance over both planted boots, his shoulders dropping and his
chest already heaving. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT LOW SETTLED POSE and gives
two slow heavy contemptuous knuckle-blows with his bare free fist against the polished steel skull
mounted on his own belt - on each one his whole trunk folds down into it from the hips and both
shoulders lift STRAIGHT up, then he draws the fist back IN to his own ribs and his ribs swell and sink with
one deep breath before the next. His skull lowers and rises with each blow but his ram horns never rise
above the height they have in the reference image, his mouth stays exactly as it is in the reference
image and his jaw stays shut, never opens, never chatters and never moves to speak. His boots, hips
and shoulders stay exactly where they are, he does not step, does not pivot and does not straighten up.
IN THE FINAL QUARTER he lets the cleaver ride back out to the EXACT height and angle it has in the
reference image and settles into the EXACT same reference stance. Nothing sheds and nothing breaks.
Proud, heavy, spent.

## special_1  (SKULLREND) - the cleaver buried in the stone, full force
SPECIAL FINISHER (skullrend): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he rolls the cleaver back and UP only
as far as his own near shoulder, clamps his free fist over the back of his own weapon wrist to double
the grip, and coils his whole body into a deep braced crouch over both planted boots with his skull
dropping between his shoulders; then he drives the blade DOWN into the stone floor in front of his
leading boot with everything he has, the whole cleaver turning about his fists so the TIP travels down
and IN toward his own body. AT THE HALFWAY POINT the edge BITES DEEP and buries itself, and solid
splintered bone shards, sharp chips of broken floor-stone and grey grit are BLASTED UPWARD around the
buried blade, rising no higher than his own knee, spreading no wider than one body-width to either side
of him, every piece crumbling away to nothing in mid-air as it falls. The debris is SOLID MATERIAL:
opaque, chipped, sharp-edged, lit like dry bone and broken rock - never a glow, never a flame, never a
ring of light. HE HOLDS THE DEEP CROUCH THROUGH THE WHOLE THIRD QUARTER, his shoulders heaving over the
buried blade and his weight leaning down onto the grip. IN THE FINAL QUARTER he hauls it back up out of
the stone to the EXACT height and angle it has in the reference image and rises slowly back into the
EXACT same reference stance. Heavy, brutal, final.

## special_2  (GRAVE-KNUCKLE) - two bare-fisted hammer blows into the floor
SPECIAL FINISHER (grave-knuckle): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; in the first moments he hauls the cleaver DOWN and IN
across his own thighs and it stays there low, still and nearer his body than it sits in the reference
FOR THE WHOLE REST OF THE CLIP - it never rises, never swings and takes no part in this beat. IN THE
FIRST QUARTER he cocks his bare free fist IN to his own chest, never back past his own hip, and sinks
his hips into a low braced crouch over both planted boots; then he drives that fist DOWN in one short
brutal diagonal hammer-blow into the stone beside his leading boot, his whole mass folding down behind
it from the shoulders and hips. AT THE FORTY PERCENT MARK the first blow lands and knocks a tight burst
of splintered bone shards and grit UPWARD around his knuckles, rising no higher than his own knee,
spreading no wider than one body-width, every piece crumbling away to nothing in mid-air as it falls.
He rips the fist straight back IN to his own chest and drives a SECOND identical blow that lands AT THE
SEVENTY PERCENT MARK, knocking a second bigger burst of the same shards and grit UPWARD around his
knuckles, again rising no higher than his own knee and spreading no wider than one body-width, every piece
crumbling away to nothing in mid-air as it falls. Both bursts are SOLID MATERIAL: opaque,
chunky, sharp-edged chips of dry bone and broken stone - never a glow, never a flame, never a shockwave
of light. THE WHOLE FINAL QUARTER is his slow heavy rise back up out of the crouch, the cleaver riding
back out to the EXACT height and angle it has in the reference image, and his settle into the EXACT
same reference stance. Savage, blunt, final.

## special_3  (RAM'S TOLL) - a coiled crouch held under load, then one horn drive
SPECIAL FINISHER (ram's toll): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he hauls the cleaver DOWN and IN
across his own thighs, where it stays low, still and nearer his body than it sits in the reference for
the whole clip, and sinks his entire body into a deep coiled crouch over both planted boots - skull
dropping between his shoulders, ram horns levelled at screen-right, back arching, free fist clamped
hard against his own ribs - his boots grinding a little grit UP off the stone as his weight settles, no
higher than his own ankle, every piece crumbling away to nothing in mid-air as it falls. HE HOLDS THAT
COILED CROUCH FROM THE END OF THE FIRST QUARTER UNTIL THE SIXTY PERCENT MARK, loading harder the whole
time - his back, neck and shoulders shuddering under the load, his ribs heaving, his weight grinding
slowly forward over his leading boot without either boot leaving the spot it stands on, and his horns
never rising above the height they have in the reference image. THEN AT THE SIXTY PERCENT MARK he
releases all of it in ONE short savage forward-and-DOWN drive of his skull and shoulders out of his
hips, without travelling forward off the spot he stands on, his horns punching down to his own chest
height and his whole weight slamming down through both planted boots - and a low fan of solid
splintered bone shards and grit is BLASTED UPWARD off the stone beneath them, rising no higher than his
own chest, spreading no wider than one body-width, every piece crumbling away to nothing in mid-air as
it falls. The debris is SOLID MATERIAL: opaque, jagged, lit like dry bone and rock - never a glow,
never a flame, never a ring of light. THE WHOLE FINAL THIRD OF THE CLIP is his heavy controlled rise
back up, the cleaver riding back out to the EXACT height and angle it has in the reference image, into
the EXACT same reference stance. Coiled, explosive, final.
