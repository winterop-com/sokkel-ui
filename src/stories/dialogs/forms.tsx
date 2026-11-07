import { TextField } from '../../components/TextField'
import { CheckboxField, CheckboxList } from '../../components/CheckboxField'
import { IconButton } from '../../components/IconButton'
import { GripVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog, DialogShell, NESTED } from '../../components/DialogShell'
import { Field } from '../../components/Field'
import { IssueCount, type Issue } from '../../components/IssueMark'
import { SaveBar } from '../../components/SaveBar'
import type { JsonSchema } from '../../components/schema/read'
import { SchemaForm, SchemaIssueCount, useSchemaForm } from '../../components/schema/SchemaForm'
import { Segmented } from '../../components/Segmented'
import { UnsavedChangesDialog, useUnsavedGuard } from '../../components/UnsavedChanges'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { cn } from '../../lib/cn'
import { Behind, wait } from './parts'
import { Row, Stack } from '../../components/Layout'

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

/** Create pressed with three values the schema refuses: their marks, and the count beside the verb that goes to the first. */
export function CreateJob() {
    const [open, setOpen] = useState(true)
    const form = useSchemaForm(JOB, {
        initial: {
            code: 'Send-Digest',
            name: 'Send digest',
            endpoint: 'hooks.example.org/juniper/digest',
            schedule: '0 7 * * 1-5',
            timeout: 7200,
            priority: 'normal',
        },
        defaultSubmitted: true,
    })
    return (
        <Behind action="New job" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="New job"
                description="Calls the endpoint on its schedule, in the juniper project."
                count={<SchemaIssueCount form={form} />}
                confirm={{
                    label: 'Create',
                    onConfirm: () => {
                        if (form.submit()) setOpen(false)
                    },
                }}
            >
                <SchemaForm form={form} />
            </DialogShell>
        </Behind>
    )
}

const SAVED = { name: 'Import orders', description: 'Loads the monthly orders file into the warehouse.', timeout: '900' }

/** Cancel pressed after editing: the question on top of the form, which keeps its changes if you go back to it. */
export function UnsavedEdit() {
    const [open, setOpen] = useState(true)
    const [saved, setSaved] = useState(SAVED)
    const [draft, setDraft] = useState({ ...SAVED, name: 'Import monthly orders', timeout: '1200' })
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
    const guard = useUnsavedGuard({
        dirty,
        defaultAsking: true,
        onClose: () => {
            setDraft(saved)
            setOpen(false)
        },
    })
    const [issueOpen, setIssueOpen] = useState(false)
    const timeoutIssues: Issue[] = /^\d+$/.test(draft.timeout)
        ? []
        : [{ tone: 'critical', text: 'Enter whole seconds', detail: 'As in 900.' }]
    return (
        <Behind action="Edit job" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={guard.onOpenChange}
                title="Edit import-orders"
                footer={dirty ? 'Unsaved changes' : undefined}
                count={
                    <IssueCount
                        critical={timeoutIssues.length}
                        list={timeoutIssues.map((issue) => ({ label: 'Timeout', issue, onGo: () => setIssueOpen(true) }))}
                    />
                }
                confirm={{
                    label: 'Save',
                    why: !dirty ? 'Nothing has changed.' : timeoutIssues.length > 0 ? 'Fix the timeout first.' : undefined,
                    onConfirm: () => {
                        setSaved(draft)
                        setOpen(false)
                    },
                }}
            >
                <TextField id="edit-name" label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
                <TextField
                    id="edit-description"
                    label="Description"
                    multiline
                    value={draft.description}
                    onChange={(value) => setDraft({ ...draft, description: value })}
                    rows={3}
                />
                <TextField
                    id="edit-timeout"
                    label="Timeout"
                    hint="seconds"
                    mono
                    value={draft.timeout}
                    onChange={(timeout) => setDraft({ ...draft, timeout })}
                    issues={timeoutIssues}
                    issueOpen={issueOpen}
                    onIssueOpenChange={setIssueOpen}
                />
                <UnsavedChangesDialog guard={guard} />
            </DialogShell>
        </Behind>
    )
}

const STEPS = [
    { code: 'fetch', run: 'http.fetch' },
    { code: 'transform', run: 'rows.map' },
    { code: 'validate', run: 'schema.validate' },
    { code: 'upload', run: 's3.upload' },
    { code: 'notify', run: 'mail.send' },
]

