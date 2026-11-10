import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CodeEditor, languageForMediaType, type CodeCompletion, type CodeRange } from '@winterop-com/sokkel-ui/CodeEditor'
import { JQ_BUILTINS } from '@winterop-com/sokkel-ui/code/jq'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { SourceSheet } from '@winterop-com/sokkel-ui/SourceSheet'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@winterop-com/sokkel-ui/primitives/dialog'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

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

const RUNS = JSON.stringify(
    {
        project: 'harbor',
        runs: [
            { id: 4181, job: 'nightly-export', state: 'failed', failed_step: 'validate', owner: 'ada', rejected: 12 },
            { id: 4180, job: 'sync-inventory', state: 'succeeded', owner: 'grace', rejected: 0 },
            { id: 4179, job: 'rebuild-index', state: 'running', owner: 'linus' },
            { id: 4178, job: 'send-digest', state: 'cancelled', owner: 'margaret' },
            { id: 4177, job: 'import-orders', state: 'succeeded', owner: 'ada', rejected: 3 },
            { id: 4176, job: 'nightly-export', state: 'skipped', owner: 'ada' },
        ],
        services: { api: { replicas: 3 }, worker: { replicas: 8 }, scheduler: { replicas: 1 } },
    },
    null,
    2,
)

const FILTER = `# The runs that failed, with the step they stopped on
def failures: .runs[] | select(.state == "failed");

[failures | {job, step: .failed_step, note: "rejected \\(.rejected) rows"}]
| sort_by(.job)
| map(.job |= ascii_upcase) | @json`

/** The fields of a run, offered after a dot. */
const FIELDS: CodeCompletion[] = [
    { label: 'id', detail: 'number', docs: 'The run number.', kind: 'property' },
    { label: 'job', detail: 'string', docs: 'The job the run belongs to.', kind: 'property' },
    { label: 'state', detail: 'string', docs: 'succeeded, failed, running, queued, cancelled or skipped.', kind: 'property' },
    { label: 'failed_step', detail: 'string', docs: 'The step a failed run stopped on.', kind: 'property' },
    { label: 'owner', detail: 'string', kind: 'property' },
    { label: 'rejected', detail: 'number', docs: 'Rows the validate step refused.', kind: 'property' },
    // The app's own word for a jq built-in, with its own docs, takes the built-in's place in the list.
    { label: 'has', detail: '(key) → boolean', docs: 'Whether the run has the field, such as has("failed_step").', kind: 'function' },
]

const BUILTIN_DOCS = new Map(
    JQ_BUILTINS.map((builtin) => [builtin.label, `${builtin.label}${builtin.detail ?? ''}: ${String(builtin.info)}`]),
)

function JqFilter() {
    const [filter, setFilter] = useState(FILTER)
    const [runs, setRuns] = useState(0)
    return (
        <Ground>
            <Field id="filter" label="Filter" hint={runs === 0 ? 'Mod-Enter runs it.' : `Ran ${String(runs)} times.`}>
                <CodeEditor
                    label="Filter"
                    language="jq"
                    value={filter}
                    onChange={setFilter}
                    completions={FIELDS}
                    hover={(word) => BUILTIN_DOCS.get(word)}
                    onRun={() => setRuns((count) => count + 1)}
                    marks={[
                        {
                            line: 4,
                            from: 25,
                            to: 37,
                            tone: 'error',
                            message: 'failed_step is not a field of every run: use .failed_step // "none".',
                        },
                    ]}
                    className="h-56"
                />
            </Field>
        </Ground>
    )
}

const JOB_SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    required: ['code', 'schedule', 'steps'],
    additionalProperties: false,
    properties: {
        code: { type: 'string', pattern: '^[a-z][a-z-]*$', description: 'The job code, lowercase with dashes.' },
        project: { enum: ['harbor', 'juniper', 'larkspur'], description: 'The project the job runs in.' },
        schedule: { type: 'string', description: 'When the job runs.' },
        paused: { type: 'boolean', description: 'A paused job keeps its schedule but does not run.' },
        steps: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                required: ['step'],
                additionalProperties: false,
                properties: {
                    step: { enum: ['fetch', 'transform', 'validate', 'upload', 'notify'], description: 'What the step does.' },
                    retries: { type: 'integer', minimum: 0, maximum: 5, description: 'How often a failed step is tried again.' },
                    on_invalid: { enum: ['warn', 'skip'], description: 'What a validate step does with a row it refuses.' },
                },
            },
        },
    },
}

const SCHEMA_JOB = `code: nightly-export
project: larkspur
schedule: every day at 02:00
paused: no
steps:
  - step: fetch
    retries: 8
  - step: validate
    on_invalid: fail
  - step: upload
    timeout: 30m
`

