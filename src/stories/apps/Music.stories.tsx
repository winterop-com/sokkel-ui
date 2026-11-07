import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Clapperboard,
    Disc3,
    Download,
    ListEnd,
    ListMusic,
    ListPlus,
    MicVocal,
    MoreHorizontal,
    Music2,
    Play,
    Shuffle,
    Star,
    Tv,
    type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { MediaBar, type RepeatMode } from '@winterop-com/sokkel-ui/media/MediaBar'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui/media/MediaCard'
import { SoundVisualizer } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { TrackList, type Track } from '@winterop-com/sokkel-ui/media/TrackList'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Artwork, type Cover } from '../fixtures/Artwork'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import captions from '../media/fixtures/captions.vtt?url'
import clip from '../media/fixtures/clip.webm?url'
import { waveformOf } from '../media/fixtures/waveform'
import { FRAME } from '../media/fixtures/sound'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'

/**
 * A music and video library player in the library's frame: the rail of library views and
 * playlists, an album grid with drawn covers, an album's tracks with the one playing marked, the
 * queue in the side panel, a film in the video player, and the player bar across the whole
 * window under all of it.
 */
type View = 'library' | 'album' | 'queue' | 'series' | 'video'

interface Release {
    id: string
    title: string
    artist: string
    year: number
    cover: Cover
}

const ALBUMS: Release[] = [
    { id: 'open-water', title: 'Open Water', artist: 'Grace', year: 2025, cover: { motif: 'wave', from: 'blue', to: 'teal' } },
    { id: 'northern-coast', title: 'Northern Coast', artist: 'Ada', year: 2024, cover: { motif: 'sun', from: 'violet', to: 'pink' } },
    { id: 'high-desert', title: 'High Desert', artist: 'Linus', year: 2024, cover: { motif: 'peaks', from: 'amber', to: 'coral' } },
    {
        id: 'glass-harbor',
        title: 'Glass Harbor',
        artist: 'Harbor Quartet',
        year: 2023,
        cover: { motif: 'rings', from: 'teal', to: 'green' },
    },
    { id: 'slow-current', title: 'Slow Current', artist: 'Margaret', year: 2023, cover: { motif: 'bands', from: 'jade', to: 'blue' } },
    { id: 'archipelago', title: 'Archipelago', artist: 'Juniper Trio', year: 2022, cover: { motif: 'dots', from: 'pink', to: 'amber' } },
    { id: 'lowlands', title: 'Lowlands', artist: 'Ada', year: 2022, cover: { motif: 'bands', from: 'green', to: 'jade' } },
    { id: 'river-delta', title: 'River Delta', artist: 'Grace', year: 2021, cover: { motif: 'sun', from: 'teal', to: 'blue' } },
    { id: 'meridian', title: 'Meridian', artist: 'Larkspur', year: 2021, cover: { motif: 'rings', from: 'coral', to: 'violet' } },
    { id: 'salt-and-cedar', title: 'Salt and Cedar', artist: 'Linus', year: 2020, cover: { motif: 'peaks', from: 'jade', to: 'teal' } },
    { id: 'equinox', title: 'Equinox', artist: 'Margaret', year: 2020, cover: { motif: 'dots', from: 'violet', to: 'blue' } },
    {
        id: 'morning-fjord',
        title: 'Morning Fjord',
        artist: 'Harbor Quartet',
        year: 2019,
        cover: { motif: 'wave', from: 'pink', to: 'violet' },
    },
    { id: 'highland', title: 'Highland', artist: 'Juniper Trio', year: 2019, cover: { motif: 'peaks', from: 'blue', to: 'violet' } },
    { id: 'atoll', title: 'Atoll', artist: 'Grace', year: 2018, cover: { motif: 'rings', from: 'jade', to: 'amber' } },
    { id: 'coastal-plain', title: 'Coastal Plain', artist: 'Ada', year: 2017, cover: { motif: 'wave', from: 'green', to: 'teal' } },
    { id: 'tidewater', title: 'Tidewater', artist: 'Larkspur', year: 2016, cover: { motif: 'sun', from: 'coral', to: 'pink' } },
]

const PLAYING = ALBUMS[0]

const TRACKS: { title: string; duration: number; with?: string }[] = [
    { title: 'Leaving the Sound', duration: 214 },
    { title: 'Low Tide', duration: 247 },
    { title: 'Breakwater', duration: 198, with: 'Grace and Linus' },
    { title: 'Harbor at Dusk', duration: 312 },
    { title: 'Salt Air', duration: 189 },
    { title: 'Lighthouse Keeper', duration: 276 },
    { title: 'Undertow', duration: 233, with: 'Grace and Margaret' },
    { title: 'Open Water', duration: 341 },
    { title: 'Passage', duration: 205 },
    { title: 'Home Before Dark', duration: 268 },
]

