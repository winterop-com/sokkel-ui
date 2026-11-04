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
                        { term: 'Pipeline', value: 'weather-gate', code: true },
                        { term: 'State', value: 'failed' },
                        { term: 'Trigger', value: 'schedule, every hour' },
                        { term: 'Started', value: '2026-11-04 14:02' },
                        { term: 'Duration', value: '4.2s' },
                        { term: 'Retried from', value: null },
                        { term: 'Run', value: 'run_01JCF8Q2T7W4M3', code: true, wide: true },
                    ]}
                />
            </Section>
            <Section title="Connection">
                <DescriptionList
                    stacked
                    columns={2}
                    items={[
                        { term: 'Base URL', value: 'https://play.dhis2.org/40.4', code: true },
                        { term: 'Auth', value: 'personal access token' },
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
                <Stat label="Pipelines" value="18" note="3 paused" />
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
                            detail: '2,184 rows from dhis2-play',
                            tone: 'succeeded',
                        },
                        {
                            id: '2',
                            title: <span className="font-mono">clean</span>,
                            at: '14:02:12',
                            detail: '37 rows dropped',
                            tone: 'succeeded',
                        },
                        {
                            id: '3',
                            title: <span className="font-mono">validate</span>,
                            at: '14:02:13',
                            detail: 'value is not a number in 37 rows',
                            tone: 'failed',
                        },
                        { id: '4', title: <span className="font-mono">write</span>, detail: 'skipped after a failure', tone: 'skipped' },
                        {
                            id: '5',
                            title: <span className="font-mono">notify</span>,
                            at: 'now',
                            detail: 'posting to #data-alerts',
                            tone: 'running',
                        },
                    ]}
                />
            </Section>
            <Section title="History">
                <Timeline
                    events={[
                        { id: 'a', title: 'ada changed the schedule to every hour', at: '2026-11-04 09:14' },
                        { id: 'b', title: 'Added the step clean', at: '2026-11-03 16:40' },
                        { id: 'c', title: 'Created weather-gate', at: '2026-10-28 11:02' },
                    ]}
                />
            </Section>
        </Ground>
    )
}

const LOG: LogLine[] = [
    { at: '14:02:11.204', level: 'info', source: 'fetch', text: 'GET /api/dataValueSets?period=LAST_12_MONTHS&orgUnit=ImspTQPwCqd' },
    { at: '14:02:11.902', level: 'info', source: 'fetch', text: 'read 2,184 rows in 0.7s' },
    { at: '14:02:12.010', level: 'debug', source: 'clean', text: 'where: try_cast(value as double) is not null' },
    { at: '14:02:12.115', level: 'warning', source: 'clean', text: 'dropped 37 rows whose value does not parse' },
    {
        at: '14:02:13.420',
        level: 'error',
        source: 'validate',
        text: 'schema readings: field value must be a number (37 rows), first at row 112: {"period":"202610","orgUnit":"ImspTQPwCqd","value":"n/a"}',
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
                        pipeline: 'weather-gate',
                        run: 'run_01JCF8Q2',
                        state: 'failed',
                        duration_ms: 4180,
                        retried: false,
                        error: null,
                        steps: [
                            { code: 'fetch', state: 'succeeded', rows: 2184 },
                            { code: 'validate', state: 'failed', problems: [{ row: 112, field: 'value', message: 'must be a number' }] },
                        ],
                        labels: { team: 'climate', region: 'west' },
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
                title="weather-gate.yaml"
                before={`code: weather-gate
schedule: every day at 06:00
steps:
  fetch:
    block: dhis2.data-values
  validate:
    block: schema.check
    with: { schema: readings, on_invalid: fail }
`}
                after={`code: weather-gate
schedule: every hour
steps:
  fetch:
    block: dhis2.data-values
  clean:
    block: filter
    with: { where: "try_cast(value as double) is not null" }
  validate:
    block: schema.check
    with: { schema: readings, on_invalid: warn }
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
