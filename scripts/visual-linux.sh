#!/usr/bin/env bash
# Run the screenshot suite in the Playwright Linux image, as CI does, so baselines match CI.
#   scripts/visual-linux.sh            compare against the baselines
#   scripts/visual-linux.sh --update   take new baselines
set -euo pipefail
version=$(node -p "require('./node_modules/@playwright/test/package.json').version")
docker run --rm --ipc=host \
    -v "$PWD":/work -v winterop-ui-linux-modules:/work/node_modules -w /work \
    -e CI=1 -e STORYBOOK_STATIC=1 \
    "mcr.microsoft.com/playwright:v${version}-noble" \
    bash -c "npm install -g bun >/dev/null 2>&1 && bun install --frozen-lockfile >/dev/null && bun run build-storybook >/dev/null && bunx playwright test ${1:+--update-snapshots}"
