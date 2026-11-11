import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { PersonRow } from '@winterop-com/sokkel-ui/PersonRow'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import {
    CircleCheck,
    Database,
    Download,
    FileText,
    Filter,
    Globe,
    Mail,
    RotateCw,
    ShieldCheck,
    Table2,
    Upload,
    Webhook,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { CapabilityPicker, type Capability, type PickerItem } from '@winterop-com/sokkel-ui/CapabilityPicker'
import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import { CronField } from '@winterop-com/sokkel-ui/CronField'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { IssueCount, type Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { Problem } from '@winterop-com/sokkel-ui/Problem'
import type { TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { TreeSelect } from '@winterop-com/sokkel-ui/TreeSelect'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { Textarea } from '@winterop-com/sokkel-ui/primitives/textarea'
import { describeCron, nextRuns } from '@winterop-com/sokkel-ui/lib/cron'
import { Behind, wait } from './parts'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { pictureOf } from '../fixtures/portraits'

export function Rename() {
    const [open, setOpen] = useState(true)
    const [saved, setSaved] = useState('Import orders')
    const [name, setName] = useState('Import monthly orders')
    const same = name.trim() === saved
    const save = () => {
        if (same) return
        setSaved(name.trim())
        setOpen(false)
    }
    return (
        <Behind
            action="Rename"
            onAction={() => {
                setName(saved)
                setOpen(true)
            }}
        >
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                width="sm"
                title="Rename import-orders"
                description="The name is what lists show. The code stays, so links and references keep working."
                confirm={{ label: 'Rename', onConfirm: save, why: same ? 'The name is unchanged.' : undefined }}
            >
                <TextField id="rename" label="Name" value={name} onChange={setName} onEnter={save} autoFocus />
            </DialogShell>
        </Behind>
    )
}

/** Opens already working, as a press of Stop all would leave it; it finishes after a while, and nothing closes it before. */
export function Busy() {
    const [open, setOpen] = useState(true)
    const [busy, setBusy] = useState(true)
    const [first, setFirst] = useState(true)
    useEffect(() => {
        if (!busy) return
        const timer = setTimeout(
            () => {
                setBusy(false)
                setFirst(false)
                setOpen(false)
            },
            first ? 15_000 : 2500,
        )
        return () => clearTimeout(timer)
    }, [busy, first])
    return (
        <Behind action="Stop all runs" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                width="sm"
                title="Stop every run of import-orders?"
                description="3 runs are going and 5 are queued. Each stops after the step it is on."
                confirm={{ label: 'Stop 8 runs', busyLabel: 'Stopping 8 runs', destructive: true, busy, onConfirm: () => setBusy(true) }}
            />
        </Behind>
    )
}

/** The server refused the run: its words in the dialog, with Retry; the second try goes through. */
export function Refused() {
    const [open, setOpen] = useState(true)
    const [tries, setTries] = useState(1)
    const [busy, setBusy] = useState(false)
    const [note, setNote] = useState('Rerun after the 4 Nov failure.')
    const run = () => {
        setBusy(true)
        void wait(1200).then(() => {
            setBusy(false)
            if (tries >= 1) setOpen(false)
            setTries(tries + 1)
        })
    }
    return (
        <Behind
            action="Run now"
            onAction={() => {
                setTries(0)
                setOpen(true)
            }}
        >
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Run import-orders now"
                description="Runs once, outside its schedule, with today’s file."
                confirm={{ label: tries > 0 ? 'Try again' : 'Run now', busyLabel: 'Starting', busy, onConfirm: run }}
            >
                {tries > 0 && !busy && (
                    <Problem
                        title="The worker refused the run"
                        detail="`worker-2` is draining for maintenance and takes no new runs until 03:00 UTC. Try again to place it on another worker."
                        technical={
                            'POST https://api.example.org/v1/jobs/import-orders/runs\n503 Service Unavailable\n{"error":"worker_draining","worker":"worker-2","until":"2026-11-05T03:00:00Z"}'
                        }
                        actions={
                            <Button size="sm" variant="outline" onClick={run}>
                                <RotateCw aria-hidden />
                                Retry
                            </Button>
                        }
                    />
                )}
                <TextField
                    id="run-note"
                    label="Note"
                    hint="Shown on the run"
                    multiline
                    value={note}
                    onChange={(value) => setNote(value)}
                    rows={2}
                />
            </DialogShell>
        </Behind>
    )
}

/** Done: what was made, and the two ways on from here. Create another goes back to an empty form. */
export function Created() {
    const [open, setOpen] = useState(true)
    const [made, setMade] = useState(true)
    const [code, setCode] = useState('sync-inventory')
    const [submitted, setSubmitted] = useState(false)
    const [left, setLeft] = useState(false)
    const [issueOpen, setIssueOpen] = useState(false)
    const close = (next: boolean) => {
        setOpen(next)
        if (!next) setMade(true)
    }
    const issues: Issue[] =
        code === '' && (submitted || left)
            ? [{ tone: 'critical', text: 'Give the job a code', detail: 'Lowercase, as in sync-inventory.' }]
            : []
    if (!made)
        return (
            <Behind action="New job" onAction={() => setOpen(true)}>
                <DialogShell
                    open={open}
                    onOpenChange={close}
                    width="sm"
                    title="New job"
                    count={
                        <IssueCount
                            critical={issues.length}
                            list={issues.map((issue) => ({ label: 'Code', issue, onGo: () => setIssueOpen(true) }))}
                        />
                    }
                    confirm={{
                        label: 'Create',
                        onConfirm: () => {
                            setSubmitted(true)
                            if (code !== '') setMade(true)
                        },
                    }}
                >
                    <TextField
                        id="new-code"
                        label="Code"
                        required
                        mono
                        value={code}
                        onChange={setCode}
                        onBlur={() => {
                            if (code !== '') setLeft(true)
                        }}
                        issues={issues}
                        issueOpen={issueOpen}
                        onIssueOpenChange={setIssueOpen}
                        autoFocus
                    />
                </DialogShell>
            </Behind>
        )
    return (
        <Behind action="New job" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={close}
                title={
                    <Row as="span">
                        <CircleCheck className="size-5 text-good" aria-hidden />
                        Job created
                    </Row>
                }
                description="It is paused until its first schedule is saved, so nothing runs yet."
                words={{ cancel: 'Close' }}
                actions={
                    <Button
                        variant="outline"
                        onClick={() => {
                            setCode('')
                            setSubmitted(false)
                            setLeft(false)
                            setMade(false)
                        }}
                    >
                        Create another
                    </Button>
                }
                confirm={{ label: 'Open job', onConfirm: () => close(false) }}
            >
                <DescriptionList
                    items={[
                        { term: 'Code', value: code, code: true },
                        { term: 'Project', value: 'harbor' },
                        { term: 'Owner', value: 'ada' },
                        { term: 'Endpoint', value: 'https://api.example.org/v1/inventory', code: true },
                    ]}
                />
            </DialogShell>
        </Behind>
    )
}

/** The page keeps what was typed in it; the dialog cannot be dismissed, only signed through. */
export function SessionExpired() {
    const [open, setOpen] = useState(true)
    const [password, setPassword] = useState('')
    const [wrong, setWrong] = useState(false)
    const [busy, setBusy] = useState(false)
    const [issueOpen, setIssueOpen] = useState(false)
    const [draft, setDraft] = useState(
        'Orders from the larkspur site arrive a day late since the October change. Moving the run to 04:00 UTC gives the upload time to land.',
    )
    const issues: Issue[] = wrong ? [{ tone: 'critical', text: 'That password is not right', detail: 'It has at least 8 characters.' }] : []
    const signIn = () => {
        setBusy(true)
        void wait(900).then(() => {
            setBusy(false)
            if (password.length < 8) setWrong(true)
            else {
                setOpen(false)
                setPassword('')
            }
        })
    }
    return (
        <Behind>
            <Stack as="main" gap="lg" className="flex-1 p-6">
                <PageHeader title="Comment on run #4811" />
                <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} className="max-w-2xl" />
                <div>
                    <Button size="sm">Post comment</Button>
                </div>
            </Stack>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                width="sm"
                dismissible={false}
                title="Your session has ended"
                description="Sign in again to carry on. What you typed on the page is kept."
                count={
                    <IssueCount
                        critical={issues.length}
                        list={issues.map((issue) => ({ label: 'Password', issue, onGo: () => setIssueOpen(true) }))}
                    />
                }
                footer={
                    <Row as="span" gap="md">
                        <a href="#sign-out" className="underline underline-offset-3 hover:text-foreground">
                            Sign out instead
                        </a>
                    </Row>
                }
                confirm={{
                    label: 'Sign in',
                    busyLabel: 'Signing in',
                    busy,
                    onConfirm: signIn,
                    why: password === '' ? 'Enter your password.' : undefined,
                }}
            >
                <PersonRow
                    name="ada"
                    image={pictureOf('ada')}
                    detail="ada@example.org"
                    className="rounded-control border border-border px-3 py-2"
                />
                <TextField
                    id="password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(value) => {
                        setPassword(value)
                        setWrong(false)
                    }}
                    issues={issues}
                    issueOpen={issueOpen}
                    onIssueOpenChange={setIssueOpen}
                    onEnter={() => {
                        if (password !== '') signIn()
                    }}
                    autoFocus
                />
            </DialogShell>
        </Behind>
    )
}

