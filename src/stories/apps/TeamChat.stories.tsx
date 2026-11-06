import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Bell,
    Bookmark,
    Check,
    ChevronDown,
    Ellipsis,
    Eye,
    FileText,
    Files,
    Hash,
    House,
    MessageSquare,
    MessagesSquare,
    PenSquare,
    Pin,
    Plus,
    Rocket,
    Search,
    SendHorizontal,
    Star,
    ThumbsUp,
    UserPlus,
    Users,
} from 'lucide-react'
import { useState } from 'react'

import { ChannelHeader, type ChannelHeaderAction, type ChannelHeaderTab } from '../../components/ChannelHeader'
import { ChannelList, type ChannelSection } from '../../components/ChannelList'
import { ChatDay, ChatMessage, ChatNewDivider, type ChatFile, type ChatPerson, type ChatReaction } from '../../components/ChatMessage'
import { Conversation, ConversationStart, ThreadView } from '../../components/Conversation'
import { Markdown } from '../../components/Markdown'
import { MessageComposer, type MessageSchedule } from '../../components/MessageComposer'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Rail, type RailGroup } from '../../components/Rail'
import { Shell } from '../../components/Shell'
import { SidePanel } from '../../components/SidePanel'
import { TopBar } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu'
import { TooltipProvider } from '../../components/ui/tooltip'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * A team chat in the library's frame: a strip of places on the far left, the channels and direct
 * messages beside it, the conversation with its header and composer, and a thread in the side panel.
 */
const meta: Meta = { title: 'Apps/Team chat' }
export default meta

const noop = () => undefined

const GRACE: ChatPerson = { name: 'grace' }
const LINUS: ChatPerson = { name: 'linus' }
const MARGARET: ChatPerson = { name: 'margaret' }
const ADA: ChatPerson = { name: 'ada' }

/** The places on the far left: home, direct messages, activity and files. */
const STRIP: RailGroup[] = [
    {
        id: 'places',
        entries: [
            { id: 'home', label: 'Home', icon: House, href: '#', active: true },
            { id: 'dms', label: 'DMs', icon: MessagesSquare, href: '#', count: 1 },
            { id: 'activity', label: 'Activity', icon: Bell, href: '#', count: 3 },
            { id: 'files', label: 'Files', icon: Files, href: '#', unread: true },
            { id: 'more', label: 'More', icon: Ellipsis, href: '#' },
        ],
    },
]

const STRIP_FOOT = (
    <>
        <Button variant="secondary" size="icon-lg" aria-label="Create" title="Create">
            <Plus aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label="Account" title="ada">
            <PersonAvatar name="ada" size="lg" shape="square" presence="active" />
        </Button>
    </>
)

/** The sections, with the open conversation read. */
function sections(active: string): ChannelSection[] {
    const all: ChannelSection[] = [
        {
            id: 'starred',
            title: 'Starred',
            icon: <Star aria-hidden />,
            entries: [
                { id: 'larkspur', label: 'larkspur', kind: 'channel', unread: true, mentions: 2 },
                { id: 'dm-margaret', label: 'margaret', kind: 'direct', person: { name: 'margaret' }, presence: 'offline' },
            ],
        },
        {
            id: 'channels',
            title: 'Channels',
            icon: <Hash aria-hidden />,
            onAdd: noop,
            entries: [
                { id: 'harbor-ops', label: 'harbor-ops', kind: 'channel', unread: true },
                { id: 'juniper-launch', label: 'juniper-launch', kind: 'channel' },
                { id: 'deploys', label: 'deploys', kind: 'channel', unread: true, muted: true },
                { id: 'on-call', label: 'on-call', kind: 'private' },
                { id: 'incident-review', label: 'incident-review', kind: 'private', unread: true },
                { id: 'random', label: 'random', kind: 'channel' },
            ],
        },
        {
            id: 'direct',
            title: 'Direct messages',
            icon: <MessagesSquare aria-hidden />,
            onAdd: noop,
            entries: [
                {
                    id: 'dm-grace',
                    label: 'grace',
                    kind: 'direct',
                    person: { name: 'grace' },
                    presence: 'active',
                    unread: true,
                    mentions: 1,
                },
                { id: 'dm-linus', label: 'linus', kind: 'direct', person: { name: 'linus' }, presence: 'away' },
                { id: 'dm-scheduler', label: 'scheduler', kind: 'direct', person: { name: 'scheduler', initials: 'S', color: 'teal' } },
            ],
        },
    ]
    return all.map((section) => ({
        ...section,
        entries: section.entries.map((entry) => (entry.id === active ? { ...entry, unread: false, mentions: undefined } : entry)),
    }))
}

