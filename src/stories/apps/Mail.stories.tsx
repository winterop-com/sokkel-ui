import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Archive,
    ArrowLeft,
    Circle,
    File,
    FileSpreadsheet,
    FileText,
    Forward,
    Inbox,
    MailOpen,
    MoreHorizontal,
    Paperclip,
    PenSquare,
    Reply,
    ReplyAll,
    Send,
    Star,
    Tag,
    Trash2,
    X,
    type LucideIcon,
} from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { AddressInput, type Address } from '../../components/AddressInput'
import { Composer } from '../../components/Composer'
import { DialogShell } from '../../components/DialogShell'
import { Markdown } from '../../components/Markdown'
import { MessageRow, type MessageLabel } from '../../components/MessageRow'
import { Rail, type RailEntry, type RailGroup } from '../../components/Rail'
import { SearchField } from '../../components/SearchField'
import { Segmented } from '../../components/Segmented'
import { Shell } from '../../components/Shell'
import { TopBar } from '../../components/TopBar'
import {
    Attachment,
    AttachmentAction,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from '../../components/ui/attachment'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { TooltipProvider } from '../../components/ui/tooltip'
import { cn } from '../../lib/cn'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * A mail client in the library's frame: the mailboxes and labels in the rail, the message list
 * with its search, unread filter and bulk toolbar, and the reading pane with the conversation and
 * a reply box under it. Below the `lg` breakpoint it shows the list or the open message, never
 * both, and the message has a way back.
 */
type Box = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'trash'

interface Person {
    name: string
    address: string
}

const PEOPLE = {
    ada: { name: 'Ada', address: 'ada@example.org' },
    grace: { name: 'Grace', address: 'grace@example.org' },
    linus: { name: 'Linus', address: 'linus@example.org' },
    margaret: { name: 'Margaret', address: 'margaret@example.org' },
    scheduler: { name: 'Tidevann scheduler', address: 'scheduler@tidevann.example.org' },
    digest: { name: 'Tidevann', address: 'digest@tidevann.example.org' },
} satisfies Record<string, Person>

const LABELS: Record<string, MessageLabel> = {
    harbor: { id: 'harbor', label: 'harbor', color: 'var(--color-kind-blue)' },
    juniper: { id: 'juniper', label: 'juniper', color: 'var(--color-kind-green)' },
    larkspur: { id: 'larkspur', label: 'larkspur', color: 'var(--color-kind-violet)' },
    alerts: { id: 'alerts', label: 'alerts', color: 'var(--color-kind-pink)' },
}

interface Conversation {
    id: string
    box: Box
    from: Person
    subject: string
    snippet: string
    time: string
    unread?: boolean
    starred?: boolean
    attachment?: boolean
    count?: number
    labels?: string[]
}

const MAIL: Conversation[] = [
    {
        id: 't1',
        box: 'inbox',
        from: PEOPLE.grace,
        subject: 'Harbor launch checklist',
        snippet: 'Linus is right about the cutover window. I have attached the final checklist and the plan for Saturday.',
        time: '09:42',
        unread: true,
        starred: true,
        attachment: true,
        count: 4,
        labels: ['harbor'],
    },
    {
        id: 't2',
        box: 'inbox',
        from: PEOPLE.scheduler,
        subject: 'nightly-export failed at validate',
        snippet: '37 rows of orders-2026-10.csv were rejected. The run stopped at validate after 4m 12s.',
        time: '08:15',
        unread: true,
        labels: ['alerts'],
    },
    {
        id: 't3',
        box: 'inbox',
        from: PEOPLE.margaret,
        subject: 'Juniper budget for the first quarter',
        snippet: 'Here are the numbers we talked about on Monday. The worker hours went up when the import moved.',
        time: '07:58',
        unread: true,
        attachment: true,
        labels: ['juniper'],
    },
    {
        id: 't4',
        box: 'inbox',
        from: PEOPLE.linus,
        subject: 'Re: rebuild-index timings',
        snippet: 'The index rebuild now finishes in 6 minutes instead of 19. I moved the transform before the upload.',
        time: 'Yesterday',
        count: 3,
        labels: ['larkspur'],
    },
    {
        id: 't5',
        box: 'inbox',
        from: PEOPLE.grace,
        subject: 'Design review on Thursday',
        snippet: 'Can we move it to 14:00? The larkspur screens are not ready before lunch.',
        time: 'Yesterday',
        starred: true,
        labels: ['larkspur'],
    },
    {
        id: 't6',
        box: 'inbox',
        from: PEOPLE.digest,
        subject: 'Your weekly digest',
        snippet: '12 runs succeeded, 2 failed and 1 was cancelled across harbor, juniper and larkspur.',
        time: 'Yesterday',
    },
    {
        id: 't7',
        box: 'inbox',
        from: PEOPLE.margaret,
        subject: 'Re: sync-inventory schedule',
        snippet: 'Every hour on weekdays works for the warehouse. Weekends can stay at once a day.',
        time: 'Nov 3',
        count: 5,
        labels: ['juniper'],
    },
    {
        id: 't8',
        box: 'inbox',
        from: PEOPLE.linus,
        subject: 'Photos from the harbor site visit',
        snippet: 'Twelve photos of the loading dock and the new office, in the shared folder as well.',
        time: 'Nov 3',
        attachment: true,
        labels: ['harbor'],
    },
    {
        id: 't9',
        box: 'inbox',
        from: PEOPLE.grace,
        subject: 'import-orders mapping',
        snippet: 'The CSV from the shop now has a currency column. I added it to the transform step.',
        time: 'Nov 2',
        count: 2,
    },
    {
        id: 't10',
        box: 'inbox',
        from: PEOPLE.scheduler,
        subject: 'send-digest succeeded',
        snippet: 'send-digest finished in 38s and reached 214 people.',
        time: 'Nov 1',
        labels: ['alerts'],
    },
    {
        id: 't11',
        box: 'inbox',
        from: PEOPLE.margaret,
        subject: 'Welcome to larkspur',
        snippet: 'I have added you to the larkspur project. The first thing to look at is the scheduler.',
        time: 'Oct 30',
        labels: ['larkspur'],
    },
    {
        id: 't12',
        box: 'inbox',
        from: PEOPLE.linus,
        subject: 'api rate limits',
        snippet: 'We hit the limit twice on Tuesday during the import. Could we raise it for the worker?',
        time: 'Oct 29',
    },
    {
        id: 's1',
        box: 'sent',
        from: PEOPLE.grace,
        subject: 'Re: Harbor launch checklist',
        snippet: 'Thanks, I will go through it tonight and send my notes in the morning.',
        time: 'Nov 4',
        labels: ['harbor'],
    },
    {
        id: 's2',
        box: 'sent',
        from: PEOPLE.linus,
        subject: 'Re: rebuild-index timings',
        snippet: 'That is a big win. Can we keep the old order behind a flag for a week?',
        time: 'Nov 3',
    },
    {
        id: 'a1',
        box: 'archive',
        from: PEOPLE.margaret,
        subject: 'Juniper kickoff notes',
        snippet: 'Notes from the kickoff, with the owners of each step.',
        time: 'Oct 12',
        attachment: true,
        labels: ['juniper'],
    },
    {
        id: 'x1',
        box: 'trash',
        from: PEOPLE.digest,
        subject: 'Your weekly digest',
        snippet: '9 runs succeeded and 1 was skipped across harbor and juniper.',
        time: 'Oct 28',
    },
]

const BOXES: { id: Box; label: string; icon: LucideIcon }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: File },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
]

