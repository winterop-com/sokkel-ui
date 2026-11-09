import { Chart, type ChartProps } from '@winterop-com/sokkel-ui-charts/Chart'
import { chartLegend } from '@winterop-com/sokkel-ui-charts/chart-legend'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import type { ChartKind, ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DashboardPanel, type PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import type { Filter } from '@winterop-com/sokkel-ui/FilterBar'
import { useWindowedPane } from '@winterop-com/sokkel-ui/WindowedPane'
import type { Feature, FeatureCollection } from 'geojson'
import { type MutableRefObject, type ReactNode, type RefObject, useEffect, useMemo, useState } from 'react'

import { type Dataset, paletteOf, type Preferences, type ViewKind, type ViewSpec } from './model'
import { breaksOf, formatter, measureName, type Shaped, shape } from './shape'

/** The chart kind each charted view is drawn by. */
const KIND: Partial<Record<ViewKind, ChartKind>> = {
    bar: 'bar',
    line: 'line',
    area: 'area',
    scatter: 'scatter',
    pie: 'pie',
    heatmap: 'heatmap',
}

/** Whether a view is drawn by a chart kind, and so exports as a picture. */
export const isCharted = (view: ViewKind): boolean => KIND[view] !== undefined

/** The chart spec for a view's figures: the fields `shape` named, the order, the palette and the format. */
function chartSpec(shaped: Shaped, spec: ViewSpec, prefs: Preferences, measure: string): ChartSpec {
    const format = formatter(prefs)
    return {
        rows: shaped.rows,
        x: shaped.x,
        y: shaped.y,
        series: shaped.series,
        value: shaped.value,
        order: shaped.order,
        aggregate: shaped.aggregate,
        stack: spec.stack && shaped.series !== undefined && (spec.view === 'bar' || spec.view === 'area') ? 'stacked' : undefined,
        horizontal: spec.view === 'bar' && spec.horizontal,
        palette: paletteOf(spec.palette, prefs),
        format,
        fieldNames: shaped.y === undefined ? undefined : { [shaped.y]: measure },
        showScale: spec.view === 'heatmap',
        fit: spec.view === 'scatter',
        total: undefined,
    }
}

/** The shaped figures of a view, kept while its dataset, spec and filters stay the same. */
export function useShaped(dataset: Dataset, spec: ViewSpec, filters?: readonly Filter[]): Shaped {
    return useMemo(() => shape(dataset, spec, filters), [dataset, spec, filters])
}

/** A view's figures as a table, each figure in the settings' format. */
function FigureTable({ shaped, prefs, className }: { shaped: Shaped; prefs: Preferences; className?: string }) {
    const format = formatter(prefs)
    type Line = { key: string; cells: (string | number | null)[] }
    const lines: Line[] = shaped.table.rows.map((cells, at) => ({ key: `${String(at)}-${String(cells[0])}`, cells }))
    const columns: DataColumn<Line>[] = shaped.table.names.map((name, at) => ({
        id: `col-${String(at)}`,
        header: name,
        width: at === 0 ? 'minmax(8rem,1fr)' : 'minmax(6rem,8rem)',
        align: at === 0 ? 'start' : 'end',
        cell: (line) => {
            const value = line.cells[at]
            if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>
            return typeof value === 'number' ? <span className="tabular-nums">{format(value)}</span> : value
        },
        sortValue: (line) => line.cells[at] ?? '',
    }))
    return (
        <DataTable
            columns={columns}
            rows={lines}
            rowKey={(line) => line.key}
            minWidth="auto"
            stackBelow={360}
            framed={false}
            resizable={false}
            className={className}
        />
    )
}

/** The regions as drawn on the map, read once, the first time a map is shown. */
let regionsLoad: Promise<FeatureCollection> | undefined
function useRegions(): FeatureCollection | undefined {
    const [regions, setRegions] = useState<FeatureCollection | undefined>(undefined)
    useEffect(() => {
        let live = true
        regionsLoad ??= import('./data/regions.json').then((module) => module.default as unknown as FeatureCollection)
        void regionsLoad.then((loaded) => {
            if (live) setRegions(loaded)
        })
        return () => {
            live = false
        }
    }, [])
    return regions
}

const nameOf = (feature: Feature) => String((feature.properties as { name?: string } | null)?.name ?? feature.id ?? '')

/** The view's figures shaded on the regions they name, with a legend and the picked region's figure. */
function RegionMap({
    shaped,
    prefs,
    palette,
    measure,
}: {
    shaped: Shaped
    prefs: Preferences
    palette: readonly string[] | undefined
    measure: string
}) {
    const regions = useRegions()
    const [selected, setSelected] = useState<string | null>(null)
    const format = useMemo(() => formatter(prefs), [prefs])
    const byName = useMemo(() => new Map([...shaped.regions].map(([name, value]) => [name.toLowerCase(), value])), [shaped.regions])
    const scale = useMemo(() => {
        const values = [...byName.values()].filter((value): value is number => value !== null)
        // The breaks are round already; the legend writes them short.
        const short = formatter({ numbers: 'compact', decimals: 'auto' })
        return sequentialScale({ breaks: breaksOf(values), hue: `var(--${palette?.[0] ?? 'chart-2'})`, format: short })
    }, [byName, palette])
    const feature = regions?.features.find((one) => String(one.id) === selected)
    const figure = feature === undefined ? undefined : byName.get(nameOf(feature).toLowerCase())
    const missing = regions?.features.filter((one) => byName.get(nameOf(one).toLowerCase()) === undefined).length ?? 0
    return (
        <MapView
            label={`${measure} by region`}
            basemaps={[]}
            framed={false}
            controls={{ zoom: true }}
            selected={selected}
            onSelectedChange={(id) => setSelected(id)}
            className="h-full"
        >
            {regions !== undefined && (
                <BoundaryLayer
                    id="regions"
                    data={regions}
                    scale={scale}
                    value={(one) => byName.get(nameOf(one).toLowerCase()) ?? undefined}
                />
            )}
            <MapOverlay corner="bottom-left">
                <MapLegend title={measure} scale={scale} noData={missing > 0 ? 'No figure' : false} captions={['Less', 'More']} />
            </MapOverlay>
            {feature !== undefined && (
                <MapPopup
                    feature={feature}
                    title={nameOf(feature)}
                    description="Region"
                    rows={[{ label: measure, value: figure === undefined || figure === null ? 'No figure' : format(figure) }]}
                    onClose={() => setSelected(null)}
                />
            )}
        </MapView>
    )
}

/** Content of a fixed height in its panel that fills the window once the panel opens in it. */
function Sized({ size, children }: { size: string; children: (className: string) => ReactNode }) {
    const windowed = useWindowedPane()?.windowed === true
    return <>{children(windowed ? 'min-h-0 flex-1' : size)}</>
}

/** Hands a chart's PNG maker out of its frame, for a download button outside it. */
function KeepHandle({
    handle,
    into,
    title,
}: {
    handle: RefObject<{ png: (decor?: { title?: string; legend?: boolean }) => Promise<string> } | null>
    into: MutableRefObject<(() => Promise<string>) | null>
    title: string
}) {
    useEffect(() => {
        into.current = async () => {
            const chart = handle.current
            if (chart === null) throw new Error('The chart is not drawn yet.')
            return chart.png({ title, legend: true })
        }
        return () => {
            into.current = null
        }
    }, [handle, into, title])
    return null
}

export interface ChartViewProps {
    dataset: Dataset
    spec: ViewSpec
    title: string
    subtitle?: string
    prefs: Preferences
    /** Filters on the dataset's columns, by id. */
    filters?: readonly Filter[]
    /** `panel` sits in a board's grid at `span`; `page` fills the builder's or a shared link's pane. */
    mode: 'panel' | 'page'
    span?: PanelSpan
    /** The panel's menu items. */
    menu?: ReactNode
    /** Filled with a maker of the chart's PNG while a charted view is drawn, in page mode. */
    exportRef?: MutableRefObject<(() => Promise<string>) | null>
    /** The export's file name, without an extension. */
    file?: string
    /** The body's size in page mode. */
    size?: string
    /** Drawn larger, as a board presented full screen. */
    large?: boolean
}

/** A saved or drafted chart drawn as its view: a chart kind in its frame, the map, the figures as a table, or one figure. */
export function ChartView({
    dataset,
    spec,
    title,
    subtitle,
    prefs,
    filters,
    mode,
    span = 'half',
    menu,
    exportRef,
    file,
    size = 'h-80',
    large = false,
}: ChartViewProps) {
    const shaped = useShaped(dataset, spec, filters)
    const measure = measureName(dataset, spec)
    const palette = paletteOf(spec.palette, prefs)
    const empty = shaped.problem !== undefined || shaped.empty
    const emptyWords = shaped.problem ?? (shaped.read === 0 ? 'No rows match the filters.' : 'Nothing to draw from these rows.')
    const panelSpan = mode === 'page' ? 'full' : span
    const height = mode === 'page' ? size : large ? 'h-96' : 'h-64'
    const kind = KIND[spec.view]
    const chart = useMemo(() => chartSpec(shaped, spec, prefs, measure), [shaped, spec, prefs, measure])

    if (kind !== undefined) {
        const label = `${title}: ${measure}`
        if (mode === 'panel')
            return (
                <ChartPanel
                    kind={kind}
                    label={label}
                    title={title}
                    subtitle={subtitle}
                    menu={menu}
                    span={panelSpan}
                    bodyClassName={height}
                    empty={empty}
                    file={file}
                    fullscreen
                    frameWords={{ empty: emptyWords }}
                    {...chart}
                />
            )
        return (
            <ChartFrame
                title={title}
                subtitle={subtitle}
                menu={menu}
                legend={empty ? undefined : chartLegend(kind, chart)}
                legendFormat={chart.format}
                file={file}
                empty={empty}
                bodyClassName={height}
                words={{ empty: emptyWords }}
            >
                {(state) => (
                    <>
                        <Chart kind={kind} label={label} {...(chart as Omit<ChartProps, 'kind' | 'label'>)} {...state} />
                        {exportRef !== undefined && <KeepHandle handle={state.handle} into={exportRef} title={title} />}
                    </>
                )}
            </ChartFrame>
        )
    }

    if (spec.view === 'stat')
        return (
            <StatPanel
                title={title}
                value={shaped.problem === undefined ? shaped.stat.value : null}
                format={formatter(prefs)}
                sparkline={shaped.stat.sparkline}
                delta={shaped.stat.delta}
                color={palette?.[0] ?? 'chart-2'}
                note={subtitle === undefined ? measure : `${measure} · ${subtitle}`}
                menu={menu}
                span={panelSpan}
                className={mode === 'page' ? 'min-h-56' : undefined}
            />
        )

    return (
        <DashboardPanel
            title={title}
            subtitle={subtitle}
            menu={menu}
            span={panelSpan}
            flush
            expandable
            fullscreen
            empty={empty}
            words={{ empty: emptyWords }}
        >
            <Sized size={height}>
                {(className) =>
                    spec.view === 'map' ? (
                        <div className={className}>
                            <RegionMap shaped={shaped} prefs={prefs} palette={palette} measure={measure} />
                        </div>
                    ) : (
                        <FigureTable shaped={shaped} prefs={prefs} className={className} />
                    )
                }
            </Sized>
        </DashboardPanel>
    )
}

/** A small chart of a view, for a card: its kind's chart alone, or nothing for a view no kind draws. */
export function ChartThumb({ dataset, spec, prefs, label }: { dataset: Dataset; spec: ViewSpec; prefs: Preferences; label: string }) {
    const shaped = useShaped(dataset, spec)
    const measure = measureName(dataset, spec)
    const chart = useMemo(() => chartSpec(shaped, spec, prefs, measure), [shaped, spec, prefs, measure])
    const kind = KIND[spec.view]
    if (kind === undefined || shaped.problem !== undefined || shaped.empty) return null
    return <Chart kind={kind} label={label} {...(chart as Omit<ChartProps, 'kind' | 'label'>)} />
}
