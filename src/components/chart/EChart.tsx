import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'

import { cn } from '../../lib/cn'
import { useChartLook, type ChartLook } from './look'
import { chartTheme } from './theme'

type Engine = typeof import('./engine')

let engine: Promise<Engine> | null = null

/** Loads the chart engine once, on first use, with only the chart types and components the library draws. */
export function loadEngine(): Promise<Engine> {
    engine ??= import('./engine')
    return engine
}

/** What an export adds around the chart: its title, and the legend drawn by the chart itself. */
export interface ExportDecor {
    title?: string
    subtitle?: string
    legend?: boolean
}

/** What a chart offers its frame: SVG markup, and a PNG as a data URL, each optionally with its title and legend. */
export interface ChartHandle {
    svg: (decor?: ExportDecor) => Promise<string>
    png: (decor?: ExportDecor) => Promise<string>
}

/** An option, or a function of the resolved look that builds one. */
export type ChartOption = EChartsCoreOption | ((look: ChartLook) => EChartsCoreOption)

type Series = { type?: string; name?: string }

function seriesOf(option: EChartsCoreOption): Series[] {
    const series = option.series
    if (series === undefined) return []
    return (Array.isArray(series) ? series : [series]) as Series[]
}

/** The option as drawn: ECharts' own legend hidden behind ours, series hidden by name, animation off when asked, the tooltip on the page body. */
function compose(option: EChartsCoreOption, hidden: ReadonlySet<string>, animate: boolean): EChartsCoreOption {
    const legend = (Array.isArray(option.legend) ? option.legend[0] : option.legend) as Record<string, unknown> | undefined
    // The tooltip lives on the page body, so a panel's clipping or the chart above it never covers it.
    const onBody = (tooltip: unknown) => ({ appendTo: 'body', ...(tooltip as Record<string, unknown>) })
    const tooltip =
        option.tooltip === undefined ? undefined : Array.isArray(option.tooltip) ? option.tooltip.map(onBody) : onBody(option.tooltip)
    return {
        ...option,
        ...(tooltip === undefined ? {} : { tooltip }),
        animation: animate && option.animation !== false,
        legend: { show: false, ...legend, selected: Object.fromEntries([...hidden].map((name) => [name, false])) },
    }
}

const DECOR_TITLE = 36
const DECOR_SUBTITLE = 16
const DECOR_LEGEND = 28

/** The option with the title and legend switched on above the plot, for an export. */
function decorate(option: EChartsCoreOption, decor: ExportDecor, look: ChartLook): { option: EChartsCoreOption; extra: number } {
    const title = decor.title !== undefined && decor.title !== ''
    const legend = decor.legend === true && seriesOf(option).length > 0
    const head = title ? DECOR_TITLE + (decor.subtitle ? DECOR_SUBTITLE : 0) : 12
    const extra = head + (legend ? DECOR_LEGEND : 0)
    const shift = (grid: unknown) => {
        const box = (grid ?? {}) as { top?: unknown }
        return { ...box, top: (typeof box.top === 'number' ? box.top : 12) + extra }
    }
    const current = (Array.isArray(option.legend) ? option.legend[0] : option.legend) as Record<string, unknown> | undefined
    return {
        extra,
        option: {
            ...option,
            backgroundColor: look.card,
            title: title ? { show: true, text: decor.title, subtext: decor.subtitle, left: 12, top: 10, itemGap: 4 } : { show: false },
            legend: legend ? { ...current, show: true, left: 12, top: head, type: 'plain' } : { ...current, show: false },
            grid: Array.isArray(option.grid) ? option.grid.map(shift) : shift(option.grid),
        },
    }
}

/**
 * One ECharts chart, themed from the library's tokens and typeface, drawn again when the scheme,
 * the theme or a token override changes, and resized with its box. The engine loads on first use.
 * ECharts' own legend stays hidden: `hidden` names the series to leave out and `hovered` the one
 * to emphasize, so a legend beside the chart drives it. `handle` exports it as SVG or PNG. Keep
 * `option` stable between renders, at module level or memoized, or the chart redraws on each one.
 */
