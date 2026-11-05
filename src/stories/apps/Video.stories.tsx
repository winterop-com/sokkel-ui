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
    Pin,
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

import { AccountMenu } from '../../components/AccountMenu'
import { MediaCard, MediaGrid } from '../../components/media/MediaCard'
import { formatTime } from '../../components/media/time'
import { VideoPlayer } from '../../components/media/VideoPlayer'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Rail, type RailGroup } from '../../components/Rail'
import { Page, Shell } from '../../components/Shell'
import { TopBar, type Crumb } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { ButtonGroup } from '../../components/ui/button-group'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { TooltipProvider } from '../../components/ui/tooltip'
import type { KindColor } from '../../lib/kind'
import { Artwork, type Cover } from '../fixtures/Artwork'
import { TidevannMark } from '../fixtures/TidevannMark'
import captions from '../media/fixtures/captions.vtt?url'
import clip from '../media/fixtures/clip.webm?url'

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

interface Comment {
    id: string
    by: Channel
    ago: string
    text: string
    likes: string
    pinned?: boolean
    replies?: Comment[]
}

const COMMENTS: Comment[] = [
    {
        id: 'c1',
        by: 'grace',
        ago: '3 weeks ago',
        text: 'Filmed over four mornings from the same headland. The boats in the last minute are the ones that come back first in the next video.',
        likes: '1.2k',
        pinned: true,
    },
    {
        id: 'c2',
        by: 'ada',
        ago: '2 weeks ago',
        text: 'The moment the light reaches the breakwater at 4:12 is worth the whole thing.',
        likes: '348',
        replies: [
            { id: 'c2r1', by: 'grace', ago: '2 weeks ago', text: 'That was the only clear morning of the four.', likes: '96' },
            { id: 'c2r2', by: 'linus', ago: '1 week ago', text: 'Went back to it three times.', likes: '12' },
        ],
    },
    {
        id: 'c3',
        by: 'margaret',
        ago: '10 days ago',
        text: 'Which harbor is this? It looks like the one on the far side of the bay, but the breakwater is longer than I remember.',
        likes: '57',
    },
    { id: 'c4', by: 'linus', ago: '4 days ago', text: 'Quiet, slow and exactly right for an early start.', likes: '21' },
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
    return (
        <div className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1">
            {TOPICS.map((name) => (
                <Button
                    key={name}
                    size="sm"
                    variant={topic === name ? 'default' : 'secondary'}
                    aria-pressed={topic === name}
                    onClick={() => setTopic(name)}
                >
                    {name}
                </Button>
            ))}
        </div>
    )
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
            <div className="flex flex-col gap-5">
                <Topics />
                <MediaGrid shape="wide" label="Videos">
                    {VIDEOS.map((video) => (
                        <MediaCard
                            key={video.id}
                            shape="wide"
                            title={video.title}
                            subtitle={`${video.channel} · ${video.views} · ${video.ago}`}
                            cover={<Artwork cover={video.cover} wide />}
                            badge={formatTime(video.length)}
                            progress={video.watched}
                            href="#"
                            menu={videoMenu}
                        />
                    ))}
                </MediaGrid>
            </div>
        </Page>
    )
}

