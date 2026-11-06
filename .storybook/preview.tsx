import type { Decorator, Preview } from '@storybook/react-vite'

import '../src/styles/index.css'
import './candidates.css'
// Geist and Geist Mono, the typeface a theme may choose instead of the default Plex, for the toolbar.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

import tokens from '../tokens/tokens.json'
import { FACES } from '../src/stories/themes/themes'
import candidates from './candidates.json'

const title = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

/** The library's themes first, then the candidates collected from the apps, marked with their app. */
const THEMES = [
    ...Object.keys(tokens.themes).map((name) => ({ value: name, title: title(name) })),
    ...candidates.map((entry) => ({ value: entry.value, title: `${entry.title} (candidate)`, right: entry.app })),
]

/** The scheme, theme, density, corners and typeface a story is drawn in, set on the document as an app sets them. */
const withLook: Decorator = (Story, context) => {
    const { theme, look, density, corners, typeface, motion } = context.globals as {
        theme?: string
        look?: string
        density?: string
        corners?: string
        typeface?: string
        motion?: string
    }
    const root = document.documentElement
    if (motion === undefined || motion === 'system') root.removeAttribute('data-motion')
    else root.setAttribute('data-motion', motion)
    root.classList.toggle('dark', theme !== 'light')
    if (look === undefined || look === 'default') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', look)
    root.setAttribute('data-density', density ?? 'regular')
    if (corners === undefined || corners === 'theme') root.style.removeProperty('--radius')
    else root.style.setProperty('--radius', corners)
    const face = typeface === undefined ? undefined : FACES[typeface]
    const faceProps: [string, string | undefined][] = [
        ['--typeface-sans', face?.sans],
        ['--typeface-mono', face?.mono],
        ['--mono-x-height', face?.monoX],
        ['--mono-x-height-small', face?.monoXSmall],
    ]
    for (const [name, value] of faceProps) {
        if (value === undefined) root.style.removeProperty(name)
        else root.style.setProperty(name, value)
    }
    return <Story />
}

/**
 * The ground a story stands on. `frame: 'padded'` draws the page's background at the window's full
 * height with room around the story, for a part with a natural width; `frame: 'column'` also
 * centers the story in a column with room between its parts, for a sheet of variants. Without
 * either the story fills the canvas itself, as an app's shell does.
 */
const withFrame: Decorator = (Story, context) => {
    const frame = context.parameters.frame as 'padded' | 'column' | undefined
    if (frame !== 'padded' && frame !== 'column') return <Story />
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            {frame === 'column' ? (
                <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
                    <Story />
                </div>
            ) : (
                <Story />
            )}
        </div>
    )
}

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        backgrounds: { disable: true },
        controls: { disable: true },
        // The foundations and themes first, then the pieces from smallest to whole apps, and research last.
        options: {
            storySort: {
                order: [
                    'Foundations',
                    'Themes',
                    ['All themes', 'Kitchen sink', 'Theme picker', 'Gallery tile'],
                    'Primitives',
                    'Patterns',
                    'Charts',
                    'Maps',
                    'Graphs',
                    'Media',
                    'Apps',
                    'Research',
                ],
            },
        },
        viewport: {
            options: {
                w344: { name: '344 px, foldable folded', styles: { width: '344px', height: '882px' }, type: 'mobile' },
                w360: { name: '360 px', styles: { width: '360px', height: '780px' }, type: 'mobile' },
                w390: { name: '390 px', styles: { width: '390px', height: '844px' }, type: 'mobile' },
                w430: { name: '430 px', styles: { width: '430px', height: '932px' }, type: 'mobile' },
                w690: { name: '690 px, foldable open', styles: { width: '690px', height: '840px' }, type: 'tablet' },
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
                    { value: 'theme', title: "Theme's typeface (Plex)" },
                    ...Object.entries(FACES).map(([value, face]) => ({ value, title: face.label })),
                ],
                dynamicTitle: true,
            },
        },
        motion: {
            description: 'Motion: panels sliding, dialogs zooming, popups fading',
            toolbar: {
                title: 'Motion',
                icon: 'transfer',
                items: [
                    { value: 'system', title: 'As the system asks' },
                    { value: 'on', title: 'Motion on' },
                    { value: 'off', title: 'Motion off' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { theme: 'dark', look: 'default', density: 'regular', corners: 'theme', typeface: 'theme', motion: 'system' },
    decorators: [withFrame, withLook],
}

export default preview
