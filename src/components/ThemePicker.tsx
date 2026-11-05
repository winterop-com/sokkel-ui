import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Segmented } from './Segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

/** One choice the picker offers: what it answers with, what it is called, and a short note beside it. */
export interface ThemeOption {
    value: string
    label: string
    /** A short note after the label, such as where the theme comes from. */
    note?: string
    /** Draws a swatch of the theme beside its name. Only themes that answer `data-theme-scope` can be drawn. */
    swatch?: boolean
}

/** Everything the picker sets: the named theme, the scheme, the density, the corners and the typeface. */
export interface ThemeSettings {
    theme: string
    scheme: 'dark' | 'light'
    density: string
    corners: string
    typeface: string
}

export interface ThemePickerWords {
    theme: string
    scheme: string
    dark: string
    light: string
    density: string
    regular: string
    compact: string
    corners: string
    typeface: string
}

const WORDS: ThemePickerWords = {
    theme: 'Theme',
    scheme: 'Scheme',
    dark: 'Dark',
    light: 'Light',
    density: 'Density',
    regular: 'Regular',
    compact: 'Compact',
    corners: 'Corners',
    typeface: 'Typeface',
}

/**
 * The appearance controls an app's settings show: the named theme, dark or light, the density,
 * the corners and the typeface. It holds no state and applies nothing; `onChange` answers with the
 * whole settings, and the app sets them where it keeps its look.
 *
 * The theme and scheme are always offered. Density offers regular and compact unless given its
 * own options; corners and typeface show only when given options. A theme marked `swatch` is
 * drawn as a small sample of its background, text and accent.
 */
export function ThemePicker({
    value,
    onChange,
    themes,
    densities,
    corners,
    typefaces,
    className,
    words: given,
}: {
    value: ThemeSettings
    onChange: (next: ThemeSettings) => void
    themes: readonly ThemeOption[]
    /** The density levels; regular and compact when not given, none when empty. */
    densities?: readonly ThemeOption[]
    /** The corner radii; the row shows only when given. */
    corners?: readonly ThemeOption[]
    /** The typefaces; the row shows only when given. */
    typefaces?: readonly ThemeOption[]
    className?: string
    words?: Partial<ThemePickerWords>
}) {
    const words = { ...WORDS, ...given }
    const levels = densities ?? [
        { value: 'regular', label: words.regular },
        { value: 'compact', label: words.compact },
    ]
    const set = <K extends keyof ThemeSettings>(key: K, next: ThemeSettings[K]) => onChange({ ...value, [key]: next })
    return (
        <div data-slot="theme-picker" className={cn('flex flex-col gap-4', className)}>
            <Row label={words.theme}>
                <Choice label={words.theme} value={value.theme} options={themes} onChoose={(next) => set('theme', next)} />
            </Row>
            <Row label={words.scheme}>
                <Segmented
                    label={words.scheme}
                    value={value.scheme}
                    options={[
                        { value: 'dark', label: words.dark },
                        { value: 'light', label: words.light },
                    ]}
                    fill
                    onChoose={(next) => set('scheme', next)}
                />
            </Row>
            {levels.length > 0 && (
                <Row label={words.density}>
                    <Segmented
                        label={words.density}
                        value={value.density}
                        options={levels}
                        fill
                        onChoose={(next) => set('density', next)}
                    />
                </Row>
            )}
            {corners !== undefined && corners.length > 0 && (
                <Row label={words.corners}>
                    <Choice label={words.corners} value={value.corners} options={corners} onChoose={(next) => set('corners', next)} />
                </Row>
            )}
            {typefaces !== undefined && typefaces.length > 0 && (
                <Row label={words.typeface}>
                    <Choice label={words.typeface} value={value.typeface} options={typefaces} onChoose={(next) => set('typeface', next)} />
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
    onChoose,
}: {
    label: string
    value: string
    options: readonly ThemeOption[]
    onChoose: (value: string) => void
}) {
    const swatches = options.some((option) => option.swatch === true)
    return (
        <Select
            items={options.map((option) => ({ value: option.value, label: option.label }))}
            value={value}
            onValueChange={(next) => next !== null && onChoose(next)}
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
                        <OptionLabel option={option} swatches={swatches} />
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
