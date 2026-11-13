import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Code } from '@winterop-com/sokkel-ui/Code'
import { DescriptionList, DescriptionListGroup } from '@winterop-com/sokkel-ui/DescriptionList'
import { Group } from '@winterop-com/sokkel-ui/Group'
import { Inspector } from '@winterop-com/sokkel-ui/Inspector'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { JsonTree } from '@winterop-com/sokkel-ui/JsonTree'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Sparkline, Stat } from '@winterop-com/sokkel-ui/Stat'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Spinner } from '@winterop-com/sokkel-ui/primitives/spinner'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'

/** The ways a record's facts are shown: terms and values, numbers, events, logs and JSON. */
function Ground({ children }: { children: React.ReactNode }) {
    return <Stack gap="xl">{children}</Stack>
}

function Facts() {
    return (
        <Ground>
            <Section title="Run">
                <DescriptionList
                    columns={2}
                    items={[
                        { term: 'Job', value: 'import-orders', code: true },
                        { term: 'State', value: 'failed' },
                        { term: 'Started by', value: 'schedule, every hour' },
                        { term: 'Started', value: '2026-11-04 14:02', numeric: true },
                        { term: 'Duration', value: '4.2s', numeric: true },
                        { term: 'Retried from', value: null },
                        { term: 'Run', value: 'run_01JCF8Q2T7W4M3', code: true, wide: true },
                    ]}
                />
            </Section>
            <Section title="In a line">
                <DescriptionList
                    layout="row"
                    items={[
                        { term: 'Job', value: 'nightly-export', code: true },
                        { term: 'State', value: 'succeeded' },
                        { term: 'Duration', value: '12.8s', numeric: true },
                        { term: 'Started by', value: 'grace' },
                        { term: 'Project', value: 'harbor' },
                    ]}
                />
            </Section>
            <Section title="Service">
                <DescriptionList
                    layout="stacked"
                    columns={2}
                    items={[
                        { term: 'Base URL', value: 'https://api.example.org', code: true },
                        { term: 'Auth', value: 'API token' },
                        { term: 'Timeout', value: '30s', numeric: true },
                        { term: 'Verify TLS', value: 'on' },
                    ]}
                />
            </Section>
        </Ground>
    )
}

const PAYLOAD = `{
  "job": "import-orders",
  "project": "larkspur",
  "since": "2026-11-04T00:00:00Z",
  "sites": ["oslo", "bergen", "tromso"],
  "retry": { "attempts": 3, "backoff": "30s" }
}`

function Aligned() {
    return (
        <Ground>
            <Section title="Schedule">
                <DescriptionList
                    termWidth="auto"
                    items={[
                        { term: 'Job', value: 'send-digest', code: true },
                        { term: 'Every', value: 'day at 07:00' },
                        { term: 'Time zone', value: 'Europe/Oslo' },
                        { term: 'Skip when the last run failed', value: 'on' },
                        { term: 'Owner', value: 'margaret' },
                    ]}
                />
            </Section>
            <Section title="Two columns">
                <DescriptionList
                    termWidth="auto"
                    columns={2}
                    items={[
                        { term: 'Job', value: 'rebuild-index', code: true },
                        { term: 'State', value: 'running' },
                        { term: 'Started by', value: 'linus' },
                        { term: 'Service', value: 'worker', code: true },
                        { term: 'Started', value: '2026-11-04 03:00', numeric: true },
                        { term: 'Documents indexed', value: '48,210', numeric: true },
                        { term: 'Note', value: 'Rebuilt after the schema for orders gained the site field.', wide: true },
                    ]}
                />
            </Section>
        </Ground>
    )
}

function SplitFacts() {
    return (
        <Ground>
            <Section title="Schedule">
                <DescriptionListGroup termWidth="auto">
                    <DescriptionList
                        items={[
                            { term: 'Job', value: 'send-digest', code: true },
                            { term: 'Every', value: 'day at 07:00' },
                        ]}
                    />
                    <SwitchField id="shared-terms-paused" label="Paused" explain="A paused job keeps its schedule but starts no runs." />
                    <DescriptionList
                        items={[
                            { term: 'Skip when the last run failed', value: 'on' },
                            { term: 'Owner', value: 'margaret' },
                            { term: 'Service', value: 'scheduler', code: true },
                        ]}
                    />
                </DescriptionListGroup>
            </Section>
        </Ground>
    )
}

