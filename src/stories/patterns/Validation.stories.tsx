import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { IssueCount, type Issue, type IssueEntry } from '@winterop-com/sokkel-ui/IssueMark'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { SchemaForm, SchemaIssueCount, useSchemaForm } from '@winterop-com/sokkel-ui/schema/SchemaForm'

/**
 * How every form says what is wrong. A field with an issue gets a colored edge and a mark at the end
 * of its input, which opens the message and a fix. Beside the verbs, one control counts the issues
 * with a figure for each kind, errors in the critical ink and warnings in the warning ink; pressing
 * it lists them, and choosing one goes to its field. A long form that scrolls gets a strip along its
 * scroll area's edge with a mark at each issue's place.
 */
const meta: Meta = { title: 'Patterns/Validation' }
export default meta

const SCHEDULE: Issue = { tone: 'critical', text: 'Write the schedule as a cron expression.', detail: 'For every night at 2: 0 2 * * *' }
const HOST: Issue = { tone: 'critical', text: 'Give the host with its domain.', detail: 'For example export.example.org' }
const RETRIES: Issue = { tone: 'warning', text: 'Twelve retries can hold the queue for an hour.', detail: 'Three is usual.' }

/** The count with errors only, warnings only, both, and one of each with no list to open. */
export const Counts: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <Stack gap="md" className="items-start">
            <IssueCount critical={2} list={[]} />
            <IssueCount critical={0} warning={1} list={[]} />
            <IssueCount critical={2} warning={1} list={[]} />
            <IssueCount critical={1} warning={1} list={[]} />
        </Stack>
    ),
}

/** The job's settings with what each field says, and the issues' entries for the count. */
function useJobIssues() {
    const [open, setOpen] = useState<string | null>(null)
    const entries: IssueEntry[] = [
        { label: 'Schedule', issue: SCHEDULE, target: 'job-schedule', onGo: () => setOpen('schedule') },
        { label: 'Target host', issue: HOST, target: 'job-host', onGo: () => setOpen('host') },
        { label: 'Retries', issue: RETRIES, target: 'job-retries', onGo: () => setOpen('retries') },
    ]
    const at = (key: string) => ({ issueOpen: open === key, onIssueOpenChange: (next: boolean) => setOpen(next ? key : null) })
    return { entries, at }
}

function JobFields({ at }: { at: ReturnType<typeof useJobIssues>['at'] }) {
    return (
        <>
            <TextField id="job-name" label="Name" defaultValue="Nightly export" />
            <TextField id="job-schedule" label="Schedule" mono defaultValue="every night at 2" issues={[SCHEDULE]} {...at('schedule')} />
            <TextField id="job-host" label="Target host" defaultValue="export" issues={[HOST]} {...at('host')} />
            <TextField id="job-retries" label="Retries" defaultValue="12" issues={[RETRIES]} {...at('retries')} />
        </>
    )
}

/** A short form closed by its verbs: two errors and a warning, counted just before Save. */
export const ShortForm: StoryObj = {
    name: 'Short form',
    parameters: { frame: 'column' },
    render: function Render() {
        const { entries, at } = useJobIssues()
        return (
            <TooltipProvider>
                <Stack gap="lg" className="max-w-md">
                    <JobFields at={at} />
                    <FormBar placement="end">
                        <IssueCount critical={2} warning={1} list={entries} />
                        <Button variant="ghost">Cancel</Button>
                        <Button>Save</Button>
                    </FormBar>
                </Stack>
            </TooltipProvider>
        )
    },
}

/** The count pressed: the issues listed above it, each naming its field. */
export const ListOpen: StoryObj = {
    name: 'List open',
    parameters: { frame: 'column' },
    render: function Render() {
        const { entries, at } = useJobIssues()
        return (
            <TooltipProvider>
                <Stack gap="lg" className="max-w-md pt-40">
                    <JobFields at={at} />
                    <FormBar placement="end">
                        <IssueCount critical={2} warning={1} list={entries} defaultOpen />
                        <Button variant="ghost">Cancel</Button>
                        <Button>Save</Button>
                    </FormBar>
                </Stack>
            </TooltipProvider>
        )
    },
}

