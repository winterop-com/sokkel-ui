import { SliderField } from '../../components/SliderField'
import { TextField } from '../../components/TextField'
import { IconButton } from '../../components/IconButton'
import { CopyButton } from '../../components/CopyButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    BookText,
    Columns3,
    Database,
    FlaskConical,
    Gauge,
    History as HistoryIcon,
    KeyRound,
    ListChecks,
    Pencil,
    Play,
    Plus,
    RotateCcw,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { CodeEditor } from '../../components/CodeEditor'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { DescriptionList } from '../../components/DescriptionList'
import { Field } from '../../components/Field'
import { FilterChip } from '../../components/FilterChip'
import { Inspector, InspectorSection } from '../../components/Inspector'
import { Markdown } from '../../components/Markdown'
import { PageHeader } from '../../components/PageHeader'
import { Rail, type RailGroup } from '../../components/Rail'
import { SearchField } from '../../components/SearchField'
import { Section, Surface } from '../../components/Section'
import { Page, Shell } from '../../components/Shell'
import { PanelSection, SidePanel } from '../../components/SidePanel'
import { StatusChip, type Status } from '../../components/StatusChip'
import { TopBar, type Crumb } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { Kbd } from '../../components/ui/kbd'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import { TooltipProvider } from '../../components/ui/tooltip'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Row, Stack } from '../../components/Layout'

/**
 * A model playground in the library's frame: a prompt in the editor with its variables and the
 * answer under it, the parameters in the side panel, the same prompt answered by three models side
 * by side with one still streaming, and the history of runs with the chosen one in an inspector.
 */
type View = 'prompt' | 'compare' | 'history'

const MODELS = [
    { id: 'tide-large', note: 'The most capable, and the slowest. 128k tokens of context.' },
    { id: 'tide-medium', note: 'Balanced for most prompts. 64k tokens of context.' },
    { id: 'tide-small', note: 'The fastest and cheapest. 32k tokens of context.' },
]

const PROMPT = `Write a short note to the team about why nightly-export failed last night.

Say which step failed, how many rows it rejected and why, and what we changed so it does not happen again. Keep it under a hundred words, and end with who to ask.

{{log}}`

const LOG = `02:00:05 fetch      read 2,184 rows in 0.9s
02:00:06 transform  currency missing on 12 rows; assumed EUR
02:00:08 validate   amount must be a number (37 rows), first at row 112
02:00:08 run        failed after 4.2s`

const SYSTEM =
    'You write for an operations team. Be plain and specific, name jobs and steps in code, and never guess at a cause the log does not show.'

const ANSWER = `**nightly-export failed at \`validate\` last night.** It read 2,184 rows, and 37 of them carried an \`amount\` that was not a number: most were written with a decimal comma, such as \`12,50\`.

We now parse amounts with the source's locale in \`transform\`, so those rows pass, and blanks are dropped before \`validate\`. Tonight's run should go through.

Ask ada if anything looks off.`

const ANSWERS: { model: string; state: Status; text: string; tokens: number; latency: string; first: string; rate: string }[] = [
    { model: 'tide-large', state: 'succeeded', text: ANSWER, tokens: 112, latency: '2.31 s', first: '240 ms', rate: '48 tok/s' },
    {
        model: 'tide-medium',
        state: 'succeeded',
        text: `nightly-export stopped at the \`validate\` step: **37 of 2,184 rows** had an \`amount\` that was not a number, mostly decimal commas like \`12,50\`.

- \`transform\` now parses amounts with the source's locale.
- Blank amounts are dropped before \`validate\`.

The next run is tonight at 02:00. Questions go to ada.`,
        tokens: 86,
        latency: '1.12 s',
        first: '130 ms',
        rate: '77 tok/s',
    },
    {
        model: 'tide-small',
        state: 'running',
        text: `Last night nightly-export failed in \`validate\`. 37 rows had amounts that were not numbers, because they used a comma as the decimal`,
        tokens: 31,
        latency: '0.62 s',
        first: '70 ms',
        rate: '50 tok/s',
    },
]

interface Run {
    id: string
    prompt: string
    model: string
    state: Status
    tokens: number
    latency: string
    when: string
    by: string
}