const FOLDERS: TreeNode[] = [
    {
        id: 'harbor',
        label: 'harbor',
        children: [
            { id: 'harbor/exports', label: 'exports', meta: '6' },
            {
                id: 'harbor/imports',
                label: 'imports',
                meta: '4',
                children: [
                    { id: 'harbor/imports/monthly', label: 'monthly', meta: '3' },
                    { id: 'harbor/imports/adhoc', label: 'adhoc', meta: '1' },
                ],
            },
            { id: 'harbor/maintenance', label: 'maintenance', meta: '2' },
        ],
    },
    {
        id: 'juniper',
        label: 'juniper',
        children: [
            { id: 'juniper/digests', label: 'digests', meta: '5' },
            { id: 'juniper/indexing', label: 'indexing', meta: '2' },
        ],
    },
    { id: 'larkspur', label: 'larkspur', children: [{ id: 'larkspur/sync', label: 'sync', meta: '7' }] },
]

export function MoveTo() {
    const [open, setOpen] = useState(true)
    const [to, setTo] = useState<string[]>(['harbor/imports/monthly'])
    const from = 'harbor/imports/adhoc'
    const why = to.length === 0 ? 'Choose a folder.' : to[0] === from ? 'They are in that folder already.' : undefined
    return (
        <Behind action="Move" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Move 3 jobs"
                description="import-orders, sync-inventory and rebuild-index keep their runs and schedules."
                confirm={{ label: 'Move 3 jobs', onConfirm: () => setOpen(false), why }}
            >
                <Field id="move-from" label="From">
                    <p id="move-from" className="font-mono text-xs text-muted-foreground">
                        {from}
                    </p>
                </Field>
                <Field id="move-to" label="To" required help="A job in another project takes on that project’s secrets and access.">
                    <TreeSelect
                        id="move-to"
                        nodes={FOLDERS}
                        value={to}
                        onValueChange={setTo}
                        defaultExpanded={['harbor', 'harbor/imports']}
                    />
                </Field>
            </DialogShell>
        </Behind>
    )
}

