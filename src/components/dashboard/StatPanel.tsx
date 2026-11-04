import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { useId, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { LoadingOverlay } from '../Loaders'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { SPAN, type PanelSpan } from './DashboardGrid'
import { formatValue, thresholdColor, tokenVar, type Threshold } from './thresholds'

export interface StatWords {
    noData: string
    info: string
    loading: string
}

const WORDS: StatWords = { noData: 'No data', info: 'About this panel', loading: 'Loading' }

/** An area under a line of values, stretched to its box, for the trend behind a stat's value. */
function SparkArea({ values, className }: { values: readonly number[]; className?: string }) {
    const id = useId()
    if (values.length < 2) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const points = values.map(
        (value, index) => `${((index / (values.length - 1)) * 100).toFixed(2)},${(36 - ((value - min) / span) * 32).toFixed(2)}`,
    )
    return (
        <svg
            aria-hidden
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-[45%] w-full', className)}
        >
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.04" />
                </linearGradient>
            </defs>
            <polygon points={`0,40 ${points.join(' ')} 100,40`} fill={`url(#${id})`} />
            <polyline
                points={points.join(' ')}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.7"
                strokeWidth="1.25"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}

/**
 * One reading as a dashboard tile: a small title, the value written large, and optionally a trend
 * drawn faintly behind it and a change against an earlier period. `thresholds` pick the reading's
 * color, which inks the value (`colorMode="value"`) or fills the tile (`colorMode="background"`).
 * A null value says there is no data, in neutral ink and without its trend.
 */
export function StatPanel({
    title,
    value,
    unit,
    decimals,
    format,
    thresholds,
    color,
    colorMode = 'value',
    sparkline,
    delta,
    good,
    note,
    info,
    span = 'sixth',
    loading = false,
    words = WORDS,
    className,
}: {
    title: ReactNode
    value: number | null
    /** Written after the value: `%`, `ms`, `/min`. */
    unit?: ReactNode
    decimals?: number
    /** Writes the value; `decimals` and grouped thousands when omitted. */
    format?: (value: number) => string
    thresholds?: readonly Threshold[]
    /** A fixed color token, when the tile has no thresholds. */
    color?: string
    colorMode?: 'value' | 'background' | 'none'
    /** The values behind the reading, drawn as a faint area. */
    sparkline?: readonly number[]
    /** The change written for a reader: `+12%`, `-0.4s`. */
    delta?: string
    /** Whether the change is an improvement; leaves it neutral when omitted. */
    good?: boolean
    note?: ReactNode
    info?: ReactNode
    span?: PanelSpan
    loading?: boolean
    words?: StatWords
    className?: string
}) {
    const tone = value === null ? undefined : (thresholdColor(value, thresholds) ?? color)
    const filled = colorMode === 'background' && tone !== undefined
    const inked = colorMode === 'value' && tone !== undefined
    const written = value === null ? words.noData : format !== undefined ? format(value) : formatValue(value, decimals)
    const rising = delta !== undefined && !delta.startsWith('-')
    const style = tone === undefined ? undefined : ({ '--tone': tokenVar(tone) } as CSSProperties)
    return (
        <section
            style={style}
            className={cn(
                'relative isolate flex min-h-28 min-w-0 flex-col overflow-hidden rounded-surface border',
                filled
                    ? 'border-transparent bg-[linear-gradient(135deg,color-mix(in_oklab,var(--tone)_92%,var(--on-fill)),var(--tone)_70%)] text-on-fill dark:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--tone)_80%,var(--background)),color-mix(in_oklab,var(--tone)_62%,var(--background)))]'
                    : 'border-border bg-card text-card-foreground',
                SPAN[span],
                className,
            )}
        >
            {sparkline !== undefined && value !== null && (
                <SparkArea
                    values={sparkline}
                    className={cn('-z-10', filled ? 'text-on-fill' : inked ? 'text-(--tone)' : 'text-muted-foreground')}
                />
            )}
            <header className="flex h-7 shrink-0 items-center gap-1 px-2.5 pt-1">
                <h3 className={cn('min-w-0 flex-1 truncate text-xs font-medium', filled ? 'text-on-fill/90' : 'text-muted-foreground')}>
                    {title}
                </h3>
                {delta !== undefined && value !== null && (
                    <span
                        className={cn(
                            'flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums',
                            filled
                                ? 'text-on-fill/90'
                                : good === undefined
                                  ? 'text-muted-foreground'
                                  : good
                                    ? 'text-good'
                                    : 'text-critical',
                        )}
                    >
                        {rising ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
                        {delta}
                    </span>
                )}
                {info !== undefined && (
                    <Tooltip>
                        <TooltipTrigger
                            aria-label={words.info}
                            className={cn(
                                'flex size-5 items-center justify-center rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid',
                                filled ? 'text-on-fill/80 hover:text-on-fill' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Info className="size-3" aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent>{info}</TooltipContent>
                    </Tooltip>
                )}
            </header>
            <LoadingOverlay loading={loading} label={words.loading} className="flex min-h-0 flex-1 flex-col">
                <div className={cn('flex flex-1 flex-col items-center justify-center px-2.5 pb-3', inked && 'text-(--tone)')}>
                    <p
                        className={cn(
                            'flex items-baseline gap-1 font-semibold tabular-nums',
                            value === null ? 'text-title text-muted-foreground' : 'text-stat',
                        )}
                    >
                        <span>{written}</span>
                        {unit !== undefined && value !== null && (
                            <span className={cn('text-sm font-medium', !filled && !inked && 'text-muted-foreground')}>{unit}</span>
                        )}
                    </p>
                    {note !== undefined && (
                        <p className={cn('truncate text-xs', filled ? 'text-on-fill/85' : 'text-muted-foreground')}>{note}</p>
                    )}
                </div>
            </LoadingOverlay>
        </section>
    )
}