function inBox(box: Box): Conversation[] {
    if (box === 'starred') return MAIL.filter((mail) => mail.starred === true)
    return MAIL.filter((mail) => mail.box === box)
}

function matches(mail: Conversation, query: string): boolean {
    const term = query.trim().toLowerCase()
    if (term === '') return true
    return [mail.from.name, mail.subject, mail.snippet].some((text) => text.toLowerCase().includes(term))
}

interface Letter {
    id: string
    from: Person
    to: Person[]
    time: string
    body: string
    files?: { name: string; detail: string; icon: LucideIcon }[]
}

const THREAD: Letter[] = [
    {
        id: 'm1',
        from: PEOPLE.grace,
        to: [PEOPLE.ada, PEOPLE.linus, PEOPLE.margaret],
        time: 'Oct 31, 16:20',
        body: 'Here is a first draft of the harbor launch checklist. Please add what is missing before Monday, and say which steps you own.',
    },
    {
        id: 'm2',
        from: PEOPLE.linus,
        to: [PEOPLE.grace, PEOPLE.ada, PEOPLE.margaret],
        time: 'Nov 1, 10:05',
        body: 'The cutover window on Saturday morning is too tight for the inventory sync. It needs two hours on its own, so I would start at 06:00.',
    },
    {
        id: 'm3',
        from: PEOPLE.margaret,
        to: [PEOPLE.grace, PEOPLE.ada, PEOPLE.linus],
        time: 'Nov 4, 17:30',
        body: 'The extra worker hours for the weekend are approved. 06:00 works for me, and I will be on call until the digest goes out.',
    },
    {
        id: 'm4',
        from: PEOPLE.grace,
        to: [PEOPLE.ada, PEOPLE.linus, PEOPLE.margaret],
        time: 'Today, 09:42',
        body: `Linus is right about the cutover window. The plan for Saturday:

1. **06:00** stop the scheduler and run \`sync-inventory\` once by hand
2. **08:00** switch the api to \`harbor.example.org\`
3. **08:30** run \`nightly-export\` and check the validate step
4. **09:00** start the scheduler again

I have attached the final checklist and the cutover plan. Ada, can you take step 3?`,
        files: [
            { name: 'harbor-launch-checklist.pdf', detail: 'PDF, 240 KB', icon: FileText },
            { name: 'cutover-plan.csv', detail: 'CSV, 12 KB', icon: FileSpreadsheet },
        ],
    },
]

