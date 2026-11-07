import { useMemo, useState, type Ref } from 'react'

import { pivot } from './data'
import { EChart, type ChartHandle } from './EChart'
import { KINDS, type ChartKind, type ChartKindDef, type ChartSpec } from './kinds'
import { legendColor } from './kinds/spec'
import type { LegendItem } from './ChartLegend'
import { SERIES_ORDER, type ChartLook } from './look'

/**
 * The value from an earlier render while every field holds the same, so an object spread afresh on
 * each render keeps one identity until a field changes.
 */
function useSteady<T extends object>(value: T): T {
    const [kept, keep] = useState(value)
    const fields = Object.entries(value)
    const same =
        fields.length === Object.keys(kept).length &&
        fields.every(([key, field]) => Object.is((kept as Record<string, unknown>)[key], field))
    if (same) return kept
    keep(value)
    return value
}

/**
 * A chart drawn from rows: `kind` names how, and the spec's fields say which columns it reads, as
 * a table's columns would be picked. The same rows can be drawn as another kind by changing
 * `kind` and the fields alone, so a view of data is a choice, not code. Inside a `ChartFrame`,
 * pass the frame's state through so its legend hides and highlights series; `chartLegend` gives
 * the frame its legend for the same spec. Keep `rows` stable between renders, as the chart is
 * built again when they change.
 */
export function Chart({
    kind,
    label,
    hidden,
    hovered,
    handle,
    animate,
    className,
    ...spec
}: ChartSpec & {
    kind: ChartKind
    /** What the chart shows, for a screen reader. */
    label: string
    hidden?: ReadonlySet<string>
    hovered?: string | null
    handle?: Ref<ChartHandle | null>
    animate?: boolean
    className?: string
}) {
    const steady = useSteady(spec)
    const option = useMemo(() => (look: ChartLook) => KINDS[kind].build(steady, look), [kind, steady])
    return (
        <EChart option={option} label={label} hidden={hidden} hovered={hovered} handle={handle} animate={animate} className={className} />
    )
}

/**
 * The legend a `ChartFrame` shows for a chart of this spec: one entry per series in the color the
 * chart gives it, with its figures for the frame's table mode, or what the kind lists instead.
 */
export function chartLegend(kind: ChartKind, spec: ChartSpec): LegendItem[] {
    const own: ChartKindDef = KINDS[kind]
    if (own.legend !== undefined) return own.legend(spec)
    if (spec.x === undefined) return []
    const data = pivot({
        rows: spec.rows,
        x: spec.x,
        y: spec.y,
        series: spec.series,
        aggregate: spec.aggregate,
        order: spec.order,
        seriesOrder: spec.seriesOrder,
    })
    return data.series.map((entry, index) => ({
        key: entry.name,
        label: entry.name,
        color: legendColor(spec, entry.name, index, SERIES_ORDER),
        values: entry.values,
    }))
}
