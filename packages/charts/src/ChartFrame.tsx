import { Download, Info, Maximize2, MoreHorizontal } from 'lucide-react'
import { useRef, useState, type ReactNode, type RefObject } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { LoadingOverlay } from '@winterop-com/sokkel-ui/Loaders'
import { WINDOWED_PANE_WORDS, WindowedPane, useWindowedPane } from '@winterop-com/sokkel-ui/WindowedPane'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { ChartLegend, type LegendItem, type LegendStat, type LegendWords } from './ChartLegend'
import type { ChartHandle } from './EChart'

/** What the frame hands its chart: the legend's state, the handle the chart fills for export, and where it is drawn. */
export interface ChartState {
    hidden: ReadonlySet<string>
    hovered: string | null
    handle: RefObject<ChartHandle | null>
    /** Whether the chart is drawn in the expanded window rather than in the frame. */
    windowed: boolean
}

export interface ChartFrameWords {
    info: string
    export: string
    svg: string
    png: string
    /** The expand button's label. */
    expand: string
    /** The label of the button that opens the panel's menu. */
    menu: string
    /** The window's close button's label. */
    close: string
    /** Said in the frame's place while the chart is in the window. */
    away: string
    empty: string
    loading: string
    legend?: Partial<LegendWords>
}

const WORDS: ChartFrameWords = {
    info: 'About this panel',
    export: 'Export',
    svg: 'Export as SVG',
    png: 'Export as PNG',
    expand: WINDOWED_PANE_WORDS.expand,
    menu: 'Panel actions',
    close: WINDOWED_PANE_WORDS.close,
    away: WINDOWED_PANE_WORDS.away,
    empty: 'No data for this range.',
    loading: 'Loading',
}

function save(name: string, href: string) {
    const link = document.createElement('a')
    link.href = href
    link.download = name
    link.click()
}

const TOOL =
    'flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-ring data-popup-open:bg-hover'

export interface ChartFrameProps {
    title?: ReactNode
    subtitle?: ReactNode
    /** What the panel shows, behind an info marker beside the title. */
    info?: ReactNode
    actions?: ReactNode
    /** Dropdown menu items, behind a button after the export and expand tools, as `DashboardPanel`'s `menu`. */
    menu?: ReactNode
    legend?: readonly LegendItem[]
    /** A wrapped row of series under the chart, or a table of their figures. */
    legendMode?: 'list' | 'table'
    legendStats?: readonly LegendStat[]
    legendFormat?: (value: number) => string
    /** The export's file name, without an extension. */
    file?: string
    exportable?: boolean
    expandable?: boolean
    /** Expanding also takes the screen: the page goes full screen while the window is open, as `WindowedPane`'s `fullscreen` does. */
    fullscreen?: boolean
    /** Opens the chart in the window at first. */
    defaultExpanded?: boolean
    /** Whether the chart is in the window, held from outside with `onExpandedChange`, as when a panel's menu opens it. */
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    loading?: boolean
    empty?: boolean
    /** The chart area's size; it fills the window when expanded. */
    bodyClassName?: string
    /** The content sets the body's height, for content laid out in the page rather than drawn on a canvas. */
    fit?: boolean
    words?: Partial<ChartFrameWords>
    className?: string
    children: (state: ChartState) => ReactNode
}

/** A table legend of this many series or fewer shows them all; a longer one scrolls in its own box. */
const SHORT_LEGEND = 6

/**
 * The chrome around a chart: a small title with an optional info marker and subtitle, the panel's
 * actions, an Export menu (SVG and PNG, with the title and legend drawn into the image) and an
 * expand button, the legend, and the chart. Expanding opens the chart and its legend near full
 * screen through `WindowedPane`, as every expandable pane opens, with the frame keeping its place
 * until the window closes; `fullscreen` makes the page take the screen while it is open, and
 * `expanded` with `onExpandedChange` opens it from outside. The tools show on hover or focus where the pointer can hover.
 * `children` draws the chart from the state.
 */