function initial(person: Person): string {
    return person.name.charAt(0)
}

function Letterhead({ letter, open, onToggle }: { letter: Letter; open: boolean; onToggle: () => void }) {
    return (
        <button type="button" aria-expanded={open} className="flex w-full min-w-0 items-start gap-3 text-left" onClick={onToggle}>
            <Avatar>
                <AvatarFallback>{initial(letter.from)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-sm font-medium">{letter.from.name}</span>
                    {open && <span className="truncate text-xs text-muted-foreground max-sm:hidden">{letter.from.address}</span>}
                    <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                        {letter.files !== undefined && <Paperclip className="size-3.5" aria-label="Has attachments" />}
                        {letter.time}
                    </span>
                </span>
                <span className="truncate text-sm text-muted-foreground">
                    {open ? `to ${letter.to.map((person) => (person === PEOPLE.ada ? 'me' : person.name)).join(', ')}` : letter.body}
                </span>
            </span>
        </button>
    )
}

function LetterView({ letter, open, last, onToggle }: { letter: Letter; open: boolean; last: boolean; onToggle: () => void }) {
    return (
        <article className={cn('border-b border-border px-4 py-3 md:px-6', open && 'pb-5')}>
            <Letterhead letter={letter} open={open} onToggle={onToggle} />
            {open && (
                <div className="mt-3 flex flex-col gap-4 sm:pl-11">
                    <Markdown content={letter.body} />
                    {letter.files !== undefined && (
                        <div className="flex flex-wrap gap-2">
                            {letter.files.map((file) => {
                                const Icon = file.icon
                                return (
                                    <Attachment key={file.name} size="sm" className="min-w-0">
                                        <AttachmentMedia>
                                            <Icon aria-hidden />
                                        </AttachmentMedia>
                                        <AttachmentContent>
                                            <AttachmentTitle>{file.name}</AttachmentTitle>
                                            <AttachmentDescription>{file.detail}</AttachmentDescription>
                                        </AttachmentContent>
                                    </Attachment>
                                )
                            })}
                        </div>
                    )}
                    {last && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm">
                                <Reply aria-hidden />
                                Reply
                            </Button>
                            <Button variant="outline" size="sm">
                                <ReplyAll aria-hidden />
                                Reply all
                            </Button>
                            <Button variant="outline" size="sm">
                                <Forward aria-hidden />
                                Forward
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </article>
    )
}

function IconAction({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick?: () => void }) {
    return (
        <Button variant="ghost" size="icon-sm" aria-label={label} title={label} className="text-muted-foreground" onClick={onClick}>
            <Icon aria-hidden />
        </Button>
    )
}

function Reading({ mail, onBack }: { mail: Conversation; onBack: () => void }) {
    const [open, setOpen] = useState<Set<string>>(() => new Set(['m3', 'm4']))
    const [reply, setReply] = useState('')
    const thread = mail.id === 't1' ? THREAD : [{ id: 'only', from: mail.from, to: [PEOPLE.ada], time: mail.time, body: mail.snippet }]
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2 md:px-4">
                <Button variant="ghost" size="sm" className="-ml-1 lg:hidden" onClick={onBack}>
                    <ArrowLeft aria-hidden />
                    Back
                </Button>
                <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
                    <IconAction label="Archive" icon={Archive} />
                    <IconAction label="Delete" icon={Trash2} />
                    <IconAction label="Mark as unread" icon={MailOpen} />
                    <IconAction label="Label" icon={Tag} />
                </div>
                <div className="ml-auto flex items-center gap-0.5 max-lg:ml-0">
                    <IconAction label="Reply" icon={Reply} />
                    <IconAction label="Forward" icon={Forward} />
                    <IconAction label="More" icon={MoreHorizontal} />
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <header className="flex items-start gap-3 border-b border-border px-4 pt-5 pb-4 md:px-6">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <h1 className="text-page leading-snug font-semibold tracking-tight">{mail.subject}</h1>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {(mail.labels ?? []).map((id) => (
                                <span key={id} className="inline-flex h-5 items-center gap-1 rounded-full border border-border px-1.5">
                                    <span className="size-1.5 rounded-full" style={{ background: LABELS[id].color }} />
                                    {LABELS[id].label}
                                </span>
                            ))}
                            <span>{thread.length === 1 ? '1 message' : `${thread.length} messages`}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label={mail.starred === true ? 'Remove the star' : 'Star'}
                        className={cn('mt-1 shrink-0', mail.starred === true ? 'text-warning' : 'text-faint')}
                    >
                        <Star className={cn('size-4', mail.starred === true && 'fill-current')} aria-hidden />
                    </button>
                </header>
                {thread.map((letter, index) => {
                    const last = index === thread.length - 1
                    const shown = last || open.has(letter.id)
                    return (
                        <LetterView
                            key={letter.id}
                            letter={letter}
                            open={shown}
                            last={last}
                            onToggle={() =>
                                setOpen((current) => {
                                    const next = new Set(current)
                                    if (next.has(letter.id)) next.delete(letter.id)
                                    else next.add(letter.id)
                                    return next
                                })
                            }
                        />
                    )
                })}
                <div className="px-4 py-4 md:px-6">
                    <Composer
                        value={reply}
                        onChange={setReply}
                        onSend={() => setReply('')}
                        onAttach={() => undefined}
                        words={{
                            placeholder: `Reply to ${thread[thread.length - 1].from.name}`,
                            send: 'Send',
                            stop: 'Stop',
                            attach: 'Attach files',
                            remove: 'Remove',
                            drop: 'Drop files to attach them',
                        }}
                        tools={
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                                <ReplyAll aria-hidden />
                                Reply all
                            </Button>
                        }
                    />
                </div>
            </div>
        </div>
    )
}

function Nothing({ checked, onClear }: { checked: number; onClear: () => void }) {
    if (checked > 0) {
        return (
            <Empty className="h-full">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Inbox aria-hidden />
                    </EmptyMedia>
                    <EmptyTitle>{checked} conversations selected</EmptyTitle>
                    <EmptyDescription>Archive them, delete them or give them a label together.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row justify-center">
                    <Button variant="outline" size="sm">
                        <Archive aria-hidden />
                        Archive
                    </Button>
                    <Button variant="outline" size="sm">
                        <Trash2 aria-hidden />
                        Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClear}>
                        Clear
                    </Button>
                </EmptyContent>
            </Empty>
        )
    }
    return (
        <Empty className="h-full">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <MailOpen aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No message open</EmptyTitle>
                <EmptyDescription>Pick a conversation from the list to read it here.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    )
}

const EMPTY: Record<Box, { title: string; text: string }> = {
    inbox: { title: 'Nothing in the inbox', text: 'New mail lands here.' },
    starred: { title: 'Nothing starred', text: 'Star a conversation to keep it here.' },
    sent: { title: 'Nothing sent', text: 'Mail you send is kept here.' },
    drafts: { title: 'No drafts', text: 'Mail you start and do not send is kept here until you finish it.' },
    archive: { title: 'Nothing archived', text: 'Archived conversations leave the inbox and wait here.' },
    trash: { title: 'Trash is empty', text: 'Deleted mail stays here for 30 days.' },
}

function List({
    box,
    query,
    onQuery,
    open,
    onOpen,
    checked,
    onChecked,
}: {
    box: Box
    query: string
    onQuery: (query: string) => void
    open: string | null
    onOpen: (id: string) => void
    checked: string[]
    onChecked: (checked: string[]) => void
}) {
    const [only, setOnly] = useState<'all' | 'unread'>('all')
    const [starred, setStarred] = useState(() => new Set(MAIL.filter((mail) => mail.starred === true).map((mail) => mail.id)))
    const rows = inBox(box).filter((mail) => matches(mail, query) && (only === 'all' || mail.unread === true))
    const all = rows.length > 0 && rows.every((mail) => checked.includes(mail.id))
    const some = checked.length > 0
    const searching = query.trim() !== ''
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 pt-3 pb-2">
                <SearchField value={query} onChange={onQuery} placeholder="Search mail" />
                <div className="flex min-h-8 items-center gap-2 pl-0.5">
                    <Checkbox
                        checked={all}
                        indeterminate={some && !all}
                        disabled={rows.length === 0}
                        aria-label={all ? 'Clear the selection' : 'Select every conversation'}
                        onCheckedChange={() => onChecked(all || some ? [] : rows.map((mail) => mail.id))}
                    />
                    {some ? (
                        <>
                            <span className="ml-1 text-sm font-medium tabular-nums">{checked.length} selected</span>
                            <div className="ml-auto flex items-center gap-0.5">
                                <IconAction label="Archive" icon={Archive} />
                                <IconAction label="Delete" icon={Trash2} />
                                <IconAction label="Mark as read" icon={MailOpen} />
                                <IconAction label="Label" icon={Tag} />
                                <IconAction label="Clear the selection" icon={X} onClick={() => onChecked([])} />
                            </div>
                        </>
                    ) : (
                        <>
                            <Segmented
                                label="Show"
                                value={only}
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'unread', label: 'Unread' },
                                ]}
                                onChoose={setOnly}
                                className="ml-1"
                            />
                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                {searching ? `${rows.length} ${rows.length === 1 ? 'result' : 'results'}` : `${rows.length} conversations`}
                            </span>
                        </>
                    )}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {rows.length === 0 ? (
                    <Empty className="h-full">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Inbox aria-hidden />
                            </EmptyMedia>
                            <EmptyTitle>{searching ? 'No mail matches' : EMPTY[box].title}</EmptyTitle>
                            <EmptyDescription>
                                {searching ? `Nothing in this mailbox mentions ${query}.` : EMPTY[box].text}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    rows.map((mail) => (
                        <MessageRow
                            key={mail.id}
                            from={box === 'sent' ? `To: ${mail.from.name}` : mail.from.name}
                            subject={mail.subject}
                            snippet={mail.snippet}
                            time={mail.time}
                            unread={mail.unread}
                            starred={starred.has(mail.id)}
                            attachment={mail.attachment}
                            count={mail.count}
                            labels={(mail.labels ?? []).map((id) => LABELS[id])}
                            open={mail.id === open}
                            checked={checked.includes(mail.id)}
                            onCheckedChange={(on) => onChecked(on ? [...checked, mail.id] : checked.filter((id) => id !== mail.id))}
                            onStarredChange={(on) =>
                                setStarred((current) => {
                                    const next = new Set(current)
                                    if (on) next.add(mail.id)
                                    else next.delete(mail.id)
                                    return next
                                })
                            }
                            onOpen={() => onOpen(mail.id)}
                            highlight={query}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [to, setTo] = useState<Address[]>([
        { address: 'grace@example.org', name: 'Grace' },
        { address: 'linus@example.org', name: 'Linus' },
    ])
    const [cc, setCc] = useState<Address[]>([{ address: 'margaret@example.org', name: 'Margaret' }])
    const [subject, setSubject] = useState('Step 3 on Saturday')
    const [body, setBody] = useState(
        'I will take step 3. I will run nightly-export at 08:30 and watch the validate step, and write here when it has passed.\n\nAda',
    )
    const [files, setFiles] = useState([{ name: 'validate-rules.yaml', detail: 'YAML, 3 KB' }])
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="lg"
            title="New message"
            confirm={{ label: 'Send', onConfirm: () => onOpenChange(false) }}
            footer={
                <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                    <Paperclip aria-hidden />
                    Attach files
                </Button>
            }
            words={{ cancel: 'Discard' }}
        >
            <div className="flex flex-col">
                <AddressInput label="To" bare value={to} onChange={setTo} className="border-b border-border" />
                <AddressInput label="Cc" bare value={cc} onChange={setCc} className="border-b border-border" />
                <label className="flex h-(--density-control) min-h-9 items-center border-b border-border text-sm">
                    <span className="shrink-0 pr-1.5 pl-1 text-muted-foreground">Subject</span>
                    <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        className="h-full min-w-0 flex-1 bg-transparent px-1 outline-none"
                    />
                </label>
                <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    aria-label="Message"
                    className="min-h-56 resize-none bg-transparent px-1 py-3 text-sm leading-relaxed outline-none"
                />
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                        {files.map((file) => (
                            <Attachment key={file.name} size="sm">
                                <AttachmentMedia>
                                    <FileText aria-hidden />
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle>{file.name}</AttachmentTitle>
                                    <AttachmentDescription>{file.detail}</AttachmentDescription>
                                </AttachmentContent>
                                <AttachmentAction
                                    aria-label={`Remove ${file.name}`}
                                    onClick={() => setFiles((current) => current.filter((entry) => entry.name !== file.name))}
                                >
                                    <X aria-hidden />
                                </AttachmentAction>
                            </Attachment>
                        ))}
                    </div>
                )}
            </div>
        </DialogShell>
    )
}

