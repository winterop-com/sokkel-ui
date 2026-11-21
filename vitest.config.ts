import { defineConfig } from 'vitest/config'

import { alias } from './vite.config'

export default defineConfig({
    resolve: { alias },
    test: {
        include: [
            'src/**/*.test.{ts,tsx}',
            'packages/*/src/**/*.test.{ts,tsx}',
            'scripts/**/*.test.ts',
            'examples/*/web/{src,server}/**/*.test.ts',
        ],
        // A test that draws a part in the page or reads the token files can take seconds on a busy machine
        // (CI, or several builds beside the suite); the default five fails it for the load, not for a fault.
        testTimeout: 30_000,
    },
})
