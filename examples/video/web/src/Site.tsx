import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup, PaletteSearch } from '@winterop-com/sokkel-ui/CommandPalette'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import {
    Activity,
    Clock,
    Download,
    History,
    Home as HomeIcon,
    LibraryBig,
    ListVideo,
    RectangleHorizontal,
    Settings as SettingsIcon,
    ThumbsUp,
    Users,
    Play,
    Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { CHANNELS, VIDEOS, channelById, channelOf, videoById, type Channel, type Video } from './catalog'
import { posterOf, useMaking } from './clips'
import { downloads, follows, playlists, ratings, setPrefs, useRows, usePrefs, watched, WATCH_LATER } from './data'
import { bytesOf, short } from './format'
import { Channel as ChannelPage } from './pages/Channel'
import { Downloads } from './pages/Downloads'
import { History as HistoryPage } from './pages/History'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Liked } from './pages/Liked'
import { NotFound } from './pages/NotFound'
import { Playlist } from './pages/Playlist'
import { Playlists } from './pages/Playlists'
import { Search } from './pages/Search'
import { Settings } from './pages/Settings'
import { Subscriptions } from './pages/Subscriptions'
import { Watch } from './pages/Watch'
import { watchHref } from './parts'

const dotOf = (channel: Channel) => `var(--kind-${channel.color})`

/** The words a query is matched by, each found in the text. */
const matches = (text: string, query: string) => {
    const words = query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word !== '')
    const haystack = text.toLowerCase()
    return words.length > 0 && words.every((word) => haystack.includes(word))
}

export const videoText = (video: Video) => `${video.title} ${channelOf(video).name} ${video.description} ${video.topic}`

