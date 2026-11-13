import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { textWidth, useChartLook, type ChartLook } from './look'
import { chartTheme } from './theme'
import { keepZoom } from './zoom'

export type { ChartLook } from './look'

type Engine = typeof import('./engine')

let engine: Promise<Engine> | null = null

/** Loads the chart engine once, on first use; each chart type and component it draws with loads when first drawn. */
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

/** Below this height, in pixels, a value axis up the side draws two steps rather than five, so its labels and lines keep apart. */
const SHORT = 140

/** A value axis with two steps, where the option leaves the count to the chart. */
function fewerSteps(axis: unknown): unknown {
    if (Array.isArray(axis)) return axis.map(fewerSteps)
    const box = axis as { type?: unknown; splitNumber?: unknown } | undefined
    return box?.type === 'value' && box.splitNumber === undefined ? { ...box, splitNumber: 2 } : axis
}

/**
 * The option as drawn: ECharts' own legend hidden behind ours, series hidden by name, animation off
 * when asked, the tooltip on the page body, and fewer steps up the side of a short chart.
 */
/** The room a chart has, in pixels, rounded so it redraws on a real change of size and not on every pixel. */
interface Room {
    width: number
    height: number
}

const ROUNDED = 24

const roomOf = (element: HTMLElement): Room => ({
    width: Math.round(element.clientWidth / ROUNDED) * ROUNDED,
    height: Math.round(element.clientHeight / ROUNDED) * ROUNDED,
})

const each = (part: unknown, fit: (one: Record<string, unknown>) => unknown) =>
    Array.isArray(part) ? part.map((one) => fit(one as Record<string, unknown>)) : fit(part as Record<string, unknown>)

/** A radar's radius shrunk until the names at its sides fit beside it, never the names. */
function fitRadar(radar: unknown, room: Room): unknown {
    return each(radar, (one) => {
        const names = (one.indicator as { name?: string }[] | undefined) ?? []
        const size = (one.axisName as { fontSize?: number } | undefined)?.fontSize ?? 12
        const widest = Math.max(0, ...names.map((spoke) => textWidth(spoke.name ?? '', size)))
        const beside = room.width / 2 - widest - ((one.axisNameGap as number | undefined) ?? 6) - 4
        const usual = (0.68 * Math.min(room.width, room.height)) / 2
        return beside >= usual ? one : { ...one, radius: Math.max(24, beside) }
    })
}

/** A category axis whose labels are set to every nth shows fewer, in steps of n, when that many would run together. */
function fitTicks(axis: unknown, room: Room): unknown {
    return each(axis, (one) => {
        const label = one.axisLabel as { interval?: unknown; fontSize?: number } | undefined
        if (one.type !== 'category' || !Array.isArray(one.data) || typeof label?.interval !== 'number') return one
        const size = label.fontSize ?? 12
        const names = (one.data as unknown[]).map((item) =>
            String(typeof item === 'object' && item !== null && 'value' in item ? (item as { value: unknown }).value : item),
        )
        const widest = Math.max(0, ...names.map((name) => textWidth(name, size))) + 8
        const fits = Math.max(1, Math.floor((room.width - 64) / widest))
        const step = label.interval + 1
        const needed = Math.ceil(names.length / fits)
        return needed <= step ? one : { ...one, axisLabel: { ...label, interval: step * Math.ceil(needed / step) - 1 } }
    })
}

function compose(
    option: EChartsCoreOption,
    hidden: ReadonlySet<string>,
    animate: boolean,
    short = false,
    room: Room | null = null,
): EChartsCoreOption {
    const legend = (Array.isArray(option.legend) ? option.legend[0] : option.legend) as Record<string, unknown> | undefined
    // The tooltip lives on the page body, so a panel's clipping or the chart above it never covers it.
    const onBody = (tooltip: unknown) => ({ appendTo: 'body', ...(tooltip as Record<string, unknown>) })
    const tooltip =
        option.tooltip === undefined ? undefined : Array.isArray(option.tooltip) ? option.tooltip.map(onBody) : onBody(option.tooltip)
    return {
        ...option,
        ...(tooltip === undefined ? {} : { tooltip }),
        ...(short && option.yAxis !== undefined ? { yAxis: fewerSteps(option.yAxis) } : {}),
        ...(room !== null && option.radar !== undefined ? { radar: fitRadar(option.radar, room) } : {}),
        ...(room !== null && option.xAxis !== undefined ? { xAxis: fitTicks(option.xAxis, room) } : {}),
        animation: animate && option.animation !== false,
        legend: { show: false, ...legend, selected: Object.fromEntries([...hidden].map((name) => [name, false])) },
    }
}

const DECOR_TITLE = 36
const DECOR_SUBTITLE = 16
const DECOR_LEGEND = 28

/**
 * The option with the title and legend switched on above the plot, for an export `height` tall
 * before them. Each grid moves down by what they take, its shares of the height held in pixels so
 * grids stacked by shares keep their places.
 */
