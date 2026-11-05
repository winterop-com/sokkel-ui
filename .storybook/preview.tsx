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

/** Typefaces a theme may choose, sans and mono together, to try on every story. */
const TYPEFACES: Record<string, { sans: string; mono: string }> = {
    inter: { sans: "'Inter Variable', system-ui, sans-serif", mono: "'JetBrains Mono Variable', ui-monospace, monospace" },
    geist: { sans: "'Geist Variable', system-ui, sans-serif", mono: "'Geist Mono Variable', ui-monospace, monospace" },
    system: {
        sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
    },
}

/** The scheme, theme, density, corners and typeface a story is drawn in, set on the document as an app sets them. */
const withLook: Decorator = (Story, context) => {
    const { theme, look, density, corners, typeface } = context.globals as {
        theme?: string
        look?: string
        density?: string
        corners?: string
        typeface?: string
    }
    const root = document.documentElement
    root.classList.toggle('dark', theme !== 'light')
    if (look === undefined || look === 'default') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', look)
    root.setAttribute('data-density', density ?? 'regular')
    if (corners === undefined || corners === 'theme') root.style.removeProperty('--radius')
    else root.style.setProperty('--radius', corners)
    const face = typeface === undefined ? undefined : TYPEFACES[typeface]
    if (face === undefined) {
        root.style.removeProperty('--typeface-sans')
        root.style.removeProperty('--typeface-mono')
    } else {
        root.style.setProperty('--typeface-sans', face.sans)
        root.style.setProperty('--typeface-mono', face.mono)
    }
    return <Story />
}

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        backgrounds: { disable: true },
        controls: { disable: true },
        // The foundations and themes first, then the pieces from smallest to whole apps, and research last.
        options: {
            storySort: {
                order: ['Foundations', 'Themes', 'Primitives', 'Patterns', 'Charts', 'Maps', 'Graphs', 'Media', 'Apps', 'Research'],
            },
        },
        viewport: {
            options: {
                w360: { name: '360 px', styles: { width: '360px', height: '780px' }, type: 'mobile' },
                w390: { name: '390 px', styles: { width: '390px', height: '844px' }, type: 'mobile' },
                w430: { name: '430 px', styles: { width: '430px', height: '932px' }, type: 'mobile' },
                w768: { name: '768 px', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
                w1024: { name: '1024 px', styles: { width: '1024px', height: '768px' }, type: 'tablet' },
                w1280: { name: '1280 px', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
                w1440: { name: '1440 px', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
                w1920: { name: '1920 px', styles: { width: '1920px', height: '1080px' }, type: 'desktop' },
            },
        },
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
        typeface: {
            description: 'Typeface, overriding the theme',
            toolbar: {
                title: 'Typeface',
                icon: 'markup',
                items: [
                    { value: 'theme', title: "Theme's typeface" },
                    { value: 'inter', title: 'Inter and JetBrains Mono' },
                    { value: 'geist', title: 'Geist and Geist Mono' },
                    { value: 'system', title: 'System (SF Pro, Segoe UI, Roboto)' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { theme: 'dark', look: 'default', density: 'regular', corners: 'theme', typeface: 'theme' },
    decorators: [withLook],
}

export default preview
