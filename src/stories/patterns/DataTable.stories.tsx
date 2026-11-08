import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    CopyIcon,
    EllipsisVerticalIcon,
    ExternalLinkIcon,
    ListPlusIcon,
    MenuIcon,
    PlayIcon,
    RotateCcwIcon,
    Trash2Icon,
    UserIcon,
    XIcon,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import {
    type DataAction,
    type DataColumn,
    DataTable,
    type DataSort,
    findInTree,
    sortRows,
    treeBranchKeys,
} from '@winterop-com/sokkel-ui/DataTable'
import { FileTypeIcon, formatSize } from '@winterop-com/sokkel-ui/FileList'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { type Album, makeAlbums } from '../fixtures/albums'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { folderContents, type FolderRow, makeFolderTree, projectFolders } from '../fixtures/folders'
import { JOB_OWNERS, JOB_SETTINGS, type JobSetting, saveJobSetting } from '../fixtures/jobs'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { makeRuns, makeRunTree, startedAt, type TableRun, took, type TreeRow } from '../fixtures/tableRuns'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A table for many rows. Only the rows in view are drawn, so the 10k and 50k tables scroll like
 * the 100. Each column head sorts; the boxes select, Shift picks a range, and the bar above then
 * offers what to do with the selection. The menu at a row's end, or a right-click on the row,
 * offers what to do with that row. The column menu at the bar's end hides columns; the first stays
 * put while the rest scroll sideways, and every column head's right edge resizes its column. A
 * tree's rows open to their children, at any depth or loaded as a branch opens, and choosing a
 * project chooses every run in it. A short listing drops the bar above its head.
 */
const meta: Meta = { title: 'Patterns/Data table', parameters: { frame: 'padded' } }
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
    reorderable,
}: {
    count: number
    defaultSelection?: ReadonlySet<string>
    defaultSort?: DataSort | null
    reorderable?: boolean
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
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={rows}
                rowKey={(run) => run.id}
                selectable
                defaultSelection={defaultSelection}
                defaultSort={defaultSort}
                reorderable={reorderable}
                bulkActions={bulk}
                rowActions={runActions}
                onOpen={(run) => setOpened(run.id)}
                opened={(run) => run.id === opened}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
            />
        </Stack>
    )
}

interface ListRun {
    id: string
    job: string
    state: 'succeeded' | 'failed' | 'running' | 'queued'
    by: string
    took: string
    note: string
}

const LIST_RUNS: ListRun[] = [
    {
        id: 'r1',
        job: 'import-orders',
        state: 'running',
        by: 'schedule',
        took: '1m 12s',
        note: 'Reading the third of four files from the orders bucket.',
    },
    {
        id: 'r2',
        job: 'nightly-export',
        state: 'failed',
        by: 'schedule',
        took: '4.2s',
        note: 'The upload step was refused: the bucket on files.example.org asked for a fresh token, and the run stopped before it wrote anything, so the export can be retried as it is.',
    },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', by: 'ada', took: '6m 03s', note: 'Rebuilt 1,204,880 entries.' },
    { id: 'r4', job: 'send-digest', state: 'succeeded', by: 'schedule', took: '12.8s', note: 'Sent to 48 people.' },
    { id: 'r5', job: 'sync-inventory', state: 'queued', by: 'grace', took: '-', note: 'Waiting for a worker.' },
]

const LIST_COLUMNS: DataColumn<ListRun>[] = [
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.state} /> },
    { id: 'by', header: 'Started by', width: '8rem', cell: (run) => <span className="text-muted-foreground">{run.by}</span> },
    { id: 'took', header: 'Took', width: '6rem', align: 'end', cell: (run) => <span className="tabular-nums">{run.took}</span> },
]

/** A short listing: no bar above the head, the column names as the box's head, and a foot that counts the rows loaded. */
export const ShortList: StoryObj = {
    name: 'Short list',
    render: () => (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS}
            rows={LIST_RUNS}
            rowKey={(run) => run.id}
            foot={`${String(LIST_RUNS.length)} of 248`}
        />
    ),
}

/** A chevron at each row's end (`chevron`): a press opens the run's own page rather than a panel beside the list. */
export const RowPages: StoryObj = {
    name: 'Row pages',
    render: () => (
        <DataTable variant="list" columns={LIST_COLUMNS} rows={LIST_RUNS} rowKey={(run) => run.id} onOpen={() => undefined} chevron />
    ),
}

