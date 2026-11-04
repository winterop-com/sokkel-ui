import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.STORYBOOK_PORT ?? 6107)

export default defineConfig({
    testDir: 'e2e',
    snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
    fullyParallel: true,
    reporter: [['line']],
    expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
    use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices['Desktop Chrome'] },
    webServer: {
        command: `bunx storybook dev -p ${PORT} --ci --no-open`,
        url: `http://127.0.0.1:${PORT}/index.json`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
})
