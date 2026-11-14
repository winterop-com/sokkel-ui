import type { ReactNode } from 'react'

import type { ThemeOption, ThemeSettings } from '../lib/appearance'
import { cn } from '../lib/cn'
import { ChoiceList } from './ChoiceList'
import type { Setting } from './settings-parts'
import { SchemeChoice } from './SchemeChoice'
import { Segmented } from './Segmented'
import { ThemeCards } from './ThemeCards'
import { ThemeSwatch } from './theme-swatch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export type { ThemeOption, ThemeSettings } from '../lib/appearance'

export interface ThemePickerWords {
    theme: string
    scheme: string
    dark: string
    light: string
    system: string
    density: string
    regular: string
    compact: string
    corners: string
    typeface: string
    motion: string
    motionSystem: string
    motionOn: string
    motionOff: string
    /** The lines under each choice's title when `themeSettings` makes them settings rows. */
    themeHint: string
    schemeHint: string
    schemeSystemHint: string
    densityHint: string
    cornersHint: string
    typefaceHint: string
    motionHint: string
}

const WORDS: ThemePickerWords = {
    theme: 'Theme',
    scheme: 'Scheme',
    dark: 'Dark',
    light: 'Light',
    system: 'System',
    density: 'Density',
    regular: 'Regular',
    compact: 'Compact',
    corners: 'Corners',
    typeface: 'Typeface',
    motion: 'Motion',
    motionSystem: 'System',
    motionOn: 'On',
    motionOff: 'Off',
    themeHint: 'The colors of surfaces, lines, text and the accent.',
    schemeHint: 'Dark or light.',
    schemeSystemHint: 'Dark, light, or as the device is set.',
    densityHint: 'How much fits on a screen.',
    cornersHint: 'How round the corners are.',
    typefaceHint: 'The type the text is set in.',
    motionHint: 'Whether parts move as they open and change.',
}

export interface ThemePickerProps {
    value: ThemeSettings
    onChange: (next: ThemeSettings) => void
    themes: readonly ThemeOption[]
    /** The density levels; regular and compact when not given, none when empty. */
    densities?: readonly ThemeOption[]
    /** The corner radii; the row shows only when given. */
    corners?: readonly ThemeOption[]
    /** The typefaces; the row shows only when given. */
    typefaces?: readonly ThemeOption[]
    /** Offers the system's scheme beside dark and light, which follows the device until one is chosen. */
    system?: boolean
    /**
     * Lists the themes as rows, each with its swatch, its name and the line saying how it looks,
     * the chosen one filled, in place of a select; for a settings section with room for them.
     */
    themeList?: boolean
    /** Draws the themes as `ThemeCards`, each a small page in its own theme, in place of a select or a list. */
    themeCards?: boolean
    className?: string
    words?: Partial<ThemePickerWords>
}

/**
 * The appearance controls an app's settings show: the named theme, dark or light, the density,
 * the corners, the typeface and the motion. It holds no state and applies nothing; `onChange` answers with the
 * whole settings, and the app sets them where it keeps its look, as `useAppearance` keeps and wears them.
 *
 * The theme and scheme are always offered, the system's scheme as a third when `system` is set. Density offers regular and compact unless given its
 * own options; corners and typeface show only when given options. A theme marked `swatch` is
 * drawn as a small sample of its background, text and accent, and one with a `description` says
 * how it looks on a line under its name. `themeList` lists the themes as rows in place of a select,
 * and `themeCards` draws them as cards. An app that puts the theme and the scheme in two settings
 * rows uses `ThemeCards` and `SchemeChoice` on their own, as this picker does.
 */
export function ThemePicker({ className, ...props }: ThemePickerProps) {
    return (
        <div data-slot="theme-picker" className={cn('flex flex-col gap-4', className)}>
            {choices(props, false).map((choice) => (
                <Row key={choice.id} label={choice.title}>
                    {choice.control}
                </Row>
            ))}
        </div>
    )
}

/**
 * The same choices as settings rows, one each, for a `SettingsDialog` section: each with its title
 * and a line on what it changes, found by its own words in the settings' search, and its control
 * beside it while the row has room, under it on a phone. The themes as a list or as cards sit
 * under their row's line.
 */
export function themeSettings(props: Omit<ThemePickerProps, 'className'>): Setting[] {
    return choices(props, true).map(({ id, title, description, keywords, control, wide }) => ({
        id,
        title,
        description,
        keywords,
        control,
        layout: wide ? 'below' : 'auto',
    }))
}

interface Part {
    id: string
    title: string
    description: string
    keywords: string[]
    control: ReactNode
    wide: boolean
}

