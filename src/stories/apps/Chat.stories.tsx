import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Bell,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Copy,
    FileSpreadsheet,
    Folder,
    MessageSquare,
    PenSquare,
    RotateCcw,
    Search,
    Square,
    ThumbsUp,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { Composer, type ComposerAttachment } from '../../components/Composer'
import { ConfirmCard, type ConfirmState } from '../../components/ConfirmCard'
import { Markdown } from '../../components/Markdown'
import { Problem } from '../../components/Problem'
import { Rail, type RailGroup } from '../../components/Rail'
import { Shell } from '../../components/Shell'
import { ToolCalls, type ToolCallEntry } from '../../components/ToolCall'
import { TopBar } from '../../components/TopBar'
import {
    Attachment,
    AttachmentContent,
    AttachmentDescription,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentTitle,
} from '../../components/ui/attachment'
import { Bubble, BubbleContent } from '../../components/ui/bubble'
import { Button } from '../../components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '../../components/ui/item'
import { Marker, MarkerContent, MarkerIcon } from '../../components/ui/marker'
import { Message, MessageContent, MessageFooter } from '../../components/ui/message'
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from '../../components/ui/message-scroller'
import { TooltipProvider } from '../../components/ui/tooltip'
import { HARBOR_DUSK } from '../fixtures/photos'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * An assistant app in the library's frame: conversations in the rail, the exchange in a reading
 * column with markdown, tool calls and a held action, and the composer pinned under it. The stories
 * after the first conversation show the states an answer passes through.
 */
const GROUPS: RailGroup[] = [
    {
        id: 'top',
        entries: [
            { id: 'new', label: 'New chat', icon: PenSquare, href: '#' },
            { id: 'search', label: 'Search chats', icon: Search, href: '#' },
        ],
    },
    {
        id: 'pinned',
        title: 'Pinned',
        entries: [
            { id: 'c1', label: 'Why nightly-export failed', icon: MessageSquare, href: '#', active: true },
            { id: 'c2', label: 'Index rebuild timings', icon: MessageSquare, href: '#' },
            { id: 'p1', label: 'Harbor launch', icon: Folder, href: '#' },
        ],
    },
    {
        id: 'recent',
        title: 'Recent',
        entries: [
            { id: 'c3', label: 'Digest email wording', icon: MessageSquare, href: '#' },
            { id: 'c4', label: 'Orders CSV columns', icon: MessageSquare, href: '#' },
            { id: 'c5', label: 'Cron syntax for weekdays', icon: MessageSquare, href: '#' },
            { id: 'c6', label: 'Retry policy for the api', icon: MessageSquare, href: '#' },
        ],
    },
]

const ANSWER = `The run failed at **\`validate\`**: 37 rows of \`orders-2026-10.csv\` carry an \`amount\` that is not a number.

| row | order | amount |
| --- | --- | --- |
| 112 | \`A-20431\` | \`n/a\` |
| 340 | \`A-20659\` | \`12,50\` |

The second one is a decimal comma. Parsing amounts with the locale fixes most of them:

\`\`\`yaml
transform:
  amount: parse_decimal(amount, locale: "nb-NO")
\`\`\`

The rest are blanks, and dropping them before \`validate\` is safe.`

const CALLS: ToolCallEntry[] = [
    {
        id: '1',
        name: 'runs.get',
        args: { job: 'nightly-export', run: 'latest' },
        result: { state: 'failed', step: 'validate' },
        status: 'done',
        duration: '0.2s',
    },
    {
        id: '2',
        name: 'runs.log',
        args: { run: 'run_01JCF8Q2', step: 'validate' },
        result: '37 rows rejected',
        status: 'done',
        duration: '0.4s',
    },
    {
        id: '3',
        name: 'files.sample',
        args: { file: 'orders-2026-10.csv', rows: [112, 340] },
        result: { rows: 2 },
        status: 'done',
        duration: '0.3s',
    },
]

function Question({ children }: { children: ReactNode }) {
    return (
        <Message align="end">
            <MessageContent>
                <Bubble align="end" variant="secondary">
                    <BubbleContent>{children}</BubbleContent>
                </Bubble>
            </MessageContent>
        </Message>
    )
}

