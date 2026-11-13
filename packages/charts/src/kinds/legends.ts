import type { LegendItem } from '../ChartLegend'
import type { ChartKind } from '.'
import type { ChartSpec } from './spec'

/** What a `ChartFrame` lists for a chart of one kind, from its spec. */
export type KindLegend = (spec: ChartSpec) => LegendItem[]

type Load = () => Promise<Record<string, unknown>>

const series: Load = () => import('./legend-series')
const tree: Load = () => import('./legend-tree')

/**
 * Every kind's legend, by its name: the file its legend and the shaping it shares with the kind's
 * builder are in, and the legend's name there, or `none` for a kind that lists nothing. A legend
 * loads the first time a frame lists one of its kind, and never loads a builder.
 */
export const LEGENDS: Record<ChartKind, [Load, string] | 'none'> = {
    bar: [series, 'seriesLegend'],
    line: [series, 'seriesLegend'],
    area: [series, 'seriesLegend'],
    donut: [series, 'donutLegend'],
    pie: [series, 'donutLegend'],
    heatmap: 'none',
    scatter: [series, 'scatterLegend'],
    histogram: [() => import('./legend-histogram'), 'histogramLegend'],
    boxplot: 'none',
    waterfall: [() => import('./legend-waterfall'), 'waterfallLegend'],
    funnel: [series, 'funnelLegend'],
    bullet: [() => import('./legend-bullet'), 'bulletLegend'],
    radar: [series, 'seriesLegend'],
    rose: [series, 'roseLegend'],
    gauge: 'none',
    rings: [() => import('./legend-rings'), 'ringsLegend'],
    dual: [series, 'seriesLegend'],
    treemap: [tree, 'treeLegend'],
    sunburst: [tree, 'treeLegend'],
    sankey: [() => import('./legend-flows'), 'sankeyLegend'],
    calendar: 'none',
    parallel: [series, 'scatterLegend'],
    stream: [series, 'seriesLegend'],
    step: [series, 'seriesLegend'],
    range: [() => import('./legend-range'), 'rangeLegend'],
    fan: [() => import('./legend-fan'), 'fanLegend'],
    linked: [series, 'seriesLegend'],
}

const none: KindLegend = () => []

const loaded = new Map<ChartKind, KindLegend>()

/** A kind's legend once it has loaded, or at once for a kind that lists nothing; undefined until then. */
export function loadedLegend(kind: ChartKind): KindLegend | undefined {
    return LEGENDS[kind] === 'none' ? none : loaded.get(kind)
}

/** Fetches a kind's legend from its own file, the first time one of its kind is listed. */
export async function loadLegend(kind: ChartKind): Promise<KindLegend> {
    const known = loadedLegend(kind)
    if (known !== undefined) return known
    const [load, name] = LEGENDS[kind] as [Load, string]
    const legend = (await load())[name] as KindLegend
    loaded.set(kind, legend)
    return legend
}
