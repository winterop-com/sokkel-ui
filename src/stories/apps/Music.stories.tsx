import type { Meta, StoryObj } from '@storybook/react-vite'
import { Clapperboard, Disc3, Heart, ListMusic, MicVocal, MoreHorizontal, Music2, Play, Shuffle, Tv, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { MediaBar, type RepeatMode } from '../../components/media/MediaBar'
import { MediaCard, MediaGrid } from '../../components/media/MediaCard'
import { formatTime } from '../../components/media/time'
import { TrackList, type Track } from '../../components/media/TrackList'
import { VideoPlayer } from '../../components/media/VideoPlayer'
import { PageHeader } from '../../components/PageHeader'
import { Rail, type RailGroup } from '../../components/Rail'
import { SearchField } from '../../components/SearchField'
import { Segmented } from '../../components/Segmented'
import { Page, Shell } from '../../components/Shell'
import { PanelSection, SidePanel } from '../../components/SidePanel'
import { TopBar, type Crumb } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { TooltipProvider } from '../../components/ui/tooltip'
import { Artwork, type Cover } from '../fixtures/Artwork'
import { TidevannMark } from '../fixtures/TidevannMark'
import captions from '../media/fixtures/captions.vtt?url'
import clip from '../media/fixtures/clip.webm?url'

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
    subtitle: `${PLAYING.artist} · ${PLAYING.title}`,
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
    subtitle: `${entry.album.artist} · ${entry.album.title}`,
    artwork: <Artwork cover={entry.album.cover} />,
    duration: entry.duration,
}))