/** A bar too narrow for its count and verbs: the verbs wrap onto a second line inside it. */
export const NarrowBar: StoryObj = {
    name: 'Narrow bar',
    parameters: { frame: 'padded' },
    render: () => (
        <Stack gap="none" className="w-72 rounded-lg border border-border bg-card">
            <FormBar placement="end" className="p-3">
                <IssueCount critical={2} warning={1} list={[]} />
                <Button variant="ghost">Cancel</Button>
                <Button variant="outline">Save draft</Button>
                <Button>Submit</Button>
            </FormBar>
        </Stack>
    ),
}

const LONG: JsonSchema = {
    type: 'object',
    required: ['code', 'name', 'schedule', 'host'],
    properties: {
        code: { type: 'string', title: 'Code', pattern: '^[a-z][a-z0-9-]*$' },
        name: { type: 'string', title: 'Name', maxLength: 40 },
        description: { type: 'string', title: 'Description', maxLength: 200 },
        project: { type: 'string', title: 'Project', enum: ['harbor', 'juniper', 'larkspur'] },
        owner: { type: 'string', title: 'Owner', format: 'email' },
        schedule: { type: 'string', title: 'Schedule', pattern: '^[0-9*/,-]+( [0-9*/,-]+){4}$' },
        timezone: { type: 'string', title: 'Time zone', default: 'UTC' },
        host: { type: 'string', title: 'Target host', format: 'hostname', pattern: '\\.' },
        port: { type: 'integer', title: 'Port', minimum: 1, maximum: 65535 },
        path: { type: 'string', title: 'Path', pattern: '^/' },
        timeout: { type: 'integer', title: 'Timeout', minimum: 1, maximum: 3600, description: 'Seconds.' },
        retries: { type: 'integer', title: 'Retries', minimum: 0, maximum: 10 },
        delay: { type: 'integer', title: 'Retry delay', minimum: 1, description: 'Seconds between tries.' },
        priority: { type: 'string', title: 'Priority', enum: ['low', 'normal', 'high'], default: 'normal' },
        notify: { type: 'string', title: 'Notify', format: 'email' },
        paused: { type: 'boolean', title: 'Paused' },
    },
}

const TYPED = {
    code: 'nightly-export',
    name: 'Nightly export',
    project: 'harbor',
    owner: 'ada@example.org',
    schedule: 'every night at 2',
    timezone: 'UTC',
    host: 'export',
    port: 443,
    path: 'exports/nightly',
    timeout: 900,
    retries: 12,
    delay: 0,
    priority: 'normal',
    notify: 'grace@example.org',
}

/** A long page form after Save: the strip along the scroll area's edge marks each issue's place, and the bar counts them. */
export const LongPage: StoryObj = {
    name: 'Long page',
    render: function Render() {
        const form = useSchemaForm(LONG, { initial: TYPED, defaultSubmitted: true })
        return (
            <TooltipProvider>
                <Stack gap="none" className="h-svh bg-background text-foreground">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <Stack gap="none" className="min-h-full">
                            <SchemaForm form={form} className="max-w-xl flex-1 p-6" />
                            <FormBar note="Draft saved at 09:52">
                                <SchemaIssueCount form={form} />
                                <Button size="sm" variant="ghost">
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={() => form.submit()}>
                                    Save
                                </Button>
                            </FormBar>
                        </Stack>
                    </div>
                </Stack>
            </TooltipProvider>
        )
    },
}

/** The same form in a dialog: the strip runs along the body's edge and the count sits before the verbs. */
export const LongDialog: StoryObj = {
    name: 'Long dialog',
    parameters: { frame: 'padded' },
    render: function Render() {
        const form = useSchemaForm(LONG, { initial: TYPED, defaultSubmitted: true })
        return (
            <DialogShell
                open
                onOpenChange={() => undefined}
                title="Edit job"
                description="nightly-export, in the harbor project."
                count={<SchemaIssueCount form={form} />}
                confirm={{ label: 'Save', onConfirm: () => form.submit() }}
            >
                <SchemaForm form={form} />
            </DialogShell>
        )
    },
}
