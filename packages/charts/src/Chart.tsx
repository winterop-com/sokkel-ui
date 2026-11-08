import { useMemo, useState, type Ref } from 'react'

import { pivot } from './data'
import { EChart, type ChartHandle } from './EChart'
import { KINDS, type ChartKind, type ChartKindDef, type ChartSpec } from './kinds'
import { legendColor } from './kinds/spec'
import type { LegendItem } from './ChartLegend'
import { SERIES_ORDER, type ChartLook } from './look'

export type ChartProps = ChartSpec & {
    kind: ChartKind
    /** What the chart shows, for a screen reader. */
    label: string
    hidden?: ReadonlySet<string>
    hovered?: string | null
    handle?: Ref<ChartHandle | null>
    animate?: boolean
    className?: string
}

/**
 * A chart drawn from rows: `kind` names how, and the spec's fields say which columns it reads, as
 * a table's columns would be picked. The same rows can be drawn as another kind by changing
 * `kind` and the fields alone, so a view of data is a choice, not code. Inside a `ChartFrame`,
 * pass the frame's state through so its legend hides and highlights series; `chartLegend` gives
 * the frame its legend for the same spec. Keep `rows` stable between renders, as the chart is
 * built again when they change.
 */
export function Chart({ kind, label, hidden, hovered, handle, animate, className, ...spec }: ChartProps) {
    const kept = useSpec(spec)
    const option = useMemo(() => (look: ChartLook) => KINDS[kind].build(kept, look, hidden), [kind, kept, hidden])
    return (
        <EChart option={option} label={label} hidden={hidden} hovered={hovered} handle={handle} animate={animate} className={className} />
    )
}

/** Whether two specs hold the same value in every field. */
function sameSpec(a: ChartSpec, b: ChartSpec): boolean {
    const keys = Object.keys(a) as (keyof ChartSpec)[]
    return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]))
}

/** The spec, kept as the same object while every field holds the same value, so a chart is built again only when one changes. */
export function useSpec(spec: ChartSpec): ChartSpec {
    const [kept, setKept] = useState(spec)
    const same = sameSpec(kept, spec)
    if (!same) setKept(spec)
    return same ? kept : spec
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
