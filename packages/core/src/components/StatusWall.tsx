import type { CSSProperties, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordsPart } from '../lib/words'
import { Chip } from './Chip'
import { Dot } from './Dot'
import { Freshness } from './Freshness'
import { Link } from './Link'

/** How a source on the wall is doing: answering, answering badly, not answering, or not known yet. */
export type WallStatus = 'up' | 'degraded' | 'down' | 'unknown'

export const WALL_STATUSES: readonly WallStatus[] = ['up', 'degraded', 'down', 'unknown']

export interface StatusWallWords {
    up: string
    degraded: string
    down: string
    unknown: string
}

export const STATUS_WALL_WORDS: StatusWallWords = { up: 'Up', degraded: 'Degraded', down: 'Down', unknown: 'Unknown' }

/** Where a catalog holds a status wall's words. */
export const STATUS_WALL_PART: WordsPart<StatusWallWords> = { id: 'statusWall', words: STATUS_WALL_WORDS }

/** Each status's color as a CSS color, the token its dot, edge, glow and series are drawn in. */
export const WALL_STATUS_CSS: Readonly<Record<WallStatus, string>> = {
    up: 'var(--good)',
    degraded: 'var(--warning)',
    down: 'var(--critical)',
    unknown: 'var(--faint)',
}

/** The ink each status's word is written in. */
const INK: Record<WallStatus, string> = {
    up: 'text-good-ink',
    degraded: 'text-warning-ink',
    down: 'text-critical-ink',
    unknown: 'text-muted-foreground',
}

/** The series drawn on a box this wide and tall, stretched to the tile's width. */
const SERIES_WIDTH = 100
const SERIES_HEIGHT = 32

/**
 * A series as the line along a tile's foot: values spaced evenly across the width, the lowest at
 * the foot and the highest a stroke below the top; a series of one value, or of equal values, is a
 * level line through the middle.
 */
