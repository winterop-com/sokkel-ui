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

import { AccountMenu } from '../../components/AccountMenu'
import { DescriptionList } from '../../components/DescriptionList'
import { Dock } from '../../components/Dock'
import { FilterChip } from '../../components/FilterChip'
import { ListTable, type Column } from '../../components/ListTable'
import { LogView, type LogLine } from '../../components/LogView'
import { PageHeader } from '../../components/PageHeader'
import { Rail, type RailGroup } from '../../components/Rail'
import { SearchField } from '../../components/SearchField'
import { Page, Shell } from '../../components/Shell'
import { PanelSection, SidePanel } from '../../components/SidePanel'
import { StatusChip, type Status } from '../../components/StatusChip'
import { StatusItem, StatusLine } from '../../components/StatusLine'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Timeline } from '../../components/Timeline'
import { TopBar } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * A whole app in the library's frame: the rail, the top bar with the trail and search, a list page
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
            { id: 'projects', label: 'Projects', icon: FolderGit2, href: '#' },
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
}

const RUNS: Run[] = [
    { id: 'r1', job: 'import-orders', state: 'running', by: 'schedule', started: '14:02', duration: '1m 12s' },
    { id: 'r2', job: 'nightly-export', state: 'failed', by: 'schedule', started: '02:00', duration: '4.2s' },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', by: 'ada', started: '01:40', duration: '6m 03s' },
    { id: 'r4', job: 'send-digest', state: 'succeeded', by: 'schedule', started: '01:00', duration: '12.8s' },
    { id: 'r5', job: 'sync-inventory', state: 'queued', by: 'grace', started: '-', duration: '-' },
    { id: 'r6', job: 'sync-inventory', state: 'cancelled', by: 'linus', started: 'yesterday', duration: '38s' },
    { id: 'r7', job: 'import-orders', state: 'succeeded', by: 'schedule', started: 'yesterday', duration: '1m 04s' },
    { id: 'r8', job: 'nightly-export', state: 'succeeded', by: 'schedule', started: 'yesterday', duration: '3.9s' },
]

const COLUMNS: Column<Run>[] = [
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => <span className="truncate font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} /> },
    { id: 'by', header: 'Started by', width: '7rem', cell: (run) => <span className="text-muted-foreground">{run.by}</span> },
    { id: 'started', header: 'Started', width: '6.5rem', cell: (run) => <span className="tabular-nums">{run.started}</span> },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (run) => <span className="tabular-nums">{run.duration}</span>,
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
    const [chosen, setChosen] = useState<Run | null>(RUNS[1])
    const rows = RUNS.filter((run) => run.job.includes(query.trim()))
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark="A"
                        name="atlas"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        width={rail}
                        onWidthChange={setRail}
                        foot={
                            <AccountMenu
                                name="ada"
                                where="atlas.example.org"
                                collapsed={collapsed}
                                onSettings={() => undefined}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'atlas', href: '#' }, { label: 'Runs' }]}
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
                panel={
                    chosen !== null ? (
                        <SidePanel
                            tabs={[
                                { id: 'details', label: 'Details', content: <Details run={chosen} /> },
                                { id: 'log', label: 'Log', content: <LogView lines={LOG} wrap numbered={false} className="m-3" /> },
                            ]}
                            active="details"
                            onClose={() => setChosen(null)}
                            size={panel}
                            onSizeChange={setPanel}
                        />
                    ) : undefined
                }
            >
                <div className="flex h-full min-h-0 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <Page>
                            <PageHeader
                                title="Runs"
                                count="248 today"
                                actions={
                                    <Button size="sm">
                                        <Plus aria-hidden />
                                        New run
                                    </Button>
                                }
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <SearchField value={query} onChange={setQuery} placeholder="Search runs" className="w-64" />
                                <FilterChip facet="State" value="failed, running" onClear={() => undefined} />
                                <FilterChip facet="Job" />
                                <FilterChip facet="Started by" />
                            </div>
                            <ListTable
                                columns={COLUMNS}
                                rows={rows}
                                rowKey={(run) => run.id}
                                selected={(run) => run.id === chosen?.id}
                                onSelect={setChosen}
                                foot={`${rows.length} of 248`}
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
                </div>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Workspace' }
export default meta

export const ListAndPanel: StoryObj = { name: 'List and panel', render: () => <Workspace /> }
export const WithDock: StoryObj = { name: 'Log dock', render: () => <Workspace dock /> }
