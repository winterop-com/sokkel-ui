import type { Meta, StoryObj } from '@storybook/react-vite'
import { Save } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { CodeEditor, type CodeProblem, type CodeRange } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { useUnsavedChanges } from '@winterop-com/sokkel-ui/UnsavedChanges'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { PipelineGraph, type PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { EditorApp } from './frame'

const KINDS = ['fetch', 'transform', 'validate', 'upload', 'notify'] as const

/** A step's `with` for one kind: only its own keys, the required ones named. */
const settings = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({
    type: 'object',
    additionalProperties: false,
    required,
    properties,
})

/** When a step is of a kind, what its `with` holds. */
const branch = (kind: string, settingsSchema: JsonSchema): JsonSchema => ({
    if: { properties: { kind: { const: kind } }, required: ['kind'] },
    // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
    then: { properties: { with: settingsSchema } },
})

/** A job's pipeline: its steps, each checked by its kind through `allOf` and `if`. */
const PIPELINE_SCHEMA: JsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    required: ['job', 'steps'],
    additionalProperties: false,
    properties: {
        job: { type: 'string', pattern: '^[a-z][a-z-]*$', description: 'The job code, lowercase with dashes.' },
        project: { enum: ['harbor', 'juniper', 'larkspur'], description: 'The project the job runs in.' },
        schedule: { type: 'string', description: 'When the job runs, as a cron line.' },
        steps: { type: 'array', minItems: 1, description: 'What the job does, in order of need.', items: { $ref: '#/$defs/step' } },
    },
    $defs: {
        step: {
            type: 'object',
            required: ['id', 'kind'],
            additionalProperties: false,
            properties: {
                id: { type: 'string', pattern: '^[a-z][a-z-]*$', description: 'The step code, unique in the job.' },
                kind: { enum: [...KINDS], description: 'What the step does; it decides what `with` holds.' },
                needs: { type: 'array', items: { type: 'string' }, description: 'The steps that run before this one.' },
                retries: { type: 'integer', minimum: 0, maximum: 5, default: 2, description: 'How often a failed step is tried again.' },
                with: { type: 'object', description: "The step's settings, by its kind." },
            },
            allOf: [
                branch(
                    'fetch',
                    settings(
                        {
                            url: { type: 'string', format: 'uri', description: 'Where the rows come from.' },
                            since: { type: 'string', default: '24h', description: 'How far back to read.' },
                        },
                        ['url'],
                    ),
                ),
                branch(
                    'transform',
                    settings({ script: { type: 'string', description: 'The jq program that shapes each row.' } }, ['script']),
                ),
                branch(
                    'validate',
                    settings(
                        {
                            rules: { enum: ['orders', 'inventory', 'customers'], description: 'The rule set rows are checked by.' },
                            on_invalid: { enum: ['warn', 'skip'], default: 'warn', description: 'What happens to a row the rules refuse.' },
                        },
                        ['rules'],
                    ),
                ),
                branch(
                    'upload',
                    settings(
                        {
                            bucket: { type: 'string', description: 'Where the rows are kept.' },
                            prefix: { type: 'string', description: 'The folder in the bucket.' },
                        },
                        ['bucket'],
                    ),
                ),
                branch(
                    'notify',
                    settings(
                        {
                            channel: { type: 'string', pattern: '^#', description: 'The channel told, with its #.' },
                            on: {
                                type: 'array',
                                items: { enum: ['succeeded', 'failed', 'cancelled'] },
                                description: 'The run states told.',
                            },
                        },
                        ['channel'],
                    ),
                ),
            ],
        },
    },
}

const PIPELINE = `job: nightly-export
project: larkspur
schedule: "0 2 * * *"
steps:
  - id: fetch-orders
    kind: fetch
    retries: \${vars.fetch_retries}
    with:
      url: \${vars.orders_api}
      since: 24h
  - id: shape-rows
    kind: transform
    needs: [fetch-orders]
    with:
      script: orders.jq
  - id: check-orders
    kind: validate
    needs: [shape-rows]
    with:
      rules: orders
      on_invalid: fail
  - id: keep-exports
    kind: upload
    needs: [check-orders]
    with:
      bucket: larkspur-exports
      prefix: orders/\${run.date}
  - id: tell-team
    kind: notify
    needs: [keep-exports]
    with:
      channel: "#larkspur"
      on: [failed]
`

/** A value holding a `${...}` reference, filled in when the job runs and so left unchecked. */
const deferred = (value: unknown) => typeof value === 'string' && /\$\{[^}]+\}/.test(value)

interface StepValue {
    id?: unknown
    kind?: unknown
    needs?: unknown
}

/** The steps as the graph draws them, each with the problems found inside it. */
function stepsOf(value: unknown, problems: readonly CodeProblem[]): PipelineStep[] {
    const list = (value as { steps?: unknown } | null)?.steps
    if (!Array.isArray(list)) return []
    return (list as StepValue[]).flatMap((step, index) => {
        if (typeof step !== 'object' || step === null || typeof step.id !== 'string') return []
        const issues: Issue[] = problems
            .filter((problem) => problem.path?.[0] === 'steps' && problem.path[1] === index)
            .map((problem) => ({ tone: problem.tone === 'error' ? 'critical' : 'warning', text: problem.message }))
        return [
            {
                code: step.id,
                kind: typeof step.kind === 'string' ? step.kind : undefined,
                needs: Array.isArray(step.needs) ? step.needs.filter((need): need is string => typeof need === 'string') : [],
                issues,
            },
        ]
    })
}

