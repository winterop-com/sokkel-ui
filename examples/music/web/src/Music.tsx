import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { Rail, type RailBody, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Search } from '@winterop-com/sokkel-ui/Search'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { nextRepeat } from '@winterop-com/sokkel-ui-media/queue'
import {
    AudioLines,
    CloudDownload,
    Disc3,
    Expand,
    ListMusic,
    ListPlus,
    MicVocal,
    Music2,
    Pause,
    Play,
    Radio as RadioIcon,
    Repeat,
    Settings as SettingsIcon,
    Shuffle,
    SkipBack,
    SkipForward,
    Star,
    Volume2,
    VolumeX,
} from 'lucide-react'
import { useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { ALBUM_BY_ID, ALBUMS, ARTIST_BY_ID, ARTISTS, albumsOfArtist, SONGS, songsOfAlbum } from './catalog'
import { downloads, favorites, playlists, setFavorite, setSettings, useRows, useSettings } from './data'
import { startRadio } from './parts/actions'
import { askNewPlaylist } from './parts/dialogs'
import { Player } from './parts/Player'
import { QueuePanel } from './parts/QueuePanel'
import { Album } from './pages/Album'
import { Albums } from './pages/Albums'
import { Artist } from './pages/Artist'
import { Artists } from './pages/Artists'
import { Downloads } from './pages/Downloads'
import { Favorites } from './pages/Favorites'
import { PlaylistPage, Playlists } from './pages/Playlists'
import { Radio } from './pages/Radio'
import { Results } from './pages/Results'
import { Settings } from './pages/Settings'
import { Tracks } from './pages/Tracks'
import { currentSong, next, playSongs, previous, seekBy, setRepeat, setShuffle, togglePlay, usePlayer } from './player'
import { searchGroups } from './search'

const PLACES = ['albums', 'artists', 'tracks', 'favorites', 'downloads', 'radio', 'playlists', 'settings', 'search'] as const
type Place = (typeof PLACES)[number]

const LABELS: Record<Place, string> = {
    albums: 'Albums',
    artists: 'Artists',
    tracks: 'Tracks',
    favorites: 'Favorites',
    downloads: 'Downloads',
    radio: 'Radio',
    playlists: 'Playlists',
    settings: 'Settings',
    search: 'Search',
}

/** The library as the rail's tree: each artist by name, their albums under them, newest first. */
const LIBRARY: TreeNode[] = [...ARTISTS]
    .sort((one, other) => one.name.localeCompare(other.name))
    .map((artist) => {
        const albums = albumsOfArtist(artist.id)
        return {
            id: `artist:${artist.id}`,
            label: artist.name,
            meta: albums.length,
            children: albums.map((album) => ({ id: `album:${album.id}`, label: album.title, meta: album.year })),
        }
    })

/** The keys the player answers, which the shortcuts dialog lists under Playback. */
function PlayerKeys({ onFullscreen, onLyrics, onQueue }: { onFullscreen: () => void; onLyrics: () => void; onQueue: () => void }) {
    const state = usePlayer()
    const options = useSettings()
    const song = currentSong(state)
    const radio = state.radio !== null
    const group = 'Playback'
    useShortcuts(
        [
            { id: 'play', key: ' ', label: 'Play or pause', group, run: togglePlay },
            { id: 'next', key: 'n', label: 'Next song', group, run: next },
            { id: 'previous', key: 'p', label: 'Previous song', group, run: previous, disabled: radio },
            { id: 'shuffle', key: 's', label: 'Shuffle', group, run: () => setShuffle(!state.queue.shuffle), disabled: radio },
            {
                id: 'repeat',
                key: 'r',
                label: 'Repeat: off, all, one',
                group,
                run: () => setRepeat(nextRepeat(state.queue.repeat)),
                disabled: radio,
            },
            { id: 'back', key: 'ArrowLeft', label: 'Back 5 seconds', group, repeat: true, run: () => seekBy(-5), disabled: radio },
            { id: 'ahead', key: 'ArrowRight', label: 'Ahead 5 seconds', group, repeat: true, run: () => seekBy(5), disabled: radio },
            {
                id: 'louder',
                key: 'ArrowUp',
                label: 'Louder',
                group,
                repeat: true,
                run: () => setSettings({ volume: Math.min(1, options.volume + 0.05), muted: false }),
            },
            {
                id: 'quieter',
                key: 'ArrowDown',
                label: 'Quieter',
                group,
                repeat: true,
                run: () => setSettings({ volume: Math.max(0, options.volume - 0.05) }),
            },
            { id: 'mute', key: 'm', label: 'Mute', group, run: () => setSettings({ muted: !options.muted }) },
            { id: 'star', key: '*', label: 'Star what plays', group, run: () => song !== undefined && setFavorite('song', song.id, true) },
            { id: 'fullscreen', key: 'f', label: 'Full screen', group, inDialogs: true, run: onFullscreen },
            { id: 'lyrics', key: 'l', label: 'Words of what plays', group, inDialogs: true, run: onLyrics },
            { id: 'queue', key: 'q', label: 'Show the queue', group, run: onQueue },
            {
                id: 'visualizer',
                key: 'v',
                label: 'Visualizer behind the bar',
                group,
                run: () => setSettings({ barVisualizer: !options.barVisualizer }),
            },
        ],
        [state, options, song, radio],
    )
    return null
}

/** The music app inside the shell: the rail of places with the library's tree, the search, the queue beside the page, and the player along the foot. */
export function Music({ frame }: { frame: Frame }) {
    const options = useSettings()
    const state = usePlayer()
    const lists = useRows(playlists)
    const stars = useRows(favorites)
    const kept = useRows(downloads)
    const [collapsed, setCollapsed] = useState(false)
    const [fullscreen, setFullscreen] = useState(false)
    const [treeQuery, setTreeQuery] = useState('')
    const [query, setQuery] = useState('')
    const { settings: look, setSettings: setLook } = frame.appearance
    const song = currentSong(state)

    const [first, second] = frame.route
    const place: Place = PLACES.includes(first as Place) ? (first as Place) : 'albums'
    const album = place === 'albums' && second !== undefined ? ALBUM_BY_ID.get(second) : undefined
    const artist = place === 'artists' && second !== undefined ? ARTIST_BY_ID.get(second) : undefined
    const playlist = place === 'playlists' && second !== undefined ? lists.find((row) => row.id === second) : undefined
    const running = kept.filter((row) => row.state === 'running').length

    const groups: RailGroup[] = [
        {
            id: 'library',
            entries: [
                { id: 'albums', label: 'Albums', icon: Disc3, href: '#/albums', description: `${String(ALBUMS.length)} albums` },
                { id: 'artists', label: 'Artists', icon: MicVocal, href: '#/artists', description: 'The library as a tree' },
                { id: 'tracks', label: 'Tracks', icon: Music2, href: '#/tracks', description: `${String(SONGS.length)} songs` },
                {
                    id: 'favorites',
                    label: 'Favorites',
                    icon: Star,
                    href: '#/favorites',
                    description: `${String(stars.length)} starred`,
                },
                {
                    id: 'downloads',
                    label: 'Downloads',
                    icon: CloudDownload,
                    href: '#/downloads',
                    description: running > 0 ? `${String(running)} coming in` : 'Kept on this device',
                    count: running > 0 ? running : undefined,
                },
                {
                    id: 'radio',
                    label: 'Radio',
                    icon: RadioIcon,
                    href: '#/radio',
                    description: state.radio === null ? 'Stations without end' : `On air: ${state.source?.label ?? 'a station'}`,
                },
            ],
        },
        {
            id: 'playlists',
            title: 'Playlists',
            entries: [
                {
                    id: 'playlists',
                    label: 'All playlists',
                    icon: ListMusic,
                    href: '#/playlists',
                    description: `${String(lists.length)} playlists`,
                },
                ...[...lists]
                    .sort((one, other) => one.name.localeCompare(other.name))
                    .map((row) => ({
                        id: `playlist:${row.id}`,
                        label: row.name,
                        icon: ListMusic,
                        href: `#/playlists/${row.id}`,
                        keywords: ['playlist'],
                    })),
            ],
        },
        {
            id: 'system',
            entries: [
                { id: 'settings', label: 'Settings', icon: SettingsIcon, href: '#/settings', description: 'Playback, visualizer, look' },
            ],
        },
    ].map((group) => ({
        ...group,
        entries: group.entries.map((entry) => ({
            ...entry,
            active:
                playlist !== undefined ? entry.id === `playlist:${playlist.id}` : entry.id === (album !== undefined ? 'artists' : place),
        })),
    }))

    // The library's tree stands in the rail while the listener browses it by artist.
    const browsing = place === 'artists' || album !== undefined
    const selected = album !== undefined ? `album:${album.id}` : artist !== undefined ? `artist:${artist.id}` : undefined
    const body: RailBody | undefined = browsing
        ? {
              title: 'Library',
              search: <SearchField value={treeQuery} onChange={setTreeQuery} placeholder="Filter" shortcut={false} />,
              content: (
                  <Tree
                      label="Artists and albums"
                      nodes={LIBRARY}
                      query={treeQuery}
                      selected={selected === undefined ? [] : [selected]}
                      onSelect={([id]) => {
                          if (id === undefined) return
                          const [kind, ref] = id.split(':')
                          go(kind === 'album' ? `/albums/${ref}` : `/artists/${ref}`)
                      }}
                      defaultExpanded={[`artist:${album?.artist ?? artist?.id ?? ''}`]}
                  />
              ),
          }
        : undefined

    const toggleQueue = () => setSettings({ queueOpen: !options.queueOpen })
    const palette: PaletteGroup[] = [
        {
            title: 'Playback',
            commands:
                song === undefined
                    ? []
                    : [
                          {
                              id: 'play',
                              label: state.playing ? `Pause ${song.title}` : `Play ${song.title}`,
                              icon: state.playing ? Pause : Play,
                              keys: ['Space'],
                              onSelect: togglePlay,
                          },
                          { id: 'next', label: 'Next song', icon: SkipForward, keys: ['N'], onSelect: next },
                          { id: 'previous', label: 'Previous song', icon: SkipBack, keys: ['P'], onSelect: previous },
                          {
                              id: 'shuffle',
                              label: state.queue.shuffle ? 'Play in order' : 'Shuffle the queue',
                              icon: Shuffle,
                              keys: ['S'],
                              onSelect: () => setShuffle(!state.queue.shuffle),
                          },
                          {
                              id: 'repeat',
                              label: `Repeat ${{ off: 'the queue', all: 'this song', one: 'off' }[state.queue.repeat]}`,
                              icon: Repeat,
                              keys: ['R'],
                              onSelect: () => setRepeat(nextRepeat(state.queue.repeat)),
                          },
                          {
                              id: 'star',
                              label: `Star ${song.title}`,
                              icon: Star,
                              keys: ['*'],
                              onSelect: () => setFavorite('song', song.id, true),
                          },
                          { id: 'fullscreen', label: 'Full screen', icon: Expand, keys: ['F'], onSelect: () => setFullscreen(true) },
                          {
                              id: 'lyrics',
                              label: 'Show the words of what plays',
                              icon: AudioLines,
                              keys: ['L'],
                              onSelect: () => {
                                  setSettings({ lyrics: true })
                                  setFullscreen(true)
                              },
                          },
                          {
                              id: 'queue',
                              label: options.queueOpen ? 'Hide the queue' : 'Show the queue',
                              icon: ListMusic,
                              keys: ['Q'],
                              onSelect: toggleQueue,
                          },
                          {
                              id: 'mute',
                              label: options.muted ? 'Unmute' : 'Mute',
                              icon: options.muted ? Volume2 : VolumeX,
                              keys: ['M'],
                              onSelect: () => setSettings({ muted: !options.muted }),
                          },
                          ...(song.id.startsWith('radio:')
                              ? []
                              : [
                                    {
                                        id: 'radio',
                                        label: `Start radio from ${song.title}`,
                                        icon: RadioIcon,
                                        onSelect: () => startRadio('song', song.id),
                                    },
                                ]),
                      ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        {
            title: 'Playlists',
            commands: [{ id: 'new-playlist', label: 'New playlist', icon: ListPlus, onSelect: () => askNewPlaylist() }],
        },
        ...frame.palette,
    ]

    // A page of one album, artist, playlist or search carries its own trail in its header.
    const trail: Crumb[] = second !== undefined ? [] : [{ label: LABELS[place] }]

    const page =
        place === 'albums' ? (
            second === undefined ? (
                <Albums />
            ) : (
                <Album id={second} />
            )
        ) : place === 'artists' ? (
            second === undefined ? (
                <Artists />
            ) : (
                <Artist id={second} />
            )
        ) : place === 'tracks' ? (
            <Tracks />
        ) : place === 'favorites' ? (
            <Favorites />
        ) : place === 'downloads' ? (
            <Downloads />
        ) : place === 'radio' ? (
            <Radio />
        ) : place === 'playlists' ? (
            second === undefined ? (
                <Playlists />
            ) : (
                <PlaylistPage id={second} />
            )
        ) : place === 'search' ? (
            <Results query={decodeURIComponent(second ?? '')} />
        ) : (
            <Settings appearance={frame.appearance} />
        )

    const openSearch = (kind: string, id: string) => {
        if (kind === 'artists') go(`/artists/${id}`)
        else if (kind === 'albums') go(`/albums/${id}`)
        else {
            // A song opens its album and plays it from that song.
            const found = SONGS.find((one) => one.id === id)
            if (found === undefined) return
            const ids = songsOfAlbum(found.album).map((one) => one.id)
            const on = ALBUM_BY_ID.get(found.album)
            playSongs(ids, ids.indexOf(found.id), { kind: 'album', label: on?.title ?? found.album, href: `/albums/${found.album}` })
            go(`/albums/${found.album}`)
        }
    }

    return (
        <Shell
            palette={palette}
            paletteFilter="terms"
            paletteSearch={{
                search: (text) => searchGroups(text),
                onOpen: (result, group) => openSearch(group.kind, result.id),
                minQuery: 2,
            }}
            shortcuts={[]}
            desktop={frame.desktop}
            route={frame.route.join('/')}
            panel={options.queueOpen ? <QueuePanel /> : undefined}
            panelOpen={options.queueOpen}
            onPanelOpenChange={(queueOpen) => setSettings({ queueOpen })}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/albums"
                    name="Music"
                    groups={groups}
                    collapsed={collapsed}
                    onCollapsedChange={setCollapsed}
                    body={body}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            collapsed={collapsed}
                            scheme={look.scheme}
                            onSchemeChange={(scheme) => setLook({ ...look, scheme })}
                            onSettings={() => go('/settings')}
                            local
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    search={
                        <Search
                            search={(text) => searchGroups(text)}
                            minQuery={2}
                            query={query}
                            onQueryChange={setQuery}
                            onOpen={(result, group) => {
                                setQuery('')
                                openSearch(group.kind, result.id)
                            }}
                            onSeeAll={(text) => {
                                setQuery('')
                                go(`/search/${encodeURIComponent(text)}`)
                            }}
                        />
                    }
                />
            }
            foot={
                <StatusLine
                    live={state.playing}
                    tone={state.error === undefined ? (state.playing ? 'live' : 'quiet') : 'error'}
                    note={
                        state.error ??
                        (song === undefined
                            ? 'Nothing playing'
                            : `${state.playing ? 'Playing' : 'Paused'} on this computer, from ${state.source?.label ?? 'the queue'}`)
                    }
                >
                    {options.crossfade > 0 && <StatusItem label="crossfade">{`${String(options.crossfade)} s`}</StatusItem>}
                    {options.rate !== 1 && <StatusItem label="speed">{`${String(options.rate)}x`}</StatusItem>}
                    <StatusItem label="library">{`${String(ALBUMS.length)} albums`}</StatusItem>
                    <StatusItem label="kept">{kept.filter((row) => row.state === 'kept').length}</StatusItem>
                </StatusLine>
            }
            bottom={
                <Player
                    queueOpen={options.queueOpen}
                    onQueueOpenChange={(queueOpen) => setSettings({ queueOpen })}
                    fullscreen={fullscreen}
                    onFullscreenChange={setFullscreen}
                />
            }
        >
            <PlayerKeys
                onFullscreen={() => setFullscreen((open) => !open)}
                onLyrics={() => {
                    setSettings({ lyrics: !(fullscreen && options.lyrics) })
                    setFullscreen(true)
                }}
                onQueue={toggleQueue}
            />
            {place === 'settings' ? page : <Page className="@container">{page}</Page>}
        </Shell>
    )
}
