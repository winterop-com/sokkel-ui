import type { Meta, StoryObj } from '@storybook/react-vite'
import { RotateCw } from 'lucide-react'
import { useState } from 'react'

import { DialogShell } from '../../components/DialogShell'
import type { JsonSchema } from '../../components/schema/read'
import { SchemaForm, SchemaIssueCount, useSchemaForm, type ServerIssue } from '../../components/schema/SchemaForm'
import type { Path } from '../../components/schema/validate'

/**
 * A form drawn from a JSON Schema: a field per property, checked against the schema as it is
 * filled in. A field with a problem gets a colored edge and a mark at the end of its input;
 * pressing the mark says what is wrong and offers the fix when one is plain. The footer counts
 * what stops Create. Nothing is inserted between the fields, so the dialog never changes height.
 */
const meta: Meta = { title: 'Patterns/Schema form' }
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
        <div className="min-h-svh bg-background p-6 text-foreground">
            <DialogShell
                open
                onOpenChange={() => undefined}
                title="New job"
                description="Calls the endpoint on its schedule, in the larkspur project."
                footer={<SchemaIssueCount form={form} />}
                confirm={{ label: created ? 'Created' : 'Create', onConfirm: () => setCreated(form.submit()) }}
            >
                <SchemaForm form={form} />
            </DialogShell>
        </div>
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
        <div className="min-h-svh bg-background p-6 text-foreground">
            <DialogShell
                open
                onOpenChange={() => undefined}
                width="lg"
                title="New pipeline"
                footer={<SchemaIssueCount form={form} />}
                confirm={{ label: 'Create', onConfirm: () => form.submit() }}
            >
                <SchemaForm form={form} />
            </DialogShell>
        </div>
    )
}

/** A nested object, a set of choices, a list of values, a list of objects, and a map edited as JSON. */
export const NestedAndLists: StoryObj = { name: 'Nested and lists', render: () => <NewPipeline /> }

const BROKEN: JsonSchema = {
    type: 'object',
    properties: { code: { type: 'string', title: 'Code', pattern: '[' }, name: { type: 'string', title: 'Name' } },
}

function Unchecked() {
    const form = useSchemaForm(BROKEN)
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <DialogShell
                open
                onOpenChange={() => undefined}
                title="New job"
                footer={<SchemaIssueCount form={form} />}
                confirm={{ label: 'Create', onConfirm: () => form.submit() }}
            >
                <SchemaForm form={form} />
            </DialogShell>
        </div>
    )
}

/** A schema that cannot be compiled, here a broken pattern: the form says so and refuses to send, rather than letting everything through. */
export const CannotCheck: StoryObj = { name: 'Cannot check', render: () => <Unchecked /> }
