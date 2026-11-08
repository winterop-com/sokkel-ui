import { cn } from '@winterop-com/sokkel-ui/lib/cn'

/** One series in a legend. `key` is the series' name in the chart. */
export interface LegendItem {
    key: string
    label: string
    /** A CSS color, such as `var(--chart-2)`. */
    color: string
    /** A value written beside the label in list mode. */
    value?: string
    /** The series' values, from which table mode works out its figures. */
    values?: readonly (number | null | undefined)[]
}

/** A figure the legend table works out from each series' values. */
export type LegendStat = 'min' | 'max' | 'avg' | 'current'

export interface LegendWords {
    series: string
    min: string
    max: string
    avg: string
    current: string
}

const WORDS: LegendWords = { series: 'Series', min: 'Min', max: 'Max', avg: 'Avg', current: 'Current' }

/** The min, max, mean and last of a series' values, leaving out gaps. */
export function legendStats(values: readonly (number | null | undefined)[]): Record<LegendStat, number | null> {
    const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    if (numbers.length === 0) return { min: null, max: null, avg: null, current: null }
    return {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        avg: numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
        current: numbers[numbers.length - 1],
    }
}

const defaultFormat = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1 })

function Swatch({ color, off }: { color: string; off: boolean }) {
    return (
        <span
            aria-hidden
            className={cn('size-2.5 shrink-0 rounded-mini', off && 'bg-transparent ring-1 ring-current ring-inset')}
            style={off ? undefined : { background: color }}
        />
    )
}

const ITEM =
    'outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-ring'

/**
 * The legend for a chart drawn beside it rather than inside it: a swatch and label per series that
 * a click or Enter hides or shows, and hover or focus emphasizes. In table mode each series is a
 * row with its min, max, mean and current value, worked out from `values`.
 */
export function ChartLegend({
    items,
    hidden = EMPTY,
    onToggle,
    onHover,
    mode = 'list',
    stats = ['min', 'max', 'avg', 'current'],
    format = defaultFormat,
    words: given,
    className,
}: {
    items: readonly LegendItem[]
    hidden?: ReadonlySet<string>
    onToggle?: (key: string) => void
    onHover?: (key: string | null) => void
    mode?: 'list' | 'table'
    /** The figures table mode shows, in order. */
    stats?: readonly LegendStat[]
    format?: (value: number) => string
    words?: Partial<LegendWords>
    className?: string
}) {
    const words = { ...WORDS, ...given }
    const handlers = (key: string, off: boolean) => ({
        onClick: () => onToggle?.(key),
        onMouseEnter: () => onHover?.(off ? null : key),
        onFocus: () => onHover?.(off ? null : key),
        onBlur: () => onHover?.(null),
    })
    if (mode === 'table') {
        return (
            <div className={cn('min-w-0 overflow-x-auto', className)} onMouseLeave={() => onHover?.(null)}>
                <table className="w-full border-collapse text-xs tabular-nums">
                    <thead>
                        <tr className="text-muted-foreground">
                            <th scope="col" className="px-1.5 py-1 text-left font-medium">
                                {words.series}
                            </th>
                            {stats.map((stat) => (
                                <th key={stat} scope="col" className="w-16 px-1.5 py-1 text-right font-medium">
                                    {words[stat]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const off = hidden.has(item.key)
                            const figures = legendStats(item.values ?? [])
                            return (
                                <tr key={item.key} className={cn('border-t border-border hover:bg-hover', off && 'text-muted-foreground')}>
                                    <td className="p-0">
                                        <button
                                            type="button"
                                            aria-pressed={!off}
                                            {...handlers(item.key, off)}
                                            className={cn('flex w-full min-w-0 items-center gap-1.5 px-1.5 py-1 text-left', ITEM)}
                                        >
                                            <Swatch color={item.color} off={off} />
                                            <span className={cn('truncate', off && 'line-through')}>{item.label}</span>
                                        </button>
                                    </td>
                                    {stats.map((stat) => {
                                        const value = figures[stat]
                                        return (
                                            <td key={stat} className="px-1.5 py-1 text-right font-mono">
                                                {value === null ? '-' : format(value)}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }
    return (
        <ul className={cn('flex flex-wrap items-center gap-x-1 gap-y-0.5', className)} onMouseLeave={() => onHover?.(null)}>
            {items.map((item) => {
                const off = hidden.has(item.key)
                return (
                    <li key={item.key}>
                        <button
                            type="button"
                            aria-pressed={!off}
                            {...handlers(item.key, off)}
                            className={cn(
                                'inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-hover hover:text-foreground',
                                ITEM,
                                off && 'opacity-60',
                            )}
                        >
                            <Swatch color={item.color} off={off} />
                            <span className={cn(off && 'line-through')}>{item.label}</span>
                            {item.value !== undefined && <span className="font-mono text-foreground tabular-nums">{item.value}</span>}
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

const EMPTY: ReadonlySet<string> = new Set()