function rail(
    box: Box,
    onBox: (box: Box) => void,
): { groups: RailGroup[]; renderLink: (entry: RailEntry, children: ReactNode, className: string) => ReactNode } {
    const unread = MAIL.filter((mail) => mail.box === 'inbox' && mail.unread === true).length
    const counts: Partial<Record<string, number>> = { inbox: unread }
    const groups: RailGroup[] = [
        {
            id: 'boxes',
            entries: BOXES.map((entry) => ({ id: entry.id, label: entry.label, icon: entry.icon, href: '#', active: entry.id === box })),
        },
        {
            id: 'labels',
            title: 'Labels',
            entries: Object.values(LABELS).map((label) => ({ id: `label-${label.id}`, label: label.label, icon: Circle, href: '#' })),
        },
    ]
    const renderLink = (entry: RailEntry, children: ReactNode, className: string) => {
        const label = entry.id.startsWith('label-') ? LABELS[entry.id.slice(6)] : undefined
        const count = counts[entry.id]
        return (
            <a
                href={entry.href}
                aria-current={entry.active ? 'page' : undefined}
                className={cn(
                    className,
                    label !== undefined &&
                        '[&>svg:first-child]:scale-[0.6] [&>svg:first-child]:fill-(--dot) [&>svg:first-child]:text-(--dot)',
                )}
                style={label !== undefined ? ({ '--dot': label.color } as CSSProperties) : undefined}
                onClick={(event) => {
                    event.preventDefault()
                    if (label === undefined) onBox(entry.id as Box)
                }}
            >
                {children}
                {count !== undefined && count > 0 && (
                    <span className="ml-auto text-xs font-semibold text-foreground tabular-nums">{count}</span>
                )}
            </a>
        )
    }
    return { groups, renderLink }
}