function decorate(
    option: EChartsCoreOption,
    decor: ExportDecor,
    look: ChartLook,
    height: number,
): { option: EChartsCoreOption; extra: number } {
    const title = decor.title !== undefined && decor.title !== ''
    const legend = decor.legend === true && seriesOf(option).length > 0
    const head = title ? DECOR_TITLE + (decor.subtitle ? DECOR_SUBTITLE : 0) : 12
    const extra = head + (legend ? DECOR_LEGEND : 0)
    const pixels = (value: unknown) =>
        typeof value === 'string' && value.endsWith('%') ? (Number.parseFloat(value) / 100) * height : value
    const shift = (grid: unknown) => {
        const box = (grid ?? {}) as { top?: unknown; bottom?: unknown; height?: unknown }
        const top = pixels(box.top)
        return {
            ...box,
            top: (typeof top === 'number' ? top : 12) + extra,
            ...(box.bottom === undefined ? {} : { bottom: pixels(box.bottom) }),
            ...(box.height === undefined ? {} : { height: pixels(box.height) }),
        }
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

export interface EChartProps {
    /** What to draw; null while it is not known yet, which draws nothing. */
    option: ChartOption | null
    /** What the chart shows, for a screen reader. */
    label: string
    hidden?: ReadonlySet<string>
    hovered?: string | null
    animate?: boolean
    handle?: Ref<ChartHandle | null>
    className?: string
}

/**
 * One ECharts chart, themed from the library's tokens and typeface, drawn again when the scheme,
 * the theme or a token override changes, and resized with its box. The engine loads on first use.
 * ECharts' own legend stays hidden: `hidden` names the series to leave out and `hovered` the one
 * to emphasize, so a legend beside the chart drives it. `handle` exports it as SVG or PNG. Keep
 * `option` stable between renders, at module level or memoized, or the chart redraws on each one.
 */
export function EChart({ option, label, hidden = EMPTY, hovered = null, animate = false, handle, className }: EChartProps) {
    const look = useChartLook()
    const element = useRef<HTMLDivElement>(null)
    const chart = useRef<EChartsType | null>(null)
    const [ready, setReady] = useState(false)
    // Whether the current option is drawn; marked on the element, so a screenshot waits for it.
    const [settled, setSettled] = useState(false)
    const [short, setShort] = useState(false)
    const [room, setRoom] = useState<Room | null>(null)
    const measure = (el: HTMLElement) => {
        setShort(el.clientHeight < SHORT)
        const next = roomOf(el)
        setRoom((held) => (held !== null && held.width === next.width && held.height === next.height ? held : next))
    }
    const resolved = useMemo(
        () => (look === null || option === null ? null : typeof option === 'function' ? option(look) : option),
        [look, option],
    )

    const themed = useRef<ChartLook | null>(null)
    // The engine's count of parts loaded on demand when the chart was made.
    const made = useRef(0)
    // The option last drawn, so a redraw that asks for the same zoom keeps the reader's.
    const drawnOption = useRef<EChartsCoreOption | null>(null)
    const drawn = look !== null

    // The engine loads while the fonts and the look are still on their way, not after them.
    useEffect(() => {
        void loadEngine()
    }, [])

    useEffect(() => {
        if (!drawn) return
        let live = true
        let observer: ResizeObserver | null = null
        void loadEngine().then(({ init, partsLoaded }) => {
            const el = element.current
            if (!live || el === null || themed.current === null) return
            chart.current = init(el, chartTheme(themed.current), { renderer: 'canvas' })
            made.current = partsLoaded()
            measure(el)
            observer = new ResizeObserver(() => {
                chart.current?.resize()
                measure(el)
            })
            observer.observe(el)
            setReady(true)
        })
        return () => {
            live = false
            observer?.disconnect()
            chart.current?.dispose()
            chart.current = null
            drawnOption.current = null
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
        // Each chart type and component loads the first time an option draws with it.
        setSettled(false)
        const composed = compose(resolved, hidden, animate, short, room)
        void loadEngine().then(async ({ ensure, init, partsLoaded }) => {
            await ensure(composed as Record<string, unknown>)
            const el = element.current
            if (!live || el === null) return
            // A chart made before a part it draws loaded lacks that part's layout, so it is made again.
            if (partsLoaded() !== made.current && themed.current !== null) {
                chart.current?.dispose()
                chart.current = init(el, chartTheme(themed.current), { renderer: 'canvas' })
                made.current = partsLoaded()
                drawnOption.current = null
            }
            const instance = chart.current
            if (instance === null) return
            const zooms = (instance.getOption() as { dataZoom?: { start?: number; end?: number }[] } | undefined)?.dataZoom ?? []
            instance.setOption(keepZoom(drawnOption.current, composed, zooms), { notMerge: true })
            drawnOption.current = resolved
            setSettled(true)
        })
        return () => {
            live = false
        }
    }, [ready, resolved, hidden, animate, short, room])

    useEffect(() => {
        const instance = chart.current
        if (!ready || instance === null || resolved === null) return
        instance.dispatchAction({ type: 'downplay' })
        if (hovered === null || hidden.has(hovered)) return
        // A legend entry names a series, or else an item of the first one: a slice, a band, a branch, a node.
        const named = seriesOf(resolved).some((series) => series.name === hovered)
        instance.dispatchAction(named ? { type: 'highlight', seriesName: hovered } : { type: 'highlight', seriesIndex: 0, name: hovered })
    }, [ready, resolved, hovered, hidden])

    useImperativeHandle(handle, () => {
        const render = async (renderer: 'svg' | 'canvas', decor: ExportDecor) => {
            const { init, ensure, ensureSvg } = await loadEngine()
            if (look === null || resolved === null) throw new Error('The chart has not drawn yet.')
            const box = element.current?.getBoundingClientRect()
            const width = Math.max(320, Math.round(box?.width ?? 640))
            const base = Math.max(200, Math.round(box?.height ?? 320))
            const { option: decorated, extra } = decorate(compose(resolved, hidden, false), decor, look, base)
            // The title drawn into the image, and the SVG renderer, load only for an export.
            await Promise.all([ensure(decorated as Record<string, unknown>), renderer === 'svg' ? ensureSvg() : undefined])
            const height = base + extra
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