export function EChart({
    option,
    label,
    hidden = EMPTY,
    hovered = null,
    animate = false,
    handle,
    className,
}: {
    option: ChartOption
    /** What the chart shows, for a screen reader. */
    label: string
    hidden?: ReadonlySet<string>
    hovered?: string | null
    animate?: boolean
    handle?: Ref<ChartHandle | null>
    className?: string
}) {
    const look = useChartLook()
    const element = useRef<HTMLDivElement>(null)
    const chart = useRef<EChartsType | null>(null)
    const [ready, setReady] = useState(false)
    // Whether the current option is drawn; marked on the element, so a screenshot waits for it.
    const [settled, setSettled] = useState(false)
    const resolved = useMemo(() => (look === null ? null : typeof option === 'function' ? option(look) : option), [look, option])

    const themed = useRef<ChartLook | null>(null)
    const drawn = look !== null

    useEffect(() => {
        if (!drawn) return
        let live = true
        let observer: ResizeObserver | null = null
        void loadEngine().then(({ init }) => {
            const el = element.current
            if (!live || el === null || themed.current === null) return
            const instance = init(el, chartTheme(themed.current), { renderer: 'canvas' })
            chart.current = instance
            observer = new ResizeObserver(() => instance.resize())
            observer.observe(el)
            setReady(true)
        })
        return () => {
            live = false
            observer?.disconnect()
            chart.current?.dispose()
            chart.current = null
            setReady(false)
        }
    }, [drawn])

    useEffect(() => {
        if (look === null) return
        const first = themed.current === null
        themed.current = look
        if (!first && ready) chart.current?.setTheme(chartTheme(look))
    }, [ready, look])

    useEffect(() => {
        if (!ready || resolved === null) return
        let live = true
        // A chart type outside the base set loads the first time an option draws it.
        setSettled(false)
        void loadEngine()
            .then(({ ensure }) => ensure(resolved as Record<string, unknown>))
            .then(() => {
                if (!live) return
                chart.current?.setOption(compose(resolved, hidden, animate), { notMerge: true })
                setSettled(true)
            })
        return () => {
            live = false
        }
    }, [ready, resolved, hidden, animate])

    useEffect(() => {
        const instance = chart.current
        if (!ready || instance === null || resolved === null) return
        instance.dispatchAction({ type: 'downplay' })
        if (hovered === null || hidden.has(hovered)) return
        // A ring's or a funnel's legend names its slices, which are items of one series rather than series.
        const items = seriesOf(resolved).some((series) => series.type === 'pie' || series.type === 'funnel')
        instance.dispatchAction(items ? { type: 'highlight', seriesIndex: 0, name: hovered } : { type: 'highlight', seriesName: hovered })
    }, [ready, resolved, hovered, hidden])

    useImperativeHandle(handle, () => {
        const render = async (renderer: 'svg' | 'canvas', decor: ExportDecor) => {
            const { init, ensure } = await loadEngine()
            if (look === null || resolved === null) throw new Error('The chart has not drawn yet.')
            await ensure(resolved as Record<string, unknown>)
            const box = element.current?.getBoundingClientRect()
            const { option: decorated, extra } = decorate(compose(resolved, hidden, false), decor, look)
            const width = Math.max(320, Math.round(box?.width ?? 640))
            const height = Math.max(200, Math.round(box?.height ?? 320)) + extra
            if (renderer === 'svg') {
                const ssr = init(null as unknown as HTMLElement, chartTheme(look), { renderer: 'svg', ssr: true, width, height })
                ssr.setOption(decorated)
                const svg = ssr.renderToSVGString()
                ssr.dispose()
                return svg
            }
            const host = document.createElement('div')
            host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;`
            document.body.append(host)
            const instance = init(host, chartTheme(look), { renderer: 'canvas', width, height })
            try {
                instance.setOption(decorated)
                return instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: look.card })
            } finally {
                instance.dispose()
                host.remove()
            }
        }
        return { svg: (decor = {}) => render('svg', decor), png: (decor = {}) => render('canvas', decor) }
    }, [look, resolved, hidden])

    return (
        <div
            ref={element}
            role="img"
            aria-label={label}
            data-echart=""
            data-echart-settled={settled ? '' : undefined}
            className={cn('relative h-full min-h-0 w-full min-w-0', className)}
        />
    )
}

const EMPTY: ReadonlySet<string> = new Set()
