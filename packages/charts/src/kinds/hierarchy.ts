import { labelOf } from '../data'
import { tooltipMarkup, type ChartLook } from '../look'
import { nest, type TreeNode } from '../shapes'
import { pathOf, topOf, weightOf } from './legends'
import { written, colorOf, measureName, type ChartBuilder, type ChartSpec } from './spec'

/** A node as ECharts takes it, its style holding its fill. */
interface Drawn {
    name: string
    value: number
    itemStyle: Record<string, unknown>
    children?: Drawn[]
}

/**
 * The tree with a fill for every node: a top branch in its own color, a group `colors` names in
 * that color, and any other a shade of its branch's color, each sibling a step lighter.
 */
function painted(
    spec: ChartSpec,
    look: ChartLook,
    hidden: ReadonlySet<string> | undefined,
    style: (fill: string, leaf: boolean) => Record<string, unknown>,
): { nodes: Drawn[]; total: number } {
    const path = pathOf(spec)
    const top = topOf(spec)
    const rows = hidden === undefined || hidden.size === 0 ? spec.rows : spec.rows.filter((row) => !hidden.has(labelOf(row[path[0]])))
    const tree = nest({ rows, path, y: weightOf(spec) })
    const paint = (node: TreeNode, depth: number, hue: string, index: number, count: number): Drawn => {
        const named = spec.colors?.[node.name]
        const own = named === undefined ? hue : look.token(named)
        const fill = named !== undefined || depth === 1 ? own : look.mix(own, Math.round(92 - (36 * index) / Math.max(1, count - 1)))
        return {
            name: node.name,
            value: node.value,
            itemStyle: style(fill, node.children === undefined),
            children: node.children?.map((child, at, all) => paint(child, depth + 1, own, at, all.length)),
        }
    }
    const nodes = tree.map((node) => paint(node, 1, colorOf(spec, look, node.name, Math.max(0, top.indexOf(node.name))), 0, 1))
    return { nodes, total: tree.reduce((sum, node) => sum + node.value, 0) }
}

/** A tooltip naming the node by its path from the top, with its figure and its share of the whole. */
function treeTooltip(spec: ChartSpec, total: number) {
    return {
        trigger: 'item',
        formatter: (point: { name: string; value: number; color: string; treePathInfo?: { name: string }[] }) =>
            tooltipMarkup(
                (point.treePathInfo ?? [])
                    .slice(1)
                    .map((step) => step.name)
                    .join(' / ') || point.name,
                [
                    {
                        label: measureName(spec, weightOf(spec)),
                        value: `${written(spec, point.value)} (${total === 0 ? '0' : ((point.value / total) * 100).toFixed(1)}%)`,
                        color: point.color,
                    },
                ],
            ),
    }
}

/**
 * Nested boxes, each sized by its share: the rows grouped by the fields of `path`, outermost first,
 * each box the sum of `y` over its rows, or their count without one. A group's name heads its box
 * and its leaves carry their name and figure. Top branches take the theme's colors in `order`;
 * `colors` names one for a group at any depth, and the rest take shades of their parent's.
 */
export const treemap: ChartBuilder = (spec, look, hidden) => {
    const depth = pathOf(spec).length
    const { nodes, total } = painted(spec, look, hidden, (fill, leaf) =>
        leaf ? { color: look.mix(fill, 78), borderColor: look.card } : { color: look.mix(fill, 30), borderColor: look.mix(fill, 30) },
    )
    const header = Math.round(look.size.label * 1.8)
    const text = { color: look.foreground, fontFamily: look.font, fontSize: look.size.label }
    return {
        tooltip: treeTooltip(spec, total),
        series: [
            {
                type: 'treemap',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                roam: false,
                nodeClick: false,
                breadcrumb: { show: false },
                visibleMin: 1,
                label: {
                    ...text,
                    position: 'insideTopLeft',
                    ellipsis: '…',
                    formatter: (point: { name: string; value: number }) => `${point.name}\n{figure|${written(spec, point.value)}}`,
                    rich: {
                        figure: {
                            ...text,
                            color: look.foreground,
                            fontFamily: look.mono,
                            fontSize: look.size.small,
                            padding: [2, 0, 0, 0],
                        },
                    },
                },
                upperLabel: { show: true, height: header, ellipsis: '…', ...text },
                itemStyle: { borderWidth: 1, gapWidth: 1 },
                levels: [
                    { itemStyle: { borderWidth: 0, gapWidth: 2 }, upperLabel: { show: false } },
                    ...Array.from({ length: depth }, () => ({ itemStyle: { borderWidth: 1, gapWidth: 1 } })),
                ],
                emphasis: { focus: 'descendant', upperLabel: { show: true, height: header, ...text } },
                blur: { itemStyle: { opacity: 0.35 }, upperLabel: { opacity: 0.35 }, label: { opacity: 0.35 } },
                data: nodes,
            },
        ],
    }
}

/**
 * Rings, one per field of `path` from the middle out: the same grouping and colors as a treemap,
 * each slice its group's share of the ring. A click on a slice opens it as the middle; a click on
 * the middle goes back.
 */
export const sunburst: ChartBuilder = (spec, look, hidden) => {
    const { nodes, total } = painted(spec, look, hidden, (fill) => ({ color: fill, borderColor: look.card, borderWidth: 1.5 }))
    return {
        tooltip: treeTooltip(spec, total),
        series: [
            {
                type: 'sunburst',
                radius: ['16%', '94%'],
                sort: 'desc',
                label: {
                    color: look.foreground,
                    fontFamily: look.font,
                    fontSize: look.size.small,
                    rotate: 'tangential',
                    minAngle: 18,
                },
                itemStyle: { borderColor: look.card, borderWidth: 1.5 },
                emphasis: { focus: 'ancestor' },
                blur: { itemStyle: { opacity: 0.3 }, label: { opacity: 0.3 } },
                data: nodes,
            },
        ],
    }
}