function WideValues() {
    return (
        <Ground>
            <Section title="Run">
                <DescriptionList
                    items={[
                        { term: 'Job', value: 'import-orders', code: true },
                        { term: 'Project', value: 'larkspur' },
                        { term: 'Payload', value: <Code value={PAYLOAD} language="json" size="sm" />, wide: true },
                        { term: 'Rule', value: 'orders.total >= 0 and orders.site in sites', code: true, wide: true },
                        { term: 'Started by', value: 'ada' },
                    ]}
                />
            </Section>
        </Ground>
    )
}

function DenseFacts() {
    return (
        <Inspector title="validate" code="step_03" status={<StatusChip status="failed" />} resizable={false}>
            <Group title="Step">
                <DescriptionList
                    size="sm"
                    termWidth="auto"
                    items={[
                        { term: 'Job', value: 'import-orders', code: true },
                        { term: 'Service', value: 'worker', code: true },
                        { term: 'Took', value: '0.3s', numeric: true },
                        { term: 'Retried from', value: null },
                        { term: 'Rule', value: 'orders.total >= 0', code: true, wide: true },
                    ]}
                />
            </Group>
            <Group title="Failed checks" count={2} countTone="critical">
                <DescriptionList
                    size="sm"
                    termWidth="auto"
                    items={[
                        { term: 'orders.total', value: 'negative on 3 rows' },
                        { term: 'orders.site', value: 'unknown site on 1 row' },
                    ]}
                />
            </Group>
            <Group title="Facts in a line">
                <DescriptionList
                    size="sm"
                    layout="row"
                    items={[
                        { term: 'Rows', value: '1,204', numeric: true },
                        { term: 'Sites', value: '3', numeric: true },
                        { term: 'Project', value: 'larkspur' },
                    ]}
                />
            </Group>
        </Inspector>
    )
}

const RUNS = [212, 230, 198, 241, 255, 249, 262, 270, 251, 266, 281, 290, 284, 302]
const FAILURES = [6.1, 5.4, 7.2, 4.9, 4.1, 4.4, 3.8, 3.2, 3.9, 3.1, 2.7, 2.9, 2.2, 1.8]
const DURATIONS = [3.4, 3.5, 3.3, 3.6, 3.5, 3.7, 3.6, 3.8, 3.7, 3.9, 4.0, 3.9, 4.1, 4.2]

function Numbers() {
    return (
        <Ground>
            <Columns count={4} min="xs" gap="xl" className="rounded-surface border border-border-strong bg-card p-5">
                <Stat
                    label="Runs today"
                    value="302"
                    change="+6%"
                    good
                    note="vs yesterday"
                    trend={<Sparkline values={RUNS} label="Runs per day, last 14 days" />}
                />
                <Stat
                    label="Failure rate"
                    value="1.8"
                    unit="%"
                    change="-0.4"
                    good
                    note="vs yesterday"
                    trend={<Sparkline values={FAILURES} tone="good" label="Failure rate, last 14 days" />}
                />
                <Stat
                    label="Median duration"
                    value="4.2"
                    unit="s"
                    change="+0.6s"
                    good={false}
                    note="p50, last 24 hours"
                    trend={<Sparkline values={DURATIONS} tone="warning" label="Median duration, last 14 days" />}
                />
                <Stat label="Jobs" value="18" note="3 paused" />
            </Columns>
        </Ground>
    )
}

function Events() {
    return (
        <Ground>
            <Section title="Steps">
                <Timeline
                    events={[
                        {
                            id: '1',
                            title: <span className="font-mono">fetch</span>,
                            at: '14:02:11',
                            detail: '2,184 rows from orders-2026-10.csv',
                            tone: 'succeeded',
                        },
                        {
                            id: '2',
                            title: <span className="font-mono">transform</span>,
                            at: '14:02:12',
                            detail: '2,184 rows mapped',
                            tone: 'succeeded',
                        },
                        {
                            id: '3',
                            title: <span className="font-mono">validate</span>,
                            at: '14:02:13',
                            detail: 'amount is not a number in 37 rows',
                            tone: 'failed',
                        },
                        { id: '4', title: <span className="font-mono">upload</span>, detail: 'skipped after a failure', tone: 'skipped' },
                        {
                            id: '5',
                            title: <span className="font-mono">notify</span>,
                            at: 'now',
                            detail: 'posting to #orders',
                            tone: 'running',
                        },
                    ]}
                />
            </Section>
            <Section title="History">
                <Timeline
                    events={[
                        { id: 'a', title: 'ada changed the schedule to every hour', at: '2026-11-04 09:14' },
                        { id: 'b', title: 'Added the step transform', at: '2026-11-03 16:40' },
                        { id: 'c', title: 'Created import-orders', at: '2026-10-28 11:02' },
                    ]}
                />
            </Section>
        </Ground>
    )
}

