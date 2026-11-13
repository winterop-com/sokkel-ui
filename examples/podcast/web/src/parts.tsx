/** What several pages draw: an episode's row and its actions, a list of episodes, and a grid of shows. */

import { DownloadButton } from '@winterop-com/sokkel-ui/DownloadButton'
import { useMedia } from '@winterop-com/sokkel-ui/hooks/use-mobile'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { ReorderableTrackList } from '@winterop-com/sokkel-ui-media/ReorderableTrackList'
import { DraggableTrackList } from '@winterop-com/sokkel-ui-media/DraggableTrackList'
import type { Track } from '@winterop-com/sokkel-ui-media/TrackList'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import {
    Archive,
    Check,
    Download,
    Info,
    ListEnd,
    ListStart,
    ListX,
    MoreHorizontal,
    Podcast,
    RotateCcw,
    Star,
    StarOff,
    Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { go } from 'tidevann-shared/router'
import { DAY, sizeOf } from './backend'
import { episodeById, showById, type Episode } from './catalog'
import { lengthOf } from './script'
import { usePodcasts } from './state'

/** When something came out: today, yesterday, days or weeks ago, or its date. */
export function ago(at: number, now = Date.now()): string {
    const days = Math.floor((now - at) / DAY)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 14) return `${String(days)} days ago`
    if (days < 60) return `${String(Math.floor(days / 7))} weeks ago`
    return new Date(at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

/** A length of time in words: "45 sec", "12 min", "3 h 20 min". */
export function spoken(seconds: number): string {
    if (seconds < 60) return `${String(Math.round(seconds))} sec`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${String(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? `${String(hours)} h` : `${String(hours)} h ${String(rest)} min`
}

/** Where a row has room for its star and its download beside the menu. */
const WIDE = '(min-width: 40rem)'

/** Whether the window is wider than a phone, followed as it changes. */
export const useWide = (): boolean => useMedia(WIDE, true)

/** What the star buttons say: the app's word for keeping an episode is starring it. */
export const STAR = { star: 'Star', unstar: 'Unstar' }

export function megabytes(size: number): string {
    return `${size.toFixed(1)} MB`
}

export function ShowArt({ show }: { show: string }) {
    const found = showById.get(show)
    return <Artwork cover={found?.cover} seed={show} />
}

/** Where the listener stands with an episode: new, played, or how long is left. */
export function standing(id: string): (state: ReturnType<typeof usePodcasts>) => string | undefined {
    return (state) => {
        const row = state.episodes.get(id)
        if (row === undefined) return undefined
        if (row.played) return 'Played'
        if (row.position > 0) return `${formatTime(lengthOf(id) - row.position)} left`
        if (row.inbox) return 'New'
        return undefined
    }
}

/**
 * The menu at the end of an episode's row: queue, played, archive, the episode and its show, and
 * with `all` its star and its download too, for a row on a phone that has room for neither.
 */
export function EpisodeMenu({ id, label = 'More', all = false }: { id: string; label?: string; all?: boolean }) {
    const state = usePodcasts()
    const row = state.episodes.get(id)
    const episode = episodeById.get(id)
    if (row === undefined || episode === undefined) return null
    const queued = state.player.queue.includes(id)
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" size="icon-sm" aria-label={`${label}: ${episode.title}`} className="text-muted-foreground" />
                }
            >
                <MoreHorizontal aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => state.queueAdd(id, 'next')}>
                    <ListStart aria-hidden />
                    Play next
                </DropdownMenuItem>
                {queued ? (
                    <DropdownMenuItem onClick={() => state.queueRemove(id)}>
                        <ListX aria-hidden />
                        Remove from queue
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => state.queueAdd(id, 'end')}>
                        <ListEnd aria-hidden />
                        Add to queue
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => state.markPlayed(id, !row.played)}>
                    {row.played ? <RotateCcw aria-hidden /> : <Check aria-hidden />}
                    {row.played ? 'Mark unplayed' : 'Mark played'}
                </DropdownMenuItem>
                {row.inbox && (
                    <DropdownMenuItem onClick={() => state.archive(id)}>
                        <Archive aria-hidden />
                        Archive
                    </DropdownMenuItem>
                )}
                {all && (
                    <DropdownMenuItem onClick={() => state.star(id, !row.starred)}>
                        {row.starred ? <StarOff aria-hidden /> : <Star aria-hidden />}
                        {row.starred ? 'Unstar' : 'Star'}
                    </DropdownMenuItem>
                )}
                {all && row.download === 'idle' && (
                    <DropdownMenuItem onClick={() => state.download(id)}>
                        <Download aria-hidden />
                        Download
                    </DropdownMenuItem>
                )}
                {all && row.download !== 'idle' && (
                    <DropdownMenuItem onClick={() => state.removeDownload(id)}>
                        <Trash2 aria-hidden />
                        {row.download === 'running' ? 'Cancel the download' : 'Remove the download'}
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go(`/episode/${id}`)}>
                    <Info aria-hidden />
                    Episode details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => go(`/show/${episode.show}`)}>
                    <Podcast aria-hidden />
                    Go to show
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/** An episode's download, kept or under way, as an icon. */
export function EpisodeDownload({ id }: { id: string }) {
    const state = usePodcasts()
    const row = state.episodes.get(id)
    if (row === undefined) return null
    return (
        <DownloadButton
            compact
            variant="ghost"
            size="sm"
            state={row.download}
            value={row.progress}
            onDownload={() => state.download(id)}
            onCancel={() => state.removeDownload(id)}
            onRemove={() => state.removeDownload(id)}
            keptDetail={`${megabytes(sizeOf(id))} on this device`}
        />
    )
}

/**
 * The controls at the end of an episode's row: its star, its download and its menu. On a phone the
 * star and the download move into the menu, but for a download under way, which shows how far it is.
 */
export function EpisodeActions({ id, extra }: { id: string; extra?: ReactNode }) {
    const state = usePodcasts()
    const wide = useWide()
    const row = state.episodes.get(id)
    if (row === undefined) return null
    return (
        <>
            {extra}
            {wide && <StarButton starred={row.starred} onStarredChange={(on) => state.star(id, on)} words={STAR} />}
            {(wide || row.download === 'running') && <EpisodeDownload id={id} />}
            <EpisodeMenu id={id} all={!wide} />
        </>
    )
}

/** An episode as a row: its show's cover, its title, and a line with the show, when it came out and where the listener stands. */
export function useEpisodeTrack(withShow: boolean): (episode: Episode) => Track {
    const state = usePodcasts()
    return (episode) => {
        const row = state.episodes.get(episode.id)
        const show = showById.get(episode.show)
        const stand = standing(episode.id)(state)
        return {
            id: episode.id,
            title: episode.title,
            subtitle: (
                <MetaLine
                    inline
                    truncate
                    items={[
                        withShow ? show?.title : `Episode ${String(episode.number)}`,
                        row === undefined ? undefined : ago(row.outAt),
                        stand,
                    ]}
                />
            ),
            artwork: <ShowArt show={episode.show} />,
            duration: lengthOf(episode.id),
        }
    }
}

/** What an episode's row is dragged as, onto the queue, Starred or Downloads in the rail; its value is the row's `Track`, keyed by the episode. */
export const EPISODE_DRAG = 'episode'

/**
 * Episodes as a list: a press plays one, or pauses the one playing; each row ends in its actions,
 * and drags onto the queue, Starred or Downloads in the rail.
 */
export function EpisodeList({
    episodes,
    withShow = true,
    actions,
    onMove,
    variant = 'boxed',
    follow = false,
    className,
}: {
    episodes: readonly Episode[]
    withShow?: boolean
    /** `plain` inside a section's box, `boxed` on the page. */
    variant?: 'boxed' | 'plain'
    /** Whether the page scrolls to keep the episode playing in view. */
    follow?: boolean
    /** Controls before the row's own, such as taking it out of the queue. */
    actions?: (episode: Episode, index: number) => ReactNode
    /** Moves an episode from one place to another, which makes each row end in a grip to drag. */
    onMove?: (from: number, to: number) => void
    className?: string
}) {
    const state = usePodcasts()
    const track = useEpisodeTrack(withShow)
    const index = new Map(episodes.map((episode, at) => [episode.id, at]))
    const list = {
        tracks: episodes.map(track),
        current: state.current !== null && index.has(state.current) ? state.current : undefined,
        playing: state.playing,
        position: state.position,
        progress: 'bar' as const,
        onPlay: (one: Track) => state.play(one.id),
        actions: (one: Track) => {
            const episode = episodeById.get(one.id)
            return episode === undefined ? null : <EpisodeActions id={one.id} extra={actions?.(episode, index.get(one.id) ?? 0)} />
        },
        variant,
        follow,
        className,
    }
    return onMove === undefined ? (
        <DraggableTrackList {...list} kind={EPISODE_DRAG} />
    ) : (
        <ReorderableTrackList {...list} kind={EPISODE_DRAG} onMove={onMove} />
    )
}

/** Shows as a grid of covers, each opening the show's page, with a play button for its latest episode and a menu to follow it. */
export function ShowGrid({ shows, label }: { shows: readonly string[]; label: string }) {
    const state = usePodcasts()
    return (
        <MediaGrid label={label}>
            {shows.map((id) => {
                const show = showById.get(id)
                if (show === undefined) return null
                const followed = state.shows.get(id)?.subscribed === true
                const fresh = [...state.episodes.values()].filter((row) => row.inbox && episodeById.get(row.id)?.show === id).length
                const latest = [...state.episodes.values()]
                    .filter((row) => row.out && episodeById.get(row.id)?.show === id)
                    .sort((a, b) => b.outAt - a.outAt)[0]
                return (
                    <MediaCard
                        key={id}
                        title={show.title}
                        subtitle={show.hosts.join(', ')}
                        cover={<Artwork cover={show.cover} />}
                        href={`#/show/${id}`}
                        onPlay={latest === undefined ? undefined : () => state.play(latest.id)}
                        playing={state.playing && state.current !== null && episodeById.get(state.current)?.show === id}
                        badge={fresh > 0 ? `${String(fresh)} new` : undefined}
                        menu={
                            <>
                                <DropdownMenuItem onClick={() => (followed ? state.unsubscribe(id) : state.subscribe(id))}>
                                    {followed ? 'Unfollow' : 'Follow'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => go(`/show/${id}`)}>Open show</DropdownMenuItem>
                            </>
                        }
                    />
                )
            })}
        </MediaGrid>
    )
}

/** A list with nothing in it: what is missing, how it fills, and an action. */
export function Nothing({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">{icon}</EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{children}</EmptyDescription>
            </EmptyHeader>
            {action !== undefined && <EmptyContent>{action}</EmptyContent>}
        </Empty>
    )
}