/** Copy, Good answer and Try again under a finished answer, with the work it took and, when it was asked again, which version shows. */
function Actions({ facts, version }: { facts?: string; version?: { at: number; of: number; onChange: (at: number) => void } }) {
    return (
        <MessageFooter className="gap-1 px-0">
            {version !== undefined && (
                <>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Previous version"
                        disabled={version.at === 1}
                        onClick={() => version.onChange(version.at - 1)}
                    >
                        <ChevronLeft aria-hidden />
                    </Button>
                    <span className="font-normal tabular-nums">
                        {version.at} of {version.of}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Next version"
                        disabled={version.at === version.of}
                        onClick={() => version.onChange(version.at + 1)}
                    >
                        <ChevronRight aria-hidden />
                    </Button>
                </>
            )}
            <Button variant="ghost" size="icon-xs" aria-label="Copy">
                <Copy aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Good answer">
                <ThumbsUp aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Try again">
                <RotateCcw aria-hidden />
            </Button>
            {facts !== undefined && <span className="ml-2 font-normal text-faint tabular-nums">{facts}</span>}
        </MessageFooter>
    )
}

function Thread({ children }: { children: ReactNode }) {
    return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">{children}</div>
}

function Exchange() {
    const [state, setState] = useState<ConfirmState>('pending')
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <Message>
                <MessageContent>
                    <ToolCalls calls={CALLS} />
                    <Markdown content={ANSWER} />
                    <ConfirmCard
                        action="Add the locale-aware parse to nightly-export and save it"
                        tool="jobs.update"
                        args={{ job: 'nightly-export', step: 'transform', set: { amount: 'parse_decimal' } }}
                        state={state}
                        onApprove={() => setState('approved')}
                        onDeny={() => setState('denied')}
                    />
                    <Actions facts="3 tools, 4.1s" />
                </MessageContent>
            </Message>
        </Thread>
    )
}

const SUGGESTIONS = [
    { title: 'Why did a run fail?', detail: 'Read the latest failed run and its logs' },
    { title: 'Compare two runs', detail: 'What changed between yesterday and today' },
    { title: 'Write a cron schedule', detail: 'Every weekday at 06:30, say' },
    { title: 'Summarize this week', detail: 'Runs, failures and the slowest steps' },
]

/** A new chat: a greeting and things to ask, over a composer that starts empty. */
function Start() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <TidevannMark />
                </EmptyMedia>
                <EmptyTitle>What should we look at?</EmptyTitle>
                <EmptyDescription>Ask about a job, a run or a service in harbor.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-xl">
                <ItemGroup className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((suggestion) => (
                        <Item key={suggestion.title} variant="outline" size="sm" render={<a href="#" />} role="listitem">
                            <ItemContent>
                                <ItemTitle>{suggestion.title}</ItemTitle>
                                <ItemDescription>{suggestion.detail}</ItemDescription>
                            </ItemContent>
                        </Item>
                    ))}
                </ItemGroup>
            </EmptyContent>
        </Empty>
    )
}

const PARTIAL = `The run failed at **\`validate\`**: 37 rows of \`orders-2026-10.csv\` carry an \`amount\` that is not a number.

The second sample, \`12,50\`, is a decimal comma. Parsing amounts with`

/** The answer while it is written: the tools have run and the text grows, with Stop in place of Send. */
function StreamingThread() {
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <Message>
                <MessageContent>
                    <ToolCalls calls={CALLS} />
                    <Markdown content={PARTIAL} streaming caret />
                </MessageContent>
            </Message>
        </Thread>
    )
}

/** An answer stopped part way: what was written stays, marked as stopped, and can be asked again. */
function StoppedThread() {
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <Message>
                <MessageContent>
                    <ToolCalls calls={CALLS} />
                    <Markdown content={PARTIAL} />
                    <Marker>
                        <MarkerIcon>
                            <Square aria-hidden />
                        </MarkerIcon>
                        <MarkerContent>Stopped</MarkerContent>
                    </Marker>
                    <Actions />
                </MessageContent>
            </Message>
        </Thread>
    )
}

