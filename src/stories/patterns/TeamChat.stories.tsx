import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, Ellipsis, FileText, Hash, MessageSquare, Pin, Rocket, Search, UserPlus } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ChannelHeader, type ChannelHeaderAction, type ChannelHeaderTab } from '../../components/ChannelHeader'
import { ChatDay, ChatMessage, ChatNewDivider, type ChatPerson, type ChatReaction } from '../../components/ChatMessage'
import { Conversation, ConversationStart, ThreadView } from '../../components/Conversation'
import { Markdown } from '../../components/Markdown'
import { MessageComposer } from '../../components/MessageComposer'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Button } from '../../components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu'
import { TooltipProvider } from '../../components/ui/tooltip'
import { Row, Stack } from '../../components/Layout'

/**
 * The message half of a team chat: messages laid out densely with the author's square picture,
 * runs of one author's messages, reactions, thread lines, links and edits, the day dividers that
 * stay in view, the channel's header with its members, actions and views, how a conversation
 * starts, a thread with its replies, and the conversation's column that holds them all.
 */
const meta: Meta = { title: 'Patterns/Team chat' }
export default meta

function Ground({ children }: { children: ReactNode }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background py-6 text-foreground">{children}</div>
        </TooltipProvider>
    )
}

const noop = () => undefined

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

const GRACE: ChatPerson = { name: 'grace' }
const LINUS: ChatPerson = { name: 'linus' }
const MARGARET: ChatPerson = { name: 'margaret' }
const ADA: ChatPerson = { name: 'ada' }

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

/** One message: the author's picture, name and time on one line, and the body right under it. */
export const Message: StoryObj = {
    render: () => (
        <Ground>
            <ChatMessage author="ada" time="09:12" timeTitle="Friday, November 6 at 09:12" {...BAR}>
                <Markdown content="Morning. `nightly-export` failed at **validate** again: 37 rows carry an amount that is not a number." />
            </ChatMessage>
        </Ground>
    ),
}

/**
 * A run of one author's messages: only the first carries her picture and name. The third is held
 * in its hover look, its time in the gutter and its band showing where it starts and ends.
 */
export const Grouped: StoryObj = {
    render: () => (
        <Ground>
            <ChatMessage author="margaret" time="09:41" {...BAR}>
                <Markdown content="Here are the rows that failed, from the run's output." />
            </ChatMessage>
            <ChatMessage author="margaret" time="09:41" continued {...BAR}>
                <Markdown content="Most of them come from juniper's feed." />
            </ChatMessage>
            <ChatMessage author="margaret" time="09:42" continued active {...BAR}>
                <Markdown content="Is `12,50` a decimal comma? Then the locale fixes most of them, and `validate` can stay strict." />
            </ChatMessage>
            <ChatMessage author="margaret" time="09:44" continued {...BAR}>
                <Markdown content="The other four are empty amounts. Those should fail." />
            </ChatMessage>
        </Ground>
    ),
}

function ReactionsStory() {
    const { of, flip } = useReactions({ party: true, done: true })
    return (
        <Ground>
            <ChatMessage
                author="grace"
                time="16:02"
                {...BAR}
                reactions={of([
                    { id: 'party', icon: '🎉', label: 'Party', count: 3 },
                    { id: 'eyes', icon: '👀', label: 'Looking', count: 1 },
                    { id: 'heart', icon: '❤️', label: 'Love', count: 2 },
                ])}
                onReact={flip}
            >
                <Markdown content="The deploy of **harbor-api 1.4.0** is done. The rollout took 6 minutes and no run was interrupted." />
            </ChatMessage>
            <ChatMessage
                author="linus"
                time="16:05"
                {...BAR}
                reactions={of([
                    { id: 'done', icon: <Check aria-hidden />, label: 'Done', count: 1 },
                    { id: 'shipped', icon: <Rocket aria-hidden />, label: 'Shipped', count: 4 },
                ])}
                onReact={flip}
            >
                <Markdown content="`nightly-export` writes to the new bucket now." />
            </ChatMessage>
        </Ground>
    )
}

