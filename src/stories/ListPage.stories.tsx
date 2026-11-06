import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, CalendarClock, Library, Play, Server, Webhook, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AccountMenu } from '../components/AccountMenu'
import { CodeField } from '../components/CodeField'
import { DataTable, type DataColumn } from '../components/DataTable'
import { DescriptionList } from '../components/DescriptionList'
import { Field } from '../components/Field'
import { FilterChip } from '../components/FilterChip'
import { PageHeader } from '../components/PageHeader'
import { Problem } from '../components/Problem'
import { Rail, type RailGroup } from '../components/Rail'
import { SearchField } from '../components/SearchField'
import { PanelSection, SidePanel } from '../components/SidePanel'
import { StatusChip, type Status as RunStatus } from '../components/StatusChip'
import { Section } from '../components/Section'
import { SwitchField } from '../components/SwitchField'
import { Page, Shell } from '../components/Shell'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { TidevannMark } from './fixtures/TidevannMark'

/**
 * The Runs page built from the library alone, with real-shaped data and working controls: the
 * search narrows the rows, the status filter can be set and cleared, and a row opens beside the
 * list. A second story is a form in a boxed section.
 */
interface Run {
    id: string
    job: string
    status: string
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
    { id: '01a1a580', job: 'import-orders', status: 'failed', step: 'validate', at: '41 min ago', took: '0.2s' },
    { id: '01a1a571', job: 'send-digest', status: 'succeeded', step: null, at: '58 min ago', took: '5.1s' },
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

const Status = ({ status }: { status: string }) => <StatusChip status={status as RunStatus} />

/** How long a run took in seconds, for sorting; a run still going sorts last. */
const seconds = (run: Run) => (run.took === '-' ? Number.POSITIVE_INFINITY : Number.parseFloat(run.took))

const COLUMNS: DataColumn<Run>[] = [
    {
        id: 'run',
        header: 'Run',
        width: '6rem',
        cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.id}</span>,
        sortValue: (run) => run.id,
    },
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(0,1fr)',
        cell: (run) => (
            <>
                {run.job}
                {run.step !== null && <span className="text-faint"> at {run.step}</span>}
            </>
        ),
        sortValue: (run) => run.job,
    },
    { id: 'status', header: 'Status', width: '10rem', cell: (run) => <Status status={run.status} />, sortValue: (run) => run.status },
    {
        id: 'started',
        header: 'Started',
        width: '7rem',
        cell: (run) => <span className="text-xs text-muted-foreground">{run.at}</span>,
        sortValue: (run) => Number.parseInt(run.at, 10),
    },
    {
        id: 'took',
        header: 'Took',
        width: '4rem',
        align: 'end',
        cell: (run) => <span className="font-mono text-xs">{run.took}</span>,
        sortValue: seconds,
    },
]

function Frame({
    children,
    active = 'runs',
    panel,
    panelOpen,
    onPanelOpenChange,
    foot,
}: {
    children: React.ReactNode
    active?: string
    panel?: React.ReactNode
    panelOpen?: boolean
    onPanelOpenChange?: (open: boolean) => void
    foot?: React.ReactNode
}) {
    const [collapsed, setCollapsed] = useState(false)
    const groups = GROUPS.map((group) => ({
        ...group,
        entries: group.entries.map((entry) => ({ ...entry, active: entry.id === active })),
    }))
    return (
        <Shell
            rail={
                <Rail
                    mark={<TidevannMark />}
                    name="Tidevann"
                    groups={groups}
                    collapsed={collapsed}
                    onCollapsedChange={setCollapsed}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="api.example.org · 1.4.0"
                            collapsed={collapsed}
                            onSettings={() => {}}
                            onShortcuts={() => {}}
                            onSignOut={() => {}}
                        />
                    }
                />
            }
            panel={panel}
            panelOpen={panelOpen}
            onPanelOpenChange={onPanelOpenChange}
            foot={foot}
            top={
                <>
                    <span className="text-sm text-muted-foreground">{active === 'runs' ? 'Runs' : 'Services'}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">Tidevann 1.4.0</span>
                </>
            }
        >
            {children}
        </Shell>
    )
}

