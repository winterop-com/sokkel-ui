import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { ChartColumn, Download, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { charts as chartStore, datasets as datasetStore } from '../backend'
import { counted, type Dataset, type SavedChart } from '../model'
import { download, fileName, toCsv } from '../parse'

const SOURCE: Record<Dataset['source'], string> = { seed: 'Demo data', file: 'File', paste: 'Pasted', link: 'From a link' }

/** A dataset's rows as CSV, each column under its name. */
export function datasetCsv(dataset: Dataset): string {
    return toCsv(
        dataset.columns.map((column) => column.name),
        dataset.rows.map((row) => dataset.columns.map((column) => row[column.id] ?? '')),
    )
}

export const downloadDataset = (dataset: Dataset) => download(`${fileName(dataset.name)}.csv`, datasetCsv(dataset), 'text/csv')

/** Deletes a dataset and the charts drawn from it, after asking. */
export function useDeleteDataset(charts: readonly SavedChart[]) {
    const [deleting, setDeleting] = useState<Dataset | null>(null)
    const drawn = deleting === null ? [] : charts.filter((chart) => chart.datasetId === deleting.id)
    const dialog = (
        <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            question={`Delete ${deleting?.name ?? 'the dataset'}?`}
            detail={
                drawn.length === 0
                    ? 'Its rows go for good. No saved chart is drawn from it.'
                    : `Its rows go for good, and so ${drawn.length === 1 ? 'does the chart' : `do the ${String(drawn.length)} charts`} drawn from it: ${drawn.map((chart) => chart.name).join(', ')}.`
            }
            confirm={{
                label: 'Delete',
                destructive: true,
                onConfirm: () => {
                    if (deleting === null) return
                    const gone = deleting
                    setDeleting(null)
                    void Promise.all([datasetStore.remove(gone.id), ...drawn.map((chart) => chartStore.remove(chart.id))]).then(() => {
                        toast.success(`${gone.name} deleted`)
                        go('/datasets')
                    })
                },
            }}
        />
    )
    return { ask: setDeleting, dialog }
}

/** Every dataset: its size, its source and when it changed, searched; one opens on its own page. */
export function DatasetsPage({
    datasets,
    charts,
    loading,
    onImport,
}: {
    datasets: readonly Dataset[]
    charts: readonly SavedChart[]
    loading: boolean
    onImport: () => void
}) {
    const [query, setQuery] = useState('')
    const remove = useDeleteDataset(charts)
    const wanted = query.trim().toLowerCase()
    const shown =
        wanted === ''
            ? datasets
            : datasets.filter((one) =>
                  `${one.name} ${one.description} ${one.columns.map((column) => column.name).join(' ')}`.toLowerCase().includes(wanted),
              )
    const columns: DataColumn<Dataset>[] = [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(14rem,2fr)',
            cell: (one) => one.name,
            sortValue: (one) => one.name.toLowerCase(),
            stack: 'primary',
        },
        {
            id: 'columns',
            header: 'Columns',
            width: 'minmax(12rem,2fr)',
            cell: (one) => <span className="truncate text-muted-foreground">{one.columns.map((column) => column.name).join(', ')}</span>,
        },
        {
            id: 'rows',
            header: 'Rows',
            width: '6rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{one.rows.length.toLocaleString('en-US')}</span>,
            sortValue: (one) => one.rows.length,
            stack: 'secondary',
        },
        {
            id: 'charts',
            header: 'Charts',
            width: '6rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{charts.filter((chart) => chart.datasetId === one.id).length}</span>,
            sortValue: (one) => charts.filter((chart) => chart.datasetId === one.id).length,
            stack: 'secondary',
        },
        {
            id: 'source',
            header: 'Source',
            width: '8rem',
            cell: (one) => SOURCE[one.source],
            sortValue: (one) => one.source,
            stack: 'secondary',
        },
        {
            id: 'updated',
            header: 'Changed',
            width: '8rem',
            cell: (one) => <RelativeTime date={one.updatedAt} />,
            sortValue: (one) => one.updatedAt,
            stack: 'secondary',
        },
    ]
    return (
        <Page className="h-full">
            <PageHeader
                title="Datasets"
                count={counted(datasets.length, 'dataset')}
                description="Tables of data to chart. Import a file or paste rows; every dataset is kept in this browser."
                actions={
                    <Button size="sm" onClick={onImport}>
                        <Upload aria-hidden />
                        Import
                    </Button>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns}
                rows={shown}
                rowKey={(one) => one.id}
                loading={loading}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                defaultSort={{ column: 'name', direction: 'asc' }}
                onOpen={(one) => go(`/datasets/${one.id}`)}
                chevron
                rowActions={(one) => [
                    {
                        id: 'chart',
                        label: 'New chart',
                        icon: <ChartColumn aria-hidden />,
                        inline: true,
                        onSelect: () => go(`/build/${one.id}`),
                    },
                    { id: 'csv', label: 'Download CSV', icon: <Download aria-hidden />, onSelect: () => downloadDataset(one) },
                    { id: 'sep', separator: true },
                    { id: 'delete', label: 'Delete', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => remove.ask(one) },
                ]}
                words={{ rows: (count: number) => counted(count, 'dataset') }}
                minWidth="48rem"
                empty="No datasets. Import a file or paste rows to start."
            />
            {remove.dialog}
        </Page>
    )
}
