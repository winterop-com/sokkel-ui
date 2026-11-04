import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.STORYBOOK_PORT ?? 6199)

/** With STORYBOOK_STATIC set, the suite serves the built `storybook-static/` rather than the dev server. */
const command =
    process.env.STORYBOOK_STATIC === undefined
        ? `bunx storybook dev -p ${PORT} --ci --no-open`
        : `bunx http-server storybook-static -p ${PORT} -s -c-1`

export default defineConfig({
    testDir: 'e2e',
    snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
    fullyParallel: true,
    reporter: [['line']],
    expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
    use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices['Desktop Chrome'] },
    webServer: {
        command,
        url: `http://127.0.0.1:${PORT}/index.json`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
})
