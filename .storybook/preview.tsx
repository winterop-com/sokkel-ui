import { withThemeByClassName } from '@storybook/addon-themes'
import type { Decorator, Preview } from '@storybook/react-vite'

import '../src/styles/index.css'

/** The palette and density a story is drawn in, set on the document the way an app sets them. */
const withPaletteAndDensity: Decorator = (Story, context) => {
    const { palette, density } = context.globals as { palette?: string; density?: string }
    const root = document.documentElement
    if (palette === undefined || palette === 'dirigent') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', palette)
    root.setAttribute('data-density', density ?? 'regular')
    return <Story />
}

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        backgrounds: { disable: true },
    },
    globalTypes: {
        palette: {
            description: 'Palette',
            toolbar: { title: 'Palette', items: ['dirigent', 'paper', 'contrast'], dynamicTitle: true },
        },
        density: {
            description: 'Density',
            toolbar: { title: 'Density', items: ['regular', 'compact'], dynamicTitle: true },
        },
    },
    initialGlobals: { palette: 'dirigent', density: 'regular' },
    decorators: [
        withPaletteAndDensity,
        withThemeByClassName({ themes: { dark: 'dark', light: '' }, defaultTheme: 'dark', parentSelector: 'html' }),
    ],
}

export default preview