function SchemaChecked() {
    const [job, setJob] = useState(SCHEMA_JOB)
    return (
        <Ground>
            <Field id="job" label="Definition" hint="Checked against the job schema as you type.">
                <CodeEditor label="Definition" language="yaml" value={job} onChange={setJob} schema={JOB_SCHEMA} className="h-80" />
            </Field>
        </Ground>
    )
}

const JOB_ADDRESS = 'https://example.org/schemas/job.json'

const NAMED_JOB = `# yaml-language-server: $schema=${JOB_ADDRESS}
code: nightly-export
project: larkspur
schedule: every day at 02:00
steps:
  - step: fetch
    retries: 2
  - step: validate
    on_invalid: fail
`

const ORDER_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": "order_id",
  "properties": {
    "order_id": { "type": "string" },
    "total": { "type": "numeric", "minimum": 0 }
  }
}`

function NamedSchemas() {
    const [job, setJob] = useState(NAMED_JOB)
    const [order, setOrder] = useState(ORDER_SCHEMA)
    return (
        <Ground>
            <Field id="named-job" label="Definition" hint="Names its schema in its first line; the app finds it by address.">
                <CodeEditor
                    label="Definition"
                    language="yaml"
                    value={job}
                    onChange={setJob}
                    resolveSchema={(address) => (address === JOB_ADDRESS ? JOB_SCHEMA : undefined)}
                    className="h-64"
                />
            </Field>
            <Field
                id="order-schema"
                label="Order schema"
                hint="A schema document, checked against the JSON Schema 2020-12 dialect it names."
            >
                <CodeEditor
                    label="Order schema"
                    language={languageForMediaType('application/schema+json')}
                    value={order}
                    onChange={setOrder}
                    className="h-56"
                />
            </Field>
        </Ground>
    )
}

const QUERY = `-- The runs that failed last night, by job
select job, count(*) as failures, max(started) as last_failed
from runs
where state = 'failed'
  and project = 'larkspur'
  and started >= date '2026-11-03'
group by job
order by failures desc;`

const SCRIPT = `#!/usr/bin/env bash
# Retry the failed runs of a job from the step they stopped on
set -euo pipefail
job="\${1:-nightly-export}"
for run in $(tidevann runs --job "$job" --state failed --ids); do
  echo "retrying $run"
  tidevann retry "$run" --from validate