/** An answer that could not be finished: what went wrong in a sentence, the raw error folded away, and Try again. */
function FailedThread() {
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <Message>
                <MessageContent>
                    <ToolCalls calls={[CALLS[0]]} />
                    <Problem
                        title="The answer could not be finished"
                        detail="The model stopped answering after 30 seconds. Nothing was changed."
                        technical="upstream closed the stream: 504 gateway timeout (request req_01JCF9A1)"
                        actions={
                            <Button variant="outline" size="sm">
                                <RotateCcw aria-hidden />
                                Try again
                            </Button>
                        }
                    />
                </MessageContent>
            </Message>
        </Thread>
    )
}

const SENT_REPLY = `Both files agree: the 37 rejected rows are the ones whose \`amount\` uses a decimal comma or is blank. The chart shows the rejections began on **October 14**, when the export started reading the new supplier feed.`

/** A question sent with a spreadsheet and a screenshot, and another file waiting in the composer. */
function Attached() {
    return (
        <Thread>
            <Message align="end">
                <MessageContent>
                    <AttachmentGroup>
                        <Attachment size="sm">
                            <AttachmentMedia>
                                <FileSpreadsheet />
                            </AttachmentMedia>
                            <AttachmentContent>
                                <AttachmentTitle>orders-2026-10.csv</AttachmentTitle>
                                <AttachmentDescription>CSV, 2.1 MB</AttachmentDescription>
                            </AttachmentContent>
                        </Attachment>
                        <Attachment size="sm">
                            <AttachmentMedia variant="image">
                                <img src={HARBOR_DUSK} alt="" />
                            </AttachmentMedia>
                            <AttachmentContent>
                                <AttachmentTitle>rejections.png</AttachmentTitle>
                                <AttachmentDescription>PNG, 184 KB</AttachmentDescription>
                            </AttachmentContent>
                        </Attachment>
                    </AttachmentGroup>
                    <Bubble align="end" variant="secondary">
                        <BubbleContent>Do these explain the rejected rows?</BubbleContent>
                    </Bubble>
                </MessageContent>
            </Message>
            <Message>
                <MessageContent>
                    <Markdown content={SENT_REPLY} />
                    <Actions />
                </MessageContent>
            </Message>
        </Thread>
    )
}

const PENDING: ComposerAttachment[] = [{ id: 'a1', name: 'nightly-export.yaml', kind: 'file', detail: 'YAML, 0.6 KB' }]

const VERSIONS = [
    'The run failed at `validate`: 37 rows carry an `amount` that is not a number, most of them written with a decimal comma.',
    'Validation rejected 37 rows of `orders-2026-10.csv`. In 31 of them the amount uses a decimal comma, such as `12,50`; the other 6 are blank.',
    'Short version: decimal commas. Parse `amount` with the locale in `transform` and drop the blank ones before `validate`.',
]

/** An answer asked for again, three times: the footer steps between the versions. */
function VersionsThread() {
    const [at, setAt] = useState(2)
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <Message>
                <MessageContent>
                    <Markdown content={VERSIONS[at - 1]} />
                    <Actions version={{ at, of: VERSIONS.length, onChange: setAt }} />
                </MessageContent>
            </Message>
        </Thread>
    )
}

const TURNS: { id: string; ask: string; answer: string; calls?: ToolCallEntry[] }[] = [
    {
        id: 't1',
        ask: 'Which jobs failed this week?',
        answer: 'Two: **nightly-export** failed on Tuesday and Wednesday, and **sync-inventory** once on Monday. Everything else succeeded.',
        calls: [
            { id: 'l1', name: 'runs.list', args: { state: 'failed', since: '7d' }, result: { runs: 3 }, status: 'done', duration: '0.3s' },
        ],
    },
    {
        id: 't2',
        ask: 'What happened to sync-inventory on Monday?',
        answer: 'The `upload` step timed out after 10 minutes while the worker was restarting. The retry an hour later succeeded, so nothing is missing.',
    },
    {
        id: 't3',
        ask: 'And nightly-export?',
        answer: ANSWER,
        calls: CALLS,
    },
    {
        id: 't4',
        ask: 'How long does the run usually take?',
        answer: `Over the last 30 runs:

- median **4 min 12 s**
- slowest **9 min 40 s**, on the night of the index rebuild
- \`transform\` is about half of it`,
    },
    {
        id: 't5',
        ask: 'Will the locale parse slow it down?',
        answer: 'Barely. Parsing with a locale costs about the same as the plain parse, and the run spends most of its time in `fetch` and `upload`.',
    },
]

