import { useMemo } from 'react'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { labelOf, numberOf, type Row } from './data'
import { dataCell, dataColumns, type DataViewColumn } from './data-columns'
import type { FrameData } from './frame-data'
import type { ChartSpec } from './kinds'

interface Numbered {
    at: number
    row: Row
}

/**
 * A column of figures as narrow as its longest figure or head, and wider where the frame has room:
 * about 0.55rem a character of the cells' type (the head's smaller type at 0.85 of that), with the
 * cell's padding. In rem, so head and rows share the track whatever their type, and as one length,
 * so the table counts it toward its least width and its pinned column holds as the rest scroll.
 */
function figureTrack(column: DataViewColumn, spec: ChartSpec): string {
    let widest = Math.ceil(column.header.length * 0.85)
    for (const row of spec.rows) widest = Math.max(widest, dataCell(column, row, spec).length)
    return `minmax(${(widest * 0.55 + 1.5).toFixed(2)}rem,1fr)`
}

export interface ChartDataTableProps {
    data: FrameData
}

/**
 * A chart's rows as a table, in the columns its spec reads; `ChartFrame` loads it when its data view
 * first opens. Its first column stays pinned while the rest scroll sideways in a narrow frame.
 */
export function ChartDataTable({ data }: ChartDataTableProps) {
    const { kind, spec, facet } = data
    const columns = useMemo<DataColumn<Numbered>[]>(
        () =>
            dataColumns(kind, spec, facet).map((column) => ({
                id: column.field,
                header: column.header,
                width: column.numeric ? figureTrack(column, spec) : 'minmax(5rem,1fr)',
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
            framed={false}
            bar={false}
            stackBelow={false}
            minWidth="auto"
            columns={columns}
            rows={rows}
            rowKey={(entry) => String(entry.at)}
            className="h-full"
        />
    )
}
