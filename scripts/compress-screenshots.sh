#!/usr/bin/env bash
# Recompresses, losslessly, the screenshot baselines written after the given marker file, installing
# optipng first where it is missing. The pixels stay the same; the files get about a quarter smaller.
#   scripts/compress-screenshots.sh <marker>
set -euo pipefail
marker=$1
mapfile -d '' written < <(find e2e/__screenshots__ -name '*.png' -newer "$marker" -print0)
[ ${#written[@]} -eq 0 ] && exit 0
if ! command -v optipng >/dev/null; then
    apt-get update >/dev/null 2>&1 && apt-get install -y -qq optipng >/dev/null 2>&1
fi
printf '%s\0' "${written[@]}" | xargs -0 -P "$(nproc)" -n 16 optipng -quiet -o2 -strip all
echo "Recompressed ${#written[@]} baselines."