/** Only a failed run can be retried; every other row's actions are empty. */
const listActions = (run: ListRun): DataAction[] =>
    run.state === 'failed' ? [{ id: 'retry', label: 'Retry', icon: <RotateCcwIcon />, onSelect: () => undefined }] : []

/** Menus on some rows only: a row whose actions are empty draws no button and opens no menu on a right-click. */
export const SomeMenus: StoryObj = {
    name: 'Some menus',
    render: () => <DataTable variant="list" columns={LIST_COLUMNS} rows={LIST_RUNS} rowKey={(run) => run.id} rowActions={listActions} />,
}

function Picking() {
    const [chosen, setChosen] = useState('r2')
    return (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS}
            rows={LIST_RUNS}
            rowKey={(one) => one.id}
            onOpen={(one) => setChosen(one.id)}
            opened={(one) => one.id === chosen}
            foot={`${String(LIST_RUNS.length)} of 248`}
        />
    )
}

/** A list that picks the row its detail shows: a click, Enter or Space picks it, and it is filled and marked selected. No boxes. */
export const Pick: StoryObj = {
    render: () => <Picking />,
}

/** A table whose columns keep their order: its columns menu shows and hides them, with no moves. */
export const FixedOrder: StoryObj = {
    name: 'Fixed order',
    parameters: { frame: 'none' },
    render: () => <Runs count={100} reorderable={false} />,
}

/** The tint under the pointer turned off, for a listing that should stay still. */
export const NoHover: StoryObj = {
    name: 'No hover',
    render: () => <DataTable variant="list" columns={LIST_COLUMNS} rows={LIST_RUNS} rowKey={(run) => run.id} hover={false} />,
}

/** Rows that grow to fit a cell longer than one line, here each run's note. */
export const TallRows: StoryObj = {
    name: 'Tall rows',
    render: () => (
        <DataTable
            variant="list"
            rowHeight="auto"
            columns={[
                ...LIST_COLUMNS.slice(0, 2),
                {
                    id: 'note',
                    header: 'Note',
                    width: 'minmax(12rem,2fr)',
                    cell: (run) => <span className="text-muted-foreground">{run.note}</span>,
                },
            ]}
            rows={LIST_RUNS}
            rowKey={(run) => run.id}
        />
    ),
}

const STATE_NAMES: Record<string, string> = { running: 'Running', queued: 'Queued', failed: 'Failed', succeeded: 'Succeeded' }

/** A short listing grouped by state, the runs still going first; each head folds its group. */
export const GroupedList: StoryObj = {
    name: 'Grouped list',
    render: () => (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS.filter((column) => column.id !== 'state')}
            rows={LIST_RUNS}
            rowKey={(run) => run.id}
            groupBy="state"
            groupOrder={['running', 'queued', 'failed']}
            groupLabel={(state) => STATE_NAMES[state] ?? state}
        />
    ),
}

/** A hundred runs: the whole table at a size that needs no scrolling to see its parts. */
export const Hundred: StoryObj = { parameters: { frame: 'none' }, name: '100 rows', render: () => <Runs count={100} /> }

/** Five hundred runs. */
export const FiveHundred: StoryObj = { parameters: { frame: 'none' }, name: '500 rows', render: () => <Runs count={500} /> }

/** Ten thousand runs; only the rows in view are drawn. */
export const TenThousand: StoryObj = { parameters: { frame: 'none' }, name: '10k rows', render: () => <Runs count={10_000} /> }

/** Fifty thousand runs, sorted from a column head as quickly as the hundred. */
export const FiftyThousand: StoryObj = { parameters: { frame: 'none' }, name: '50k rows', render: () => <Runs count={50_000} /> }

/** Ten thousand runs fifty to a page: the table sorts them all and shows a page, with the pager at its foot. */
export const Pages: StoryObj = {
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
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
        </Stack>
    ),
}

/** The first page selected from the head's box: the bar offers every one of the ten thousand as a second step. */
export const PageSelected: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Page selected',
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={makeRuns(10_000)}
                rowKey={(run) => run.id}
                selectable
                defaultSelection={
                    new Set(
                        makeRuns(10_000)
                            .slice(0, 50)
                            .map((run) => run.id),
                    )
                }
                bulkActions={bulk}
                rowActions={runActions}
                paging="client"
            />
        </Stack>
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
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
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
        </Stack>
    )
}

/** Fifty thousand runs a page at a time from a server: only the page shown is ever handed to the table. */
export const ServerPaging: StoryObj = { parameters: { frame: 'none' }, name: 'Server pages', render: () => <ServerPages /> }

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
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
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
        </Stack>
    )
}

