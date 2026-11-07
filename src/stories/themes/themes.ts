import candidates from '../../../.storybook/candidates.json'

/** A theme written by scripts/import-candidates.ts, judged beside the library's own before it is adopted. */
interface Candidate {
    value: string
    title: string
    app: string
}
import tokens from '../../../tokens/tokens.json'
import type { ThemeOption, ThemeSettings } from '../../components/ThemePicker'

const title = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

/** Every theme the toolbar offers: the library's own, then the candidates, which answer on the whole document only. */
export const THEMES: ThemeOption[] = [
    ...Object.keys(tokens.themes).map((name) => ({ value: name, label: title(name), swatch: true })),
    ...(candidates as Candidate[]).map((entry) => ({ value: entry.value, label: entry.title, note: `${entry.app}, candidate` })),
]

export const CORNERS: ThemeOption[] = [
    { value: 'theme', label: "Theme's corners" },
    { value: '0px', label: 'Square' },
    { value: '3px', label: '3px' },
    { value: '4px', label: '4px' },
    { value: '5px', label: '5px' },
    { value: '6px', label: '6px' },
    { value: '8px', label: '8px' },
    { value: '10px', label: '10px' },
]

/** The typefaces the toolbar offers, sans and mono together, with mono's x-heights where they differ from the default's. */
export const FACES: Record<string, { label: string; sans: string; mono: string; monoX?: string; monoXSmall?: string }> = {
    geist: {
        label: 'Geist and Geist Mono',
        sans: "'Geist Variable', system-ui, sans-serif",
        mono: "'Geist Mono Variable', ui-monospace, monospace",
        // Mono at the default's share of Geist's x-height (0.530), as 0.45 and 0.49 are of Plex Sans's 0.516.
        monoX: '0.462',
        monoXSmall: '0.503',
    },
    system: {
        label: 'System',
        sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
    },
}

export const TYPEFACES: ThemeOption[] = [
    { value: 'theme', label: "Theme's typeface" },
    ...Object.entries(FACES).map(([value, face]) => ({ value, label: face.label })),
]

/** The story's globals as picker settings, with the toolbar's defaults for any not set. */
export function fromGlobals(globals: Record<string, unknown>): ThemeSettings {
    const read = (key: string, fallback: string) => (typeof globals[key] === 'string' ? (globals[key] as string) : fallback)
    return {
        theme: read('look', 'default'),
        scheme: read('theme', 'dark') === 'light' ? 'light' : 'dark',
        density: read('density', 'regular'),
        corners: read('corners', 'theme'),
        typeface: read('typeface', 'theme'),
        motion: (['on', 'off'] as const).find((one) => one === globals.motion) ?? 'system',
    }
}

/** Settings as Storybook's `globals` URL parameter. */
export function toGlobals(settings: ThemeSettings): string {
    return [
        `theme:${settings.scheme}`,
        `look:${settings.theme}`,
        `density:${settings.density}`,
        `corners:${settings.corners}`,
        `typeface:${settings.typeface}`,
        `motion:${settings.motion ?? 'system'}`,
    ].join(';')
}

const ATTRIBUTES = ['class', 'data-theme', 'data-density', 'data-motion', 'style'] as const

/**
 * Sets the settings on the document as the toolbar does, and answers with a function that puts the
 * document back as it was before.
 */
export function applyToDocument(settings: ThemeSettings): () => void {
    const root = document.documentElement
    const before = ATTRIBUTES.map((name) => [name, root.getAttribute(name)] as const)
    root.classList.toggle('dark', settings.scheme === 'dark')
    if (settings.theme === 'default') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', settings.theme)
    root.setAttribute('data-density', settings.density)
    if (settings.motion === undefined || settings.motion === 'system') root.removeAttribute('data-motion')
    else root.setAttribute('data-motion', settings.motion)
    if (settings.corners === 'theme') root.style.removeProperty('--radius')
    else root.style.setProperty('--radius', settings.corners)
    const face = FACES[settings.typeface]
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
    return () => {
        for (const [name, value] of before) {
            if (value === null) root.removeAttribute(name)
            else root.setAttribute(name, value)
        }
    }
}
