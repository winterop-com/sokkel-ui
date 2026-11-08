import { Monitor, Moon, Palette, Rows3, Sun } from 'lucide-react'

import type { PaletteCommand, PaletteGroup } from '../components/CommandPalette'
import type { RailEntry, RailGroup } from '../components/Rail'
import { THEMES, type ThemeOption, type ThemeSettings } from './appearance'

/**
 * A "Go to" group for the command palette, made from the rail's groups: every entry that leads
 * somewhere, the entries folded under a parent included, hinted by its description, or else by its
 * parent's label.
 * `navigate` is called with the entry's `href` and the entry.
 */
export function placeCommands(
    groups: readonly RailGroup[],
    navigate: (href: string, entry: RailEntry) => void,
    words: { title: string } = { title: 'Go to' },
): PaletteGroup[] {
    const commands: PaletteCommand[] = []
    const add = (entry: RailEntry, parent?: RailEntry) => {
        const href = entry.href
        if (href !== undefined)
            commands.push({
                id: `place-${entry.id}`,
                label: entry.label,
                icon: entry.icon ?? parent?.icon,
                hint: entry.description ?? parent?.label,
                onSelect: () => navigate(href, entry),
            })
        for (const child of entry.entries ?? []) add(child, entry)
    }
    for (const group of groups) for (const entry of group.entries) add(entry)
    return commands.length === 0 ? [] : [{ title: words.title, commands }]
}

export interface AppearanceCommandWords {
    scheme: string
    light: string
    dark: string
    system: string
    density: string
    regular: string
    compact: string
    theme: string
    /** The hint on the choice in use. */
    current: string
}

const WORDS: AppearanceCommandWords = {
    scheme: 'Scheme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    density: 'Density',
    regular: 'Regular',
    compact: 'Compact',
    theme: 'Theme',
    current: 'in use',
}

/**
 * Command palette groups that change the look: the scheme (light, dark, the system's), the
 * density, and every theme. Built on `useAppearance`'s settings and setter; each command answers
 * with the whole settings, one part changed. The choice in use is hinted.
 */
export function appearanceCommands(
    settings: ThemeSettings,
    onChange: (next: ThemeSettings) => void,
    { themes = THEMES, words: given }: { themes?: readonly ThemeOption[]; words?: Partial<AppearanceCommandWords> } = {},
): PaletteGroup[] {
    const words = { ...WORDS, ...given }
    const hint = (inUse: boolean) => (inUse ? words.current : undefined)
    const schemes = [
        { value: 'light', label: words.light, icon: Sun },
        { value: 'dark', label: words.dark, icon: Moon },
        { value: 'system', label: words.system, icon: Monitor },
    ] as const
    const densities = [
        { value: 'regular', label: words.regular },
        { value: 'compact', label: words.compact },
    ]
    return [
        {
            title: words.scheme,
            commands: schemes.map((scheme) => ({
                id: `scheme-${scheme.value}`,
                label: scheme.label,
                icon: scheme.icon,
                hint: hint(settings.scheme === scheme.value),
                keywords: [words.scheme, words.theme],
                onSelect: () => onChange({ ...settings, scheme: scheme.value }),
            })),
        },
        {
            title: words.density,
            commands: densities.map((density) => ({
                id: `density-${density.value}`,
                label: density.label,
                icon: Rows3,
                hint: hint(settings.density === density.value),
                keywords: [words.density],
                onSelect: () => onChange({ ...settings, density: density.value }),
            })),
        },
        {
            title: words.theme,
            commands: themes.map((theme) => ({
                id: `theme-${theme.value}`,
                label: theme.label,
                icon: Palette,
                hint: hint(settings.theme === theme.value),
                keywords: [words.theme],
                onSelect: () => onChange({ ...settings, theme: theme.value }),
            })),
        },
    ]
}