/**
 * Reactions as pills under the body, an emoji or an icon with its count; the ones the reader gave
 * are drawn chosen, and the button at the end adds another.
 */
export const Reactions: StoryObj = { render: () => <ReactionsStory /> }

/**
 * The line under a message with replies: the faces of up to three who replied, the count in the
 * link color and when the last reply came. Hovering it says it opens the thread.
 */
export const ThreadSummary: StoryObj = {
    name: 'Thread summary',
    render: () => (
        <Ground>
            <ChatMessage
                author="ada"
                time="09:12"
                {...BAR}
                thread={{ count: 5, people: [GRACE, LINUS, MARGARET, ADA], last: 'today at 09:40' }}
                onOpenThread={noop}
            >
                <Markdown content="Morning. `nightly-export` failed at **validate** again: 37 rows carry an amount that is not a number." />
            </ChatMessage>
            <ChatMessage
                author="linus"
                time="10:02"
                {...BAR}
                thread={{ count: 1, people: [GRACE], last: 'today at 10:05' }}
                onOpenThread={noop}
            >
                <Markdown content="Who owns the scheduler's retry settings now?" />
            </ChatMessage>
        </Ground>
    ),
}

/** Edited messages say so after their last line; hovering the word gives the edit time. */
export const Edited: StoryObj = {
    render: () => (
        <Ground>
            <ChatMessage author="margaret" time="09:41" editedAt="today at 09:44" {...BAR}>
                <Markdown content="**@ada** is `12,50` a decimal comma? Then the locale fixes most of them." />
            </ChatMessage>
            <ChatMessage author="linus" time="09:52" editedAt="today at 10:01" {...BAR}>
                <Markdown
                    content={
                        "Plan for the fix:\n\nParse amounts with the feed's locale in `transform`, then let `validate` stay strict.\n\nI will ship it behind a flag first."
                    }
                />
            </ChatMessage>
            <ChatMessage author="linus" time="09:53" continued edited {...BAR}>
                Plain text works the same.
            </ChatMessage>
        </Ground>
    ),
}

/** Links in a body carry a small link glyph before them, in markdown and in plain text alike. */
export const Links: StoryObj = {
    render: () => (
        <Ground>
            <ChatMessage author="grace" time="11:20" {...BAR}>
                <Markdown content="The failed run is [harbor run 412](https://runs.example.org/harbor/412), and the filter is described in the [rows.filter reference](https://docs.example.org/steps/rows-filter)." />
            </ChatMessage>
            <ChatMessage author="grace" time="11:21" continued {...BAR}>
                <Markdown content="Status page: https://status.example.org" />
            </ChatMessage>
            <ChatMessage author="ada" time="11:30" {...BAR}>
                Thanks, the dashboard is at <a href="https://larkspur.example.org/dashboards/queues">larkspur queues</a>.
            </ChatMessage>
        </Ground>
    ),
}

