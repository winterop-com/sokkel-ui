import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Bell,
    Bookmark,
    Ellipsis,
    Files,
    FolderKanban,
    Hash,
    House,
    MessagesSquare,
    PenSquare,
    Plus,
    SendHorizontal,
    Star,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ChannelList, type ChannelEntry, type ChannelPlace, type ChannelSection } from '@winterop-com/sokkel-ui/ChannelList'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Rail } from '@winterop-com/sokkel-ui/Rail'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Row } from '@winterop-com/sokkel-ui/Layout'

/**
 * The places to talk in a team chat, in sections that fold: channels, private channels behind a
 * lock, and direct messages with a small round avatar and whether the person is around. Unread
 * entries stand in the foreground weight, mentions carry a count, muted channels are faint, and the
 * open conversation sits on a subtle wash. A field at the top finds a conversation by name.
 */
const meta: Meta = { title: 'Patterns/Channel list' }
export default meta

/** The list as a team chat holds it: a column of its own width at the full height of the window. */
function Frame({ children }: { children: ReactNode }) {
    return (
        <Row gap="none" align="stretch" className="h-svh bg-background">
            {children}
        </Row>
    )
}

const COLUMN = 'w-64 border-r border-border-strong'

const CHANNELS: ChannelEntry[] = [
    { id: 'harbor-ops', label: 'harbor-ops', kind: 'channel' },
    { id: 'juniper-launch', label: 'juniper-launch', kind: 'channel', unread: true },
    { id: 'deploys', label: 'deploys', kind: 'channel', unread: true, muted: true },
    { id: 'on-call', label: 'on-call', kind: 'private', unread: true, mentions: 2 },
    { id: 'random', label: 'random', kind: 'channel' },
]

const DIRECT: ChannelEntry[] = [
    {
        id: 'dm-ada',
        label: 'ada (you)',
        kind: 'direct',
        person: { name: 'ada', color: 'blue', image: pictureOf('ada') },
        presence: 'active',
    },
    {
        id: 'dm-grace',
        label: 'grace',
        kind: 'direct',
        person: { color: 'violet', image: pictureOf('grace') },
        presence: 'active',
        unread: true,
        mentions: 1,
    },
    {
        id: 'dm-linus',
        label: 'linus',
        kind: 'direct',
        person: { color: 'green', image: pictureOf('linus') },
        presence: 'away',
        unread: true,
    },
    { id: 'dm-margaret', label: 'margaret', kind: 'direct', person: { color: 'pink' }, presence: 'offline' },
]

const PROJECTS: ChannelEntry[] = [
    { id: 'larkspur', label: 'larkspur', kind: 'channel', unread: true, mentions: 4 },
    { id: 'larkspur-design', label: 'larkspur-design', kind: 'private' },
    { id: 'juniper-qa', label: 'juniper-qa', kind: 'channel' },
]

const STARRED: ChannelEntry[] = [
    { id: 'star-harbor', label: 'harbor', kind: 'channel', unread: true },
    { id: 'star-margaret', label: 'margaret', kind: 'direct', person: { color: 'pink' }, presence: 'offline' },
]

const SECTIONS: ChannelSection[] = [
    { id: 'starred', title: 'Starred', icon: <Star aria-hidden />, entries: STARRED },
    { id: 'projects', title: 'Projects', icon: <FolderKanban aria-hidden />, entries: PROJECTS, onAdd: () => undefined },
    { id: 'channels', title: 'Channels', icon: <Hash aria-hidden />, entries: CHANNELS, onAdd: () => undefined },
    { id: 'direct', title: 'Direct messages', icon: <MessagesSquare aria-hidden />, entries: DIRECT, onAdd: () => undefined },
]

const PLACES: ChannelPlace[] = [
    { id: 'threads', label: 'Threads', icon: <MessagesSquare aria-hidden />, count: 2 },
    { id: 'saved', label: 'Saved', icon: <Bookmark aria-hidden /> },
    { id: 'drafts', label: 'Drafts and sent', icon: <SendHorizontal aria-hidden /> },
]

const NEW_MESSAGE = (
    <IconButton label="New message" size="icon">
        <PenSquare aria-hidden />
    </IconButton>
)

/** The full sidebar, its open conversation followed as it is pressed. */
function Whole({ start = 'harbor-ops', query = '', folded }: { start?: string; query?: string; folded?: string[] }) {
    const [active, setActive] = useState(start)
    const [find, setFind] = useState(query)
    return (
        <ChannelList
            className={COLUMN}
            title="Tidevann"
            actions={NEW_MESSAGE}
            find
            query={find}
            onQueryChange={setFind}
            defaultFolded={folded}
            places={PLACES}
            sections={SECTIONS}
            active={active}
            onSelect={setActive}
        />
    )
}