function RunsListPage() {
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState<string | undefined>('failed')
    const [chosen, setChosen] = useState<string>('01a1a5c2')
    const [panelOpen, setPanelOpen] = useState<boolean | undefined>(undefined)
    const rows = useMemo(
        () => RUNS.filter((run) => (status === undefined || run.status === status) && run.job.includes(query.trim())),
        [query, status],
    )
    const open = RUNS.find((run) => run.id === chosen) ?? null
    const [tab, setTab] = useState('run')
    const panel =
        open === null ? undefined : (
            <SidePanel
                active={tab}
                onActiveChange={setTab}
                tabs={[
                    {
                        id: 'run',
                        label: 'Run',
                        content: (
                            <>
                                <PanelSection title="State">
                                    <p className="text-sm">
                                        <Status status={open.status} />
                                        {open.step !== null && (
                                            <>
                                                {' '}
                                                at <span className="font-mono">{open.step}</span>
                                            </>
                                        )}
                                    </p>
                                    {open.status === 'failed' && (
                                        <Problem
                                            title="Invalid amount"
                                            detail="An `amount` is `n/a`. Amounts are written like `12.50`."
                                            technical="at $.amount: 'n/a' is not of type 'number'"
                                        />
                                    )}
                                </PanelSection>
                                <PanelSection title="Facts">
                                    <DescriptionList
                                        items={[
                                            { term: 'Job', value: open.job },
                                            { term: 'Started', value: open.at },
                                            { term: 'Took', value: open.took, code: true },
                                            { term: 'Run', value: open.id, code: true },
                                        ]}
                                    />
                                </PanelSection>
                            </>
                        ),
                    },
                    {
                        id: 'attempts',
                        label: 'Attempts',
                        content: (
                            <PanelSection title="Attempts">
                                <p className="text-sm text-muted-foreground">One attempt per step.</p>
                            </PanelSection>
                        ),
                    },
                ]}
            />
        )
    return (
        <Frame
            panel={panel}
            panelOpen={panelOpen}
            onPanelOpenChange={setPanelOpen}
            foot={
                <>
                    <span>{rows.length} shown</span>
                    <span className="ml-auto font-mono">{open?.id ?? ''}</span>
                </>
            }
        >
            <Page>
                <PageHeader title="Runs" count={`${RUNS.length} loaded`} actions={<Button>Run a job</Button>} />
                <div className="flex flex-wrap items-center gap-2">
                    <SearchField value={query} onChange={setQuery} placeholder="Search" className="w-64" />
                    <FilterChip
                        facet="Status"
                        value={status}
                        onOpen={() => setStatus(status === undefined ? 'failed' : status)}
                        onClear={() => setStatus(undefined)}
                    />
                    <FilterChip facet="Job" />
                    <FilterChip facet="Started by" />
                </div>
                <DataTable
                    columns={COLUMNS}
                    rows={rows}
                    rowKey={(run) => run.id}
                    opened={(run) => run.id === chosen}
                    onOpen={(run) => {
                        setChosen(run.id)
                        setPanelOpen(true)
                    }}
                    minWidth="32rem"
                    words={{ empty: 'No run matches.' }}
                />
            </Page>
        </Frame>
    )
}

function ServiceForm() {
    const [code, setCode] = useState('2-api')
    return (
        <Frame active="services">
            <Page>
                <PageHeader title="New service" />
                <Section title="Service">
                    <div className="@container grid gap-4 lg:grid-cols-2">
                        <CodeField id="code" value={code} onChange={setCode} />
                        <Field id="base-url" label="Base URL" hint="base_url" keyHint help="Where the service answers, without /v1.">
                            <Input
                                id="base-url"
                                className="font-mono"
                                defaultValue="https://api.example.org"
                                aria-describedby="base-url-help"
                            />
                        </Field>
                        <Field id="description" label="Description" className="lg:col-span-2">
                            <Textarea id="description" defaultValue="The orders API, read by the import jobs." />
                        </Field>
                        <div className="lg:col-span-2">
                            <SwitchField
                                id="verify-tls"
                                label="Verify TLS"
                                explain="Check that the server's HTTPS certificate is valid. Turn off only for a test server with a self-signed certificate."
                                defaultChecked
                            />
                        </div>
                        <div className="flex justify-end gap-2 lg:col-span-2">
                            <Button variant="ghost">Cancel</Button>
                            <Button>Create</Button>
                        </div>
                    </div>
                </Section>
            </Page>
        </Frame>
    )
}

const meta: Meta = { title: 'Patterns/Pages' }
export default meta

export const RunsList: StoryObj = { render: () => <RunsListPage /> }
export const Form: StoryObj = { render: () => <ServiceForm /> }