done`

const DIGEST = `{# The morning mail send-digest writes #}
Runs in {{ project | title }} since {{ since }}:
{% for run in runs if run.state == "failed" %}
- {{ run.job }} stopped at {{ run.failed_step }} ({{ run.rejected }} rows)
{% else %}
Nothing failed.
{% endfor %}`

function Languages() {
    const [query, setQuery] = useState(QUERY)
    const [script, setScript] = useState(SCRIPT)
    const [digest, setDigest] = useState(DIGEST)
    return (
        <Ground>
            <Field id="sql" label="Query">
                <CodeEditor label="Query" language="sql" value={query} onChange={setQuery} className="h-52" />
            </Field>
            <Field id="shell" label="Script">
                <CodeEditor label="Script" language="shell" value={script} onChange={setScript} className="h-52" />
            </Field>
            <Field id="jinja" label="Template">
                <CodeEditor label="Template" language="jinja" value={digest} onChange={setDigest} className="h-52" />
            </Field>
        </Ground>
    )
}

const RECORD_TEXT = JSON.stringify(RECORD, null, 2)

/** A key's name in the record, as a range to reveal. */
const keyRange = (key: string): CodeRange => {
    const from = RECORD_TEXT.indexOf(`"${key}"`)
    return { from, to: from + key.length + 2 }
}

const PLACES = [
    { label: 'Failed step', key: 'failed_step' },
    { label: 'Schedule', key: 'schedule' },
    { label: 'Labels', key: 'labels' },
]

function Revealing() {
    const [reveal, setReveal] = useState<CodeRange>(() => keyRange('failed_step'))
    return (
        <Ground>
            <Row gap="sm">
                {PLACES.map((place) => (
                    <Button key={place.key} size="sm" variant="outline" onClick={() => setReveal(keyRange(place.key))}>
                        {place.label}
                    </Button>
                ))}
            </Row>
            <CodeEditor label="Stored record" language="json" value={RECORD_TEXT} readOnly reveal={reveal} className="h-48" />
        </Ground>
    )
}

const LOG = Array.from({ length: 40 }, (_, index) => {
    const job = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest'][index % 4]
    const state = ['succeeded', 'failed', 'succeeded', 'running', 'skipped'][index % 5]
    const minute = String(index).padStart(2, '0')
    return `2026-11-04T02:${minute}:00Z ${job.padEnd(15)} ${state.padEnd(10)} step=${['fetch', 'transform', 'validate', 'upload'][index % 4]}`
}).join('\n')

const NOTE_TEXT = [
    '## Nightly export',
    '',
    'Runs at 02:00 on the worker and writes to the **larkspur** bucket. When it fails,',
    'follow [[Retry a run]] and tell the owner of [[harbor]]. The *validate* step rejects',
    'rows without an `order_id`; see [the schema](https://example.org/schemas/orders).',
    '',
    '- [x] fetch and transform',
    '- [ ] move notify to the new scheduler',
    '',
    '> Asked in [[Weekly sync with grace]]: keep a week of exports?',
    '',
    '#runbook #on-call',
].join('\n')

const NOTES: CodeCompletion[] = [
    { label: 'Nightly export', detail: 'Jobs' },
    { label: 'Retry a run', detail: 'Runbooks' },
    { label: 'harbor', detail: 'Projects' },
    { label: 'juniper', detail: 'Projects' },
    { label: 'larkspur', detail: 'Projects' },
    { label: 'Weekly sync with grace', detail: 'Meetings' },
]

function MarkdownNote() {
    const [note, setNote] = useState(NOTE_TEXT)
    return (
        <Ground>
            <CodeEditor label="Note" language="markdown" value={note} onChange={setNote} links={NOTES} wrap size="lg" className="h-96" />
        </Ground>
    )
}

function Searching() {
    return (
        <Ground>
            <CodeEditor label="Run log" value={LOG} readOnly search defaultSearch="failed" size="sm" className="h-96" />
        </Ground>
    )
}

function Folding() {
    const [record, setRecord] = useState(RUNS)
    return (
        <Ground>
            <CodeEditor label="Runs" language="json" value={record} onChange={setRecord} folding search className="h-96" />
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

function InDialog() {
    return (
        <Dialog defaultOpen>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>nightly-export</DialogTitle>
                    <DialogDescription>The job as the server stores it.</DialogDescription>
                </DialogHeader>
                <Field id="stored" label="Stored record">
                    <CodeEditor label="Stored record" language="json" value={JSON.stringify(RECORD, null, 2)} readOnly className="h-64" />
                </Field>
                <DialogFooter showCloseButton />
            </DialogContent>
        </Dialog>
    )
}

const meta: Meta = { title: 'Patterns/Editor', parameters: { frame: 'padded' } }
export default meta

export const Editors_: StoryObj = { name: 'Code editor', render: () => <Editors /> }
/** Prose in the editor with its long lines folded at the edge rather than scrolling sideways. */
export const Wrapped: StoryObj = { name: 'Wrapped text', render: () => <WrappedText /> }
/** A JSON record with a fold gutter: each object and array folds from the gutter or Mod-Alt-[. */
export const Folded: StoryObj = { name: 'Folding', render: () => <Folding /> }
/** A run log, read only and small, with the find bar open on a query. Mod-f opens it, Escape closes it. */
export const Searched: StoryObj = { name: 'Search', render: () => <Searching /> }
/** A range selected and scrolled into view, as when a check names where it failed; each button moves there again. */
export const Revealed: StoryObj = { name: 'Reveal', render: () => <Revealing /> }
/**
 * A jq filter: its keywords, strings and their interpolation, fields, variables and formats
 * highlighted; the run's fields offered after a dot and jq's built-ins while typing a name; a
 * built-in's docs on hover; a ranged error underlined, its dot in the gutter and its message on hover;
 * Mod-Enter runs it.
 */
export const Jq: StoryObj = { name: 'jq', render: () => <JqFilter /> }
/** SQL, a shell script and a Jinja template, each language loaded the first time an editor shows it. */
export const Languages_: StoryObj = { name: 'Languages', render: () => <Languages /> }
/**
 * YAML checked against a JSON Schema as it is typed: each issue underlined on the value or key it is
 * about, with its message on hover, and the schema's property names and enum values offered while
 * typing, required ones first, a key with a default put in with it selected.
 */
export const Schema: StoryObj = { name: 'Schema', render: () => <SchemaChecked /> }
/**
 * Documents that name their own schema: YAML by a `# yaml-language-server: $schema=` line the app
 * resolves, and a JSON Schema checked against the 2020-12 dialect its `$schema` names, with no fetch.
 * A key's type and description show on hover, and keys already written are not offered again.
 */
export const NamedSchema: StoryObj = { name: 'Named schema', render: () => <NamedSchemas /> }
/**
 * A note in markdown at the large size, wrapped: headings, strong and emphasized words, code,
 * lists, quotes, links, `[[links]]` to other notes and `#tags` highlighted. Typing `[[` offers the
 * notes by name, and the one chosen goes in with its closing brackets.
 */
export const Markdown: StoryObj = { name: 'Markdown', render: () => <MarkdownNote /> }
/** A read-only record in a dialog: the field and its line numbers one ground over the dialog's surface. */
export const InADialog: StoryObj = { name: 'In a dialog', render: () => <InDialog /> }
export const SourceOpen: StoryObj = { name: 'Source sheet, open', render: () => <Source open /> }