/** A step's remove opens its own confirm on top of the editing dialog, which stays as it was behind it. */
export function NestedConfirm() {
    const [open, setOpen] = useState(true)
    const [steps, setSteps] = useState(STEPS)
    const [removing, setRemoving] = useState<string | null>('validate')
    const index = steps.findIndex((step) => step.code === removing)
    return (
        <Behind action="Edit pipeline" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Steps of harbor-orders"
                description="Each step hands its rows to the next."
                confirm={{ label: 'Save steps', onConfirm: () => setOpen(false) }}
            >
                <Stack as="ol" gap="none" className="divide-y divide-border rounded-control border border-border">
                    {steps.map((step, at) => (
                        <Row key={step.code} as="li" className="py-1.5 pr-1.5 pl-2">
                            <GripVertical className="size-4 text-faint" aria-hidden />
                            <span className="w-5 font-mono text-xs text-faint tabular-nums">{at + 1}</span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="font-mono text-xs">{step.code}</span>
                                <span className="truncate font-mono text-xs text-muted-foreground">{step.run}</span>
                            </span>
                            <IconButton label={`Remove ${step.code}`} onClick={() => setRemoving(step.code)}>
                                <Trash2 />
                            </IconButton>
                        </Row>
                    ))}
                </Stack>
                <ConfirmDialog
                    open={removing !== null}
                    onOpenChange={(next) => {
                        if (!next) setRemoving(null)
                    }}
                    question={`Remove the ${removing ?? ''} step?`}
                    detail={
                        index > 0 && index < steps.length - 1
                            ? `Rows go from ${steps[index - 1].code} straight to ${steps[index + 1].code}. Saving the steps makes it stick.`
                            : 'Saving the steps makes it stick.'
                    }
                    confirm={{
                        label: 'Remove step',
                        destructive: true,
                        onConfirm: () => {
                            setSteps(steps.filter((step) => step.code !== removing))
                            setRemoving(null)
                        },
                    }}
                />
            </DialogShell>
        </Behind>
    )
}

const DETAILS = {
    name: 'Import orders',
    description: 'Loads the monthly orders file into the warehouse.',
    owner: 'ada',
    priority: 'normal' as 'low' | 'normal' | 'high',
    timeout: '900',
}

/** A side sheet over the page, edited in place: the save bar at its foot counts what is unsaved. Closing with changes asks first. */
export function DetailsSheet() {
    const [open, setOpen] = useState(true)
    const [saved, setSaved] = useState(DETAILS)
    const [draft, setDraft] = useState<typeof DETAILS>({ ...DETAILS, owner: 'grace', priority: 'high' })
    const [busy, setBusy] = useState(false)
    const count = (Object.keys(saved) as (keyof typeof saved)[]).filter((key) => saved[key] !== draft[key]).length
    const guard = useUnsavedGuard({
        dirty: count > 0,
        onClose: () => {
            setDraft(saved)
            setOpen(false)
        },
    })
    return (
        <Behind action="Details" onAction={() => setOpen(true)}>
            <Sheet open={open} onOpenChange={guard.onOpenChange}>
                <SheetContent size="md" className={cn('gap-0', NESTED)}>
                    <SheetHeader className="border-b border-border pr-12">
                        <SheetTitle>Import orders</SheetTitle>
                        <SheetDescription className="font-mono text-xs">import-orders</SheetDescription>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                        <div className="flex flex-1 flex-col gap-4 p-4">
                            <TextField id="sheet-name" label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
                            <TextField
                                id="sheet-description"
                                label="Description"
                                multiline
                                rows={3}
                                value={draft.description}
                                onChange={(value) => setDraft({ ...draft, description: value })}
                            />
                            <Field id="sheet-owner" label="Owner">
                                <NativeSelect
                                    id="sheet-owner"
                                    className="w-full"
                                    value={draft.owner}
                                    onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
                                >
                                    {['ada', 'grace', 'linus', 'margaret'].map((person) => (
                                        <NativeSelectOption key={person} value={person}>
                                            {person}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                            <Field id="sheet-priority" label="Priority">
                                <Segmented
                                    label="Priority"
                                    value={draft.priority}
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'normal', label: 'Normal' },
                                        { value: 'high', label: 'High' },
                                    ]}
                                    onChoose={(priority) => setDraft({ ...draft, priority })}
                                    fill
                                />
                            </Field>
                            <TextField
                                id="sheet-timeout"
                                label="Timeout"
                                hint="seconds"
                                mono
                                value={draft.timeout}
                                onChange={(timeout) => setDraft({ ...draft, timeout })}
                            />
                        </div>
                        <SaveBar
                            inset="panel"
                            count={count}
                            busy={busy}
                            onDiscard={() => setDraft(saved)}
                            onSave={() => {
                                setBusy(true)
                                void wait(900).then(() => {
                                    setBusy(false)
                                    setSaved(draft)
                                })
                            }}
                        />
                    </div>
                    <UnsavedChangesDialog guard={guard} />
                </SheetContent>
            </Sheet>
        </Behind>
    )
}

const TAKEN = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']

