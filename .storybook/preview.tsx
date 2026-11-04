import type { Decorator, Preview } from '@storybook/react-vite'

import '../src/styles/index.css'
import './candidates.css'
// Candidate typefaces, loaded for the font comparison stories only.
import '@fontsource-variable/inter'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/jetbrains-mono'

import tokens from '../tokens/tokens.json'
import candidates from './candidates.json'

const title = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

/** The library's themes first, then the candidates collected from the apps, marked with their app. */
const THEMES = [
    ...Object.keys(tokens.themes).map((name) => ({ value: name, title: title(name) })),
    ...candidates.map((entry) => ({ value: entry.value, title: `${entry.title} (candidate)`, right: entry.app })),
]

/** The scheme, theme, density and corners a story is drawn in, set on the document as an app sets them. */
const withLook: Decorator = (Story, context) => {
    const { theme, look, density, corners } = context.globals as { theme?: string; look?: string; density?: string; corners?: string }
    const root = document.documentElement
    root.classList.toggle('dark', theme !== 'light')
    if (look === undefined || look === 'default') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', look)
    root.setAttribute('data-density', density ?? 'regular')
    if (corners === undefined || corners === 'theme') root.style.removeProperty('--radius')
    else root.style.setProperty('--radius', corners)
    return <Story />
}

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        backgrounds: { disable: true },
    },
    globalTypes: {
        theme: {
            description: 'Light or dark',
            toolbar: {
                title: 'Scheme',
                icon: 'mirror',
                items: [
                    { value: 'dark', title: 'Dark', icon: 'moon' },
                    { value: 'light', title: 'Light', icon: 'sun' },
                ],
                dynamicTitle: true,
            },
        },
        look: {
            description: 'Theme',
            toolbar: { title: 'Theme', icon: 'paintbrush', items: THEMES, dynamicTitle: true },
        },
        density: {
            description: 'Density',
            toolbar: {
                title: 'Density',
                icon: 'component',
                items: [
                    { value: 'regular', title: 'Regular density' },
                    { value: 'compact', title: 'Compact density' },
                ],
                dynamicTitle: true,
            },
        },
        corners: {
            description: 'Corner radius, overriding the theme',
            toolbar: {
                title: 'Corners',
                icon: 'circlehollow',
                items: [
                    { value: 'theme', title: "Theme's corners" },
                    { value: '0px', title: 'Square corners' },
                    { value: '3px', title: 'Corners 3px' },
                    { value: '4px', title: 'Corners 4px' },
                    { value: '5px', title: 'Corners 5px' },
                    { value: '6px', title: 'Corners 6px' },
                    { value: '8px', title: 'Corners 8px' },
                    { value: '10px', title: 'Corners 10px' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { theme: 'dark', look: 'default', density: 'regular', corners: 'theme' },
    decorators: [withLook],
}

export default preview