/** Channels alone: one private behind a lock with two mentions, two unread in the foreground weight, a muted one faint, and harbor-ops open on a wash. */
export const Channels: StoryObj = {
    render: () => (
        <Frame>
            <ChannelList
                className={COLUMN}
                sections={[{ id: 'channels', title: 'Channels', icon: <Hash aria-hidden />, entries: CHANNELS }]}
                active="harbor-ops"
            />
        </Frame>
    ),
}

/**
 * Channels in the reader's own order: a channel's row drags to a new place, the rest moving aside,
 * a finger holding it a moment first, and Alt (Option) with the up and down arrows moves the focused
 * one, the focus following it.
 */
export const Ordered: StoryObj = {
    name: 'Own order',
    render: function Render() {
        const [channels, setChannels] = useState(CHANNELS)
        return (
            <Frame>
                <ChannelList
                    className={COLUMN}
                    sections={[
                        {
                            id: 'channels',
                            title: 'Channels',
                            icon: <Hash aria-hidden />,
                            entries: channels,
                            onMove: (from, to) => setChannels(moveItem(channels, from, to)),
                        },
                    ]}
                    active="harbor-ops"
                />
            </Frame>
        )
    },
}

/** Direct messages: each person a small round avatar with a dot outside the letter, active, away or offline, and grace's conversation open. */
export const DirectMessages: StoryObj = {
    name: 'Direct messages',
    render: () => (
        <Frame>
            <ChannelList
                className={COLUMN}
                sections={[{ id: 'direct', title: 'Direct messages', icon: <MessagesSquare aria-hidden />, entries: DIRECT }]}
                active="dm-grace"
            />
        </Frame>
    ),
}

/** Channels folded: only the open conversation and the one that names you stay in view, and the direct messages below stay open. */
export const Folded: StoryObj = {
    render: () => (
        <Frame>
            <ChannelList
                className={COLUMN}
                defaultFolded={['channels']}
                sections={[
                    { id: 'channels', title: 'Channels', icon: <Hash aria-hidden />, entries: CHANNELS },
                    { id: 'direct', title: 'Direct messages', icon: <MessagesSquare aria-hidden />, entries: DIRECT },
                ]}
                active="harbor-ops"
            />
        </Frame>
    ),
}

/** The whole sidebar: the workspace's head, the find field, threads and saved above the sections, then starred, a group of the person's own, channels and direct messages. */
export const Sidebar: StoryObj = {
    render: () => (
        <Frame>
            <Whole />
        </Frame>
    ),
}

/** The sidebar with Projects folded: larkspur stays in view for its four mentions. */
export const FoldedSidebar: StoryObj = {
    name: 'Folded sidebar',
    render: () => (
        <Frame>
            <Whole folded={['projects']} />
        </Frame>
    ),
}

/** The navigation half of a team chat: the labeled strip on the far left with counts, and the sidebar beside it. */
export const WithStrip: StoryObj = {
    name: 'With strip',
    render: () => (
        <Frame>
            <Rail
                variant="strip"
                mark={<TidevannMark className="size-5" />}
                name="Tidevann"
                groups={[
                    {
                        id: 'places',
                        entries: [
                            { id: 'home', label: 'Home', icon: House, href: '#', active: true },
                            { id: 'dms', label: 'DMs', icon: MessagesSquare, href: '#', count: 1 },
                            { id: 'activity', label: 'Activity', icon: Bell, href: '#', count: 7 },
                            { id: 'files', label: 'Files', icon: Files, href: '#', unread: true },
                            { id: 'more', label: 'More', icon: Ellipsis, href: '#' },
                        ],
                    },
                ]}
                foot={
                    <>
                        <IconButton label="Create" variant="secondary" size="icon-lg">
                            <Plus aria-hidden />
                        </IconButton>
                        <IconButton label="Account" size="icon-lg">
                            <PersonAvatar name="ada" color="blue" image={pictureOf('ada')} size="lg" shape="square" presence="active" />
                        </IconButton>
                    </>
                }
            />
            <Whole />
        </Frame>
    ),
}

/** The find field holding "lar": every section narrowed to what matches, the folded one included. */
export const Finding: StoryObj = {
    render: () => (
        <Frame>
            <Whole query="lar" folded={['projects']} />
        </Frame>
    ),
}

/** The find field holding a name nothing has: the list says so. */
export const NoMatch: StoryObj = {
    name: 'No match',
    render: () => (
        <Frame>
            <Whole query="lighthouse" />
        </Frame>
    ),
}
