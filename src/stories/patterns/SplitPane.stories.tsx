import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowLeft } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { CodeEditor } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { SplitPane, useSplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'

/**
 * Two panes side by side or one over the other, with an edge between them that drags to share the
 * room, held within bounds. A split remembers its share by `id`, and once it is narrower than
 * `narrowBelow` stacks its panes or shows only one; the viewport toolbar shows it at a phone's width.
 */
const meta: Meta = {
    title: 'Patterns/Split pane',
    decorators: [
        (Story) => (
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <Story />
            </Stack>
        ),
    ],
}
export default meta

const CONFIG = `job: import-orders
project: harbor
schedule: "0 2 * * *"
steps:
  fetch:
    uses: http.get
    with: { url: https://files.example.org/orders-2026-10.csv }
  transform:
    uses: rows.map
    with: { script: orders.jq }
  validate:
    uses: rows.check
    with: { rules: orders, on_invalid: fail }
  upload:
    uses: store.put
    with: { bucket: harbor-orders }
  notify:
    uses: chat.post
    with: { channel: "#harbor", on: [failed] }
`

const LOG: LogLine[] = [
    { at: '02:00:00.112', level: 'info', source: 'scheduler', text: 'started import-orders for harbor' },
    { at: '02:00:00.480', level: 'info', source: 'fetch', text: 'GET https://files.example.org/orders-2026-10.csv' },
    { at: '02:00:01.204', level: 'info', source: 'fetch', text: 'read 2,184 rows in 0.7s' },
    { at: '02:00:01.310', level: 'debug', source: 'transform', text: 'map: amount = try_cast(amount as double)' },
    { at: '02:00:01.415', level: 'warning', source: 'transform', text: '37 rows carry an amount that does not parse' },
    { at: '02:00:02.720', level: 'error', source: 'validate', text: 'rules orders: field amount must be a number (37 rows)' },
    { at: '02:00:02.721', level: 'info', source: 'notify', text: 'posted to #harbor' },
    { at: '02:00:02.722', level: 'info', source: 'scheduler', text: 'failed after 2.6s' },
]

/** A pane: its head, and what it holds filling the rest. */
function Pane({
    title,
    meta,
    start,
    actions,
    children,
}: {
    title: string
    meta?: ReactNode
    start?: ReactNode
    actions?: ReactNode
    children: ReactNode
}) {
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={meta} start={start} actions={actions} />
            <Fill>{children}</Fill>
        </Stack>
    )
}

const config = (
    <Pane title="import-orders.yaml" meta="harbor">
        <CodeEditor label="Job" language="yaml" variant="pane" size="sm" value={CONFIG} readOnly />
    </Pane>
)

const log = (
    <Pane title="Run 4181" meta="failed after 2.6s">
        <LogView lines={LOG} framed={false} className="h-full" />
    </Pane>
)

/** A job beside the log of its last run, each half of the room; the edge between them drags, and a double click puts it back. */
export const Across: StoryObj = { render: () => <SplitPane first={config} second={log} /> }

/** The job over its run's log, the job given three fifths of the height to start. */
export const Down: StoryObj = { render: () => <SplitPane direction="down" defaultShare={0.6} first={config} second={log} /> }

/** A split that does not resize: the job keeps a third of the room and the edge does not drag. */
export const Fixed: StoryObj = { render: () => <SplitPane resizable={false} defaultShare={1 / 3} first={config} second={log} /> }

const PROJECTS = [
    { value: 'harbor', label: 'harbor' },
    { value: 'juniper', label: 'juniper' },
    { value: 'larkspur', label: 'larkspur' },
]

const SCHEDULES = [
    { value: 'nightly', label: 'Every night at 02:00' },
    { value: 'hourly', label: 'Every hour' },
    { value: 'manual', label: 'Only when started' },
]

/**
 * A job's file beside its settings, the settings as tall as their fields. On a phone the split
 * flows: the file and the settings stack at their own heights, and the two scroll as one column
 * rather than each in half the screen.
 */
export const FormBeside: StoryObj = {
    name: 'Form beside',
    render: () => (
        <SplitPane
            defaultShare={0.55}
            first={config}
            second={
                <Section title="Settings" flush>
                    <Stack gap="md" className="p-3">
                        <TextField id="split-job" label="Job" defaultValue="import-orders" mono />
                        <SelectField id="split-project" label="Project" options={PROJECTS} value="harbor" />
                        <SelectField id="split-schedule" label="Schedule" options={SCHEDULES} value="nightly" />
                        <TextField id="split-notify" label="Notify" defaultValue="#harbor" description="Posted to when a run fails." />
                        <TextField id="split-retries" label="Retries" defaultValue="2" numeric />
                        <TextField
                            id="split-note"
                            label="Note"
                            multiline
                            rows={3}
                            defaultValue="Orders for the month before, fetched as CSV and checked against the orders rules."
                        />
                    </Stack>
                </Section>
            }
        />
    ),
}

