#!/usr/bin/env bash
# PROMOTE the accepted gargoyle-spear re-rolls into the canonical raw names, then RE-KEY.
#
# WHY THIS IS A SCRIPT AND NOT A COMMAND I TYPED BY HAND (session 31):
#   1. `key-s30-harvest.mjs` derives its input as `qa-boss/raw/<char>-<state>.mp4` from the MANIFEST.
#      It cannot see a `-r2` suffix, so the accepted take must occupy the canonical name.
#   2. The v1 raws must NOT be destroyed — they are the controls that several gates were validated
#      against, so they move to raw/v1-superseded/ rather than being overwritten.
#   3. ⛔ NEVER run the keyer with `--state`. `key-s30-harvest.mjs:188` writes the summary with ONLY the
#      rows processed in that run, so a single-state run TRUNCATES the whole summary. It has already
#      destroyed data once: oni-tetsubo has 9 keyed webms on disk and 1 row + `failed: []` in its
#      summary, which also erased the record of its documented special_1 refusal. So: FULL --char.
#
# It REFUSES rather than half-completing: every accepted take must be present before anything moves.
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=qa-boss/raw
SUP=$RAW/v1-superseded
# ⛔ FIVE states, not six. `attack_throw` is PARKED after 7 failed generations (FINDING 12): its v7 was
# gate-perfect on all six geometric gates and STILL wrong — spear fully vertical, head UP, butt planted,
# one-handed. It therefore KEEPS ITS v1 RAW, whose own known defects are rubble-persist + LEFT 34px.
# Do NOT read the keyed attack_throw clip as accepted; it is the best available, not a passing take.
STATES=(attack_strike_b attack_block attack_block_b hit attack_throw_b)

echo "== PRECHECK: all 6 accepted -r2 takes present? =="
missing=0
for s in "${STATES[@]}"; do
  if [ -f "$RAW/gargoyle-spear-$s-r2.mp4" ]; then
    printf '  OK      %s\n' "$s"
  else
    printf '  MISSING %s  <- gargoyle-spear-%s-r2.mp4\n' "$s" "$s"; missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  echo; echo "⛔ REFUSING — not every state has an accepted re-roll yet. Nothing was moved."; exit 2
fi

echo
echo "== PRECHECK: re-run every gate on all 6, so promotion cannot outrun acceptance =="
fail=0
for s in "${STATES[@]}"; do
  f="$RAW/gargoyle-spear-$s-r2.mp4"
  node scripts/check-containment.mjs "$f" --plate green >/dev/null 2>&1 || { echo "  ⛔ containment  $s"; fail=1; }
  node qa-boss/check-feet-planted.mjs "$f"            >/dev/null 2>&1 || { echo "  ⛔ feet-planted $s"; fail=1; }
  node qa-boss/check-floor-growth.mjs "$f"            >/dev/null 2>&1 || { echo "  ⛔ floor-growth $s"; fail=1; }
  # extra-objects legitimately exits 1 on states that shed declared debris (throw A's five chips),
  # so it is reported, never fatal — read it by eye against the state's own declared count.
  node qa-boss/check-extra-objects.mjs "$f" >/dev/null 2>&1 || echo "  note: extra-objects exit 1 on $s (declared debris? VIEW IT)"
done
if [ "$fail" -ne 0 ]; then echo; echo "⛔ REFUSING — a gate failed above. Nothing was moved."; exit 1; fi
echo "  all hard gates green"

echo
echo "== MOVE v1 aside, promote -r2 to canonical =="
mkdir -p "$SUP"
for s in "${STATES[@]}"; do
  mv -v "$RAW/gargoyle-spear-$s.mp4"    "$SUP/gargoyle-spear-$s.mp4"
  mv -v "$RAW/gargoyle-spear-$s-r2.mp4" "$RAW/gargoyle-spear-$s.mp4"
done

echo
echo "== VERIFY all 12 canonical states present for the keyer =="
for s in attack_strike attack_strike_b attack_throw attack_throw_b attack_block attack_block_b hit ko victory special_1 special_2 special_3; do
  [ -f "$RAW/gargoyle-spear-$s.mp4" ] || { echo "⛔ missing canonical $s"; exit 1; }
done
echo "  12/12 present"

echo
echo "== RE-KEY THE WHOLE CHARACTER (never --state) =="
node qa-boss/key-s30-harvest.mjs --char gargoyle-spear