const CURRENT = 3
const POSITION = 83

const ALBUM_TRACKS: Track[] = TRACKS.map((track, index) => ({
    id: `t${String(index + 1)}`,
    number: index + 1,
    title: track.title,
    subtitle: track.with,
    duration: track.duration,
}))

const NEXT_UP: Track[] = TRACKS.slice(CURRENT + 1).map((track, index) => ({
    id: `q${String(index)}`,
    title: track.title,
    subtitle: <MetaLine inline items={[PLAYING.artist, PLAYING.title]} />,
    artwork: <Artwork cover={PLAYING.cover} />,
    duration: track.duration,
}))

const THEN: Track[] = [
    { album: ALBUMS[2], title: 'Dry Heat', duration: 224 },
    { album: ALBUMS[4], title: 'Still Pond', duration: 301 },
    { album: ALBUMS[9], title: 'Cedar Line', duration: 187 },
    { album: ALBUMS[6], title: 'Flat Country', duration: 256 },
].map((entry, index) => ({
    id: `p${String(index)}`,
    title: entry.title,
    subtitle: <MetaLine inline items={[entry.album.artist, entry.album.title]} />,
    artwork: <Artwork cover={entry.album.cover} />,
    duration: entry.duration,
}))

/** The album's tracks that are starred. */
const STARRED = ['t2', 't4', 't8']

const HISTORY: Track[] = TRACKS.slice(0, CURRENT).map((track, index) => ({
    id: `h${String(index)}`,
    title: track.title,
    subtitle: <MetaLine inline items={[PLAYING.artist, PLAYING.title]} />,
    artwork: <Artwork cover={PLAYING.cover} />,
    duration: track.duration,
}))

const FILM = { title: 'The First Light', series: 'Coastline', by: 'Margaret', year: 2025, length: 96 }

const EPISODES: Track[] = [
    { title: 'The First Light', cover: { motif: 'sun', from: 'amber', to: 'pink' }, duration: 96 },
    { title: 'Fishing Villages', cover: { motif: 'wave', from: 'blue', to: 'jade' }, duration: 1712 },
    { title: 'The Island Ferry', cover: { motif: 'rings', from: 'teal', to: 'blue' }, duration: 1498 },
    { title: 'Cliffs and Caves', cover: { motif: 'peaks', from: 'violet', to: 'blue' }, duration: 1835 },
    { title: 'Evening Tide', cover: { motif: 'bands', from: 'coral', to: 'violet' }, duration: 1650 },
].map((episode, index) => ({
    id: `e${String(index + 1)}`,
    title: episode.title,
    subtitle: `Episode ${String(index + 1)}`,
    artwork: <Artwork cover={episode.cover as Cover} wide />,
    duration: episode.duration,
}))

function groups(view: View): RailGroup[] {
    const entry = (id: string, label: string, icon: LucideIcon, active = false) => ({ id, label, icon, href: '#', active })
    return [
        {
            id: 'library',
            entries: [
                entry('albums', 'Albums', Disc3, view !== 'video' && view !== 'series'),
                entry('artists', 'Artists', MicVocal),
                entry('tracks', 'Tracks', Music2),
                entry('favorites', 'Favorites', Star),
            ],
        },
        {
            id: 'playlists',
            title: 'Playlists',
            entries: [
                entry('morning-run', 'Morning run', ListMusic),
                entry('deep-focus', 'Deep focus', ListMusic),
                entry('long-drive', 'Long drive', ListMusic),
                entry('sunday-slow', 'Sunday slow', ListMusic),
            ],
        },
        {
            id: 'watch',
            title: 'Watch',
            entries: [entry('films', 'Films', Clapperboard), entry('series', 'Series', Tv, view === 'video' || view === 'series')],
        },
    ]
}

const TRAILS: Record<View, Crumb[]> = {
    library: [{ label: 'Albums' }],
    album: [],
    queue: [],
    series: [{ label: 'Series', href: '#' }, { label: FILM.series }],
    video: [{ label: 'Series', href: '#' }, { label: FILM.series, href: '#' }, { label: FILM.title }],
}

