import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CodeEditor } from '../../components/CodeEditor'
import { Field } from '../../components/Field'
import { SourceSheet } from '../../components/SourceSheet'
import { Button } from '../../components/ui/button'
import { Columns, Row, Stack } from '../../components/Layout'

/** Editing code in a form or a pane, and a record's source one press away. */
function Ground({ children }: { children: React.ReactNode }) {
    return <Stack gap="xl">{children}</Stack>
}

const JOB = `code: nightly-export
schedule: every day at 02:00
steps:
  fetch:
    from: https://api.example.org/orders
    since: 24h
  validate:
    schema: orders
    on_invalid: fail
  upload:
    to: s3://larkspur-exports/orders/
`

const RECORD = {
    code: 'nightly-export',
    project: 'larkspur',
    owner: 'ada',
    schedule: { every: 'day', at: '02:00', timezone: 'UTC' },
    last_run: { state: 'failed', started: '2026-11-04T02:00:04Z', duration_ms: 4180, failed_step: 'validate' },
    labels: ['exports', 'orders'],
    paused: false,
}

const NOTE = `Write a short note to the team about why nightly-export failed last night. Say which step failed, how many rows it rejected and why, and what we changed so it does not happen again. Keep it under a hundred words.`

function WrappedText() {
    const [note, setNote] = useState(NOTE)
    return (
        <Ground>
            <Field id="note" label="Prompt" hint="Long lines fold at the edge.">
                <CodeEditor label="Prompt" value={note} onChange={setNote} wrap lineNumbers={false} className="h-40" />
            </Field>
        </Ground>
    )
}

function Editors() {
    const [job, setJob] = useState(JOB)
    const [query, setQuery] = useState('')
    return (
        <Ground>
            <Field id="definition" label="Definition" error="Line 9 fails the check: on_invalid must be warn or skip.">
                <CodeEditor
                    label="Definition"
                    language="yaml"
                    value={job}
                    onChange={setJob}
                    marks={[{ line: 9, tone: 'error' }]}
                    className="h-72"
                />
            </Field>
            <Columns>
                <Field id="record" label="Stored record" hint="Read only.">
                    <CodeEditor label="Stored record" language="json" value={JSON.stringify(RECORD, null, 2)} readOnly className="h-64" />
                </Field>
                <Field id="query" label="Filter" hint="Plain text, no line numbers.">
                    <CodeEditor
                        label="Filter"
                        value={query}
                        onChange={setQuery}
                        lineNumbers={false}
                        placeholder="state = failed and project = larkspur"
                        className="h-24"
                    />
                </Field>
            </Columns>
        </Ground>
    )
}

function Source({ open: initial }: { open: boolean }) {
    const [open, setOpen] = useState(initial)
    return (
        <Ground>
            <Row gap="md">
                <span className="font-mono text-sm">nightly-export</span>
                <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                    View source
                </Button>
            </Row>
            <SourceSheet
                open={open}
                onOpenChange={setOpen}
                title="nightly-export"
                description="The job as the server stores it."
                value={RECORD}
            />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Editor', parameters: { frame: 'padded' } }
export default meta

export const Editors_: StoryObj = { name: 'Code editor', render: () => <Editors /> }
/** Prose in the editor with its long lines folded at the edge rather than scrolling sideways. */
export const Wrapped: StoryObj = { name: 'Wrapped text', render: () => <WrappedText /> }
export const SourceOpen: StoryObj = { name: 'Source sheet, open', render: () => <Source open /> }
