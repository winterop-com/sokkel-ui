'use client'

import { useMemo, useState, type Ref } from 'react'

import { useLocale, useWords } from '@winterop-com/sokkel-ui/lib/words'

import { EChart, type ChartHandle } from './EChart'
import { useFrameData } from './frame-data'
import type { ChartKind, ChartSpec } from './kinds'
import { CHART_PART } from './kinds/words'
import type { ChartLook } from './look'
import { readsHidden } from './kinds/load'
import { useBuilder } from './use-builder'

export type ChartProps = ChartSpec & {
    kind: ChartKind
    /** What the chart shows, for a screen reader. */
    label: string
    hidden?: ReadonlySet<string>
    hovered?: string | null
    handle?: Ref<ChartHandle | null>
    /** Whether a frame draws the chart in its expanded window, as its state says; the chart draws the same either way. */
    windowed?: boolean
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
export function Chart({ kind, label, hidden, hovered, handle, windowed: _windowed, animate, className, ...spec }: ChartProps) {
    const kept = useSpec(spec)
    useFrameData(kind, kept)
    const build = useBuilder(kind)
    const reads = readsHidden(kind) ? hidden : undefined
    const option = useMemo(() => (build === undefined ? null : (look: ChartLook) => build(kept, look, reads)), [build, kept, reads])
    return (
        <EChart option={option} label={label} hidden={hidden} hovered={hovered} handle={handle} animate={animate} className={className} />
    )
}

/** Whether a value is a list or a record written as a literal, whose entries say what it holds. */
function isPlain(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return false
    if (Array.isArray(value)) return true
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

/** Whether two values are the same, or lists or records of the same entries at any depth, such as `steps` or `fieldNames` written inline. */
function sameField(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (!isPlain(a) || !isPlain(b) || Array.isArray(a) !== Array.isArray(b)) return false
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && sameField(a[key], b[key]))
}

/**
 * Whether two specs hold the same value in every field: the rows by identity, and a field holding
 * a list or a record (`y`, `fieldNames`, `colors`, `steps`) by its entries at any depth, so one written inline does not
 * build the chart again on every draw.
 */
export function sameSpec(a: ChartSpec, b: ChartSpec): boolean {
    const keys = Object.keys(a) as (keyof ChartSpec)[]
    return (
        keys.length === Object.keys(b).length &&
        keys.every((key) => (key === 'rows' ? Object.is(a[key], b[key]) : sameField(a[key], b[key])))
    )
}

/**
 * The spec, kept as the same object while every field holds the same value, so a chart is built again
 * only when one changes; its words over the provider's, and the provider's locale where it names none.
 */
export function useSpec(given: ChartSpec): ChartSpec {
    const locale = useLocale()
    const words = useWords(CHART_PART, given.words)
    const spec = { ...given, locale: given.locale ?? locale, words }
    const [kept, setKept] = useState(spec)
    const same = sameSpec(kept, spec)
    if (!same) setKept(spec)
    return same ? kept : spec
}
