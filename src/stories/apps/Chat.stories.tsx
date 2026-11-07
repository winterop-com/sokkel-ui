import { IconButton } from '../../components/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, FileSpreadsheet, Folder, MessageSquare, PenSquare, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { AssistantReply, type AssistantReplyLayout } from '../../components/AssistantReply'
import { Composer, type ComposerAttachment } from '../../components/Composer'
import type { ConfirmState } from '../../components/ConfirmCard'
import { Rail, type RailGroup } from '../../components/Rail'
import { Shell } from '../../components/Shell'
import type { ToolCallEntry } from '../../components/ToolCall'
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '../../components/ui/item'
import { Message, MessageContent } from '../../components/ui/message'
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
import { ModelPicker } from '../fixtures/models'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Stack } from '../../components/Layout'

/**
 * An assistant app in the library's frame: conversations in the rail, the exchange in a reading
 * column, and the composer pinned under it. Each answer is an AssistantReply: the tools it called
 * folded behind one line, the answer in markdown, a held change and the reply's actions. The
 * stories after the first conversation show the states an answer passes through.
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
        label: 'Run failed at validate',
        args: { job: 'nightly-export', run: 'latest' },
        result: { state: 'failed', step: 'validate' },
        status: 'done',
        duration: '0.2s',
    },
    {
        id: '2',
        name: 'runs.log',
        label: '37 rows rejected',
        args: { run: 'run_01JCF8Q2', step: 'validate' },
        result: '37 rows rejected',
        status: 'done',
        duration: '0.4s',
    },
    {
        id: '3',
        name: 'files.sample',
        label: '2 rows sampled',
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

function Thread({ children }: { children: ReactNode }) {
    return (
        <Stack gap="xl" className="mx-auto w-full max-w-3xl px-4 py-6">
            {children}
        </Stack>
    )
}

/** The reply's mark, name and the handlers every answer offers. */
const SPEAKER = { mark: <TidevannMark />, name: 'Tidevann', onRetry: () => undefined }

function Exchange({ layout }: { layout?: AssistantReplyLayout }) {
    const [state, setState] = useState<ConfirmState>('pending')
    const [feedback, setFeedback] = useState<'good' | 'bad'>()
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <AssistantReply
                {...SPEAKER}
                layout={layout}
                time="09:42"
                calls={CALLS}
                summary={layout === 'steps' ? 'Run, log, and sample checked · 3 tools' : 'Investigation complete · 3 tools'}
                content={ANSWER}
                held={{
                    action: 'Add the locale-aware parse to nightly-export and save it',
                    tool: 'jobs.update',
                    args: { job: 'nightly-export', step: 'transform', set: { amount: 'parse_decimal' } },
                    state,
                    onApprove: () => setState('approved'),
                    onDeny: () => setState('denied'),
                }}
                feedback={feedback}
                onFeedback={setFeedback}
                facts="3 tools, 4.1s"
            />
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

/** The calls while the answer is written: the first two done, the sample still running. */
const RUNNING: ToolCallEntry[] = CALLS.map((call, index) =>
    index < 2 ? call : { ...call, label: 'Sampling rejected rows', status: 'running', result: undefined, duration: undefined },
)

/** The answer while it is written: a tool still runs and the text grows, with Stop in place of Send. */
function StreamingThread() {
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <AssistantReply
                {...SPEAKER}
                time="09:42"
                calls={RUNNING}
                summary="Investigating · sampling the rejected rows"
                content={PARTIAL}
                state="streaming"
            />
        </Thread>
    )
}

/** An answer stopped part way: what was written stays, marked as stopped, and can be asked again. */
function StoppedThread() {
    const [feedback, setFeedback] = useState<'good' | 'bad'>()
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <AssistantReply
                {...SPEAKER}
                time="09:42"
                calls={CALLS}
                summary="Investigation complete · 3 tools"
                content={PARTIAL}
                state="stopped"
                feedback={feedback}
                onFeedback={setFeedback}
            />
        </Thread>
    )
}

/** The calls of an answer that failed: the log could not be read. */
const BROKEN: ToolCallEntry[] = [
    CALLS[0],
    { ...CALLS[1], label: 'Could not read validation log', status: 'error', result: 'log store timed out after 30s' },
]

/** An answer that could not be finished: what went wrong in a sentence, the raw error folded away, and Try again. */
function FailedThread() {
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <AssistantReply
                {...SPEAKER}
                time="09:42"
                calls={BROKEN}
                summary="Investigation incomplete · 1 tool failed"
                state="failed"
                problem={{
                    detail: 'The model stopped answering after 30 seconds. Nothing was changed.',
                    technical: 'upstream closed the stream: 504 gateway timeout (request req_01JCF9A1)',
                }}
            />
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
            <AssistantReply {...SPEAKER} time="10:05" content={SENT_REPLY} onFeedback={() => undefined} />
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
            <AssistantReply
                {...SPEAKER}
                time="09:44"
                content={VERSIONS[at - 1]}
                versions={{ at, of: VERSIONS.length, onChange: setAt }}
                onFeedback={() => undefined}
            />
        </Thread>
    )
}

const TURNS: { id: string; time: string; ask: string; answer: string; calls?: ToolCallEntry[] }[] = [
    {
        id: 't1',
        time: '09:12',
        ask: 'Which jobs failed this week?',
        answer: 'Two: **nightly-export** failed on Tuesday and Wednesday, and **sync-inventory** once on Monday. Everything else succeeded.',
        calls: [
            {
                id: 'l1',
                name: 'runs.list',
                label: '3 failed runs',
                args: { state: 'failed', since: '7d' },
                result: { runs: 3 },
                status: 'done',
                duration: '0.3s',
            },
        ],
    },
    {
        id: 't2',
        time: '09:14',
        ask: 'What happened to sync-inventory on Monday?',
        answer: 'The `upload` step timed out after 10 minutes while the worker was restarting. The retry an hour later succeeded, so nothing is missing.',
    },
    {
        id: 't3',
        time: '09:20',
        ask: 'And nightly-export?',
        answer: ANSWER,
        calls: CALLS,
    },
    {
        id: 't4',
        time: '09:31',
        ask: 'How long does the run usually take?',
        answer: `Over the last 30 runs:

- median **4 min 12 s**
- slowest **9 min 40 s**, on the night of the index rebuild
- \`transform\` is about half of it`,
    },
    {
        id: 't5',
        time: '09:33',
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
                                <Stack gap="xl">
                                    <Question>{turn.ask}</Question>
                                    <AssistantReply
                                        {...SPEAKER}
                                        time={turn.time}
                                        calls={turn.calls}
                                        content={turn.answer}
                                        onFeedback={() => undefined}
                                    />
                                </Stack>
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
                                <ModelPicker />
                                <IconButton label="Notifications">
                                    <Bell aria-hidden />
                                </IconButton>
                            </>
                        }
                    />
                }
            >
                <Stack gap="none" className="h-full min-h-0">
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
                </Stack>
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

/** A question answered in a reply card: tool calls, markdown and a held change. */
export const Conversation: StoryObj = {
    render: () => (
        <ChatApp>
            <Exchange />
        </ChatApp>
    ),
}

/** The same answer on the steps layout: what was checked, what was found, and the change to approve next. */
export const Steps: StoryObj = {
    render: () => (
        <ChatApp>
            <Exchange layout="steps" />
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