/** Progressive loading: the bar counts what has loaded, and placeholder rows stand in while more arrive. */
export const LoadsMore: StoryObj = { parameters: { frame: 'none' }, name: 'Load more', render: () => <LoadMore /> }

/** The first rows still on their way: placeholder rows fill the table. */
export const Loading: StoryObj = {
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable className="flex-1" columns={COLUMNS} rows={[]} rowKey={(run) => run.id} selectable loading />
        </Stack>
    ),
}

/** Runs sorted by duration, longest first: the arrow in the head says which way. */
export const Sorted: StoryObj = {
    parameters: { frame: 'none' },
    render: () => <Runs count={500} defaultSort={{ column: 'duration', direction: 'desc' }} />,
}

/** Three runs selected: the bar says how many and offers to retry or cancel them, or to clear. */
export const Selection: StoryObj = {
    parameters: { frame: 'none' },
    render: () => <Runs count={500} defaultSelection={new Set(['run_8f3a01', 'run_8f3a02', 'run_8f3a04'])} />,
}

/** The run columns with what each says for a group: the records and time summed, the most attempts. */
const GROUP_COLUMNS: DataColumn<TableRun>[] = COLUMNS.map((column) =>
    column.id === 'records'
        ? { ...column, aggregate: (runs) => runs.reduce((sum, run) => sum + run.records, 0).toLocaleString('en-US') }
        : column.id === 'duration'
          ? { ...column, aggregate: (runs) => took(runs.reduce((sum, run) => sum + run.duration, 0)) }
          : column.id === 'attempts'
            ? { ...column, aggregate: (runs) => Math.max(...runs.map((run) => run.attempts)) }
            : column,
)

function GroupedRuns() {
    const rows = useMemo(() => makeRuns(300), [])
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={GROUP_COLUMNS.filter((column) => column.id !== 'project')}
                rows={rows}
                rowKey={(run) => run.id}
                groupBy="project"
                defaultFoldedGroups={new Set(['larkspur'])}
                defaultSort={{ column: 'duration', direction: 'desc' }}
                defaultSelection={new Set(rows.filter((run) => run.project === 'harbor').map((run) => run.id))}
                selectable
                bulkActions={bulk}
                rowActions={runActions}
            />
        </Stack>
    )
}

/**
 * Runs under a head for each project, with its count and the records, time and attempts summed up
 * in its columns. Pressing a head folds its group (larkspur is folded), rows sort within their
 * group, and a head's box selects the group: harbor is selected whole.
 */
export const Groups: StoryObj = { parameters: { frame: 'none' }, render: () => <GroupedRuns /> }

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
    parameters: { frame: 'none' },
    name: 'Row menus',
    render: () => (
        <Columns count={2} min="xl" gap="lg" className="h-svh bg-background p-4 text-foreground">
            {MENUS.map((menu) => (
                <Stack key={menu.title} as="section" gap="sm" className="min-h-0">
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
                </Stack>
            ))}
        </Columns>
    ),
}

const OWNER_OPTIONS = JOB_OWNERS.map((owner) => ({ value: owner }))

