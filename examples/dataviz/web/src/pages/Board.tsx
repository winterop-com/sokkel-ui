import { DashboardGrid, DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { type Filter, type FilterField, FilterBar } from '@winterop-com/sokkel-ui/FilterBar'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { useWindowedPane, WindowedPane } from '@winterop-com/sokkel-ui/WindowedPane'
import {
    ArrowLeft,
    ArrowRight,
    CopyPlus,
    FileSpreadsheet,
    LayoutDashboard,
    MoreHorizontal,
    PencilLine,
    Plus,
    Presentation,
    Ruler,
    Trash2,
    X,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { boards as boardStore } from '../backend'
import { ChartView } from '../ChartView'
import { AddChartDialog, BoardDialog, SPANS } from '../dialogs'
import { type Board, type BoardItem, counted, type Dataset, freshId, now, type Preferences, type SavedChart } from '../model'
import { download, fileName, toCsv } from '../parse'
import { filtersFor, shape, typedRows } from '../shape'
import { useDeleteBoard } from './Boards'

/**
 * The filters a board offers: every column of its charts' datasets, once by name, with the values a
 * name holds across all of them. A filter reaches each chart whose dataset has the column.
 */
function boardFields(datasets: readonly Dataset[]): FilterField[] {
    const fields = new Map<string, FilterField & { values: Set<string> }>()
    for (const dataset of datasets) {
        const rows = typedRows(dataset)
        for (const column of dataset.columns) {
            const key = column.name.toLowerCase()
            const held = fields.get(key) ?? {
                id: column.name,
                label: column.name,
                type: column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'set',
                values: new Set<string>(),
            }
            if (held.type === 'set')
                for (const row of rows) if (typeof row[column.id] === 'string') held.values.add(row[column.id] as string)
            fields.set(key, held)
        }
    }
    return [...fields.values()].map(({ values, ...field }) =>
        field.type !== 'set'
            ? field
            : values.size > 60
              ? { ...field, type: 'text' }
              : {
                    ...field,
                    options: [...values].sort((a, b) => a.localeCompare(b, 'en-US', { numeric: true })).map((value) => ({ value })),
                },
    )
}

interface Placed {
    item: BoardItem
    chart: SavedChart | undefined
    dataset: Dataset | undefined
}

/** The board's charts in their grid, drawn larger while the board is presented in its window. */
function BoardGrid({
    placed,
    filters,
    prefs,
    menu,
}: {
    placed: readonly Placed[]
    filters: readonly Filter[]
    prefs: Preferences
    menu: (entry: Placed, index: number) => ReactNode
}) {
    const large = useWindowedPane()?.windowed === true
    return (
        <DashboardGrid>
            {placed.map((entry, index) => {
                const { item, chart, dataset } = entry
                if (chart === undefined || dataset === undefined)
                    return (
                        <DashboardPanel key={item.id} title={chart?.name ?? 'A deleted chart'} span={item.span} menu={menu(entry, index)}>
                            <p className="text-sm text-muted-foreground">
                                {chart === undefined
                                    ? 'This chart was deleted. Remove it from the board.'
                                    : 'The dataset this chart reads was deleted.'}
                            </p>
                        </DashboardPanel>
                    )
                const own = filtersFor(dataset, filters)
                const reaching =
                    own.length === filters.length
                        ? ''
                        : ` · ${String(filters.length - own.length)} ${filters.length - own.length === 1 ? 'filter does' : 'filters do'} not apply`
                return (
                    <ChartView
                        key={item.id}
                        dataset={dataset}
                        spec={chart.spec}
                        title={chart.name}
                        subtitle={`${dataset.name}${own.length > 0 ? ' · filtered' : ''}${reaching}`}
                        prefs={prefs}
                        filters={own}
                        mode="panel"
                        span={item.span}
                        menu={menu(entry, index)}
                        file={fileName(chart.name)}
                        large={large}
                    />
                )
            })}
        </DashboardGrid>
    )
}

/** A board: its saved charts in a grid, filtered together, rearranged from each panel's menu and presented full screen. */
export function BoardPage({
    board,
    charts,
    datasets,
    prefs,
    presenting,
}: {
    board: Board | undefined
    charts: readonly SavedChart[]
    datasets: readonly Dataset[]
    prefs: Preferences
    presenting: boolean
}) {
    const [adding, setAdding] = useState(false)
    const [details, setDetails] = useState(false)
    const remove = useDeleteBoard()
    const placed: Placed[] = useMemo(
        () =>
            (board?.items ?? []).map((item) => {
                const chart = charts.find((one) => one.id === item.chartId)
                return { item, chart, dataset: chart === undefined ? undefined : datasets.find((one) => one.id === chart.datasetId) }
            }),
        [board, charts, datasets],
    )
    const used = useMemo(
        () => [
            ...new Map(
                placed.flatMap((entry) => (entry.dataset === undefined ? [] : [[entry.dataset.id, entry.dataset] as const])),
            ).values(),
        ],
        [placed],
    )
    const fields = useMemo(() => boardFields(used), [used])
    // Held here as they change and kept with the board behind them, so a quick second change never reads a stale first.
    const [filters, setOwnFilters] = useState<readonly Filter[]>(() => board?.filters ?? [])
    const setFilters = (next: readonly Filter[]) => {
        setOwnFilters(next)
        if (board !== undefined) void boardStore.update(board.id, { filters: [...next] })
    }

    useCommands(
        board === undefined
            ? []
            : [
                  {
                      title: board.name,
                      rank: 1,
                      commands: [
                          {
                              id: 'board-present',
                              label: presenting ? 'Stop presenting' : 'Present board',
                              icon: Presentation,
                              onSelect: () => go(presenting ? `/boards/${board.id}` : `/boards/${board.id}/present`),
                          },
                          { id: 'board-add', label: 'Add a chart to the board', icon: Plus, onSelect: () => setAdding(true) },
                          ...(filters.length > 0
                              ? [
                                    {
                                        id: 'board-clear',
                                        label: 'Clear the board’s filters',
                                        icon: X,
                                        onSelect: () => setFilters([]),
                                    },
                                ]
                              : []),
                      ],
                  },
              ],
        [board, presenting, filters],
    )

    if (board === undefined)
        return (
            <Page>
                <PageState loading={false} error="There is no such board here. It may have been deleted.">
                    {null}
                </PageState>
            </Page>
        )

    const save = (items: BoardItem[]) => boardStore.update(board.id, { items, updatedAt: now() })
    const move = (index: number, by: number) => {
        const items = [...board.items]
        const [moved] = items.splice(index, 1)
        items.splice(index + by, 0, moved)
        void save(items)
    }
    const csvOf = (entry: Placed) => {
        if (entry.chart === undefined || entry.dataset === undefined) return
        const shaped = shape(entry.dataset, entry.chart.spec, filtersFor(entry.dataset, filters))
        download(`${fileName(entry.chart.name)}.csv`, toCsv(shaped.table.names, shaped.table.rows), 'text/csv')
    }
    const menu = (entry: Placed, index: number) => (
        <>
            {entry.chart !== undefined && (
                <DropdownMenuItem onClick={() => go(`/charts/${entry.item.chartId}`)}>
                    <PencilLine aria-hidden />
                    Edit chart
                </DropdownMenuItem>
            )}
            {entry.chart !== undefined && entry.dataset !== undefined && (
                <DropdownMenuItem onClick={() => csvOf(entry)}>
                    <FileSpreadsheet aria-hidden />
                    Download CSV
                </DropdownMenuItem>
            )}
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <Ruler aria-hidden />
                    Width
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                        value={entry.item.span}
                        onValueChange={(span) =>
                            void save(
                                board.items.map((item) =>
                                    item.id === entry.item.id ? { ...item, span: span as BoardItem['span'] } : item,
                                ),
                            )
                        }
                    >
                        {SPANS.map((span) => (
                            <DropdownMenuRadioItem key={span.value} value={span.value}>
                                {span.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowLeft aria-hidden />
                Move earlier
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === board.items.length - 1} onClick={() => move(index, 1)}>
                <ArrowRight aria-hidden />
                Move later
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                    void save(board.items.filter((item) => item.id !== entry.item.id)).then(() =>
                        toast.success(`${entry.chart?.name ?? 'The chart'} taken off ${board.name}`, {
                            action: { label: 'Undo', onClick: () => void save(board.items) },
                        }),
                    )
                }
            >
                <Trash2 aria-hidden />
                Remove from board
            </DropdownMenuItem>
        </>
    )

    const filterBar = (
        <Row gap="sm" wrap>
            <FilterBar fields={fields} filters={filters} onFiltersChange={setFilters} />
            <span className="text-xs text-muted-foreground">
                {filters.length === 0
                    ? 'Filters here reach every chart whose dataset has the column.'
                    : `${counted(filters.length, 'filter')}, kept with the board`}
            </span>
        </Row>
    )

    return (
        <Page>
            <PageHeader
                title={
                    <InlineEdit
                        variant="title"
                        label="Name"
                        value={board.name}
                        validate={(value) => (value.trim() === '' ? 'A board needs a name.' : null)}
                        onSave={(value) => boardStore.update(board.id, { name: value.trim(), updatedAt: now() }).then(() => undefined)}
                    />
                }
                count={counted(board.items.length, 'chart')}
                description={board.description === '' ? undefined : board.description}
                actions={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="More" title="More" />}>
                                <MoreHorizontal aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => setDetails(true)}>
                                    <PencilLine aria-hidden />
                                    Edit details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        void boardStore
                                            .create(
                                                {
                                                    name: `${board.name} copy`,
                                                    description: board.description,
                                                    items: board.items.map((item) => ({ ...item, id: freshId('it') })),
                                                    filters: [...filters],
                                                    updatedAt: now(),
                                                },
                                                freshId('bd'),
                                            )
                                            .then((made) => {
                                                toast.success(`${made.name} made`)
                                                go(`/boards/${made.id}`)
                                            })
                                    }
                                >
                                    <CopyPlus aria-hidden />
                                    Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => remove.ask(board)}>
                                    <Trash2 aria-hidden />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => go(`/boards/${board.id}/present`)}
                            reason={board.items.length === 0 ? 'Add a chart first.' : undefined}
                        >
                            <Presentation aria-hidden />
                            Present
                        </Button>
                        <Button size="sm" onClick={() => setAdding(true)}>
                            <Plus aria-hidden />
                            Add chart
                        </Button>
                    </>
                }
            />
            {board.items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <LayoutDashboard aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>No charts yet</EmptyTitle>
                        <EmptyDescription>Add saved charts to arrange them here, filter them together and present them.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button size="sm" onClick={() => setAdding(true)}>
                            <Plus aria-hidden />
                            Add chart
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <WindowedPane
                    title={board.name}
                    open={presenting}
                    onOpenChange={(open) => go(open ? `/boards/${board.id}/present` : `/boards/${board.id}`)}
                    button="none"
                    fullscreen
                    words={{ close: 'Stop presenting', away: 'Presented full screen.' }}
                >
                    <Stack gap="md">
                        {filterBar}
                        <BoardGrid placed={placed} filters={filters} prefs={prefs} menu={menu} />
                    </Stack>
                </WindowedPane>
            )}
            <AddChartDialog open={adding} onOpenChange={setAdding} board={board} charts={charts} datasets={datasets} />
            <BoardDialog open={details} onOpenChange={setDetails} editing={board} />
            {remove.dialog}
        </Page>
    )
}
