import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play, Workflow } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { useScrollMemory } from '@winterop-com/sokkel-ui/hooks/use-scroll-memory'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { makeRuns, startedAt, type TableRun } from '../fixtures/tableRuns'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * `useScrollMemory` keeps where a screen's scroller was left, per key, for the session: in a
 * `Shell` without a ref it is the shell's content. Scroll a list, switch to the other and back, and
 * it is where it was left; a list never left starts at the top.
 */
const meta: Meta = { title: 'Patterns/Scroll memory' }
export default meta

type View = 'failed' | 'all'

const VIEWS = [
    { value: 'all', label: 'All runs' },
    { value: 'failed', label: 'Failed' },
] as const

const RUNS = makeRuns(120)

const ROWS: Record<View, readonly TableRun[]> = {
    all: RUNS,
    failed: RUNS.filter((run) => run.state !== 'succeeded'),
}

const COLUMNS: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8rem', cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.id}</span> },
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => run.job },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.state} /> },
    {
        id: 'started',
        header: 'Started',
        width: '8rem',
        cell: (run) => <span className="text-muted-foreground tabular-nums">{startedAt(run.ago)}</span>,
    },
]

const PLACES: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
        ],
    },
]

/** One list, its place kept under its own key. */
function RunList({ view }: { view: View }) {
    useScrollMemory(`runs.${view}`)
    const rows = ROWS[view]
    return (
        <Page>
            <PageHeader title={view === 'all' ? 'Runs' : 'Failed runs'} count={rows.length} />
            <DataTable variant="list" columns={COLUMNS} rows={rows} rowKey={(run) => run.id} />
        </Page>
    )
}

function Lists() {
    const [view, setView] = useState<View>('all')
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={PLACES} />}
                top={
                    <TopBar
                        trail={[{ label: 'Runs' }]}
                        actions={<Segmented size="sm" label="Runs to show" value={view} options={VIEWS} onValueChange={setView} />}
                    />
                }
            >
                <RunList key={view} view={view} />
            </Shell>
        </TooltipProvider>
    )
}

/** Two lists in the shell's content, each back where it was left when switched to again. */
export const TwoLists: StoryObj = { name: 'Two lists', render: () => <Lists /> }

const MANY = makeRuns(1000)

const PAGED: Record<View, readonly TableRun[]> = {
    all: MANY,
    failed: MANY.filter((run) => run.state !== 'succeeded'),
}

/** Runs fifty at a time as the end comes near, in a table that scrolls itself, its place kept under its own key. */
function PagedRuns({ view }: { view: View }) {
    const all = PAGED[view]
    const [count, setCount] = useState(50)
    const [loading, setLoading] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
    useEffect(() => () => clearTimeout(timer.current), [])
    const more = useCallback(() => {
        setLoading(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
            setCount((now) => Math.min(all.length, now + 50))
            setLoading(false)
        }, 300)
    }, [all.length])
    return (
        <Page className="h-full">
            <PageHeader title={view === 'all' ? 'Runs' : 'Failed runs'} count={all.length} />
            <DataTable
                className="min-h-0 flex-1"
                columns={COLUMNS}
                rows={all.slice(0, count)}
                rowKey={(run) => run.id}
                total={all.length}
                hasMore={count < all.length}
                loading={loading}
                onLoadMore={more}
                scrollKey={`paged-runs.${view}`}
            />
        </Page>
    )
}

function PagedLists() {
    const [view, setView] = useState<View>('all')
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={PLACES} />}
                top={
                    <TopBar
                        trail={[{ label: 'Runs' }]}
                        actions={<Segmented size="sm" label="Runs to show" value={view} options={VIEWS} onValueChange={setView} />}
                    />
                }
            >
                <PagedRuns key={view} view={view} />
            </Shell>
        </TooltipProvider>
    )
}

/**
 * A table that scrolls itself keeps its place with `scrollKey`: scroll far down the runs, switch to
 * the failed ones and back, and the table asks for the pages that reach where it was left, fifty
 * runs at a time, and stands there.
 */
export const PagedTable: StoryObj = { name: 'Paged table', render: () => <PagedLists /> }
