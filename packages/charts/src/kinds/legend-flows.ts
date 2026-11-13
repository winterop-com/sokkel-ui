import type { LegendItem } from '../ChartLegend'
import { distinct } from '../data'
import { SERIES_ORDER } from '../look'
import { flows } from '../shapes'
import { legendColor, weightOf, type ChartSpec } from './spec'

/** The stages a sankey flows through, first to last. */
export function stagesOf(spec: ChartSpec): readonly string[] {
    if (spec.path === undefined || spec.path.length < 2) throw new Error('A sankey chart needs a path of at least two fields.')
    return spec.path
}

/** A sankey's legend: the labels of its first stage, each with its figure. */
export function sankeyLegend(spec: ChartSpec): LegendItem[] {
    const stages = stagesOf(spec)
    const flow = flows({ rows: spec.rows, path: stages.slice(0, 1), y: weightOf(spec) })
    const value = new Map(flow.nodes.map((node) => [node.name, node.value]))
    return distinct(spec.rows, stages[0], spec.order)
        .filter((name) => name !== '')
        .map((name, index) => ({
            key: name,
            label: name,
            color: legendColor(spec, name, index, SERIES_ORDER),
            values: [value.get(name) ?? null],
        }))
}
