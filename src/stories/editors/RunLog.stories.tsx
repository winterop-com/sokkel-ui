import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

import { CodeEditor, type CodeMark, type CodeRange } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { EditorApp } from './frame'

interface Step {
    code: string
    state: string
    seconds: number
    lines: string[]
}

const STEPS: Step[] = [
    {
        code: 'fetch',
        state: 'succeeded',
        seconds: 41,
        lines: [
            'GET https://api.example.org/orders?since=24h',
            '200 OK, 3 pages',
            'page 1: 1000 rows',
            'page 2: 1000 rows',
            'page 3: 412 rows',
            'fetched 2412 rows in 41.2s',
        ],
    },
    {
        code: 'transform',
        state: 'succeeded',
        seconds: 12,
        lines: ['running orders.jq over 2412 rows', 'dropped 3 rows without a project', 'wrote 2409 rows'],
    },
    {
        code: 'validate',
        state: 'failed',
        seconds: 7,
        lines: [
            'checking 2409 rows against the orders rules',
            'row 118: total is -3, below the minimum 0',
            'row 731: order_id "1042" does not match ^ord-[0-9]+$',
            'row 1905: lines is empty, at least 1 needed',
            'warning: 14 rows have no project; counted under larkspur',
            '37 rows refused, on_invalid is fail',
            'error: validate refused 37 rows, stopping the run',
        ],
    },
    { code: 'upload', state: 'skipped', seconds: 0, lines: ['skipped: validate failed'] },
    {
        code: 'notify',
        state: 'succeeded',
        seconds: 1,
        lines: ['posting to #larkspur', 'told ada and grace: nightly-export failed at validate'],
    },
]

interface Placed extends Step {
    /** The step's lines in the log, its head included, counted from 1. */
    first: number
    last: number
}

/** The log as the run wrote it, each step under a head, and where each step's lines are. */
function writeLog(): { text: string; placed: Placed[] } {
    const out: string[] = []
    const placed: Placed[] = []
    let clock = 0
    const stamp = () => `02:00:${String(clock).padStart(2, '0')}`
    out.push(`${stamp()} run 4181 of nightly-export started on worker-3`)
    for (const step of STEPS) {
        const first = out.length + 1
        out.push(`${stamp()} == ${step.code}`)
        for (const line of step.lines) {
            clock = Math.min(59, clock + Math.max(1, Math.round(step.seconds / step.lines.length)))
            out.push(`${stamp()}    ${line}`)
        }
        placed.push({ ...step, first, last: out.length })
    }
    out.push(`${stamp()} run 4181 failed after 61s`)
    return { text: out.join('\n'), placed }
}

const LOG = writeLog()

/** The failed step's lines washed, its error underlined with what it means, and the warning marked. */
function marksOf(text: string, placed: readonly Placed[]): CodeMark[] {
    const lines = text.split('\n')
    const failed = placed.filter((step) => step.state === 'failed')
    const washed: CodeMark[] = failed.flatMap((step) =>
        Array.from({ length: step.last - step.first + 1 }, (_, index) => ({ line: step.first + index, tone: 'error' as const })),
    )
    const ranged = lines.flatMap((line, index): CodeMark[] => {
        const error = line.indexOf('error:')
        if (error >= 0)
            return [
                {
                    line: index + 1,
                    from: error + 1,
                    tone: 'error',
                    message: 'The run stopped here: on_invalid is fail, so any refused row fails the step.',
                },
            ]
        const warning = line.indexOf('warning:')
        if (warning >= 0)
            return [{ line: index + 1, from: warning + 1, tone: 'warning', message: 'Counted, not refused: set project in transform.' }]
        return []
    })
    return [...washed, ...ranged]
}

/** A step's lines as offsets into the log, for revealing it whole. */
function rangeOf(text: string, step: Placed): CodeRange {
    const lines = text.split('\n')
    const from = lines.slice(0, step.first - 1).reduce((sum, line) => sum + line.length + 1, 0)
    const to = lines.slice(0, step.last).reduce((sum, line) => sum + line.length + 1, 0) - 1
    return { from, to }
}

function RunLog() {
    const failed = LOG.placed.find((step) => step.state === 'failed')
    const [opened, setOpened] = useState<string | null>(failed?.code ?? null)
    const [reveal, setReveal] = useState<CodeRange | null>(failed === undefined ? null : rangeOf(LOG.text, failed))
    const marks = useMemo(() => marksOf(LOG.text, LOG.placed), [])

    const columns: DataColumn<Placed>[] = [
        { id: 'code', header: 'Step', width: 'minmax(7rem,1fr)', cell: (step) => <span className="font-mono">{step.code}</span> },
        { id: 'state', header: 'State', width: '7.5rem', stack: 'secondary', cell: (step) => <StatusChip status={step.state} /> },
        { id: 'seconds', header: 'Took', width: '4rem', align: 'end', stack: 'secondary', cell: (step) => `${String(step.seconds)}s` },
    ]

    return (
        <EditorApp
            place="runs"
            trail={[
                { label: 'Runs', href: '#' },
                { label: 'nightly-export', href: '#' },
                { label: '4181', code: true },
            ]}
        >
            <SplitPane
                defaultShare={0.28}
                minShare={0.18}
                maxShare={0.45}
                narrowBelow={720}
                first={
                    <Stack gap="none" className="h-full min-h-0">
                        <PaneHeader title="Steps" meta={<StatusChip status="failed" />} />
                        <Fill>
                            <DataTable
                                variant="list"
                                columns={columns}
                                rows={LOG.placed}
                                rowKey={(step) => step.code}
                                opened={(step) => step.code === opened}
                                onOpen={(step) => {
                                    setOpened(step.code)
                                    setReveal(rangeOf(LOG.text, step))
                                }}
                                minWidth="auto"
                            />
                        </Fill>
                    </Stack>
                }
                second={
                    <Stack gap="none" className="h-full min-h-0">
                        <PaneHeader title="Log" meta={`${String(LOG.text.split('\n').length)} lines`} />
                        <Fill>
                            <CodeEditor
                                label="Run log"
                                variant="pane"
                                size="sm"
                                value={LOG.text}
                                readOnly
                                marks={marks}
                                reveal={reveal}
                                search
                            />
                        </Fill>
                    </Stack>
                }
            />
        </EditorApp>
    )
}

const meta: Meta = { title: 'Editors/Run log' }
export default meta

/**
 * A failed run's log in a read-only editor: the failed step's lines washed in the error tone, its
 * error underlined with what it means on hover, and a warning marked. The steps beside it carry their
 * states; pressing one selects its lines in the log and scrolls them into view, and Mod-f finds in it.
 */
export const RunLogViewer: StoryObj = { name: 'Run log', render: () => <RunLog /> }
