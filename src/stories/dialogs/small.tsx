import { PageHeader } from '../../components/PageHeader'
import { CircleCheck, Database, FileText, Filter, Globe, Mail, RotateCw, ShieldCheck, Table2, Upload, Webhook } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CapabilityPicker, type Capability, type PickerItem } from '../../components/CapabilityPicker'
import { CronField } from '../../components/CronField'
import { DescriptionList } from '../../components/DescriptionList'
import { DialogShell } from '../../components/DialogShell'
import { Field } from '../../components/Field'
import { IssueCount, type Issue } from '../../components/IssueMark'
import { Markdown } from '../../components/Markdown'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Problem } from '../../components/Problem'
import type { TreeNode } from '../../components/Tree'
import { TreeSelect } from '../../components/TreeSelect'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { describeCron } from '../../lib/cron'
import { Behind, TextField, wait } from './parts'

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
                <Field id="run-note" label="Note" hint="Shown on the run">
                    <Textarea id="run-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
                </Field>
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
                    footer={<IssueCount critical={issues.length} onPick={() => setIssueOpen(true)} />}
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
                    <span className="flex items-center gap-2">
                        <CircleCheck className="size-5 text-good" aria-hidden />
                        Job created
                    </span>
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
            <main className="flex flex-1 flex-col gap-4 p-6">
                <PageHeader title="Comment on run #4811" />
                <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} className="max-w-2xl" />
                <div>
                    <Button size="sm">Post comment</Button>
                </div>
            </main>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                width="sm"
                dismissible={false}
                title="Your session has ended"
                description="Sign in again to carry on. What you typed on the page is kept."
                footer={
                    <span className="flex items-center gap-3">
                        <IssueCount critical={issues.length} onPick={() => setIssueOpen(true)} />
                        <a href="#sign-out" className="underline underline-offset-3 hover:text-foreground">
                            Sign out instead
                        </a>
                    </span>
                }
                confirm={{
                    label: 'Sign in',
                    busyLabel: 'Signing in',
                    busy,
                    onConfirm: signIn,
                    why: password === '' ? 'Enter your password.' : undefined,
                }}
            >
                <div className="flex items-center gap-3 rounded-control border border-border px-3 py-2">
                    <PersonAvatar name="ada" />
                    <span className="flex flex-col">
                        <span className="font-mono text-xs">ada</span>
                        <span className="text-xs text-muted-foreground">ada@example.org</span>
                    </span>
                </div>
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
                    <TreeSelect id="move-to" nodes={FOLDERS} value={to} onChange={setTo} defaultOpen={['harbor', 'harbor/imports']} />
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
    const valid = describeCron(cron) !== null
    return (
        <Behind action="Edit schedule" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="Schedule for import-orders"
                description="A run that is still going when the next is due makes the next one wait."
                footer={<IssueCount critical={valid ? 0 : 1} onPick={() => document.getElementById('schedule-cron')?.focus()} />}
                confirm={{ label: 'Save schedule', onConfirm: () => setOpen(false), why: valid ? undefined : 'Fix the expression first.' }}
            >
                <CronField id="schedule-cron" value={cron} onChange={setCron} from={new Date('2026-11-05T10:17:00Z')} presets={PRESETS} />
            </DialogShell>
        </Behind>
    )
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
