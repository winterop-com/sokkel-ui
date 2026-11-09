import { DownloadButton, type DownloadState } from '@winterop-com/sokkel-ui/DownloadButton'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { useVideoStats } from '@winterop-com/sokkel-ui/media/video-stats'
import { VideoPlayer, type VideoPlayerHandle, type VideoQuality } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuCheckboxItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Progress } from '@winterop-com/sokkel-ui/primitives/progress'
import { Spinner } from '@winterop-com/sokkel-ui/primitives/spinner'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { useRailMode } from '@winterop-com/sokkel-ui/Shell'
import { ShowMore } from '@winterop-com/sokkel-ui/ShowMore'
import { ChannelRow } from '@winterop-com/sokkel-ui-media/ChannelRow'
import { MediaActions, type MediaAction } from '@winterop-com/sokkel-ui-media/MediaActions'
import { UpNext } from '@winterop-com/sokkel-ui-media/UpNext'
import { useMediaSession } from '@winterop-com/sokkel-ui-media/use-media-session'
import { VideoStatsOverlay } from '@winterop-com/sokkel-ui-media/VideoStatsOverlay'
import { WatchLayout } from '@winterop-com/sokkel-ui-media/WatchLayout'
import { Activity, Bookmark, Captions, Download, RectangleHorizontal, Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { TOPICS, channelOf, videoById, type Video } from '../catalog'
import { captionsOf, keepDownload, letDownloadGo, posterOf, RENDITIONS, renditionOf, requestClip, useClip, type Rendition } from '../clips'
import { clipSource } from '../clips/source'
import {
    captionStore,
    downloads,
    keepWatched,
    follows,
    setFollowing,
    playlists,
    ratings,
    setPrefs,
    useById,
    usePrefs,
    useRows,
    watched,
    type Quality,
} from '../data'
import { useDialogs } from '../dialogs'
import { bitrateOf, bytesOf, daysAgo, viewsOf } from '../format'
import { Poster, viewCount, watchHref } from '../parts'
import { Aside, nextOf, upNextFor } from './watch/Aside'
import { Comments } from './watch/Comments'

/** How long Up next counts before it plays the next video by itself, in seconds. */
const COUNTDOWN = 8

/** How often the viewer's place is kept while playing, in seconds of the video. */
const KEEP_EVERY = 4

/** The rendition Auto plays: 480p where the player is wide enough, 360p on a phone. */
const pickAuto = (): Rendition => renditionOf(window.innerWidth >= 700 ? '480' : '360')

/** Over the picture while the clip is made in the browser: how far along it is. */
function Preparing({ share, error }: { share: number; error: string | undefined }) {
    if (error !== undefined)
        return (
            <Stack gap="xs" align="center" className="max-w-md text-center text-terminal-foreground">
                <p className="text-section-title">This video cannot be made here</p>
                <p className="text-help text-terminal-muted">{error}</p>
            </Stack>
        )
    return (
        <Stack gap="sm" align="center" className="w-64 max-w-full text-terminal-foreground">
            <Spinner aria-hidden />
            <p className="text-help">Making the video in your browser</p>
            <Progress value={Math.round(share * 100)} aria-label="Made so far" className="w-full" />
        </Stack>
    )
}

/** One video playing: the player, its channel and actions, its description and comments, and what plays next beside it. */
export function Watch({ id, list: listId, at }: { id: string; list?: string; at?: number }) {
    const video = videoById(id)
    useRailMode('collapsed')
    if (video === undefined)
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>No such video</EmptyTitle>
                    <EmptyDescription>There is no video at this address. It may have been taken down.</EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" size="sm" onClick={() => go('/')}>
                    Go home
                </Button>
            </Empty>
        )
    return <Playing video={video} listId={listId} at={at} />
}