function AlbumGrid({ albums }: { albums: Release[] }) {
    return (
        <MediaGrid label="Albums">
            {albums.map((album) => (
                <MediaCard
                    key={album.id}
                    title={album.title}
                    subtitle={<MetaLine inline items={[album.artist, album.year]} />}
                    cover={<Artwork cover={album.cover} />}
                    href="#"
                    playing={album.id === PLAYING.id}
                    onPlay={() => undefined}
                    menu={
                        <>
                            <DropdownMenuItem>Play next</DropdownMenuItem>
                            <DropdownMenuItem>Add to queue</DropdownMenuItem>
                            <DropdownMenuItem>Go to artist</DropdownMenuItem>
                        </>
                    }
                />
            ))}
        </MediaGrid>
    )
}

/** How far each episode of the series was watched. */
const WATCHED: Record<string, number> = { e1: 1, e2: 0.42 }

function SeriesPage() {
    return (
        <Page>
            <PageHeader
                title={FILM.series}
                count={`${String(EPISODES.length)} episodes`}
                description={`A year along a northern coast, from the first light over the water to the last ferry of the evening. By ${FILM.by}, ${String(FILM.year)}.`}
            />
            <MediaGrid shape="wide" label={`${FILM.series}, episodes`}>
                {EPISODES.map((episode) => (
                    <MediaCard
                        key={episode.id}
                        shape="wide"
                        title={String(episode.title)}
                        subtitle={episode.subtitle}
                        cover={episode.artwork}
                        badge={formatTime(episode.duration ?? 0)}
                        progress={WATCHED[episode.id]}
                        href="#"
                        onPlay={() => undefined}
                    />
                ))}
            </MediaGrid>
        </Page>
    )
}

function LibraryPage() {
    const [query, setQuery] = useState('')
    const [order, setOrder] = useState<'recent' | 'name' | 'artist' | 'year'>('recent')
    return (
        <Page>
            <PageHeader title="Albums" count={`${String(ALBUMS.length)} albums`} />
            <Toolbar
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                end={
                    <>
                        <Segmented
                            label="Order"
                            value={order}
                            onChoose={setOrder}
                            options={[
                                { value: 'recent', label: 'Recent' },
                                { value: 'name', label: 'Name' },
                                { value: 'artist', label: 'Artist' },
                                { value: 'year', label: 'Year' },
                            ]}
                        />
                        <Button size="sm" variant="outline">
                            <Shuffle aria-hidden />
                            Shuffle all
                        </Button>
                    </>
                }
            />
            <AlbumGrid albums={ALBUMS} />
        </Page>
    )
}

function AlbumPage() {
    const total = TRACKS.reduce((sum, track) => sum + track.duration, 0)
    const [starred, setStarred] = useState(true)
    const [stars, setStars] = useState<ReadonlySet<string>>(() => new Set(STARRED))
    const star = (id: string, on: boolean) =>
        setStars((now) => {
            const next = new Set(now)
            if (on) next.add(id)
            else next.delete(id)
            return next
        })
    return (
        <Page className="@container">
            <PageHeader
                onBack={() => undefined}
                trail={[
                    { label: 'Music', href: '#' },
                    { label: PLAYING.artist, href: '#' },
                ]}
                title={PLAYING.title}
                meta={
                    <MetaLine
                        size="sm"
                        items={[
                            <span className="font-medium text-foreground">{PLAYING.artist}</span>,
                            PLAYING.year,
                            `${String(TRACKS.length)} tracks, ${String(Math.round(total / 60))} min`,
                        ]}
                    />
                }
                actions={
                    <>
                        <Button size="sm" variant="outline">
                            <Download aria-hidden />
                            Download
                        </Button>
                        <StarButton variant="outline" starred={starred} onStarredChange={setStarred} />
                        <Button size="sm" variant="outline">
                            <ListPlus aria-hidden />
                            Add to playlist
                        </Button>
                    </>
                }
            />
            <Row gap="2xl" align="start" stackBelowRoom="2xl">
                <Row gap="lg" align="end" wrap className="shrink-0 @2xl:sticky @2xl:top-0 @2xl:w-44 @4xl:w-60">
                    <span className="block size-32 shrink-0 overflow-hidden rounded-surface shadow-xs ring-1 ring-border @2xl:aspect-square @2xl:size-auto @2xl:w-full">
                        <Artwork cover={PLAYING.cover} />
                    </span>
                    <Row>
                        <Button size="sm">
                            <Play className="fill-current" aria-hidden />
                            Play
                        </Button>
                        <Button size="sm" variant="outline">
                            <Shuffle aria-hidden />
                            Shuffle
                        </Button>
                    </Row>
                </Row>
                <Stack gap="2xl" className="flex-1">
                    <TrackList
                        tracks={ALBUM_TRACKS}
                        current={`t${String(CURRENT + 1)}`}
                        playing
                        onPlay={() => undefined}
                        actions={(track) => (
                            <>
                                <IconButton label="Add to queue">
                                    <ListEnd aria-hidden />
                                </IconButton>
                                <StarButton starred={stars.has(track.id)} onStarredChange={(on) => star(track.id, on)} />
                            </>
                        )}
                    />
                    <Stack as="section">
                        <h2 className="text-sm font-medium">More by {PLAYING.artist}</h2>
                        <AlbumGrid albums={ALBUMS.filter((album) => album.artist === PLAYING.artist && album.id !== PLAYING.id)} />
                    </Stack>
                </Stack>
            </Row>
        </Page>
    )
}

