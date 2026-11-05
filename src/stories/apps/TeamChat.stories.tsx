import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Bell,
    Bookmark,
    Check,
    ChevronDown,
    Ellipsis,
    FileText,
    Eye,
    Hash,
    House,
    MessageSquare,
    MessagesSquare,
    PenSquare,
    Pin,
    Rocket,
    Search,
    SendHorizontal,
    SmilePlus,
    ThumbsUp,
    UserPlus,
    Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ChannelList, type ChannelSection } from '../../components/ChannelList'
import { ChatDayDivider, ChatMessage, ChatNewDivider, ChatTyping, type ChatFile, type ChatReaction } from '../../components/ChatMessage'
import { Markdown } from '../../components/Markdown'
import { MessageComposer } from '../../components/MessageComposer'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Shell } from '../../components/Shell'
import { SidePanel } from '../../components/SidePanel'
import { TopBar } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { TooltipProvider } from '../../components/ui/tooltip'
import { cn } from '../../lib/cn'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Count } from '../../components/Count'

/**
 * A team chat in the library's frame: a strip of places on the far left, the channels and direct
 * messages beside it, the conversation with its header and composer, and a thread in the side panel.
 */
const meta: Meta = { title: 'Apps/Team chat' }
export default meta

type Person = 'ada' | 'grace' | 'linus' | 'margaret'

const PEOPLE: Record<Person, { name: string; initials: string; tone: string }> = {
    ada: { name: 'ada', initials: 'AL', tone: 'var(--color-chart-1)' },
    grace: { name: 'grace', initials: 'GH', tone: 'var(--color-chart-2)' },
    linus: { name: 'linus', initials: 'LT', tone: 'var(--color-chart-3)' },
    margaret: { name: 'margaret', initials: 'MH', tone: 'var(--color-chart-4)' },
}

function Face({ who }: { who: Person }) {
    const person = PEOPLE[who]
    return (
        <span className="flex size-full items-center justify-center font-semibold text-white" style={{ background: person.tone }}>
            {person.initials}
        </span>
    )
}

function sections(unread: boolean): ChannelSection[] {
    return [
        {
            id: 'channels',
            title: 'Channels',
            onAdd: () => undefined,
            entries: [
                { id: 'harbor-ops', label: 'harbor-ops', kind: 'channel', unread },
                { id: 'juniper-launch', label: 'juniper-launch', kind: 'channel' },
                { id: 'larkspur', label: 'larkspur', kind: 'channel', unread: true, mentions: 2 },
                { id: 'deploys', label: 'deploys', kind: 'channel', unread: true, muted: true },
                { id: 'on-call', label: 'on-call', kind: 'private' },
                { id: 'random', label: 'random', kind: 'channel' },
            ],
        },
        {
            id: 'direct',
            title: 'Direct messages',
            onAdd: () => undefined,
            entries: [
                {
                    id: 'dm-grace',
                    label: 'grace',
                    kind: 'direct',
                    avatar: <Face who="grace" />,
                    presence: 'active',
                    unread: true,
                    mentions: 1,
                },
                { id: 'dm-linus', label: 'linus', kind: 'direct', avatar: <Face who="linus" />, presence: 'away' },
                { id: 'dm-margaret', label: 'margaret', kind: 'direct', avatar: <Face who="margaret" />, presence: 'offline' },
            ],
        },
    ]
}

/** The places on the far left: the workspace, then home, messages and activity. */
function Strip() {
    const place = (icon: ReactNode, label: string, on = false, count?: number) => (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-current={on ? 'page' : undefined}
            className={cn(
                'relative flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4.5',
                on && 'bg-secondary text-foreground',
            )}
        >
            {icon}
            {count !== undefined && <Count value={count} className="absolute -top-1 -right-1" />}
        </button>
    )
    return (
        <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border-strong bg-sidebar py-3">
            <span className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/15">
                <TidevannMark />
            </span>
            {place(<House />, 'Home', true)}
            {place(<MessageSquare />, 'Direct messages', false, 1)}
            {place(<Bell />, 'Activity', false, 3)}
        </div>
    )
}