/** Tidevann's jobs with their settings edited in place, each cell saved on its own after a short wait. */
function EditableJobs() {
    const [jobs, setJobs] = useState(JOB_SETTINGS)
    const change = <K extends keyof JobSetting>(job: JobSetting, field: K, value: JobSetting[K]) =>
        saveJobSetting(field, value).then(() => setJobs((all) => all.map((one) => (one.id === job.id ? { ...one, [field]: value } : one))))
    const columns: DataColumn<JobSetting>[] = [
        {
            id: 'job',
            header: 'Job',
            width: '10rem',
            cell: (job) => <span className="font-mono">{job.job}</span>,
            sortValue: (job) => job.job,
        },
        { id: 'project', header: 'Project', width: '6.5rem', cell: (job) => job.project, sortValue: (job) => job.project },
        {
            id: 'schedule',
            header: 'Schedule',
            width: '9rem',
            cell: (job) => <span className="font-mono">{job.schedule}</span>,
            sortValue: (job) => job.schedule,
            edit: {
                editor: 'text',
                value: (job) => job.schedule,
                save: (job, schedule) => change(job, 'schedule', schedule),
                // A project's own schedule is set on the project, not here.
                enabled: (job) => job.locked !== true,
                display: (schedule) => <span className="font-mono">{schedule}</span>,
            },
        },
        {
            id: 'retries',
            header: 'Retries',
            width: '5.5rem',
            align: 'end',
            cell: (job) => job.retries,
            sortValue: (job) => job.retries,
            edit: {
                editor: 'number',
                value: (job) => job.retries,
                validate: (retries) => (retries === null || retries < 0 || retries > 10 ? 'Retries go from 0 to 10.' : undefined),
                save: (job, retries) => change(job, 'retries', retries ?? 0),
            },
        },
        {
            id: 'owner',
            header: 'Owner',
            width: '7rem',
            cell: (job) => job.owner,
            sortValue: (job) => job.owner,
            edit: {
                editor: 'select',
                options: OWNER_OPTIONS,
                value: (job) => job.owner,
                save: (job, owner) => change(job, 'owner', owner as JobSetting['owner']),
            },
        },
        {
            id: 'timeout',
            header: 'Timeout',
            width: '6rem',
            align: 'end',
            cell: (job) => (job.timeout === null ? <span className="text-muted-foreground">None</span> : `${String(job.timeout)} min`),
            sortValue: (job) => job.timeout ?? Number.POSITIVE_INFINITY,
            edit: {
                editor: 'number',
                value: (job) => job.timeout,
                display: (minutes) => (minutes === null ? 'None' : `${String(minutes)} min`),
                save: (job, timeout) => change(job, 'timeout', timeout),
            },
        },
        {
            id: 'paused',
            header: 'Paused until',
            width: '9.5rem',
            cell: (job) => job.pausedUntil ?? <span className="text-muted-foreground">Running</span>,
            sortValue: (job) => job.pausedUntil ?? '',
            edit: {
                editor: 'date',
                value: (job) => job.pausedUntil ?? null,
                save: (job, day) => change(job, 'pausedUntil', day),
            },
        },
        {
            id: 'note',
            header: 'Note',
            width: 'minmax(12rem,1fr)',
            cell: (job) => <span className="text-muted-foreground">{job.note}</span>,
            edit: { editor: 'multiline', value: (job) => job.note, save: (job, note) => change(job, 'note', note) },
        },
        { id: 'last', header: 'Last run', width: '7.5rem', cell: (job) => <StatusChip status={job.last} />, stack: 'secondary' },
    ]
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={columns}
                rows={jobs}
                rowKey={(job) => job.id}
                selectable
                bulkActions={bulk}
                minWidth="68rem"
                editing={tableEditing}
            />
        </Stack>
    )
}

/**
 * Cells edited in place: the schedule, retries, owner, timeout and note of each job. Press a cell
 * to make it active and again (or double-click, Enter or F2) to edit; typing a figure opens a number
 * cell on it. Enter saves and moves down, Tab saves and moves to the next editable cell, Escape drops
 * the edit, and the arrows move between cells. Each save takes a moment, shown in its cell; the
 * scheduler refuses a schedule without five fields, marking the cell with its reason, and retries
 * past ten are refused before anything is sent. The send-digest jobs' schedules are their
 * project's and cannot be edited here.
 */
export const EditableCells: StoryObj = { parameters: { frame: 'none' }, name: 'Editable cells', render: () => <EditableJobs /> }

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
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
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
        </Stack>
    )
}

/** Three hundred runs under their projects and jobs, one project and one job open. */
export const Tree: StoryObj = {
    parameters: { frame: 'none' },
    render: () => <RunTree count={300} open={['harbor', 'harbor/nightly-export']} />,
}

/** Fifty thousand runs under their projects and jobs, with a job of over three thousand runs open. */
export const LargeTree: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Large tree',
    render: () => <RunTree count={50_000} open={['harbor', 'harbor/nightly-export', 'juniper']} />,
}

const FOLDER_COLUMNS: DataColumn<FolderRow>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(18rem,1fr)',
        cell: (row) => (
            <Row as="span" className="min-w-0">
                <FileTypeIcon kind={row.kind} className="size-4 shrink-0" />
                <span className="truncate font-mono">{row.name}</span>
            </Row>
        ),
        sortValue: (row) => `${row.kind === 'folder' ? 0 : 1}${row.name}`,
    },
    {
        id: 'size',
        header: 'Size',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.size === undefined ? '' : formatSize(row.size)),
        sortValue: (row) => row.size ?? -1,
    },
    { id: 'modified', header: 'Modified', width: '8rem', cell: (row) => row.modified, sortValue: (row) => row.modified },
    {
        id: 'owner',
        header: 'Owner',
        width: '7rem',
        cell: (row) => <span className="text-muted-foreground">{row.owner}</span>,
        sortValue: (row) => row.owner,
    },
]

