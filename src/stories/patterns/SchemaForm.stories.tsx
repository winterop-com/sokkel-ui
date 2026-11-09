import type { Meta, StoryObj } from '@storybook/react-vite'
import { RotateCw } from 'lucide-react'
import { useState } from 'react'

import { CodeEditor, languageForMediaType } from '@winterop-com/sokkel-ui/CodeEditor'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import {
    SchemaForm,
    SchemaIssueCount,
    useSchemaForm,
    type SchemaFieldRenderer,
    type ServerIssue,
} from '@winterop-com/sokkel-ui/schema/SchemaForm'
import type { Path } from '@winterop-com/sokkel-ui/schema/issues'
import { useSubmit } from '@winterop-com/sokkel-ui/hooks/use-submit'

/**
 * A form drawn from a JSON Schema: a field per property, checked against the schema as it is
 * filled in. A field with a problem gets a colored edge and a mark at the end of its input;
 * pressing the mark says what is wrong and offers the fix when one is plain. The footer counts
 * what stops Create. Nothing is inserted between the fields, so the dialog never changes height.
 */
const meta: Meta = { title: 'Patterns/Schema form', parameters: { frame: 'padded' } }
export default meta

const JOB: JsonSchema = {
    type: 'object',
    required: ['code', 'name', 'endpoint', 'schedule', 'timeout'],
    properties: {
        code: {
            type: 'string',
            title: 'Code',
            pattern: '^[a-z][a-z0-9-]*$',
            maxLength: 40,
            description: 'Lowercase, as in nightly-export.',
        },
        name: { type: 'string', title: 'Name', maxLength: 64 },
        endpoint: { type: 'string', title: 'Endpoint', format: 'uri', description: 'Called with POST on each run.' },
        schedule: {
            type: 'string',
            title: 'Schedule',
            pattern: '^(\\S+\\s){4}\\S+$',
            maxLength: 64,
            description: 'Five cron fields, in UTC.',
        },
        timeout: { type: 'integer', title: 'Timeout', minimum: 1, maximum: 3600, description: 'Seconds.' },
        priority: { type: 'string', title: 'Priority', enum: ['low', 'normal', 'high'], default: 'normal' },
        paused: { type: 'boolean', title: 'Paused', description: 'A paused job keeps its schedule and does not run.' },
    },
}

const TYPED = {
    code: '24h-export',
    endpoint: 'hooks.example.org/larkspur/export',
    schedule: '0 * * * *',
    timeout: 7200,
    priority: 'normal',
}

function NewJob({
    initial,
    issues,
    submitted = false,
    open,
}: {
    initial?: unknown
    issues?: readonly ServerIssue[]
    submitted?: boolean
    open?: Path
}) {
    const form = useSchemaForm(JOB, { initial, issues, defaultSubmitted: submitted, defaultOpen: open })
    const [created, setCreated] = useState(false)
    return (
        <DialogShell
            open
            onOpenChange={() => undefined}
            title="New job"
            description="Calls the endpoint on its schedule, in the larkspur project."
            count={<SchemaIssueCount form={form} />}
            confirm={{ label: created ? 'Created' : 'Create', onConfirm: () => setCreated(form.submit()) }}
        >
            <SchemaForm form={form} />
        </DialogShell>
    )
}

/** A pretend server that has a job called nightly-export already. */
const createJob = (value: unknown): Promise<readonly ServerIssue[]> =>
    Promise.resolve(
        (value as { code?: string }).code === 'nightly-export'
            ? [
                  {
                      path: ['code'],
                      text: 'nightly-export is taken',
                      detail: 'Codes are unique in the larkspur project. Try nightly-export-2.',
                  },
              ]
            : [],
    )

function SendingJob() {
    const submit = useSubmit({ check: () => form.submit(), waiting: () => form.checking, send: () => createJob(form.value) })
    const form = useSchemaForm(JOB, {
        initial: {
            code: 'nightly-export',
            name: 'Nightly export',
            endpoint: 'https://hooks.example.org/larkspur/export',
            schedule: '0 2 * * *',
            timeout: 300,
        },
        issues: submit.issues,
    })
    return (
        <DialogShell
            open
            onOpenChange={() => undefined}
            title="New job"
            description="Calls the endpoint on its schedule, in the larkspur project."
            count={<SchemaIssueCount form={form} />}
            confirm={{ label: submit.done ? 'Created' : 'Create', busy: submit.busy, busyLabel: 'Creating', onConfirm: submit.submit }}
        >
            <SchemaForm form={form} />
        </DialogShell>
    )
}

/** An empty form, each field drawn from its schema: text, a code in mono, a number, a choice and a switch. */
export const Empty: StoryObj = { name: 'Empty', render: () => <NewJob /> }

/** Values typed in and Create pressed: the marks, the count beside the verb, and the first mark open with its fix. */
export const AfterCreate: StoryObj = {
    name: 'After Create',
    render: () => <NewJob initial={TYPED} submitted open={['code']} />,
}

const REFUSED: readonly ServerIssue[] = [
    {
        path: ['endpoint'],
        text: 'Couldn’t reach hooks.example.org',
        detail: 'It did not answer within 10 seconds. Check the address, or that it accepts connections from this server.',
        actions: [{ label: 'Check again', icon: <RotateCw aria-hidden />, onClick: () => undefined }],
    },
]

/** The server refused the endpoint: its words land on the field, with Check again, until the field is changed. */
export const ServerRefusal: StoryObj = {
    name: 'Server refusal',
    render: () => (
        <NewJob
            initial={{
                ...TYPED,
                code: 'nightly-export',
                name: 'Nightly export',
                endpoint: 'https://hooks.example.org/larkspur/export',
                timeout: 900,
            }}
            issues={REFUSED}
            open={['endpoint']}
        />
    ),
}

