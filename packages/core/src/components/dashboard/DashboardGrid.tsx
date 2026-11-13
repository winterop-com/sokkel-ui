import { Clock, Maximize2, MoreHorizontal, RotateCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { LoadingOverlay } from '../Loaders'
import { Problem } from '../Problem'
import { Stat } from '../Stat'
import { WindowedPane } from '../WindowedPane'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { PanelTools, usePanelTools } from './panel-tools'

/**
 * How much of the grid's width a panel takes in a wide grid. Every panel is full width in a
 * phone-wide grid but a sixth, which takes half, so stat tiles and gauges stand two to a row.
 */
export type PanelSpan = 'sixth' | 'quarter' | 'third' | 'half' | 'two-thirds' | 'full'

/** The grid classes for a panel's span. */
export const SPAN: Record<PanelSpan, string> = {
    sixth: 'col-span-6 @2xl/dashboard:col-span-4 @4xl/dashboard:col-span-2',
    quarter: 'col-span-12 @2xl/dashboard:col-span-6 @4xl/dashboard:col-span-3',
    third: 'col-span-12 @4xl/dashboard:col-span-4',
    half: 'col-span-12 @4xl/dashboard:col-span-6',
    'two-thirds': 'col-span-12 @4xl/dashboard:col-span-8',
    full: 'col-span-full',
}

export interface DashboardGridProps {
    dense?: boolean
    children: ReactNode
    className?: string
}

/**
 * The grid a dashboard's panels sit in: twelve columns, a panel's span following the grid's own
 * width, not the window's, so a dashboard beside a rail or a panel lays out for the room it has.
 * Wide, the spans are as named; tablet-wide, a sixth takes a third and a quarter half, the rest the
 * whole row; phone-wide, every panel takes the row but a sixth, which takes half, so stat tiles
 * and gauges stand two to a row. The grid is its own container, so `className` places it in the
 * page. Panels in a row stretch to the same height. A dense grid packs panels with small gaps.
 */
export function DashboardGrid({ dense = false, children, className }: DashboardGridProps) {
    return (
        <div
            className={cn(
                '@container/dashboard grid w-full min-w-0 grid-cols-12',
                dense ? 'gap-1.5' : 'gap-(--density-section-gap)',
                className,
            )}
        >
            {children}
        </div>
    )
}

/** What a panel says when its query failed or its figures fell behind. */
export interface PanelStateWords {
    /** Said in a failed panel's place when `error` gives no words of its own. */
    failed: string
    retry: string
    /** Said in the head of a stale panel when `stale` gives no time of its own. */
    stale: string
}

export const PANEL_STATE_WORDS: PanelStateWords = { failed: 'This panel could not load.', retry: 'Retry', stale: 'Not up to date' }

/**
 * How a panel failed or fell behind, the same on every dashboard panel. `error` (true, or what
 * failed) puts the failure with `Retry` in the content's place, the raw message folded under
 * `technical`; `stale` (true, or since when, such as "Updated 12 min ago") keeps the content and
 * marks the head. Loading, empty, failed and stale stay apart, so a reader never takes a failure
 * for no data.
 */
export interface PanelStateProps {
    error?: boolean | string
    technical?: string
    onRetry?: () => void
    stale?: boolean | string
}

export type PanelFailureProps = Omit<PanelStateProps, 'stale'> & { words: PanelStateWords }

/** A failed panel's content: what failed, the raw message folded away, and Retry. */
export function PanelFailure({ error, technical, onRetry, words }: PanelFailureProps) {
    return (
        <Problem
            title={typeof error === 'string' ? error : words.failed}
            technical={technical}
            actions={
                onRetry === undefined ? undefined : (
                    <Button size="sm" variant="outline" onClick={onRetry}>
                        <RotateCw aria-hidden />
                        {words.retry}
                    </Button>
                )
            }
        />
    )
}

export interface StaleMarkProps {
    stale: true | string
    words: PanelStateWords
}

/** A stale panel's mark in its head: a clock and since when, in the warning ink. */
export function StaleMark({ stale, words }: StaleMarkProps) {
    const said = typeof stale === 'string' ? stale : words.stale
    return (
        <span className="flex min-w-0 shrink items-center gap-1 text-xs text-warning-ink" title={said}>
            <Clock className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{said}</span>
        </span>
    )
}

export interface PanelWords extends PanelStateWords {
    expand: string
    menu: string
    empty: string
}

const WORDS: PanelWords = { expand: 'Expand', menu: 'Panel actions', empty: 'No data for this range.', ...PANEL_STATE_WORDS }

export interface DashboardPanelProps extends PanelStateProps {
    title: ReactNode
    subtitle?: ReactNode
    span?: PanelSpan
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
    expandable?: boolean
    /** Whether an expandable panel's content is in the window, held from outside with `onExpandedChange`, as when the app's own menu opens it. */
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    /** Expanding also takes the screen, as `WindowedPane`'s `fullscreen` does. */
    fullscreen?: boolean
    loading?: boolean
    empty?: boolean
    /** Content that fills the panel to its edges, such as a list, takes no padding. */
    flush?: boolean
    footer?: ReactNode
    words?: Partial<PanelWords>
    className?: string
    children?: ReactNode
}

/**
 * One panel of a dashboard: a head with the title, a quiet subtitle such as the range it covers,
 * and its actions, then the content. `menu` holds dropdown items; `expandable` opens the content
 * in a full-screen dialog, by its button or, with `expanded`, from the app. While `loading` the content dims under a bar; when `empty` the panel
 * says so in place of its content; `error` and `stale` say it failed or fell behind (`PanelStateProps`).
 */
export function DashboardPanel({
    title,
    subtitle,
    span = 'third',
    actions,
    menu,
    expandable = false,
    expanded: expandedProp,
    onExpandedChange,
    fullscreen = false,
    loading = false,
    empty = false,
    error,
    technical,
    onRetry,
    stale,
    flush = false,
    footer,
    words: given,
    className,
    children,
}: DashboardPanelProps) {
    const words = { ...WORDS, ...given }
    const [ownExpanded, setOwnExpanded] = useState(false)
    const expanded = expandedProp ?? ownExpanded
    const setExpanded = (next: boolean) => {
        if (expandedProp === undefined) setOwnExpanded(next)
        onExpandedChange?.(next)
    }
    const tools = usePanelTools()
    const failed = error !== undefined && error !== false
    const body = failed ? (
        <PanelFailure error={error} technical={technical} onRetry={onRetry} words={words} />
    ) : empty ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{words.empty}</p>
    ) : (
        children
    )
    const tool =
        'flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring'
    return (
        <section
            className={cn(
                'flex min-w-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card',
                SPAN[span],
                className,
            )}
        >
            {/* A head holding an arranged grid's tools lets them and the actions take a line of their own when the panel is narrow. */}
            <header
                className={cn(
                    'flex min-h-10 shrink-0 items-center gap-2 border-b border-border px-3 py-1.5',
                    tools !== null && 'flex-wrap',
                )}
            >
                <div className={cn('flex min-w-0 items-baseline gap-2', tools !== null ? 'grow basis-32' : 'flex-1')}>
                    <h3 className="truncate text-sm font-medium">{title}</h3>
                    {subtitle !== undefined && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
                </div>
                {stale !== undefined && stale !== false && !failed && <StaleMark stale={stale} words={words} />}
                {actions}
                {/* The panel's tools and the grid's stay on one line together. */}
                {(expandable || menu !== undefined || tools !== null) && (
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        {expandable && (
                            <button
                                type="button"
                                aria-label={words.expand}
                                title={words.expand}
                                className={tool}
                                onClick={() => setExpanded(true)}
                            >
                                <Maximize2 className="size-3.5" aria-hidden />
                            </button>
                        )}
                        {menu !== undefined && (
                            <DropdownMenu>
                                <DropdownMenuTrigger aria-label={words.menu} title={words.menu} className={tool}>
                                    <MoreHorizontal className="size-4" aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    {menu}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <PanelTools />
                    </div>
                )}
            </header>
            <LoadingOverlay loading={loading} className="flex min-h-0 flex-1 flex-col">
                {expandable ? (
                    <WindowedPane
                        title={
                            <>
                                {title}
                                {subtitle !== undefined && (
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">{subtitle}</span>
                                )}
                            </>
                        }
                        open={expanded}
                        onOpenChange={setExpanded}
                        button="none"
                        fullscreen={fullscreen}
                        words={{ expand: words.expand }}
                        className={cn('flex min-h-0 flex-1 flex-col', !flush && !empty && 'p-4')}
                    >
                        {body}
                    </WindowedPane>
                ) : (
                    <div className={cn('flex min-h-0 flex-1 flex-col', !flush && !empty && 'p-4')}>{body}</div>
                )}
            </LoadingOverlay>
            {footer !== undefined && (
                <footer className="shrink-0 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">{footer}</footer>
            )}
        </section>
    )
}

/** One number in a row of key figures. */
export interface Kpi {
    id: string
    label: ReactNode
    value: ReactNode
    unit?: ReactNode
    change?: string
    good?: boolean
    note?: ReactNode
    trend?: ReactNode
}

export interface KpiRowProps {
    items: readonly Kpi[]
    className?: string
}

/**
 * A row of key figures across a dashboard's top, each a stat divided from the next. The row wraps
 * to two columns on a phone, the last of an odd number of figures taking the whole width of its line.
 */
export function KpiRow({ items, className }: KpiRowProps) {
    return (
        <div
            className={cn(
                'grid grid-cols-2 overflow-hidden rounded-surface border border-border-strong bg-card md:grid-cols-(--kpi-columns)',
                className,
            )}
            style={{ '--kpi-columns': `repeat(${items.length}, minmax(0, 1fr))` } as React.CSSProperties}
        >
            {items.map((item) => (
                <Stat
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    unit={item.unit}
                    change={item.change}
                    good={item.good}
                    note={item.note}
                    trend={item.trend}
                    // On a phone's two columns the box's own border closes the right column and the last line.
                    className="border-r border-b border-border p-4 max-md:last:border-b-0 max-md:odd:last:col-span-2 max-md:odd:last:border-r-0 max-md:even:border-r-0 md:border-b-0 md:last:border-r-0 max-md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                />
            ))}
        </div>
    )
}
