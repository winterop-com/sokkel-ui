import { withThemeByClassName } from '@storybook/addon-themes'
import type { Decorator, Preview } from '@storybook/react-vite'

import '../src/styles/index.css'

/** The theme and density a story is drawn in, set on the document the way an app sets them. */
const withThemeAndDensity: Decorator = (Story, context) => {
    const { look, density } = context.globals as { look?: string; density?: string }
    const root = document.documentElement
    if (look === undefined || look === 'default') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', look)
    root.setAttribute('data-density', density ?? 'regular')
    return <Story />
}

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        backgrounds: { disable: true },
    },
    globalTypes: {
        look: {
            description: 'Theme',
            toolbar: { title: 'Theme', items: ['default',  'paper',  'contrast',  'tokyo',  'vinyl',  'cassette',  'neon'], dynamicTitle: true },
        },
        density: {
            description: 'Density',
            toolbar: { title: 'Density', items: ['regular', 'compact'], dynamicTitle: true },
        },
    },
    initialGlobals: { look: 'default', density: 'regular' },
    decorators: [
        withThemeAndDensity,
        withThemeByClassName({ themes: { dark: 'dark', light: '' }, defaultTheme: 'dark', parentSelector: 'html' }),
    ],
}

export default preview