/** The queue: what is playing, what comes after it, and the playlist it moves on to. */
function QueueBody({ history = false }: { history?: boolean }) {
    if (history) {
        return (
            <PanelSection title="Played this session">
                <TrackList tracks={HISTORY} variant="plain" onPlay={() => undefined} className="-mx-2" />
            </PanelSection>
        )
    }
    const next = NEXT_UP.reduce((sum, track) => sum + track.duration, 0)
    return (
        <>
            <PanelSection title="Now playing">
                <Row gap="md" className="min-w-0">
                    <span className="block size-14 shrink-0 overflow-hidden rounded-mini ring-1 ring-border">
                        <Artwork cover={PLAYING.cover} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{TRACKS[CURRENT].title}</p>
                        <MetaLine truncate items={[PLAYING.artist, PLAYING.title]} />
                        <p className="font-mono text-xs text-faint tabular-nums">
                            {formatTime(POSITION)} of {formatTime(TRACKS[CURRENT].duration)}
                        </p>
                    </div>
                </Row>
            </PanelSection>
            <PanelSection title={`Up next, ${String(NEXT_UP.length)} tracks, ${String(Math.round(next / 60))} min`}>
                <TrackList tracks={NEXT_UP} variant="plain" onPlay={() => undefined} className="-mx-2" />
            </PanelSection>
            <PanelSection title="Then, from Morning run">
                <TrackList tracks={THEN} variant="plain" onPlay={() => undefined} className="-mx-2" />
            </PanelSection>
        </>
    )
}

function Watch() {
    return (
        <Page>
            <Row gap="xl" align="stretch" stackBelow="xl">
                <Stack gap="lg" className="flex-1">
                    <VideoPlayer
                        src={`${clip}#t=24`}
                        preload="auto"
                        defaultControlsVisible
                        tracks={[{ src: captions, label: 'English', lang: 'en', default: true }]}
                    />
                    <Row gap="md" align="start" justify="between" stackBelow="sm">
                        <div className="min-w-0">
                            <h1 className="text-title font-semibold">{FILM.title}</h1>
                            <MetaLine size="sm" items={[`${FILM.series}, episode 1`, FILM.by, FILM.year, formatTime(FILM.length)]} />
                        </div>
                        <Row>
                            <StarButton variant="outline" />
                            <IconButton label="More">
                                <MoreHorizontal aria-hidden />
                            </IconButton>
                        </Row>
                    </Row>
                    <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                        The first hour of a day on a northern coast, filmed from one headland as the light comes up over the water and the
                        boats leave the harbor.
                    </p>
                </Stack>
                <Stack as="aside" gap="sm" className="-mx-2 shrink-0 xl:w-80">
                    <GroupLabel as="h2" className="px-2">
                        {FILM.series}, 5 episodes
                    </GroupLabel>
                    <TrackList tracks={EPISODES} current="e1" variant="plain" artwork="wide" onPlay={() => undefined} />
                </Stack>
            </Row>
        </Page>
    )
}

/** The playing track's loudness, drawn as the large player's scrubber. */
const WAVEFORM = waveformOf(4)

/**
 * The player bar, resizable from its top edge, starting at `size` pixels tall. Made tall, a sound
 * visualizer rises behind the title; here it draws a still frame, as the story plays no audio. V
 * shows and hides it, and a toast says which.
 */
