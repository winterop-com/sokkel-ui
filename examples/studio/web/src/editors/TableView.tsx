import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { InlineCode } from '@winterop-com/sokkel-ui/InlineCode'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { useMemo, useState } from 'react'

import { counted } from '../model'
import type { Table } from '../sql'
import { Pane } from './parts'
import { resultColumns, resultRows } from './results'

type ColumnInfo = Table['columns'][number]

const COLUMN_INFO: DataColumn<ColumnInfo>[] = [
    { id: 'name', header: 'Column', width: 'minmax(8rem,0.6fr)', cell: (column) => <InlineCode value={column.name} bare /> },
    { id: 'type', header: 'Type', width: '6rem', cell: (column) => column.type },
    { id: 'description', header: 'What it holds', width: 'minmax(12rem,1fr)', stack: 'primary', cell: (column) => column.description },
]

/** A table a query reads: its columns and what each holds, over its rows, searched. */
export function TableView({ table }: { table: Table }) {
    const [query, setQuery] = useState('')
    const names = table.columns.map((column) => column.name)
    const all = useMemo(() => resultRows(table.rows.map((row) => names.map((name) => row[name] ?? null))), [table])
    const typed = query.trim().toLowerCase()
    const rows =
        typed === ''
            ? all
            : all.filter((row) =>
                  row.values.some((value) =>
                      String(value ?? '')
                          .toLowerCase()
                          .includes(typed),
                  ),
              )
    return (
        <SplitPane
            id="studio-table"
            direction="down"
            defaultShare={0.3}
            first={
                <Pane title={table.name} meta={table.description}>
                    <DataTable
                        variant="list"
                        framed={false}
                        bar={false}
                        className="h-full min-h-0"
                        columns={COLUMN_INFO}
                        rows={table.columns}
                        rowKey={(column) => column.name}
                        minWidth="auto"
                    />
                </Pane>
            }
            second={
                <DataTable
                    className="h-full min-h-0"
                    framed={false}
                    columns={resultColumns(names, all)}
                    rows={rows}
                    rowKey={(row) => row.key}
                    search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                    defaultPageSize={100}
                    minWidth="auto"
                    words={{ rows: (count) => counted(count, 'row') }}
                    empty="No row holds that."
                />
            }
        />
    )
}