/** One comment: who and when, what they said, its likes, and a reply button; replies fold under it. */
function CommentItem({ comment, reply = false }: { comment: Comment; reply?: boolean }) {
    const [open, setOpen] = useState(false)
    const channel = CHANNELS[comment.by]
    return (
        <li className="flex gap-3">
            <PersonAvatar name={comment.by} color={channel.color} size={reply ? 'sm' : 'md'} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                {comment.pinned === true && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Pin className="size-3" aria-hidden />
                        Pinned by {WATCHING.channel}
                    </span>
                )}
                <p className="text-xs">
                    <span className="font-medium">{comment.by}</span>
                    {comment.by === WATCHING.channel && (
                        <span className="ml-1.5 rounded-mini bg-muted px-1 text-muted-foreground">creator</span>
                    )}
                    <span className="ml-1.5 text-muted-foreground">{comment.ago}</span>
                </p>
                <p className="text-sm leading-relaxed">{comment.text}</p>
                <div className="-ml-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Button variant="ghost" size="xs" aria-label="Like">
                        <ThumbsUp aria-hidden />
                        {comment.likes}
                    </Button>
                    <Button variant="ghost" size="icon-xs" aria-label="Dislike">
                        <ThumbsDown aria-hidden />
                    </Button>
                    <Button variant="ghost" size="xs">
                        Reply
                    </Button>
                </div>
                {comment.replies !== undefined && (
                    <>
                        <Button
                            variant="ghost"
                            size="xs"
                            className="-ml-2 self-start text-primary-ink"
                            aria-expanded={open}
                            onClick={() => setOpen(!open)}
                        >
                            {open ? 'Hide replies' : `${String(comment.replies.length)} replies`}
                        </Button>
                        {open && (
                            <ul className="mt-2 flex flex-col gap-4">
                                {comment.replies.map((one) => (
                                    <CommentItem key={one.id} comment={one} reply />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" aria-label="Comment actions" className="text-muted-foreground" />}
                >
                    <MoreHorizontal aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem>
                        <Flag aria-hidden />
                        Report
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    )
}

function Comments() {
    const [order, setOrder] = useState('top')
    const [draft, setDraft] = useState('')
    return (
        <section className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
                <h2 className="text-title font-semibold">1,204 comments</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                        <SlidersHorizontal aria-hidden />
                        Sort by
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuRadioGroup value={order} onValueChange={(value: string) => setOrder(value)}>
                            <DropdownMenuRadioItem value="top">Top comments</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="new">Newest first</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex gap-3">
                <PersonAvatar name="ada" color={CHANNELS.ada.color} size="md" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Add a comment"
                        aria-label="Add a comment"
                    />
                    {draft !== '' && (
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setDraft('')}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={() => setDraft('')}>
                                Comment
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <ul className="flex flex-col gap-6">
                {COMMENTS.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                ))}
            </ul>
        </section>
    )
}

function WatchPage() {
    const [more, setMore] = useState(false)
    const [following, setFollowing] = useState(false)
    const channel = CHANNELS[WATCHING.channel]
    return (
        <Page>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <VideoPlayer
                        src={`${clip}#t=24`}
                        preload="auto"
                        defaultControlsVisible
                        tracks={[{ src: captions, label: 'English', lang: 'en', default: true }]}
                    />
                    <h1 className="text-title font-semibold">{WATCHING.title}</h1>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <PersonAvatar name={WATCHING.channel} color={channel.color} size="md" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{WATCHING.channel}</p>
                                <p className="truncate text-xs text-muted-foreground">{channel.followers}</p>
                            </div>
                            <Button size="sm" variant={following ? 'secondary' : 'default'} onClick={() => setFollowing(!following)}>
                                {following ? 'Following' : 'Follow'}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
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
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 rounded-surface bg-muted p-3 text-sm">
                        <p className="font-medium">
                            {WATCHING.views} · {WATCHING.ago}
                        </p>
                        <p className={more ? 'leading-relaxed' : 'line-clamp-2 leading-relaxed'}>
                            Four mornings on one headland of the northern coast, cut into one: the first light on the water, the harbor
                            waking up, and the boats leaving one by one. Filmed from the same spot each day, with nothing added but the
                            sound of the place. The next part follows the boats back in.
                        </p>
                        <button type="button" className="self-start text-sm font-medium" onClick={() => setMore(!more)}>
                            {more ? 'Show less' : 'Show more'}
                        </button>
                    </div>
                    <Comments />
                </div>
                <aside className="flex shrink-0 flex-col gap-3 xl:w-96">
                    <Topics />
                    <div className="flex flex-col gap-3">
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
                                        {video.views} · {video.ago}
                                    </>
                                }
                                cover={<Artwork cover={video.cover} wide />}
                                badge={formatTime(video.length)}
                                progress={video.watched}
                                href="#"
                                menu={videoMenu}
                            />
                        ))}
                    </div>
                </aside>
            </div>
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
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSettings={() => undefined} />}
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
