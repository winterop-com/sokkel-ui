import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Dot } from './Dot'

export interface StatProps {
    label: ReactNode
    value: ReactNode
    unit?: ReactNode
    /** The change written for a reader: `+12%`, `-0.4s`. */
    change?: string
    /** Whether the change is an improvement; leaves it neutral when omitted. */
    good?: boolean
    /** A short qualifier under the number: `vs last week`. */
    note?: ReactNode
    /** A small chart under the number, such as a sparkline. */
    trend?: ReactNode
    /** A CSS color drawn as a dot before the label, such as a status token: `var(--status-running)`. */
    dot?: string
    /** `plain` sits in whatever holds it; `tile` is a card of its own. */
    variant?: 'plain' | 'tile'
    /** Where the tile leads, such as a list filtered to what it counts. */
    href?: string
    onSelect?: () => void
    /** Edges the tile in its dot's color: the count that asks for work. */
    emphasis?: boolean
    className?: string
}

/**
 * One number with what it counts: runs today, the failure rate, the median duration. A change
 * against an earlier period is drawn beside it, inked by whether the change is good, which the
 * caller says, since a rise in failures and a rise in runs mean opposite things.
 *
 * `dot` puts a state's color before the label, so a row of counts reads as the states they count:
 * submitted, approved, returned. As a `tile` it stands on a card of its own, the label in the
 * text's ink, the number at the statistic's size and the note under it wrapping as it needs; given
 * `href` or `onSelect` the whole tile is one control that goes to what it counts, such as a list
 * filtered to that state. `emphasis` edges the one tile that asks for work in its dot's color, so
 * it stands apart from the counts of what already happened.
 */
export function Stat({
    label,
    value,
    unit,
    change,
    good,
    note,
    trend,
    dot,
    variant = 'plain',
    href,
    onSelect,
    emphasis = false,
    className,
}: StatProps) {
    const rising = change !== undefined && !change.startsWith('-')
    const tile = variant === 'tile'
    const interactive = href !== undefined || onSelect !== undefined
    const Cover = href !== undefined ? 'a' : 'button'
    // The cover takes the pointer for the whole tile, so what is drawn over it lets the pointer through.
    const through = interactive && 'pointer-events-none'
    const style = dot === undefined ? undefined : ({ '--stat-tone': dot } as CSSProperties)
    return (
        <div
            style={style}
            className={cn(
                'relative flex min-w-0 flex-col gap-1',
                tile && 'rounded-surface border border-border-strong bg-card p-4 text-card-foreground transition-colors',
                tile && interactive && 'hover:border-foreground/25 hover:bg-hover',
                tile && emphasis && dot !== undefined && 'border-[color-mix(in_oklab,var(--stat-tone)_55%,transparent)]',
                className,
            )}
        >
            {interactive && (
                <Cover
                    {...(href !== undefined ? { href } : { type: 'button' as const, onClick: onSelect })}
                    className={cn(
                        'absolute inset-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                        tile && 'rounded-surface',
                    )}
                >
                    <span className="sr-only">
                        {typeof label === 'string' ? label : null} {typeof value === 'string' || typeof value === 'number' ? value : null}
                    </span>
                </Cover>
            )}
            <span
                className={cn(
                    through,
                    'flex min-w-0 items-center gap-2',
                    tile ? 'text-label text-foreground' : 'text-xs text-muted-foreground',
                )}
            >
                {dot !== undefined && <Dot color={dot} size={tile ? 'md' : 'sm'} />}
                <span className="truncate">{label}</span>
            </span>
            <div className={cn(through, 'flex items-baseline gap-2', tile && 'mt-1')}>
                <span className={cn('tabular-nums', tile ? 'text-statistic' : 'text-page font-semibold')}>{value}</span>
                {unit !== undefined && <span className="text-sm text-muted-foreground">{unit}</span>}
                {change !== undefined && (
                    <span
                        className={cn(
                            'flex items-center gap-0.5 text-xs font-medium tabular-nums',
                            good === undefined ? 'text-muted-foreground' : good ? 'text-good' : 'text-critical',
                        )}
                    >
                        {rising ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
                        {change}
                    </span>
                )}
            </div>
            {note !== undefined && (
                <span className={cn(through, tile ? 'text-help text-pretty text-muted-foreground' : 'text-xs text-faint')}>{note}</span>
            )}
            {trend !== undefined && <div className={cn(through, 'mt-1')}>{trend}</div>}
        </div>
    )
}

export interface SparklineProps {
    values: readonly number[]
    width?: number
    height?: number
    tone?: 'primary' | 'good' | 'critical' | 'muted'
    /** What the line shows, for a screen reader. */
    label: string
}

/**
 * A line of values drawn small, with no axes, for the trend under a stat. Values are spaced
 * evenly; the last one is marked.
 */
export function Sparkline({ values, width = 120, height = 28, tone = 'primary', label }: SparklineProps) {
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const step = values.length > 1 ? (width - 4) / (values.length - 1) : 0
    const points = values.map((value, index) => [2 + index * step, 2 + (height - 4) * (1 - (value - min) / span)] as const)
    const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    const [lastX, lastY] = points[points.length - 1]
    const ink = { primary: 'text-primary', good: 'text-good', critical: 'text-critical', muted: 'text-muted-foreground' }[tone]
    return (
        <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={ink}>
            <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lastX} cy={lastY} r={2.25} fill="currentColor" />
        </svg>
    )
}
