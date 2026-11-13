import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, FileSpreadsheet, Folder, History, MessageSquare, PenSquare, Search } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { AssistantReply, type AssistantReplyLayout } from '@winterop-com/sokkel-ui/AssistantReply'
import { AttachmentList, type AttachmentFile } from '@winterop-com/sokkel-ui/AttachmentList'
import { Composer, type ComposerAttachment } from '@winterop-com/sokkel-ui/Composer'
import { ConversationHistory, type ConversationEntry } from '@winterop-com/sokkel-ui/ConversationHistory'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { useUploads } from '@winterop-com/sokkel-ui/hooks/use-uploads'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import type { ConfirmState } from '@winterop-com/sokkel-ui/ConfirmCard'
import type { DragData } from '@winterop-com/sokkel-ui/DragDrop'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Rail, type RailEntry, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { RailDrops } from '@winterop-com/sokkel-ui/RailDrops'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import type { ToolCallEntry } from '@winterop-com/sokkel-ui/ToolCall'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Bubble, BubbleContent } from '@winterop-com/sokkel-ui/primitives/bubble'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@winterop-com/sokkel-ui/primitives/item'
import { Message, MessageContent } from '@winterop-com/sokkel-ui/primitives/message'
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from '@winterop-com/sokkel-ui/primitives/message-scroller'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { HARBOR_DUSK } from '../fixtures/photos'
import { ModelPicker } from '../fixtures/models'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PICKED_FILES, PICKED_LIMIT, useFakeUploader } from '../fixtures/uploader'
import { tuneUrl } from '../media/fixtures/tune'
import { waveformOf } from '../media/fixtures/waveform'

/**
 * An assistant app in the library's frame: conversations in the rail, the exchange in a reading
 * column, and the composer pinned under it. Each answer is an AssistantReply: the tools it called
 * folded behind one line, the model's thinking behind another, the answer in markdown, a held
 * change and the reply's actions. The stories after the first conversation show the states an
 * answer passes through, from waiting for the first word to failing, and files that go both ways.
 * The pinned conversations are in ada's order, an entry dragged to a new place or moved with Alt
 * and the arrows, and a file in a message dragged onto a conversation in the rail opens it with the
 * file attached to its composer.
 */
const TOP: RailEntry[] = [
    { id: 'new', label: 'New chat', icon: PenSquare, href: '#' },
    { id: 'search', label: 'Search chats', icon: Search, href: '#' },
]

const PINNED: RailEntry[] = [
    { id: 'c1', label: 'Why nightly-export failed', icon: MessageSquare, href: '#' },
    { id: 'c2', label: 'Index rebuild timings', icon: MessageSquare, href: '#' },
    { id: 'p1', label: 'Harbor launch', icon: Folder, href: '#' },
]

const RECENT: RailEntry[] = [
    { id: 'c3', label: 'Digest email wording', icon: MessageSquare, href: '#' },
    { id: 'c4', label: 'Orders CSV columns', icon: MessageSquare, href: '#' },
    { id: 'c5', label: 'Cron syntax for weekdays', icon: MessageSquare, href: '#' },
    { id: 'c6', label: 'Retry policy for the api', icon: MessageSquare, href: '#' },
]

/** What a file in a message drags as, onto a conversation in the rail. */
const CHAT_FILE = 'chat-file'

/** A file from a message as one waiting in a composer. */
function waiting(file: AttachmentFile): ComposerAttachment {
    return {
        id: `${file.id}-again`,
        name: file.name,
        kind: file.kind === 'audio' ? 'audio' : file.image !== undefined ? 'image' : 'file',
        url: file.image ?? file.src,
        detail: typeof file.detail === 'string' ? file.detail : undefined,
    }
}