const RUNS: Run[] = [
    {
        id: 'run-0418',
        prompt: 'failure-note',
        model: 'tide-small',
        state: 'running',
        tokens: 31,
        latency: '0.6 s',
        when: '09:42',
        by: 'ada',
    },
    {
        id: 'run-0417',
        prompt: 'failure-note',
        model: 'tide-medium',
        state: 'succeeded',
        tokens: 86,
        latency: '1.1 s',
        when: '09:42',
        by: 'ada',
    },
    {
        id: 'run-0416',
        prompt: 'failure-note',
        model: 'tide-large',
        state: 'succeeded',
        tokens: 112,
        latency: '2.3 s',
        when: '09:42',
        by: 'ada',
    },
    {
        id: 'run-0415',
        prompt: 'digest-summary',
        model: 'tide-medium',
        state: 'succeeded',
        tokens: 248,
        latency: '2.9 s',
        when: '09:18',
        by: 'grace',
    },
    {
        id: 'run-0414',
        prompt: 'digest-summary',
        model: 'tide-medium',
        state: 'failed',
        tokens: 0,
        latency: '30.0 s',
        when: '09:16',
        by: 'grace',
    },
    {
        id: 'run-0413',
        prompt: 'order-tags',
        model: 'tide-small',
        state: 'succeeded',
        tokens: 14,
        latency: '0.3 s',
        when: '08:57',
        by: 'linus',
    },
    {
        id: 'run-0412',
        prompt: 'order-tags',
        model: 'tide-small',
        state: 'succeeded',
        tokens: 15,
        latency: '0.3 s',
        when: '08:57',
        by: 'linus',
    },
    {
        id: 'run-0411',
        prompt: 'index-report',
        model: 'tide-large',
        state: 'cancelled',
        tokens: 402,
        latency: '6.8 s',
        when: '08:31',
        by: 'margaret',
    },
    {
        id: 'run-0410',
        prompt: 'index-report',
        model: 'tide-large',
        state: 'succeeded',
        tokens: 1_204,
        latency: '18.4 s',
        when: 'yesterday',
        by: 'margaret',
    },
    {
        id: 'run-0409',
        prompt: 'failure-note',
        model: 'tide-large',
        state: 'succeeded',
        tokens: 104,
        latency: '2.2 s',
        when: 'yesterday',
        by: 'ada',
    },
]

const COLUMNS: DataColumn<Run>[] = [
    {
        id: 'prompt',
        header: 'Prompt',
        width: 'minmax(9rem,1fr)',
        cell: (run) => <span className="font-mono">{run.prompt}</span>,
        sortValue: (run) => run.prompt,
    },
    {
        id: 'model',
        header: 'Model',
        width: '7.5rem',
        cell: (run) => <span className="font-mono text-muted-foreground">{run.model}</span>,
        sortValue: (run) => run.model,
    },
    { id: 'state', header: 'State', width: '6.5rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    {
        id: 'tokens',
        header: 'Tokens',
        width: '5rem',
        align: 'end',
        cell: (run) => <span className="tabular-nums">{run.tokens.toLocaleString('en-US')}</span>,
        sortValue: (run) => run.tokens,
    },
    {
        id: 'latency',
        header: 'Latency',
        width: '5.5rem',
        align: 'end',
        cell: (run) => <span className="tabular-nums">{run.latency}</span>,
        sortValue: (run) => Number.parseFloat(run.latency),
    },
    {
        id: 'when',
        header: 'When',
        width: '6rem',
        cell: (run) => <span className="text-muted-foreground tabular-nums">{run.when}</span>,
        sortValue: (run) => run.id,
    },
]

