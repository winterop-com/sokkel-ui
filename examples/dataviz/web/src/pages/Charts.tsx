import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { ChevronDown, Copy, Database, PencilLine, Plus, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { boards as boardStore, charts as chartStore } from '../backend'
import { ChartThumb, isCharted } from '../ChartView'
import { ShareDialog } from '../dialogs'
import { type Board, counted, type Dataset, freshId, now, type Preferences, type SavedChart } from '../model'
import { VIEW_ICONS, viewLabel } from '../views'

/** Every saved chart, as cards with the chart drawn small or as a table; one opens in the builder. */
export function ChartsPage({
    charts,
    datasets,
    boards,
    prefs,
    loading,
}: {
    charts: readonly SavedChart[]
    datasets: readonly Dataset[]
    boards: readonly Board[]
    prefs: Preferences
    loading: boolean
}) {
    const [query, setQuery] = useState('')
    const [view, setView] = useState<'table' | 'grid'>('grid')
    const [deleting, setDeleting] = useState<SavedChart | null>(null)
    const [sharing, setSharing] = useState<SavedChart | null>(null)
    const datasetOf = (chart: SavedChart) => datasets.find((one) => one.id === chart.datasetId)
    const wanted = query.trim().toLowerCase()
    const shown =
        wanted === ''
            ? charts
            : charts.filter((chart) => `${chart.name} ${datasetOf(chart)?.name ?? ''} ${chart.spec.view}`.toLowerCase().includes(wanted))
    const onBoards = (chart: SavedChart) => boards.filter((board) => board.items.some((item) => item.chartId === chart.id))

    const duplicate = (chart: SavedChart) =>
        void chartStore
            .create({ name: `${chart.name} copy`, datasetId: chart.datasetId, spec: chart.spec, updatedAt: now() }, freshId('ch'))
            .then((made) => {
                toast.success(`${made.name} made`)
            })
    const actions = (chart: SavedChart) => [
        { id: 'open', label: 'Edit', icon: <PencilLine aria-hidden />, onSelect: () => go(`/charts/${chart.id}`) },
        { id: 'share', label: 'Share', icon: <Share2 aria-hidden />, onSelect: () => setSharing(chart) },
        { id: 'duplicate', label: 'Duplicate', icon: <Copy aria-hidden />, onSelect: () => duplicate(chart) },
        {
            id: 'dataset',
            label: 'Open its dataset',
            icon: <Database aria-hidden />,
            disabled: datasetOf(chart) === undefined,
            onSelect: () => go(`/datasets/${chart.datasetId}`),
        },
        { id: 'sep', separator: true as const },
        { id: 'delete', label: 'Delete', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => setDeleting(chart) },
    ]

    const columns: DataColumn<SavedChart>[] = [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(14rem,2fr)',
            cell: (chart) => {
                const Icon = VIEW_ICONS[chart.spec.view]
                return (
                    <Row gap="sm" className="min-w-0">
                        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{chart.name}</span>
                    </Row>
                )
            },
            sortValue: (chart) => chart.name.toLowerCase(),
        },
        {
            id: 'view',
            header: 'View',
            width: '7rem',
            cell: (chart) => viewLabel(chart.spec.view),
            sortValue: (chart) => chart.spec.view,
            stack: 'secondary',
        },
        {
            id: 'dataset',
            header: 'Dataset',
            width: 'minmax(10rem,1fr)',
            cell: (chart) => datasetOf(chart)?.name ?? 'Deleted',
            sortValue: (chart) => datasetOf(chart)?.name ?? '',
            stack: 'secondary',
        },
        {
            id: 'boards',
            header: 'Boards',
            width: 'minmax(8rem,1fr)',
            cell: (chart) =>
                onBoards(chart)
                    .map((board) => board.name)
                    .join(', ') || '-',
        },
        {
            id: 'updated',
            header: 'Saved',
            width: '8rem',
            cell: (chart) => <RelativeTime date={chart.updatedAt} />,
            sortValue: (chart) => chart.updatedAt,
            stack: 'secondary',
        },
    ]

    const sharedDataset = sharing === null ? undefined : datasetOf(sharing)
    return (
        <Page className="h-full">
            <PageHeader
                title="Charts"
                count={counted(charts.length, 'chart')}
                description="Charts saved from the datasets. Open one to change it, share it as a link, or place it on a board."
                actions={
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="sm" disabled={datasets.length === 0} />}>
                            <Plus aria-hidden />
                            New
                            <ChevronDown aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>From the dataset</DropdownMenuLabel>
                                {datasets.map((one) => (
                                    <DropdownMenuItem key={one.id} onClick={() => go(`/build/${one.id}`)}>
                                        <Database aria-hidden />
                                        {one.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns}
                rows={shown}
                rowKey={(chart) => chart.id}
                loading={loading}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                defaultSort={{ column: 'updated', direction: 'desc' }}
                view={view}
                onViewChange={setView}
                cardWidth="16rem"
                cardHeight="15.5rem"
                card={(chart) => {
                    const dataset = datasetOf(chart)
                    const Icon = VIEW_ICONS[chart.spec.view]
                    return (
                        <ItemCard
                            title={chart.name}
                            titleLines={1}
                            description={dataset?.name ?? 'Its dataset was deleted'}
                            icon={<Icon aria-hidden />}
                            href={`#/charts/${chart.id}`}
                            media={
                                <div className="h-32 px-2 pt-2">
                                    {dataset !== undefined && isCharted(chart.spec.view) ? (
                                        <ChartThumb dataset={dataset} spec={chart.spec} prefs={prefs} label={chart.name} />
                                    ) : (
                                        <Row justify="center" className="h-full text-muted-foreground">
                                            <Icon aria-hidden className="size-10" />
                                        </Row>
                                    )}
                                </div>
                            }
                        />
                    )
                }}
                onOpen={(chart) => go(`/charts/${chart.id}`)}
                rowActions={actions}
                words={{ rows: (count: number) => counted(count, 'chart') }}
                minWidth="44rem"
                empty="No saved charts. Open a dataset and make one."
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                question={`Delete ${deleting?.name ?? 'the chart'}?`}
                detail={
                    deleting !== null && onBoards(deleting).length > 0
                        ? `It leaves ${onBoards(deleting)
                              .map((board) => board.name)
                              .join(', ')} too. Its dataset stays.`
                        : 'Its dataset stays.'
                }
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        if (deleting === null) return
                        const gone = deleting
                        setDeleting(null)
                        void Promise.all([
                            chartStore.remove(gone.id),
                            ...onBoards(gone).map((board) =>
                                boardStore.update(board.id, {
                                    items: board.items.filter((item) => item.chartId !== gone.id),
                                    updatedAt: now(),
                                }),
                            ),
                        ]).then(() => toast.success(`${gone.name} deleted`))
                    },
                }}
            />
            {sharing !== null && sharedDataset !== undefined && (
                <ShareDialog
                    open
                    onOpenChange={(open) => !open && setSharing(null)}
                    name={sharing.name}
                    spec={sharing.spec}
                    dataset={sharedDataset}
                />
            )}
        </Page>
    )
}
