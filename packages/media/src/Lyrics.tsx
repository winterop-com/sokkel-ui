import { useMemo, useRef } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { lyricLineAt, parseLyrics, type LyricLine, type ParsedLyrics } from './lrc'
import { useFollow } from './use-follow'

/** The words the lyrics say, each with an English default. */
export interface LyricsWords {
    /** The name of the region the lyrics fill. */
    label: string
    /** What stands in for lyrics with no lines. */
    none: string
}

export const LYRICS_WORDS: LyricsWords = { label: 'Lyrics', none: 'No lyrics' }

export interface LyricsProps {
    lyrics: string | ParsedLyrics
    /** Seconds from the start of what plays. */
    position?: number
    onSeek?: (seconds: number) => void
    /** Whether timed lyrics keep the line being sung in the middle. */
    follow?: boolean
    className?: string
    words?: Partial<LyricsWords>
}

/**
 * The lyrics of what plays, filling the box it is given and scrolling within it, as a panel beside
 * the player or the fullscreen view in the visualizer's place (`MediaBar`'s `lyrics`).
 *
 * Timed lyrics follow `position`: the line being sung is inked and kept in the middle of the box,
 * the others faint, and before the first line the first waits there. Pressing a line seeks to it
 * through `onSeek`. While the reader scrolls, and for a few seconds after, the lyrics stay where
 * they put them; pressing a line follows again at once. Untimed lyrics read as a page from the
 * top, verse by verse, and follow nothing.
 *
 * `lyrics` takes LRC or plain text, read by `parseLyrics`, or lines it has already read. The
 * lines grow with the box: larger once it is as wide as a tablet.
 */
export function Lyrics({ lyrics, position = 0, onSeek, follow = true, className, words }: LyricsProps) {
    const said = { ...LYRICS_WORDS, ...words }
    const read = useMemo(() => (typeof lyrics === 'string' ? parseLyrics(lyrics) : lyrics), [lyrics])
    const at = read.timed ? lyricLineAt(read.lines, position) : -1
    const box = useRef<HTMLDivElement | null>(null)
    const line = useRef<HTMLLIElement | null>(null)
    const { resume } = useFollow(line, at, { mode: 'center', enabled: follow && read.timed, scroller: box })

    return (
        <div
            data-slot="lyrics"
            role="region"
            aria-label={said.label}
            className={cn('@container relative h-full min-h-48 w-full min-w-0', className)}
        >
            <div ref={box} className={cn('absolute inset-0 overflow-y-auto overscroll-contain', read.timed && 'mask-y-from-85%')}>
                {read.lines.length === 0 ? (
                    <p className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">{said.none}</p>
                ) : read.timed ? (
                    <>
                        <div aria-hidden className="h-1/2" />
                        <ol className="mx-auto flex max-w-3xl flex-col px-6">
                            {read.lines.map((entry, index) => (
                                <li
                                    // Two lines of a chorus share their words, so the place tells them apart.
                                    key={`${String(index)}:${entry.text}`}
                                    ref={index === Math.max(0, at) ? line : undefined}
                                    className={cn(entry.text === '' && 'h-6')}
                                >
                                    {entry.text !== '' && (
                                        <Line
                                            entry={entry}
                                            current={index === at}
                                            onSeek={
                                                onSeek === undefined || entry.time === undefined
                                                    ? undefined
                                                    : () => {
                                                          resume()
                                                          onSeek(entry.time ?? 0)
                                                      }
                                            }
                                        />
                                    )}
                                </li>
                            ))}
                        </ol>
                        <div aria-hidden className="h-1/2" />
                    </>
                ) : (
                    <div className="mx-auto flex max-w-prose flex-col gap-6 px-6 py-8">
                        {verses(read.lines).map((verse, index) => (
                            <p key={index} className="text-base leading-relaxed text-foreground @3xl:text-page">
                                {verse.map((entry, at) => (
                                    <span key={at} className="block">
                                        {entry.text}
                                    </span>
                                ))}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

/** One timed line: inked while sung and faint otherwise, a button that seeks to it when it can. */
function Line({ entry, current, onSeek }: { entry: LyricLine; current: boolean; onSeek?: () => void }) {
    const look = cn(
        'block w-full py-1.5 text-left text-page font-semibold tracking-tight transition-colors duration-300 motion-reduce:transition-none @3xl:text-stat',
        current ? 'text-foreground' : 'text-faint',
    )
    if (onSeek === undefined) {
        return (
            <p aria-current={current || undefined} className={look}>
                {entry.text}
            </p>
        )
    }
    return (
        <button
            type="button"
            aria-current={current || undefined}
            onClick={onSeek}
            className={cn(
                look,
                'cursor-pointer rounded-control outline-none focus-visible:bg-hover',
                !current && 'hover:text-muted-foreground',
            )}
        >
            {entry.text}
        </button>
    )
}

/** Untimed lines in their verses, split at the blank lines between them. */
function verses(lines: readonly LyricLine[]): LyricLine[][] {
    const found: LyricLine[][] = [[]]
    for (const entry of lines) {
        if (entry.text === '') found.push([])
        else found[found.length - 1].push(entry)
    }
    return found.filter((verse) => verse.length > 0)
}
