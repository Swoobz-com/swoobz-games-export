#!/usr/bin/env bash
# Downloads the FOMC event art. Run from the fomc/art directory.
set -e
BASE="https://d8j0ntlcm91z4.cloudfront.net/user_3FLbEdg3frPqTTQKyUf3xpB0P8k"
curl -o chairman-sprites.png "$BASE/hf_20260706_094353_0444f429-1173-49ad-b18e-3f7208bcf406.png"
curl -o fomc-moment.png      "$BASE/hf_20260706_094355_eb2f0995-49e6-452b-8a27-0924dc03d2f1.png"
echo "FOMC art downloaded."