const CAPABILITIES: Capability[] = [
    { id: 'reads', label: 'reads' },
    { id: 'writes', label: 'writes' },
    { id: 'network', label: 'network' },
    { id: 'secrets', label: 'secrets' },
    { id: 'streams', label: 'streams' },
]

const icon = (Icon: typeof Globe) => <Icon className="size-4" aria-hidden />

const BLOCKS: PickerItem[] = [
    {
        code: 'http.fetch',
        name: 'Fetch over HTTP',
        description: 'Reads a JSON or CSV answer from a URL.',
        group: 'Sources',
        capabilities: ['reads', 'network', 'secrets'],
        icon: icon(Globe),
    },
    {
        code: 'sql.query',
        name: 'SQL query',
        description: 'Runs a query and returns its rows.',
        group: 'Sources',
        capabilities: ['reads', 'network', 'secrets', 'streams'],
        icon: icon(Database),
    },
    {
        code: 'file.read',
        description: 'Reads a file from the project storage.',
        group: 'Sources',
        capabilities: ['reads', 'streams'],
        icon: icon(FileText),
    },
    {
        code: 'rows.filter',
        name: 'Filter rows',
        description: 'Keeps the rows a condition holds for.',
        group: 'Transform',
        capabilities: ['streams'],
        icon: icon(Filter),
    },
    {
        code: 'rows.join',
        name: 'Join rows',
        description: 'Joins two inputs on matching keys.',
        group: 'Transform',
        capabilities: [],
        icon: icon(Table2),
    },
    {
        code: 'schema.validate',
        name: 'Validate against a schema',
        description: 'Rejects rows that do not fit, with why.',
        group: 'Check',
        capabilities: ['streams'],
        icon: icon(ShieldCheck),
    },
    {
        code: 's3.upload',
        name: 'Upload to storage',
        description: 'Writes the input to a bucket.',
        group: 'Destinations',
        capabilities: ['writes', 'network', 'secrets'],
        icon: icon(Upload),
    },
    {
        code: 'webhook.post',
        name: 'Post to a webhook',
        description: 'Sends each row to a URL.',
        group: 'Destinations',
        capabilities: ['writes', 'network'],
        icon: icon(Webhook),
    },
    {
        code: 'mail.send',
        name: 'Send an email',
        description: 'Mails a summary to a list of people.',
        group: 'Notify',
        capabilities: ['network', 'secrets'],
        icon: icon(Mail),
    },
]

