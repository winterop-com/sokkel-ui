/** The chosen step's settings, drawn from the pipeline schema and written back into the YAML as they change. */

import type { SharedDocument } from '@winterop-com/sokkel-ui/CodeEditor'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { ScrollArea } from '@winterop-com/sokkel-ui/primitives/scroll-area'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { SchemaForm, useSchemaForm } from '@winterop-com/sokkel-ui/schema/SchemaForm'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useMemo, useState } from 'react'

import { holdsReference, KIND_DOCS, PIPELINE_SCHEMA, STEP_KINDS, type Pipeline, type StepKind } from '../pipeline'
import { renameStep, setStepFields, STEP_ID, stepFields } from '../pipeline-edit'
import { KIND_ICONS, renamePlace } from './PipelineCanvas'

const isKind = (kind: string): kind is StepKind => (STEP_KINDS as readonly string[]).includes(kind)

/** What a step of a kind is set with: its retries and timeout, and the settings its kind takes. */
function settingsSchema(kind: StepKind): JsonSchema {
    const step = PIPELINE_SCHEMA.$defs?.step as JsonSchema
    return {
        type: 'object',
        additionalProperties: false,
        properties: {
            retries: { ...(step.properties?.retries as JsonSchema), title: 'Retries' },
            timeout: { ...(step.properties?.timeout as JsonSchema), title: 'Timeout' },
            with: { ...(PIPELINE_SCHEMA.$defs?.[kind] as JsonSchema), title: 'Settings' },
        },
    }
}

/** Why a step cannot take an id, or null. */
function idProblem(pipeline: Pipeline, id: string, next: string): string | null {
    if (!STEP_ID.test(next)) return 'Lowercase letters, digits and dashes, starting with a letter.'
    if (next !== id && pipeline.steps.some((step) => step.id === next)) return `Another step is named ${next}.`
    return null
}

/** A step's id, taken when the field is left or Enter is pressed, and refused while taken or malformed. */
function IdField({ pipeline, id, onRename }: { pipeline: Pipeline; id: string; onRename: (next: string) => void }) {
    const [draft, setDraft] = useState(id)
    const problem = idProblem(pipeline, id, draft)
    const take = () => {
        if (draft !== id && problem === null) onRename(draft)
    }
    return (
        <TextField
            id={`step-id-${id}`}
            label="Id"
            help="What needs and references name the step by; renaming it renames them too."
            error={problem}
            mono
            value={draft}
            onChange={setDraft}
            onBlur={take}
            onEnter={take}
            onEscape={() => setDraft(id)}
        />
    )
}

/** The form of one step's settings, held by the YAML: each change is written back, and an edit of the text redraws it. */
function Settings({ doc, text, id, kind }: { doc: SharedDocument; text: string; id: string; kind: StepKind }) {
    const schema = useMemo(() => settingsSchema(kind), [kind])
    const value = useMemo(() => stepFields(text, id) ?? {}, [text, id])
    const form = useSchemaForm(schema, {
        value,
        onChange: (next) => doc.replace(setStepFields(doc.text, id, (next ?? {}) as Record<string, unknown>), { join: true }),
        deferred: holdsReference,
        defaultSubmitted: true,
    })
    return <SchemaForm form={form} />
}

export interface StepSettingsProps {
    fileId: string
    doc: SharedDocument
    text: string
    pipeline: Pipeline
    selected: string | null
    /** The chosen step was renamed. */
    onRenamed: (id: string) => void
}

/** The chosen step: its kind, its id, and its settings as a form drawn from the pipeline schema. */
export function StepSettings({ fileId, doc, text, pipeline, selected, onRenamed }: StepSettingsProps) {
    const step = selected === null ? undefined : pipeline.steps.find((each) => each.id === selected)
    if (step === undefined || !isKind(step.kind))
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>No step chosen</EmptyTitle>
                    <EmptyDescription>Choose a step on the graph to set it here.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        )
    const Icon = KIND_ICONS[step.kind]
    return (
        <ScrollArea className="h-full">
            <Stack gap="lg" className="p-4">
                <Row gap="sm" align="start">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Stack gap="3xs" className="min-w-0">
                        <p className="font-mono text-sm">{step.kind}</p>
                        <p className="text-xs text-muted-foreground">{KIND_DOCS[step.kind]}</p>
                    </Stack>
                </Row>
                <IdField
                    key={`id:${step.id}`}
                    pipeline={pipeline}
                    id={step.id}
                    onRename={(next) => {
                        doc.replace(renameStep(doc.text, step.id, next))
                        renamePlace(fileId, step.id, next)
                        onRenamed(next)
                    }}
                />
                <Settings key={`settings:${step.id}`} doc={doc} text={text} id={step.id} kind={step.kind} />
            </Stack>
        </ScrollArea>
    )
}
