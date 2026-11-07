#!/usr/bin/env bash
# Run the screenshot suite in the Playwright Linux image, as CI does, so baselines match CI.
#   scripts/visual-linux.sh                     compare every story against its baselines
#   scripts/visual-linux.sh --update-snapshots  take new baselines
#   scripts/visual-linux.sh -g <story id>       one story; any Playwright flag passes through
# Baselines a run writes are recompressed losslessly with optipng, so the repository grows less
# with each retake; the pixels, which are what a comparison reads, are unchanged.
set -euo pipefail
args=$(printf '%q ' "$@")
version=$(node -p "require('./node_modules/@playwright/test/package.json').version")
docker run --rm --ipc=host \
    -v "$PWD":/work -v sokkel-ui-linux-modules:/work/node_modules -w /work \
    -e CI=1 \
    "mcr.microsoft.com/playwright:v${version}-noble" \
    bash -c "npm install -g bun >/dev/null 2>&1 && bun install --frozen-lockfile >/dev/null && bun run build-storybook >/dev/null && touch /tmp/started && status=0 && { bunx playwright test ${args} || status=\$?; } && scripts/compress-screenshots.sh /tmp/started && exit \$status"