export function PickOne() {
    const [open, setOpen] = useState(true)
    const [chosen, setChosen] = useState<string | null>(null)
    return (
        <Behind action="Add step" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                width="lg"
                title="Add a step after transform"
                description="Choose the block the step runs. Its settings come next."
                footer={chosen === null ? 'Nothing chosen' : <span className="font-mono text-foreground">{chosen}</span>}
                confirm={{ label: 'Add step', onConfirm: () => setOpen(false), why: chosen === null ? 'Choose a block.' : undefined }}
            >
                <CapabilityPicker items={BLOCKS} capabilities={CAPABILITIES} onChoose={setChosen} className="h-96" />
            </DialogShell>
        </Behind>
    )
}

const PRESETS = [
    { label: 'Hourly', value: '0 * * * *' },
    { label: 'Nightly', value: '0 2 * * *' },
    { label: 'Weekdays', value: '0 2 * * 1-5' },
    { label: 'Weekly', value: '0 6 * * mon' },
    { label: 'Monthly', value: '0 4 1 * *' },
]

/** The schedule read back in words and its next five runs, counted from a fixed time so the story does not move. */
export function Schedule() {
    const [open, setOpen] = useState(true)
    const [cron, setCron] = useState('30 2 * * 1-5')
    const [cronOpen, setCronOpen] = useState(false)
    const valid = describeCron(cron) !== null
    return (
        <Behind action="Edit schedule" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Schedule for import-orders"
                description="A run that is still going when the next is due makes the next one wait."
                count={
                    <IssueCount
                        critical={valid ? 0 : 1}
                        list={[
                            {
                                label: 'Schedule',
                                issue: { tone: 'critical', text: 'Not a schedule this field can read' },
                                onGo: () => setCronOpen(true),
                            },
                        ]}
                    />
                }
                confirm={{ label: 'Save schedule', onConfirm: () => setOpen(false), why: valid ? undefined : 'Fix the expression first.' }}
            >
                <CronField
                    id="schedule-cron"
                    value={cron}
                    onChange={setCron}
                    from={new Date('2026-11-05T10:17:00Z')}
                    presets={PRESETS}
                    issueOpen={cronOpen}
                    onIssueOpenChange={setCronOpen}
                />
            </DialogShell>
        </Behind>
    )
}

const OSLO = 'Europe/Oslo'
/** The Thursday before Europe moves its clocks forward on 28 March 2027. */
const BEFORE_SPRING = new Date('2027-03-25T12:00:00Z')

/** What Tidevann's scheduler says of an expression: its next runs, or why it will not take it. */
function scheduler(cron: string): { runs: Date[]; refused?: string } {
    const runs = nextRuns(cron, BEFORE_SPRING, 5, OSLO)
    if (runs.length > 1 && runs[1].getTime() - runs[0].getTime() < 5 * 60_000)
        return { runs: [], refused: 'The scheduler runs a job at most once every 5 minutes.' }
    return { runs }
}

