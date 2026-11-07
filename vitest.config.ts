import { defineConfig } from 'vitest/config'

import { alias } from './vite.config'

export default defineConfig({
    resolve: { alias },
    test: { include: ['src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'] },
})
