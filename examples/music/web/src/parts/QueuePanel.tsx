import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { ReorderableTrackList } from '@winterop-com/sokkel-ui-media/ReorderableTrackList'
import { TrackList } from '@winterop-com/sokkel-ui-media/TrackList'
import { useFramePosition } from '@winterop-com/sokkel-ui-media/use-frame-position'
import { History, X } from 'lucide-react'
import { useState } from 'react'

import { albumOf, artistName, lengthOfSongs, minutes, songOf } from '../catalog'
import { clearHistory, history, useRows } from '../data'
import { clearUpNext, currentSong, dequeue, moveInQueue, playPosition, playSongs, upNext, usePlayer, usePosition } from '../player'
import { asTrack, Nothing } from './songs'

/** What plays now, its time read on every frame so it runs as smoothly as the bar's. */
function NowPlaying() {
    const state = usePlayer()
    const given = usePosition()
    const element = state.element
    const at = useFramePosition(given, element === null ? undefined : () => element.currentTime, state.playing)
    const song = currentSong(state)
    if (song === undefined) return null
    const album = albumOf(song)
    return (
        <PanelSection title="Now playing">
            <Row gap="md" className="min-w-0">
                <span className="block size-14 shrink-0 overflow-hidden rounded-mini ring-1 ring-border">
                    <Artwork cover={album.cover} />
                </span>
                <Stack gap="none" className="min-w-0">
                    <p className="truncate text-sm font-medium">{song.title}</p>
                    <MetaLine truncate items={[artistName(song.artist), album.title]} />
                    <p className="font-mono text-xs text-faint tabular-nums">
                        {state.radio === null ? `${formatTime(at)} of ${formatTime(song.duration)}` : formatTime(at)}
                    </p>
                </Stack>
            </Row>
        </PanelSection>
    )
}

/** The queue: what plays now, what comes after it in the order it plays, dragged into another order or taken out, and where it came from. */
function QueueTab() {
    const state = usePlayer()
    const next = upNext(state)
    const songs = next.flatMap(({ entry }) => songOf(entry.song) ?? [])
    const first = next[0]?.position ?? 0
    const source = state.source
    return (
        <>
            <NowPlaying />
            <PanelSection
                title={
                    next.length === 0
                        ? 'Up next'
                        : `Up next, ${String(next.length)} ${next.length === 1 ? 'song' : 'songs'}, ${minutes(lengthOfSongs(songs))}`
                }
                actions={
                    next.length > 0 && state.radio === null ? (
                        <Button size="xs" variant="ghost" onClick={clearUpNext}>
                            Clear
                        </Button>
                    ) : undefined
                }
            >
                {next.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing after this song. Add songs from their menus, or play an album.</p>
                ) : (
                    <ReorderableTrackList
                        variant="plain"
                        className="-mx-2"
                        follow={false}
                        tracks={next.map(({ entry }) => {
                            const song = songOf(entry.song)
                            return song === undefined
                                ? { id: entry.key, title: entry.song, duration: 0 }
                                : { ...asTrack(song, { artwork: true }), id: entry.key }
                        })}
                        onPlay={(track) => {
                            const at = next.find(({ entry }) => entry.key === track.id)
                            if (at !== undefined) playPosition(at.position)
                        }}
                        onMove={(from, to) => moveInQueue(first + from, first + to)}
                        actions={(track) => {
                            const at = next.find(({ entry }) => entry.key === track.id)
                            return at === undefined ? null : (
                                <IconButton label="Remove from the queue" onClick={() => dequeue([at.position])}>
                                    <X aria-hidden />
                                </IconButton>
                            )
                        }}
                    />
                )}
            </PanelSection>
            {source !== null && (
                <PanelSection title="Playing from">
                    {source.href === undefined ? (
                        <p className="text-sm">{source.label}</p>
                    ) : (
                        <TextLink href={`#${source.href}`}>{source.label}</TextLink>
                    )}
                </PanelSection>
            )}
        </>
    )
}

/** What was played lately, newest first, each played again from a press. */
function HistoryTab() {
    const rows = useRows(history)
    const songs = rows.flatMap((row) => {
        const song = songOf(row.song)
        return song === undefined ? [] : [{ row, song }]
    })
    if (songs.length === 0) {
        return (
            <PanelSection title="Played lately">
                <Nothing icon={History} title="Nothing played yet">
                    What you play is listed here.
                </Nothing>
            </PanelSection>
        )
    }
    return (
        <PanelSection
            title="Played lately"
            actions={
                <Button size="xs" variant="ghost" onClick={clearHistory}>
                    Clear
                </Button>
            }
        >
            <TrackList
                variant="plain"
                className="-mx-2"
                follow={false}
                tracks={songs.map(({ row, song }) => ({ ...asTrack(song, { artwork: true }), id: row.id }))}
                onPlay={(track) => {
                    const at = songs.findIndex(({ row }) => row.id === track.id)
                    playSongs(
                        songs.map(({ song }) => song.id),
                        at,
                        { kind: 'history', label: 'Played lately' },
                    )
                }}
            />
        </PanelSection>
    )
}

/** The queue beside the page: Queue and Played lately as tabs. */
export function QueuePanel() {
    const [tab, setTab] = useState('queue')
    return (
        <SidePanel
            tabs={[
                { id: 'queue', label: 'Queue', content: <QueueTab /> },
                { id: 'history', label: 'History', content: <HistoryTab /> },
            ]}
            active={tab}
            onActiveChange={setTab}
        />
    )
}
