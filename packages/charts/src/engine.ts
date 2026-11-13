import { LegendComponent, TooltipComponent } from 'echarts/components'
import { init as start, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

let registered = false

/**
 * ECharts' `init`, with the canvas renderer, the legend every chart drives and the tooltip nearly
 * every kind draws registered first. Registering inside the call keeps them from being dropped by a
 * bundler that treats this module as free of side effects. Every other chart type and component
 * loads on demand through `ensure`.
 */
export function init(...args: Parameters<typeof start>): ReturnType<typeof start> {
    if (!registered) {
        use([CanvasRenderer, LegendComponent, TooltipComponent])
        registered = true
    }
    return start(...args)
}

type Load = () => Promise<unknown>

const grid: Load = () => import('echarts/lib/component/grid')
const polar: Load = () => import('echarts/lib/component/polar')
const parallel: Load = () => import('echarts/lib/component/parallel')

/**
 * Every chart type, each loaded the first time an option draws it, so an app that draws only bars
 * downloads the bar series and the grid and never a line, a gauge or a sankey.
 */
const SERIES: Record<string, Load> = {
    bar: () => import('echarts/lib/chart/bar'),
    boxplot: () => import('echarts/lib/chart/boxplot'),
    candlestick: () => import('echarts/lib/chart/candlestick'),
    custom: () => import('echarts/lib/chart/custom'),
    funnel: () => import('echarts/lib/chart/funnel'),
    gauge: () => import('echarts/lib/chart/gauge'),
    graph: () => import('echarts/lib/chart/graph'),
    heatmap: () => import('echarts/lib/chart/heatmap'),
    line: () => import('echarts/lib/chart/line'),
    parallel: () => import('echarts/lib/chart/parallel'),
    pictorialBar: () => import('echarts/lib/chart/pictorialBar'),
    pie: () => import('echarts/lib/chart/pie'),
    radar: () => import('echarts/lib/chart/radar'),
    sankey: () => import('echarts/lib/chart/sankey'),
    scatter: () => import('echarts/lib/chart/scatter'),
    sunburst: () => import('echarts/lib/chart/sunburst'),
    themeRiver: () => import('echarts/lib/chart/themeRiver'),
    tree: () => import('echarts/lib/chart/tree'),
    treemap: () => import('echarts/lib/chart/treemap'),
}

/** Every component, by the option key that asks for it. */
const COMPONENTS: Record<string, Load> = {
    aria: () => import('echarts/lib/component/aria'),
    calendar: () => import('echarts/lib/component/calendar'),
    dataZoom: () => import('echarts/lib/component/dataZoom'),
    grid,
    xAxis: grid,
    yAxis: grid,
    parallel,
    parallelAxis: parallel,
    polar,
    angleAxis: polar,
    radiusAxis: polar,
    radar: () => import('echarts/lib/component/radar'),
    singleAxis: () => import('echarts/lib/component/singleAxis'),
    title: () => import('echarts/lib/component/title'),
    visualMap: () => import('echarts/lib/component/visualMap'),
}

/** The marks a series can carry, by the series key that asks for each. */
const MARKS: Record<string, Load> = {
    markArea: () => import('echarts/lib/component/markArea'),
    markLine: () => import('echarts/lib/component/markLine'),
    markPoint: () => import('echarts/lib/component/markPoint'),
}

const loaded = new Map<Load, Promise<unknown>>()
let parts = 0

/**
 * How many parts have loaded on demand so far. ECharts gives a chart the layouts registered when
 * the chart was made, so a chart made before a part loaded has to be made again to draw it.
 */
export function partsLoaded(): number {
    return parts
}

function once(load: Load): Promise<unknown> {
    let known = loaded.get(load)
    if (known === undefined) {
        known = load().then(() => {
            parts += 1
        })
        loaded.set(load, known)
    }
    return known
}

/** Loads, once each, the chart types, components and marks an option draws with. */
export function ensure(option: Record<string, unknown>): Promise<unknown> {
    const series = (option.series === undefined ? [] : Array.isArray(option.series) ? option.series : [option.series]) as Record<
        string,
        unknown
    >[]
    const loads = new Set<Load>()
    for (const entry of series) {
        const load = SERIES[String(entry.type)]
        if (load !== undefined) loads.add(load)
        for (const key of Object.keys(entry)) if (key in MARKS && entry[key] !== undefined) loads.add(MARKS[key])
    }
    for (const key of Object.keys(option)) if (key in COMPONENTS && option[key] !== undefined) loads.add(COMPONENTS[key])
    return Promise.all([...loads].map(once))
}

/** Loads the SVG renderer, which only an export to SVG draws with. */
export async function ensureSvg(): Promise<void> {
    const { install } = await import('echarts/lib/renderer/installSVGRenderer')
    use(install)
}
