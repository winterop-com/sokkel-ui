import type { Meta, StoryObj } from '@storybook/react-vite'
import { Blocks, BookOpen, Cable, FileJson, Maximize2, Play, Workflow, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

import { Rail, type RailGroup } from '../components/Rail'
import { Section, Surface } from '../components/Section'
import { Page, Shell } from '../components/Shell'

/**
 * A pipeline's overview page in the three ways a page can be divided, drawn with the shell and
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
            { id: 'triggers', label: 'Triggers', icon: Zap, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'pipelines', label: 'Pipelines', icon: Workflow, href: '#', active: true },
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

const RUNS = [
    ['01a1a5c6', 'succeeded', '2 min ago', '1.4s'],
    ['01a1a5c2', 'failed', '6 min ago', '0.3s'],
    ['01a1a5b1', 'succeeded', '12 min ago', '8.2s'],
] as const

const TONE: Record<string, string> = {
    succeeded: 'bg-status-succeeded/15 text-status-succeeded-ink',
    failed: 'bg-status-failed/15 text-status-failed-ink',
}

function Graph() {
    return (
        <div className="relative h-44 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-10">
                {['fetch', 'gate', 'store'].map((step, at) => (
                    <div key={step} className="flex items-center gap-10">
                        <div className="rounded-node border border-node-line bg-node px-3 py-1.5 font-mono text-xs">
                            <p className="font-medium">{step}</p>
                            <p className="text-faint">{['http.request', 'validate.schema', 'storage.write'][at]}</p>
                        </div>
                        {at < 2 && <div className="h-px w-8 bg-border-strong" />}
                    </div>
                ))}
            </div>
        </div>
    )
}

function RunsList({ framed }: { framed: boolean }) {
    return (
        <div className={framed ? undefined : '-mx-1'}>
            {RUNS.map(([id, status, at, took]) => (
                <div
                    key={id}
                    className="grid h-(--density-row) grid-cols-[7rem_8rem_1fr_4rem] items-center gap-3 border-b border-border px-(--density-panel-pad) text-sm last:border-b-0"
                >
                    <span className="font-mono text-xs text-muted-foreground">{id}</span>
                    <span>
                        <span className={`rounded-chip px-1.5 py-0.5 text-xs ${TONE[status]}`}>{status}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{at}</span>
                    <span className="text-right font-mono text-xs">{took}</span>
                </div>
            ))}
        </div>
    )
}

function Facts() {
    return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Schedule</dt>
            <dd>every day at 06:00 (Europe/Oslo)</dd>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-mono text-xs">endpoint value-inbox</dd>
            <dt className="text-muted-foreground">Connections</dt>
            <dd className="font-mono text-xs">dhis2-play, mailpit</dd>
        </dl>
    )
}

const tool = (
    <button
        type="button"
        aria-label="Open the graph in a window"
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
    >
        <Maximize2 className="size-3.5" aria-hidden />
    </button>
)

function Overview({ layout }: { layout: 'flat' | 'boxed' | 'hybrid' }) {
    const sections: ReactNode =
        layout === 'boxed' ? (
            <>
                <Section variant="boxed" title="Graph" actions={tool} flush>
                    <Graph />
                </Section>
                <div className="grid gap-(--density-page-gap) lg:grid-cols-[2fr_1fr]">
                    <Section variant="boxed" title="Recent runs" meta="3" flush>
                        <RunsList framed />
                    </Section>
                    <Section variant="boxed" title="Triggers">
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
                        <RunsList framed={false} />
                    </Section>
                    <Section title="Triggers">
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
                        <Surface>
                            <RunsList framed />
                        </Surface>
                    </Section>
                    <Section title="Triggers">
                        <Facts />
                    </Section>
                </div>
            </>
        )
    return (
        <Shell
            rail={<Rail mark={<Workflow className="size-4" aria-hidden />} name="dirigent" groups={GROUPS} onCollapsedChange={() => {}} />}
            top={
                <>
                    <span className="text-sm text-muted-foreground">Pipelines</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">dirigent 0.36.0</span>
                </>
            }
        >
            <Page>
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-page font-medium tracking-tight">Weather gate</h1>
                        <p className="font-mono text-xs text-muted-foreground">weather-gate</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" className="h-(--density-control) rounded-control border border-input px-3 text-sm">
                            Edit
                        </button>
                        <button
                            type="button"
                            className="h-(--density-control) rounded-control bg-primary px-3 text-sm font-medium text-primary-foreground"
                        >
                            Run
                        </button>
                    </div>
                </div>
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
