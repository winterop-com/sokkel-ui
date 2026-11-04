import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
    framework: { name: '@storybook/react-vite', options: {} },
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-themes', '@storybook/addon-a11y', '@storybook/addon-docs'],
}

export default config