/** A copy under a new code, with a choice of what comes along; a code already in use is marked in the field. */
export function Duplicate() {
    const [open, setOpen] = useState(true)
    const [code, setCode] = useState('sync-inventory')
    const [carry, setCarry] = useState({ steps: true, schedule: false, alerts: true, secrets: true })
    const [issueOpen, setIssueOpen] = useState(false)
    const issues: Issue[] =
        code === ''
            ? []
            : TAKEN.includes(code)
              ? [
                    {
                        tone: 'critical',
                        text: `${code} is taken`,
                        detail: 'Codes are unique in a project.',
                        actions: [{ label: 'Use nightly-export-copy', onClick: () => setCode('nightly-export-copy') }],
                    },
                ]
              : !/^[a-z][a-z0-9-]*$/.test(code)
                ? [{ tone: 'critical', text: 'Lowercase letters, digits and dashes', detail: 'Starting with a letter.' }]
                : []
    const items = [
        { key: 'steps', label: 'Steps', detail: '5 steps and their settings.' },
        { key: 'schedule', label: 'Schedule', detail: 'Off, so the copy does not run until you say.' },
        { key: 'alerts', label: 'Alerts', detail: '2 rules, sent to the same people.' },
        { key: 'secrets', label: 'Secret references', detail: 'The copy reads the same secrets; their values are not copied.' },
    ] as const
    return (
        <Behind action="Duplicate" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Duplicate nightly-export"
                description="The copy starts with no runs."
                count={
                    <IssueCount
                        critical={issues.length}
                        list={issues.map((issue) => ({ label: 'Code', issue, onGo: () => setIssueOpen(true) }))}
                    />
                }
                confirm={{
                    label: 'Duplicate',
                    onConfirm: () => setOpen(false),
                    why: code === '' ? 'Give the copy a code.' : issues.length > 0 ? 'Fix the code first.' : undefined,
                }}
            >
                <TextField
                    id="copy-code"
                    label="Code"
                    required
                    mono
                    value={code}
                    onChange={setCode}
                    issues={issues}
                    issueOpen={issueOpen}
                    onIssueOpenChange={setIssueOpen}
                />
                <CheckboxList label="Copy">
                    {items.map((item) => (
                        <CheckboxField
                            key={item.key}
                            label={item.label}
                            description={item.detail}
                            checked={carry[item.key]}
                            onCheckedChange={(checked) => setCarry({ ...carry, [item.key]: checked })}
                        />
                    ))}
                </CheckboxList>
            </DialogShell>
        </Behind>
    )
}

type Keep<T extends string> = 'keep' | T

/** One change made to many jobs at once: every field starts at Leave as is, and the footer says what will change. */
export function BulkEdit() {
    const [open, setOpen] = useState(true)
    const [owner, setOwner] = useState<Keep<string>>('margaret')
    const [priority, setPriority] = useState<Keep<'low' | 'normal' | 'high'>>('keep')
    const [paused, setPaused] = useState<Keep<'paused' | 'running'>>('paused')
    const changes = [owner !== 'keep' && 'owner', priority !== 'keep' && 'priority', paused !== 'keep' && 'state'].filter(
        (one): one is string => one !== false,
    )
    const said =
        changes.length === 0 ? 'Nothing changes yet' : `Changes ${changes.join(' and ').replace(/ and (?=.* and )/, ', ')} on 8 jobs`
    return (
        <Behind action="Edit 8 jobs" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Edit 8 jobs"
                description="In harbor/imports and harbor/exports. Fields left as is keep each job’s own value."
                footer={said}
                confirm={{
                    label: 'Apply to 8 jobs',
                    onConfirm: () => setOpen(false),
                    why: changes.length === 0 ? 'Change at least one field.' : undefined,
                }}
            >
                <Field id="bulk-owner" label="Owner">
                    <NativeSelect id="bulk-owner" className="w-full" value={owner} onChange={(event) => setOwner(event.target.value)}>
                        <NativeSelectOption value="keep">Leave as is (4 owners)</NativeSelectOption>
                        {['ada', 'grace', 'linus', 'margaret'].map((person) => (
                            <NativeSelectOption key={person} value={person}>
                                {person}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                <Field id="bulk-priority" label="Priority">
                    <Segmented
                        label="Priority"
                        value={priority}
                        options={[
                            { value: 'keep', label: 'Leave as is' },
                            { value: 'low', label: 'Low' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'high', label: 'High' },
                        ]}
                        onChoose={setPriority}
                        fill
                    />
                </Field>
                <Field id="bulk-paused" label="State" help="A paused job keeps its schedule and does not run.">
                    <Segmented
                        label="State"
                        value={paused}
                        options={[
                            { value: 'keep', label: 'Leave as is' },
                            { value: 'paused', label: 'Paused' },
                            { value: 'running', label: 'Running' },
                        ]}
                        onChoose={setPaused}
                        fill
                    />
                </Field>
            </DialogShell>
        </Behind>
    )
}
