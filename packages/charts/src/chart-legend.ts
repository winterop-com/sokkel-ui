import { useEffect, useMemo, useState } from 'react'

import type { LegendItem } from './ChartLegend'
import type { ChartKind, ChartSpec } from './kinds'
import type { KindLegend } from './kinds/legends'

/**
 * The legend of a chart of one kind and spec, as `chartLegend` names it: a `ChartFrame`'s `legend`
 * or a `ChartLegend`'s `items` lists it once the kind's legend has loaded.
 */
export interface ChartLegendSource {
    readonly kind: ChartKind
    readonly spec: ChartSpec
}

/** A legend's entries as given, or the legend of a kind and spec that `chartLegend` names. */
export type LegendEntries = readonly LegendItem[] | ChartLegendSource

/**
 * The legend a `ChartFrame` shows for a chart of this spec: one entry per series in the color the
 * chart gives it, with its figures for the frame's table mode, or what the kind lists instead. It
 * names the legend and imports none: the frame loads that kind's legend, and the shaping it needs,
 * the first time it lists one, never another kind's and never a builder. Keep the spec stable
 * between renders, as for `Chart`. `chartLegendItems` gives the entries themselves.
 */
export function chartLegend(kind: ChartKind, spec: ChartSpec): ChartLegendSource {
    return { kind, spec }
}

// Each kind's legend once loaded, so a frame that lists one already here lists it at once.
const loaded = new Map<ChartKind, KindLegend>()

/** Fetches a kind's legend, and the registry that knows its file, the first time one of its kind is listed. */
async function load(kind: ChartKind): Promise<KindLegend> {
    const known = loaded.get(kind)
    if (known !== undefined) return known
    const legend = await (await import('./kinds/legends')).loadLegend(kind)
    loaded.set(kind, legend)
    return legend
}

/** The entries of a chart's legend, once the kind's legend has loaded: for a test, or an app that lists them itself. */
export async function chartLegendItems(kind: ChartKind, spec: ChartSpec): Promise<LegendItem[]> {
    return (await load(kind))(spec)
}

const isSource = (entries: LegendEntries | undefined): entries is ChartLegendSource => entries !== undefined && !Array.isArray(entries)

/**
 * A legend's entries: the ones given, or those of a kind and spec once that kind's legend has
 * loaded, undefined until then. A kind already loaded lists at once.
 */
export function useLegendEntries(entries: LegendEntries | undefined): readonly LegendItem[] | undefined {
    const source = isSource(entries) ? entries : undefined
    const kind = source?.kind
    const [, setArrived] = useState(0)
    const legend = kind === undefined ? undefined : loaded.get(kind)
    useEffect(() => {
        if (kind === undefined || loaded.has(kind)) return undefined
        let live = true
        void load(kind).then(() => {
            if (live) setArrived((count) => count + 1)
        })
        return () => {
            live = false
        }
    }, [kind])
    const spec = source?.spec
    const listed = useMemo(() => (legend === undefined || spec === undefined ? undefined : legend(spec)), [legend, spec])
    return source === undefined ? (entries as readonly LegendItem[] | undefined) : listed
}
