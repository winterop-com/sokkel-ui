import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, CalendarClock, Library, Maximize2, Play, Server, Webhook, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'

import { DescriptionList } from '../components/DescriptionList'
import { type DataColumn, DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { Rail, type RailGroup } from '../components/Rail'
import { Section, Surface } from '../components/Section'
import { Page, Shell } from '../components/Shell'
import { StatusChip, type Status } from '../components/StatusChip'
import { Button } from '../components/ui/button'
import { TidevannMark } from './fixtures/TidevannMark'

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
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-10">
                {['fetch', 'validate', 'upload'].map((step, at) => (
                    <div key={step} className="flex items-center gap-10">
                        <div className="rounded-node border border-node-line bg-node px-3 py-1.5 font-mono text-xs">
                            <p className="font-medium">{step}</p>
                            <p className="text-faint">{['http.get', 'rows.check', 'bucket.put'][at]}</p>
                        </div>
                        {at < 2 && <div className="h-px w-8 bg-border-strong" />}
                    </div>
                ))}
            </div>
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
    <Button variant="ghost" size="icon-sm" aria-label="Open the graph in a window">
        <Maximize2 aria-hidden />
    </Button>
)

function Overview({ layout }: { layout: 'flat' | 'boxed' | 'hybrid' }) {
    const sections: ReactNode =
        layout === 'boxed' ? (
            <>
                <Section variant="boxed" title="Graph" actions={tool} flush>
                    <Graph />
                </Section>
                <div className="grid gap-(--density-page-gap) lg:grid-cols-[2fr_1fr]">
                    <Section variant="boxed" title="Recent runs" meta="3">
                        <RunsList />
                    </Section>
                    <Section variant="boxed" title="Details">
                        <Facts />
                    </Section>
                </div>
            </>
        ) : layout === 'flat' ? (
            <>
                <Section title="Graph" actions={tool}>
                    <Graph />
                </Section>
                <div className="grid gap-(--density-page-gap) lg:grid-cols-[2fr_1fr]">
                    <Section title="Recent runs" meta="3">
                        <RunsList />
                    </Section>
                    <Section title="Details">
                        <Facts />
                    </Section>
                </div>
            </>
        ) : (
            <>
                <Section title="Graph" actions={tool}>
                    <Surface>
                        <Graph />
                    </Surface>
                </Section>
                <div className="grid gap-(--density-page-gap) lg:grid-cols-[2fr_1fr]">
                    <Section title="Recent runs" meta="3">
                        <RunsList />
                    </Section>
                    <Section title="Details">
                        <Facts />
                    </Section>
                </div>
            </>
        )
    return (
        <Shell
            rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={GROUPS} onCollapsedChange={() => {}} />}
            top={
                <>
                    <span className="text-sm text-muted-foreground">Jobs</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">Tidevann 1.4.0</span>
                </>
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
