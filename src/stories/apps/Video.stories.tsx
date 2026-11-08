import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Bookmark,
    Clock,
    Flag,
    History,
    Home,
    ListPlus,
    ListVideo,
    MoreHorizontal,
    Plus,
    Share2,
    SlidersHorizontal,
    ThumbsDown,
    ThumbsUp,
    User,
    Users,
    type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui/media/MediaCard'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { CommentComposer, CommentThread, type ThreadComment } from '@winterop-com/sokkel-ui/CommentThread'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { ShowMore } from '@winterop-com/sokkel-ui/ShowMore'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { ProfileRow } from '@winterop-com/sokkel-ui/ProfileRow'
import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { Toolbar, ToolbarTitle } from '@winterop-com/sokkel-ui/Toolbar'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ButtonGroup } from '@winterop-com/sokkel-ui/primitives/button-group'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { Artwork, type Cover } from '../fixtures/Artwork'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import captions from '../media/fixtures/captions.vtt?url'
import clip from '../media/fixtures/clip.webm?url'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A video site in the library's frame: a home grid of videos under topic chips, and a watch page
 * with the player, the channel and its follow button, likes, sharing and saving, a description
 * that unfolds, comments with a pinned one and replies, and what plays next beside it all. On a
 * narrow window what plays next moves under the video.
 */
const meta: Meta = { title: 'Apps/Video', parameters: { layout: 'fullscreen' } }
export default meta

type Channel = 'ada' | 'grace' | 'linus' | 'margaret'

const CHANNELS: Record<Channel, { color: KindColor; followers: string }> = {
    ada: { color: 'blue', followers: '48.2k followers' },
    grace: { color: 'violet', followers: '312k followers' },
    linus: { color: 'green', followers: '9.6k followers' },
    margaret: { color: 'pink', followers: '127k followers' },
}

interface Video {
    id: string
    title: string
    channel: Channel
    views: string
    ago: string
    length: number
    cover: Cover
    watched?: number
}

const VIDEOS: Video[] = [
    {
        id: 'v1',
        title: 'A morning on the northern coast, from first light to the last boat out',
        channel: 'grace',
        views: '52k views',
        ago: '3 weeks ago',
        length: 1712,
        cover: { motif: 'sun', from: 'amber', to: 'pink' },
    },
    {
        id: 'v2',
        title: 'Crossing the high desert by night train',
        channel: 'linus',
        views: '8.1k views',
        ago: '2 days ago',
        length: 2214,
        cover: { motif: 'peaks', from: 'coral', to: 'violet' },
    },
    {
        id: 'v3',
        title: 'Fjord ferries in winter: six crossings in one day',
        channel: 'grace',
        views: '140k views',
        ago: '1 year ago',
        length: 1458,
        cover: { motif: 'wave', from: 'blue', to: 'teal' },
        watched: 0.6,
    },
    {
        id: 'v4',
        title: 'How a harbor wakes up',
        channel: 'margaret',
        views: '31k views',
        ago: '5 months ago',
        length: 734,
        cover: { motif: 'rings', from: 'teal', to: 'jade' },
    },
    {
        id: 'v5',
        title: 'Salt flats at noon, and why they look like water',
        channel: 'ada',
        views: '4.4k views',
        ago: '6 days ago',
        length: 921,
        cover: { motif: 'bands', from: 'amber', to: 'coral' },
    },
    {
        id: 'v6',
        title: 'The islands of the southern sea, one by one',
        channel: 'margaret',
        views: '1.2M views',
        ago: '3 years ago',
        length: 8580,
        cover: { motif: 'dots', from: 'jade', to: 'blue' },
    },
    {
        id: 'v7',
        title: 'Lighthouses of the western cape',
        channel: 'ada',
        views: '19k views',
        ago: '2 months ago',
        length: 1264,
        cover: { motif: 'sun', from: 'blue', to: 'violet' },
        watched: 1,
    },
    {
        id: 'v8',
        title: 'Walking the river delta at low tide',
        channel: 'linus',
        views: '2.7k views',
        ago: '4 weeks ago',
        length: 2593,
        cover: { motif: 'wave', from: 'green', to: 'teal' },
    },
    {
        id: 'v9',
        title: 'A mountain pass before the snow closes it',
        channel: 'grace',
        views: '88k views',
        ago: '8 months ago',
        length: 1840,
        cover: { motif: 'peaks', from: 'violet', to: 'blue' },
    },
    {
        id: 'v10',
        title: 'Fishing villages of the eastern shore',
        channel: 'margaret',
        views: '64k views',
        ago: '1 year ago',
        length: 1395,
        cover: { motif: 'bands', from: 'blue', to: 'jade' },
    },
    {
        id: 'v11',
        title: 'Cliffs and caves you can only reach by kayak',
        channel: 'ada',
        views: '11k views',
        ago: '3 weeks ago',
        length: 1076,
        cover: { motif: 'rings', from: 'pink', to: 'amber' },
    },
    {
        id: 'v12',
        title: 'The longest tram line on the continent',
        channel: 'linus',
        views: '506k views',
        ago: '2 years ago',
        length: 3720,
        cover: { motif: 'dots', from: 'coral', to: 'pink' },
    },
]