function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
    const [query, setQuery] = useState('')
    const [size, setSize] = useState(256)
    return (
        <div className="flex h-full">
            <Rail variant="strip" mark={<TidevannMark className="size-5" />} name="Tidevann" groups={STRIP} foot={STRIP_FOOT} />
            <ChannelList
                className="border-r border-border-strong"
                size={size}
                onSizeChange={setSize}
                sections={sections(active)}
                active={active}
                onSelect={onSelect}
                title={
                    <Button variant="ghost" size="sm" className="-ml-2 font-semibold">
                        Tidevann
                        <ChevronDown aria-hidden />
                    </Button>
                }
                actions={
                    <Button variant="ghost" size="icon" aria-label="New message" title="New message">
                        <PenSquare aria-hidden />
                    </Button>
                }
                find
                query={query}
                onQueryChange={setQuery}
                places={[
                    { id: 'threads', label: 'Threads', icon: <MessageSquare aria-hidden />, count: 2 },
                    { id: 'saved', label: 'Saved', icon: <Bookmark aria-hidden /> },
                    { id: 'drafts', label: 'Drafts and sent', icon: <SendHorizontal aria-hidden /> },
                ]}
            />
        </div>
    )
}

const MENU = (
    <>
        <DropdownMenuItem>Copy link</DropdownMenuItem>
        <DropdownMenuItem>Mark unread</DropdownMenuItem>
        <DropdownMenuItem>Remind me about this</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Edit message</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Delete message</DropdownMenuItem>
    </>
)

/** What every message offers on hover: react, reply in thread, and the menu. */
const BAR = { onAddReaction: noop, onReply: noop, menu: MENU }

const ACTIONS: ChannelHeaderAction[] = [
    { id: 'pins', label: 'Pinned messages', icon: <Pin aria-hidden /> },
    { id: 'search', label: 'Search in the channel', icon: <Search aria-hidden /> },
]

const TABS: ChannelHeaderTab[] = [
    { id: 'messages', label: 'Messages', icon: <MessageSquare aria-hidden /> },
    { id: 'files', label: 'Files', icon: <FileText aria-hidden /> },
    { id: 'pins', label: 'Pins', icon: <Pin aria-hidden /> },
]

const SCHEDULE: MessageSchedule[] = [
    { id: 'hour', label: 'In an hour', detail: '10:41' },
    { id: 'tomorrow', label: 'Tomorrow morning', detail: 'Sat 09:00' },
    { id: 'monday', label: 'Next Monday', detail: 'Mon 09:00' },
]

/** A composer that holds its own draft; in a thread it offers to send the reply to the channel too. */
function Composer({ placeholder, thread = false }: { placeholder: string; thread?: boolean }) {
    const [draft, setDraft] = useState('')
    const [also, setAlso] = useState(false)
    return (
        <MessageComposer
            value={draft}
            onChange={setDraft}
            onSend={() => setDraft('')}
            onAttach={noop}
            onEmoji={noop}
            onMention={noop}
            onSendLater={noop}
            schedule={SCHEDULE}
            onSchedule={noop}
            defaultFormatting={!thread}
            alsoSendTo={
                thread ? (
                    <>
                        <Hash className="size-3" aria-hidden />
                        harbor-ops
                    </>
                ) : undefined
            }
            alsoSend={also}
            onAlsoSendChange={setAlso}
            words={{ placeholder }}
        />
    )
}

const QUEUE_PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="200" viewBox="0 0 480 200"><rect width="480" height="200" fill="#0f1724"/><g stroke="#1f2a3a">${[40, 80, 120, 160].map((y) => `<line x1="0" x2="480" y1="${String(y)}" y2="${String(y)}"/>`).join('')}</g><polyline fill="none" stroke="#38bdf8" stroke-width="3" points="0,150 40,140 80,146 120,120 160,128 200,90 240,40 280,52 320,110 360,130 400,124 440,138 480,132"/><text x="16" y="28" fill="#94a3b8" font-family="sans-serif" font-size="14">queue depth, 06:00 to 10:00</text></svg>`,
)}`

const CSV: ChatFile = { id: 'f1', name: 'orders-failed.csv', kind: 'file', detail: 'CSV, 4 KB' }
const CHART: ChatFile = { id: 'f2', name: 'queue-depth.svg', kind: 'image', url: QUEUE_PICTURE }

