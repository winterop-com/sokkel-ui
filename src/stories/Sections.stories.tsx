import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, CalendarClock, Library, Maximize2, Play, Server, Webhook, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Section, Surface } from '@winterop-com/sokkel-ui/Section'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TidevannMark } from './fixtures/TidevannMark'
import { Columns, Row, Split } from '@winterop-com/sokkel-ui/Layout'

/**
 * A job's overview page in the three ways a page can be divided, drawn with the shell and
 * the rail: flat sections (headings over a rule, content on the page's ground), boxed panels
 * (every section a bordered surface with a head bar), and the hybrid (flat headings, with a box
 * only around content that is a surface of its own).
 */
const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#', active: true },
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

interface Run {
    id: string
    status: Status
    at: string
    took: string
}

const RUNS: Run[] = [
    { id: '01a1a5c6', status: 'succeeded', at: '2 min ago', took: '1.4s' },
    { id: '01a1a5c2', status: 'failed', at: '6 min ago', took: '0.3s' },
    { id: '01a1a5b1', status: 'succeeded', at: '12 min ago', took: '8.2s' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'id', header: 'Run', width: '7rem', cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.id}</span> },
    { id: 'status', header: 'Status', width: '8rem', cell: (run) => <StatusChip status={run.status} /> },
    { id: 'at', header: 'Started', width: 'minmax(0,1fr)', cell: (run) => <span className="text-xs text-muted-foreground">{run.at}</span> },
    { id: 'took', header: 'Took', width: '4rem', align: 'end', cell: (run) => <span className="font-mono text-xs">{run.took}</span> },
]

function Graph() {
    return (
        <div className="relative h-44">
            <Row gap="3xl" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {['fetch', 'validate', 'upload'].map((step, at) => (
                    <Row key={step} gap="3xl">
                        <div className="rounded-node border border-node-line bg-node px-3 py-1.5 font-mono text-xs">
                            <p className="font-medium">{step}</p>
                            <p className="text-faint">{['http.get', 'rows.check', 'bucket.put'][at]}</p>
                        </div>
                        {at < 2 && <div className="h-px w-8 bg-border-strong" />}
                    </Row>
                ))}
            </Row>
        </div>
    )
}

function RunsList() {
    return <DataTable variant="list" columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} />
}

function Facts() {
    return (
        <DescriptionList
            items={[
                { term: 'Schedule', value: 'every day at 02:00 (UTC)' },
                { term: 'Webhook', value: 'orders-inbox', code: true },
                { term: 'Services', value: 'api, worker', code: true },
            ]}
        />
    )
}

const tool = (
    <IconButton label="Open the graph in a window">
        <Maximize2 aria-hidden />
    </IconButton>
)

/** What the runs offer at their head's end. */
const runTools = (
    <>
        <Button variant="ghost" size="sm">
            Retry failed
        </Button>
        <Button variant="ghost" size="sm">
            Cancel queued
        </Button>
        <Button variant="ghost" size="sm">
            All runs
        </Button>
    </>
)

function Overview({ layout }: { layout: 'flat' | 'boxed' | 'hybrid' }) {
    const sections: ReactNode =
        layout === 'boxed' ? (
            <>
                <Section variant="boxed" title="Graph" actions={tool} flush>
                    <Graph />
                </Section>
                <Split
                    align="stretch"
                    width="third"
                    gap="page"
                    aside={
                        <Section variant="boxed" title="Details">
                            <Facts />
                        </Section>
                    }
                >
                    <Section variant="boxed" title="Recent runs" meta="3" actions={runTools}>
                        <RunsList />
                    </Section>
                </Split>
            </>
        ) : layout === 'flat' ? (
            <>
                <Section title="Graph" actions={tool}>
                    <Graph />
                </Section>
                <Split
                    align="stretch"
                    width="third"
                    gap="page"
                    aside={
                        <Section title="Details">
                            <Facts />
                        </Section>
                    }
                >
                    <Section title="Recent runs" meta="3" actions={runTools}>
                        <RunsList />
                    </Section>
                </Split>
            </>
        ) : (
            <>
                <Section title="Graph" actions={tool}>
                    <Surface>
                        <Graph />
                    </Surface>
                </Section>
                <Split
                    align="stretch"
                    width="third"
                    gap="page"
                    aside={
                        <Section title="Details">
                            <Facts />
                        </Section>
                    }
                >
                    <Section title="Recent runs" meta="3" actions={runTools}>
                        <RunsList />
                    </Section>
                </Split>
            </>
        )
    return (
        <Shell
            rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={GROUPS} onCollapsedChange={() => {}} />}
            top={
                <TopBar
                    trail={[{ label: 'Jobs' }]}
                    actions={<span className="font-mono text-xs text-muted-foreground">Tidevann 1.4.0</span>}
                />
            }
        >
            <Page>
                <PageHeader
                    title="Import orders"
                    code="import-orders"
                    actions={
                        <>
                            <Button variant="outline">Edit</Button>
                            <Button>Run</Button>
                        </>
                    }
                />
                {sections}
            </Page>
        </Shell>
    )
}

const meta: Meta<typeof Overview> = {
    title: 'Patterns/Sections',
    component: Overview,
}
export default meta

type Story = StoryObj<typeof Overview>

export const Flat: Story = { args: { layout: 'flat' } }
export const Boxed: Story = { args: { layout: 'boxed' } }
export const Hybrid: Story = { args: { layout: 'hybrid' } }

const LOG = Array.from({ length: 40 }, (_, at) => `02:00:${String(at).padStart(2, '0')}  validate  row ${String(at * 61 + 7)} checked`)

/** Two boxes that take the height they are given, their bodies scrolling inside: an editor beside its preview. */
export const Filling: StoryObj = {
    parameters: { frame: 'none' },
    render: () => (
        <Columns gap="lg" className="h-svh bg-background p-6 text-foreground">
            <Section title="Log" meta="40 lines" flush fill>
                <pre className="px-3 py-2 font-mono text-xs leading-5">{LOG.join('\n')}</pre>
            </Section>
            <Section title="Summary" fill>
                <p className="text-sm">2,184 rows checked, 37 refused. The run stopped at validate.</p>
            </Section>
        </Columns>
    ),
}
