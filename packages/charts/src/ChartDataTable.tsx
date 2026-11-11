import { useMemo } from 'react'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { labelOf, numberOf, type Row } from './data'
import { dataCell, dataColumns } from './data-columns'
import type { FrameData } from './frame-data'

interface Numbered {
    at: number
    row: Row
}

export interface ChartDataTableProps {
    data: FrameData
}

/** A chart's rows as a table, in the columns its spec reads; `ChartFrame` loads it when its data view first opens. */
export function ChartDataTable({ data }: ChartDataTableProps) {
    const { kind, spec, facet } = data
    const columns = useMemo<DataColumn<Numbered>[]>(
        () =>
            dataColumns(kind, spec, facet).map((column) => ({
                id: column.field,
                header: column.header,
                width: 'minmax(5rem,1fr)',
                align: column.numeric ? 'end' : 'start',
                cell: ({ row }) => dataCell(column, row, spec),
                sortValue: ({ row }) =>
                    column.numeric ? (numberOf(row[column.field]) ?? Number.NEGATIVE_INFINITY) : labelOf(row[column.field]),
            })),
        [kind, spec, facet],
    )
    const rows = useMemo(() => spec.rows.map((row, at) => ({ at, row })), [spec.rows])
    return (
        <DataTable
            variant="list"
            framed={false}
            stackBelow={false}
            minWidth="auto"
            columns={columns}
            rows={rows}
            rowKey={(entry) => String(entry.at)}
            className="h-full"
        />
    )
}
