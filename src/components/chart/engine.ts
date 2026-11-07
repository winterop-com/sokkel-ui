import { BarChart, GaugeChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts'
import {
    AriaComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    MarkAreaComponent,
    MarkLineComponent,
    RadarComponent,
    TitleComponent,
    TooltipComponent,
    VisualMapComponent,
} from 'echarts/components'
import { init as start, use } from 'echarts/core'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

/** The chart types, components and renderers every chart needs, registered on first use. */
const PARTS = [
    LineChart,
    BarChart,
    HeatmapChart,
    GaugeChart,
    PieChart,
    RadarChart,
    ScatterChart,
    AriaComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    MarkAreaComponent,
    MarkLineComponent,
    RadarComponent,
    TitleComponent,
    TooltipComponent,
    VisualMapComponent,
    CanvasRenderer,
    SVGRenderer,
]

let registered = false

/**
 * ECharts' `init`, with the parts this library draws with registered first. Registering inside the
 * call keeps it from being dropped by a bundler that treats this module as free of side effects.
 */
export function init(...args: Parameters<typeof start>): ReturnType<typeof start> {
    if (!registered) {
        use(PARTS)
        registered = true
    }
    return start(...args)
}

/**
 * The chart types beyond the base set, each loaded the first time an option draws it, so an app
 * that draws only bars and lines never downloads a sankey or a treemap.
 */
const SERIES: Record<string, () => Promise<unknown>> = {
    boxplot: () => import('echarts/lib/chart/boxplot'),
    candlestick: () => import('echarts/lib/chart/candlestick'),
    custom: () => import('echarts/lib/chart/custom'),
    funnel: () => import('echarts/lib/chart/funnel'),
    graph: () => import('echarts/lib/chart/graph'),
    parallel: () => import('echarts/lib/chart/parallel'),
    pictorialBar: () => import('echarts/lib/chart/pictorialBar'),
    sankey: () => import('echarts/lib/chart/sankey'),
    sunburst: () => import('echarts/lib/chart/sunburst'),
    themeRiver: () => import('echarts/lib/chart/themeRiver'),
    tree: () => import('echarts/lib/chart/tree'),
    treemap: () => import('echarts/lib/chart/treemap'),
}

/** The components beyond the base set, by the option key that asks for each. */
const COMPONENTS: Record<string, () => Promise<unknown>> = {
    calendar: () => import('echarts/lib/component/calendar'),
    parallel: () => import('echarts/lib/component/parallel'),
    parallelAxis: () => import('echarts/lib/component/parallel'),
    polar: () => import('echarts/lib/component/polar'),
    angleAxis: () => import('echarts/lib/component/polar'),
    radiusAxis: () => import('echarts/lib/component/polar'),
    singleAxis: () => import('echarts/lib/component/singleAxis'),
}

const loaded = new Map<string, Promise<unknown>>()
let parts = 0

/**
 * How many parts have loaded on demand so far. ECharts gives a chart the layouts registered when
 * the chart was made, so a chart made before a part loaded has to be made again to draw it.
 */
export function partsLoaded(): number {
    return parts
}

/** Loads, once each, the chart types and components an option draws with beyond the base set. */
export function ensure(option: Record<string, unknown>): Promise<unknown> {
    const series = option.series === undefined ? [] : Array.isArray(option.series) ? option.series : [option.series]
    const wanted = [
        ...series.map((entry) => `series:${String((entry as { type?: unknown }).type)}`),
        ...Object.keys(option).map((key) => `component:${key}`),
    ]
    const loads = wanted.flatMap((want) => {
        const [kind, name] = want.split(':') as ['series' | 'component', string]
        const load = (kind === 'series' ? SERIES : COMPONENTS)[name]
        if (load === undefined) return []
        const known =
            loaded.get(want) ??
            load().then(() => {
                parts += 1
            })
        loaded.set(want, known)
        return [known]
    })
    return Promise.all(loads)
}
