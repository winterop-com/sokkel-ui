import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
    framework: { name: '@storybook/react-vite', options: {} },
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
    // An HLS playlist names its segments by relative paths, so the stream is served as a folder.
    staticDirs: [{ from: '../src/stories/media/fixtures/stream', to: '/media/stream' }],
}

export default config
