import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyIcon, EllipsisVerticalIcon, ExternalLinkIcon, MenuIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { type DataAction, type DataColumn, DataTable, type DataSort, sortRows } from '../../components/DataTable'
import { SearchField } from '../../components/SearchField'
import { StatusChip } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'
import { makeRuns, makeRunTree, startedAt, type TableRun, took, type TreeRow } from '../fixtures/tableRuns'

/**
 * A table for many rows. Only the rows in view are drawn, so the 10k and 50k tables scroll like
 * the 100. Each column head sorts; the boxes select, Shift picks a range, and the bar above then
 * offers what to do with the selection. The menu at a row's end, or a right-click on the row,
 * offers what to do with that row. The column menu at the bar's end hides columns; the first stays
 * put while the rest scroll sideways. A tree's rows open to their children, and choosing a project
 * chooses every run in it.
 */
const meta: Meta = { title: 'Patterns/Data table' }
export default meta

const COLUMNS: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span>, sortValue: (run) => run.id },
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(10rem,1fr)',
        cell: (run) => <span className="font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'project', header: 'Project', width: '7rem', cell: (run) => run.project, sortValue: (run) => run.project },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    { id: 'step', header: 'Step', width: '6.5rem', cell: (run) => run.step, sortValue: (run) => run.step },
    {
        id: 'by',
        header: 'Started by',
        width: '7rem',
        cell: (run) => <span className="text-muted-foreground">{run.by}</span>,
        sortValue: (run) => run.by,
    },
    { id: 'started', header: 'Started', width: '8rem', cell: (run) => startedAt(run.ago), sortValue: (run) => -run.ago },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (run) => took(run.duration),
        sortValue: (run) => run.duration,
    },
    {
        id: 'records',
        header: 'Records',
        width: '6.5rem',
        align: 'end',
        cell: (run) => run.records.toLocaleString('en-US'),
        sortValue: (run) => run.records,
    },
    { id: 'attempts', header: 'Attempts', width: '5.5rem', align: 'end', cell: (run) => run.attempts, sortValue: (run) => run.attempts },
]

const runActions = (run: TableRun): DataAction[] => [
    { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => undefined },
    {
        id: 'retry',
        label: 'Retry',
        icon: <RotateCcwIcon />,
        disabled: run.state === 'running' || run.state === 'queued',
        onSelect: () => undefined,
    },
    { id: 'copy', label: 'Copy run ID', icon: <CopyIcon />, onSelect: () => undefined },
    { id: 'line', separator: true },
    {
        id: 'cancel',
        label: 'Cancel run',
        icon: <XIcon />,
        destructive: true,
        disabled: run.state !== 'running' && run.state !== 'queued',
        onSelect: () => undefined,
    },
]

const bulk = (_: ReadonlySet<string>, clear: () => void) => (
    <>
        <Button variant="outline" size="xs" onClick={clear}>
            <RotateCcwIcon />
            Retry
        </Button>
        <Button variant="outline" size="xs" onClick={clear}>
            <XIcon />
            Cancel
        </Button>
    </>
)

/** Tidevann's runs in a table that fills the canvas, with search, selection, menus and the opened row. */
function Runs({
    count,
    defaultSelection,
    defaultSort = null,
}: {
    count: number
    defaultSelection?: ReadonlySet<string>
    defaultSort?: DataSort | null
}) {
    const all = makeRuns(count)
    const [query, setQuery] = useState('')
    const [opened, setOpened] = useState<string | undefined>(undefined)
    const rows = useMemo(() => {
        const wanted = query.trim().toLowerCase()
        return wanted === ''
            ? all
            : all.filter((run) => run.id.includes(wanted) || run.job.includes(wanted) || run.project.includes(wanted))
    }, [all, query])
    return (
        <div className="flex h-svh flex-col bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={rows}
                rowKey={(run) => run.id}
                selectable
                defaultSelection={defaultSelection}
                defaultSort={defaultSort}
                bulkActions={bulk}
                rowActions={runActions}
                onOpen={(run) => setOpened(run.id)}
                opened={(run) => run.id === opened}
                toolbar={<SearchField value={query} onChange={setQuery} placeholder="Search runs" className="w-56" />}
            />
        </div>
    )
}

/** A hundred runs: the whole table at a size that needs no scrolling to see its parts. */
export const Hundred: StoryObj = { name: '100 rows', render: () => <Runs count={100} /> }

/** Five hundred runs. */
export const FiveHundred: StoryObj = { name: '500 rows', render: () => <Runs count={500} /> }