/** The log alone at every width, as when the reader turns the job off; the job stays mounted, hidden. */
export const SecondAlone: StoryObj = { name: 'Second alone', render: () => <SplitPane only="second" first={config} second={log} /> }

const SHARES = [
    { value: '0.25', label: '25%' },
    { value: '0.5', label: '50%' },
    { value: '0.75', label: '75%' },
]

function Held() {
    const [share, setShare] = useState(0.25)
    return (
        <SplitPane
            share={share}
            onShareChange={setShare}
            minShare={0.25}
            maxShare={0.75}
            first={
                <Pane title="import-orders.yaml" meta={`${Math.round(share * 100)}%`}>
                    <CodeEditor label="Job" language="yaml" variant="pane" size="sm" value={CONFIG} readOnly />
                </Pane>
            }
            second={
                <Pane
                    title="Run 4181"
                    actions={
                        <Segmented
                            label="Share"
                            size="sm"
                            value={String(share)}
                            options={SHARES}
                            onValueChange={(value) => setShare(Number(value))}
                        />
                    }
                >
                    <LogView lines={LOG} framed={false} className="h-full" />
                </Pane>
            }
        />
    )
}

/**
 * The share held from outside: the buttons over the log set it, a drag reports it back, and it is
 * held between a quarter and three quarters. The job's head says the share as it changes.
 */
export const HeldShare: StoryObj = { name: 'Held', render: () => <Held /> }

/** A share kept by `id` in the browser's storage: drag the edge, reload, and the split comes back as it was left. */
export const Remembered: StoryObj = {
    render: () => <SplitPane id="stories.remembered" defaultShare={0.4} first={config} second={log} />,
}

/**
 * A split inside a split: the job at the start, and its log over the run's output at the end, each
 * edge dragging on its own. At a phone's width the three panes stack.
 */
export const Nested: StoryObj = {
    render: () => (
        <SplitPane
            defaultShare={0.4}
            first={config}
            second={
                <SplitPane
                    direction="down"
                    defaultShare={0.55}
                    first={log}
                    second={
                        <Pane title="Output" meta="37 rejected rows">
                            <CodeEditor
                                label="Output"
                                language="json"
                                variant="pane"
                                size="sm"
                                readOnly
                                value={JSON.stringify(
                                    [
                                        { order: 'ord-10412', month: '2026-10', amount: 'n/a' },
                                        { order: 'ord-10419', month: '2026-10', amount: '' },
                                    ],
                                    null,
                                    2,
                                )}
                            />
                        </Pane>
                    }
                />
            }
        />
    ),
}

interface Run {
    id: string
    job: string
    state: 'succeeded' | 'failed' | 'running' | 'queued'
    by: string
}

const RUNS: Run[] = [
    { id: '4181', job: 'import-orders', state: 'failed', by: 'schedule' },
    { id: '4180', job: 'sync-inventory', state: 'succeeded', by: 'grace' },
    { id: '4179', job: 'rebuild-index', state: 'running', by: 'linus' },
    { id: '4178', job: 'send-digest', state: 'succeeded', by: 'schedule' },
    { id: '4177', job: 'nightly-export', state: 'queued', by: 'ada' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} /> },
]

/** A run's log, with a way back to the list while the split shows it alone. */
function RunLog({ run, onBack }: { run: Run; onBack: () => void }) {
    const split = useSplitPane()
    return (
        <Pane
            title={`Run ${run.id}`}
            meta={run.job}
            start={
                split?.alone === 'second' ? (
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft aria-hidden />
                        Runs
                    </Button>
                ) : undefined
            }
        >
            <LogView lines={LOG} framed={false} className="h-full" />
        </Pane>
    )
}

function ListAndDetail() {
    const [open, setOpen] = useState<string | null>('4181')
    const run = RUNS.find((one) => one.id === open)
    return (
        <SplitPane
            defaultShare={0.36}
            minShare={0.25}
            maxShare={0.6}
            narrow={run === undefined ? 'first' : 'second'}
            first={
                <Pane title="Runs" meta={`${RUNS.length} today`}>
                    <DataTable
                        variant="list"
                        framed={false}
                        stackBelow={false}
                        columns={COLUMNS}
                        rows={RUNS}
                        rowKey={(one) => one.id}
                        onOpen={(one) => setOpen(one.id)}
                        opened={(one) => one.id === open}
                    />
                </Pane>
            }
            second={run === undefined ? null : <RunLog run={run} onBack={() => setOpen(null)} />}
        />
    )
}

/**
 * A list beside the run picked from it. Narrow, as on a phone, the split shows one pane: the run
 * while one is open, with a way back to the list, and the list once it is closed.
 */
export const ListDetail: StoryObj = { name: 'List and detail', render: () => <ListAndDetail /> }
