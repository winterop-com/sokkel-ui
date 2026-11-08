import type { ReactNode } from 'react'

import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { chapterIndex, chapterSpan } from './chapters'
import { TrackList, type Track, type TrackListWords, type TrackProgress } from './TrackList'

/** One chapter: its title and where it starts, in seconds from the start of the whole. */
export interface MediaChapter {
    title: ReactNode
    start: number
}

/** The starts of `chapters`, as `MediaBar` takes them for its `chapters`. */
export function chapterStarts(chapters: readonly MediaChapter[]): number[] {
    return chapters.map((chapter) => chapter.start)
}

/**
 * The chapters of a book, a podcast or a long work, in order: each one's number, its title over
 * where it starts, and its length at the end, the last one's running to `duration`. The chapter
 * playing at `position` is marked as `TrackList` marks the playing row and kept in view, brought to
 * the middle when it is out of view, never while the reader scrolls; pressing a chapter seeks to
 * its start through `onSeek`. `progress` shows how far the chapter playing has played, as the time
 * left or a line along its foot.
 *
 * The chapters and the position count on the whole, the same as `MediaBar`'s `chapters`
 * (`chapterStarts` makes them) and its `timeline`; a book over several files maps the whole to a
 * file and back with `fileAt` and `timelinePosition` in `timeline`, so a chapter may run across
 * files.
 */
export function ChapterList({
    chapters,
    duration,
    position,
    playing = false,
    onSeek,
    progress,
    follow = true,
    variant = 'boxed',
    className,
    words,
}: {
    chapters: readonly MediaChapter[]
    /** The length of the whole, in seconds, where the last chapter ends. */
    duration: number
    /** Seconds from the start of the whole; the chapter it falls in is marked. */
    position?: number
    playing?: boolean
    onSeek?: (seconds: number) => void
    progress?: TrackProgress
    /** Whether the chapter playing is kept in view as it changes. */
    follow?: boolean
    variant?: 'boxed' | 'plain'
    className?: string
    words?: Partial<TrackListWords>
}) {
    const starts = chapterStarts(chapters)
    const index = position === undefined ? -1 : chapterIndex(starts, position)
    const tracks: Track[] = chapters.map((chapter, at) => {
        const span = chapterSpan(starts, at, duration)
        return {
            id: String(at),
            number: at + 1,
            title: chapter.title,
            subtitle: <span className="font-mono tabular-nums">{formatTime(chapter.start)}</span>,
            duration: span.end - span.start,
        }
    })
    return (
        <TrackList
            tracks={tracks}
            current={index < 0 ? undefined : String(index)}
            playing={playing}
            position={index < 0 || position === undefined ? undefined : position - starts[index]}
            progress={progress}
            follow={follow}
            onPlay={onSeek === undefined ? undefined : (track) => onSeek(starts[Number(track.id)])}
            variant={variant}
            className={className}
            words={words}
        />
    )
}