/** Ten thousand runs; only the rows in view are drawn. */
export const TenThousand: StoryObj = { name: '10k rows', render: () => <Runs count={10_000} /> }

/** Fifty thousand runs, sorted from a column head as quickly as the hundred. */
export const FiftyThousand: StoryObj = { name: '50k rows', render: () => <Runs count={50_000} /> }

/** Ten thousand runs fifty to a page: the table sorts them all and shows a page, with the pager at its foot. */
export const Pages: StoryObj = {
    render: () => (
        <div className="flex h-svh flex-col bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={makeRuns(10_000)}
                rowKey={(run) => run.id}
                selectable
                bulkActions={bulk}
                rowActions={runActions}
                paging="client"
            />
        </div>
    ),
}

/** Pages as a server gives them: the app sorts and slices, as a server would, and the table shows the page it hears of. */
function ServerPages() {
    const all = makeRuns(50_000)
    const [sort, setSort] = useState<DataSort | null>(null)
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(50)
    const rows = useMemo(() => {
        const column = COLUMNS.find((one) => one.id === sort?.column)
        const sorted = sort === null || column?.sortValue === undefined ? all : sortRows(all, column.sortValue, sort.direction)
        return sorted.slice(page * size, (page + 1) * size)
    }, [all, sort, page, size])
    return (
        <div className="flex h-svh flex-col bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={rows}
                rowKey={(run) => run.id}
                rowActions={runActions}
                paging="server"
                total={all.length}
                manualSort
                sort={sort}
                onSortChange={setSort}
                page={page}
                onPageChange={setPage}
                pageSize={size}
                onPageSizeChange={setSize}
            />
        </div>
    )
}

/** Fifty thousand runs a page at a time from a server: only the page shown is ever handed to the table. */
export const ServerPaging: StoryObj = { name: 'Server pages', render: () => <ServerPages /> }

/** Runs arriving as they are scrolled to: 200 at first, 200 more each time the end comes near. */
function LoadMore() {
    const all = makeRuns(50_000)
    const [count, setCount] = useState(200)
    const [loading, setLoading] = useState(false)
    const timer = useRef<number | undefined>(undefined)
    const more = useCallback(() => {
        setLoading(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
            setCount((now) => Math.min(all.length, now + 200))
            setLoading(false)
        }, 600)
    }, [all.length])
    return (
        <div className="flex h-svh flex-col bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={all.slice(0, count)}
                rowKey={(run) => run.id}
                selectable
                bulkActions={bulk}
                rowActions={runActions}
                hasMore={count < all.length}
                loading={loading}
                onLoadMore={more}
            />
        </div>
    )
}

/** Progressive loading: the bar counts what has loaded, and placeholder rows stand in while more arrive. */
export const LoadsMore: StoryObj = { name: 'Load more', render: () => <LoadMore /> }

/** The first rows still on their way: placeholder rows fill the table. */
export const Loading: StoryObj = {
    render: () => (
        <div className="flex h-svh flex-col bg-background p-4 text-foreground">
            <DataTable className="flex-1" columns={COLUMNS} rows={[]} rowKey={(run) => run.id} selectable loading />
        </div>
    ),
}

/** Runs sorted by duration, longest first: the arrow in the head says which way. */
export const Sorted: StoryObj = { render: () => <Runs count={500} defaultSort={{ column: 'duration', direction: 'desc' }} /> }

/** Three runs selected: the bar says how many and offers to retry or cancel them, or to clear. */
export const Selection: StoryObj = {
    render: () => <Runs count={500} defaultSelection={new Set(['run_8f3a01', 'run_8f3a02', 'run_8f3a04'])} />,
}

/** The same actions with the retry and cancel buttons on the row itself, shown on hover. */
const quickActions = (run: TableRun): DataAction[] =>
    runActions(run).map((action) =>
        'separator' in action || (action.id !== 'retry' && action.id !== 'cancel') ? action : { ...action, inline: true },
    )

const MENUS: { title: string; what: string; props: Partial<Parameters<typeof DataTable<TableRun>>[0]> }[] = [
    {
        title: 'Right-click only',
        what: 'No button; a right-click on a row opens its menu.',
        props: { rowActions: runActions, actionButton: 'none' },
    },
    { title: 'Menu button', what: 'The menu button at every row’s end, always shown.', props: { rowActions: runActions } },
    {
        title: 'Menu on hover',
        what: 'The button, upright dots, shown on the row under the pointer.',
        props: { rowActions: runActions, actionButton: 'hover', actionIcon: <EllipsisVerticalIcon /> },
    },
    {
        title: 'Quick actions',
        what: 'Retry and cancel as buttons on the row under the pointer, the rest behind the menu.',
        props: { rowActions: quickActions, actionButton: 'hover', actionIcon: <MenuIcon /> },
    },
]