/** Reactions with the reader's own taken from `mine`, so pressing one adds or takes it back. */
function useReactions(start: Record<string, boolean>) {
    const [mine, setMine] = useState(start)
    const flip = (id: string) => setMine((current) => ({ ...current, [id]: current[id] !== true }))
    const of = (base: Omit<ChatReaction, 'mine'>[]): ChatReaction[] =>
        base.map((reaction) => ({
            ...reaction,
            mine: mine[reaction.id] === true,
            count: reaction.count + (mine[reaction.id] === true ? 1 : 0),
        }))
    return { of, flip }
}

const ERROR =
    '```\nvalidate: 37 rows failed\n  row 112  A-20431  amount: "n/a" is not a number\n  row 340  A-20659  amount: "12,50" is not a number\n```'

const STARTER = 'Morning. `nightly-export` failed at **validate** again: 37 rows carry an amount that is not a number.'

function ChannelPage({ onThread, threadOpen }: { onThread: () => void; threadOpen: boolean }) {
    const { of, flip } = useReactions({ check: true })
    const [tab, setTab] = useState('messages')
    return (
        <Conversation
            header={
                <ChannelHeader
                    name="harbor-ops"
                    topic="Deploys, runs and incidents for harbor. On call this week: grace."
                    onDetails={noop}
                    members={[GRACE, LINUS, MARGARET]}
                    memberCount={12}
                    onMembers={noop}
                    actions={ACTIONS}
                    tabs={TABS}
                    tab={tab}
                    onTabChange={setTab}
                />
            }
            typing="linus is typing"
            composer={<Composer placeholder="Message #harbor-ops" />}
        >
            <ChatDay label="Yesterday">
                <ChatMessage
                    author="grace"
                    time="16:02"
                    {...BAR}
                    reactions={of([
                        { id: 'check', icon: <Check aria-hidden />, label: 'Done', count: 2 },
                        { id: 'rocket', icon: <Rocket aria-hidden />, label: 'Shipped', count: 2 },
                    ])}
                    onReact={flip}
                >
                    <Markdown content="The deploy of **harbor-api 1.4.0** is done. The rollout took 6 minutes and no run was interrupted." />
                </ChatMessage>
                <ChatMessage author="linus" time="16:05" {...BAR}>
                    <Markdown content="Nice. `nightly-export` still writes to the old bucket; I will move it tomorrow." />
                </ChatMessage>
                <ChatMessage author="linus" time="16:06" continued editedAt="yesterday at 16:09" {...BAR}>
                    <Markdown content="It needs a new key for the bucket first: [the request](https://tickets.example.org/harbor/88)." />
                </ChatMessage>
            </ChatDay>
            <ChatDay label="Today">
                <ChatMessage
                    author="ada"
                    time="09:12"
                    {...BAR}
                    onReply={onThread}
                    highlighted={threadOpen}
                    thread={{ count: 4, people: [LINUS, GRACE], last: 'today at 09:40' }}
                    onOpenThread={onThread}
                    reactions={of([{ id: 'eye', icon: <Eye aria-hidden />, label: 'Looking', count: 2 }])}
                    onReact={flip}
                >
                    <Markdown content={STARTER} />
                </ChatMessage>
                <ChatMessage author="ada" time="09:13" continued {...BAR}>
                    <Markdown content={ERROR} />
                </ChatMessage>
                <ChatNewDivider />
                <ChatMessage author="margaret" time="09:41" files={[CSV]} {...BAR}>
                    <Markdown content="Here are the rows that failed, from the run's output." />
                </ChatMessage>
                <ChatMessage author="margaret" time="09:42" continued editedAt="today at 09:44" {...BAR}>
                    <Markdown content="**@ada** is `12,50` a decimal comma? Then the locale fixes most of them." />
                </ChatMessage>
                <ChatMessage
                    author="grace"
                    time="09:44"
                    files={[CHART]}
                    {...BAR}
                    reactions={of([{ id: 'thumbs', icon: <ThumbsUp aria-hidden />, label: 'Agree', count: 1 }])}
                    onReact={flip}
                >
                    <Markdown content="The queue backed up while it retried. It drained by 08:10." />
                </ChatMessage>
            </ChatDay>
        </Conversation>
    )
}

/** The thread under ada's message: her message, then the replies, one run per author. */
function Thread() {
    return (
        <ThreadView
            parent={
                <ChatMessage author="ada" time="09:12" {...BAR}>
                    <Markdown content={STARTER} />
                </ChatMessage>
            }
            composer={<Composer placeholder="Reply" thread />}
        >
            <ChatMessage author="grace" time="09:20" {...BAR}>
                <Markdown content="Same file as last week? The export from juniper changed its number format on Monday." />
            </ChatMessage>
            <ChatMessage author="linus" time="09:31" editedAt="today at 09:33" {...BAR}>
                <Markdown content="Yes, juniper switched to `nb-NO`. I can parse with the locale in `transform`." />
            </ChatMessage>
            <ChatMessage author="linus" time="09:32" continued {...BAR}>
                <Markdown content="Then `validate` can stay strict for the empty amounts." />
            </ChatMessage>
            <ChatMessage author="linus" time="09:40" continued {...BAR}>
                <Markdown content="The change is up: [harbor#412](https://code.example.org/harbor/412)." />
            </ChatMessage>
        </ThreadView>
    )
}

