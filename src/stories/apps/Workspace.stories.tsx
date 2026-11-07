import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Activity,
    Boxes,
    CalendarClock,
    FolderGit2,
    KeyRound,
    LayoutDashboard,
    ListChecks,
    Play,
    Plus,
    Settings,
    Users,
} from 'lucide-react'
import { useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Dock } from '@winterop-com/sokkel-ui/Dock'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { JOB_OPTIONS, PEOPLE_OPTIONS, STATUS_OPTIONS } from '../fixtures/filters'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A whole app in the library's frame: the rail with Projects unfolded to its projects, the top bar with the trail and search, a list page
 * with filters, the side panel on the chosen row, the foot strip, and a log dock. The rail and the
 * side panel are resizable here; resizing is opt-in on every panel.
 */
const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#' },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'workspace',
        title: 'Workspace',
        entries: [
            {
                id: 'projects',
                label: 'Projects',
                icon: FolderGit2,
                href: '#',
                entries: [
                    { id: 'harbor', label: 'harbor', href: '#' },
                    { id: 'juniper', label: 'juniper', href: '#' },
                    { id: 'larkspur', label: 'larkspur', href: '#' },
                ],
            },
            { id: 'services', label: 'Services', icon: Boxes, href: '#' },
            { id: 'secrets', label: 'Secrets', icon: KeyRound, href: '#' },
            { id: 'people', label: 'People', icon: Users, href: '#' },
        ],
    },
    {
        id: 'system',
        title: 'System',
        entries: [
            { id: 'activity', label: 'Activity', icon: Activity, href: '#' },
            { id: 'settings', label: 'Settings', icon: Settings, href: '#' },
        ],
    },
]

interface Run {
    id: string
    job: string
    state: Status
    by: string
    started: string
    duration: string
    /** Minutes since it started and seconds it took, for sorting; a run not yet started has neither. */
    ago: number
    seconds: number
}

const RUNS: Run[] = [
    { id: 'r1', job: 'import-orders', state: 'running', by: 'schedule', started: '14:02', duration: '1m 12s', ago: 1, seconds: 72 },
    { id: 'r2', job: 'nightly-export', state: 'failed', by: 'schedule', started: '02:00', duration: '4.2s', ago: 723, seconds: 4.2 },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', by: 'ada', started: '01:40', duration: '6m 03s', ago: 743, seconds: 363 },
    { id: 'r4', job: 'send-digest', state: 'succeeded', by: 'schedule', started: '01:00', duration: '12.8s', ago: 783, seconds: 12.8 },
    { id: 'r5', job: 'sync-inventory', state: 'queued', by: 'grace', started: '-', duration: '-', ago: 0, seconds: 0 },
    { id: 'r6', job: 'sync-inventory', state: 'cancelled', by: 'linus', started: 'yesterday', duration: '38s', ago: 1_500, seconds: 38 },
    {
        id: 'r7',
        job: 'import-orders',
        state: 'succeeded',
        by: 'schedule',
        started: 'yesterday',
        duration: '1m 04s',
        ago: 1_560,
        seconds: 64,
    },
    {
        id: 'r8',
        job: 'nightly-export',
        state: 'succeeded',
        by: 'schedule',
        started: 'yesterday',
        duration: '3.9s',
        ago: 2_160,
        seconds: 3.9,
    },
]

const COLUMNS: DataColumn<Run>[] = [
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(10rem,1fr)',
        cell: (run) => <span className="font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    {
        id: 'by',
        header: 'Started by',
        width: '7rem',
        cell: (run) => <span className="text-muted-foreground">{run.by}</span>,
        sortValue: (run) => run.by,
    },
    {
        id: 'started',
        header: 'Started',
        width: '6.5rem',
        cell: (run) => <span className="tabular-nums">{run.started}</span>,
        sortValue: (run) => -run.ago,
    },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (run) => <span className="tabular-nums">{run.duration}</span>,
        sortValue: (run) => run.seconds,
    },
]

const LOG: LogLine[] = [
    { at: '02:00:04.112', level: 'info', source: 'fetch', text: 'GET https://api.example.org/orders?since=24h' },
    { at: '02:00:05.020', level: 'info', source: 'fetch', text: 'read 2,184 rows in 0.9s' },
    { at: '02:00:06.301', level: 'warning', source: 'transform', text: 'currency missing on 12 rows; assumed EUR' },
    { at: '02:00:08.244', level: 'error', source: 'validate', text: 'amount must be a number (37 rows), first at row 112' },
    { at: '02:00:08.245', level: 'info', source: 'run', text: 'failed after 4.2s' },
]