const LOG: LogLine[] = [
    { at: '14:02:11.204', level: 'info', source: 'fetch', text: 'GET /v1/exports/orders-2026-10.csv?project=larkspur' },
    { at: '14:02:11.902', level: 'info', source: 'fetch', text: 'read 2,184 rows in 0.7s' },
    { at: '14:02:12.010', level: 'debug', source: 'transform', text: 'map: amount = try_cast(amount as double)' },
    { at: '14:02:12.115', level: 'warning', source: 'transform', text: '37 rows carry an amount that does not parse' },
    {
        at: '14:02:13.420',
        level: 'error',
        source: 'validate',
        text: 'rules orders: field amount must be a number (37 rows), first at row 412: {"order":"ord-10412","month":"2026-10","amount":"n/a"}',
    },
    { at: '14:02:13.421', level: 'info', source: 'run', text: 'failed after 2.2s' },
]

/** Lines that carry the terminal face's icons: a Powerline prompt, a branch and a commit, and run states. */
const ICON_LOG: LogLine[] = [
    { at: '14:02:10.880', level: 'info', source: 'shell', text: 'ada@harbor  ~/juniper   main  3f2a9c1' },
    { at: '14:02:11.204', level: 'info', source: 'fetch', text: ' fetch succeeded, 2,184 rows' },
    { at: '14:02:12.115', level: 'info', source: 'transform', text: ' transform running' },
    { at: '14:02:13.420', level: 'error', source: 'validate', text: ' validate failed: field amount must be a number' },
    { at: '14:02:13.421', level: 'warning', source: 'upload', text: ' upload skipped after a failure' },
    { at: '14:02:13.422', level: 'info', source: 'notify', text: ' notify queued for grace' },
    { at: '14:02:13.430', level: 'debug', source: 'run', text: ' main  merged  v2.4.0  sync-inventory  worker' },
]

function Logs() {
    return (
        <Ground>
            <LogView lines={LOG} className="max-h-72" />
            <LogView lines={LOG} wrap query="rows" />
        </Ground>
    )
}

/** A log whose step names open their step: the chosen step's facts stand under it. */
function SourceLog() {
    const [step, setStep] = useState('validate')
    const lines = LOG.filter((line) => line.source === step)
    return (
        <Ground>
            <LogView lines={LOG} onSource={setStep} />
            <Section title={`Step ${step}`}>
                <DescriptionList
                    columns={2}
                    items={[
                        { term: 'Step', value: step, code: true },
                        { term: 'Lines', value: lines.length, numeric: true },
                        { term: 'Last line', value: lines.at(-1)?.text ?? null, wide: true },
                    ]}
                />
            </Section>
        </Ground>
    )
}

/** A run's lines with their fan-out item, extras in muted ink, and run-level lines whose source stays plain. */
const ITEM_LOG: LogLine[] = [
    { at: '14:02:11.204', level: 'info', source: 'run', sourceLink: false, text: 'started nightly-export on worker-3' },
    { at: '14:02:11.902', level: 'info', source: 'fetch', item: 'harbor', text: 'read 2,184 rows', fields: { rows: 2184, took: '0.7s' } },
    { at: '14:02:12.010', level: 'info', source: 'fetch', item: 'juniper', text: 'read 812 rows', fields: { rows: 812, took: '0.3s' } },
    {
        at: '14:02:12.115',
        level: 'warning',
        source: 'transform',
        item: 'juniper',
        text: 'amount does not parse',
        fields: 'rows=37 first=412',
    },
    { at: '14:02:13.421', level: 'info', source: 'run', sourceLink: false, text: 'succeeded after 2.2s' },
]

function EmptyLogs() {
    return (
        <Ground>
            <LogView lines={[]} />
            <LogView
                lines={[]}
                empty={
                    <Row as="span">
                        <Spinner className="size-3.5" />
                        Waiting for a worker to take import-orders
                    </Row>
                }
            />
        </Ground>
    )
}

