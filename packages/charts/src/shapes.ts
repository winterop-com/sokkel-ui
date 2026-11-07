import { aggregateAt, distinct, labelOf, numberOf, pivot, quantile, type Aggregate, type Row } from './data'

/**
 * Rows shaped for the kinds that are not categories against series: a tree of nested groups,
 * flows between stages, the days of a calendar, and a spread of figures per category.
 */

/** A row's weight: its `y` as a number, or one where no `y` is named, so rows are counted. */
function weightOf(row: Row, y: string | undefined): number {
    if (y === undefined) return 1
    return numberOf(row[y]) ?? 0
}

/** One group in a tree: its label, the weight of every row beneath it, and the groups inside it. */
export interface TreeNode {
    name: string
    value: number
    children?: TreeNode[]
}

/**
 * The rows nested by the fields of `path`, outermost first: each node's value is the sum of `y`
 * over the rows beneath it, or their count where no `y` is named. A row whose field is empty stops
 * one level up, so its weight counts toward the parent alone. Siblings run largest first.
 */
export function nest({ rows, path, y }: { rows: readonly Row[]; path: readonly string[]; y?: string }): TreeNode[] {
    interface Building {
        name: string
        value: number
        children: Map<string, Building>
    }
    const root = new Map<string, Building>()
    for (const row of rows) {
        const weight = weightOf(row, y)
        let level = root
        for (const field of path) {
            const name = labelOf(row[field])
            if (name === '') break
            let node = level.get(name)
            if (node === undefined) {
                node = { name, value: 0, children: new Map() }
                level.set(name, node)
            }
            node.value += weight
            level = node.children
        }
    }
    const finish = (level: Map<string, Building>): TreeNode[] =>
        [...level.values()]
            .sort((a, b) => b.value - a.value)
            .map((node) =>
                node.children.size === 0 ? { name: node.name, value: node.value } : { ...node, children: finish(node.children) },
            )
    return finish(root)
}

/** A node in a flow: one label at one stage. `id` tells the same label at two stages apart. */
export interface FlowNode {
    id: string
    name: string
    stage: number
    value: number
}

/** The weight that runs from one node to the next. */
export interface FlowLink {
    source: string
    target: string
    value: number
}

/** What a flow between stages draws: its nodes, stage by stage, and the links between them. */
export interface Flow {
    nodes: FlowNode[]
    links: FlowLink[]
}

/** The id of a label at a stage. */
export const flowId = (stage: number, name: string) => `${String(stage)}:${name}`

/**
 * The rows as flows through the stages `path` names: each row runs from its label at one stage to
 * its label at the next, skipping a stage where its field is empty, and every link's value is the
 * sum of `y` over the rows that take it, or their count where no `y` is named. Nodes keep the order
 * the rows first give them within each stage, the first stage in `order` where it names them.
 */
export function flows({
    rows,
    path,
    y,
    order,
}: {
    rows: readonly Row[]
    path: readonly string[]
    y?: string
    order?: readonly string[]
}): Flow {
    const nodes = new Map<string, FlowNode>()
    const links = new Map<string, FlowLink>()
    for (const [stage, field] of path.entries()) {
        const names = stage === 0 ? distinct(rows, field, order) : distinct(rows, field)
        for (const name of names) if (name !== '') nodes.set(flowId(stage, name), { id: flowId(stage, name), name, stage, value: 0 })
    }
    for (const row of rows) {
        const weight = weightOf(row, y)
        let from: string | null = null
        for (const [stage, field] of path.entries()) {
            const name = labelOf(row[field])
            if (name === '') continue
            const id = flowId(stage, name)
            const node = nodes.get(id)
            if (node !== undefined) node.value += weight
            if (from !== null) {
                const key = `${from}\n${id}`
                const link = links.get(key) ?? { source: from, target: id, value: 0 }
                link.value += weight
                links.set(key, link)
            }
            from = id
        }
    }
    return { nodes: [...nodes.values()].filter((node) => node.value > 0), links: [...links.values()] }
}

/** A value as a day, `YYYY-MM-DD`, or null where it is not a date. */
export function dayOf(value: unknown): string | null {
    const label = labelOf(value)
    return /^\d{4}-\d{2}-\d{2}/.test(label) ? label.slice(0, 10) : null
}