function groups(view: View): RailGroup[] {
    return [
        {
            id: 'try',
            entries: [
                { id: 'prompt', label: 'Playground', icon: FlaskConical, href: '#', active: view === 'prompt' },
                { id: 'compare', label: 'Compare', icon: Columns3, href: '#', active: view === 'compare' },
                { id: 'history', label: 'History', icon: HistoryIcon, href: '#', active: view === 'history' },
            ],
        },
        {
            id: 'library',
            title: 'Library',
            entries: [
                {
                    id: 'prompts',
                    label: 'Prompts',
                    icon: BookText,
                    href: '#',
                    entries: [
                        { id: 'failure-note', label: 'failure-note', href: '#' },
                        { id: 'digest-summary', label: 'digest-summary', href: '#' },
                        { id: 'order-tags', label: 'order-tags', href: '#' },
                        { id: 'index-report', label: 'index-report', href: '#' },
                    ],
                },
                { id: 'datasets', label: 'Datasets', icon: Database, href: '#' },
                {
                    id: 'evaluations',
                    label: 'Evaluations',
                    icon: ListChecks,
                    entries: [
                        { id: 'suites', label: 'Suites', href: '#' },
                        { id: 'scorers', label: 'Scorers', href: '#' },
                        { id: 'reports', label: 'Reports', href: '#', count: 2 },
                    ],
                },
            ],
        },
        {
            id: 'workspace',
            title: 'Workspace',
            entries: [
                { id: 'keys', label: 'API keys', icon: KeyRound, href: '#' },
                { id: 'usage', label: 'Usage', icon: Gauge, href: '#' },
            ],
        },
    ]
}

const TRAILS: Record<View, Crumb[]> = {
    prompt: [
        { label: 'Prompts', href: '#' },
        { label: 'failure-note', code: true },
    ],
    compare: [{ label: 'Prompts', href: '#' }, { label: 'failure-note', href: '#', code: true }, { label: 'Compare' }],
    history: [{ label: 'History' }],
}

/** A sampling setting, held here as the playground would hold it. */
function Tuning({
    id,
    label,
    value,
    max,
    step,
    help,
}: {
    id: string
    label: string
    value: number
    max: number
    step: number
    help: string
}) {
    const [current, setCurrent] = useState(value)
    return (
        <SliderField
            id={id}
            label={label}
            value={current}
            onChange={setCurrent}
            max={max}
            step={step}
            format={(number) => number.toFixed(1)}
            help={help}
        />
    )
}

