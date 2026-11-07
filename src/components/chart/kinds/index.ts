import { boxplot } from './boxplot'
import { bullet, bulletLegend } from './bullet'
import { area, bar, donut, donutLegend, heatmap, line } from './categories'
import { dual } from './dual'
import { funnel, funnelLegend } from './funnel'
import { gauge } from './gauge'
import { histogram, histogramLegend } from './histogram'
import { scatter, scatterLegend } from './points'
import { radar } from './radar'
import { rose, roseLegend } from './rose'
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
    heatmap: { build: heatmap },
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
} satisfies Record<string, ChartKindDef>

export type ChartKind = keyof typeof KINDS

export type { ChartBuilder, ChartKindDef, ChartSpec, ChartStep, ChartWords } from './spec'
