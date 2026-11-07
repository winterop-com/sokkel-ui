import type { Decorator, Preview } from '@storybook/react-vite'

import './storybook.css'
import './candidates.css'
// Geist and Geist Mono, the typeface a theme may choose instead of the default Plex, for the toolbar.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

import { applyAppearance, CORNERS, FACES, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { fromGlobals } from '../src/stories/themes/themes'
import candidates from './candidates.json'

/** A theme written by scripts/import-candidates.ts, judged beside the library's own before it is adopted. */
interface Candidate {
    value: string
    title: string
    app: string
}

/** The library's themes first, then the candidates collected from the apps, marked with their app. */
const TOOLBAR_THEMES = [
    ...THEMES.map((theme) => ({ value: theme.value, title: theme.label })),
    ...(candidates as Candidate[]).map((entry) => ({ value: entry.value, title: `${entry.title} (candidate)`, right: entry.app })),
]

/** The scheme, theme, density, corners, typeface and motion a story is drawn in, worn on the document as an app wears them. */
const withLook: Decorator = (Story, context) => {
    applyAppearance(fromGlobals(context.globals))
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
            toolbar: { title: 'Theme', icon: 'paintbrush', items: TOOLBAR_THEMES, dynamicTitle: true },
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
                items: CORNERS.map((corner) => ({
                    value: corner.value,
                    title: corner.value === 'theme' ? corner.label : corner.value === '0px' ? 'Square corners' : `Corners ${corner.label}`,
                })),
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
