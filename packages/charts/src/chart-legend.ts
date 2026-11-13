import type { LegendItem } from './ChartLegend'
import type { ChartKind, ChartSpec } from './kinds'
import { LEGENDS } from './kinds/legends'

/**
 * The legend a `ChartFrame` shows for a chart of this spec: one entry per series in the color the
 * chart gives it, with its figures for the frame's table mode, or what the kind lists instead. It
 * reads each kind's legend and the shaping it needs, never a kind's builder, so a page that lists a
 * legend carries none of the charts' option code; the builders load with the first chart.
 */
export function chartLegend(kind: ChartKind, spec: ChartSpec): LegendItem[] {
    return LEGENDS[kind](spec)
}
