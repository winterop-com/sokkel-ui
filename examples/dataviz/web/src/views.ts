import {
    ChartArea,
    ChartColumn,
    ChartLine,
    ChartPie,
    ChartScatter,
    Grid3x3,
    type LucideIcon,
    Map as MapIcon,
    SquareSigma,
    Table2,
} from 'lucide-react'

import type { ViewKind } from './model'

/** The views a chart is drawn as, in the builder's order, each with what it suits. */
export const VIEWS: readonly { value: ViewKind; label: string; description: string }[] = [
    { value: 'bar', label: 'Bar', description: 'Figures by category, side by side or stacked' },
    { value: 'line', label: 'Line', description: 'Figures over time or along an order' },
    { value: 'area', label: 'Area', description: 'Lines with the area under them filled, alone or stacked' },
    { value: 'scatter', label: 'Scatter', description: 'One number against another, a point per row' },
    { value: 'pie', label: 'Pie', description: 'Each category’s share of the whole' },
    { value: 'heatmap', label: 'Heatmap', description: 'A figure for each pair of categories, shaded' },
    { value: 'map', label: 'Map', description: 'Regions shaded by their figure' },
    { value: 'table', label: 'Table', description: 'The figures as rows and columns' },
    { value: 'stat', label: 'Figure', description: 'One figure, with its course over time' },
]

export const VIEW_ICONS: Record<ViewKind, LucideIcon> = {
    bar: ChartColumn,
    line: ChartLine,
    area: ChartArea,
    scatter: ChartScatter,
    pie: ChartPie,
    heatmap: Grid3x3,
    map: MapIcon,
    table: Table2,
    stat: SquareSigma,
}

export const viewLabel = (view: ViewKind): string => VIEWS.find((one) => one.value === view)?.label ?? view