function Direct() {
    return (
        <Conversation
            header={<ChannelHeader name="grace" kind="direct" presence="active" onDetails={noop} actions={ACTIONS.slice(1)} />}
            composer={<Composer placeholder="Message grace" />}
        >
            <ConversationStart picture={<PersonAvatar name="grace" size="xl" shape="square" />} title="grace">
                Platform, on call this week. This is the start of your conversation with grace.
            </ConversationStart>
            <ChatDay label="Today">
                <ChatMessage author="grace" time="08:55" {...BAR}>
                    <Markdown content="Could you take the juniper release review at 14:00? I am stuck in the incident review." />
                </ChatMessage>
                <ChatMessage author="ada" time="09:02" {...BAR}>
                    <Markdown content="Sure. Anything I should look at first?" />
                </ChatMessage>
                <ChatNewDivider />
                <ChatMessage author="grace" time="09:05" editedAt="today at 09:06" {...BAR}>
                    <Markdown content="The migration in step 3. **@ada** it renames a column the larkspur dashboards read." />
                </ChatMessage>
                <ChatMessage author="grace" time="09:06" continued {...BAR}>
                    <Markdown content="The notes are in [the release checklist](https://docs.example.org/juniper/release)." />
                </ChatMessage>
            </ChatDay>
        </Conversation>
    )
}

function NewChannelPage() {
    return (
        <Conversation
            header={
                <ChannelHeader name="juniper-launch" onDetails={noop} members={[ADA]} memberCount={1} onMembers={noop} actions={ACTIONS} />
            }
            composer={<Composer placeholder="Message #juniper-launch" />}
        >
            <ConversationStart
                icon={<Hash aria-hidden />}
                title="juniper-launch"
                actions={
                    <>
                        <Button variant="outline" size="sm">
                            <UserPlus aria-hidden />
                            Add people
                        </Button>
                        <Button variant="ghost" size="sm">
                            <Users aria-hidden />
                            Set a topic
                        </Button>
                    </>
                }
            >
                ada created this channel today. It is the start of #juniper-launch.
            </ConversationStart>
        </Conversation>
    )
}

function TeamChat({ start = 'harbor-ops', thread = false }: { start?: string; thread?: boolean }) {
    const [active, setActive] = useState(start)
    const [panel, setPanel] = useState(thread)
    const [panelSize, setPanelSize] = useState(384)
    const body =
        active === 'dm-grace' ? (
            <Direct />
        ) : active === 'juniper-launch' ? (
            <NewChannelPage />
        ) : (
            <ChannelPage threadOpen={panel} onThread={() => setPanel(true)} />
        )
    return (
        <TooltipProvider>
            <Shell
                rail={<Sidebar active={active} onSelect={setActive} />}
                top={<TopBar onSearch={noop} words={{ search: 'Search Tidevann', trail: 'Where you are' }} />}
                panelOpen={panel}
                onPanelOpenChange={setPanel}
                panel={
                    active === 'harbor-ops' ? (
                        <SidePanel
                            tabs={[{ id: 'thread', label: 'Thread in #harbor-ops', content: <Thread /> }]}
                            size={panelSize}
                            onSizeChange={setPanelSize}
                            defaultSize={384}
                            words={{ resize: 'Resize the thread' }}
                        />
                    ) : undefined
                }
            >
                {body}
            </Shell>
        </TooltipProvider>
    )
}

/** A channel with days, the line where unread messages begin, reactions, a thread, edits, code, a file and a picture, and someone typing. */
export const Channel: StoryObj = { render: () => <TeamChat /> }

/** The thread under ada's message open in the side panel: the replies right under it, one run per author, and its own reply box. */
export const ThreadOpen: StoryObj = { name: 'Thread open', render: () => <TeamChat thread /> }

/** A conversation with one person, their picture at the top and whether they are around in the header. */
export const DirectMessage: StoryObj = { name: 'Direct message', render: () => <TeamChat start="dm-grace" /> }

/** A channel just created: nothing said yet, and the ways to get it started. */
export const NewChannel: StoryObj = { name: 'New channel', render: () => <TeamChat start="juniper-launch" /> }
