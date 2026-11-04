import { Download, Info, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { cn } from '../../lib/cn'
import { LoadingOverlay } from '../Loaders'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { ChartLegend, type LegendItem, type LegendStat, type LegendWords } from './ChartLegend'
import type { ChartHandle } from './EChart'

/** What the frame hands its chart: the legend's state and the handle the chart fills for export. */
export interface ChartState {
    hidden: ReadonlySet<string>
    hovered: string | null
    handle: RefObject<ChartHandle | null>
    fullscreen: boolean
}

export interface ChartFrameWords {
    info: string
    export: string
    svg: string
    png: string
    fullscreen: string
    exitFullscreen: string
    empty: string
    loading: string
    legend?: LegendWords
}

const WORDS: ChartFrameWords = {
    info: 'About this panel',
    export: 'Export',
    svg: 'Export as SVG',
    png: 'Export as PNG',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
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
    'flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-ring data-popup-open:bg-secondary'

/**
 * The chrome around a chart: a small title with an optional info marker and subtitle, the panel's
 * actions, an Export menu (SVG and PNG, with the title and legend drawn into the image) and a
 * Fullscreen button, the legend, and the chart, which grows to the screen in fullscreen. The tools
 * show on hover or focus where the pointer can hover. `children` draws the chart from the state.
 */
export function ChartFrame({
    title,
    subtitle,
    info,
    actions,
    legend,
    legendMode = 'list',
    legendStats,
    legendFormat,
    file = 'chart',
    exportable = true,
    expandable = true,
    loading = false,
    empty = false,
    bodyClassName = 'h-56',
    fit = false,
    words = WORDS,
    className,
    children,
}: {
    title?: ReactNode
    subtitle?: ReactNode
    /** What the panel shows, behind an info marker beside the title. */
    info?: ReactNode
    actions?: ReactNode
    legend?: readonly LegendItem[]
    /** A wrapped row of series under the chart, or a table of their figures. */
    legendMode?: 'list' | 'table'
    legendStats?: readonly LegendStat[]
    legendFormat?: (value: number) => string
    /** The export's file name, without an extension. */
    file?: string
    exportable?: boolean
    expandable?: boolean
    loading?: boolean
    empty?: boolean
    /** The chart area's size; it fills the screen in fullscreen. */
    bodyClassName?: string
    /** The content sets the body's height, for content laid out in the page rather than drawn on a canvas. */
    fit?: boolean
    words?: ChartFrameWords
    className?: string
    children: (state: ChartState) => ReactNode
}) {
    const handle = useRef<ChartHandle | null>(null)
    const [root, setRoot] = useState<HTMLElement | null>(null)
    const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
    const [hovered, setHovered] = useState<string | null>(null)
    const [full, setFull] = useState(false)

    useEffect(() => {
        const sync = () => setFull(document.fullscreenElement !== null && document.fullscreenElement === root)
        document.addEventListener('fullscreenchange', sync)
        return () => document.removeEventListener('fullscreenchange', sync)
    }, [root])

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

    const head = title !== undefined || actions !== undefined || exportable || expandable
    const showLegend = legend !== undefined && legend.length > 0 && !empty
    return (
        <section
            ref={setRoot}
            className={cn(
                'group/frame flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-card text-card-foreground',
                full && 'h-screen w-screen rounded-none border-0 p-4',
                className,
            )}
        >
            {head && (
                <header className="flex h-8 shrink-0 items-center gap-1 pr-1.5 pl-3">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
                                aria-label={full ? words.exitFullscreen : words.fullscreen}
                                title={full ? words.exitFullscreen : words.fullscreen}
                                className={TOOL}
                                onClick={() => void (full ? document.exitFullscreen() : root?.requestFullscreen())}
                            >
                                {full ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
                            </button>
                        )}
                    </div>
                </header>
            )}
            <div className={cn('flex min-h-0 flex-col px-2 pb-2', full && 'flex-1', !head && 'pt-2')}>
                <LoadingOverlay
                    loading={loading}
                    label={words.loading}
                    className={cn('min-h-0', full ? 'flex-1' : fit ? (empty ? 'h-24' : undefined) : bodyClassName)}
                >
                    {empty ? (
                        <p className="absolute inset-0 flex items-center justify-center text-center text-xs text-muted-foreground">
                            {words.empty}
                        </p>
                    ) : (
                        <div className={fit ? undefined : 'absolute inset-0'}>
                            {children({ hidden, hovered, handle, fullscreen: full })}
                        </div>
                    )}
                </LoadingOverlay>
                {showLegend && (
                    <ChartLegend
                        items={legend}
                        hidden={hidden}
                        onToggle={toggle}
                        onHover={setHovered}
                        mode={legendMode}
                        stats={legendStats}
                        format={legendFormat}
                        words={words.legend}
                        className={cn('mt-1 shrink-0', legendMode === 'table' && 'max-h-40 overflow-y-auto')}
                    />
                )}
            </div>
        </section>
    )
}
