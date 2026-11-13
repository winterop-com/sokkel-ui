import type { LegendItem } from '../ChartLegend'
import { distinct } from '../data'
import { SERIES_ORDER } from '../look'
import { nest } from '../shapes'
import { legendColor, weightOf, type ChartSpec } from './spec'

/** The fields a nesting kind reads, outermost first. */
export function pathOf(spec: ChartSpec): readonly string[] {
    if (spec.path === undefined || spec.path.length === 0) throw new Error('This chart needs a path of fields.')
    return spec.path
}

/** A nesting kind's top branches in the legend's order: `order` first, then as the rows give them. */
export const topOf = (spec: ChartSpec) => distinct(spec.rows, pathOf(spec)[0], spec.order).filter((name) => name !== '')

/** A nesting kind's legend: its top branches, each with its figure. */
export function treeLegend(spec: ChartSpec): LegendItem[] {
    const tree = nest({ rows: spec.rows, path: pathOf(spec).slice(0, 1), y: weightOf(spec) })
    const value = new Map(tree.map((node) => [node.name, node.value]))
    return topOf(spec).map((name, index) => ({
        key: name,
        label: name,
        color: legendColor(spec, name, index, SERIES_ORDER),
        values: [value.get(name) ?? null],
    }))
}