/** The schedule dialog for nightly-export, its field read in Europe/Oslo and checked with the scheduler as it changes. */
function ZonedSchedule({ initial, checking = false }: { initial: string; checking?: boolean }) {
    const [open, setOpen] = useState(true)
    const [cron, setCron] = useState(initial)
    const [pending, setPending] = useState(checking)
    const [answer, setAnswer] = useState(() => scheduler(initial))
    const [cronOpen, setCronOpen] = useState(false)
    const asked = useRef(0)
    const change = (next: string) => {
        setCron(next)
        setPending(true)
        const ask = ++asked.current
        void wait(900).then(() => {
            if (ask !== asked.current) return
            setAnswer(scheduler(next))
            setPending(false)
        })
    }
    const valid = describeCron(cron) !== null && (pending || answer.refused === undefined)
    return (
        <Behind action="Edit schedule" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Schedule for nightly-export"
                description="Read in Oslo time, so a run keeps its hour when the clocks change."
                count={
                    <IssueCount
                        critical={valid ? 0 : 1}
                        list={[
                            {
                                label: 'Schedule',
                                issue: { tone: 'critical', text: answer.refused ?? 'Not a schedule this field can read' },
                                onGo: () => setCronOpen(true),
                            },
                        ]}
                    />
                }
                confirm={{
                    label: 'Save schedule',
                    onConfirm: () => setOpen(false),
                    why: pending ? 'The scheduler is still checking.' : valid ? undefined : 'Fix the expression first.',
                }}
            >
                <CronField
                    id="schedule-zone-cron"
                    value={cron}
                    onChange={change}
                    from={BEFORE_SPRING}
                    timeZone={OSLO}
                    runs={answer.runs}
                    runsPending={pending}
                    invalid={answer.refused}
                    presets={PRESETS}
                    issueOpen={cronOpen}
                    onIssueOpenChange={setCronOpen}
                />
            </DialogShell>
        </Behind>
    )
}

/**
 * nightly-export at 02:00 Oslo time over the March change of clocks: on Sunday 28 March 02:00 does
 * not happen, so that run goes at 03:00, the moment the clock jumps, and the offset moves to +02:00.
 */
export function ScheduleZone() {
    return <ZonedSchedule initial="0 2 * * *" />
}

/** The scheduler is still reading the runs back: the field's own reading shows muted beside Checking. */
export function ScheduleChecking() {
    return <ZonedSchedule initial="30 2 * * 1-5" checking />
}

/** The scheduler refused the expression: its words are the field's issue, and no runs are listed. */
export function ScheduleRefused() {
    return <ZonedSchedule initial="*/2 * * * *" />
}

const NOTES = `Tidevann 2.4 brings retries you can see, and a faster run list.

## Retries

A step that fails now retries on its own, up to three times, waiting longer each time. The run page shows each attempt with its own log, so you can see what changed between them.

- Set the attempts per job, under **Settings / Retries**.
- A step marked \`once\` never retries, for steps that send mail or post to a webhook.
- Retries count toward the run's time limit.

## Run list

The run list in each project opens in under a second, however many runs it holds. Filters for state, job and who started a run stay in the address, so a filtered list can be shared.

## Schedules

- A schedule is read back in words as you type it, with its next five runs.
- Schedules are in UTC everywhere, and say so.

## Fixed

- An import of a file with a byte order mark no longer reads its first column as empty.
- \`sync-inventory\` no longer starts twice when two workers come up at once.
- The digest sent by \`send-digest\` counts cancelled runs apart from failed ones.
- Long job codes no longer push the run state off the edge on a phone.

## Removed

- The old \`/v0\` endpoints, replaced by \`/v1\` a year ago. Calls to them now answer 410.
`

export function ReleaseNotes() {
    const [open, setOpen] = useState(true)
    return (
        <Behind action="What’s new" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                width="lg"
                title="What’s new in Tidevann 2.4"
                description="Released on 3 November 2026."
                footer="Earlier releases are listed on the changelog page."
                words={{ cancel: 'Later' }}
                confirm={{ label: 'Got it', onConfirm: () => setOpen(false) }}
            >
                <Markdown content={NOTES} />
            </DialogShell>
        </Behind>
    )
}

