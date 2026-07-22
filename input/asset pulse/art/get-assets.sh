#!/usr/bin/env bash
# Downloads the generated Pulse art. Run from the "asset pulse/art" directory.
set -e
BASE="https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k"
curl -o pulse-bg-terminal.png   "$BASE/hf_20260706_001102_490824ed-3141-422e-b920-9a96b29fb2b6.png"
curl -o pulse-wick-save-key.png "$BASE/hf_20260706_001105_9d96b542-c62f-4e9f-a171-eab4ddf315de.png"
echo "Pulse art downloaded."