/** The number of days in a month, the month counted from 1. */
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

/**
 * The first day of the first month and the last day of the last month the days fall in, so a
 * calendar shows whole months; null where no day is given.
 */
export function calendarRange(days: readonly string[]): { start: string; end: string; months: number } | null {
    const sorted = days.filter((day) => dayOf(day) !== null).sort()
    if (sorted.length === 0) return null
    const [first, last] = [sorted[0], sorted[sorted.length - 1]]
    const year = (day: string) => Number(day.slice(0, 4))
    const month = (day: string) => Number(day.slice(5, 7))
    const end = `${last.slice(0, 7)}-${String(daysIn(year(last), month(last))).padStart(2, '0')}`
    return {
        start: `${first.slice(0, 7)}-01`,
        end,
        months: (year(last) - year(first)) * 12 + month(last) - month(first) + 1,
    }
}

/**
 * Each day's figure: the rows grouped by the day in `x`, a date or a time, and each day's `y`
 * combined by `aggregate`, the sum where a `y` is named and the count where none is. Days run in
 * order; rows without a date are left out.
 */
export function byDay({
    rows,
    x,
    y,
    aggregate,
}: {
    rows: readonly Row[]
    x: string
    y?: string
    aggregate?: Aggregate
}): [string, number][] {
    const dated = rows.flatMap((row) => {
        const day = dayOf(row[x])
        return day === null ? [] : [{ ...row, [x]: day }]
    })
    const { categories, series } = pivot({ rows: dated, x, y, aggregate })
    const values = series[0]?.values ?? []
    return categories
        .map((day, index): [string, number | null] => [day, values[index]])
        .filter((entry): entry is [string, number] => entry[1] !== null)
        .sort((a, b) => a[0].localeCompare(b[0]))
}

/** One series' spread: per category, a low and a high figure and one through the middle. */
export interface Spread {
    name: string
    low: (number | null)[]
    middle: (number | null)[]
    high: (number | null)[]
}

/**
 * Each category's spread of figures, per series where `series` names a field. With one `y` field,
 * the band runs from its 10th to its 90th percentile with the median through it; with three, the
 * first bounds the band from below, the last from above and the middle runs through it, each
 * combined by `aggregate`, or its own way where `aggregate` lists one per field, the average
 * unless another is named.
 */
export function spread({
    rows,
    x,
    y,
    series,
    aggregate,
    order,
    seriesOrder,
}: {
    rows: readonly Row[]
    x: string
    y: string | readonly string[]
    series?: string
    aggregate?: Aggregate | readonly Aggregate[]
    order?: readonly string[]
    seriesOrder?: readonly string[]
}): { categories: string[]; series: Spread[] } {
    const categories = distinct(rows, x, order)
    const groups = series === undefined ? [null] : distinct(rows, series, seriesOrder)
    const fields = typeof y === 'string' ? [y] : [...y]
    if (fields.length === 3) {
        const of = (field: string, index: number) =>
            pivot({
                rows,
                x,
                y: field,
                series,
                aggregate: aggregate === undefined ? 'avg' : aggregateAt(aggregate, index),
                order: categories,
                seriesOrder,
            }).series
        const [low, middle, high] = fields.map(of)
        return {
            categories,
            series: middle.map((entry, index) => ({
                name: series === undefined ? fields[1] : entry.name,
                low: low[index].values,
                middle: entry.values,
                high: high[index].values,
            })),
        }
    }
    const field = fields[0]
    const at = new Map(categories.map((name, index) => [name, index]))
    return {
        categories,
        series: groups.map((group) => {
            const buckets: number[][] = categories.map(() => [])
            for (const row of rows) {
                if (group !== null && series !== undefined && labelOf(row[series]) !== group) continue
                const index = at.get(labelOf(row[x]))
                const value = numberOf(row[field])
                if (index !== undefined && value !== null) buckets[index].push(value)
            }
            const sorted = buckets.map((bucket) => [...bucket].sort((a, b) => a - b))
            return {
                name: group ?? field,
                low: sorted.map((bucket) => quantile(bucket, 0.1)),
                middle: sorted.map((bucket) => quantile(bucket, 0.5)),
                high: sorted.map((bucket) => quantile(bucket, 0.9)),
            }
        }),
    }
}