const RUN_LOG: LogLine[] = [
    { at: '02:00:00.112', level: 'info', source: 'scheduler', text: 'Run #2291 of nightly-export started on worker-1' },
    { at: '02:00:00.348', level: 'info', source: 'fetch', text: 'Reading orders changed since 2026-11-04 02:00 UTC' },
    { at: '02:00:04.902', level: 'info', source: 'fetch', text: 'Read 48,213 rows from 3 tables' },
    { at: '02:00:05.017', level: 'info', source: 'transform', text: 'Joining orders to customers and regions' },
    { at: '02:00:11.640', level: 'warning', source: 'transform', text: '14 orders name a region that is gone; kept with the region empty' },
    { at: '02:00:12.205', level: 'info', source: 'transform', text: 'Wrote 48,213 rows to nightly-export-2026-11-05.parquet' },
    { at: '02:00:12.310', level: 'info', source: 'validate', text: 'Checking 6 rules against the export' },
    { at: '02:00:13.877', level: 'info', source: 'validate', text: 'All 6 rules passed' },
    { at: '02:00:13.902', level: 'info', source: 'upload', text: 'Uploading 18.4 MB to https://files.example.org/exports/' },
    { at: '02:00:21.466', level: 'info', source: 'upload', text: 'Uploaded in 7.6 s' },
    { at: '02:00:21.590', level: 'info', source: 'notify', text: 'Sent the digest to ada and grace' },
    { at: '02:00:21.604', level: 'info', source: 'scheduler', text: 'Run #2291 succeeded in 21.5 s' },
]

const RUN_LOG_TEXT = RUN_LOG.map(
    (line) => `${line.at ?? ''} ${(line.level ?? 'info').toUpperCase()} [${line.source ?? ''}] ${line.text}`,
).join('\n')

/** Saves text as a file, as a browser saves a download. */
function saveText(name: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
}

/** A run's log to read: nothing to confirm, so the corner closes it and Copy and Download are the footer's verbs. */
export function RunLog() {
    const [open, setOpen] = useState(true)
    return (
        <Behind action="View log" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                width="xl"
                title="Log of nightly-export #2291"
                description="Succeeded on 5 November 2026 at 02:00 UTC, in 21.5 s."
                footer="12 lines, 1 warning"
                actions={
                    <>
                        <CopyButton value={RUN_LOG_TEXT} showLabel />
                        <Button variant="outline" onClick={() => saveText('nightly-export-2291.log', RUN_LOG_TEXT)}>
                            <Download aria-hidden />
                            Download
                        </Button>
                    </>
                }
            >
                <LogView lines={RUN_LOG} wrap />
            </DialogShell>
        </Behind>
    )
}

/** Publishing a run's output: the project comes filled in, so opening focuses the message, the field still to write. */
export function PublishOutput() {
    const [open, setOpen] = useState(true)
    const [project, setProject] = useState('larkspur')
    const [message, setMessage] = useState('')
    const messageRef = useRef<HTMLTextAreaElement>(null)
    return (
        <Behind
            action="Publish output"
            onAction={() => {
                setMessage('')
                setOpen(true)
            }}
        >
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Publish the output of nightly-export #2291"
                description="The project gets the file, with the message beside it."
                initialFocus={messageRef}
                confirm={{
                    label: 'Publish',
                    onConfirm: () => setOpen(false),
                    why: message.trim() === '' ? 'Say what the export holds.' : undefined,
                }}
            >
                <DescriptionList
                    items={[
                        { term: 'File', value: 'nightly-export-2026-11-05.parquet', code: true },
                        { term: 'Rows', value: '48,213', numeric: true },
                        { term: 'Size', value: '18.4 MB', numeric: true },
                    ]}
                />
                <Field id="publish-project" label="Project">
                    <NativeSelect
                        id="publish-project"
                        className="w-full"
                        value={project}
                        onChange={(event) => setProject(event.target.value)}
                    >
                        {['harbor', 'juniper', 'larkspur'].map((one) => (
                            <NativeSelectOption key={one} value={one}>
                                {one}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                <Field id="publish-message" label="Message">
                    <Textarea
                        ref={messageRef}
                        id="publish-message"
                        rows={3}
                        value={message}
                        placeholder="What changed since the last export"
                        onChange={(event) => setMessage(event.target.value)}
                    />
                </Field>
            </DialogShell>
        </Behind>
    )
}

/** A note on a run, half written: a press outside leaves it open, while Cancel, the close and Escape still close it. */
export function RunNote() {
    const [open, setOpen] = useState(true)
    const [note, setNote] = useState('14 orders name a region that is gone. Asked grace whether')
    return (
        <Behind action="Add note" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Note on nightly-export #2291"
                description="Shown on the run, to everyone in harbor."
                closeOnOutsidePress={false}
                confirm={{
                    label: 'Save note',
                    onConfirm: () => setOpen(false),
                    why: note.trim() === '' ? 'Write the note first.' : undefined,
                }}
            >
                <TextField id="run-note-text" label="Note" multiline rows={4} value={note} onChange={setNote} />
            </DialogShell>
        </Behind>
    )
}
