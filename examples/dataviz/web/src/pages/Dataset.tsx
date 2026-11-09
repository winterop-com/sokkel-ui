import { type DataCellEdit, type DataColumn, type DataSort, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { type Filter, FilterBar } from '@winterop-com/sokkel-ui/FilterBar'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@winterop-com/sokkel-ui/primitives/tabs'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { ChartColumn, Copy, Download, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { datasets as datasetStore } from '../backend'
import {
    type Column,
    COLUMN_TYPES,
    type ColumnType,
    counted,
    type DataRow,
    type Dataset,
    freshId,
    now,
    type Preferences,
    type SavedChart,
} from '../model'
import { normalize } from '../parse'
import { REGION_NAMES } from '../seed'
import { filterFields, formatter, typed, type TypedRow } from '../shape'
import { viewLabel } from '../views'
import { downloadDataset, useDeleteDataset } from './Datasets'

const WIDTH: Record<ColumnType, string> = { number: '9rem', date: '9rem', text: 'minmax(9rem,1fr)', region: 'minmax(9rem,1fr)' }

/** A type as the rows' heads say it after the column's name. */
const TYPE_LABEL: Record<ColumnType, string> = { number: 'number', date: 'date', text: 'text', region: 'region' }

/** A row as the table holds it: its stored text, and its values read by type for sorting and filtering. */
interface Line {
    row: DataRow
    values: TypedRow
}

/** The editor a column's cells open, by its type; a value saved goes back as the text the dataset keeps. */
function editorOf(column: Column, save: (line: Line, text: string) => Promise<void>): DataCellEdit<Line> {
    switch (column.type) {
        case 'number':
            return {
                editor: 'number',
                value: (line) => line.values[column.id] as number | null,
                save: (line, value) => save(line, value === null ? '' : String(value)),
            }
        case 'date':
            return {
                editor: 'date',
                value: (line) => line.values[column.id] as string | null,
                save: (line, value) => save(line, value ?? ''),
            }
        case 'region':
            return {
                editor: 'select',
                options: REGION_NAMES.map((value) => ({ value })),
                value: (line) => line.row[column.id] ?? '',
                save: (line, value) => save(line, value),
            }
        default:
            return { editor: 'text', value: (line) => line.row[column.id] ?? '', save: (line, value) => save(line, value.trim()) }
    }
}

/** A dataset on its own page: its rows searched, filtered, sorted and edited in place, and its columns renamed and retyped. */
export function DatasetPage({
    dataset,
    charts,
    prefs,
}: {
    dataset: Dataset | undefined
    charts: readonly SavedChart[]
    prefs: Preferences
}) {
    const [tab, setTab] = useState('rows')
    const [filters, setFilters] = useState<readonly Filter[]>([])
    const [query, setQuery] = useState('')
    const [sort, setSort] = useState<DataSort | null>(null)
    const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
    const [dropping, setDropping] = useState<Column | null>(null)
    const remove = useDeleteDataset(charts)
    const format = useMemo(() => formatter(prefs), [prefs])

    const lines = useMemo(
        () =>
            dataset === undefined
                ? []
                : dataset.rows.map((row) => ({
                      row,
                      values: Object.fromEntries(dataset.columns.map((column) => [column.id, typed(row[column.id], column)])) as TypedRow,
                  })),
        [dataset],
    )
    const fields = useMemo(
        () =>
            dataset === undefined
                ? []
                : filterFields(
                      dataset,
                      lines.map((line) => line.values),
                  ).map((field) => ({ ...field, value: (line: Line) => field.value?.(line.values) })),
        [dataset, lines],
    )

    if (dataset === undefined)
        return (
            <Page>
                <PageState loading={false} error="There is no such dataset here. It may have been deleted.">
                    {null}
                </PageState>
            </Page>
        )

    const wanted = query.trim().toLowerCase()
    const filtered = filterRows(lines, filters, fields)
    const shown =
        wanted === ''
            ? filtered
            : filtered.filter((line) => dataset.columns.some((column) => (line.row[column.id] ?? '').toLowerCase().includes(wanted)))
    const drawn = charts.filter((chart) => chart.datasetId === dataset.id)

    const write = (rows: DataRow[], patch: Partial<Dataset> = {}) =>
        datasetStore.update(dataset.id, { ...patch, rows, updatedAt: now() }).then(() => undefined)
    const saveCell = (column: Column) => (line: Line, text: string) =>
        write(
            dataset.rows.map((row) => (row.id === line.row.id ? ({ ...row, [column.id]: normalize(text, column.type) } as DataRow) : row)),
        )
    const addRow = () => {
        const row = { id: freshId(`${dataset.id}-r`), ...Object.fromEntries(dataset.columns.map((column) => [column.id, ''])) } as DataRow
        void write([row, ...dataset.rows]).then(() => toast.success('A blank row added at the top'))
    }
    const removeRows = (ids: ReadonlySet<string>) =>
        void write(dataset.rows.filter((row) => !ids.has(row.id))).then(() => toast.success(`${counted(ids.size, 'row')} deleted`))

    const rowColumns: DataColumn<Line>[] = dataset.columns.map((column) => ({
        id: column.id,
        header: `${column.name} · ${TYPE_LABEL[column.type]}`,
        width: WIDTH[column.type],
        align: column.type === 'number' ? 'end' : 'start',
        cell: (line) => {
            const text = line.row[column.id] ?? ''
            const value = line.values[column.id]
            if (text === '') return <span className="text-muted-foreground">-</span>
            if (value === null)
                return (
                    <span className="text-critical-ink" title={`Not a ${column.type}: kept as typed`}>
                        {text}
                    </span>
                )
            return typeof value === 'number' ? <span className="tabular-nums">{format(value)}</span> : value
        },
        sortValue: (line) => line.values[column.id] ?? '',
        edit: editorOf(column, saveCell(column)),
    }))

    type ColumnLine = { column: Column; at: number }
    const setColumn = (at: number, patch: Partial<Column>) => {
        const before = dataset.columns[at]
        const after = { ...before, ...patch }
        const columns = dataset.columns.map((column, index) => (index === at ? after : column))
        const rows =
            patch.type === undefined
                ? dataset.rows
                : dataset.rows.map((row) => ({ ...row, [after.id]: normalize(row[after.id] ?? '', after.type) }) as DataRow)
        return write(rows, { columns })
    }
    const columnLines: ColumnLine[] = dataset.columns.map((column, at) => ({ column, at }))
    const stats = (column: Column) => {
        const values = lines.map((line) => line.values[column.id])
        const filled = values.filter((value) => value !== null)
        const unread = lines.filter((line) => (line.row[column.id] ?? '') !== '' && line.values[column.id] === null).length
        const numbers = filled.filter((value): value is number => typeof value === 'number')
        const days = filled.filter((value): value is string => typeof value === 'string' && column.type === 'date').sort()
        const range =
            numbers.length > 0
                ? `${format(Math.min(...numbers))} to ${format(Math.max(...numbers))}`
                : days.length > 0
                  ? `${days[0]} to ${days[days.length - 1]}`
                  : `${counted(new Set(filled).size, 'value')}`
        return { empty: values.length - filled.length - unread, unread, range }
    }
    const columnColumns: DataColumn<ColumnLine>[] = [
        {
            id: 'name',
            header: 'Column',
            width: 'minmax(10rem,1fr)',
            cell: (line) => line.column.name,
            edit: {
                editor: 'text',
                value: (line) => line.column.name,
                validate: (value, line) =>
                    value.trim() === ''
                        ? 'A column needs a name.'
                        : dataset.columns.some(
                                (column) => column.id !== line.column.id && column.name.toLowerCase() === value.trim().toLowerCase(),
                            )
                          ? 'Another column has this name.'
                          : null,
                save: (line, value) => setColumn(line.at, { name: value.trim() }),
            },
        },
        {
            id: 'type',
            header: 'Type',
            width: '8rem',
            cell: (line) => COLUMN_TYPES.find((type) => type.value === line.column.type)?.label ?? line.column.type,
            edit: {
                editor: 'select',
                options: COLUMN_TYPES.map((type) => ({ value: type.value, label: type.label })),
                value: (line) => line.column.type,
                save: (line, value) => setColumn(line.at, { type: value as ColumnType }),
            },
        },
        {
            id: 'range',
            header: 'Values',
            width: 'minmax(10rem,1.2fr)',
            cell: (line) => <span className="truncate">{stats(line.column).range}</span>,
        },
        {
            id: 'empty',
            header: 'Empty',
            width: '5rem',
            align: 'end',
            cell: (line) => <span className="tabular-nums">{stats(line.column).empty}</span>,
        },
        {
            id: 'unread',
            header: 'Unread',
            width: '5.5rem',
            align: 'end',
            cell: (line) => {
                const count = stats(line.column).unread
                return <span className={count > 0 ? 'text-critical-ink tabular-nums' : 'tabular-nums'}>{count}</span>
            },
        },
    ]
    const addColumn = () => {
        const used = new Set(dataset.columns.map((column) => column.id))
        let at = dataset.columns.length + 1
        while (used.has(`c${String(at)}`)) at += 1
        const id = `c${String(at)}`
        const names = new Set(dataset.columns.map((column) => column.name.toLowerCase()))
        let name = 'New column'
        for (let count = 2; names.has(name.toLowerCase()); count += 1) name = `New column ${String(count)}`
        void write(
            dataset.rows.map((row) => ({ ...row, [id]: '' }) as DataRow),
            { columns: [...dataset.columns, { id, name, type: 'text' }] },
        ).then(() => toast.success(`${name} added; press its name to rename it`))
    }
    const readers = dropping === null ? [] : drawn.filter((chart) => Object.values(chart.spec).includes(dropping.id))

    return (
        <Page className="h-full">
            <PageHeader
                title={
                    <InlineEdit
                        variant="title"
                        label="Name"
                        value={dataset.name}
                        validate={(value) => (value.trim() === '' ? 'A dataset needs a name.' : null)}
                        onSave={(value) => datasetStore.update(dataset.id, { name: value.trim(), updatedAt: now() }).then(() => undefined)}
                    />
                }
                count={`${counted(dataset.rows.length, 'row')}, ${counted(dataset.columns.length, 'column')}`}
                description={
                    <InlineEdit
                        label="Description"
                        editor="multiline"
                        value={dataset.description}
                        placeholder="Add a description"
                        onSave={(value) =>
                            datasetStore.update(dataset.id, { description: value.trim(), updatedAt: now() }).then(() => undefined)
                        }
                    />
                }
                actions={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="More" title="More" />}>
                                <MoreHorizontal aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => downloadDataset(dataset)}>
                                    <Download aria-hidden />
                                    Download CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        void datasetStore
                                            .create(
                                                { ...dataset, name: `${dataset.name} copy`, source: dataset.source, updatedAt: now() },
                                                freshId('ds'),
                                            )
                                            .then((made) => {
                                                toast.success(`${made.name} made`)
                                                go(`/datasets/${made.id}`)
                                            })
                                    }
                                >
                                    <Copy aria-hidden />
                                    Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => remove.ask(dataset)}>
                                    <Trash2 aria-hidden />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="sm" onClick={() => go(`/build/${dataset.id}`)}>
                            <ChartColumn aria-hidden />
                            New chart
                        </Button>
                    </>
                }
            />
            <Tabs value={tab} onValueChange={(next) => setTab(String(next))} className="min-h-0 flex-1">
                <TabsList>
                    <TabsTrigger value="rows">Rows</TabsTrigger>
                    <TabsTrigger value="columns">Columns</TabsTrigger>
                    <TabsTrigger value="charts">Charts {drawn.length > 0 ? `(${String(drawn.length)})` : ''}</TabsTrigger>
                </TabsList>
                <TabsContent value="rows" className="flex min-h-0 flex-1 flex-col">
                    <DataTable
                        className="min-h-0 flex-1"
                        columns={rowColumns}
                        rows={shown}
                        rowKey={(line) => line.row.id}
                        editing={tableEditing}
                        search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                        toolbar={
                            <Row gap="sm" wrap>
                                <FilterBar fields={fields} filters={filters} onFiltersChange={setFilters} />
                                <Button variant="outline" size="sm" onClick={addRow}>
                                    <Plus aria-hidden />
                                    Row
                                </Button>
                            </Row>
                        }
                        total={dataset.rows.length}
                        sort={sort}
                        onSortChange={setSort}
                        selectable
                        selection={selection}
                        onSelectionChange={setSelection}
                        bulkActions={(ids, clear) => (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    removeRows(ids)
                                    clear()
                                }}
                            >
                                <Trash2 aria-hidden />
                                Delete {ids.size}
                            </Button>
                        )}
                        rowActions={(line) => [
                            {
                                id: 'duplicate',
                                label: 'Duplicate row',
                                icon: <Copy aria-hidden />,
                                onSelect: () => {
                                    const at = dataset.rows.findIndex((row) => row.id === line.row.id)
                                    const next = [...dataset.rows]
                                    next.splice(at + 1, 0, { ...line.row, id: freshId(`${dataset.id}-r`) })
                                    void write(next).then(() => toast.success('Row duplicated'))
                                },
                            },
                            {
                                id: 'delete',
                                label: 'Delete row',
                                icon: <Trash2 aria-hidden />,
                                destructive: true,
                                onSelect: () => removeRows(new Set([line.row.id])),
                            },
                        ]}
                        actionButton="hover"
                        words={{ rows: (count: number) => counted(count, 'row') }}
                        minWidth="40rem"
                        empty={
                            filters.length > 0 || wanted !== ''
                                ? 'No rows match the search and filters.'
                                : 'No rows yet. Add one, or import data.'
                        }
                    />
                </TabsContent>
                <TabsContent value="columns" className="flex min-h-0 flex-1 flex-col">
                    <DataTable
                        columns={columnColumns}
                        rows={columnLines}
                        rowKey={(line) => line.column.id}
                        editing={tableEditing}
                        toolbar={
                            <Button variant="outline" size="sm" onClick={addColumn}>
                                <Plus aria-hidden />
                                Column
                            </Button>
                        }
                        rowActions={(line) => [
                            {
                                id: 'drop',
                                label: 'Delete column',
                                icon: <Trash2 aria-hidden />,
                                destructive: true,
                                onSelect: () => setDropping(line.column),
                            },
                        ]}
                        words={{ rows: (count: number) => counted(count, 'column') }}
                        minWidth="36rem"
                        foot="A name or a type changes in place; a type change rewrites the values it can read, and keeps the rest as typed."
                    />
                </TabsContent>
                <TabsContent value="charts" className="flex min-h-0 flex-1 flex-col">
                    <DataTable
                        columns={[
                            { id: 'name', header: 'Chart', width: 'minmax(12rem,1fr)', cell: (chart: SavedChart) => chart.name },
                            { id: 'view', header: 'View', width: '8rem', cell: (chart: SavedChart) => viewLabel(chart.spec.view) },
                        ]}
                        rows={drawn}
                        rowKey={(chart) => chart.id}
                        onOpen={(chart) => go(`/charts/${chart.id}`)}
                        chevron
                        variant="list"
                        minWidth="auto"
                        empty={
                            <Row gap="sm" className="p-4">
                                <span className="text-sm text-muted-foreground">No chart is drawn from this dataset yet.</span>
                                <Button size="sm" variant="outline" onClick={() => go(`/build/${dataset.id}`)}>
                                    New chart
                                </Button>
                            </Row>
                        }
                    />
                </TabsContent>
            </Tabs>
            {remove.dialog}
            <ConfirmDialog
                open={dropping !== null}
                onOpenChange={(open) => !open && setDropping(null)}
                question={`Delete the column ${dropping?.name ?? ''}?`}
                detail={
                    readers.length === 0
                        ? 'Its values go from every row. No saved chart reads it.'
                        : `Its values go from every row, and ${readers.map((chart) => chart.name).join(', ')} will need another column.`
                }
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        if (dropping === null) return
                        const gone = dropping
                        setDropping(null)
                        void write(
                            dataset.rows.map(
                                (row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== gone.id)) as DataRow,
                            ),
                            { columns: dataset.columns.filter((column) => column.id !== gone.id) },
                        ).then(() => toast.success(`${gone.name} deleted`))
                    },
                }}
            />
        </Page>
    )
}
