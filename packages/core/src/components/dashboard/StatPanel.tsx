import { ArrowDownRight, ArrowUpRight, Info, MoreHorizontal, RotateCw } from 'lucide-react'
import { useId, type CSSProperties, type ReactNode } from 'react'

import { useClamped } from '../../hooks/use-clamped'
import { cn } from '../../lib/cn'
import { Link } from '../Link'
import { LoadingOverlay } from '../Loaders'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { PanelTools } from './panel-tools'
import { PANEL_STATE_WORDS, SPAN, StaleMark, type PanelSpan, type PanelStateProps, type PanelStateWords } from './DashboardGrid'
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

const WORDS: StatWords & PanelStateWords = {
    noData: 'No data',
    info: 'About this panel',
    menu: 'Panel actions',
    loading: 'Loading',
    target: 'Target',
    ...PANEL_STATE_WORDS,
}

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
    /** What the change is against, such as "vs yesterday": said after the change in the tile's head. */
    compared?: string
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
    /** Where the tile goes, such as the records its figure counts: the whole tile is one link, its info and menu still their own. */
    href?: string
    /** What a press on the tile does, in place of `href`. */
    onSelect?: () => void
    span?: PanelSpan
    loading?: boolean
    /** A failed query in the value's place with Retry, and a stale value marked under it; see `PanelStateProps`. */
    error?: PanelStateProps['error']
    onRetry?: () => void
    stale?: PanelStateProps['stale']
    words?: Partial<StatWords & PanelStateWords>
    className?: string
}

/**
 * One reading as a dashboard tile: a small title, the value written large, and optionally a trend
 * drawn faintly behind it and a change against an earlier period. `thresholds` pick the reading's
 * color, which inks the value (`colorMode="value"`) or fills the tile (`colorMode="background"`).
 * `target` draws a meter under the value toward it. A null value says there is no data, in
 * neutral ink and without its trend. A title cut short by a narrow tile gives its whole text on hover.
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
    compared,
    good,
    target,
    targetRange,
    note,
    info,
    menu,
    href,
    onSelect,
    span = 'sixth',
    loading = false,
    error,
    onRetry,
    stale,
    words: given,
    className,
}: StatPanelProps) {
    const words = { ...WORDS, ...given }
    const [titleRef, clamped] = useClamped<HTMLHeadingElement>()
    const tone = value === null ? undefined : (thresholdColor(value, thresholds) ?? color)
    const filled = colorMode === 'background' && tone !== undefined
    const inked = colorMode === 'value' && tone !== undefined
    const written = value === null ? words.noData : format !== undefined ? format(value) : formatValue(value, decimals)
    const rising = delta !== undefined && !delta.startsWith('-')
    const style = tone === undefined ? undefined : ({ '--tone': tokenVar(tone) } as CSSProperties)
    const interactive = href !== undefined || onSelect !== undefined
    const Cover = href !== undefined ? Link : 'button'
    const tool = cn(
        'pointer-events-auto flex size-5 items-center justify-center rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid',
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
                interactive && !filled && 'transition-colors hover:border-foreground/25 hover:bg-hover',
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
            {interactive && (
                <Cover
                    {...(href !== undefined ? { href } : { type: 'button' as const, onClick: onSelect })}
                    className="absolute inset-0 rounded-surface outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <span className="sr-only">{typeof title === 'string' ? `${title}: ${written}` : written}</span>
                </Cover>
            )}
            <header
                className={cn(
                    // A head holding an arranged grid's tools lets them take a line of their own when the tile is narrow.
                    'flex min-h-7 shrink-0 items-center gap-1 px-2.5 pt-1 has-data-panel-tools:flex-wrap',
                    interactive && 'pointer-events-none relative z-10',
                )}
            >
                <h3
                    ref={titleRef}
                    title={clamped && typeof title === 'string' ? title : undefined}
                    className={cn(
                        'line-clamp-2 min-w-16 flex-1 text-xs font-medium break-words',
                        filled ? 'text-on-fill/90' : 'text-muted-foreground',
                    )}
                >
                    {title}
                </h3>
                {delta !== undefined && value !== null && (
                    <span
                        title={compared === undefined ? undefined : `${delta} ${compared}`}
                        className={cn(
                            'flex min-w-0 shrink items-center gap-0.5 text-xs font-medium tabular-nums',
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
                        <span className="shrink-0">{delta}</span>
                        {compared !== undefined && <span className="ml-1 min-w-0 truncate font-normal">{compared}</span>}
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
                <PanelTools />
            </header>
            {/* A tile that is a link lets a press on its body through to the cover under it. */}
            <LoadingOverlay
                loading={loading}
                label={words.loading}
                className={cn('flex min-h-0 flex-1 flex-col', interactive && 'pointer-events-none')}
            >
                {error !== undefined && error !== false ? (
                    <div className="pointer-events-auto relative z-10 flex flex-1 flex-col items-center justify-center gap-1.5 px-2.5 pb-3 text-center">
                        <p className={cn('text-xs', filled ? 'text-on-fill/90' : 'text-critical-ink')}>
                            {typeof error === 'string' ? error : words.failed}
                        </p>
                        {onRetry !== undefined && (
                            <button type="button" className={cn(tool, 'w-auto gap-1 px-1.5 text-xs')} onClick={onRetry}>
                                <RotateCw className="size-3" aria-hidden />
                                {words.retry}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={cn('flex flex-1 flex-col items-center justify-center px-2.5 pb-7', inked && 'text-(--tone)')}>
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
                        {stale !== undefined && stale !== false && <StaleMark stale={stale} words={words} />}
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
                )}
            </LoadingOverlay>
        </section>
    )
}