const HISTORY: Track[] = TRACKS.slice(0, CURRENT).map((track, index) => ({
    id: `h${String(index)}`,
    title: track.title,
    subtitle: `${PLAYING.artist} · ${PLAYING.title}`,
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
                entry('favorites', 'Favorites', Heart),
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
    album: [{ label: 'Albums', href: '#' }, { label: PLAYING.title }],
    queue: [{ label: 'Albums', href: '#' }, { label: PLAYING.title }],
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
                    subtitle={`${album.artist} · ${String(album.year)}`}
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
            <PageHeader title={FILM.series} count={`${String(EPISODES.length)} episodes`} />
            <p className="-mt-2 max-w-prose text-sm text-muted-foreground">
                A year along a northern coast, from the first light over the water to the last ferry of the evening. By {FILM.by},{' '}
                {String(FILM.year)}.
            </p>
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
            <div className="flex flex-wrap items-center gap-2">
                <SearchField value={query} onChange={setQuery} placeholder="Search albums" className="w-full sm:w-64" />
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2 sm:justify-end">
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
                </div>
            </div>
            <AlbumGrid albums={ALBUMS} />
        </Page>
    )
}

function AlbumPage() {
    const total = TRACKS.reduce((sum, track) => sum + track.duration, 0)
    return (
        <Page className="@container">
            <div className="flex flex-col gap-8 @4xl:flex-row @4xl:items-start">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end @4xl:sticky @4xl:top-0 @4xl:w-60 @4xl:shrink-0 @4xl:flex-col @4xl:items-stretch">
                    <span className="block size-40 shrink-0 overflow-hidden rounded-surface shadow-xs ring-1 ring-border sm:size-48 @4xl:aspect-square @4xl:size-auto @4xl:w-full">
                        <Artwork cover={PLAYING.cover} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-medium tracking-wide text-faint uppercase">Album</p>
                            <h1 className="truncate text-page font-semibold tracking-tight">{PLAYING.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{PLAYING.artist}</span> · {PLAYING.year} · {TRACKS.length}{' '}
                                tracks, {Math.round(total / 60)} min
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm">
                                <Play className="fill-current" aria-hidden />
                                Play
                            </Button>
                            <Button size="sm" variant="outline">
                                <Shuffle aria-hidden />
                                Shuffle
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="Add to favorites" className="text-muted-foreground">
                                <Heart aria-hidden />
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="More" className="text-muted-foreground">
                                <MoreHorizontal aria-hidden />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-8">
                    <TrackList tracks={ALBUM_TRACKS} current={`t${String(CURRENT + 1)}`} playing onPlay={() => undefined} />
                    <section className="flex flex-col gap-3">
                        <h2 className="text-sm font-medium">More by {PLAYING.artist}</h2>
                        <AlbumGrid albums={ALBUMS.filter((album) => album.artist === PLAYING.artist && album.id !== PLAYING.id)} />
                    </section>
                </div>
            </div>
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
                <div className="flex min-w-0 items-center gap-3">
                    <span className="block size-14 shrink-0 overflow-hidden rounded-mini ring-1 ring-border">
                        <Artwork cover={PLAYING.cover} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{TRACKS[CURRENT].title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {PLAYING.artist} · {PLAYING.title}
                        </p>
                        <p className="font-mono text-xs text-faint tabular-nums">
                            {formatTime(POSITION)} of {formatTime(TRACKS[CURRENT].duration)}
                        </p>
                    </div>
                </div>
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
            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <VideoPlayer
                        src={`${clip}#t=24`}
                        preload="auto"
                        defaultControlsVisible
                        tracks={[{ src: captions, label: 'English', lang: 'en', default: true }]}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-title font-semibold">{FILM.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {FILM.series}, episode 1 · {FILM.by} · {FILM.year} · {formatTime(FILM.length)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                                <Heart aria-hidden />
                                Favorite
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="More" className="text-muted-foreground">
                                <MoreHorizontal aria-hidden />
                            </Button>
                        </div>
                    </div>
                    <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                        The first hour of a day on a northern coast, filmed from one headland as the light comes up over the water and the
                        boats leave the harbor.
                    </p>
                </div>
                <aside className="-mx-2 flex shrink-0 flex-col gap-2 xl:w-80">
                    <h2 className="px-2 text-xs font-medium tracking-wide text-faint uppercase">{FILM.series}, 5 episodes</h2>
                    <TrackList tracks={EPISODES} current="e1" variant="plain" artwork="wide" onPlay={() => undefined} />
                </aside>
            </div>
        </Page>
    )
}

function Player({ queueOpen }: { queueOpen: boolean }) {
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
            subtitle={`${PLAYING.artist} · ${PLAYING.title}`}
            artwork={<Artwork cover={PLAYING.cover} />}
            playing={playing}
            onPlayingChange={setPlaying}
            position={position}
            duration={track.duration}
            onSeek={setPosition}
            buffered={[{ start: 0, end: 180 }]}
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
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Queue"
                    aria-pressed={queueOpen}
                    className={queueOpen ? 'text-primary-ink' : 'text-muted-foreground'}
                >
                    <ListMusic aria-hidden />
                </Button>
            }
        />
    )
}

function MusicApp({ view }: { view: View }) {
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
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSettings={() => undefined} />}
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
                bottom={view === 'video' || view === 'series' ? undefined : <Player queueOpen={queue} />}
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
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Music' }
export default meta

/** The album grid, its covers drawn, with the playing album marked and the player bar along the foot. */
export const Library: StoryObj = { name: 'Library', render: () => <MusicApp view="library" /> }

/** One album's tracks, the one playing drawn in the accent with a speaker for its number. */
export const Album: StoryObj = { name: 'Album', render: () => <MusicApp view="album" /> }

/** The queue in the side panel beside the album, its button pressed in the bar; on a phone the queue is the page. */
export const Queue: StoryObj = { name: 'Queue', render: () => <MusicApp view="queue" /> }

/** A series' episodes as wide covers, with their lengths and how far each was watched. */
export const Series: StoryObj = { name: 'Series', render: () => <MusicApp view="series" /> }

/** A film in the video player with its controls shown and the rest of its series beside it. */
export const Video: StoryObj = { name: 'Video', render: () => <MusicApp view="video" /> }