export function wallSeriesPath(values: readonly number[], width: number = SERIES_WIDTH, height: number = SERIES_HEIGHT): string {
    if (values.length === 0) return ''
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min
    const step = values.length > 1 ? width / (values.length - 1) : 0
    const y = (value: number) => (span === 0 ? height / 2 : 1 + (height - 2) * (1 - (value - min) / span))
    if (values.length === 1) return `M0 ${y(values[0]).toFixed(1)} L${width.toFixed(1)} ${y(values[0]).toFixed(1)}`
    return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(1)} ${y(value).toFixed(1)}`).join(' ')
}

export interface StatusTileProps {
    /** The source's name. */
    name: ReactNode
    status: WallStatus
    /** A quiet line over the name, such as the source's kind. */
    caption?: ReactNode
    /** Drawn before the name. */
    icon?: ReactNode
    /** The tile's one figure, such as its latency: `214`. */
    value?: ReactNode
    /** The figure's unit: `ms`. */
    unit?: ReactNode
    /** One line under the figure, such as why the source is degraded. */
    detail?: ReactNode
    /** Readings over time, such as latency, drawn along the tile's foot in the status's color. */
    series?: readonly number[]
    /** What the series shows, for a screen reader; without it the series is decoration. */
    seriesLabel?: string
    /** A small chip at the head's end, such as the word Simulated. */
    flag?: ReactNode
    /** When the source was last heard from, in milliseconds since the epoch, said as its freshness at the foot; left out, none is drawn. */
    updatedAt?: number | null
    /** The moment its freshness counts from; without it, the shared clock. */
    now?: number
    /** Draws the tile as the one chosen. */
    selected?: boolean
    /** Makes the whole tile one button. */
    onSelect?: () => void
    /** Makes the whole tile one link, to the source's own page. */
    href?: string
    words?: Partial<StatusWallWords>
    className?: string
}

/**
 * One source on a status wall, read at a glance from across a room: its name under a quiet caption,
 * its status as a word with a dot, one large figure with its unit, a line of detail, and its
 * readings over time faint along the foot. The status colors the tile's edge and a glow under it:
 * good while up, warning while degraded, critical and slowly pulsing while down, and no color with
 * a hollow dot while unknown. Given `onSelect` or `href` the whole tile is one control; `selected`
 * rings it.
 */
export function StatusTile({
    name,
    status,
    caption,
    icon,
    value,
    unit,
    detail,
    series,
    seriesLabel,
    flag,
    updatedAt,
    now,
    selected = false,
    onSelect,
    href,
    words: given,
    className,
}: StatusTileProps) {
    const words = useWords(STATUS_WALL_PART, given)
    const known = status !== 'unknown'
    const interactive = href !== undefined || onSelect !== undefined
    const Cover = href !== undefined ? Link : 'button'
    // The cover takes the pointer for the whole tile, so what is drawn over it lets the pointer through.
    const through = interactive && 'pointer-events-none'
    const line = series === undefined ? '' : wallSeriesPath(series)
    return (
        <article
            data-slot="status-tile"
            data-status={status}
            data-selected={selected || undefined}
            style={{ '--wall-tone': WALL_STATUS_CSS[status] } as CSSProperties}
            className={cn(
                'relative flex min-w-0 flex-col gap-2 rounded-surface border bg-card p-3 text-card-foreground transition-colors',
                known ? 'shadow-[inset_0_2px_0_var(--wall-tone)]' : 'border-dashed',
                selected
                    ? 'border-primary ring-1 ring-primary'
                    : known
                      ? 'border-[color-mix(in_oklab,var(--wall-tone)_45%,var(--border))]'
                      : 'border-border-strong',
                interactive && 'hover:bg-hover',
                className,
            )}
        >
            {known && (
                <span
                    aria-hidden
                    data-slot="status-tile-glow"
                    style={{
                        background: `linear-gradient(to bottom, color-mix(in oklab, var(--wall-tone) ${status === 'up' ? '10' : '18'}%, transparent), transparent)`,
                    }}
                    className={cn(
                        'pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-[inherit]',
                        status === 'down' && 'animate-live',
                    )}
                />
            )}
            {interactive && (
                <Cover
                    {...(href !== undefined ? { href } : { type: 'button' as const, onClick: onSelect, 'aria-pressed': selected })}
                    data-slot="status-tile-cover"
                    className="absolute inset-0 z-0 cursor-pointer rounded-surface outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <span className="sr-only">
                        {typeof name === 'string' ? name : null} {words[status]}
                    </span>
                </Cover>
            )}
            <div data-slot="status-tile-head" className={cn(through, 'relative flex min-w-0 flex-col gap-0.5')}>
                {(caption !== undefined || flag !== undefined) && (
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{caption}</span>
                        {flag !== undefined && (
                            <Chip tone="outline" className="shrink-0">
                                {flag}
                            </Chip>
                        )}
                    </div>
                )}
                <span className="flex min-w-0 items-center gap-1.5 text-label [&_svg:not([class*='size-'])]:size-4">
                    {icon}
                    <span className="truncate">{name}</span>
                </span>
            </div>
            <div
                data-slot="status-tile-status"
                className={cn(through, 'relative flex min-w-0 items-center gap-1.5 text-label', INK[status])}
            >
                <Dot color={WALL_STATUS_CSS[status]} size="lg" outline={!known} className={cn(status === 'down' && 'animate-live')} />
                <span className="truncate">{words[status]}</span>
            </div>
            {(value !== undefined || unit !== undefined) && (
                <div data-slot="status-tile-figure" className={cn(through, 'relative flex min-w-0 items-baseline gap-1.5')}>
                    {value !== undefined && <span className="truncate text-statistic tabular-nums">{value}</span>}
                    {unit !== undefined && <span className="text-sm text-muted-foreground">{unit}</span>}
                </div>
            )}
            {detail !== undefined && (
                <span data-slot="status-tile-detail" className={cn(through, 'relative truncate text-help text-muted-foreground')}>
                    {detail}
                </span>
            )}
            {updatedAt !== undefined && (
                <div data-slot="status-tile-foot" className={cn(through, 'relative mt-auto flex min-w-0 justify-end')}>
                    <Freshness at={updatedAt} now={now} />
                </div>
            )}
            {line !== '' && (
                <div
                    data-slot="status-tile-series"
                    style={{ color: 'var(--wall-tone)' }}
                    className={cn(
                        through,
                        'relative -mx-3 -mb-3 h-8 shrink-0 overflow-hidden rounded-b-[inherit]',
                        updatedAt === undefined && 'mt-auto',
                    )}
                >
                    <svg
                        {...(seriesLabel === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': seriesLabel })}
                        viewBox={`0 0 ${String(SERIES_WIDTH)} ${String(SERIES_HEIGHT)}`}
                        preserveAspectRatio="none"
                        className="block size-full"
                    >
                        <path
                            d={`${line} L${String(SERIES_WIDTH)} ${String(SERIES_HEIGHT)} L0 ${String(SERIES_HEIGHT)} Z`}
                            fill="currentColor"
                            fillOpacity={0.12}
                        />
                        <path
                            d={line}
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity={0.7}
                            strokeWidth={1.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </div>
            )}
        </article>
    )
}

/** The narrowest a tile gets before the wall drops one from the row. */
const TILE = { sm: '10rem', md: '14rem', lg: '18rem' } as const

export interface StatusWallProps {
    /** The tiles. */
    children: ReactNode
    /** What the wall shows, for a screen reader. */
    label: string
    /** The narrowest a tile gets: 10rem (`sm`), 14rem (`md`, the default) or 18rem (`lg`). */
    tile?: keyof typeof TILE
    className?: string
}

/**
 * A wall of status tiles: as many in a row as fit at the tile's narrowest, each as wide as its
 * share of the row and as tall as the tallest beside it, wrapping onto more rows and down to one
 * column in a narrow room, never scrolling sideways.
 */
export function StatusWall({ children, label, tile = 'md', className }: StatusWallProps) {
    return (
        <div
            role="group"
            aria-label={label}
            data-slot="status-wall"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${TILE[tile]}, 100%), 1fr))` }}
            className={cn('grid min-w-0 gap-3 [:where(&>*)]:min-w-0', className)}
        >
            {children}
        </div>
    )
}