const folderChildren = (row: FolderRow) => row.children
const DEEP = makeFolderTree(8)
/** The way down to one folder eight deep. */
const DEEP_PATH = (() => {
    const path: string[] = []
    let level: readonly FolderRow[] = DEEP
    while (level.length > 0) {
        const folder = level.find((one) => one.kind === 'folder' && (one.children?.length ?? 0) > 0)
        if (folder === undefined) break
        path.push(folder.id)
        level = folder.children ?? []
    }
    return path
})()

function Frame({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            {children}
        </Stack>
    )
}

/** Folders in folders, eight deep, open along the way to the deepest. */
export const DeepTree: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Deep tree',
    render: () => (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={DEEP}
                rowKey={(row) => row.id}
                childRows={folderChildren}
                defaultExpanded={new Set(DEEP_PATH)}
                minWidth="40rem"
            />
        </Frame>
    ),
}

function OpenAllTree() {
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['harbor']))
    const every = useMemo(() => treeBranchKeys(DEEP, (row) => row.id, folderChildren), [])
    return (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={DEEP}
                rowKey={(row) => row.id}
                childRows={folderChildren}
                expanded={expanded}
                onExpandedChange={setExpanded}
                minWidth="40rem"
                toolbar={
                    <>
                        <Button variant="outline" size="xs" onClick={() => setExpanded(every)}>
                            Open all
                        </Button>
                        <Button variant="outline" size="xs" onClick={() => setExpanded(new Set())}>
                            Close all
                        </Button>
                    </>
                }
            />
        </Frame>
    )
}

/** Every branch opened or closed at once from the bar, the open branches held by the app. */
export const OpenAll: StoryObj = { parameters: { frame: 'none' }, name: 'Open all', render: () => <OpenAllTree /> }

/** The deep tree cut down to the names holding `text`. */
function findFolders(text: string) {
    const wanted = text.trim().toLowerCase()
    return findInTree({
        rows: DEEP,
        rowKey: (row) => row.id,
        childRows: folderChildren,
        match: wanted === '' ? undefined : (row) => row.name.toLowerCase().includes(wanted),
    })
}

function FindInTree({ initial }: { initial: string }) {
    const [query, setQuery] = useState(initial)
    const found = useMemo(() => findFolders(query), [query])
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(found.open)
    return (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={found.rows}
                rowKey={(row) => row.id}
                childRows={found.childRows}
                expanded={expanded}
                onExpandedChange={setExpanded}
                minWidth="40rem"
                words={{ empty: 'Nothing matches.' }}
                search={
                    <SearchField
                        value={query}
                        onChange={(text) => {
                            setQuery(text)
                            setExpanded(findFolders(text).open)
                        }}
                        placeholder="Find"
                    />
                }
            />
        </Frame>
    )
}

/** A find in the tree: only the branches with a match stay, opened down to every match. */
export const TreeFind: StoryObj = { parameters: { frame: 'none' }, name: 'Tree find', render: () => <FindInTree initial="summary" /> }

function OnDemandTree() {
    const load = useCallback(
        (row: FolderRow) =>
            new Promise<readonly FolderRow[]>((resolve) => {
                setTimeout(() => resolve(folderContents(row, 12)), 900)
            }),
        [],
    )
    return (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={projectFolders()}
                rowKey={(row) => row.id}
                hasChildren={(row) => row.kind === 'folder'}
                loadChildren={load}
                minWidth="40rem"
            />
        </Frame>
    )
}

/** Folders whose contents load as each one first opens, a spinner in its control while they come. */
export const OnDemand: StoryObj = { parameters: { frame: 'none' }, name: 'On demand', render: () => <OnDemandTree /> }

const folderActions = (row: FolderRow): DataAction[] =>
    row.kind === 'folder'
        ? [
              { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => undefined },
              { id: 'new', label: 'New folder', icon: <ListPlusIcon />, onSelect: () => undefined },
              { id: 'copy', label: 'Copy path', icon: <CopyIcon />, onSelect: () => undefined },
              { id: 'line', separator: true },
              { id: 'delete', label: 'Delete', icon: <Trash2Icon />, destructive: true, onSelect: () => undefined },
          ]
        : [
              { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => undefined },
              { id: 'copy', label: 'Copy path', icon: <CopyIcon />, onSelect: () => undefined },
              { id: 'line', separator: true },
              { id: 'delete', label: 'Delete', icon: <Trash2Icon />, destructive: true, onSelect: () => undefined },
          ]

