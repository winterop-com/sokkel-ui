import { distinct, labelOf } from '../data'
import { SERIES_ORDER, tooltipMarkup } from '../look'
import { flows } from '../shapes'
import { written } from './categories'
import { colorOf, legendColor, type ChartBuilder, type ChartSpec } from './spec'
import type { LegendItem } from '../ChartLegend'

/** The stages a flow runs through, first to last. */
function stagesOf(spec: ChartSpec): readonly string[] {
    if (spec.path === undefined || spec.path.length < 2) throw new Error('A sankey chart needs a path of at least two fields.')
    return spec.path
}

/** The field whose sum is a link's width, or none where rows are counted. */
const weightOf = (spec: ChartSpec) => (typeof spec.y === 'string' ? spec.y : spec.y?.[0])

/**
 * Flows through stages: one column of nodes per field of `path`, first to last, and a band from a
 * row's label at one stage to its label at the next, as wide as the sum of `y` over the rows that
 * take it, or their count without one. A row with an empty field skips that stage. Nodes take the
 * color `colors` names for them, or the theme's next, and bands shade from their start's color to
 * their end's. The first stage runs in `order`, and its labels are the legend.
 */
export const sankey: ChartBuilder = (spec, look, hidden) => {
    const stages = stagesOf(spec)
    const rows = hidden === undefined || hidden.size === 0 ? spec.rows : spec.rows.filter((row) => !hidden.has(labelOf(row[stages[0]])))
    const flow = flows({ rows, path: stages, y: weightOf(spec), order: spec.order })
    const every = rows === spec.rows ? flow : flows({ rows: spec.rows, path: stages, y: weightOf(spec), order: spec.order })
    // Colors follow every row, hidden or not, so hiding a first-stage label leaves the rest as they were.
    const first = distinct(spec.rows, stages[0], spec.order).filter((name) => name !== '')
    let next = first.length
    const colors = new Map(
        every.nodes.map((node) => [
            node.id,
            spec.colors?.[node.name] !== undefined
                ? look.token(spec.colors[node.name])
                : colorOf(spec, look, node.name, node.stage === 0 ? first.indexOf(node.name) : next++),
        ]),
    )
    // A node goes by its label, which the legend highlights it by, unless another stage has the same one.
    const uses = new Map<string, number>()
    for (const node of flow.nodes) uses.set(node.name, (uses.get(node.name) ?? 0) + 1)
    const keyOf = new Map(flow.nodes.map((node) => [node.id, uses.get(node.name) === 1 ? node.name : node.id]))
    const names = new Map(flow.nodes.map((node) => [keyOf.get(node.id) ?? node.id, node.name]))
    const text = { color: look.foreground, fontFamily: look.font, fontSize: look.size.label }
    return {
        tooltip: {
            trigger: 'item',
            formatter: (point: {
                dataType: 'node' | 'edge'
                name: string
                value: number
                color: string
                data: { source?: string; target?: string }
            }) =>
                point.dataType === 'edge'
                    ? tooltipMarkup(`${names.get(point.data.source ?? '') ?? ''} → ${names.get(point.data.target ?? '') ?? ''}`, [
                          { label: weightOf(spec) ?? 'Count', value: written(spec, point.value) },
                      ])
                    : tooltipMarkup(names.get(point.name) ?? point.name, [
                          { label: weightOf(spec) ?? 'Count', value: written(spec, point.value), color: point.color },
                      ]),
        },
        series: [
            {
                type: 'sankey',
                left: 4,
                right: 4,
                top: 8,
                bottom: 8,
                nodeWidth: 10,
                nodeGap: 10,
                draggable: false,
                layoutIterations: 32,
                emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.6 } },
                blur: { itemStyle: { opacity: 0.25 }, lineStyle: { opacity: 0.06 }, label: { opacity: 0.4 } },
                label: {
                    ...text,
                    position: 'right',
                    distance: 6,
                    formatter: (point: { name: string }) => names.get(point.name) ?? point.name,
                },
                levels: [{ depth: stages.length - 1, label: { position: 'left' } }],
                lineStyle: { color: 'gradient', opacity: 0.3, curveness: 0.5 },
                itemStyle: { borderWidth: 0 },
                data: flow.nodes.map((node) => ({
                    name: keyOf.get(node.id),
                    value: node.value,
                    itemStyle: { color: colors.get(node.id) },
                })),
                links: flow.links.map((link) => ({ ...link, source: keyOf.get(link.source), target: keyOf.get(link.target) })),
            },
        ],
    }
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
