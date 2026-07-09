# Abyss Line — asset map

Theme: **Sunken Treasure**. Wreck of the Golden Sledge, depth 3,800m. All art in flat 2D vector style with bold dark outlines (stroke #03090f–#2a1c06, width 3–6), matching the Rug or Riches vault art.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| bg-deep | #03090f | outer water, vignette |
| bg-water | #081b28 | mid water |
| bg-water-light | #103042 | upper water glow |
| panel | rgba(16,26,36,.93) | UI panels (semi-transparent) |
| panel-border | #2c4356 | panel hairlines |
| text | #e6f1f5 | primary text |
| text-muted | #87a6b5 | labels, captions |
| player-cyan | #35e0d2 | claim line, toggles, primary CTA, sub light |
| player-cyan-deep | #0d3c38 | selected fills |
| gold | #f0b542 | money, multipliers, balance, gauge needle |
| gold-mid | #d9a94f | coin body, ingot front |
| gold-dark | #8a6a26 | coin rim, brass |
| gold-light | #f5d98a | highlights, ingot top |
| danger | #ff5d5d | mines, bust, cracked state |
| wood | #6e4526 / #57351c | chest, wreck hull |

Rule of three: **cyan = player, gold = value, red = danger.** Nothing else carries meaning.

## /backgrounds

| File | Size | Contents |
|---|---|---|
| bg_scene_full.svg/png | 1920×1080 | complete composited scene (fallback, single layer) |
| bg_layer_water.svg | 1920×1080 | radial water gradient, deep→dark |
| bg_layer_godrays.svg | 1920×1080 | 2 faint cyan light shafts from surface |
| bg_layer_wall_left.svg | ~500×1080 | stepped trench rock, 2 depth tones |
| bg_layer_wall_right.svg | ~500×1080 | mirrored trench rock |
| bg_layer_wreck.svg | ~700×500 | galleon hull, broken masts, torn sail, gold portholes |
| bg_layer_seafloor.svg | 1920×200 | sand ridge strip |
| bg_prop_chest.svg | 240×160 | open treasure chest + coin piles + gold glow |
| bg_prop_ingots_a.svg | 160×100 | 3-bar ingot stack (light top / mid front / dark side faces) |
| bg_prop_ingots_b.svg | 120×80 | 2-bar stack variant |
| bg_prop_coinpile.svg | 80×40 | loose coin mound, 3 gold tones |
| bg_prop_kelp.svg | 60×400 | kelp strand, 2 green tones (sway animation) |
| bg_prop_sub.svg | 320×140 | player submarine, cyan porthole, amber lamp + light cone (separate group for aiming at board) |
| bg_particles.svg | sprites | bubbles (outline circles), plankton dots (cyan/violet 2–4px) |

Depth variants (recolor only, same geometry): `reef_shelf` (water +15% lighter, more kelp), `midnight_zone` (default), `hadal_trench` (water −20% darker, red lamp dots, anglerfish silhouette).

## /board

| File | Size | States |
|---|---|---|
| ducat.svg | 96×96 | **idle** (rim #8a6a26, body #d9a94f, pearl ring dashed #b98f3a, center #c99b45, stamped star, top-left shine #f5d98a) · **hover** (shine +20%, scale 1.05) · **selected** (cyan seal overlay #0d3c38 + ring #35e0d2 + route number) · **revealed-gold** (flips to chest/nugget, amber glow) · **revealed-mine** (flips to mine, red glow) · **dimmed** (40% opacity, post-round) |
| route_link.svg | 32×8 | dashed cyan connector between selected ducats |
| mine.svg | 96×96 | spiked sphere #1a2a35, red core #ff5d5d, 8 spikes |
| fx_reveal_gold.svg | frames | coin flip + sparkle burst |
| fx_bust_shockwave.svg | frames | expanding red ring + screen shake cue |
| fx_cashout_surface.svg | frames | sub rises with haul net |

## /icons (24×24, 2px stroke, line style)

ic_clear, ic_pace_step (footprints), ic_pace_instant (lightning), ic_minus, ic_plus, ic_balance (coin), ic_depth_reef (coral), ic_depth_midnight (moon), ic_depth_hadal (skull), ic_gauge, ic_verified (check), ic_receipt, ic_share, ic_play_safe (shield), ic_sound, ic_help, ic_close.

## /ui

| File | Notes |
|---|---|
| panel_bg | semi-transparent #101a24 @ 93%, border #2c4356, radius 10 |
| btn_primary_cyan | fill #35e0d2, text #042220, radius 8, h 44 — one per view |
| btn_primary_disabled | fill #123a42, text #5d8d96, label carries the reason ("RUN THE LINE · 3 MORE") |
| btn_secondary | transparent, border #2c4356, h 36 |
| toggle_segmented | active side #0d3c38 / #8ff2e8 |
| chip_bet | pill; active: bg #2a2410 border+text #f0b542 |
| card_depth | compact row; selected: bg rgba(13,60,56,.94) border #35e0d2 |
| gauge_haul.svg | 240×130 · brass outer arc #3a2e18→#8a6a26, tick marks #c99b45, progress arc #35e0d2, needle #f0b542 (separate node, rotates −120°→+120°), pin gold. Label: "up to N.NNx if the line holds" |
| badge_best | pill, bg #2a2410, border/text #f0b542 |
| statusbar / topbar | same panel style, h 40 / 56 |

## Layout constants

Board 544×544 area centered, HUD zone = board width above it, control column 320px fixed right, topbar 56px, statusbar 40px. The sub's light cone always points at the board. Background never moves; only board contents and panel states change between screens.