/** Four ways to reach a row's actions, side by side; every one also opens on a right-click. */
export const RowMenus: StoryObj = {
    name: 'Row menus',
    render: () => (
        <div className="grid h-svh grid-rows-4 gap-4 bg-background p-4 text-foreground lg:grid-cols-2 lg:grid-rows-2">
            {MENUS.map((menu) => (
                <section key={menu.title} className="flex min-h-0 flex-col gap-2">
                    <div className="text-sm">
                        <span className="font-medium">{menu.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{menu.what}</span>
                    </div>
                    <DataTable
                        className="flex-1"
                        columns={COLUMNS.slice(0, 5)}
                        rows={makeRuns(40)}
                        rowKey={(run) => run.id}
                        minWidth="36rem"
                        {...menu.props}
                    />
                </section>
            ))}
        </div>
    ),
}

const children = (row: TreeRow) => (row.kind === 'run' ? undefined : row.children)
const runOf = (row: TreeRow) => (row.kind === 'run' ? row.run : undefined)
const countRuns = (row: TreeRow): number => (row.kind === 'run' ? 1 : row.children.reduce((sum, child) => sum + countRuns(child), 0))
const countFailed = (row: TreeRow): number =>
    row.kind === 'run' ? (row.run.state === 'failed' ? 1 : 0) : row.children.reduce((sum, child) => sum + countFailed(child), 0)

const TREE_COLUMNS: DataColumn<TreeRow>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(16rem,1fr)',
        cell: (row) =>
            row.kind === 'project' ? (
                <span className="font-medium">{row.name}</span>
            ) : row.kind === 'job' ? (
                <span className="font-mono">{row.name}</span>
            ) : (
                <span className="font-mono text-muted-foreground">{row.run.id}</span>
            ),
        sortValue: (row) => (row.kind === 'run' ? row.run.id : row.name),
    },
    {
        id: 'runs',
        header: 'Runs',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.kind === 'run' ? '' : countRuns(row).toLocaleString('en-US')),
        sortValue: countRuns,
    },
    {
        id: 'failed',
        header: 'Failed',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.kind === 'run' ? '' : countFailed(row).toLocaleString('en-US')),
        sortValue: countFailed,
    },
    {
        id: 'state',
        header: 'State',
        width: '7.5rem',
        cell: (row) => (row.kind === 'run' ? <StatusChip status={row.run.state} /> : null),
        sortValue: (row) => runOf(row)?.state ?? '',
    },
    {
        id: 'started',
        header: 'Started',
        width: '8rem',
        cell: (row) => (row.kind === 'run' ? startedAt(row.run.ago) : ''),
        sortValue: (row) => -(runOf(row)?.ago ?? 0),
    },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.kind === 'run' ? took(row.run.duration) : ''),
        sortValue: (row) => runOf(row)?.duration ?? 0,
    },
]

/** Runs grouped by project and job, `count` runs in all, with the given branches open. */
function RunTree({ count, open }: { count: number; open: string[] }) {
    const rows = makeRunTree(count)
    return (
        <div className="flex h-svh flex-col bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={TREE_COLUMNS}
                rows={rows}
                rowKey={(row) => row.id}
                childRows={children}
                defaultExpanded={new Set(open)}
                selectable
                bulkActions={bulk}
                minWidth="44rem"
            />
        </div>
    )
}

/** Three hundred runs under their projects and jobs, one project and one job open. */
export const Tree: StoryObj = { render: () => <RunTree count={300} open={['harbor', 'harbor/nightly-export']} /> }

/** Fifty thousand runs under their projects and jobs, with a job of over three thousand runs open. */
export const LargeTree: StoryObj = {
    name: 'Large tree',
    render: () => <RunTree count={50_000} open={['harbor', 'harbor/nightly-export', 'juniper']} />,
}

/** A search that matches nothing. */
export const Empty: StoryObj = {
    render: () => (
        <div className="flex h-svh flex-col bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={[]}
                rowKey={(run) => run.id}
                selectable
                words={{ empty: 'No runs match the search.' }}
            />
        </div>
    ),
}
