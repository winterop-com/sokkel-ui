import { boxplot } from './boxplot'
import { bullet, bulletLegend } from './bullet'
import { calendar } from './calendar'
import { area, bar, donut, donutLegend, heatmap, line } from './categories'
import { dual } from './dual'
import { sankey, sankeyLegend } from './flows'
import { funnel, funnelLegend } from './funnel'
import { gauge } from './gauge'
import { sunburst, treeLegend, treemap } from './hierarchy'
import { histogram, histogramLegend } from './histogram'
import { parallel } from './parallel'
import { scatter, scatterLegend } from './points'
import { radar } from './radar'
import { rose, roseLegend } from './rose'
import { range, rangeLegend, step } from './steps'
import { stream } from './stream'
import { waterfall, waterfallLegend } from './waterfall'
import type { ChartKindDef } from './spec'

/**
 * Every kind a `Chart` draws, by name. A kind lives in its own file under this folder and is added
 * here; its builder's doc comment says which of the spec's fields it reads.
 */
export const KINDS = {
    bar: { build: bar },
    line: { build: line },
    area: { build: area },
    donut: { build: donut, legend: donutLegend },
    heatmap: { build: heatmap, legend: () => [] },
    scatter: { build: scatter, legend: scatterLegend },
    histogram: { build: histogram, legend: histogramLegend },
    boxplot: { build: boxplot, legend: () => [] },
    waterfall: { build: waterfall, legend: waterfallLegend },
    funnel: { build: funnel, legend: funnelLegend },
    bullet: { build: bullet, legend: bulletLegend },
    radar: { build: radar },
    rose: { build: rose, legend: roseLegend },
    gauge: { build: gauge, legend: () => [] },
    dual: { build: dual },
    treemap: { build: treemap, legend: treeLegend },
    sunburst: { build: sunburst, legend: treeLegend },
    sankey: { build: sankey, legend: sankeyLegend },
    calendar: { build: calendar, legend: () => [] },
    parallel: { build: parallel, legend: scatterLegend },
    stream: { build: stream },
    step: { build: step },
    range: { build: range, legend: rangeLegend },
} satisfies Record<string, ChartKindDef>

export type ChartKind = keyof typeof KINDS

export type { ChartBuilder, ChartKindDef, ChartSpec, ChartStep, ChartWords } from './spec'
