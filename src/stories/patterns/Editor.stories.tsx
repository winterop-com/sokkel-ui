import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CodeEditor } from '../../components/CodeEditor'
import { Field } from '../../components/Field'
import { SourceSheet } from '../../components/SourceSheet'
import { Button } from '../../components/ui/button'

/** Editing code in a form or a pane, and a record's source one press away. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-4xl flex-col gap-6">{children}</div>
        </div>
    )
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

function Editors() {
    const [job, setJob] = useState(JOB)
    const [query, setQuery] = useState('')
    return (
        <Ground>
            <Field id="definition" label="Definition" hint="Line 9 fails the check: on_invalid must be warn or skip.">
                <CodeEditor
                    label="Definition"
                    language="yaml"
                    value={job}
                    onChange={setJob}
                    marks={[{ line: 9, tone: 'error' }]}
                    className="h-72"
                />
            </Field>
            <div className="grid gap-6 md:grid-cols-2">
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
            </div>
        </Ground>
    )
}

function Source({ open: initial }: { open: boolean }) {
    const [open, setOpen] = useState(initial)
    return (
        <Ground>
            <div className="flex items-center gap-3">
                <span className="font-mono text-sm">nightly-export</span>
                <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                    View source
                </Button>
            </div>
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

const meta: Meta = { title: 'Patterns/Editor' }
export default meta

export const Editors_: StoryObj = { name: 'Code editor', render: () => <Editors /> }
export const SourceOpen: StoryObj = { name: 'Source sheet, open', render: () => <Source open /> }