function Details({ run }: { run: Run }) {
    return (
        <>
            <PanelSection title="Run">
                <DescriptionList
                    termWidth="6rem"
                    items={[
                        { term: 'Job', value: run.job, code: true },
                        { term: 'State', value: <StatusChip status={run.state} /> },
                        { term: 'Started by', value: run.by },
                        { term: 'Started', value: run.started },
                        { term: 'Duration', value: run.duration },
                    ]}
                />
            </PanelSection>
            <PanelSection title="Steps">
                <Timeline
                    events={[
                        { id: 'fetch', title: <span className="font-mono">fetch</span>, at: '02:00:05', tone: 'succeeded' },
                        { id: 'transform', title: <span className="font-mono">transform</span>, at: '02:00:06', tone: 'succeeded' },
                        {
                            id: 'validate',
                            title: <span className="font-mono">validate</span>,
                            at: '02:00:08',
                            detail: '37 rows rejected',
                            tone: 'failed',
                        },
                        { id: 'upload', title: <span className="font-mono">upload</span>, detail: 'skipped', tone: 'skipped' },
                    ]}
                />
            </PanelSection>
        </>
    )
}

function Workspace({ dock = false }: { dock?: boolean }) {
    const [rail, setRail] = useState(240)
    const [panel, setPanel] = useState(352)
    const [dockSize, setDockSize] = useState(200)
    const [dockOpen, setDockOpen] = useState(true)
    const [collapsed, setCollapsed] = useState(false)
    const [dark, setDark] = useState(true)
    const [query, setQuery] = useState('')
    const [chosen, setChosen] = useState<Run>(RUNS[1])
    const [panelOpen, setPanelOpen] = useState<boolean | undefined>(undefined)
    const rows = RUNS.filter((run) => run.job.includes(query.trim()))
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        defaultOpen={['projects']}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        width={rail}
                        onWidthChange={setRail}
                        foot={
                            <AccountMenu
                                name="ada"
                                image={pictureOf('ada')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSettings={() => undefined}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Tidevann', href: '#' }, { label: 'Runs' }]}
                        onSearch={() => undefined}
                        actions={<ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />}
                    />
                }
                foot={
                    <StatusLine note="import-orders is running" tone="live" live>
                        <StatusItem label="runs today">248</StatusItem>
                        <StatusItem>1.4.0</StatusItem>
                    </StatusLine>
                }
                panelOpen={panelOpen}
                onPanelOpenChange={setPanelOpen}
                panel={
                    <SidePanel
                        tabs={[
                            { id: 'details', label: 'Details', content: <Details run={chosen} /> },
                            { id: 'log', label: 'Log', content: <LogView lines={LOG} wrap numbered={false} className="m-3" /> },
                        ]}
                        active="details"
                        size={panel}
                        onSizeChange={setPanel}
                    />
                }
            >
                <Stack gap="none" className="h-full min-h-0">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <Page>
                            <PageHeader
                                title="Runs"
                                count="248 today"
                                actions={
                                    <Button size="sm">
                                        <Plus aria-hidden />
                                        New
                                    </Button>
                                }
                            />
                            <DataTable
                                toolbar={
                                    <>
                                        <SearchField
                                            value={query}
                                            onChange={setQuery}
                                            placeholder="Search"
                                            className="w-full max-w-64 min-w-40"
                                        />
                                        <FilterChip
                                            facet="State"
                                            options={STATUS_OPTIONS}
                                            multiple
                                            defaultSelected={['failed', 'running']}
                                        />
                                        <FilterChip facet="Job" options={JOB_OPTIONS} multiple />
                                        <FilterChip facet="Started by" options={PEOPLE_OPTIONS} multiple />
                                    </>
                                }
                                columns={COLUMNS}
                                rows={rows}
                                rowKey={(run) => run.id}
                                onOpen={(run) => {
                                    setChosen(run)
                                    setPanelOpen(true)
                                }}
                                opened={(run) => run.id === chosen.id}
                                total={248}
                                minWidth="36rem"
                            />
                        </Page>
                    </div>
                    {dock && (
                        <Dock
                            title="Log, nightly-export"
                            open={dockOpen}
                            onOpenChange={setDockOpen}
                            size={dockSize}
                            onSizeChange={setDockSize}
                        >
                            <LogView lines={LOG} className="rounded-none" />
                        </Dock>
                    )}
                </Stack>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Workspace' }
export default meta

export const ListAndPanel: StoryObj = { name: 'List and panel', render: () => <Workspace /> }
export const WithDock: StoryObj = { name: 'Log dock', render: () => <Workspace dock /> }