/** The rail: the pinned in the reader's order, and every conversation a place a file is dropped on. */
function railGroups(
    pinned: readonly RailEntry[],
    active: string,
    onPinned: (from: number, to: number) => void,
    onFile: (to: string, file: AttachmentFile) => void,
): RailGroup[] {
    const conversation = (entry: RailEntry): RailEntry => ({
        ...entry,
        active: entry.id === active,
        drop: {
            accepts: (drag: DragData) => drag.kind === CHAT_FILE,
            onDrop: (drag: DragData) => onFile(entry.id, drag.value as AttachmentFile),
        },
    })
    return [
        { id: 'top', entries: TOP },
        { id: 'pinned', title: 'Pinned', entries: pinned.map(conversation), onReorder: onPinned },
        { id: 'recent', title: 'Recent', entries: RECENT.map(conversation) },
    ]
}

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

const REASONING = `The person asks why **nightly-export** failed. Start with the latest run, then its log at the failing step.

\`validate\` rejected 37 rows, all on \`amount\`. Two samples should show whether it is one cause or several: \`n/a\` is a blank written out, and \`12,50\` looks like a decimal comma from a European feed.

If most rejections are commas, parsing with the locale in \`transform\` fixes them without loosening \`validate\`.`

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
                reasoning={REASONING}
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
                <ItemGroup>
                    <Columns gap="sm">
                        {SUGGESTIONS.map((suggestion) => (
                            <Item key={suggestion.title} variant="outline" size="sm" render={<a href="#" />} role="listitem">
                                <ItemContent>
                                    <ItemTitle>{suggestion.title}</ItemTitle>
                                    <ItemDescription>{suggestion.detail}</ItemDescription>
                                </ItemContent>
                            </Item>
                        ))}
                    </Columns>
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

/** A question just sent: nothing has come back yet, so the reply says it is thinking. */
function WaitingThread() {
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <AssistantReply {...SPEAKER} time="09:42" state="streaming" />
        </Thread>
    )
}

/** The model's thinking while it is written, open and growing until the answer begins. */
const THINKING = `The person asks why **nightly-export** failed. Start with the latest run, then its log at the failing step.

\`validate\` rejected 37 rows, all on \`amount\`. Two samples should show whether it is one cause or`

/** The thinking streams after the tools have run, before the first word of the answer. */
function ThinkingThread() {
    return (
        <Thread>
            <Question>Why did nightly-export fail last night?</Question>
            <AssistantReply
                {...SPEAKER}
                time="09:42"
                calls={CALLS}
                summary="Investigation complete · 3 tools"
                reasoning={THINKING}
                state="streaming"
            />
        </Thread>
    )
}

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

/**
 * A question sent with a spreadsheet, a screenshot and a voice note, answered and read aloud; in
 * the composer one file waits and two are still uploading.
 */
function Attached() {
    return (
        <Thread>
            <Message align="end">
                <MessageContent>
                    <AttachmentList
                        drag={(file) => ({ kind: CHAT_FILE, label: file.name, value: file })}
                        files={[
                            { id: 'orders', name: 'orders-2026-10.csv', detail: 'CSV, 2.1 MB', icon: <FileSpreadsheet aria-hidden /> },
                            { id: 'rejections', name: 'rejections.png', detail: 'PNG, 184 KB', image: HARBOR_DUSK },
                            {
                                id: 'note',
                                name: 'voice-note.wav',
                                kind: 'audio',
                                src: tuneUrl(),
                                waveform: waveformOf(3, 64),
                                duration: 8,
                            },
                        ]}
                    />
                    <Bubble align="end" variant="secondary">
                        <BubbleContent>Do these explain the rejected rows?</BubbleContent>
                    </Bubble>
                </MessageContent>
            </Message>
            <AssistantReply
                {...SPEAKER}
                time="10:05"
                content={SENT_REPLY}
                speech={{ src: tuneUrl(), waveform: waveformOf(11, 64), duration: 8 }}
                onFeedback={() => undefined}
            />
        </Thread>
    )
}

