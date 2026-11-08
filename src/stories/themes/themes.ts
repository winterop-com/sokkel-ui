import candidates from '../../../.storybook/candidates.json'

/** A theme written by scripts/import-candidates.ts, judged beside the library's own before it is adopted. */
interface Candidate {
    value: string
    title: string
    app: string
}
import { applyAppearance, THEMES, type ThemeOption, type ThemeSettings } from '@winterop-com/sokkel-ui/lib/appearance'

/** Every theme the toolbar offers: the library's own, then the candidates, which answer on the whole document only. */
export const TOOLBAR_THEMES: ThemeOption[] = [
    ...THEMES,
    ...(candidates as Candidate[]).map((entry) => ({ value: entry.value, label: entry.title, note: `${entry.app}, candidate` })),
]

/** The story's globals as picker settings, with the toolbar's defaults for any not set. */
export function fromGlobals(globals: Record<string, unknown>): ThemeSettings {
    const read = (key: string, fallback: string) => (typeof globals[key] === 'string' ? (globals[key] as string) : fallback)
    return {
        theme: read('look', 'tidevann'),
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
 * Wears the settings on the document as the toolbar does, and answers with a function that puts the
 * document back as it was before.
 */
export function applyToDocument(settings: ThemeSettings): () => void {
    const root = document.documentElement
    const before = ATTRIBUTES.map((name) => [name, root.getAttribute(name)] as const)
    applyAppearance(settings)
    return () => {
        for (const [name, value] of before) {
            if (value === null) root.removeAttribute(name)
            else root.setAttribute(name, value)
        }
    }
}
