import { Monitor, Moon, Palette, Rows3, Sun } from 'lucide-react'

import type { PaletteCommand, PaletteGroup } from '../components/CommandPalette'
import type { RailEntry, RailGroup } from '../components/Rail'
import { THEMES, type Scheme, type ThemeOption, type ThemeSettings } from './appearance'

/**
 * The palette's groups in the order it lists them. Groups of one title are drawn as one, at the
 * first one's place and with the lowest rank among them; within it, the first command of an id
 * stands and a later one of the same id is left out, so a screen's command overrides the app's
 * when the screen's groups come first. Empty groups are left out, and the rest are sorted by
 * `rank`, lowest first (0 when not given), keeping their order at equal rank.
 */
export function mergeCommands(groups: readonly PaletteGroup[]): PaletteGroup[] {
    const merged = new Map<string, { rank: number; order: number; commands: PaletteCommand[]; ids: Set<string> }>()
    for (const group of groups) {
        const held = merged.get(group.title) ?? { rank: group.rank ?? 0, order: merged.size, commands: [], ids: new Set<string>() }
        held.rank = Math.min(held.rank, group.rank ?? 0)
        for (const command of group.commands) {
            if (held.ids.has(command.id)) continue
            held.ids.add(command.id)
            held.commands.push(command)
        }
        merged.set(group.title, held)
    }
    return [...merged.entries()]
        .filter(([, held]) => held.commands.length > 0)
        .sort(([, left], [, right]) => left.rank - right.rank || left.order - right.order)
        .map(([title, held]) => ({ title, commands: held.commands, ...(held.rank === 0 ? {} : { rank: held.rank }) }))
}

/**
 * How well a command answers a query when every word typed must match: 0 when a word is found in
 * none of its label, keywords, hint, code, second line and `group`; else 4 for a label starting
 * with the query, 3 for a label holding it, 2 for a label holding every word, and 1 for the rest.
 * Case is ignored, and an empty query answers 1 for every command.
 */
export function termScore(command: PaletteCommand, query: string, group = ''): number {
    const asked = query.trim().toLowerCase()
    if (asked === '') return 1
    const terms = asked.split(/\s+/)
    const label = command.label.toLowerCase()
    const found = [label, group, command.hint ?? '', command.code ?? '', command.detail ?? '', ...(command.keywords ?? [])]
        .join('\n')
        .toLowerCase()
    if (!terms.every((term) => found.includes(term))) return 0
    if (label.startsWith(asked)) return 4
    if (label.includes(asked)) return 3
    if (terms.every((term) => label.includes(term))) return 2
    return 1
}

/**
 * The groups a query leaves, by `score` (0 leaves a command out): each group's commands best
 * first, the groups by their best command, ties in the order given, empty groups left out. An
 * empty query leaves the groups as they are.
 */
export function filterCommands(
    groups: readonly PaletteGroup[],
    query: string,
    score: (command: PaletteCommand, query: string, group: string) => number,
): PaletteGroup[] {
    if (query.trim() === '') return [...groups]
    return groups
        .map((group) => {
            const scored = group.commands
                .map((command) => ({ command, score: score(command, query, group.title) }))
                .filter((one) => one.score > 0)
                .sort((left, right) => right.score - left.score)
            return { group: { ...group, commands: scored.map((one) => one.command) }, best: scored[0]?.score ?? 0 }
        })
        .filter((one) => one.best > 0)
        .sort((left, right) => right.best - left.best)
        .map((one) => one.group)
}

/**
 * A "Go to" group for the command palette, made from the rail's groups: every entry that leads
 * somewhere, the entries folded under a parent included, hinted by its description, or else by its
 * parent's label, and found by its `keywords` too.
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
                ...(entry.keywords === undefined ? {} : { keywords: entry.keywords }),
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
 * The parts of the look the palette offers, each the choice in use and how to change it, for an
 * app that keeps its look itself; a part without its callback is not offered.
 */
export interface AppearanceParts {
    scheme?: Scheme
    onSchemeChange?: (scheme: Scheme) => void
    density?: string
    onDensityChange?: (density: string) => void
    theme?: string
    onThemeChange?: (theme: string) => void
}

/** What `appearanceCommands` offers beyond the parts: the themes listed and the words. */
export interface AppearanceCommandOptions {
    /** The themes the Theme group lists, every theme in the tokens when not given. */
    themes?: readonly ThemeOption[]
    words?: Partial<AppearanceCommandWords>
}

/**
 * Command palette groups that change the look: the scheme (light, dark, the system's), the
 * density, and the themes, the choice in use hinted. Given `useAppearance`'s settings and setter,
 * each command answers with the whole settings, one part changed. Given the parts instead, each
 * with its callback (`onSchemeChange`, `onDensityChange`, `onThemeChange`), each command calls its
 * part's, so an app that keeps its look under its own keys is never overruled; a part without a
 * callback is left out.
 */
export function appearanceCommands(
    settings: ThemeSettings,
    onChange: (next: ThemeSettings) => void,
    options?: AppearanceCommandOptions,
): PaletteGroup[]
export function appearanceCommands(parts: AppearanceParts, options?: AppearanceCommandOptions): PaletteGroup[]
export function appearanceCommands(
    look: ThemeSettings | AppearanceParts,
    second?: ((next: ThemeSettings) => void) | AppearanceCommandOptions,
    third?: AppearanceCommandOptions,
): PaletteGroup[] {
    const whole = typeof second === 'function' ? { settings: look as ThemeSettings, onChange: second } : undefined
    const parts: AppearanceParts =
        whole === undefined
            ? (look as AppearanceParts)
            : {
                  scheme: whole.settings.scheme,
                  onSchemeChange: (scheme) => whole.onChange({ ...whole.settings, scheme }),
                  density: whole.settings.density,
                  onDensityChange: (density) => whole.onChange({ ...whole.settings, density }),
                  theme: whole.settings.theme,
                  onThemeChange: (theme) => whole.onChange({ ...whole.settings, theme }),
              }
    const { themes = THEMES, words: given } = (whole === undefined ? (second as AppearanceCommandOptions | undefined) : third) ?? {}
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
    const groups: PaletteGroup[] = []
    const { onSchemeChange, onDensityChange, onThemeChange } = parts
    if (onSchemeChange !== undefined)
        groups.push({
            title: words.scheme,
            commands: schemes.map((scheme) => ({
                id: `scheme-${scheme.value}`,
                label: scheme.label,
                icon: scheme.icon,
                hint: hint(parts.scheme === scheme.value),
                keywords: [words.scheme, words.theme],
                onSelect: () => onSchemeChange(scheme.value),
            })),
        })
    if (onDensityChange !== undefined)
        groups.push({
            title: words.density,
            commands: densities.map((density) => ({
                id: `density-${density.value}`,
                label: density.label,
                icon: Rows3,
                hint: hint(parts.density === density.value),
                keywords: [words.density],
                onSelect: () => onDensityChange(density.value),
            })),
        })
    if (onThemeChange !== undefined)
        groups.push({
            title: words.theme,
            commands: themes.map((theme) => ({
                id: `theme-${theme.value}`,
                label: theme.label,
                icon: Palette,
                hint: hint(parts.theme === theme.value),
                keywords: [words.theme],
                onSelect: () => onThemeChange(theme.value),
            })),
        })
    return groups
}