const PENDING: ComposerAttachment[] = [
    { id: 'a1', name: 'nightly-export.yaml', kind: 'file', detail: 'YAML, 0.6 KB' },
    { id: 'a2', name: 'orders-2026-11.csv', kind: 'file', detail: 'CSV, 2.4 MB', uploading: true, progress: 0.4 },
    { id: 'a3', name: 'validate.log', kind: 'file', detail: '14 KB', uploading: true },
]

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
        answer:
            String.raw`Barely. A locale parse costs about $2\,\mu\text{s}$ more a row, so for the 2,184 rows of a night:

$$
2184 \times 2\,\mu\text{s} \approx 4.4\,\text{ms}
$$

against a median run of 4 min 12 s:

\[
\frac{4.4\,\text{ms}}{252\,\text{s}} \approx 0.002\,\%
\]

The run spends most of its time in ` + '`fetch` and `upload`, so \\(t_{\\text{transform}}\\) barely moves.',
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

/** The instant the history's times are read against, fixed so the story never changes. */
const NOW = new Date(2026, 10, 8, 16, 30).getTime()
const HOUR = 3_600_000

const CONVERSATIONS: ConversationEntry[] = [
    { id: 'c1', title: 'Why nightly-export failed', time: NOW - 0.4 * HOUR },
    { id: 'c2', title: 'Retry policy for sync-inventory', time: NOW - 3 * HOUR, pinned: true },
    { id: 'c3', title: "This week's runs", time: NOW - 5 * HOUR },
    { id: 'c4', title: 'Rejected rows', time: NOW - 26 * HOUR },
    { id: 'c5', title: 'Scheduler time zones', time: NOW - 9 * 24 * HOUR },
]

/** Where the stories keep what they remember, apart from an app's own keys. */
const KEPT = { prefix: 'tidevann-stories.' }

