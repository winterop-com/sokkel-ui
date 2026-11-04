#!/usr/bin/env bash
# Run the screenshot suite in the Playwright Linux image, as CI does, so baselines match CI.
#   scripts/visual-linux.sh                     compare every story against its baselines
#   scripts/visual-linux.sh --update-snapshots  take new baselines
#   scripts/visual-linux.sh -g <story id>       one story; any Playwright flag passes through
set -euo pipefail
version=$(node -p "require('./node_modules/@playwright/test/package.json').version")
docker run --rm --ipc=host \
    -v "$PWD":/work -v winterop-ui-linux-modules:/work/node_modules -w /work \
    -e CI=1 \
    "mcr.microsoft.com/playwright:v${version}-noble" \
    bash -c "npm install -g bun >/dev/null 2>&1 && bun install --frozen-lockfile >/dev/null && bun run build-storybook >/dev/null && bunx playwright test $*"
