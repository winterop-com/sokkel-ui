import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Bookmark,
    Clock,
    Flag,
    History,
    Home,
    ListPlus,
    ListVideo,
    RectangleHorizontal,
    Play,
    Plus,
    Share2,
    SlidersHorizontal,
    ThumbsUp,
    User,
    Users,
    type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { DragData } from '@winterop-com/sokkel-ui/DragDrop'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { RailDrops } from '@winterop-com/sokkel-ui/RailDrops'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'
import { ReorderableTrackList, type Track } from '@winterop-com/sokkel-ui-media/ReorderableTrackList'
import { ChannelRow } from '@winterop-com/sokkel-ui-media/ChannelRow'
import { MediaActions, type MediaRating } from '@winterop-com/sokkel-ui-media/MediaActions'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { WatchLayout } from '@winterop-com/sokkel-ui-media/WatchLayout'
import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { CommentComposer, CommentThread, type ThreadComment } from '@winterop-com/sokkel-ui/CommentThread'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { ShowMore } from '@winterop-com/sokkel-ui/ShowMore'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { Toolbar, ToolbarTitle } from '@winterop-com/sokkel-ui/Toolbar'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import captions from '../media/fixtures/captions.vtt?url'
import clip from '../media/fixtures/clip.webm?url'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A video site in the library's frame: a home grid of videos under topic chips, and a watch page
 * with the player, the channel and its follow button, likes, sharing and saving, a description
 * that unfolds, comments with a pinned one and replies, and what plays next beside it all. On a
 * narrow window what plays next moves under the video. Watch later is put in order by drag, and a
 * video dragged onto a playlist in the rail is added there.
 */
const meta: Meta = {
    title: 'Apps/Video',
    parameters: { layout: 'fullscreen' },
}
export default meta

type Channel = 'ada' | 'grace' | 'linus' | 'margaret'

type View = 'home' | 'watch' | 'later'

const CHANNELS: Record<Channel, { color: KindColor; followers: number }> = {
    ada: { color: 'blue', followers: 48_200 },
    grace: { color: 'violet', followers: 312_000 },
    linus: { color: 'green', followers: 9_600 },
    margaret: { color: 'pink', followers: 127_000 },
}

interface Video {
    id: string
    title: string
    channel: Channel
    views: string
    ago: string
    length: number
    cover: ArtworkCover
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
            {
                id: 'c2r1',
                by: 'grace',
                days: 14,
                text: 'That was the only clear morning of the four.',
                likes: '96',
            },
            {
                id: 'c2r2',
                by: 'linus',
                days: 8,
                text: 'Went back to it three times.',
                likes: '12',
            },
        ],
    },
    {
        id: 'c3',
        by: 'margaret',
        days: 10,
        text: 'Which harbor is this? It looks like the one on the far side of the bay, but the breakwater is longer than I remember.',
        likes: '57',
    },
    {
        id: 'c4',
        by: 'linus',
        days: 4,
        text: 'Quiet, slow and exactly right for an early start.',
        likes: '21',
    },
]

/** What a video's drag is, taken by Watch later and the playlists in the rail. */
const VIDEO = 'video'

/** The lists in the rail that take videos, by id. */
const LISTS: { id: string; label: string }[] = [
    { id: 'later', label: 'Watch later' },
    { id: 'coasts', label: 'Coasts' },
    { id: 'trains', label: 'Night trains' },
]

/** A video as a row of a list: its wide cover, its channel and views, and its length. */
const rowOf = (video: Video): Track => ({
    id: video.id,
    title: video.title,
    subtitle: <MetaLine inline items={[video.channel, video.views]} />,
    artwork: <Artwork cover={video.cover} wide />,
    duration: video.length,
})

const byId = (...ids: string[]) => ids.map((id) => rowOf(VIDEOS.find((video) => video.id === id) ?? VIDEOS[0]))

/** What each list holds as the story opens. */
const LIST_VIDEOS: Record<string, Track[]> = {
    later: byId('v2', 'v5', 'v8', 'v11', 'v4', 'v9'),
    coasts: byId('v1', 'v3'),
    trains: byId('v12'),
}

/** The lists and what is dropped on them: a video let go on a list in the rail joins its end, once. */
function useLists() {
    const [lists, setLists] = useState(LIST_VIDEOS)
    const add = (list: string, drag: DragData) => {
        const video = drag.value as Track
        const name = LISTS.find((each) => each.id === list)?.label ?? list
        if (lists[list].some((each) => each.id === video.id)) {
            toast(`Already in ${name}`)
            return
        }
        setLists({ ...lists, [list]: [...lists[list], video] })
        toast(`Added to ${name}`)
    }
    const move = (list: string, from: number, to: number) => setLists({ ...lists, [list]: moveItem(lists[list], from, to) })
    return { lists, add, move }
}

type Lists = ReturnType<typeof useLists>

function groups(view: View, lists: Lists): RailGroup[] {
    const entry = (id: string, label: string, icon: LucideIcon, active = false) => ({ id, label, icon, href: '#', active })
    const list = (id: string, label: string, icon: LucideIcon) => ({
        ...entry(id, label, icon, view === id),
        count: lists.lists[id].length,
        drop: {
            accepts: (drag: DragData) => drag.kind === VIDEO,
            onDrop: (drag: DragData) => lists.add(id, drag),
        },
    })
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
            entries: [list('later', 'Watch later', Clock), entry('liked', 'Liked', ThumbsUp)],
        },
        {
            id: 'playlists',
            title: 'Playlists',
            entries: LISTS.slice(1).map((each) => list(each.id, each.label, ListVideo)),
        },
        {
            id: 'channels',
            title: 'Following',
            entries: (Object.keys(CHANNELS) as Channel[]).map((name) => entry(name, name, User)),
        },
    ]
}