/** The days of the Day dividers and Channel stories, oldest first. */
function Days({ unreadFrom = false }: { unreadFrom?: boolean }) {
    const { of, flip } = useReactions({ done: true })
    return (
        <>
            <ChatDay label="Tuesday, November 3">
                <ChatMessage author="linus" time="14:10" {...BAR}>
                    <Markdown content="`sync-inventory` is moving to the new scheduler this week." />
                </ChatMessage>
                <ChatMessage author="linus" time="14:11" continued {...BAR}>
                    <Markdown content="It runs every 15 minutes there, same as before." />
                </ChatMessage>
                <ChatMessage author="margaret" time="15:30" {...BAR}>
                    <Markdown content="Good. Keep the old one around until Friday in case we need to roll back." />
                </ChatMessage>
            </ChatDay>
            <ChatDay label="Wednesday, November 4">
                <ChatMessage author="ada" time="10:02" {...BAR}>
                    <Markdown content="`rebuild-index` took 41 minutes last night, up from 12." />
                </ChatMessage>
                <ChatMessage
                    author="grace"
                    time="10:15"
                    {...BAR}
                    thread={{ count: 2, people: [LINUS, ADA], last: 'Wednesday at 10:40' }}
                    onOpenThread={noop}
                >
                    <Markdown content="That is the new larkspur projects. I will look at the batch size." />
                </ChatMessage>
                <ChatMessage author="grace" time="16:48" {...BAR}>
                    <Markdown content="Batch size is back to 500. Tonight's run will tell." />
                </ChatMessage>
            </ChatDay>
            <ChatDay label="Yesterday">
                <ChatMessage
                    author="grace"
                    time="16:02"
                    {...BAR}
                    reactions={of([
                        { id: 'done', icon: <Check aria-hidden />, label: 'Done', count: 2 },
                        { id: 'party', icon: '🎉', label: 'Party', count: 2 },
                    ])}
                    onReact={flip}
                >
                    <Markdown content="The deploy of **harbor-api 1.4.0** is done. The rollout took 6 minutes and no run was interrupted." />
                </ChatMessage>
                <ChatMessage author="linus" time="16:05" {...BAR}>
                    <Markdown content="Nice. `nightly-export` still writes to the old bucket; I will move it tomorrow." />
                </ChatMessage>
                <ChatMessage author="linus" time="16:06" continued {...BAR}>
                    <Markdown content="It needs a new key for the bucket first: [the request](https://tickets.example.org/harbor/88)." />
                </ChatMessage>
            </ChatDay>
            <ChatDay label="Today">
                <ChatMessage
                    author="ada"
                    time="09:12"
                    {...BAR}
                    thread={{ count: 3, people: [GRACE, LINUS], last: 'today at 09:40' }}
                    onOpenThread={noop}
                    reactions={of([{ id: 'eyes', icon: '👀', label: 'Looking', count: 2 }])}
                    onReact={flip}
                >
                    <Markdown content="Morning. `nightly-export` failed at **validate** again: 37 rows carry an amount that is not a number." />
                </ChatMessage>
                <ChatMessage author="ada" time="09:13" continued {...BAR}>
                    <Markdown
                        content={
                            '```\nvalidate: 37 rows failed\n  row 112  A-20431  amount: "n/a" is not a number\n  row 340  A-20659  amount: "12,50" is not a number\n```'
                        }
                    />
                </ChatMessage>
                {unreadFrom && <ChatNewDivider />}
                <ChatMessage
                    author="margaret"
                    time="09:41"
                    files={[{ id: 'f1', name: 'orders-failed.csv', kind: 'file', detail: 'CSV, 4 KB' }]}
                    {...BAR}
                >
                    <Markdown content="Here are the rows that failed, from the run's output." />
                </ChatMessage>
                <ChatMessage author="margaret" time="09:42" continued editedAt="today at 09:44" {...BAR}>
                    <Markdown content="**@ada** is `12,50` a decimal comma? Then the locale fixes most of them." />
                </ChatMessage>
                <ChatMessage author="grace" time="09:47" {...BAR}>
                    <Markdown content="Probably. juniper switched its export to `nb-NO` on Monday." />
                </ChatMessage>
            </ChatDay>
        </>
    )
}

/**
 * Several days, each under a pill on a rule. The list starts at its end, as a conversation does;
 * the pill of the day at the top sticks there while the day scrolls by, and leaves with its day.
 */
export const DayDividers: StoryObj = {
    name: 'Day dividers',
    render: () => (
        <TooltipProvider>
            <div className="flex h-svh flex-col-reverse overflow-y-auto bg-background text-foreground">
                <div className="pb-4">
                    <Days />
                </div>
            </div>
        </TooltipProvider>
    ),
}

const ACTIONS: ChannelHeaderAction[] = [
    { id: 'pins', label: 'Pinned messages', icon: <Pin aria-hidden /> },
    { id: 'search', label: 'Search in the channel', icon: <Search aria-hidden /> },
    { id: 'more', label: 'More actions', icon: <Ellipsis aria-hidden /> },
]

