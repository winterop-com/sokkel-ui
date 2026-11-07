import { useMemo, type ComponentProps } from 'react'
import type { EChartsCoreOption } from 'echarts/core'

import { Columns, Stack } from '../Layout'
import { useSpec } from './Chart'
import { distinct, labelOf } from './data'
import { EChart } from './EChart'
import { KINDS, type ChartKind, type ChartSpec } from './kinds'
import { SERIES_ORDER, type ChartLook } from './look'
import { shareScales } from './scales'

/**
 * Small multiples: the same chart once per label of `facet`, each drawn from that label's rows,
 * headed by the label and laid out in `Columns`. The charts share one scale, so a bar of the same
 * height is the same figure in each, and one set of colors and orders, so a series keeps its color
 * and a category its place in every chart and one legend serves them all. Inside a `ChartFrame`
 * with `fit`, pass the frame's state through and give the frame `chartLegend` for the same spec.
 * Keep `rows` stable between renders, as the charts are built again when they change.
 */
export function ChartGrid({
    kind,
    label,
    facet,
    facetOrder,
    columns = 3,
    narrowest = 'md',
    hidden,
    hovered,
    chartClassName = 'h-40',
    className,
    ...spec
}: ChartSpec & {
    kind: ChartKind
    /** What the charts show, for a screen reader; each chart adds its label. */
    label: string
    /** The field whose labels each get a chart. */
    facet: string
    /** The facet's labels in this order first. */
    facetOrder?: readonly string[]
    /** The most charts side by side. */
    columns?: ComponentProps<typeof Columns>['count']
    /** The narrowest a chart may get before the grid drops a column. */
    narrowest?: ComponentProps<typeof Columns>['min']
    hidden?: ReadonlySet<string>
    hovered?: string | null
    /** Each chart's size. */
    chartClassName?: string
    className?: string
}) {
    const kept = useSpec(spec)
    const panels = useMemo(() => {
        const field = kept.series ?? kept.path?.[0] ?? kept.x
        const named = field === undefined ? [] : distinct(kept.rows, field, field === kept.series ? kept.seriesOrder : kept.order)
        const colors = {
            ...Object.fromEntries(named.map((name, index) => [name, SERIES_ORDER[index % SERIES_ORDER.length]])),
            ...kept.colors,
        }
        const order = kept.x === undefined ? kept.order : distinct(kept.rows, kept.x, kept.order)
        const seriesOrder = kept.series === undefined ? kept.seriesOrder : distinct(kept.rows, kept.series, kept.seriesOrder)
        return distinct(kept.rows, facet, facetOrder)
            .filter((name) => name !== '')
            .map((name) => ({
                name,
                spec: { ...kept, rows: kept.rows.filter((row) => labelOf(row[facet]) === name), colors, order, seriesOrder },
            }))
    }, [kept, facet, facetOrder])
    const options = useMemo(() => {
        let built: { key: string; options: EChartsCoreOption[] } | null = null
        const all = (look: ChartLook) => {
            if (built?.key !== look.key)
                built = { key: look.key, options: shareScales(panels.map((panel) => KINDS[kind].build(panel.spec, look, hidden))) }
            return built.options
        }
        return panels.map((_, index) => (look: ChartLook) => all(look)[index])
    }, [kind, panels, hidden])
    return (
        <Columns count={columns} min={narrowest} gap="md" className={className}>
            {panels.map((panel, index) => (
                <Stack key={panel.name} gap="2xs">
                    <h4 className="truncate text-xs text-muted-foreground">{panel.name}</h4>
                    <div className={chartClassName}>
                        <EChart option={options[index]} label={`${label}: ${panel.name}`} hidden={hidden} hovered={hovered} />
                    </div>
                </Stack>
            ))}
        </Columns>
    )
}