const TRAILS: Record<View, Crumb[]> = {
    home: [{ label: 'Home' }],
    watch: [{ label: 'Home', href: '#' }, { label: WATCHING.channel, href: '#' }, { label: WATCHING.title }],
    later: [{ label: 'Watch later' }],
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
    const [rating, setRating] = useState<MediaRating>(null)
    const [saved, setSaved] = useState(false)
    const [theater, setTheater] = useState(false)
    const channel = CHANNELS[WATCHING.channel]
    return (
        <Page>
            <WatchLayout
                theater={theater}
                player={
                    <VideoPlayer
                        src={`${clip}#t=24`}
                        preload="auto"
                        defaultControlsVisible
                        tracks={[{ src: captions, label: 'English', lang: 'en', default: true }]}
                        actions={
                            <TransportButton
                                tone="overlay"
                                size="md"
                                label="Theater mode"
                                pressed={theater}
                                onClick={() => setTheater(!theater)}
                            >
                                <RectangleHorizontal aria-hidden />
                            </TransportButton>
                        }
                    />
                }
                aside={
                    <Stack>
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
                }
            >
                <Stack gap="lg">
                    <h1 className="text-title font-semibold">{WATCHING.title}</h1>
                    <ChannelRow
                        name={WATCHING.channel}
                        href="#"
                        followers={channel.followers + (following ? 1 : 0)}
                        image={pictureOf(WATCHING.channel)}
                        color={channel.color}
                        following={following}
                        onFollowingChange={setFollowing}
                        actions={
                            <MediaActions
                                rating={rating}
                                likes={4_100 + (rating === 'like' ? 1 : 0)}
                                onRatingChange={setRating}
                                actions={[
                                    {
                                        id: 'share',
                                        label: 'Share',
                                        icon: <Share2 aria-hidden />,
                                        onSelect: () => undefined,
                                    },
                                    {
                                        id: 'save',
                                        label: saved ? 'Saved' : 'Save',
                                        icon: <Bookmark className={saved ? 'fill-current' : undefined} aria-hidden />,
                                        pressed: saved,
                                        onSelect: () => setSaved(!saved),
                                    },
                                    {
                                        id: 'playlist',
                                        label: 'Add to playlist',
                                        icon: <ListPlus aria-hidden />,
                                        onSelect: () => undefined,
                                    },
                                ]}
                                menu={
                                    <DropdownMenuItem>
                                        <Flag aria-hidden />
                                        Report
                                    </DropdownMenuItem>
                                }
                            />
                        }
                    />
                    <ShowMore variant="well" head={<MetaLine size="sm" tone="strong" items={[WATCHING.views, WATCHING.ago]} />}>
                        Four mornings on one headland of the northern coast, cut into one: the first light on the water, the harbor waking
                        up, and the boats leaving one by one. Filmed from the same spot each day, with nothing added but the sound of the
                        place. The next part follows the boats back in.
                    </ShowMore>
                    <Comments />
                </Stack>
            </WatchLayout>
        </Page>
    )
}

/** Watch later in the viewer's own order: each row dragged by its grip, or moved by the arrows once the grip is focused. */
function LaterPage({ lists }: { lists: Lists }) {
    const videos = lists.lists.later
    const total = videos.reduce((sum, video) => sum + (video.duration ?? 0), 0)
    return (
        <Page>
            <PageHeader
                title="Watch later"
                count={`${String(videos.length)} videos, ${formatTime(total)}`}
                actions={
                    <Button size="sm">
                        <Play className="fill-current" aria-hidden />
                        Play all
                    </Button>
                }
            />
            <ReorderableTrackList
                kind={VIDEO}
                tracks={videos}
                artwork="wide"
                onMove={(from, to) => lists.move('later', from, to)}
                onPlay={() => undefined}
            />
        </Page>
    )
}

function VideoApp({ view }: { view: View }) {
    const [collapsed, setCollapsed] = useState(view === 'watch')
    const lists = useLists()
    return (
        <TooltipProvider>
            <RailDrops>
                <Shell
                    rail={
                        <Rail
                            mark={<TidevannMark />}
                            name="Tidevann"
                            groups={groups(view, lists)}
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
                    {view === 'home' && <HomePage />}
                    {view === 'watch' && <WatchPage />}
                    {view === 'later' && <LaterPage lists={lists} />}
                </Shell>
            </RailDrops>
            <Toaster />
        </TooltipProvider>
    )
}

/** The videos of the channels followed, under topic chips, in a grid that fills the width. */
export const HomeGrid: StoryObj = {
    name: 'Home',
    render: () => <VideoApp view="home" />,
}

/** One video playing, with its channel, actions, description and comments, and what plays next beside it. */
export const Watch: StoryObj = {
    name: 'Watch',
    render: () => <VideoApp view="watch" />,
}

/**
 * Watch later in the viewer's own order: a row dragged by the grip at its end (a finger holds it a
 * moment first) moves the rest aside to show where it lands, and with the grip focused the arrows
 * move it a place. A row let go on a playlist in the rail is added there, its count going up.
 */
export const WatchLater: StoryObj = {
    name: 'Watch later',
    render: () => <VideoApp view="later" />,
}