function Player({ queueOpen, size }: { queueOpen: boolean; size?: number }) {
    const [visualizer, setVisualizer] = useState(true)
    // The key handler's own copy of whether it shows, so a press toggles and toasts exactly once.
    const shown = useRef(true)
    useEffect(() => {
        const toggle = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (event.key.toLowerCase() !== 'v' || event.metaKey || event.ctrlKey || event.altKey) return
            if (target !== null && target.closest('input, textarea, select, [contenteditable="true"]') !== null) return
            shown.current = !shown.current
            setVisualizer(shown.current)
            toast(shown.current ? 'Visualizer shown' : 'Visualizer hidden')
        }
        window.addEventListener('keydown', toggle)
        return () => window.removeEventListener('keydown', toggle)
    }, [])
    const [playing, setPlaying] = useState(true)
    const [position, setPosition] = useState(POSITION)
    const [volume, setVolume] = useState(0.7)
    const [muted, setMuted] = useState(false)
    const [shuffle, setShuffle] = useState(false)
    const [repeat, setRepeat] = useState<RepeatMode>('all')
    const track = TRACKS[CURRENT]
    return (
        <MediaBar
            title={track.title}
            artist={PLAYING.artist}
            album={PLAYING.title}
            year={PLAYING.year}
            trackNumber={CURRENT + 1}
            trackCount={TRACKS.length}
            artwork={<Artwork cover={PLAYING.cover} />}
            playing={playing}
            onPlayingChange={setPlaying}
            position={position}
            duration={track.duration}
            onSeek={setPosition}
            buffered={[{ start: 0, end: 180 }]}
            waveform={WAVEFORM}
            visualizer={visualizer ? <SoundVisualizer frame={FRAME} label="What is playing" /> : undefined}
            defaultSize={size}
            volume={volume}
            onVolumeChange={setVolume}
            muted={muted}
            onMutedChange={setMuted}
            onPrevious={() => undefined}
            onNext={() => undefined}
            shuffle={shuffle}
            onShuffleChange={setShuffle}
            repeat={repeat}
            onRepeatChange={setRepeat}
            extra={
                <TransportButton label="Queue" pressed={queueOpen}>
                    <ListMusic aria-hidden />
                </TransportButton>
            }
        />
    )
}

function MusicApp({ view, player }: { view: View; player?: number }) {
    const [collapsed, setCollapsed] = useState(false)
    const [tab, setTab] = useState('queue')
    const queue = view === 'queue'
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
                top={<TopBar trail={TRAILS[view]} onSearch={() => undefined} />}
                panel={
                    queue ? (
                        <SidePanel
                            tabs={[
                                { id: 'queue', label: 'Queue', content: <QueueBody /> },
                                { id: 'history', label: 'History', content: <QueueBody history /> },
                            ]}
                            active={tab}
                            onActiveChange={setTab}
                        />
                    ) : undefined
                }
                foot={
                    <StatusLine note="Playing on this computer">
                        <StatusItem label="library">{`${String(ALBUMS.length)} albums`}</StatusItem>
                    </StatusLine>
                }
                bottom={view === 'video' || view === 'series' ? undefined : <Player queueOpen={queue} size={player} />}
            >
                {view === 'library' && <LibraryPage />}
                {view === 'album' && <AlbumPage />}
                {view === 'series' && <SeriesPage />}
                {view === 'video' && <Watch />}
                {queue && (
                    <>
                        <div className="hidden lg:block">
                            <AlbumPage />
                        </div>
                        <div className="lg:hidden">
                            <Page>
                                <PageHeader title="Queue" count={`${String(NEXT_UP.length + THEN.length)} tracks`} />
                                <div className="-mx-(--density-page-inset) border-y border-border">
                                    <QueueBody />
                                </div>
                            </Page>
                        </div>
                    </>
                )}
            </Shell>
            <Toaster />
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Music' }
export default meta

/** The album grid, its covers drawn, with the playing album marked and the player bar along the foot. */
export const Library: StoryObj = { name: 'Library', render: () => <MusicApp view="library" /> }

/**
 * One album's page: back and the trail through the music and its artist over the title, the
 * artist and year under it, and Download, the favorite star and Add to playlist at its end. The
 * cover stays beside the tracks as they scroll; the one playing is drawn in the accent with a
 * speaker for its number, and each row carries its own add to the queue and star.
 */
export const Album: StoryObj = { name: 'Album', render: () => <MusicApp view="album" /> }

/** The queue in the side panel beside the album, its button pressed in the bar; on a phone the queue is the page. */
export const Queue: StoryObj = { name: 'Queue', render: () => <MusicApp view="queue" /> }

/**
 * The player dragged up from its top edge into the large now-playing panel, docked between the
 * album and the foot: the cover as tall as the panel under the rail, the title large over the
 * track's waveform, and the account still at the window's bottom edge beside the foot strip.
 */
export const NowPlaying: StoryObj = { name: 'Now playing', render: () => <MusicApp view="album" player={300} /> }

/** A series' episodes as wide covers, with their lengths and how far each was watched. */
export const Series: StoryObj = { name: 'Series', render: () => <MusicApp view="series" /> }

/** A film in the video player with its controls shown and the rest of its series beside it. */
export const Video: StoryObj = { name: 'Video', render: () => <MusicApp view="video" /> }