/** Tidevann's video site: the rail of its places, the palette, the page the address names, and what is being made at the foot. */
export function Site({ frame }: { frame: Frame }) {
    const prefs = usePrefs()
    const { settings: look, setSettings: setLook } = frame.appearance
    // Settings open as a dialog over the page they were opened from.
    const settings = useOverlayRoute(frame.route, 'settings')
    const route = settings.route
    const [first = 'home', second, third, fourth] = route
    const { rows: followed } = useRows(follows)
    const { rows: lists } = useRows(playlists)
    const { rows: liked } = useRows(ratings)
    const { rows: kept } = useRows(downloads)
    const { rows: history } = useRows(watched)
    const making = useMaking()
    const [query, setQuery] = useState(first === 'search' ? decodeURIComponent(second ?? '') : '')

    useEffect(() => {
        if (first === 'search') setQuery(decodeURIComponent(second ?? ''))
    }, [first, second])

    const later = lists.find((one) => one.id === WATCH_LATER)
    const own = lists.filter((one) => one.id !== WATCH_LATER)
    const likedCount = liked.filter((one) => one.rating === 'like').length
    const active = (id: string) => first === id || (first === 'playlist' && id === 'playlists')
    const entry = (id: string, label: string, icon: typeof HomeIcon, description: string | undefined, count?: number) => ({
        id,
        label,
        icon,
        ...(description === undefined ? {} : { description }),
        href: id === 'home' ? '#/' : `#/${id}`,
        active: active(id),
        ...(count === undefined || count === 0 ? {} : { count }),
    })
    const followedChannels = followed.map((one) => channelById(one.id)).filter((one): one is Channel => one !== undefined)
    const groups: RailGroup[] = [
        {
            id: 'browse',
            entries: [
                entry('home', 'Home', HomeIcon, 'Videos picked for you, by topic'),
                entry('subscriptions', 'Subscriptions', Users, 'The latest from the channels you follow'),
                entry('library', 'Library', LibraryBig, 'Everything you keep, in one place'),
            ],
        },
        {
            id: 'yours',
            title: 'You',
            entries: [
                entry('history', 'History', History, undefined),
                entry('later', 'Watch later', Clock, undefined, later?.videos.length),
                entry('liked', 'Liked videos', ThumbsUp, undefined, likedCount),
                entry('playlists', 'Playlists', ListVideo, undefined, own.length),
                entry('downloads', 'Downloads', Download, undefined, kept.length),
            ],
        },
        {
            id: 'following',
            title: 'Following',
            entries: followedChannels.map((channel) => ({
                id: `channel-${channel.id}`,
                label: channel.name,
                dot: dotOf(channel),
                href: `#/channel/${channel.id}`,
                active: first === 'channel' && second === channel.id,
                keywords: ['channel', channel.handle],
            })),
        },
    ]

    const toggleTheater = () => setPrefs({ theater: !prefs.theater })
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        {
            title: 'Playlists',
            rank: 4,
            commands: own.map((list) => ({
                id: `playlist-${list.id}`,
                label: list.name,
                icon: ListVideo,
                hint: `${String(list.videos.length)} videos`,
                keywords: ['playlist'],
                onSelect: () => go(`/playlist/${list.id}`),
            })),
        },
        {
            title: 'Player',
            rank: 6,
            commands: [
                {
                    id: 'autoplay',
                    label: prefs.autoplay ? 'Turn autoplay off' : 'Turn autoplay on',
                    icon: Play,
                    keywords: ['next', 'up next'],
                    onSelect: () => setPrefs({ autoplay: !prefs.autoplay }),
                },
                {
                    id: 'theater',
                    label: prefs.theater ? 'Leave theater mode' : 'Theater mode',
                    icon: RectangleHorizontal,
                    onSelect: toggleTheater,
                },
                {
                    id: 'stats',
                    label: prefs.stats ? 'Hide the stats' : 'Show the stats',
                    icon: Activity,
                    onSelect: () => setPrefs({ stats: !prefs.stats }),
                },
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: SettingsIcon,
                    keywords: ['preferences', 'captions', 'quality'],
                    onSelect: () => go('/settings'),
                },
                {
                    id: 'clear-history',
                    label: 'Clear watch history',
                    icon: Trash2,
                    keywords: ['history'],
                    onSelect: () => go('/history/clear'),
                },
            ],
        },
        ...frame.palette,
    ]

    const search: PaletteSearch = {
        minQuery: 2,
        debounce: 60,
        search: (text) => {
            const videos = VIDEOS.filter((video) => matches(videoText(video), text))
            const channels = CHANNELS.filter((channel) => matches(`${channel.name} ${channel.handle} ${channel.about}`, text))
            return [
                {
                    kind: 'videos',
                    title: 'Videos',
                    total: videos.length,
                    results: videos.slice(0, 6).map((video) => ({
                        id: video.id,
                        title: video.title,
                        detail: channelOf(video).name,
                        meta: `${short(video.views)} views`,
                        thumbnail: posterOf(video),
                    })),
                },
                {
                    kind: 'channels',
                    title: 'Channels',
                    total: channels.length,
                    results: channels.map((channel) => ({
                        id: channel.id,
                        title: channel.name,
                        detail: channel.handle,
                        meta: `${short(channel.followers)} followers`,
                        icon: Users,
                    })),
                },
            ]
        },
        onOpen: (result, group) => {
            if (group.kind === 'channels') go(`/channel/${result.id}`)
            else {
                const video = videoById(result.id)
                if (video !== undefined) go(watchHref(video).slice(1))
            }
        },
    }

    const watching = first === 'watch' ? videoById(second) : undefined
    const channel = first === 'channel' ? channelById(second) : undefined
    const list = first === 'playlist' ? lists.find((one) => one.id === second) : undefined
    const trail: Crumb[] =
        watching !== undefined
            ? [{ label: channelOf(watching).name, href: `#/channel/${watching.channel}` }, { label: watching.title }]
            : channel !== undefined
              ? [{ label: channel.name }]
              : first === 'playlist'
                ? [{ label: 'Playlists', href: '#/playlists' }, { label: list?.name ?? 'Playlist' }]
                : first === 'search'
                  ? [{ label: 'Search' }]
                  : [
                        {
                            label: groups.flatMap((group) => group.entries).find((one) => one.id === first)?.label ?? 'Not found',
                        },
                    ]

    const submit = () => {
        const text = query.trim()
        if (text !== '') go(`/search/${encodeURIComponent(text)}`)
    }

    let content
    if (first === 'home') content = <Home />
    else if (first === 'watch' && second !== undefined)
        content = (
            <Watch
                key={`${second}-${String(fourth ?? '')}`}
                id={second}
                list={third === 'list' ? fourth : undefined}
                at={third === 'at' ? Number(fourth) : undefined}
            />
        )
    else if (first === 'channel' && second !== undefined)
        content = <ChannelPage key={second} id={second} tab={third === 'about' ? 'about' : 'videos'} />
    else if (first === 'subscriptions') content = <Subscriptions />
    else if (first === 'library') content = <Library />
    else if (first === 'history') content = <HistoryPage clearing={second === 'clear'} />
    else if (first === 'later') content = <Playlist id={WATCH_LATER} />
    else if (first === 'liked') content = <Liked />
    else if (first === 'playlists') content = <Playlists />
    else if (first === 'playlist' && second !== undefined) content = <Playlist key={second} id={second} />
    else if (first === 'downloads') content = <Downloads />
    else if (first === 'search') content = <Search query={decodeURIComponent(second ?? '')} />
    else content = <NotFound />

    return (
        <Shell
            palette={palette}
            paletteSearch={search}
            paletteFilter="terms"
            shortcuts={[]}
            desktop={frame.desktop}
            route={route.join('/')}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/"
                    name="Video"
                    groups={groups}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            local
                            onSettings={() => go('/settings')}
                            scheme={look.scheme}
                            onSchemeChange={(scheme) => setLook({ ...look, scheme })}
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    search={
                        <SearchField
                            value={query}
                            onChange={setQuery}
                            placeholder="Search"
                            shortcut
                            inputProps={{
                                onKeyDown: (event) => {
                                    if (event.key === 'Enter') submit()
                                },
                            }}
                        />
                    }
                />
            }
            foot={
                <StatusLine
                    live={making !== undefined}
                    note={
                        making === undefined
                            ? 'Every video is made in this browser'
                            : `Making ${making.title}, ${String(Math.round(making.share * 100))}%`
                    }
                >
                    <StatusItem label="watched">{history.length}</StatusItem>
                    <StatusItem label="downloaded">
                        {kept.length === 0 ? '0' : `${String(kept.length)}, ${bytesOf(kept.reduce((sum, one) => sum + one.bytes, 0))}`}
                    </StatusItem>
                </StatusLine>
            }
        >
            <Page>{content}</Page>
            {settings.open && <Settings frame={frame} open onClose={settings.close} />}
        </Shell>
    )
}