function Playing({ video, listId, at }: { video: Video; listId?: string; at?: number }) {
    const prefs = usePrefs()
    const dialogs = useDialogs()
    const channel = channelOf(video)
    const history = useById(watched)
    // The player is handed the clip once the history has come, so it starts where the viewer stopped.
    const historyReady = useRows(watched).ready
    const followed = useById(follows)
    const rated = useById(ratings)
    const kept = useById(downloads)
    const { rows: lists } = useRows(playlists)
    const list = listId === undefined ? undefined : lists.find((one) => one.id === listId)
    const seen = history.get(video.id)
    const following = followed.has(channel.id)
    const rating = rated.get(video.id)?.rating ?? null
    const saved = lists.some((one) => one.videos.includes(video.id))
    const download = kept.get(video.id)

    const [auto] = useState(pickAuto)
    const rendition = prefs.quality === 'auto' ? auto : renditionOf(prefs.quality)
    const { clip, share, error } = useClip(video, rendition)
    const player = useRef<VideoPlayerHandle>(null)
    // Where to start: where a change of quality left off, else the address's second, else where the viewer stopped.
    // The player takes it as the clip attaches, after the history has come.
    const [switchedAt, setSwitchedAt] = useState<number | undefined>(undefined)
    // A video plays as its page opens; after a change of quality it plays on only if it was playing.
    const [playOnLoad, setPlayOnLoad] = useState(true)
    const resume =
        seen !== undefined && !seen.finished && seen.position > 3 && seen.position < video.duration - 3 ? seen.position : undefined
    const startAt = switchedAt ?? at ?? resume
    const [playing, setPlaying] = useState(false)
    const [ended, setEnded] = useState(false)
    const [fetching, setFetching] = useState<number | undefined>(undefined)
    const counted = useRef(false)
    const keptAt = useRef(-KEEP_EVERY)
    const latest = useRef({ seen, prefs })
    latest.current = { seen, prefs }

    const shown = useMemo(() => upNextFor(video), [video])
    const next = nextOf(video, list, shown)

    // What plays next is made ahead, once this one is ready, so autoplay starts at once.
    useEffect(() => {
        if (clip !== undefined && next !== undefined) void requestClip(next, rendition, false).catch(() => undefined)
    }, [clip, next, rendition])

    const stats = useVideoStats(player, { enabled: prefs.stats })

    useMediaSession({
        title: video.title,
        artist: channel.name,
        album: 'Tidevann',
        artwork: posterOf(video),
        duration: video.duration,
        playing,
        handlers: {
            play: () => player.current?.play(),
            pause: () => player.current?.pause(),
            seekto: (seconds) => player.current?.seekTo(seconds),
            seekbackward: (seconds) => player.current?.seekBy(-seconds),
            seekforward: (seconds) => player.current?.seekBy(seconds),
            nexttrack: next === undefined ? undefined : () => go(watchHref(next, list?.id).slice(1)),
        },
    })

    const remember = (seconds: number) => {
        if (!latest.current.prefs.history || Math.abs(seconds - keptAt.current) < KEEP_EVERY) return
        keptAt.current = seconds
        keepWatched(video.id, { position: seconds, at: Date.now(), finished: false })
    }

    const playingChanged = (on: boolean) => {
        setPlaying(on)
        if (on) setEnded(false)
        const { seen: known, prefs: now } = latest.current
        if (!now.history) return
        if (on && !counted.current) {
            counted.current = true
            keepWatched(video.id, { at: Date.now(), times: (known?.times ?? 0) + 1, finished: false })
        } else if (!on) {
            const time = player.current?.time() ?? 0
            if (time > 0 && time < video.duration - 0.5) keepWatched(video.id, { position: time, at: Date.now() })
        }
    }

    const finished = () => {
        setEnded(true)
        if (latest.current.prefs.history) keepWatched(video.id, { position: 0, finished: true, at: Date.now() })
    }

    const playNext = () => {
        if (next !== undefined) go(watchHref(next, list?.id).slice(1))
    }

    const chooseQuality = (quality: string) => {
        setSwitchedAt(player.current?.time())
        setPlayOnLoad(player.current?.playing() === true)
        setPrefs({ quality: quality as Quality })
    }

    const qualities: VideoQuality[] = [
        { value: 'auto', label: 'Auto', detail: auto.label },
        ...RENDITIONS.map((one) => ({ value: one.id, label: one.label, detail: bitrateOf(one.bitrate) })),
    ]

    const downloading = useRef(0)
    const startDownload = () => {
        if (fetching !== undefined || download !== undefined) return
        downloading.current += 1
        const ticket = downloading.current
        setFetching(0)
        const began = performance.now()
        // A download is the clip kept on this device; it takes a moment, as a fetch would, while the clip is made or read.
        const tick = window.setInterval(() => {
            if (downloading.current === ticket) setFetching(Math.min(0.95, (performance.now() - began) / 2000))
        }, 120)
        void requestClip(video, rendition)
            .then(async (made) => {
                await new Promise((resolve) => setTimeout(resolve, Math.max(0, 2000 - (performance.now() - began))))
                if (downloading.current !== ticket) return
                await keepDownload(video, made)
                await downloads.create({ rendition: made.rendition.id, bytes: made.blob.size, at: Date.now() }, video.id)
                toast.add({ title: 'Downloaded', description: `${video.title}, kept on this device` })
            })
            .catch((failure: unknown) => toast.add({ type: 'error', title: 'The download failed', description: String(failure) }))
            .finally(() => {
                window.clearInterval(tick)
                if (downloading.current === ticket) setFetching(undefined)
            })
    }

    const cancelDownload = () => {
        downloading.current += 1
        setFetching(undefined)
        toast.add({ title: 'Download cancelled' })
    }

    const removeDownload = () => {
        void letDownloadGo(video).then(() => downloads.remove(video.id))
        toast.add({ title: 'Download removed' })
    }

    const downloadState: DownloadState = download !== undefined ? 'kept' : fetching !== undefined ? 'running' : 'idle'

    const toggleCaptions = () => {
        const on = captionStore.get().track !== null
        captionStore.set({ ...captionStore.get(), track: on ? null : 'en' })
    }

    const actions: MediaAction[] = [
        { id: 'share', label: 'Share', icon: <Share2 aria-hidden />, onSelect: () => dialogs.share(video, player.current?.time()) },
        {
            id: 'save',
            label: saved ? 'Saved' : 'Save',
            icon: <Bookmark className={saved ? 'fill-current' : undefined} aria-hidden />,
            pressed: saved,
            onSelect: () => dialogs.save(video),
        },
        {
            id: 'download',
            label:
                download !== undefined
                    ? 'Downloaded'
                    : fetching !== undefined
                      ? `Downloading ${String(Math.round(fetching * 100))}%`
                      : 'Download',
            icon: <Download aria-hidden />,
            onSelect: () => (download !== undefined ? go('/downloads') : startDownload()),
            render: (
                <DownloadButton
                    state={downloadState}
                    value={fetching}
                    size="sm"
                    variant="outline"
                    onDownload={startDownload}
                    onCancel={cancelDownload}
                    onRemove={removeDownload}
                    keptDetail={
                        download === undefined
                            ? undefined
                            : `On this device, ${bytesOf(download.bytes)}, ${renditionOf(download.rendition).label}`
                    }
                />
            ),
        },
    ]

    const statsShown = prefs.stats
    const toggleStats = () => setPrefs({ stats: !statsShown })
    const toggleTheater = () => setPrefs({ theater: !prefs.theater })

    useShortcuts(
        [
            { id: 'watch-toggle', key: 'k', label: 'Play or pause', group: 'Video', run: () => player.current?.toggle() },
            { id: 'watch-space', key: ' ', label: 'Play or pause', group: 'Video', run: () => player.current?.toggle() },
            { id: 'watch-back', key: 'j', label: 'Back 10 seconds', group: 'Video', repeat: true, run: () => player.current?.seekBy(-10) },
            {
                id: 'watch-forward',
                key: 'l',
                label: 'Forward 10 seconds',
                group: 'Video',
                repeat: true,
                run: () => player.current?.seekBy(10),
            },
            {
                id: 'watch-left',
                key: 'ArrowLeft',
                label: 'Back 5 seconds',
                group: 'Video',
                repeat: true,
                run: () => player.current?.seekBy(-5),
            },
            {
                id: 'watch-right',
                key: 'ArrowRight',
                label: 'Forward 5 seconds',
                group: 'Video',
                repeat: true,
                run: () => player.current?.seekBy(5),
            },
            { id: 'watch-mute', key: 'm', label: 'Mute', group: 'Video', run: () => player.current?.toggleMute() },
            { id: 'watch-full', key: 'f', label: 'Full screen', group: 'Video', run: () => player.current?.toggleFullscreen() },
            { id: 'watch-captions', key: 'c', label: 'Captions on or off', group: 'Video', run: toggleCaptions },
            { id: 'watch-theater', key: 't', label: 'Theater mode', group: 'Video', run: toggleTheater },
            { id: 'watch-stats', key: 'i', label: 'Stats', group: 'Video', run: toggleStats },
            { id: 'watch-next', key: 'N', shift: true, label: 'Next video', group: 'Video', disabled: next === undefined, run: playNext },
            ...Array.from({ length: 10 }, (_, digit) => ({
                id: `watch-${String(digit)}`,
                key: String(digit),
                label: `Go to ${String(digit * 10)}%`,
                group: 'Video',
                run: () => player.current?.seekTo((video.duration * digit) / 10),
            })),
        ],
        [video, next, statsShown, prefs.theater],
    )

    useCommands(
        [
            {
                title: 'This video',
                commands: [
                    {
                        id: 'watch-theater',
                        label: prefs.theater ? 'Leave theater mode' : 'Theater mode',
                        icon: RectangleHorizontal,
                        keys: ['t'],
                        onSelect: toggleTheater,
                    },
                    {
                        id: 'watch-stats',
                        label: statsShown ? 'Hide the stats' : 'Show the stats',
                        icon: Activity,
                        keys: ['i'],
                        onSelect: toggleStats,
                    },
                    { id: 'watch-captions', label: 'Captions on or off', icon: Captions, keys: ['c'], onSelect: toggleCaptions },
                    {
                        id: 'watch-share',
                        label: 'Share this video',
                        icon: Share2,
                        onSelect: () => dialogs.share(video, player.current?.time()),
                    },
                    { id: 'watch-save', label: 'Save this video', icon: Bookmark, onSelect: () => dialogs.save(video) },
                ],
            },
        ],
        [video, prefs.theater, statsShown],
    )

    const covered = clip === undefined
    const dropped = stats?.droppedFrames ?? 0
    const smooth = stats !== null && stats.bufferAhead > 1 && dropped <= Math.max(2, (stats.totalFrames ?? 0) * 0.01)

    return (
        <WatchLayout
            theater={prefs.theater}
            player={
                <VideoPlayer
                    ref={player}
                    source={clip === undefined || !historyReady ? undefined : clipSource(clip)}
                    poster={posterOf(video)}
                    title={video.title}
                    tracks={[{ src: captionsOf(video), label: 'English', lang: 'en' }]}
                    captionStore={captionStore}
                    defaultRate={prefs.rate}
                    onRateChange={(rate) => setPrefs({ rate })}
                    qualities={qualities}
                    quality={prefs.quality}
                    onQualityChange={chooseQuality}
                    startAt={startAt}
                    autoPlay={playOnLoad}
                    preload="auto"
                    keys={false}
                    onTime={remember}
                    onPlayingChange={playingChanged}
                    onEnded={finished}
                    defaultControlsVisible
                    overlay={
                        statsShown ? (
                            <VideoStatsOverlay
                                stats={stats}
                                headline={stats === null ? undefined : smooth ? 'Playing smoothly' : 'Filling the buffer'}
                                tone={stats === null ? 'neutral' : smooth ? 'good' : 'warning'}
                                rows={
                                    clip === undefined
                                        ? [{ label: 'Clip', value: `${String(Math.round(share * 100))}% made` }]
                                        : [
                                              {
                                                  label: 'Quality',
                                                  value: prefs.quality === 'auto' ? `${clip.rendition.label}, Auto` : clip.rendition.label,
                                              },
                                              { label: 'Codecs', value: clip.sound ? 'VP8, Opus' : 'VP8, no sound' },
                                              { label: 'Clip size', value: bytesOf(clip.blob.size) },
                                              {
                                                  label: 'Made in',
                                                  value: clip.kept ? 'an earlier visit' : `${(clip.made / 1000).toFixed(1)} s`,
                                              },
                                          ]
                                }
                                onClose={toggleStats}
                            />
                        ) : undefined
                    }
                    cover={
                        covered ? (
                            <Preparing share={share} error={error} />
                        ) : ended && next !== undefined ? (
                            <UpNext
                                title={next.title}
                                subtitle={channelOf(next).name}
                                cover={<Poster video={next} />}
                                countdown={prefs.autoplay ? COUNTDOWN : undefined}
                                onPlay={playNext}
                                onCancel={() => setEnded(false)}
                                words={{ cancel: 'Stay here' }}
                            />
                        ) : undefined
                    }
                    actions={
                        <TransportButton
                            tone="overlay"
                            size="md"
                            label={prefs.theater ? 'Leave theater mode' : 'Theater mode'}
                            pressed={prefs.theater}
                            onClick={toggleTheater}
                        >
                            <RectangleHorizontal aria-hidden />
                        </TransportButton>
                    }
                />
            }
            aside={<Aside video={video} list={list} history={history} />}
        >
            <Stack gap="lg">
                <h1 className="text-page-title">{video.title}</h1>
                <ChannelRow
                    name={channel.name}
                    href={`#/channel/${channel.id}`}
                    color={channel.color}
                    followers={channel.followers + (following ? 1 : 0)}
                    following={following}
                    onFollowingChange={(on) => {
                        void setFollowing(channel.id, on)
                        toast.add({ title: on ? `Following ${channel.name}` : `Stopped following ${channel.name}` })
                    }}
                    actions={
                        <MediaActions
                            rating={rating}
                            likes={video.likes + (rating === 'like' ? 1 : 0)}
                            onRatingChange={(next) => {
                                void (next === null
                                    ? ratings.remove(video.id)
                                    : rated.has(video.id)
                                      ? ratings.update(video.id, { rating: next })
                                      : ratings.create({ rating: next }, video.id))
                            }}
                            actions={actions}
                            menu={
                                <DropdownMenuCheckboxItem checked={statsShown} onCheckedChange={toggleStats}>
                                    <Activity aria-hidden />
                                    Stats
                                </DropdownMenuCheckboxItem>
                            }
                        />
                    }
                />
                <ShowMore
                    variant="well"
                    head={
                        <MetaLine
                            size="sm"
                            tone="strong"
                            items={[viewsOf(viewCount(video, seen)), daysAgo(video.days), TOPICS[video.topic]]}
                        />
                    }
                >
                    {video.description}
                </ShowMore>
                <Comments video={video} channel={channel} />
            </Stack>
        </WatchLayout>
    )
}