const WATCHING = VIDEOS[0]
const NEXT = VIDEOS.slice(1)

const TOPICS = ['All', 'From grace', 'Coasts', 'Trains', 'Islands', 'Recently uploaded', 'Watched']

/** The moment the story is drawn at, so the comments' ages never depend on the clock. */
const NOW = new Date('2026-11-04T14:02:00Z')
const DAY = 24 * 60 * 60 * 1000

interface Comment {
    id: string
    by: Channel
    /** How many days before the story's fixed now it was written. */
    days: number
    text: string
    likes: string
    pinned?: boolean
    replies?: Comment[]
}

const COMMENTS: Comment[] = [
    {
        id: 'c1',
        by: 'grace',
        days: 21,
        text: 'Filmed over four mornings from the same headland. The boats in the last minute are the ones that come back first in the next video.',
        likes: '1.2k',
        pinned: true,
    },
    {
        id: 'c2',
        by: 'ada',
        days: 14,
        text: 'The moment the light reaches the breakwater at 4:12 is worth the whole thing.',
        likes: '348',
        replies: [
            { id: 'c2r1', by: 'grace', days: 14, text: 'That was the only clear morning of the four.', likes: '96' },
            { id: 'c2r2', by: 'linus', days: 8, text: 'Went back to it three times.', likes: '12' },
        ],
    },
    {
        id: 'c3',
        by: 'margaret',
        days: 10,
        text: 'Which harbor is this? It looks like the one on the far side of the bay, but the breakwater is longer than I remember.',
        likes: '57',
    },
    { id: 'c4', by: 'linus', days: 4, text: 'Quiet, slow and exactly right for an early start.', likes: '21' },
]

function groups(view: 'home' | 'watch'): RailGroup[] {
    const entry = (id: string, label: string, icon: LucideIcon, active = false) => ({ id, label, icon, href: '#', active })
    return [
        {
            id: 'browse',
            entries: [
                entry('home', 'Home', Home, view === 'home'),
                entry('following', 'Following', Users),
                entry('history', 'History', History),
            ],
        },
        {
            id: 'library',
            title: 'Library',
            entries: [entry('later', 'Watch later', Clock), entry('liked', 'Liked', ThumbsUp), entry('playlists', 'Playlists', ListVideo)],
        },
        {
            id: 'channels',
            title: 'Following',
            entries: (Object.keys(CHANNELS) as Channel[]).map((name) => entry(name, name, User)),
        },
    ]
}

const TRAILS: Record<'home' | 'watch', Crumb[]> = {
    home: [{ label: 'Home' }],
    watch: [{ label: 'Home', href: '#' }, { label: WATCHING.channel, href: '#' }, { label: WATCHING.title }],
}

/** The topic chips over the videos: one chosen, the row scrolling sideways when it runs out of room. */
function Topics() {
    const [topic, setTopic] = useState('All')
    return <ChipBar label="Topics" chips={TOPICS.map((name) => ({ value: name, label: name }))} value={topic} onValueChange={setTopic} />
}

const videoMenu = (
    <>
        <DropdownMenuItem>
            <Clock aria-hidden />
            Watch later
        </DropdownMenuItem>
        <DropdownMenuItem>
            <ListPlus aria-hidden />
            Add to playlist
        </DropdownMenuItem>
        <DropdownMenuItem>
            <Share2 aria-hidden />
            Share
        </DropdownMenuItem>
    </>
)

function HomePage() {
    return (
        <Page>
            <Stack gap="lg">
                <Topics />
                <MediaGrid shape="wide" label="Videos">
                    {VIDEOS.map((video) => (
                        <MediaCard
                            key={video.id}
                            shape="wide"
                            title={video.title}
                            subtitle={<MetaLine inline items={[video.channel, video.views, video.ago]} />}
                            cover={<Artwork cover={video.cover} wide />}
                            badge={formatTime(video.length)}
                            progress={video.watched}
                            href="#"
                            menu={videoMenu}
                        />
                    ))}
                </MediaGrid>
            </Stack>
        </Page>
    )
}

const ORDERS = [
    { value: 'top', label: 'Top comments' },
    { value: 'new', label: 'Newest first' },
]

/** A comment from the fixtures as the thread draws it: the channel's color and picture, the creator marked. */
function threadComment(comment: Comment): ThreadComment {
    return {
        id: comment.id,
        author: comment.by,
        color: CHANNELS[comment.by].color,
        image: pictureOf(comment.by),
        time: <RelativeTime date={new Date(NOW.getTime() - comment.days * DAY)} now={NOW} timeZone="UTC" />,
        body: comment.text,
        likes: comment.likes,
        pinned: comment.pinned,
        creator: comment.by === WATCHING.channel,
        replies: comment.replies?.map(threadComment),
    }
}

/** Turns a comment's like or dislike on or off, wherever in the thread it is. */
function toggle(list: readonly ThreadComment[], id: string, field: 'liked' | 'disliked'): ThreadComment[] {
    return list.map((one) =>
        one.id === id ? { ...one, [field]: one[field] !== true } : { ...one, replies: one.replies && toggle(one.replies, id, field) },
    )
}

