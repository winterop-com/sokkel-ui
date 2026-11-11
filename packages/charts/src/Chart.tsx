import { useMemo, useState, type Ref } from 'react'

import { EChart, type ChartHandle } from './EChart'
import { useFrameData } from './frame-data'
import type { ChartKind, ChartSpec } from './kinds'
import type { ChartLook } from './look'
import { useKinds } from './use-kinds'

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
 * built again when they change. The kinds' builders load with the first chart, beside the engine.
 */
export function Chart({ kind, label, hidden, hovered, handle, animate, className, ...spec }: ChartProps) {
    const kept = useSpec(spec)
    useFrameData(kind, kept)
    const kinds = useKinds()
    const option = useMemo(
        () => (kinds === undefined ? null : (look: ChartLook) => kinds[kind].build(kept, look, hidden)),
        [kinds, kind, kept, hidden],
    )
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