/** A conversation of five turns, opened at its end with the way back up in the scroller. */
function Long() {
    return (
        <MessageScrollerProvider defaultScrollPosition="end" autoScroll>
            <MessageScroller>
                <MessageScrollerViewport aria-label="Conversation">
                    <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
                        {TURNS.map((turn) => (
                            <MessageScrollerItem key={turn.id} messageId={turn.id}>
                                <div className="flex flex-col gap-6">
                                    <Question>{turn.ask}</Question>
                                    <Message>
                                        <MessageContent>
                                            {turn.calls !== undefined && <ToolCalls calls={turn.calls} />}
                                            <Markdown content={turn.answer} />
                                            <Actions />
                                        </MessageContent>
                                    </Message>
                                </div>
                            </MessageScrollerItem>
                        ))}
                    </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton direction="end" />
            </MessageScroller>
        </MessageScrollerProvider>
    )
}

function ChatApp({
    title = 'Why nightly-export failed',
    children,
    scroll = true,
    busy = false,
    attachments = [],
}: {
    title?: string
    children: ReactNode
    /** Whether the frame scrolls the thread; a thread with its own scroller says no. */
    scroll?: boolean
    busy?: boolean
    attachments?: readonly ComposerAttachment[]
}) {
    const [collapsed, setCollapsed] = useState(false)
    const [draft, setDraft] = useState('')
    const [files, setFiles] = useState(attachments)
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSettings={() => undefined} />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: title }]}
                        actions={
                            <>
                                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                    fast model
                                    <ChevronDown aria-hidden />
                                </Button>
                                <Button variant="ghost" size="icon-sm" aria-label="Notifications">
                                    <Bell aria-hidden />
                                </Button>
                            </>
                        }
                    />
                }
            >
                <div className="flex h-full min-h-0 flex-col">
                    {scroll ? (
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
                    ) : (
                        <div className="min-h-0 flex-1">{children}</div>
                    )}
                    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
                        <Composer
                            value={draft}
                            onChange={setDraft}
                            onSend={() => setDraft('')}
                            onStop={() => undefined}
                            busy={busy}
                            attachments={files}
                            onAttach={() => undefined}
                            onRemove={(id) => setFiles(files.filter((file) => file.id !== id))}
                        />
                    </div>
                </div>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Chat' }
export default meta

/** A chat not yet begun: a greeting and four things to ask. */
export const NewChat: StoryObj = {
    name: 'New chat',
    render: () => (
        <ChatApp title="New chat">
            <Start />
        </ChatApp>
    ),
}

/** A question answered with tool calls, markdown and a held change. */
export const Conversation: StoryObj = {
    render: () => (
        <ChatApp>
            <Exchange />
        </ChatApp>
    ),
}

/** The answer while it streams, with Stop in the composer. */
export const Streaming: StoryObj = {
    render: () => (
        <ChatApp busy>
            <StreamingThread />
        </ChatApp>
    ),
}

/** An answer the person stopped part way. */
export const Stopped: StoryObj = {
    render: () => (
        <ChatApp>
            <StoppedThread />
        </ChatApp>
    ),
}

/** An answer that failed, with Try again. */
export const Failed: StoryObj = {
    render: () => (
        <ChatApp>
            <FailedThread />
        </ChatApp>
    ),
}

/** Files sent with a question, and one waiting to go with the next. */
export const Attachments: StoryObj = {
    render: () => (
        <ChatApp title="Rejected rows" attachments={PENDING}>
            <Attached />
        </ChatApp>
    ),
}

/** The second of three versions of an answer, with the switcher in its footer. */
export const Versions: StoryObj = {
    render: () => (
        <ChatApp>
            <VersionsThread />
        </ChatApp>
    ),
}

/** Five turns, opened at the latest. */
export const LongThread: StoryObj = {
    name: 'Long thread',
    render: () => (
        <ChatApp title="This week's runs" scroll={false}>
            <Long />
        </ChatApp>
    ),
}

/** The conversation at a phone's width, the rail behind the menu button. */
export const Phone: StoryObj = {
    globals: { viewport: { value: 'w390', isRotated: false } },
    render: () => (
        <ChatApp>
            <Exchange />
        </ChatApp>
    ),
}
