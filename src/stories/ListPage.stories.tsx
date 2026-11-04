import type { Meta, StoryObj } from '@storybook/react-vite'
import { Blocks, BookOpen, Cable, FileJson, Play, Workflow, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AccountMenu } from '@/components/AccountMenu'
import { CodeField } from '@/components/CodeField'
import { Field } from '@/components/Field'
import { FilterChip } from '@/components/FilterChip'
import { ListTable, type Column } from '@/components/ListTable'
import { PageHeader } from '@/components/PageHeader'
import { Rail, type RailGroup } from '@/components/Rail'
import { SearchField } from '@/components/SearchField'
import { PanelSection, SidePanel } from '@/components/SidePanel'
import { StatusChip, type Status as RunStatus } from '@/components/StatusChip'
import { Section } from '@/components/Section'
import { SwitchField } from '@/components/SwitchField'
import { Page, Shell } from '@/components/Shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/**
 * The Runs page built from the library alone, with real-shaped data and working controls: the
 * search narrows the rows, the status filter can be set and cleared, and a row opens beside the
 * list. A second story is a form in a boxed section.
 */
interface Run {
    id: string
    pipeline: string
    status: string
    step: string | null
    at: string
    took: string
}

const RUNS: Run[] = [
    { id: '01a1a5c6', pipeline: 'dhis2-health', status: 'succeeded', step: null, at: '2 min ago', took: '1.4s' },
    { id: '01a1a5c2', pipeline: 'weather-gate', status: 'failed', step: 'gate', at: '6 min ago', took: '0.3s' },
    { id: '01a1a5b9', pipeline: 'fhir-tour', status: 'running', step: 'measure', at: '7 min ago', took: '-' },
    { id: '01a1a5b1', pipeline: 'connections-tour', status: 'succeeded', step: null, at: '12 min ago', took: '8.2s' },
    { id: '01a1a5a7', pipeline: 'dhis2-value-inbox', status: 'completed_with_errors', step: 'import', at: '14 min ago', took: '2.9s' },
    { id: '01a1a59e', pipeline: 'kafka-tour', status: 'queued', step: null, at: '15 min ago', took: '-' },
    { id: '01a1a591', pipeline: 'run-controls', status: 'cancelled', step: 'slow', at: '21 min ago', took: '4.0s' },
    { id: '01a1a588', pipeline: 'dhis2-blocks-local', status: 'succeeded', step: null, at: '33 min ago', took: '19.5s' },
    { id: '01a1a580', pipeline: 'weather-gate', status: 'failed', step: 'gate', at: '41 min ago', took: '0.2s' },
    { id: '01a1a571', pipeline: 'fhir-edits', status: 'succeeded', step: null, at: '58 min ago', took: '5.1s' },
]


const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'triggers', label: 'Triggers', icon: Zap, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'pipelines', label: 'Pipelines', icon: Workflow, href: '#' },
            { id: 'connections', label: 'Connections', icon: Cable, href: '#' },
            { id: 'schemas', label: 'Schemas', icon: FileJson, href: '#' },
        ],
    },
    {
        id: 'reference',
        title: 'Reference',
        entries: [
            { id: 'blocks', label: 'Blocks', icon: Blocks, href: '#' },
            { id: 'examples', label: 'Examples', icon: BookOpen, href: '#' },
        ],
    },
]

const Status = ({ status }: { status: string }) => <StatusChip status={status as RunStatus} />

const COLUMNS: Column<Run>[] = [
    { id: 'run', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.id}</span> },
    {
        id: 'pipeline',
        header: 'Pipeline',
        width: 'minmax(0,1fr)',
        cell: (run) => (
            <>
                {run.pipeline}
                {run.step !== null && <span className="text-faint"> at {run.step}</span>}
            </>
        ),
    },
    { id: 'status', header: 'Status', width: '10rem', cell: (run) => <Status status={run.status} /> },
    { id: 'started', header: 'Started', width: '7rem', cell: (run) => <span className="text-xs text-muted-foreground">{run.at}</span> },
    { id: 'took', header: 'Took', width: '4rem', align: 'end', cell: (run) => <span className="font-mono text-xs">{run.took}</span> },
]

