import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteCommand, PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Search } from '@winterop-com/sokkel-ui/Search'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { nextChapterStart, previousChapterStart } from '@winterop-com/sokkel-ui-media/chapters'
import {
    ChartNoAxesColumn,
    Compass,
    Download,
    FileText,
    House,
    Inbox as InboxIcon,
    ListOrdered,
    Moon,
    Pause,
    Play,
    Podcast,
    RefreshCw,
    RotateCcw,
    RotateCw,
    Settings,
    SkipBack,
    SkipForward,
    Star,
} from 'lucide-react'
import { useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { categoryLabel, EPISODES, episodeById, SHOWS, showById } from './catalog'
import { find } from './pages/Discover'
import { Discover } from './pages/Discover'
import { Downloads } from './pages/Downloads'
import { EpisodePage } from './pages/Episode'
import { Home } from './pages/Home'
import { Inbox } from './pages/Inbox'
import { Queue } from './pages/Queue'
import { SettingsPage } from './pages/Settings'
import { ShowPage } from './pages/Show'
import { Shows } from './pages/Shows'
import { Starred } from './pages/Starred'
import { Stats } from './pages/Stats'
import { Player, RATES } from './Player'
import { usePodcasts } from './state'

const PAGES = ['home', 'inbox', 'queue', 'discover', 'shows', 'show', 'episode', 'starred', 'downloads', 'stats', 'settings'] as const

const TITLES: Record<string, string> = {
    home: 'Listen now',
    inbox: 'New',
    queue: 'Queue',
    discover: 'Discover',
    shows: 'Shows',
    starred: 'Starred',
    downloads: 'Downloads',
    stats: 'Stats',
    settings: 'Settings',
}

/** The podcasts app: the rail of places, the page the route names, the player along the foot, and the palette. */
export function Podcasts({ frame }: { frame: Frame }) {
    const state = usePodcasts()
    const { settings: look, setSettings: setLook } = frame.appearance
    const [first = 'home', second, third] = frame.route
    const page = (PAGES as readonly string[]).includes(first) ? first : 'missing'
    const [fullscreen, setFullscreen] = useState(false)
    const [topQuery, setTopQuery] = useState('')

    const rows = [...state.episodes.values()]
    const fresh = rows.filter((row) => row.inbox).length
    const kept = rows.filter((row) => row.download === 'kept').length
    const running = rows.filter((row) => row.download === 'running').length
    const followed = [...state.shows.values()].filter((show) => show.subscribed).length
    const starred = rows.filter((row) => row.starred).length

    const show = page === 'show' && second !== undefined ? showById.get(second) : undefined
    const episode = page === 'episode' && second !== undefined ? episodeById.get(second) : undefined
    const episodeShow = episode === undefined ? undefined : showById.get(episode.show)

    const entry = (id: string, label: string, icon: typeof House, count?: number, active = page === id) => ({
        id,
        label,
        icon,
        href: `#/${id}`,
        active,
        ...(count === undefined || count === 0 ? {} : { count }),
    })
    const groups: RailGroup[] = [
        {
            id: 'listen',
            entries: [
                entry('home', 'Listen now', House),
                entry('inbox', 'New', InboxIcon, fresh),
                entry('queue', 'Queue', ListOrdered, state.player.queue.length),
                entry('discover', 'Discover', Compass),
            ],
        },
        {
            id: 'library',
            title: 'Library',
            entries: [
                entry('shows', 'Shows', Podcast, followed, page === 'shows' || page === 'show' || page === 'episode'),
                entry('starred', 'Starred', Star, starred),
                entry('downloads', 'Downloads', Download, kept + running),
            ],
        },
        { id: 'you', title: 'You', entries: [entry('stats', 'Stats', ChartNoAxesColumn), entry('settings', 'Settings', Settings)] },
    ]

    const current = state.current === null ? undefined : episodeById.get(state.current)
    const starts = state.script?.chapters.map((chapter) => chapter.start) ?? []
    const nextChapter = nextChapterStart(starts, state.position)
    const skip = state.prefs.skip
    const playerCommands: PaletteCommand[] =
        current === undefined
            ? []
            : [
                  {
                      id: 'toggle',
                      label: state.playing ? 'Pause' : 'Play',
                      icon: state.playing ? Pause : Play,
                      detail: current.title,
                      keys: ['Space'],
                      onSelect: () => state.setPlaying(!state.playing),
                  },
                  { id: 'back', label: `Back ${String(skip)} seconds`, icon: RotateCcw, keys: ['←'], onSelect: () => state.skip(-skip) },
                  {
                      id: 'forward',
                      label: `Forward ${String(skip)} seconds`,
                      icon: RotateCw,
                      keys: ['→'],
                      onSelect: () => state.skip(skip),
                  },
                  {
                      id: 'previous-chapter',
                      label: 'Previous chapter',
                      icon: SkipBack,
                      onSelect: () => state.seek(previousChapterStart(starts, state.position)),
                  },
                  ...(nextChapter === undefined
                      ? []
                      : [{ id: 'next-chapter', label: 'Next chapter', icon: SkipForward, onSelect: () => state.seek(nextChapter) }]),
                  ...(state.player.queue.length === 0
                      ? []
                      : [
                            {
                                id: 'next',
                                label: 'Play the next in the queue',
                                icon: SkipForward,
                                detail: episodeById.get(state.player.queue[0] ?? '')?.title,
                                keys: ['N'],
                                onSelect: () => void state.playNext(),
                            },
                        ]),
                  {
                      id: 'now-playing',
                      label: 'Open what plays',
                      icon: FileText,
                      detail: current.title,
                      keywords: ['transcript', 'chapters', 'notes'],
                      onSelect: () => go(`/episode/${current.id}`),
                  },
                  ...RATES.map((rate) => ({
                      id: `rate-${String(rate)}`,
                      label: `Speed ${String(rate)}x`,
                      keywords: ['speed', 'rate'],
                      onSelect: () => state.setRate(rate),
                  })),
                  ...[15, 30, 60].map((minutes) => ({
                      id: `sleep-${String(minutes)}`,
                      label: `Sleep in ${String(minutes)} minutes`,
                      icon: Moon,
                      keywords: ['sleep', 'timer'],
                      onSelect: () => state.sleep.set(minutes),
                  })),
                  ...(state.sleep.timer === null
                      ? []
                      : [{ id: 'sleep-off', label: 'Turn the sleep timer off', icon: Moon, onSelect: () => state.sleep.set(null) }]),
              ]

    const palette: PaletteGroup[] = [
        ...(playerCommands.length === 0 ? [] : [{ title: 'Player', rank: 1, commands: playerCommands }]),
        {
            title: 'Podcasts',
            rank: 2,
            commands: [
                {
                    id: 'check',
                    label: 'Check for new episodes',
                    icon: RefreshCw,
                    onSelect: () => {
                        go('/inbox')
                        void state.checkForNew()
                    },
                },
            ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        {
            title: 'Shows',
            rank: 4,
            commands: SHOWS.map((one) => ({
                id: `show-${one.id}`,
                label: one.title,
                detail: `${one.hosts.join(', ')} · ${categoryLabel(one.category)}`,
                artwork: <Artwork cover={one.cover} />,
                keywords: [one.blurb, ...one.hosts],
                onSelect: () => go(`/show/${one.id}`),
            })),
        },
        {
            title: 'Episodes',
            rank: 5,
            commands: EPISODES.filter((one) => state.episodes.get(one.id)?.out === true).map((one) => ({
                id: `episode-${one.id}`,
                label: one.title,
                detail: showById.get(one.show)?.title,
                artwork: <Artwork cover={showById.get(one.show)?.cover} />,
                keywords: [one.summary, one.place],
                onSelect: () => go(`/episode/${one.id}`),
            })),
        },
        ...frame.palette,
    ]

    useShortcuts(
        [
            {
                id: 'toggle',
                key: ' ',
                label: 'Play or pause',
                group: 'Player',
                disabled: current === undefined,
                run: (event) => {
                    event.preventDefault()
                    state.setPlaying(!state.playing)
                },
            },
            { id: 'back', key: 'ArrowLeft', label: `Back ${String(skip)} seconds`, group: 'Player', run: () => state.skip(-skip) },
            { id: 'forward', key: 'ArrowRight', label: `Forward ${String(skip)} seconds`, group: 'Player', run: () => state.skip(skip) },
            { id: 'next', key: 'n', label: 'Play the next in the queue', group: 'Player', run: () => void state.playNext() },
            {
                id: 'star',
                key: 's',
                label: 'Star what plays',
                group: 'Player',
                disabled: current === undefined,
                run: () => {
                    if (current !== undefined) state.star(current.id, state.episodes.get(current.id)?.starred !== true)
                },
            },
            { id: 'fullscreen', key: 'f', label: 'Open or close the player', group: 'Player', run: () => setFullscreen((open) => !open) },
        ],
        [state, current, skip],
    )

    const label =
        page === 'show'
            ? (show?.title ?? 'Not found')
            : page === 'episode'
              ? (episode?.title ?? 'Not found')
              : (TITLES[page] ?? 'Not found')
    const trail: Crumb[] = [{ label: 'Podcasts', href: '#/home' }]
    if (page === 'show') trail.push({ label: 'Shows', href: '#/shows' })
    if (page === 'episode' && episodeShow !== undefined) trail.push({ label: episodeShow.title, href: `#/show/${episodeShow.id}` })
    trail.push({ label })

    let content
    if (page === 'home') content = <Home />
    else if (page === 'inbox') content = <Inbox />
    else if (page === 'queue') content = <Queue />
    else if (page === 'discover') {
        const initial = third === undefined ? '' : decodeURIComponent(third)
        content = <Discover key={initial} category={second ?? 'all'} initial={initial} />
    } else if (page === 'shows') content = <Shows />
    else if (page === 'show') content = show === undefined ? <Gone what="show" /> : <ShowPage key={show.id} id={show.id} />
    else if (page === 'episode') content = episode === undefined ? <Gone what="episode" /> : <EpisodePage id={episode.id} />
    else if (page === 'starred') content = <Starred />
    else if (page === 'downloads') content = <Downloads />
    else if (page === 'stats') content = <Stats />
    else if (page === 'settings') content = <SettingsPage frame={frame} />
    else content = <Gone what="page" />

    return (
        <Shell
            palette={palette}
            paletteFilter="terms"
            desktop={frame.desktop}
            route={frame.route.join('/')}
            shortcuts={[]}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/home"
                    name="Podcasts"
                    groups={groups}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            onSettings={() => go('/settings')}
                            scheme={look.scheme}
                            onSchemeChange={(scheme) => setLook({ ...look, scheme })}
                            onSignOut={() => go('/home')}
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    search={
                        <Search
                            query={topQuery}
                            onQueryChange={setTopQuery}
                            search={(query) => {
                                const found = find(query, (id) => state.episodes.get(id)?.out === true)
                                return [
                                    {
                                        kind: 'shows',
                                        title: 'Shows',
                                        total: found.shows.length,
                                        results: found.shows.slice(0, 4).map((one) => ({
                                            id: `show:${one.id}`,
                                            title: one.title,
                                            detail: one.blurb,
                                            artwork: <Artwork cover={one.cover} />,
                                        })),
                                    },
                                    {
                                        kind: 'episodes',
                                        title: 'Episodes',
                                        total: found.episodes.length,
                                        results: found.episodes.slice(0, 6).map((one) => ({
                                            id: `episode:${one.id}`,
                                            title: one.title,
                                            detail: showById.get(one.show)?.title,
                                            artwork: <Artwork cover={showById.get(one.show)?.cover} />,
                                        })),
                                    },
                                ]
                            }}
                            onOpen={(result) => {
                                setTopQuery('')
                                const [kind, id] = result.id.split(':')
                                go(`/${kind ?? 'show'}/${id ?? ''}`)
                            }}
                            onSeeAll={(query) => {
                                setTopQuery('')
                                go(`/discover/all/${encodeURIComponent(query)}`)
                            }}
                            words={{ placeholder: 'Search podcasts' }}
                        />
                    }
                />
            }
            bottom={<Player fullscreen={fullscreen} onFullscreenChange={setFullscreen} queueShown={page === 'queue'} />}
            foot={
                <StatusLine note={running > 0 ? `Downloading ${String(running)}` : 'Kept in this browser'} live={running > 0}>
                    <StatusItem label="new">{fresh}</StatusItem>
                    <StatusItem label="queued">{state.player.queue.length}</StatusItem>
                    <StatusItem label="downloaded">{kept}</StatusItem>
                </StatusLine>
            }
        >
            <Page>
                <PageState loading={state.loading} error={state.error}>
                    {content}
                </PageState>
            </Page>
        </Shell>
    )
}

/** A page for an address that leads nowhere: a show or an episode not in the catalog, or a mistyped one. */
function Gone({ what }: { what: string }) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>No {what} here</EmptyTitle>
                <EmptyDescription>The address is wrong, or it is no longer listed.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={() => go('/home')}>
                Listen now
            </Button>
        </Empty>
    )
}