/** Each choice the picker offers; `beside` sizes the controls for a settings row's trailing column. */
function choices(
    {
        value,
        onChange,
        themes,
        densities,
        corners,
        typefaces,
        system = false,
        themeList = false,
        themeCards = false,
        words: given,
    }: Omit<ThemePickerProps, 'className'>,
    beside: boolean,
): Part[] {
    const words = { ...WORDS, ...given }
    const levels = densities ?? [
        { value: 'regular', label: words.regular },
        { value: 'compact', label: words.compact },
    ]
    const set = <K extends keyof ThemeSettings>(key: K, next: ThemeSettings[K]) => onChange({ ...value, [key]: next })
    const fill = !beside
    const out: Part[] = [
        {
            id: 'theme',
            title: words.theme,
            description: words.themeHint,
            keywords: themes.map((theme) => theme.label),
            wide: themeCards || themeList,
            control: themeCards ? (
                <ThemeCards
                    value={value.theme}
                    themes={themes}
                    onValueChange={(next) => set('theme', next)}
                    words={{ theme: words.theme }}
                />
            ) : themeList ? (
                <ChoiceList
                    label={words.theme}
                    value={value.theme}
                    options={themes.map((option) => ({
                        value: option.value,
                        label: <OptionLabel option={option} swatches={themes.some((one) => one.swatch === true)} />,
                        description: option.description,
                    }))}
                    onValueChange={(next) => set('theme', next)}
                />
            ) : (
                <Choice
                    label={words.theme}
                    value={value.theme}
                    options={themes}
                    beside={beside}
                    onValueChange={(next) => set('theme', next)}
                />
            ),
        },
        {
            id: 'scheme',
            title: words.scheme,
            description: system ? words.schemeSystemHint : words.schemeHint,
            keywords: [words.dark, words.light, ...(system ? [words.system] : [])],
            wide: false,
            control: (
                <SchemeChoice
                    value={value.scheme}
                    schemes={system ? ['dark', 'light', 'system'] : ['dark', 'light']}
                    fill={fill}
                    onValueChange={(next) => set('scheme', next)}
                    words={words}
                />
            ),
        },
    ]
    if (levels.length > 0)
        out.push({
            id: 'density',
            title: words.density,
            description: words.densityHint,
            keywords: levels.map((level) => level.label),
            wide: false,
            control: (
                <Segmented
                    label={words.density}
                    value={value.density}
                    options={levels}
                    fill={fill}
                    onValueChange={(next) => set('density', next)}
                />
            ),
        })
    if (corners !== undefined && corners.length > 0)
        out.push({
            id: 'corners',
            title: words.corners,
            description: words.cornersHint,
            keywords: ['radius', 'round'],
            wide: false,
            control: (
                <Choice
                    label={words.corners}
                    value={value.corners}
                    options={corners}
                    beside={beside}
                    onValueChange={(next) => set('corners', next)}
                />
            ),
        })
    if (typefaces !== undefined && typefaces.length > 0)
        out.push({
            id: 'typeface',
            title: words.typeface,
            description: words.typefaceHint,
            keywords: ['font'],
            wide: false,
            control: (
                <Choice
                    label={words.typeface}
                    value={value.typeface}
                    options={typefaces}
                    beside={beside}
                    onValueChange={(next) => set('typeface', next)}
                />
            ),
        })
    if (value.motion !== undefined)
        out.push({
            id: 'motion',
            title: words.motion,
            description: words.motionHint,
            keywords: ['animation'],
            wide: false,
            control: (
                <Segmented
                    label={words.motion}
                    value={value.motion}
                    options={[
                        { value: 'system', label: words.motionSystem },
                        { value: 'on', label: words.motionOn },
                        { value: 'off', label: words.motionOff },
                    ]}
                    fill={fill}
                    onValueChange={(next) => set('motion', next)}
                />
            ),
        })
    return out
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span aria-hidden className="text-xs font-medium text-muted-foreground">
                {label}
            </span>
            {children}
        </div>
    )
}

function Choice({
    label,
    value,
    options,
    beside,
    onValueChange,
}: {
    label: string
    value: string
    options: readonly ThemeOption[]
    beside: boolean
    onValueChange: (value: string) => void
}) {
    const swatches = options.some((option) => option.swatch === true)
    return (
        <Select
            items={options.map((option) => ({
                value: option.value,
                label: option.label,
            }))}
            value={value}
            onValueChange={(next) => next !== null && onValueChange(next)}
        >
            <SelectTrigger className={beside ? 'w-full @lg:w-56' : 'w-full'} aria-label={label}>
                <SelectValue>
                    {(chosen: string) => {
                        const option = options.find((entry) => entry.value === chosen)
                        return option === undefined ? chosen : <OptionLabel option={option} swatches={swatches} />
                    }}
                </SelectValue>
            </SelectTrigger>
            <SelectContent
                alignItemWithTrigger={false}
                className="max-h-80 w-max max-w-[min(24rem,var(--available-width))] min-w-(--anchor-width)"
            >
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.description === undefined ? (
                            <OptionLabel option={option} swatches={swatches} />
                        ) : (
                            <span className="flex min-w-0 flex-col">
                                <OptionLabel option={option} swatches={swatches} />
                                <span className="text-xs whitespace-normal text-muted-foreground">{option.description}</span>
                            </span>
                        )}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

function OptionLabel({ option, swatches }: { option: ThemeOption; swatches: boolean }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            {swatches && <ThemeSwatch theme={option.swatch === true ? option.value : null} />}
            <span className="truncate">{option.label}</span>
            {option.note !== undefined && <span className="truncate text-xs text-muted-foreground">{option.note}</span>}
        </span>
    )
}
