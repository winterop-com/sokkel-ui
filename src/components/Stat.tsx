import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * One number with what it counts: runs today, the failure rate, the median duration. A change
 * against an earlier period is drawn beside it, inked by whether the change is good, which the
 * caller says, since a rise in failures and a rise in runs mean opposite things.
 */
export function Stat({
    label,
    value,
    unit,
    change,
    good,
    note,
    trend,
    className,
}: {
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
    className?: string
}) {
    const rising = change !== undefined && !change.startsWith('-')
    return (
        <div className={cn('flex min-w-0 flex-col gap-1', className)}>
            <span className="truncate text-xs text-muted-foreground">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className="text-page font-semibold tabular-nums">{value}</span>
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
            {note !== undefined && <span className="text-xs text-faint">{note}</span>}
            {trend !== undefined && <div className="mt-1">{trend}</div>}
        </div>
    )
}

/**
 * A line of values drawn small, with no axes, for the trend under a stat. Values are spaced
 * evenly; the last one is marked.
 */
export function Sparkline({
    values,
    width = 120,
    height = 28,
    tone = 'primary',
    label,
}: {
    values: readonly number[]
    width?: number
    height?: number
    tone?: 'primary' | 'good' | 'critical' | 'muted'
    /** What the line shows, for a screen reader. */
    label: string
}) {
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