function Frame({
    children,
    active = 'runs',
    panel,
    foot,
}: {
    children: React.ReactNode
    active?: string
    panel?: React.ReactNode
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
                    mark={<Workflow className="size-4" aria-hidden />}
                    name="dirigent"
                    groups={groups}
                    collapsed={collapsed}
                    onCollapsedChange={setCollapsed}
                    foot={
                        <AccountMenu
                            name="admin"
                            where="dirigent · local · 0.36.0"
                            collapsed={collapsed}
                            onSettings={() => {}}
                            onShortcuts={() => {}}
                            onSignOut={() => {}}
                        />
                    }
                />
            }
            panel={panel}
            foot={foot}
            top={
                <>
                    <span className="text-sm text-muted-foreground">{active === 'runs' ? 'Runs' : 'Connections'}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">dirigent 0.36.0</span>
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
    const rows = useMemo(
        () => RUNS.filter((run) => (status === undefined || run.status === status) && run.pipeline.includes(query.trim())),
        [query, status],
    )
    const open = RUNS.find((run) => run.id === chosen) ?? null
    const [tab, setTab] = useState('run')
    const panel =
        open === null ? undefined : (
            <SidePanel
                active={tab}
                onActiveChange={setTab}
                onClose={() => setChosen('')}
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
                                        <p className="rounded-control border border-critical/35 bg-critical/10 px-2.5 py-2 text-sm text-critical-ink">
                                            at $.station: &apos;oslo&apos; does not match the station code pattern
                                        </p>
                                    )}
                                </PanelSection>
                                <PanelSection title="Facts">
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                                        <dt className="text-muted-foreground">Pipeline</dt>
                                        <dd>{open.pipeline}</dd>
                                        <dt className="text-muted-foreground">Started</dt>
                                        <dd>{open.at}</dd>
                                        <dt className="text-muted-foreground">Took</dt>
                                        <dd className="font-mono">{open.took}</dd>
                                        <dt className="text-muted-foreground">Run</dt>
                                        <dd className="font-mono">{open.id}</dd>
                                    </dl>
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
            foot={
                <>
                    <span>{rows.length} shown</span>
                    <span className="ml-auto font-mono">{open?.id ?? ''}</span>
                </>
            }
        >
            <Page>
                <PageHeader title="Runs" count={`${RUNS.length} loaded`} actions={<Button>Run a pipeline</Button>} />
                <div className="flex flex-wrap items-center gap-2">
                    <SearchField value={query} onChange={setQuery} placeholder="Search runs" className="w-64" />
                    <FilterChip
                        facet="Status"
                        value={status}
                        onOpen={() => setStatus(status === undefined ? 'failed' : status)}
                        onClear={() => setStatus(undefined)}
                    />
                    <FilterChip facet="Pipeline" />
                    <FilterChip facet="Trigger" />
                </div>
                <ListTable
                    columns={COLUMNS}
                    rows={rows}
                    rowKey={(run) => run.id}
                    selected={(run) => run.id === chosen}
                    onSelect={(run) => setChosen(run.id)}
                    empty="No run matches."
                    foot={`${rows.length} of ${RUNS.length} loaded`}
                />
            </Page>
        </Frame>
    )
}

function ConnectionForm() {
    const [code, setCode] = useState('2-play')
    return (
        <Frame active="connections">
            <Page>
                <PageHeader title="New connection" />
                <Section title="Connection">
                    <div className="grid gap-4 @container lg:grid-cols-2">
                        <CodeField id="code" value={code} onChange={setCode} />
                        <Field id="base-url" label="Base URL" hint="base_url" keyHint help="Where the instance answers, without /api.">
                            <Input id="base-url" className="font-mono" defaultValue="https://play.dhis2.org/2.43" aria-describedby="base-url-help" />
                        </Field>
                        <Field id="description" label="Description" className="lg:col-span-2">
                            <Textarea id="description" defaultValue="The DHIS2 play demo, for the tour pipelines." />
                        </Field>
                        <div className="lg:col-span-2">
                            <SwitchField id="verify-tls" label="Verify TLS" explain="Check that the server's HTTPS certificate is valid. Turn off only for a test server with a self-signed certificate." defaultChecked />
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
export const Form: StoryObj = { render: () => <ConnectionForm /> }