/**
 * Create sent through `useSubmit`: the checks run first, a second press while it is sent is
 * ignored, and the server's refusal comes back at its field, here a code that is taken.
 */
export const Sending: StoryObj = { name: 'Sending', render: () => <SendingJob /> }

const PIPELINE: JsonSchema = {
    type: 'object',
    required: ['code', 'steps'],
    properties: {
        code: { type: 'string', title: 'Code', pattern: '^[a-z][a-z0-9-]*$' },
        owner: { type: 'string', title: 'Owner', format: 'email' },
        retry: {
            type: 'object',
            title: 'Retry',
            description: 'What happens when a step fails.',
            properties: {
                attempts: { type: 'integer', title: 'Attempts', minimum: 0, maximum: 10, default: 3 },
                backoff: { type: 'string', title: 'Backoff', enum: ['none', 'linear', 'exponential'], default: 'exponential' },
            },
        },
        notify: { type: 'array', title: 'Notify on', items: { enum: ['failed', 'succeeded', 'cancelled'] }, uniqueItems: true },
        tags: { type: 'array', title: 'Tags', items: { type: 'string', minLength: 2 }, maxItems: 4 },
        steps: {
            type: 'array',
            title: 'Steps',
            minItems: 1,
            items: {
                type: 'object',
                required: ['code', 'run'],
                properties: {
                    code: { type: 'string', title: 'Code', pattern: '^[a-z][a-z0-9-]*$' },
                    run: { type: 'string', title: 'Run', description: 'The block it runs.' },
                },
            },
        },
        headers: {
            type: 'object',
            title: 'Headers',
            additionalProperties: { type: 'string' },
            description: 'Sent with every call, as JSON.',
        },
    },
}

function NewPipeline() {
    const form = useSchemaForm(PIPELINE, {
        initial: {
            code: 'harbor-orders',
            owner: 'ada@example.org',
            retry: { attempts: 3, backoff: 'exponential' },
            notify: ['failed'],
            tags: ['orders', 'x'],
            steps: [{ code: 'fetch', run: 'http.get' }, { code: 'Load rows' }],
            headers: { 'x-team': 'harbor' },
        },
        defaultSubmitted: true,
    })
    return (
        <DialogShell
            open
            onOpenChange={() => undefined}
            width="lg"
            title="New pipeline"
            count={<SchemaIssueCount form={form} />}
            confirm={{ label: 'Create', onConfirm: () => form.submit() }}
        >
            <SchemaForm form={form} />
        </DialogShell>
    )
}

/** A nested object, a set of choices, a list of values, a list of objects, and a map edited as JSON; the strip beside the body marks where each issue sits down the form. */
export const NestedAndLists: StoryObj = { name: 'Nested and lists', render: () => <NewPipeline /> }

const STEP: JsonSchema = {
    type: 'object',
    required: ['code', 'script'],
    properties: {
        code: { type: 'string', title: 'Code', pattern: '^[a-z][a-z-]*$' },
        script: {
            type: 'string',
            title: 'Script',
            contentMediaType: 'text/x-shellscript',
            description: 'Runs on the worker, in the step folder.',
        },
        query: { type: 'string', title: 'Query', contentMediaType: 'application/sql', description: 'Picks the rows the step uploads.' },
    },
}

/** A field that names the media type it holds is edited as code in that language; every other field is the form's own. */
const codeFields: SchemaFieldRenderer = (field) => {
    const type = field.schema.contentMediaType
    if (typeof type !== 'string') return undefined
    return (
        <CodeEditor
            label={field.label ?? String(field.path[field.path.length - 1])}
            id={field.id}
            onBlur={field.touch}
            language={languageForMediaType(type)}
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={field.set}
            readOnly={field.readOnly}
            invalid={field.invalid}
            className="h-32"
        />
    )
}

function NewStep() {
    const form = useSchemaForm(STEP, {
        initial: {
            code: 'upload',
            script: '#!/usr/bin/env bash\nset -euo pipefail\naws s3 cp out/orders.csv "s3://larkspur-exports/$(date +%F)/"',
            query: "select id, total from orders\nwhere state = 'succeeded'",
        },
    })
    return (
        <DialogShell
            open
            onOpenChange={() => undefined}
            width="lg"
            title="New step"
            count={<SchemaIssueCount form={form} />}
            confirm={{ label: 'Create', onConfirm: () => form.submit() }}
        >
            <SchemaForm form={form} field={codeFields} />
        </DialogShell>
    )
}

/**
 * The app's own control for some fields through `field`: a string whose schema names its
 * `contentMediaType` is edited in `CodeEditor` in that language, here shell and SQL, while the
 * form keeps the label, the help and the issue marks around it.
 */
export const OwnControls: StoryObj = { name: 'Own controls', render: () => <NewStep /> }

const BROKEN: JsonSchema = {
    type: 'object',
    properties: { code: { type: 'string', title: 'Code', pattern: '[' }, name: { type: 'string', title: 'Name' } },
}

function Unchecked() {
    const form = useSchemaForm(BROKEN)
    return (
        <DialogShell
            open
            onOpenChange={() => undefined}
            title="New job"
            count={<SchemaIssueCount form={form} />}
            confirm={{ label: 'Create', onConfirm: () => form.submit() }}
        >
            <SchemaForm form={form} />
        </DialogShell>
    )
}

/** A schema that cannot be compiled, here a broken pattern: the form says so and refuses to send, rather than letting everything through. */
export const CannotCheck: StoryObj = { name: 'Cannot check', render: () => <Unchecked /> }
