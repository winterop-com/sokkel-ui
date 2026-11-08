import { ArrowDownRight, ArrowUpRight, Info, MoreHorizontal } from 'lucide-react'
import { useId, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { LoadingOverlay } from '../Loaders'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { SPAN, type PanelSpan } from './DashboardGrid'
import { formatValue, thresholdColor, tokenVar, type Threshold } from './thresholds'

export interface StatWords {
    noData: string
    info: string
    /** The label of the button that opens the tile's menu. */
    menu: string
    loading: string
    /** Written before the target's value. */
    target: string
}

const WORDS: StatWords = { noData: 'No data', info: 'About this panel', menu: 'Panel actions', loading: 'Loading', target: 'Target' }

/** How far a reading has come toward its target: a track with the reading filled in and a tick at the target. */
function TargetMeter({
    value,
    target,
    range,
    written,
    label,
    filled,
}: {
    value: number
    target: number
    range?: readonly [number, number]
    written: string
    label: string
    filled: boolean
}) {
    const low = range?.[0] ?? 0
    const high = range?.[1] ?? Math.max(value, target)
    const at = (reading: number) => Math.min(100, Math.max(0, ((reading - low) / (high - low || 1)) * 100))
    const reach = at(value)
    const mark = at(target)
    return (
        <div className="mt-2 mb-3 flex w-full max-w-48 flex-col gap-1">
            <div className="relative h-1.5 rounded-mini bg-current/15">
                <span className="absolute inset-y-0 left-0 rounded-mini bg-current" style={{ width: `${reach}%` }} />
                <span
                    aria-hidden
                    className={cn('absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-mini', filled ? 'bg-on-fill' : 'bg-foreground')}
                    style={{ left: `${mark}%` }}
                />
            </div>
            <p className={cn('flex justify-center gap-1 text-xs', filled ? 'text-on-fill/85' : 'text-muted-foreground')}>
                <span>{label}</span>
                <span className="font-mono tabular-nums">{written}</span>
            </p>
        </div>
    )
}

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

export interface StatPanelProps {
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
    /** The value the reading aims for, drawn as a meter under it with the target written out. */
    target?: number
    /** The target meter's ends; from 0 to the larger of the reading and the target when omitted. */
    targetRange?: readonly [number, number]
    note?: ReactNode
    info?: ReactNode
    /** Dropdown menu items, behind a button at the end of the tile's head, as `DashboardPanel`'s `menu`. */
    menu?: ReactNode
    span?: PanelSpan
    loading?: boolean
    words?: Partial<StatWords>
    className?: string
}

/**
 * One reading as a dashboard tile: a small title, the value written large, and optionally a trend
 * drawn faintly behind it and a change against an earlier period. `thresholds` pick the reading's
 * color, which inks the value (`colorMode="value"`) or fills the tile (`colorMode="background"`).
 * `target` draws a meter under the value toward it. A null value says there is no data, in
 * neutral ink and without its trend.
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
    target,
    targetRange,
    note,
    info,
    menu,
    span = 'sixth',
    loading = false,
    words: given,
    className,
}: StatPanelProps) {
    const words = { ...WORDS, ...given }
    const tone = value === null ? undefined : (thresholdColor(value, thresholds) ?? color)
    const filled = colorMode === 'background' && tone !== undefined
    const inked = colorMode === 'value' && tone !== undefined
    const written = value === null ? words.noData : format !== undefined ? format(value) : formatValue(value, decimals)
    const rising = delta !== undefined && !delta.startsWith('-')
    const style = tone === undefined ? undefined : ({ '--tone': tokenVar(tone) } as CSSProperties)
    const tool = cn(
        'flex size-5 items-center justify-center rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid',
        filled ? 'text-on-fill/80 hover:text-on-fill' : 'text-muted-foreground hover:text-foreground',
    )
    return (
        <section
            style={style}
            className={cn(
                'relative isolate flex min-h-28 min-w-0 flex-col overflow-hidden rounded-surface border',
                target !== undefined && value !== null && 'min-h-36',
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
                    className={cn(
                        '-z-10',
                        target !== undefined && 'h-1/4',
                        filled ? 'text-on-fill' : inked ? 'text-(--tone)' : 'text-muted-foreground',
                    )}
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
                        <TooltipTrigger aria-label={words.info} className={tool}>
                            <Info className="size-3" aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent>{info}</TooltipContent>
                    </Tooltip>
                )}
                {menu !== undefined && (
                    <DropdownMenu>
                        <DropdownMenuTrigger aria-label={words.menu} title={words.menu} className={tool}>
                            <MoreHorizontal className="size-3.5" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {menu}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </header>
            <LoadingOverlay loading={loading} label={words.loading} className="flex min-h-0 flex-1 flex-col">
                <div className={cn('flex flex-1 flex-col items-center justify-center px-2.5 pb-3', inked && 'text-(--tone)')}>
                    <p
                        className={cn(
                            'flex items-baseline gap-1 tabular-nums',
                            value === null ? 'text-detail-title text-muted-foreground' : 'text-statistic',
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
                    {target !== undefined && value !== null && (
                        <TargetMeter
                            value={value}
                            target={target}
                            range={targetRange}
                            written={`${format !== undefined ? format(target) : formatValue(target, decimals)}${typeof unit === 'string' ? unit : ''}`}
                            label={words.target}
                            filled={filled}
                        />
                    )}
                </div>
            </LoadingOverlay>
        </section>
    )
}
