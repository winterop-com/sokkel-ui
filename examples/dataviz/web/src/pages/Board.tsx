import { DashboardArrange, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { type Filter, type FilterField, FilterBar } from '@winterop-com/sokkel-ui/FilterBar'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { useWindowedPane, WindowedPane } from '@winterop-com/sokkel-ui/WindowedPane'
import { CopyPlus, FileSpreadsheet, LayoutDashboard, Pencil, MoreHorizontal, PencilLine, Plus, Presentation, Trash2, X } from 'lucide-react'
import { createElement, type ReactNode, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { boards as boardStore } from '../backend'
import { ChartView } from '../ChartView'
import { AddChartDialog, BoardDialog, SPANS } from '../dialogs'
import { type Board, type BoardItem, counted, type Dataset, freshId, now, type Preferences, type SavedChart } from '../model'
import { download, fileName, toCsv } from '../parse'
import { filtersFor, shape, typedRows } from '../shape'
import { VIEW_ICONS } from '../views'
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

/**
 * The board's charts in their grid, drawn larger while the board is presented in its window. While
 * arranging, each panel drags by its grip, takes a width from its head and comes off the board, and
 * saved charts are dragged in from the palette.
 */
function BoardGrid({
    items,
    placed,
    filters,
    prefs,
    menu,
    arranging,
    palette,
    onItemsChange,
    onAdd,
}: {
    items: readonly BoardItem[]
    placed: readonly Placed[]
    filters: readonly Filter[]
    prefs: Preferences
    menu: (entry: Placed) => ReactNode
    arranging: boolean
    palette: readonly DashboardWidget[]
    onItemsChange: (items: BoardItem[]) => void
    onAdd: (chartId: string, span: BoardItem['span'], index: number) => void
}) {
    const large = useWindowedPane()?.windowed === true
    const byId = new Map(placed.map((entry) => [entry.item.id, entry]))
    const draw = (item: BoardItem) => {
        const entry = byId.get(item.id) ?? { item, chart: undefined, dataset: undefined }
        const { chart, dataset } = entry
        if (chart === undefined || dataset === undefined)
            return (
                <DashboardPanel title={chart?.name ?? 'A deleted chart'} menu={menu(entry)}>
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
                dataset={dataset}
                spec={chart.spec}
                title={chart.name}
                subtitle={`${dataset.name}${own.length > 0 ? ' · filtered' : ''}${reaching}`}
                prefs={prefs}
                filters={own}
                mode="panel"
                menu={menu(entry)}
                file={fileName(chart.name)}
                large={large}
            />
        )
    }
    return (
        <DashboardArrange
            layout={items}
            onLayoutChange={onItemsChange}
            renderPanel={draw}
            label={(item) => byId.get(item.id)?.chart?.name ?? 'A deleted chart'}
            arranging={arranging && !large}
            palette={palette}
            onAdd={(widget, index) => onAdd(widget.id, widget.span ?? 'half', index)}
            spans={SPANS.map((span) => span.value)}
            words={{ palette: 'Saved charts', end: 'Drop a chart here to add it at the end' }}
        />
    )
}

/**
 * A board: its saved charts in a grid, filtered together and presented full screen. Arranged, its
 * panels are moved, resized and taken off by drag, and saved charts are dragged onto it.
 */
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
    // An empty board opens arranged, with the saved charts ready to drag onto it.
    const [arranging, setArranging] = useState(() => board?.items.length === 0 && charts.length > 0)
    const remove = useDeleteBoard()
    // The items as last changed here, shown until the backend answers with them, so a quick second move never reads a stale first.
    const [pending, setPending] = useState<BoardItem[] | null>(null)
    const latest = useRef<BoardItem[] | null>(null)
    const items = pending ?? board?.items ?? []
    const placed: Placed[] = useMemo(
        () =>
            items.map((item) => {
                const chart = charts.find((one) => one.id === item.chartId)
                return { item, chart, dataset: chart === undefined ? undefined : datasets.find((one) => one.id === chart.datasetId) }
            }),
        [items, charts, datasets],
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
                          {
                              id: 'board-arrange',
                              label: arranging ? 'Stop editing the board' : 'Edit the board',
                              icon: Pencil,
                              onSelect: () => setArranging(!arranging),
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
        [board, presenting, filters, arranging],
    )

    if (board === undefined)
        return (
            <Page>
                <PageState loading={false} error="There is no such board here. It may have been deleted.">
                    {null}
                </PageState>
            </Page>
        )

    const save = (next: BoardItem[]) => {
        latest.current = next
        setPending(next)
        return boardStore.update(board.id, { items: next, updatedAt: now() }).finally(() => {
            if (latest.current === next) setPending(null)
        })
    }
    const csvOf = (entry: Placed) => {
        if (entry.chart === undefined || entry.dataset === undefined) return
        const shaped = shape(entry.dataset, entry.chart.spec, filtersFor(entry.dataset, filters))
        download(`${fileName(entry.chart.name)}.csv`, toCsv(shaped.table.names, shaped.table.rows), 'text/csv')
    }
    const takeOff = (entry: Placed) => {
        const before = items
        void save(items.filter((item) => item.id !== entry.item.id)).then(() =>
            toast.success(`${entry.chart?.name ?? 'The chart'} taken off ${board.name}`, {
                action: { label: 'Undo', onClick: () => void save(before) },
            }),
        )
    }
    const menu = (entry: Placed) => (
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
            <DropdownMenuItem onClick={() => setArranging(true)} disabled={arranging}>
                <Pencil aria-hidden />
                Edit the board
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => takeOff(entry)}>
                <Trash2 aria-hidden />
                Remove from board
            </DropdownMenuItem>
        </>
    )

    // The saved charts not on the board yet, offered to drag onto it.
    const onBoard = new Set(items.map((item) => item.chartId))
    const palette: DashboardWidget[] = charts
        .filter((chart) => !onBoard.has(chart.id))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((chart) => ({
            id: chart.id,
            label: chart.name,
            icon: createElement(VIEW_ICONS[chart.spec.view], { 'aria-hidden': true }),
            span: 'half',
        }))

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
                count={counted(items.length, 'chart')}
                description={
                    arranging
                        ? 'Drag a chart onto the board, move a panel by its grip, set its width or take it off.'
                        : board.description === ''
                          ? undefined
                          : board.description
                }
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
                                                    items: items.map((item) => ({ ...item, id: freshId('it') })),
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
                            reason={items.length === 0 ? 'Add a chart first.' : undefined}
                        >
                            <Presentation aria-hidden />
                            Present
                        </Button>
                        {arranging ? (
                            <Button size="sm" onClick={() => setArranging(false)}>
                                Done
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setArranging(true)}
                                reason={items.length === 0 && charts.length === 0 ? 'Save a chart first.' : undefined}
                            >
                                <Pencil aria-hidden />
                                Edit
                            </Button>
                        )}
                        <Button size="sm" onClick={() => setAdding(true)}>
                            <Plus aria-hidden />
                            Add chart
                        </Button>
                    </>
                }
            />
            {items.length === 0 && !arranging ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <LayoutDashboard aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>No charts yet</EmptyTitle>
                        <EmptyDescription>
                            Drag saved charts onto the board to arrange them here, filter them together and present them.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button size="sm" onClick={() => (charts.length === 0 ? setAdding(true) : setArranging(true))}>
                            <Pencil aria-hidden />
                            Edit
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
                        {items.length > 0 && filterBar}
                        <BoardGrid
                            items={items}
                            placed={placed}
                            filters={filters}
                            prefs={prefs}
                            menu={menu}
                            arranging={arranging}
                            palette={palette}
                            onItemsChange={(next) => void save(next)}
                            onAdd={(chartId, span, index) => void save(insertItem(items, { id: freshId('it'), chartId, span }, index))}
                        />
                    </Stack>
                </WindowedPane>
            )}
            <AddChartDialog open={adding} onOpenChange={setAdding} board={{ ...board, items }} charts={charts} datasets={datasets} />
            <BoardDialog open={details} onOpenChange={setDetails} editing={board} />
            {remove.dialog}
        </Page>
    )
}