/** The step a problem is in, by its id in the document. */
function stepOf(problem: CodeProblem, value: unknown): string {
    const list = (value as { steps?: StepValue[] } | null)?.steps
    if (problem.path?.[0] !== 'steps' || typeof problem.path[1] !== 'number' || !Array.isArray(list)) return ''
    const id = list[problem.path[1]]?.id
    return typeof id === 'string' ? id : ''
}

function PipelineEditor() {
    const [text, setText] = useState(PIPELINE)
    const [saved, setSaved] = useState(PIPELINE)
    const [value, setValue] = useState<unknown>(null)
    const [problems, setProblems] = useState<readonly CodeProblem[]>([])
    const [reveal, setReveal] = useState<CodeRange | null>(null)
    const [selected, setSelected] = useState<string | null>(null)
    const dirty = text !== saved
    const leave = useUnsavedChanges(dirty)
    const errors = problems.filter((problem) => problem.tone === 'error').length
    const steps = useMemo(() => stepsOf(value, problems), [value, problems])
    const reason = !dirty
        ? 'No changes to save'
        : errors > 0
          ? `Fix ${String(errors)} ${errors === 1 ? 'problem' : 'problems'} first`
          : undefined
    const save = () => {
        if (reason === undefined) setSaved(text)
    }

    const columns: DataColumn<CodeProblem>[] = [
        {
            id: 'message',
            header: 'Problem',
            width: 'minmax(14rem,1fr)',
            stack: 'primary',
            cell: (problem) => (
                <span>
                    <Dot status={problem.tone === 'error' ? 'failed' : 'queued'} size="md" label={problem.tone} /> {problem.message}
                </span>
            ),
        },
        { id: 'step', header: 'Step', width: '9rem', stack: 'secondary', cell: (problem) => stepOf(problem, value) },
        {
            id: 'line',
            header: 'Line',
            width: '6rem',
            align: 'end',
            stack: 'secondary',
            sortValue: (problem) => problem.from,
            cell: (problem) => <span className="font-mono">{`${String(problem.line)}:${String(problem.column)}`}</span>,
        },
    ]

    const choose = (code: string | null) => {
        setSelected(code)
        const index = steps.findIndex((step) => step.code === code)
        if (index >= 0) setReveal({ path: ['steps', index] })
    }

    return (
        <EditorApp
            place="pipelines"
            trail={[
                { label: 'Pipelines', href: '#' },
                { label: 'nightly-export', code: true },
            ]}
        >
            <PaneHeader
                title="nightly-export.yaml"
                meta={dirty ? <Chip tone="warning">unsaved</Chip> : 'larkspur'}
                actions={
                    <Button size="sm" reason={reason} onClick={save}>
                        <Save aria-hidden />
                        Save
                    </Button>
                }
            />
            <Fill>
                <SplitPane
                    defaultShare={0.55}
                    minShare={0.3}
                    maxShare={0.75}
                    narrowBelow={720}
                    first={
                        <SplitPane
                            direction="down"
                            defaultShare={0.7}
                            first={
                                <CodeEditor
                                    label="Pipeline"
                                    language="yaml"
                                    variant="pane"
                                    size="sm"
                                    value={text}
                                    onChange={setText}
                                    schema={PIPELINE_SCHEMA}
                                    deferred={deferred}
                                    onProblems={setProblems}
                                    onDocument={setValue}
                                    reveal={reveal}
                                    keys={{ 'Mod-s': save }}
                                    folding
                                    indentGuides
                                />
                            }
                            second={
                                <Stack gap="none" className="h-full min-h-0">
                                    <PaneHeader title="Problems" meta={String(problems.length)} />
                                    <Fill>
                                        <DataTable
                                            variant="list"
                                            columns={columns}
                                            rows={problems}
                                            rowKey={(problem) => `${String(problem.from)}-${problem.message}`}
                                            onOpen={(problem) => setReveal({ from: problem.from, to: problem.to })}
                                            empty="No problems"
                                            stackBelow={420}
                                            minWidth="auto"
                                        />
                                    </Fill>
                                </Stack>
                            }
                        />
                    }
                    second={
                        <PipelineGraph
                            steps={steps}
                            selected={selected}
                            onSelect={choose}
                            spacing="compact"
                            words={{ label: 'nightly-export' }}
                        />
                    }
                />
            </Fill>
            {leave.dialog}
        </EditorApp>
    )
}

const meta: Meta = { title: 'Editors/Pipeline' }
export default meta

/**
 * A job's pipeline in YAML, checked against a step schema whose `with` depends on each step's kind
 * (`allOf` of `if`/`then`): keys and values complete as they are typed, and a key's description shows
 * on hover. Values holding a `${...}` reference are deferred, left unchecked until the job runs. The
 * problems list under the editor reveals each problem's place, and the graph beside it is drawn from
 * the document as it changes, a step's problems marked on its box; choosing a step selects it in the
 * text. Save (or Mod-s) keeps the text once it has changes and no errors; leaving with unsaved
 * changes asks first.
 */
export const Pipeline: StoryObj = { render: () => <PipelineEditor /> }