function Sidebar({ active, onSelect, unread }: { active: string; onSelect: (id: string) => void; unread: boolean }) {
    return (
        <div className="flex h-full">
            <Strip />
            <ChannelList
                className="w-64 border-r border-border-strong"
                sections={sections(unread)}
                active={active}
                onSelect={onSelect}
                header={
                    <div className="flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong px-3">
                        <button
                            type="button"
                            className="flex min-w-0 items-center gap-1 rounded-md px-1 text-sm font-semibold hover:bg-secondary"
                        >
                            <span className="truncate">Tidevann</span>
                            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                        </button>
                        <Button variant="ghost" size="icon" className="ml-auto" aria-label="New message" title="New message">
                            <PenSquare aria-hidden />
                        </Button>
                    </div>
                }
                places={[
                    { id: 'threads', label: 'Threads', icon: <MessagesSquare aria-hidden />, count: 2 },
                    { id: 'activity', label: 'Activity', icon: <Bell aria-hidden /> },
                    { id: 'saved', label: 'Saved', icon: <Bookmark aria-hidden /> },
                    { id: 'drafts', label: 'Drafts and sent', icon: <SendHorizontal aria-hidden /> },
                ]}
            />
        </div>
    )
}

const ACTIONS = (
    <>
        <Button variant="ghost" size="icon" aria-label="Add a reaction" title="Add a reaction">
            <SmilePlus aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Reply in thread" title="Reply in thread">
            <MessageSquare aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Save for later" title="Save for later">
            <Bookmark aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label="More actions" title="More actions">
            <Ellipsis aria-hidden />
        </Button>
    </>
)

const QUEUE_PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="200" viewBox="0 0 480 200"><rect width="480" height="200" fill="#0f1724"/><g stroke="#1f2a3a">${[40, 80, 120, 160].map((y) => `<line x1="0" x2="480" y1="${String(y)}" y2="${String(y)}"/>`).join('')}</g><polyline fill="none" stroke="#38bdf8" stroke-width="3" points="0,150 40,140 80,146 120,120 160,128 200,90 240,40 280,52 320,110 360,130 400,124 440,138 480,132"/><text x="16" y="28" fill="#94a3b8" font-family="sans-serif" font-size="14">queue depth, 06:00 to 10:00</text></svg>`,
)}`

const CSV: ChatFile = { id: 'f1', name: 'orders-failed.csv', kind: 'file', detail: 'CSV, 4 KB' }
const CHART: ChatFile = { id: 'f2', name: 'queue-depth.svg', kind: 'image', url: QUEUE_PICTURE }

function reactions(set: Record<string, boolean>, base: { id: string; icon: ReactNode; label: string; count: number }[]): ChatReaction[] {
    return base.map((reaction) => ({
        ...reaction,
        mine: set[reaction.id] === true,
        count: reaction.count + (set[reaction.id] === true ? 1 : 0),
    }))
}

const ERROR =
    '```\nvalidate: 37 rows failed\n  row 112  A-20431  amount: "n/a" is not a number\n  row 340  A-20659  amount: "12,50" is not a number\n```'

