import type { Meta, StoryObj } from '@storybook/react-vite'

import { DescriptionList } from '../../components/DescriptionList'
import { DiffView } from '../../components/DiffView'
import { JsonTree } from '../../components/JsonTree'
import { LogView, type LogLine } from '../../components/LogView'
import { Section } from '../../components/Section'
import { Sparkline, Stat } from '../../components/Stat'
import { Timeline } from '../../components/Timeline'

/** The ways a record's facts are shown: terms and values, numbers, events, logs, JSON and diffs. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">{children}</div>
        </div>
    )
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
                        { term: 'Started', value: '2026-11-04 14:02' },
                        { term: 'Duration', value: '4.2s' },
                        { term: 'Retried from', value: null },
                        { term: 'Run', value: 'run_01JCF8Q2T7W4M3', code: true, wide: true },
                    ]}
                />
            </Section>
            <Section title="Service">
                <DescriptionList
                    stacked
                    columns={2}
                    items={[
                        { term: 'Base URL', value: 'https://api.example.org', code: true },
                        { term: 'Auth', value: 'API token' },
                        { term: 'Timeout', value: '30s' },
                        { term: 'Verify TLS', value: 'on' },
                    ]}
                />
            </Section>
        </Ground>
    )
}

const RUNS = [212, 230, 198, 241, 255, 249, 262, 270, 251, 266, 281, 290, 284, 302]
const FAILURES = [6.1, 5.4, 7.2, 4.9, 4.1, 4.4, 3.8, 3.2, 3.9, 3.1, 2.7, 2.9, 2.2, 1.8]

function Numbers() {
    return (
        <Ground>
            <div className="grid grid-cols-2 gap-6 rounded-surface border border-border-strong bg-card p-5 md:grid-cols-4">
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
                <Stat label="Median duration" value="4.2" unit="s" change="+0.6s" good={false} note="p50, last 24 hours" />
                <Stat label="Jobs" value="18" note="3 paused" />
            </div>
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

function Logs() {
    return (
        <Ground>
            <LogView lines={LOG} className="max-h-72" />
            <LogView lines={LOG} wrap query="rows" />
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

function Diff() {
    return (
        <Ground>
            <DiffView
                title="import-orders.yaml"
                before={`code: import-orders
schedule: every day at 02:00
steps:
  fetch:
    uses: http.get
  validate:
    uses: rows.check
    with: { rules: orders, on_invalid: fail }
`}
                after={`code: import-orders
schedule: every hour
steps:
  fetch:
    uses: http.get
  transform:
    uses: rows.filter
    with: { where: "try_cast(amount as double) is not null" }
  validate:
    uses: rows.check
    with: { rules: orders, on_invalid: warn }
`}
            />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Data' }
export default meta

export const Description: StoryObj = { name: 'Description list', render: () => <Facts /> }
export const Stats: StoryObj = { name: 'Stats', render: () => <Numbers /> }
export const Timelines: StoryObj = { name: 'Timeline', render: () => <Events /> }
export const Log: StoryObj = { name: 'Log view', render: () => <Logs /> }
export const Tree: StoryObj = { name: 'JSON tree', render: () => <Json /> }
export const Diffs: StoryObj = { name: 'Diff view', render: () => <Diff /> }
