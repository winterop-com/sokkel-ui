import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.STORYBOOK_PORT ?? 6199)

/** The suite runs against the built `storybook-static/`, which `bun run build-storybook` makes. */
const command = `bunx http-server storybook-static -p ${PORT} -s -c-1`

export default defineConfig({
    testDir: 'e2e',
    snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
    fullyParallel: true,
    reporter: [['line']],
    // A screenshot of a tall story, such as every icon, can take more than the default five seconds on a busy runner.
    expect: { toHaveScreenshot: { maxDiffPixels: 20, animations: 'disabled', timeout: 20_000 } },
    use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices['Desktop Chrome'] },
    webServer: {
        command,
        url: `http://127.0.0.1:${PORT}/index.json`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
})
