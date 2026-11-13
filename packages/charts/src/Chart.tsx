import { useMemo, useState, type Ref } from 'react'

import { EChart, type ChartHandle } from './EChart'
import { useFrameData } from './frame-data'
import type { ChartKind, ChartSpec } from './kinds'
import type { ChartLook } from './look'
import { useBuilder } from './use-builder'

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
 * built again when they change. A kind's builder loads with the first chart of that kind, beside the engine.
 */
export function Chart({ kind, label, hidden, hovered, handle, animate, className, ...spec }: ChartProps) {
    const kept = useSpec(spec)
    useFrameData(kind, kept)
    const build = useBuilder(kind)
    const option = useMemo(() => (build === undefined ? null : (look: ChartLook) => build(kept, look, hidden)), [build, kept, hidden])
    return (
        <EChart option={option} label={label} hidden={hidden} hovered={hovered} handle={handle} animate={animate} className={className} />
    )
}

/** Whether two values are the same, or a list or a record of the same entries, such as a `fieldNames` written inline. */
function sameField(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false
    const one = a as Record<string, unknown>
    const other = b as Record<string, unknown>
    const keys = Object.keys(one)
    return keys.length === Object.keys(other).length && keys.every((key) => Object.is(one[key], other[key]))
}

/**
 * Whether two specs hold the same value in every field: the rows by identity, and a field holding
 * a list or a record (`y`, `fieldNames`, `colors`) by its entries, so one written inline does not
 * build the chart again on every draw.
 */
export function sameSpec(a: ChartSpec, b: ChartSpec): boolean {
    const keys = Object.keys(a) as (keyof ChartSpec)[]
    return (
        keys.length === Object.keys(b).length &&
        keys.every((key) => (key === 'rows' ? Object.is(a[key], b[key]) : sameField(a[key], b[key])))
    )
}

/** The spec, kept as the same object while every field holds the same value, so a chart is built again only when one changes. */
export function useSpec(spec: ChartSpec): ChartSpec {
    const [kept, setKept] = useState(spec)
    const same = sameSpec(kept, spec)
    if (!same) setKept(spec)
    return same ? kept : spec
}
