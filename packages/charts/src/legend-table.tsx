import { DataTable, type DataTableProps } from '@winterop-com/sokkel-ui/DataTable'

import type { LegendItem } from './ChartLegend'

export type LegendTableProps = DataTableProps<LegendItem>

/** A legend's table mode: its series as the rows of a `DataTable`, which `ChartLegend` loads the first time it draws one. */
export function LegendTable(props: LegendTableProps) {
    return <DataTable {...props} />
}
