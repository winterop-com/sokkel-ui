import { X } from 'lucide-react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { formatBitrate, formatResolution, type VideoStats } from '@winterop-com/sokkel-ui/media/video-stats'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'

/** The words the stats overlay says, each with an English default. */
export interface VideoStatsOverlayWords {
    title: string
    resolution: string
    bitrate: string
    bandwidth: string
    buffer: string
    droppedFrames: string
    /** Where an engine picks among renditions, which one plays: `2 of 4`. */
    level: string
    /** The close button's label. */
    close: string
    /** Said for a fact nobody can tell yet. */
    unknown: string
    /** Joins the frames dropped to the frames shown, and the rendition to how many there are. */
    of: string
    /** Said before the first reading. */
    waiting: string
}

export const VIDEO_STATS_OVERLAY_WORDS: VideoStatsOverlayWords = {
    title: 'Stats',
    resolution: 'Resolution',
    bitrate: 'Bitrate',
    bandwidth: 'Bandwidth',
    buffer: 'Buffer ahead',
    droppedFrames: 'Dropped frames',
    level: 'Rendition',
    close: 'Close stats',
    unknown: '-',
    of: 'of',
    waiting: 'Waiting for the player',
}

export interface VideoStatsOverlayProps {
    /** A reading from `useVideoStats`, or null before the first. */
    stats: VideoStats | null
    /** Adds a close button, as when the app toggles the overlay from a key or a menu. */
    onClose?: () => void
    words?: Partial<VideoStatsOverlayWords>
    className?: string
}

/**
 * How a video is playing, in a few lines over its picture: the picture's size, the rendition's
 * bitrate, the link's bandwidth as the engine measures it, the seconds buffered ahead and the
 * frames dropped. The app reads the stats with `useVideoStats` from the player's handle and shows
 * the overlay through `VideoPlayer`'s `overlay`, so it stays over the picture in full screen; a fact
 * nobody can tell (a plain file has no bandwidth estimate) is a dash, never a zero.
 */
export function VideoStatsOverlay({ stats, onClose, words: given, className }: VideoStatsOverlayProps) {
    const words = { ...VIDEO_STATS_OVERLAY_WORDS, ...given }
    const none = words.unknown
    const rows: [string, string][] =
        stats === null
            ? []
            : [
                  [words.resolution, formatResolution(stats.resolution, none)],
                  [words.bitrate, formatBitrate(stats.bitrate, none)],
                  [words.bandwidth, formatBitrate(stats.bandwidth, none)],
                  [words.buffer, `${stats.bufferAhead.toFixed(1)} s`],
                  [
                      words.droppedFrames,
                      stats.droppedFrames === null
                          ? none
                          : `${stats.droppedFrames.toLocaleString('en-US')} ${words.of} ${(stats.totalFrames ?? 0).toLocaleString('en-US')}`,
                  ],
              ]
    if (stats !== null && stats.levels !== null && stats.levels > 1 && stats.level !== null) {
        rows.splice(2, 0, [words.level, `${String(stats.level + 1)} ${words.of} ${String(stats.levels)}`])
    }
    return (
        <section
            aria-label={words.title}
            data-slot="video-stats-overlay"
            className={cn(
                'w-64 max-w-full rounded-surface bg-terminal/80 py-1.5 pr-1.5 pl-3 text-xs text-terminal-foreground shadow-md backdrop-blur-sm',
                className,
            )}
        >
            <div className="flex min-h-7 items-center gap-2">
                <h2 className="min-w-0 flex-1 truncate font-medium">{words.title}</h2>
                {onClose !== undefined && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={words.close}
                        onClick={onClose}
                        className="text-terminal-muted hover:bg-terminal-foreground/15 hover:text-terminal-foreground dark:hover:bg-terminal-foreground/15"
                    >
                        <X aria-hidden />
                    </Button>
                )}
            </div>
            {stats === null ? (
                <p className="pr-1.5 pb-1 text-terminal-muted">{words.waiting}</p>
            ) : (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 pr-1.5 pb-1 font-mono">
                    {rows.map(([name, value]) => (
                        <div key={name} className="contents">
                            <dt className="truncate font-sans text-terminal-muted">{name}</dt>
                            <dd className="truncate text-right tabular-nums" title={value}>
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    )
}