function ChannelHeader({
    title,
    topic,
    members,
    kind = 'channel',
}: {
    title: string
    topic?: string
    members?: number
    kind?: 'channel' | 'direct'
}) {
    return (
        <div className="shrink-0 border-b border-border">
            <div className="flex h-shell-top items-center gap-3 px-(--density-chat-inset)">
                <h1 className="flex min-w-0 items-center gap-1 text-title font-semibold">
                    {kind === 'channel' && <Hash className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                    <span className="truncate">{title}</span>
                </h1>
                {topic !== undefined && <p className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">{topic}</p>}
                <div className="ml-auto flex shrink-0 items-center gap-1">
                    {members !== undefined && (
                        <button
                            type="button"
                            className="flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs hover:bg-secondary"
                        >
                            <span className="flex -space-x-1">
                                {(['grace', 'linus', 'margaret'] as const).map((who) => (
                                    <PersonAvatar key={who} name={who} size="xs" className="ring-2 ring-background" />
                                ))}
                            </span>
                            <span className="tabular-nums">{members}</span>
                        </button>
                    )}
                    <Button variant="ghost" size="icon" aria-label="Pinned messages" title="Pinned messages">
                        <Pin aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Search this channel" title="Search this channel">
                        <Search aria-hidden />
                    </Button>
                </div>
            </div>
            <div role="tablist" className="flex items-center gap-1 px-(--density-chat-inset)">
                {[
                    { id: 'messages', label: 'Messages', icon: MessageSquare },
                    { id: 'files', label: 'Files', icon: FileText },
                    { id: 'pins', label: 'Pins', icon: Pin },
                ].map((tab, index) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={index === 0}
                        className={cn(
                            '-mb-px flex h-8 items-center gap-1.5 border-b-2 px-2 text-sm',
                            index === 0
                                ? 'border-primary font-medium text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <tab.icon className="size-3.5" aria-hidden />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

function Conversation({ onThread, threadOpen }: { onThread: () => void; threadOpen: boolean }) {
    const [mine, setMine] = useState<Record<string, boolean>>({ check: true })
    const flip = (id: string) => setMine((current) => ({ ...current, [id]: current[id] !== true }))
    const [draft, setDraft] = useState('')
    return (
        <div className="flex h-full min-h-0 flex-col">
            <ChannelHeader title="harbor-ops" topic="Deploys, runs and incidents for harbor. On call this week: grace." members={12} />
            <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto">
                <div className="py-3">
                    <ChatDayDivider>Yesterday</ChatDayDivider>
                    <ChatMessage
                        author="grace"
                        avatar={<Face who="grace" />}
                        time="16:02"
                        actions={ACTIONS}
                        reactions={reactions(mine, [
                            { id: 'check', icon: <Check aria-hidden />, label: 'Done', count: 2 },
                            { id: 'rocket', icon: <Rocket aria-hidden />, label: 'Shipped', count: 2 },
                        ])}
                        onReact={flip}
                        onAddReaction={() => undefined}
                    >
                        <Markdown content="The deploy of **harbor-api 1.4.0** is done. The rollout took 6 minutes and no run was interrupted." />
                    </ChatMessage>
                    <ChatMessage author="linus" avatar={<Face who="linus" />} time="16:05" actions={ACTIONS}>
                        <Markdown content="Nice. `nightly-export` still writes to the old bucket; I'll move it tomorrow." />
                    </ChatMessage>
                    <ChatDayDivider>Today</ChatDayDivider>
                    <ChatMessage
                        author="ada"
                        avatar={<Face who="ada" />}
                        time="09:12"
                        actions={ACTIONS}
                        highlighted={threadOpen}
                        thread={{ count: 3, people: [<Face key="g" who="grace" />, <Face key="l" who="linus" />], last: 'today at 09:40' }}
                        onOpenThread={onThread}
                        reactions={reactions(mine, [{ id: 'eye', icon: <Eye aria-hidden />, label: 'Looking', count: 2 }])}
                        onReact={flip}
                    >
                        <Markdown content="Morning. `nightly-export` failed at **validate** again: 37 rows carry an amount that is not a number." />
                    </ChatMessage>
                    <ChatMessage author="ada" avatar={<Face who="ada" />} time="09:13" continued actions={ACTIONS}>
                        <Markdown content={ERROR} />
                    </ChatMessage>
                    <ChatNewDivider />
                    <ChatMessage author="margaret" avatar={<Face who="margaret" />} time="09:41" files={[CSV]} actions={ACTIONS}>
                        <Markdown content="Here are the rows that failed, from the run's output." />
                    </ChatMessage>
                    <ChatMessage author="margaret" avatar={<Face who="margaret" />} time="09:41" continued edited actions={ACTIONS}>
                        <Markdown content="**@ada** is `12,50` a decimal comma? Then the locale fixes most of them." />
                    </ChatMessage>
                    <ChatMessage
                        author="grace"
                        avatar={<Face who="grace" />}
                        time="09:44"
                        files={[CHART]}
                        actions={ACTIONS}
                        reactions={reactions(mine, [{ id: 'thumbs', icon: <ThumbsUp aria-hidden />, label: 'Agree', count: 1 }])}
                        onReact={flip}
                    >
                        <Markdown content="The queue backed up while it retried. It drained by 08:10." />
                    </ChatMessage>
                </div>
            </div>
            <ChatTyping>linus is typing</ChatTyping>
            <div className="shrink-0 px-(--density-chat-inset) pb-4">
                <MessageComposer
                    value={draft}
                    onChange={setDraft}
                    onSend={() => setDraft('')}
                    onAttach={() => undefined}
                    onEmoji={() => undefined}
                    onMention={() => undefined}
                    onSendLater={() => undefined}
                    words={{ placeholder: 'Message #harbor-ops' }}
                />
            </div>
        </div>
    )
}

function Thread() {
    const [draft, setDraft] = useState('')
    const [also, setAlso] = useState(false)
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto py-3">
                <ChatMessage author="ada" avatar={<Face who="ada" />} time="09:12">
                    <Markdown content="Morning. `nightly-export` failed at **validate** again: 37 rows carry an amount that is not a number." />
                </ChatMessage>
                <div className="my-2 flex items-center gap-3 px-5 text-xs text-muted-foreground">
                    <span>3 replies</span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <ChatMessage author="grace" avatar={<Face who="grace" />} time="09:20">
                    <Markdown content="Same file as last week? The export from juniper changed its number format on Monday." />
                </ChatMessage>
                <ChatMessage author="linus" avatar={<Face who="linus" />} time="09:31">
                    <Markdown content="Yes, juniper switched to `nb-NO`. I can parse with the locale in `validate`." />
                </ChatMessage>
                <ChatMessage author="linus" avatar={<Face who="linus" />} time="09:40" continued>
                    <Markdown content="PR is up: harbor#412." />
                </ChatMessage>
                <div className="px-4 pt-3">
                    <MessageComposer
                        value={draft}
                        onChange={setDraft}
                        onSend={() => setDraft('')}
                        onAttach={() => undefined}
                        onEmoji={() => undefined}
                        onMention={() => undefined}
                        onSendLater={() => undefined}
                        alsoSendTo={
                            <>
                                <Hash className="size-3" aria-hidden />
                                harbor-ops
                            </>
                        }
                        alsoSend={also}
                        onAlsoSendChange={setAlso}
                        words={{ placeholder: 'Reply' }}
                    />
                </div>
            </div>
        </div>
    )
}

function Direct() {
    const [draft, setDraft] = useState('')
    return (
        <div className="flex h-full min-h-0 flex-col">
            <ChannelHeader title="grace" kind="direct" />
            <div className="min-h-0 flex-1 overflow-y-auto py-3">
                <div className="flex items-center gap-3 px-5 pb-4">
                    <span className="flex size-16 overflow-hidden rounded-xl text-title">
                        <Face who="grace" />
                    </span>
                    <div>
                        <p className="font-semibold">grace</p>
                        <p className="text-sm text-muted-foreground">Platform, on call this week. Active.</p>
                    </div>
                </div>
                <ChatDayDivider>Today</ChatDayDivider>
                <ChatMessage author="grace" avatar={<Face who="grace" />} time="08:55" actions={ACTIONS}>
                    <Markdown content="Could you take the juniper release review at 14:00? I'm stuck in the incident review." />
                </ChatMessage>
                <ChatMessage author="ada" avatar={<Face who="ada" />} time="09:02" actions={ACTIONS}>
                    <Markdown content="Sure. Anything I should look at first?" />
                </ChatMessage>
                <ChatNewDivider />
                <ChatMessage author="grace" avatar={<Face who="grace" />} time="09:05" actions={ACTIONS}>
                    <Markdown content="The migration in step 3. **@ada** it renames a column the larkspur dashboards read." />
                </ChatMessage>
            </div>
            <div className="shrink-0 px-(--density-chat-inset) pb-4">
                <MessageComposer
                    value={draft}
                    onChange={setDraft}
                    onSend={() => setDraft('')}
                    onAttach={() => undefined}
                    onEmoji={() => undefined}
                    onMention={() => undefined}
                    onSendLater={() => undefined}
                    words={{ placeholder: 'Message grace' }}
                />
            </div>
        </div>
    )
}

function NewChannelPage() {
    const [draft, setDraft] = useState('')
    return (
        <div className="flex h-full min-h-0 flex-col">
            <ChannelHeader title="juniper-launch" members={1} />
            <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-5 py-6">
                <div className="flex max-w-lg flex-col items-start gap-3">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary-ink">
                        <Hash className="size-6" aria-hidden />
                    </span>
                    <h2 className="text-page font-semibold">juniper-launch</h2>
                    <p className="text-sm text-muted-foreground">ada created this channel today. It is the start of #juniper-launch.</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <UserPlus aria-hidden />
                            Add people
                        </Button>
                        <Button variant="ghost" size="sm">
                            <Users aria-hidden />
                            Set a topic
                        </Button>
                    </div>
                </div>
            </div>
            <div className="shrink-0 px-(--density-chat-inset) pb-4">
                <MessageComposer
                    value={draft}
                    onChange={setDraft}
                    onSend={() => setDraft('')}
                    onAttach={() => undefined}
                    onEmoji={() => undefined}
                    onMention={() => undefined}
                    onSendLater={() => undefined}
                    words={{ placeholder: 'Message #juniper-launch' }}
                />
            </div>
        </div>
    )
}

function TeamChat({ start = 'harbor-ops', thread = false }: { start?: string; thread?: boolean }) {
    const [active, setActive] = useState(start)
    const [panel, setPanel] = useState(thread)
    const body =
        active === 'dm-grace' ? (
            <Direct />
        ) : active === 'juniper-launch' ? (
            <NewChannelPage />
        ) : (
            <Conversation threadOpen={panel} onThread={() => setPanel(true)} />
        )
    return (
        <TooltipProvider>
            <Shell
                rail={<Sidebar active={active} onSelect={setActive} unread={active !== 'harbor-ops'} />}
                top={<TopBar onSearch={() => undefined} words={{ search: 'Search Tidevann', trail: 'Where you are' }} />}
                panelOpen={panel}
                onPanelOpenChange={setPanel}
                panel={
                    active === 'harbor-ops' ? (
                        <SidePanel tabs={[{ id: 'thread', label: 'Thread in #harbor-ops', content: <Thread /> }]} width="24rem" />
                    ) : undefined
                }
            >
                {body}
            </Shell>
        </TooltipProvider>
    )
}

/** A channel with days, the line where unread messages begin, reactions, a thread, code, a file and a picture, and someone typing. */
export const Channel: StoryObj = { render: () => <TeamChat /> }

/** The thread under ada's message open in the side panel, with its own reply box. */
export const ThreadOpen: StoryObj = { name: 'Thread open', render: () => <TeamChat thread /> }

/** A conversation with one person, their picture and status at the top. */
export const DirectMessage: StoryObj = { name: 'Direct message', render: () => <TeamChat start="dm-grace" /> }

/** A channel just created: nothing said yet, and the ways to get it started. */
export const NewChannel: StoryObj = { name: 'New channel', render: () => <TeamChat start="juniper-launch" /> }