const ME = { name: 'ada', color: CHANNELS.ada.color, image: pictureOf('ada') }

function Comments() {
    const [order, setOrder] = useState('top')
    const [comments, setComments] = useState(() => COMMENTS.map(threadComment))
    return (
        <Stack as="section" gap="lg">
            <Toolbar
                end={
                    <Select items={ORDERS} value={order} onValueChange={(value) => setOrder(value ?? 'top')}>
                        <SelectTrigger variant="quiet" size="sm" aria-label="Sort by">
                            <SlidersHorizontal aria-hidden />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            {ORDERS.map((entry) => (
                                <SelectItem key={entry.value} value={entry.value}>
                                    {entry.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
            >
                <ToolbarTitle>1,204 comments</ToolbarTitle>
            </Toolbar>
            <CommentComposer author={ME.name} color={ME.color} image={ME.image} />
            <CommentThread
                comments={comments}
                viewer={ME}
                pinnedBy={WATCHING.channel}
                onLike={(comment) => setComments((list) => toggle(list, comment.id, 'liked'))}
                onDislike={(comment) => setComments((list) => toggle(list, comment.id, 'disliked'))}
                onReply={() => undefined}
                menu={() => (
                    <DropdownMenuItem>
                        <Flag aria-hidden />
                        Report
                    </DropdownMenuItem>
                )}
            />
        </Stack>
    )
}

function WatchPage() {
    const [following, setFollowing] = useState(false)
    const channel = CHANNELS[WATCHING.channel]
    return (
        <Page>
            <Row gap="xl" align="start" stackBelow="xl">
                <Stack gap="lg" className="flex-1">
                    <VideoPlayer
                        src={`${clip}#t=24`}
                        preload="auto"
                        defaultControlsVisible
                        tracks={[{ src: captions, label: 'English', lang: 'en', default: true }]}
                    />
                    <h1 className="text-title font-semibold">{WATCHING.title}</h1>
                    <ProfileRow
                        name={WATCHING.channel}
                        detail={channel.followers}
                        image={pictureOf(WATCHING.channel)}
                        color={channel.color}
                        action={
                            <Button size="sm" variant={following ? 'secondary' : 'default'} onClick={() => setFollowing(!following)}>
                                {following ? 'Following' : 'Follow'}
                            </Button>
                        }
                        actions={
                            <>
                                <ButtonGroup>
                                    <Button variant="outline" size="sm" aria-label="Like">
                                        <ThumbsUp aria-hidden />
                                        4.1k
                                    </Button>
                                    <Button variant="outline" size="sm" aria-label="Dislike">
                                        <ThumbsDown aria-hidden />
                                    </Button>
                                </ButtonGroup>
                                <Button variant="outline" size="sm">
                                    <Share2 aria-hidden />
                                    Share
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Bookmark aria-hidden />
                                    Save
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="More" />}>
                                        <MoreHorizontal aria-hidden />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem>
                                            <ListPlus aria-hidden />
                                            Add to playlist
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Flag aria-hidden />
                                            Report
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        }
                    />
                    <ShowMore variant="well" head={<MetaLine size="sm" tone="strong" items={[WATCHING.views, WATCHING.ago]} />}>
                        Four mornings on one headland of the northern coast, cut into one: the first light on the water, the harbor waking
                        up, and the boats leaving one by one. Filmed from the same spot each day, with nothing added but the sound of the
                        place. The next part follows the boats back in.
                    </ShowMore>
                    <Comments />
                </Stack>
                <Stack as="aside" className="shrink-0 xl:w-96">
                    <Topics />
                    <Stack>
                        {NEXT.map((video) => (
                            <MediaCard
                                key={video.id}
                                layout="row"
                                shape="wide"
                                title={video.title}
                                subtitle={
                                    <>
                                        {video.channel}
                                        <br />
                                        <MetaLine inline items={[video.views, video.ago]} />
                                    </>
                                }
                                cover={<Artwork cover={video.cover} wide />}
                                badge={formatTime(video.length)}
                                progress={video.watched}
                                href="#"
                                menu={videoMenu}
                            />
                        ))}
                    </Stack>
                </Stack>
            </Row>
        </Page>
    )
}

function VideoApp({ view }: { view: 'home' | 'watch' }) {
    const [collapsed, setCollapsed] = useState(view === 'watch')
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(view)}
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
                        trail={TRAILS[view]}
                        onSearch={() => undefined}
                        actions={
                            <Button size="sm" variant="outline">
                                <Plus aria-hidden />
                                Upload
                            </Button>
                        }
                    />
                }
            >
                {view === 'home' ? <HomePage /> : <WatchPage />}
            </Shell>
        </TooltipProvider>
    )
}

/** The videos of the channels followed, under topic chips, in a grid that fills the width. */
export const HomeGrid: StoryObj = { name: 'Home', render: () => <VideoApp view="home" /> }

/** One video playing, with its channel, actions, description and comments, and what plays next beside it. */
export const Watch: StoryObj = { name: 'Watch', render: () => <VideoApp view="watch" /> }