function Json() {
    return (
        <Ground>
            <Section title="Payload">
                <JsonTree
                    value={{
                        job: 'import-orders',
                        run: 'run_01JCF8Q2',
                        state: 'failed',
                        duration_ms: 4180,
                        retried: false,
                        error: null,
                        steps: [
                            { code: 'fetch', state: 'succeeded', rows: 2184 },
                            { code: 'validate', state: 'failed', problems: [{ row: 412, field: 'amount', message: 'must be a number' }] },
                        ],
                        labels: { team: 'billing', project: 'larkspur' },
                    }}
                />
            </Section>
        </Ground>
    )
}

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const
const STATES = ['succeeded', 'failed', 'running', 'queued', 'cancelled', 'skipped'] as const

/** A page of 240 runs, as a runs endpoint answers: more than an opened list draws at once. */
const RUN_PAGE = {
    total: 240,
    runs: Array.from({ length: 240 }, (_, index) => ({
        id: `run_${String(1000 + index)}`,
        job: JOBS[index % JOBS.length],
        state: STATES[(index * 7) % STATES.length],
        duration_ms: 900 + ((index * 337) % 6000),
    })),
}

function LongJson() {
    return (
        <Section title="Response">
            <JsonTree value={RUN_PAGE} />
        </Section>
    )
}

const meta: Meta = { title: 'Patterns/Data', parameters: { frame: 'padded' } }
export default meta

export const Description: StoryObj = { name: 'Description list', render: () => <Facts /> }
/** Terms in a column as wide as the longest of them, in one column and in two, a wide note under its term. */
export const AutoTerms: StoryObj = { name: 'Auto terms', render: () => <Aligned /> }
/** Two lists split around a switch in one `DescriptionListGroup`, sharing one term column as wide as the longest term of both. */
export const SharedTerms: StoryObj = { name: 'Shared terms', render: () => <SplitFacts /> }
/** Wide values in the side layout, a JSON body and a rule each set under its term at the list's full width. */
export const Wide: StoryObj = { name: 'Wide values', render: () => <WideValues /> }
/** The small size in a narrow inspector: values at the size of help text, tighter gaps, groups with counts. */
export const Dense: StoryObj = { name: 'Dense', render: () => <DenseFacts /> }
export const Stats: StoryObj = { name: 'Stats', render: () => <Numbers /> }
/**
 * Runs by state as tiles, each leading to the runs it counts. Queued is the one that asks for work:
 * edged in its dot's color and its number drawn at the hero size, larger than its neighbors.
 */
export const Tiles: StoryObj = {
    name: 'Stat tiles',
    render: () => (
        <Columns count={4} min="xs" gap="md">
            <Stat
                variant="tile"
                dot="var(--status-queued)"
                label="Queued"
                value={42}
                note="Waiting for a worker"
                href="#"
                emphasis
                size="lg"
            />
            <Stat variant="tile" dot="var(--status-running)" label="Running" value={6} note="On worker and scheduler" href="#" />
            <Stat variant="tile" dot="var(--status-succeeded)" label="Succeeded" value={1284} note="Since Monday" href="#" />
            <Stat variant="tile" dot="var(--status-failed)" label="Failed" value={17} note="Since Monday" href="#" />
        </Columns>
    ),
}
export const Timelines: StoryObj = { name: 'Timeline', render: () => <Events /> }
/**
 * A run's log twice: scrolling sideways, then wrapped with "rows" marked. On a phone the wrapped
 * log sets each line's time, level and source over its text, which keeps the width of the log.
 */
export const Log: StoryObj = { name: 'Log view', render: () => <Logs /> }
/** A log in the terminal face, its lines carrying Nerd Font icons: a Powerline prompt, git and run states. */
export const LogIcons: StoryObj = { name: 'Log icons', render: () => <LogView lines={ICON_LOG} /> }
/** A log whose sources are buttons (`onSource`): a press on a step's name opens that step under the log. */
export const LogSources: StoryObj = { name: 'Log sources', render: () => <SourceLog /> }
/**
 * Lines of a fan-out: each line's item marks its text, its extras follow in muted ink, and the
 * run's own lines keep their source plain while the steps' open their step.
 */
export const LogFields: StoryObj = { name: 'Log fields', render: () => <LogView lines={ITEM_LOG} onSource={() => undefined} /> }
/** A log with no lines: its own words first, then the app's `empty`, a run still waiting for a worker. */
export const EmptyLog: StoryObj = { name: 'Empty log', render: () => <EmptyLogs /> }
export const Tree: StoryObj = { name: 'JSON tree', render: () => <Json /> }
/** A list of 240 runs, opened: the first 100 drawn and a step under them that shows 100 more. */
export const LongTree: StoryObj = { name: 'Long JSON', render: () => <LongJson /> }