const TABS: ChannelHeaderTab[] = [
    { id: 'messages', label: 'Messages', icon: <MessageSquare aria-hidden /> },
    { id: 'files', label: 'Files', icon: <FileText aria-hidden /> },
    { id: 'pins', label: 'Pins', icon: <Pin aria-hidden /> },
]

const MEMBERS = [GRACE, LINUS, MARGARET, ADA]

/**
 * A channel's header three ways: a public channel with its topic, members, actions and views; a
 * private one with a lock; and a direct conversation with the person's picture and presence.
 */
export const Header: StoryObj = {
    render: () => (
        <Ground>
            <Stack gap="2xl">
                <ChannelHeader
                    name="harbor-ops"
                    topic="Deploys, runs and incidents for harbor. On call this week: grace."
                    onDetails={noop}
                    members={MEMBERS}
                    memberCount={12}
                    onMembers={noop}
                    actions={ACTIONS}
                    tabs={TABS}
                />
                <ChannelHeader
                    name="on-call-handover"
                    private
                    topic="Who holds the pager, and what they hand over."
                    onDetails={noop}
                    members={[GRACE, LINUS]}
                    memberCount={2}
                    onMembers={noop}
                    actions={ACTIONS}
                />
                <ChannelHeader name="grace" kind="direct" presence="active" onDetails={noop} actions={ACTIONS.slice(1)} />
            </Stack>
        </Ground>
    ),
}

/**
 * How a conversation starts, at the top of its messages: a direct one with the person's large
 * picture, and a new channel with its icon on a tile and the ways to get it going.
 */
export const Start: StoryObj = {
    render: () => (
        <Ground>
            <Stack gap="2xl">
                <ConversationStart picture={<PersonAvatar name="grace" size="xl" shape="square" />} title="grace">
                    Platform, on call this week. This is the start of your conversation with grace.
                </ConversationStart>
                <ConversationStart
                    icon={<Hash aria-hidden />}
                    title="juniper-launch"
                    actions={
                        <Button variant="outline" size="sm">
                            <UserPlus aria-hidden />
                            Add people
                        </Button>
                    }
                >
                    ada created this channel today. It is the start of #juniper-launch.
                </ConversationStart>
            </Stack>
        </Ground>
    ),
}

/** A reply box that holds its own draft. */
function Reply({ placeholder, thread = false }: { placeholder: string; thread?: boolean }) {
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

/**
 * A thread as a side panel holds it: the message it started from, the replies right under it with
 * one author's replies in a row grouped into a run, an edited reply, and the reply box after the
 * last one.
 */
export const Thread: StoryObj = {
    render: () => (
        <TooltipProvider>
            <Row gap="none" align="stretch" justify="end" className="h-svh bg-background text-foreground">
                <ThreadView
                    className="w-full max-w-sm border-l border-border-strong bg-sidebar"
                    parent={
                        <ChatMessage author="ada" time="09:12" {...BAR}>
                            <Markdown content="Morning. `nightly-export` failed at **validate** again: 37 rows carry an amount that is not a number." />
                        </ChatMessage>
                    }
                    composer={<Reply placeholder="Reply" thread />}
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
            </Row>
        </TooltipProvider>
    ),
}

function ChannelStory() {
    const [tab, setTab] = useState('messages')
    return (
        <TooltipProvider>
            <div className="h-svh bg-background text-foreground">
                <Conversation
                    header={
                        <ChannelHeader
                            name="harbor-ops"
                            topic="Deploys, runs and incidents for harbor. On call this week: grace."
                            onDetails={noop}
                            members={MEMBERS}
                            memberCount={12}
                            onMembers={noop}
                            actions={ACTIONS}
                            tabs={TABS}
                            tab={tab}
                            onTabChange={setTab}
                        />
                    }
                    typing="linus is typing"
                    composer={<Reply placeholder="Message #harbor-ops" />}
                >
                    <Days unreadFrom />
                </Conversation>
            </div>
        </TooltipProvider>
    )
}

/**
 * A whole channel at full height: the header with its views, then days of messages with their
 * dividers, the line where unread messages begin, who is typing, and the composer.
 */
export const Channel: StoryObj = { render: () => <ChannelStory /> }