function Parameters() {
    const [model, setModel] = useState('tide-large')
    return (
        <>
            <PanelSection title="Model">
                <Field id="model" label="Model" help={MODELS.find((one) => one.id === model)?.note}>
                    <NativeSelect id="model" value={model} onChange={(event) => setModel(event.target.value)} className="w-full font-mono">
                        {MODELS.map((one) => (
                            <NativeSelectOption key={one.id} value={one.id}>
                                {one.id}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
            </PanelSection>
            <PanelSection title="Sampling">
                <div className="flex flex-col gap-5">
                    <Tuning
                        id="temperature"
                        label="Temperature"
                        value={0.7}
                        max={2}
                        step={0.1}
                        help="Higher is more varied, lower more literal."
                    />
                    <Tuning
                        id="top-p"
                        label="Top p"
                        value={0.9}
                        max={1}
                        step={0.05}
                        help="Only the likeliest tokens up to this share are drawn from."
                    />
                </div>
            </PanelSection>
            <PanelSection title="Length">
                <Stack gap="lg">
                    <TextField id="max-tokens" label="Max tokens" hint="up to 8,192" type="number" defaultValue={1024} numeric />
                    <TextField id="stop" label="Stop sequences" hint="comma separated" placeholder="###, END" mono />
                </Stack>
            </PanelSection>
            <PanelSection title="System prompt">
                <Textarea aria-label="System prompt" rows={5} defaultValue={SYSTEM} className="text-sm" />
            </PanelSection>
        </>
    )
}

/** The answer's facts in one quiet line: tokens, time, time to the first token, and speed. */
function Usage({
    tokens,
    latency,
    first,
    rate,
    live = false,
}: {
    tokens: number
    latency: string
    first: string
    rate?: string
    live?: boolean
}) {
    return (
        <Row gap="none" wrap className="gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums">
            <span>
                <span className="text-foreground">{tokens}</span> tokens{live ? ' so far' : ''}
            </span>
            <span>
                <span className="text-foreground">{latency}</span>
            </span>
            <span>first token {first}</span>
            {rate !== undefined && <span>{rate}</span>}
        </Row>
    )
}

function PromptPage() {
    const [prompt, setPrompt] = useState(PROMPT)
    const [log, setLog] = useState(LOG)
    const answer = ANSWERS[0]
    return (
        <Page>
            <PageHeader
                title="Failure note"
                code="failure-note"
                actions={
                    <>
                        <Button size="sm" variant="outline">
                            Save
                        </Button>
                        <Button size="sm">
                            <Play className="fill-current" aria-hidden />
                            Run
                            <Kbd className="ml-1 bg-primary-foreground/15 text-primary-foreground max-md:hidden">⌘↵</Kbd>
                        </Button>
                    </>
                }
            />
            <Section title="Prompt" meta="184 tokens">
                <CodeEditor label="Prompt" value={prompt} onChange={setPrompt} wrap lineNumbers={false} className="h-48" />
            </Section>
            <Section title="Variables" meta="1">
                <Field id="log" label="log" mono hint="pasted, 4 lines">
                    <CodeEditor label="log" value={log} onChange={setLog} className="h-28" />
                </Field>
            </Section>
            <Surface className="lg:hidden">
                <h2 className="flex h-(--density-panel-head) items-center border-b border-border-strong bg-panel-ground px-(--density-panel-pad) text-sm font-medium">
                    Parameters
                </h2>
                <Parameters />
            </Surface>
            <Section
                title="Answer"
                meta={answer.model}
                actions={
                    <>
                        <CopyButton value={answer.text} words={{ copy: 'Copy the answer', copied: 'Copied' }} />
                        <IconButton label="Run again">
                            <RotateCcw aria-hidden />
                        </IconButton>
                    </>
                }
            >
                <Stack gap="lg">
                    <Markdown content={answer.text} />
                    <div className="border-t border-border pt-3">
                        <Usage tokens={answer.tokens} latency={answer.latency} first={answer.first} rate={answer.rate} />
                    </div>
                </Stack>
            </Section>
        </Page>
    )
}

function ComparePage() {
    return (
        <Page>
            <PageHeader
                title="Compare"
                count="3 models"
                actions={
                    <>
                        <Button size="sm" variant="outline">
                            <Plus aria-hidden />
                            Add a model
                        </Button>
                        <Button size="sm">
                            <Play className="fill-current" aria-hidden />
                            Run all
                        </Button>
                    </>
                }
            />
            <Surface className="flex items-start gap-3 p-(--density-panel-pad)">
                <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted-foreground">failure-note, temperature 0.7, max 1,024 tokens</p>
                    <p className="mt-1 line-clamp-2 text-sm">
                        Write a short note to the team about why nightly-export failed last night. Say which step failed, how many rows it
                        rejected and why, and what we changed so it does not happen again.
                    </p>
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground">
                    <Pencil aria-hidden />
                    Edit
                </Button>
            </Surface>
            <div className="grid gap-(--density-inspector-gap) lg:grid-cols-3">
                {ANSWERS.map((answer) => (
                    <Section
                        key={answer.model}
                        title={<span className="font-mono">{answer.model}</span>}
                        actions={<StatusChip status={answer.state} label={answer.state === 'running' ? 'streaming' : 'done'} />}
                        flush
                        className="grid grid-rows-[auto_1fr]"
                    >
                        <Stack gap="none" className="h-full min-h-72">
                            <div className="flex-1 p-(--density-panel-pad)">
                                <Markdown content={answer.text} streaming={answer.state === 'running'} />
                                {answer.state === 'running' && (
                                    <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-mini bg-primary" />
                                )}
                            </div>
                            <div className="border-t border-border px-(--density-panel-pad) py-2.5">
                                <Usage
                                    tokens={answer.tokens}
                                    latency={answer.latency}
                                    first={answer.first}
                                    live={answer.state === 'running'}
                                />
                            </div>
                        </Stack>
                    </Section>
                ))}
            </div>
        </Page>
    )
}

function HistoryPage() {
    const [query, setQuery] = useState('')
    const [chosen, setChosen] = useState<Run>(RUNS[2])
    const rows = RUNS.filter((run) => run.prompt.includes(query.trim()))
    return (
        <Page className="h-full">
            <PageHeader title="History" count="1,284 runs" />
            <div className="flex min-h-0 flex-1 items-start gap-(--density-inspector-gap)">
                <DataTable
                    toolbar={
                        <>
                            <SearchField
                                value={query}
                                onChange={setQuery}
                                placeholder="Search prompts"
                                className="w-full max-w-64 min-w-40"
                            />
                            <FilterChip facet="Model" />
                            <FilterChip facet="State" />
                            <FilterChip facet="Project" value="larkspur" onClear={() => undefined} />
                            <FilterChip facet="By" />
                        </>
                    }
                    columns={COLUMNS}
                    rows={rows}
                    rowKey={(run) => run.id}
                    onOpen={setChosen}
                    opened={(run) => run.id === chosen.id}
                    total={1_284}
                    minWidth="40rem"
                    className="min-w-0 flex-1"
                />
                <div className="hidden self-stretch xl:flex">
                    <Inspector
                        title={<span className="font-mono">{chosen.prompt}</span>}
                        code={chosen.id}
                        status={
                            <>
                                <StatusChip status={chosen.state} />
                                <span>
                                    by <span className="text-foreground">{chosen.by}</span> at {chosen.when}
                                </span>
                            </>
                        }
                        actions={
                            <>
                                <Button size="sm" variant="outline">
                                    <FlaskConical aria-hidden />
                                    Open in playground
                                </Button>
                                <Button size="sm" variant="ghost">
                                    <Columns3 aria-hidden />
                                    Compare
                                </Button>
                            </>
                        }
                        menu={
                            <>
                                <DropdownMenuItem>Copy the request</DropdownMenuItem>
                                <DropdownMenuItem>Add to a dataset</DropdownMenuItem>
                            </>
                        }
                    >
                        <InspectorSection title="Parameters">
                            <DescriptionList
                                termWidth="7rem"
                                items={[
                                    { term: 'Model', value: chosen.model, code: true },
                                    { term: 'Temperature', value: '0.7', code: true },
                                    { term: 'Top p', value: '0.9', code: true },
                                    { term: 'Max tokens', value: '1,024', code: true },
                                ]}
                            />
                        </InspectorSection>
                        <InspectorSection title="Usage">
                            <DescriptionList
                                termWidth="7rem"
                                items={[
                                    { term: 'Tokens in', value: '184' },
                                    { term: 'Tokens out', value: chosen.tokens.toLocaleString('en-US') },
                                    { term: 'Latency', value: chosen.latency },
                                    { term: 'First token', value: '240 ms' },
                                ]}
                            />
                        </InspectorSection>
                        <InspectorSection title="Answer">
                            <Markdown content={ANSWER} className="text-muted-foreground" />
                        </InspectorSection>
                    </Inspector>
                </div>
            </div>
        </Page>
    )
}

function PlaygroundApp({ view, children }: { view: View; children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(view)}
                        defaultOpen={['prompts']}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSettings={() => undefined} />}
                    />
                }
                top={<TopBar trail={TRAILS[view]} onSearch={() => undefined} />}
                panel={
                    view === 'prompt' ? (
                        <SidePanel tabs={[{ id: 'parameters', label: 'Parameters', content: <Parameters /> }]} />
                    ) : undefined
                }
            >
                {children}
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Playground' }
export default meta

/** A prompt in the editor with its variable and the answer under it, the model and sampling in the side panel. */
export const Prompt: StoryObj = {
    render: () => (
        <PlaygroundApp view="prompt">
            <PromptPage />
        </PlaygroundApp>
    ),
}

/** The same prompt answered by three models side by side, the last still streaming, each with its tokens and timing. */
export const Compare: StoryObj = {
    render: () => (
        <PlaygroundApp view="compare">
            <ComparePage />
        </PlaygroundApp>
    ),
}

/** Every run with its model, tokens and latency, the chosen one in the inspector with its parameters and answer. */
export const History: StoryObj = {
    render: () => (
        <PlaygroundApp view="history">
            <HistoryPage />
        </PlaygroundApp>
    ),
}
