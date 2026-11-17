import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.STORYBOOK_PORT ?? 6199)

/** The suite runs against the built `storybook-static/`, which `bun run build-storybook` makes. */
const command = `bunx http-server storybook-static -p ${PORT} -s -c-1`

const DEVICES = { chromium: devices['Desktop Chrome'], webkit: devices['Desktop Safari'], firefox: devices['Desktop Firefox'] }

/**
 * The engines a run uses: Chromium unless `ENGINES` names others (`ENGINES=webkit,firefox`), which
 * `make layout-engines` does. CI runs Chromium only.
 */
const engines = (process.env.ENGINES ?? 'chromium').split(',').map((name) => name.trim()) as Array<keyof typeof DEVICES>

export default defineConfig({
    testDir: 'e2e',
    snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
    fullyParallel: true,
    // A test left focused with `.only` fails the run on CI rather than skipping every other test.
    forbidOnly: !!process.env.CI,
    reporter: [['line']],
    // A screenshot of a tall story, such as every icon, can take more than the default five seconds on a busy runner.
    expect: { toHaveScreenshot: { maxDiffPixels: 20, animations: 'disabled', timeout: 20_000 } },
    use: { baseURL: `http://127.0.0.1:${PORT}` },
    projects: engines.map((name) => ({ name, use: { ...DEVICES[name] } })),
    webServer: {
        command,
        url: `http://127.0.0.1:${PORT}/index.json`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
})
