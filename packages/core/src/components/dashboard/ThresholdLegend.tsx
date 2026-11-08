import { cn } from '../../lib/cn'
import { formatValue, tokenVar, type Threshold } from './thresholds'

export interface ThresholdWords {
    /** The first band's range; `{value}` is where the second band starts. */
    below: string
    /** A middle band's range. */
    range: string
    /** The last band's range. */
    atLeast: string
    noData: string
}

const WORDS: ThresholdWords = { below: 'Below {value}', range: '{from} to {to}', atLeast: '{value} and up', noData: 'No data' }

const fill = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole)

/** Each band of a threshold scale written out: its color token and the range it covers. */
export function thresholdBands(
    thresholds: readonly Threshold[],
    write: (value: number) => string,
    words: ThresholdWords = WORDS,
): { color: string; range: string }[] {
    return thresholds.map((step, index) => {
        const next = thresholds[index + 1]?.value
        const from = index === 0 ? undefined : step.value
        if (thresholds.length === 1) return { color: step.color, range: '' }
        if (from === undefined && next !== undefined) return { color: step.color, range: fill(words.below, { value: write(next) }) }
        if (from !== undefined && next === undefined) return { color: step.color, range: fill(words.atLeast, { value: write(from) }) }
        return { color: step.color, range: fill(words.range, { from: write(from ?? 0), to: write(next ?? 0) }) }
    })
}

/**
 * The key to a threshold scale, the same one that colors a stat tile, a gauge or a scorecard's
 * cells. As a list, each band is a swatch with its name and the range it covers. As a bar, the
 * bands sit end to end in one strip with the values where they meet written under the joins and
 * the bands' names under them.
 * `labels` names the bands in order, such as "Behind", "Close" and "On target"; `noData` adds the
 * swatch for a missing value.
 */
export function ThresholdLegend({
    thresholds,
    labels,
    title,
    layout = 'list',
    unit = '',
    decimals,
    format,
    noData = false,
    words: given,
    className,
}: {
    thresholds: readonly Threshold[]
    /** A name per band, in order. */
    labels?: readonly string[]
    title?: string
    layout?: 'list' | 'bar'
    /** Written after each value. */
    unit?: string
    decimals?: number
    format?: (value: number) => string
    /** Shows the no-data swatch, with this label or the default. */
    noData?: boolean | string
    words?: Partial<ThresholdWords>
    className?: string
}) {
    const words = { ...WORDS, ...given }
    const write = (value: number) => (format !== undefined ? format(value) : `${formatValue(value, decimals)}${unit}`)
    const bands = thresholdBands(thresholds, write, words)
    const missing = noData === false ? undefined : noData === true ? words.noData : noData
    if (layout === 'bar') {
        return (
            <figure className={cn('flex min-w-0 flex-col gap-1 text-xs', className)}>
                {title !== undefined && <figcaption className="font-medium">{title}</figcaption>}
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex h-2 gap-px overflow-hidden rounded-mini">
                            {bands.map((band, index) => (
                                <span key={index} className="flex-1" style={{ background: tokenVar(band.color) }} />
                            ))}
                        </div>
                        <div className="relative h-4">
                            {thresholds.slice(1).map((step, index) => (
                                <span
                                    key={index}
                                    className="absolute top-0 -translate-x-1/2 text-muted-foreground tabular-nums"
                                    style={{ left: `${((index + 1) / bands.length) * 100}%` }}
                                >
                                    {step.value === undefined ? '' : write(step.value)}
                                </span>
                            ))}
                        </div>
                        {labels !== undefined && (
                            <div className="flex">
                                {bands.map((band, index) => (
                                    <span key={index} className="flex-1 truncate text-center">
                                        {labels[index] ?? band.range}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {missing !== undefined && (
                        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                            <Swatch color={undefined} />
                            {missing}
                        </span>
                    )}
                </div>
            </figure>
        )
    }
    return (
        <figure className={cn('flex min-w-0 flex-col gap-1 text-xs', className)}>
            {title !== undefined && <figcaption className="font-medium">{title}</figcaption>}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {bands.map((band, index) => (
                    <li key={index} className="flex min-w-0 items-center gap-1.5">
                        <Swatch color={band.color} />
                        {labels?.[index] !== undefined && <span>{labels[index]}</span>}
                        {band.range !== '' && <span className="text-muted-foreground tabular-nums">{band.range}</span>}
                    </li>
                ))}
                {missing !== undefined && (
                    <li className="flex items-center gap-1.5 text-muted-foreground">
                        <Swatch color={undefined} />
                        {missing}
                    </li>
                )}
            </ul>
        </figure>
    )
}

/** A band's swatch, or a hatched one for a missing value. */
function Swatch({ color }: { color: string | undefined }) {
    return (
        <span
            aria-hidden
            className={cn(
                'size-3 shrink-0 rounded-mini ring-1 ring-foreground/15 ring-inset',
                color === undefined &&
                    'bg-[repeating-linear-gradient(135deg,var(--muted)_0,var(--muted)_2px,transparent_2px,transparent_4px)]',
            )}
            style={color === undefined ? undefined : { background: tokenVar(color) }}
        />
    )
}
