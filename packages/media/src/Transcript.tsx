import { useRef } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { useFollow } from './use-follow'

/** One line of a transcript: what was said, from the second it starts, and who said it. */
export interface TranscriptLine {
    /** Seconds from the start of what plays. */
    start: number
    text: string
    /** Who speaks, written over the line where it changes. */
    speaker?: string
}

/** The words the transcript says, each with an English default. */
export interface TranscriptWords {
    /** The name of the region the transcript fills. */
    label: string
    /** What stands in for a transcript with no lines. */
    none: string
    /** A line's name for a screen reader, given its time as written and its words. */
    seek: (time: string, text: string) => string
}

export const TRANSCRIPT_WORDS: TranscriptWords = {
    label: 'Transcript',
    none: 'No transcript',
    seek: (time, text) => `Play from ${time}: ${text}`,
}

/** The line being said at `position`: the last one started by then, or -1 before the first. */
export function transcriptLineAt(lines: readonly TranscriptLine[], position: number): number {
    let found = -1
    for (let index = 0; index < lines.length; index += 1) {
        if (lines[index].start > position) break
        found = index
    }
    return found
}

export interface TranscriptProps {
    lines: readonly TranscriptLine[]
    /** Seconds from the start of what plays; the line said then is inked. */
    position?: number
    /** Pressing a line seeks to its start; without it the lines are text. */
    onSeek?: (seconds: number) => void
    /** Whether the line being said is kept in the middle of the box as it changes. */
    follow?: boolean
    className?: string
    words?: Partial<TranscriptWords>
}

/**
 * The words of a podcast, an interview or a talk as they are said, filling the box it is given and
 * scrolling within it: each line under its time, the speaker written where the voice changes, read
 * at the size of the page's text. The line said at `position` is inked and the rest quiet, and it
 * is kept in the middle of the box as playback moves on, never while the reader scrolls or for a
 * few seconds after. Pressing a line seeks to its start through `onSeek` and follows again at once.
 *
 * Where `Lyrics` sets a song's lines large to sing along, a transcript is read: beside the player,
 * on an episode's page or in the fullscreen view in the visualizer's place (`MediaBar`'s `lyrics`).
 */
export function Transcript({ lines, position = 0, onSeek, follow = true, className, words }: TranscriptProps) {
    const said = { ...TRANSCRIPT_WORDS, ...words }
    const at = transcriptLineAt(lines, position)
    const box = useRef<HTMLDivElement | null>(null)
    const line = useRef<HTMLLIElement | null>(null)
    const { resume } = useFollow(line, at, { mode: 'center', enabled: follow && at >= 0, scroller: box })

    return (
        <div
            data-slot="transcript"
            role="region"
            aria-label={said.label}
            className={cn('@container relative h-full min-h-48 w-full min-w-0', className)}
        >
            <div ref={box} className="absolute inset-0 overflow-y-auto overscroll-contain">
                {lines.length === 0 ? (
                    <p className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">{said.none}</p>
                ) : (
                    <ol className="mx-auto flex max-w-prose flex-col px-6 py-8">
                        {lines.map((entry, index) => {
                            const current = index === at
                            const time = formatTime(entry.start)
                            const speaker = entry.speaker !== undefined && entry.speaker !== lines[index - 1]?.speaker
                            const head = (
                                <span
                                    className={cn('flex items-center gap-2 text-xs text-muted-foreground', speaker && index > 0 && 'pt-4')}
                                >
                                    {speaker && <span className="font-medium text-foreground">{entry.speaker}</span>}
                                    <span className="font-mono tabular-nums">{time}</span>
                                </span>
                            )
                            const body = (
                                <span
                                    className={cn(
                                        'block text-base leading-relaxed transition-colors duration-300 motion-reduce:transition-none',
                                        current ? 'text-foreground' : 'text-muted-foreground',
                                    )}
                                >
                                    {entry.text}
                                </span>
                            )
                            return (
                                <li key={`${String(index)}:${String(entry.start)}`} ref={index === Math.max(0, at) ? line : undefined}>
                                    {onSeek === undefined ? (
                                        <p aria-current={current || undefined} className="py-1.5">
                                            {head}
                                            {body}
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            aria-current={current || undefined}
                                            aria-label={said.seek(time, entry.text)}
                                            onClick={() => {
                                                resume()
                                                onSeek(entry.start)
                                            }}
                                            className="block w-full cursor-pointer rounded-control py-1.5 text-left outline-none focus-visible:bg-hover"
                                        >
                                            {head}
                                            {body}
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ol>
                )}
            </div>
        </div>
    )
}
