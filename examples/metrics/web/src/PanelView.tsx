import { BarGauge } from '@winterop-com/sokkel-ui-charts/dashboard/BarGauge'
import { BarPanel } from '@winterop-com/sokkel-ui-charts/dashboard/BarPanel'
import { GaugePanel } from '@winterop-com/sokkel-ui-charts/dashboard/GaugePanel'
import { HeatmapPanel } from '@winterop-com/sokkel-ui-charts/dashboard/HeatmapPanel'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { formatValue, thresholdColor, tokenVar, type Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import type { TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { LogView } from '@winterop-com/sokkel-ui/LogView'
import { useWindowedPane } from '@winterop-com/sokkel-ui/WindowedPane'
import { ChartArea, ChartColumn, Gauge, Grid3x3, type LucideIcon, ScrollText, SquareSigma, Table2, TextAlignStart } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'

import type { Panel, PanelKind } from './model'
import { type GroupRow, panelData } from './panel-data'
import type { Zone } from './query'
import type { Variables } from './source'

/** The icon each kind of panel goes by in the palettes. */
export const KIND_ICONS: Record<PanelKind, LucideIcon> = {
    timeseries: ChartArea,
    stat: SquareSigma,
    gauge: Gauge,
    bargauge: TextAlignStart,
    bar: ChartColumn,
    heatmap: Grid3x3,
    table: Table2,
    logs: ScrollText,
}

export interface PanelViewProps {
    panel: Panel
    vars: Variables
    range: TimeRangeValue
    /** The second the panel is drawn up to. */
    at: number
    zone: Zone
    loading?: boolean
    /** The panel's menu items. */
    menu?: ReactNode
    /** Whether the panel is open in its window, the page full screen. */
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    /** Drawn in the editor: across the whole width and taller. */
    preview?: boolean
}

/** Content of a fixed height in its panel that fills the window once the panel opens in it. */
function Sized({ size, children }: { size: string; children: (className: string) => ReactNode }) {
    const windowed = useWindowedPane()?.windowed === true
    return <>{children(windowed ? 'min-h-0 flex-1' : size)}</>
}

/** Writes a figure with its unit. */
const writer = (unit: string, decimals: number) => (value: number) => `${formatValue(value, decimals)}${unit}`

function tableColumns(unit: string, decimals: number, thresholds: readonly Threshold[]): DataColumn<GroupRow>[] {
    const write = writer(unit, decimals)
    const figure = (id: keyof Omit<GroupRow, 'name'>, header: string): DataColumn<GroupRow> => ({
        id,
        header,
        width: '6rem',
        align: 'end',
        cell: (row) => <span className="tabular-nums">{write(row[id])}</span>,
        sortValue: (row) => row[id],
    })
    return [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(8rem,1fr)',
            cell: (row) => {
                const tone = thresholdColor(row.last, thresholds)
                return (
                    <span className="flex items-center gap-2 font-mono">
                        {tone !== undefined && <Dot color={tokenVar(tone)} />}
                        {row.name}
                    </span>
                )
            },
            sortValue: (row) => row.name,
        },
        figure('last', 'Last'),
        figure('mean', 'Mean'),
        figure('max', 'Max'),
        figure('min', 'Min'),
    ]
}

/** One panel of a dashboard, read from the source for the range and variables and drawn by its kind. */
export function PanelView({
    panel,
    vars,
    range,
    at,
    zone,
    loading = false,
    menu,
    expanded,
    onExpandedChange,
    preview = false,
}: PanelViewProps) {
    const data = useMemo(() => panelData(panel, vars, range, at, zone), [panel, vars, range, at, zone])
    const span = preview ? 'full' : panel.span
    const thresholds = panel.thresholds.length > 0 ? panel.thresholds : undefined
    const window = { menu, expanded, onExpandedChange, fullscreen: true }
    const tall = preview ? 'h-80' : undefined
    switch (data.kind) {
        case 'timeseries':
            return (
                <TimeSeriesPanel
                    title={panel.title}
                    x={data.x}
                    series={data.series}
                    unit={data.unit}
                    decimals={data.decimals}
                    fill={panel.fill}
                    stacked={panel.stacked}
                    thresholds={thresholds}
                    legend={data.series.length > 3 || preview ? 'table' : 'list'}
                    legendStats={['avg', 'max', 'current']}
                    span={span}
                    bodyClassName={tall}
                    loading={loading}
                    empty={data.empty}
                    file={panel.id}
                    {...window}
                />
            )
        case 'bar':
            return (
                <BarPanel
                    title={panel.title}
                    x={data.x}
                    series={data.series}
                    unit={data.unit}
                    decimals={data.decimals}
                    stacked={panel.stacked}
                    span={span}
                    bodyClassName={tall}
                    loading={loading}
                    empty={data.empty}
                    file={panel.id}
                    {...window}
                />
            )
        case 'stat':
            return (
                <StatPanel
                    title={panel.title}
                    value={data.value}
                    unit={data.unit.trim() === '' ? undefined : data.unit.trim()}
                    decimals={data.decimals}
                    thresholds={thresholds}
                    color={panel.color}
                    colorMode={panel.colorMode}
                    sparkline={data.sparkline}
                    delta={data.delta}
                    good={data.good}
                    span={span}
                    loading={loading}
                    menu={menu}
                    className={preview ? 'min-h-56' : undefined}
                />
            )
        case 'gauge':
            return (
                <GaugePanel
                    title={panel.title}
                    value={data.value}
                    min={panel.min}
                    max={panel.max}
                    thresholds={thresholds}
                    color={panel.color}
                    unit={data.unit}
                    decimals={data.decimals}
                    label={panel.reduce === 'last' ? undefined : panel.reduce}
                    span={span}
                    bodyClassName={preview ? 'h-72' : undefined}
                    loading={loading}
                    file={panel.id}
                    {...window}
                />
            )
        case 'bargauge':
            return (
                <BarGauge
                    title={panel.title}
                    bars={data.bars}
                    min={panel.min}
                    max={panel.max}
                    thresholds={thresholds}
                    color={panel.color}
                    unit={data.unit}
                    decimals={data.decimals}
                    span={span}
                    loading={loading}
                    empty={data.empty}
                    {...window}
                />
            )
        case 'heatmap':
            return (
                <HeatmapPanel
                    title={panel.title}
                    x={data.x}
                    y={data.y}
                    cells={data.cells}
                    unit={data.unit}
                    decimals={data.decimals}
                    scale={thresholds !== undefined && thresholds.length > 1 ? thresholds.map((step) => step.color) : panel.color}
                    span={span}
                    bodyClassName={tall}
                    loading={loading}
                    empty={data.empty}
                    file={panel.id}
                    {...window}
                />
            )
        case 'table':
            return (
                <DashboardPanel title={panel.title} span={span} flush expandable loading={loading} empty={data.empty} {...window}>
                    <Sized size={preview ? 'h-80' : 'h-56'}>
                        {(className) => (
                            <DataTable
                                columns={tableColumns(data.unit, data.decimals, panel.thresholds)}
                                rows={data.rows}
                                rowKey={(row) => row.name}
                                defaultSort={{ column: 'last', direction: 'desc' }}
                                minWidth="auto"
                                stackBelow={400}
                                framed={false}
                                className={className}
                            />
                        )}
                    </Sized>
                </DashboardPanel>
            )
        case 'logs':
            return (
                <DashboardPanel title={panel.title} span={span} flush expandable loading={loading} empty={data.empty} {...window}>
                    <Sized size={preview ? 'h-80' : 'h-64'}>
                        {(className) => <LogView lines={data.lines} follow wrap framed={false} className={className} />}
                    </Sized>
                </DashboardPanel>
            )
    }
}