export function ChartFrame({
    title,
    subtitle,
    info,
    actions,
    menu,
    legend,
    legendMode = 'list',
    legendStats,
    legendFormat,
    file = 'chart',
    exportable = true,
    expandable = true,
    fullscreen = false,
    defaultExpanded = false,
    expanded: expandedProp,
    onExpandedChange,
    loading = false,
    empty = false,
    bodyClassName = 'h-56',
    fit = false,
    words: given,
    className,
    children,
}: ChartFrameProps) {
    const words = { ...WORDS, ...given }
    const handle = useRef<ChartHandle | null>(null)
    const [root, setRoot] = useState<HTMLElement | null>(null)
    const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
    const [hovered, setHovered] = useState<string | null>(null)
    const [ownExpanded, setOwnExpanded] = useState(defaultExpanded)
    const expanded = expandedProp ?? ownExpanded
    const setExpanded = (next: boolean) => {
        if (expandedProp === undefined) setOwnExpanded(next)
        onExpandedChange?.(next)
    }

    const toggle = (key: string) => {
        const next = new Set(hidden)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        setHidden(next)
        if (next.has(key)) setHovered(null)
    }

    const exportAs = async (format: 'svg' | 'png') => {
        const chart = handle.current
        if (chart === null) return
        const decor = {
            title: typeof title === 'string' ? title : undefined,
            subtitle: typeof subtitle === 'string' ? subtitle : undefined,
            legend: legend !== undefined && legend.length > 1,
        }
        if (format === 'png') {
            save(`${file}.png`, await chart.png(decor))
            return
        }
        const url = URL.createObjectURL(new Blob([await chart.svg(decor)], { type: 'image/svg+xml' }))
        save(`${file}.svg`, url)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const head = title !== undefined || actions !== undefined || menu !== undefined || exportable || expandable
    const showLegend = legend !== undefined && legend.length > 0 && !empty
    const content = (
        <FrameBody
            loading={loading}
            empty={empty}
            fit={fit}
            bodyClassName={bodyClassName}
            words={words}
            legend={
                showLegend ? (
                    <ChartLegend
                        items={legend}
                        hidden={hidden}
                        onToggle={toggle}
                        onHover={setHovered}
                        mode={legendMode}
                        stats={legendStats}
                        format={legendFormat}
                        words={words.legend}
                        className={cn(
                            'mt-1 shrink-0',
                            legendMode === 'table' && legend.length > SHORT_LEGEND && 'max-h-40 overflow-y-auto',
                        )}
                    />
                ) : null
            }
        >
            {(windowed) => children({ hidden, hovered, handle, windowed })}
        </FrameBody>
    )
    return (
        <section
            ref={setRoot}
            className={cn(
                'group/frame flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-card text-card-foreground',
                className,
            )}
        >
            {/* A frame's own actions move under its title, with the export tools, when the two do not fit on one line. */}
            {head && (
                <header className={cn('flex min-h-8 shrink-0 items-center gap-1 pr-1.5 pl-3', actions !== undefined && 'flex-wrap')}>
                    <div className={cn('flex min-h-8 min-w-0 items-center gap-1.5', actions !== undefined ? 'grow basis-40' : 'flex-1')}>
                        {title !== undefined && <h3 className="truncate text-xs font-medium">{title}</h3>}
                        {info !== undefined && (
                            <Tooltip>
                                <TooltipTrigger aria-label={words.info} className={cn(TOOL, 'size-5')}>
                                    <Info className="size-3" aria-hidden />
                                </TooltipTrigger>
                                <TooltipContent container={root}>{info}</TooltipContent>
                            </Tooltip>
                        )}
                        {subtitle !== undefined && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                        {actions}
                        <div className="flex items-center transition-opacity group-focus-within/frame:opacity-100 group-hover/frame:opacity-100 [@media(hover:hover)]:opacity-0">
                            {exportable && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger aria-label={words.export} title={words.export} className={TOOL} disabled={empty}>
                                        <Download className="size-3.5" aria-hidden />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" container={root} className="w-40">
                                        <DropdownMenuItem onClick={() => void exportAs('svg')}>{words.svg}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => void exportAs('png')}>{words.png}</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {expandable && (
                                <button
                                    type="button"
                                    aria-label={words.expand}
                                    title={words.expand}
                                    className={TOOL}
                                    onClick={() => setExpanded(true)}
                                >
                                    <Maximize2 className="size-3.5" aria-hidden />
                                </button>
                            )}
                            {menu !== undefined && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger aria-label={words.menu} title={words.menu} className={TOOL}>
                                        <MoreHorizontal className="size-3.5" aria-hidden />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" container={root} className="w-44">
                                        {menu}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </header>
            )}
            {expandable ? (
                <WindowedPane
                    title={
                        <>
                            {title}
                            {subtitle !== undefined && <span className="ml-2 text-xs font-normal text-muted-foreground">{subtitle}</span>}
                        </>
                    }
                    open={expanded}
                    onOpenChange={setExpanded}
                    button="none"
                    fullscreen={fullscreen}
                    words={{ expand: words.expand, close: words.close, away: words.away }}
                    className={cn('flex flex-col px-2 pb-2', !head && 'pt-2')}
                >
                    {content}
                </WindowedPane>
            ) : (
                <div className={cn('flex min-h-0 flex-col px-2 pb-2', !head && 'pt-2')}>{content}</div>
            )}
        </section>
    )
}

/** The chart and its legend, in the frame or filling the window. */
function FrameBody({
    loading,
    empty,
    fit,
    bodyClassName,
    legend,
    words,
    children,
}: {
    loading: boolean
    empty: boolean
    fit: boolean
    bodyClassName: string
    legend: ReactNode
    words: ChartFrameWords
    children: (windowed: boolean) => ReactNode
}) {
    const windowed = useWindowedPane()?.windowed === true
    return (
        <div className={cn('flex min-h-0 flex-col', windowed && 'flex-1')}>
            <LoadingOverlay
                loading={loading}
                label={words.loading}
                className={cn('min-h-0', fit ? (empty ? 'h-24' : undefined) : windowed ? 'flex-1' : bodyClassName)}
            >
                {empty ? (
                    <p className="absolute inset-0 flex items-center justify-center text-center text-xs text-muted-foreground">
                        {words.empty}
                    </p>
                ) : (
                    <div className={fit ? undefined : 'absolute inset-0'}>{children(windowed)}</div>
                )}
            </LoadingOverlay>
            {legend}
        </div>
    )
}