function ChatApp({
    title = 'Why nightly-export failed',
    children,
    scroll = true,
    busy = false,
    attachments = [],
    history = false,
    uploading = false,
}: {
    title?: string
    children: ReactNode
    /** Whether the frame scrolls the thread; a thread with its own scroller says no. */
    scroll?: boolean
    busy?: boolean
    attachments?: readonly ComposerAttachment[]
    /** The conversation history beside the thread, shown or hidden by a button the app remembers. */
    history?: boolean
    /** Files attached through `useUploads` and a pretend uploader the top bar moves on. */
    uploading?: boolean
}) {
    const [collapsed, setCollapsed] = useState(false)
    const [draft, setDraft] = useState('')
    const [files, setFiles] = useState(attachments)
    const [showHistory, setShowHistory] = useStored('chat.history', true, KEPT)
    const [conversations, setConversations] = useState(CONVERSATIONS)
    const [current, setCurrent] = useState('c1')
    const [pinned, setPinned] = useState(PINNED)
    const [opened, setOpened] = useState('c1')
    const groups = railGroups(
        pinned,
        opened,
        (from, to) => setPinned(moveItem(pinned, from, to)),
        (to, file) => {
            setOpened(to)
            setFiles((now) => [...now.filter((each) => each.id !== waiting(file).id), waiting(file)])
        },
    )
    const openedLabel = [...PINNED, ...RECENT].find((entry) => entry.id === opened)?.label
    const fake = useFakeUploader()
    const uploads = useUploads({ accept: '.csv,.yaml,.json,.log', maxSize: PICKED_LIMIT, upload: fake.upload })
    // Two files are on their way up when the story opens, added once.
    const started = useRef(false)
    useEffect(() => {
        if (!uploading || started.current) return
        started.current = true
        uploads.add(PICKED_FILES.slice(0, 2))
        fake.step()
    }, [uploading, uploads, fake])
    const conversation = (
        <Stack gap="none" className="h-full min-h-0 min-w-0 flex-1">
            {scroll ? (
                <Stack gap="none" className="min-h-0 flex-1 overflow-y-auto">
                    {children}
                </Stack>
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
                    attachments={uploading ? uploads.composerFiles : files}
                    onAttach={(picked) => (uploading ? uploads.add(picked) : undefined)}
                    onRemove={(id) => (uploading ? uploads.onRemove(id) : setFiles(files.filter((file) => file.id !== id)))}
                    onCancel={(id) => (uploading ? uploads.onCancel(id) : setFiles(files.filter((file) => file.id !== id)))}
                />
            </div>
        </Stack>
    )
    return (
        <TooltipProvider>
            <RailDrops>
                <Shell
                    rail={
                        <Rail
                            mark={<TidevannMark />}
                            name="Tidevann"
                            groups={groups}
                            collapsed={collapsed}
                            onCollapsedChange={setCollapsed}
                            foot={
                                <AccountMenu
                                    name="ada"
                                    image={pictureOf('ada')}
                                    where="tidevann.example.org"
                                    collapsed={collapsed}
                                    onSettings={() => undefined}
                                />
                            }
                        />
                    }
                    top={
                        <TopBar
                            trail={[{ label: opened === 'c1' ? title : (openedLabel ?? title) }]}
                            actions={
                                <>
                                    {uploading && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => uploads.add(PICKED_FILES)}>
                                                Add files
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={fake.step}>
                                                Move uploads on
                                            </Button>
                                        </>
                                    )}
                                    {history && (
                                        <IconButton
                                            label={showHistory ? 'Hide history' : 'Show history'}
                                            pressed={showHistory}
                                            onClick={() => setShowHistory(!showHistory)}
                                        >
                                            <History aria-hidden />
                                        </IconButton>
                                    )}
                                    <ModelPicker />
                                    <IconButton label="Notifications">
                                        <Bell aria-hidden />
                                    </IconButton>
                                </>
                            }
                        />
                    }
                >
                    {history && showHistory ? (
                        <SplitPane
                            defaultShare={0.24}
                            minShare={0.18}
                            maxShare={0.4}
                            narrow="second"
                            first={
                                <ConversationHistory
                                    framed={false}
                                    conversations={conversations}
                                    current={current}
                                    now={NOW}
                                    onSelect={setCurrent}
                                    onRename={(id, name) =>
                                        setConversations((all) => all.map((one) => (one.id === id ? { ...one, title: name } : one)))
                                    }
                                    onPin={(id, pinned) =>
                                        setConversations((all) => all.map((one) => (one.id === id ? { ...one, pinned } : one)))
                                    }
                                    onDelete={(id) => setConversations((all) => all.filter((one) => one.id !== id))}
                                />
                            }
                            second={conversation}
                        />
                    ) : (
                        conversation
                    )}
                </Shell>
            </RailDrops>
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

/** A question just sent, before anything has come back. */
export const Waiting: StoryObj = {
    render: () => (
        <ChatApp busy>
            <WaitingThread />
        </ChatApp>
    ),
}

/** The model thinking: its thought open and growing, before the answer begins. */
export const Thinking: StoryObj = {
    render: () => (
        <ChatApp busy>
            <ThinkingThread />
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

/** Files sent with a question, a voice note among them, the answer read aloud, and files waiting or uploading for the next. */
export const Attachments: StoryObj = {
    render: () => (
        <ChatApp title="Rejected rows" attachments={PENDING}>
            <Attached />
        </ChatApp>
    ),
}

/**
 * Files attached through `useUploads`: two are on their way up as it opens, Move uploads on sends
 * each a quarter further, Add files adds four (one refused by its type, one by its size), and a
 * file going up cancels from its chip.
 */
export const Uploads: StoryObj = {
    render: () => (
        <ChatApp title="Rejected rows" uploading>
            <Exchange />
        </ChatApp>
    ),
}

/**
 * The conversations beside the thread, under Pinned, Today and Earlier, with rename, pin and
 * delete in each one's menu. The button in the top bar hides it, and the app remembers which.
 */
export const WithHistory: StoryObj = {
    name: 'History',
    render: () => (
        <ChatApp history>
            <Exchange />
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