function MailApp({
    box: startBox = 'inbox',
    open: startOpen = null,
    query: startQuery = '',
    checked: startChecked = [],
    composing = false,
}: {
    box?: Box
    open?: string | null
    query?: string
    checked?: string[]
    composing?: boolean
}) {
    const [collapsed, setCollapsed] = useState(false)
    const [box, setBox] = useState<Box>(startBox)
    const [open, setOpen] = useState<string | null>(startOpen)
    const [query, setQuery] = useState(startQuery)
    const [checked, setChecked] = useState<string[]>(startChecked)
    const [compose, setCompose] = useState(composing)
    const { groups, renderLink } = rail(box, (next) => {
        setBox(next)
        setOpen(null)
        setChecked([])
    })
    const mail = MAIL.find((entry) => entry.id === open)
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups}
                        renderLink={renderLink}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="ada@example.org" collapsed={collapsed} onSettings={() => undefined} />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Mail', href: '#' }, { label: BOXES.find((entry) => entry.id === box)?.label ?? '' }]}
                        actions={
                            <Button size="sm" onClick={() => setCompose(true)} aria-label="Compose">
                                <PenSquare aria-hidden />
                                <span className="max-sm:hidden">Compose</span>
                            </Button>
                        }
                    />
                }
            >
                <div className="flex h-full min-h-0">
                    <section
                        aria-label="Messages"
                        className={cn(
                            'flex min-w-0 flex-1 flex-col lg:w-88 lg:flex-none lg:border-r lg:border-border-strong xl:w-104',
                            mail !== undefined && 'max-lg:hidden',
                        )}
                    >
                        <List
                            box={box}
                            query={query}
                            onQuery={setQuery}
                            open={open}
                            onOpen={setOpen}
                            checked={checked}
                            onChecked={setChecked}
                        />
                    </section>
                    <section aria-label="Reading" className={cn('min-w-0 flex-1', mail === undefined && 'max-lg:hidden')}>
                        {mail !== undefined ? (
                            <Reading key={mail.id} mail={mail} onBack={() => setOpen(null)} />
                        ) : (
                            <Nothing checked={checked.length} onClear={() => setChecked([])} />
                        )}
                    </section>
                </div>
            </Shell>
            <ComposeDialog open={compose} onOpenChange={setCompose} />
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Mail' }
export default meta

/** The drafts mailbox with nothing in it, and no message open. */
export const EmptyMailbox: StoryObj = { name: 'Empty mailbox', render: () => <MailApp box="drafts" /> }

/** The inbox with a four-message thread open: two messages folded, two read in full, attachments and a reply box. */
export const ThreadOpen: StoryObj = { name: 'Thread open', render: () => <MailApp open="t1" /> }

/** A search narrowing the inbox, every match marked, and the first result open. */
export const Search: StoryObj = { name: 'Search', render: () => <MailApp query="harbor" open="t1" /> }

/** Three conversations checked: the list's toolbar turns into the bulk actions, and the pane offers them too. */
export const BulkSelection: StoryObj = { name: 'Bulk selection', render: () => <MailApp checked={['t2', 't6', 't10']} /> }

/** A new message being written, with recipients as chips, a subject, the text and an attachment. */
export const Compose: StoryObj = { name: 'Compose', render: () => <MailApp open="t1" composing /> }
