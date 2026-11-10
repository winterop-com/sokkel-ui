import type { ReactNode } from 'react'

import type { ThemeOption, ThemeSettings } from '../lib/appearance'
import { cn } from '../lib/cn'
import { ChoiceList } from './ChoiceList'
import { SchemeChoice } from './SchemeChoice'
import { Segmented } from './Segmented'
import { ThemeCards } from './ThemeCards'
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
export function ThemePicker({
    value,
    onChange,
    themes,
    densities,
    corners,
    typefaces,
    system = false,
    themeList = false,
    themeCards = false,
    className,
    words: given,
}: ThemePickerProps) {
    const words = { ...WORDS, ...given }
    const levels = densities ?? [
        { value: 'regular', label: words.regular },
        { value: 'compact', label: words.compact },
    ]
    const set = <K extends keyof ThemeSettings>(key: K, next: ThemeSettings[K]) => onChange({ ...value, [key]: next })
    return (
        <div data-slot="theme-picker" className={cn('flex flex-col gap-4', className)}>
            <Row label={words.theme}>
                {themeCards ? (
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
                    <Choice label={words.theme} value={value.theme} options={themes} onValueChange={(next) => set('theme', next)} />
                )}
            </Row>
            <Row label={words.scheme}>
                <SchemeChoice
                    value={value.scheme}
                    schemes={system ? ['dark', 'light', 'system'] : ['dark', 'light']}
                    fill
                    onValueChange={(next) => set('scheme', next)}
                    words={words}
                />
            </Row>
            {levels.length > 0 && (
                <Row label={words.density}>
                    <Segmented
                        label={words.density}
                        value={value.density}
                        options={levels}
                        fill
                        onValueChange={(next) => set('density', next)}
                    />
                </Row>
            )}
            {corners !== undefined && corners.length > 0 && (
                <Row label={words.corners}>
                    <Choice label={words.corners} value={value.corners} options={corners} onValueChange={(next) => set('corners', next)} />
                </Row>
            )}
            {typefaces !== undefined && typefaces.length > 0 && (
                <Row label={words.typeface}>
                    <Choice
                        label={words.typeface}
                        value={value.typeface}
                        options={typefaces}
                        onValueChange={(next) => set('typeface', next)}
                    />
                </Row>
            )}
            {value.motion !== undefined && (
                <Row label={words.motion}>
                    <Segmented
                        label={words.motion}
                        value={value.motion}
                        options={[
                            { value: 'system', label: words.motionSystem },
                            { value: 'on', label: words.motionOn },
                            { value: 'off', label: words.motionOff },
                        ]}
                        fill
                        onValueChange={(next) => set('motion', next)}
                    />
                </Row>
            )}
        </div>
    )
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
    onValueChange,
}: {
    label: string
    value: string
    options: readonly ThemeOption[]
    onValueChange: (value: string) => void
}) {
    const swatches = options.some((option) => option.swatch === true)
    return (
        <Select
            items={options.map((option) => ({ value: option.value, label: option.label }))}
            value={value}
            onValueChange={(next) => next !== null && onValueChange(next)}
        >
            <SelectTrigger className="w-full" aria-label={label}>
                <SelectValue>
                    {(chosen: string) => {
                        const option = options.find((entry) => entry.value === chosen)
                        return option === undefined ? chosen : <OptionLabel option={option} swatches={swatches} />
                    }}
                </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-80">
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.description === undefined ? (
                            <OptionLabel option={option} swatches={swatches} />
                        ) : (
                            <span className="flex min-w-0 flex-col">
                                <OptionLabel option={option} swatches={swatches} />
                                <span className="text-xs text-muted-foreground">{option.description}</span>
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
            {swatches && <Swatch theme={option.swatch === true ? option.value : null} />}
            <span className="truncate">{option.label}</span>
            {option.note !== undefined && <span className="truncate text-xs text-muted-foreground">{option.note}</span>}
        </span>
    )
}

/** A theme's background with its text and accent on it, drawn in that theme whatever the page wears. */
function Swatch({ theme }: { theme: string | null }) {
    if (theme === null)
        return <span aria-hidden className="h-4 w-7 shrink-0 rounded-[calc(var(--radius)*0.5)] border border-dashed border-border-strong" />
    return (
        <span
            aria-hidden
            data-theme-scope={theme}
            className="flex h-4 w-7 shrink-0 items-center justify-center gap-0.5 rounded-[calc(var(--radius)*0.5)] border border-border bg-background"
        >
            <span className="size-1.5 rounded-full bg-foreground" />
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="size-1.5 rounded-full bg-chart-3" />
        </span>
    )
}
