import { BookOpen, CalendarClock, Library, Play, RotateCcw, Server, ScrollText, Webhook, Workflow } from 'lucide-react'
import { useState } from 'react'

import { DataTable, type DataColumn } from '../components/DataTable'
import { DescriptionList } from '../components/DescriptionList'
import { FilterChip } from '../components/FilterChip'
import { Inspector, InspectorSection } from '../components/Inspector'
import { Row } from '../components/Layout'
import { PageHeader } from '../components/PageHeader'
import { Problem } from '../components/Problem'
import { Rail, type RailGroup } from '../components/Rail'
import { SearchField } from '../components/SearchField'
import { Page, Shell } from '../components/Shell'
import { StatusChip, type Status } from '../components/StatusChip'
import { TopBar } from '../components/TopBar'
import { Button } from '../components/ui/button'
import { DropdownMenuItem } from '../components/ui/dropdown-menu'
import { TooltipProvider } from '../components/ui/tooltip'
import { JOB_OPTIONS, STATUS_OPTIONS } from './fixtures/filters'
import { TidevannMark } from './fixtures/TidevannMark'

/**
 * A list page built from the library's parts, as an app builds one: the rail and top bar, a page
 * header, a toolbar, the listing, and the inspector on the chosen run. The density and typeface
 * stories draw it at every level.
 */
interface Run {
    id: string
    job: string
    status: Status
    step: string | null
    at: string
    took: string
}

const RUNS: Run[] = [
    { id: '01a1a5c6', job: 'nightly-export', status: 'succeeded', step: null, at: '2 min ago', took: '1.4s' },
    { id: '01a1a5c2', job: 'import-orders', status: 'failed', step: 'validate', at: '6 min ago', took: '0.3s' },
    { id: '01a1a5b9', job: 'sync-inventory', status: 'running', step: 'transform', at: '7 min ago', took: '-' },
    { id: '01a1a5b1', job: 'rebuild-index', status: 'succeeded', step: null, at: '12 min ago', took: '8.2s' },
    { id: '01a1a5a7', job: 'send-digest', status: 'completed_with_errors', step: 'notify', at: '14 min ago', took: '2.9s' },
    { id: '01a1a59e', job: 'rebuild-index', status: 'queued', step: null, at: '15 min ago', took: '-' },
    { id: '01a1a591', job: 'nightly-export', status: 'cancelled', step: 'upload', at: '21 min ago', took: '4.0s' },
    { id: '01a1a588', job: 'sync-inventory', status: 'succeeded', step: null, at: '33 min ago', took: '19.5s' },
]

const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
            { id: 'services', label: 'Services', icon: Server, href: '#' },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook, href: '#' },
        ],
    },
    {
        id: 'reference',
        title: 'Reference',
        entries: [
            { id: 'docs', label: 'Docs', icon: BookOpen, href: '#' },
            { id: 'examples', label: 'Examples', icon: Library, href: '#' },
        ],
    },
]

/** How long a run took in seconds, for sorting; a run still going sorts last. */
const seconds = (run: Run) => (run.took === '-' ? Number.POSITIVE_INFINITY : Number.parseFloat(run.took))

const COLUMNS: DataColumn<Run>[] = [
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(0,1fr)',
        cell: (run) => <span className="truncate">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'status', header: 'Status', width: '10rem', cell: (run) => <StatusChip status={run.status} />, sortValue: (run) => run.status },
    {
        id: 'step',
        header: 'Step',
        width: '6rem',
        cell: (run) => <span className="truncate font-mono text-xs text-muted-foreground">{run.step ?? '-'}</span>,
        sortValue: (run) => run.step ?? '',
    },
    {
        id: 'started',
        header: 'Started',
        width: '6.5rem',
        cell: (run) => <span className="text-xs text-muted-foreground">{run.at}</span>,
        sortValue: (run) => Number.parseInt(run.at, 10),
    },
    {
        id: 'took',
        header: 'Took',
        width: '4.5rem',
        align: 'end',
        cell: (run) => <span className="font-mono text-xs tabular-nums">{run.took}</span>,
        sortValue: seconds,
    },
]

export function RunsPage() {
    const [chosen, setChosen] = useState<Run>(RUNS[1])
    const [width, setWidth] = useState(360)
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState<string[]>([])
    const [jobs, setJobs] = useState<string[]>([])
    const rows = RUNS.filter(
        (run) =>
            (status.length === 0 || status.includes(run.status)) &&
            (jobs.length === 0 || jobs.includes(run.job)) &&
            run.job.includes(query.trim()),
    )
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={GROUPS} />}
                top={<TopBar trail={[{ label: 'Tidevann', href: '#' }, { label: 'Runs' }]} />}
            >
                <Page className="h-full">
                    <PageHeader title="Runs" count="8 today" actions={<Button size="sm">Run a job</Button>} />
                    <Row gap="inspector" align="start" className="min-h-0 flex-1">
                        <DataTable
                            toolbar={
                                <>
                                    <SearchField
                                        value={query}
                                        onChange={setQuery}
                                        placeholder="Search"
                                        className="w-full max-w-64 min-w-40"
                                    />
                                    <FilterChip facet="Status" options={STATUS_OPTIONS} selected={status} onSelectedChange={setStatus} />
                                    <FilterChip facet="Job" options={JOB_OPTIONS} multiple selected={jobs} onSelectedChange={setJobs} />
                                </>
                            }
                            columns={COLUMNS}
                            rows={rows}
                            rowKey={(run) => run.id}
                            opened={(run) => run.id === chosen.id}
                            onOpen={setChosen}
                            minWidth="32rem"
                            className="max-h-full min-w-0 flex-1"
                        />
                        <Inspector
                            title={chosen.job}
                            code={`run ${chosen.id}`}
                            size={width}
                            onSizeChange={setWidth}
                            status={
                                <>
                                    <StatusChip status={chosen.status} />
                                    {chosen.step !== null && (
                                        <span>
                                            at step <span className="font-mono text-foreground">{chosen.step}</span>
                                        </span>
                                    )}
                                </>
                            }
                            actions={
                                <>
                                    <Button size="sm" variant="outline">
                                        <RotateCcw aria-hidden />
                                        Retry
                                    </Button>
                                    <Button size="sm" variant="ghost">
                                        <ScrollText aria-hidden />
                                        Log
                                    </Button>
                                </>
                            }
                            menu={
                                <>
                                    <DropdownMenuItem>Open the job</DropdownMenuItem>
                                    <DropdownMenuItem>Copy a link</DropdownMenuItem>
                                </>
                            }
                        >
                            {chosen.status === 'failed' && (
                                <InspectorSection title="Error">
                                    <Problem
                                        title="Invalid amount in 37 rows"
                                        detail="The first is row 112, where `amount` is `n/a`. Amounts are written like `12.50`."
                                        technical="at $.amount: 'n/a' does not match '^[0-9]+[.][0-9]{2}$'"
                                    />
                                </InspectorSection>
                            )}
                            <InspectorSection title="Details">
                                <DescriptionList
                                    items={[
                                        { term: 'Job', value: chosen.job, code: true },
                                        { term: 'Started by', value: 'ada, with an API token' },
                                        { term: 'Started', value: `2026-11-04 14:02, ${chosen.at}` },
                                        { term: 'Duration', value: chosen.took, code: true },
                                    ]}
                                />
                            </InspectorSection>
                        </Inspector>
                    </Row>
                </Page>
            </Shell>
        </TooltipProvider>
    )
}
