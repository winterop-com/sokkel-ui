import { area, bar, donut, donutLegend, heatmap, line } from './categories'
import { scatter, scatterLegend } from './points'
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
} satisfies Record<string, ChartKindDef>

export type ChartKind = keyof typeof KINDS

export type { ChartBuilder, ChartKindDef, ChartSpec } from './spec'
