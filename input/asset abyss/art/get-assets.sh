#!/usr/bin/env bash
# Downloads all generated Abyss Line art into art/. Run from the "asset abyss/art" directory.
set -e
BASE="https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k"
curl -o bg/abyss-bg-4k.png            "$BASE/hf_20260705_234248_4a9da0d7-d6c6-4d4f-be1f-b764b87e0a68.png"
curl -o bg/abyss-bg-1k.png            "$BASE/hf_20260705_233345_41a22624-6ff4-49af-b08c-37ee99e60013.png"
curl -o bg/abyss-bg-reef-shelf.png    "$BASE/hf_20260705_234256_0b5df7ba-db63-4ff6-8363-eb811a8c4799.png"
curl -o bg/abyss-bg-hadal-trench.png  "$BASE/hf_20260705_234257_46798f3a-cff0-49ee-ac3d-9c16a9400c01.png"
curl -o sprites/abyss-tokens.png              "$BASE/hf_20260705_233346_6dd2461d-9c31-48bb-9ab4-bd6dabba7e32.png"
curl -o sprites/abyss-tokens-transparent.png  "$BASE/hf_20260705_234254_f98a695e-c2b4-406b-b49b-1fb74cea81e2.png"
curl -o sprites/abyss-uikit.png               "$BASE/hf_20260705_233350_2d308329-3b2d-4e52-b127-4131db64cb20.png"
curl -o reference/abyss-example-entry.png     "$BASE/hf_20260705_234318_9f2e9513-fab3-447e-9d98-82a76948cadc.png"
curl -o reference/abyss-example-setup.png     "$BASE/hf_20260705_234324_8c1007ac-569a-4a23-8599-a5f0edc521f3.png"
echo "All Abyss Line art downloaded."