/** A tree whose rows have menus, from the button at each row's end or a right-click, folders and files offering different things. */
export const TreeMenus: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Tree menus',
    render: () => (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={DEEP}
                rowKey={(row) => row.id}
                childRows={folderChildren}
                defaultExpanded={new Set(DEEP_PATH.slice(0, 3))}
                rowActions={folderActions}
                minWidth="40rem"
            />
        </Frame>
    ),
}

const ALBUM_COLUMNS: DataColumn<Album>[] = [
    {
        id: 'title',
        header: 'Title',
        width: 'minmax(12rem,1fr)',
        cell: (album) => <span className="font-medium">{album.title}</span>,
        sortValue: (album) => album.title,
    },
    { id: 'artist', header: 'Artist', width: '10rem', cell: (album) => album.artist, sortValue: (album) => album.artist },
    { id: 'year', header: 'Year', width: '5rem', align: 'end', cell: (album) => album.year, sortValue: (album) => album.year },
    { id: 'tracks', header: 'Tracks', width: '5rem', align: 'end', cell: (album) => album.tracks, sortValue: (album) => album.tracks },
    {
        id: 'length',
        header: 'Length',
        width: '6rem',
        align: 'end',
        cell: (album) => took(album.length),
        sortValue: (album) => album.length,
    },
    {
        id: 'plays',
        header: 'Plays',
        width: '7rem',
        align: 'end',
        cell: (album) => album.plays.toLocaleString('en-US'),
        sortValue: (album) => album.plays,
    },
]

const albumActions = (): DataAction[] => [
    { id: 'play', label: 'Play', icon: <PlayIcon />, onSelect: () => undefined },
    { id: 'queue', label: 'Add to queue', icon: <ListPlusIcon />, onSelect: () => undefined },
    { id: 'artist', label: 'Go to artist', icon: <UserIcon />, onSelect: () => undefined },
    { id: 'line', separator: true },
    { id: 'remove', label: 'Remove from library', icon: <Trash2Icon />, destructive: true, onSelect: () => undefined },
]

/** An album as a card: its cover filling the top, its title, artist and year under it. */
function AlbumCard({ album }: { album: Album }) {
    return (
        <Stack gap="sm" className="h-full rounded-surface border border-border bg-card p-2 group-hover/card:bg-hover">
            <Artwork cover={album.cover} className="min-h-0 w-full flex-1 rounded-mini" />
            <div className="min-w-0 px-0.5">
                <div className="truncate text-sm font-medium">{album.title}</div>
                <MetaLine truncate items={[album.artist, album.year]} />
            </div>
        </Stack>
    )
}

/** A library of `count` albums as cards, switchable to the table, with search, selection and menus. */
function Albums({ count }: { count: number }) {
    const all = makeAlbums(count)
    const [query, setQuery] = useState('')
    const rows = useMemo(() => {
        const wanted = query.trim().toLowerCase()
        return wanted === ''
            ? all
            : all.filter((album) => album.title.toLowerCase().includes(wanted) || album.artist.toLowerCase().includes(wanted))
    }, [all, query])
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={ALBUM_COLUMNS}
                rows={rows}
                rowKey={(album) => album.id}
                card={(album) => <AlbumCard album={album} />}
                defaultView="grid"
                cardWidth="9rem"
                cardHeight="13.5rem"
                selectable
                rowActions={albumActions}
                actionButton="hover"
                bulkActions={(_, clear) => (
                    <Button variant="outline" size="xs" onClick={clear}>
                        <ListPlusIcon />
                        Add to queue
                    </Button>
                )}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                minWidth="40rem"
            />
        </Stack>
    )
}

/** 2,400 albums as cards: the grid fits as many to a line as the width allows, and the switch in the bar shows the same rows as a table. */
export const AlbumGrid: StoryObj = { parameters: { frame: 'none' }, name: 'Albums', render: () => <Albums count={2_400} /> }

/** Fifty thousand albums as cards; only the lines in view are drawn, and the sort menu orders them all. */
export const LargeAlbumGrid: StoryObj = { parameters: { frame: 'none' }, name: '50k albums', render: () => <Albums count={50_000} /> }

/** A search that matches nothing. */
export const Empty: StoryObj = {
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={[]}
                rowKey={(run) => run.id}
                selectable
                words={{ empty: 'No runs match the search.' }}
            />
        </Stack>
    ),
}
