/**
 * Several files as one timeline: a book or a long work split over files, each given by its length
 * in seconds, in the order they play. The listener scrubs, reads the clock and picks chapters on
 * the whole, while a media element plays one file at a time; these turn a position on the whole
 * into a file and an offset into it and back. Chapters are positions on the whole too, so one may
 * start in one file and end in another, and `chapterIndex` in `chapters` finds the one playing.
 */

/** Where a position on the whole falls: the file, by its index, and the seconds into it. */
export interface TimelinePlace {
    file: number
    offset: number
}

/** A length that is a finite number of seconds, or none. */
function length(seconds: number | undefined): number {
    return seconds !== undefined && Number.isFinite(seconds) && seconds > 0 ? seconds : 0
}

/** Where each file starts on the whole, in seconds. */
export function fileStarts(durations: readonly number[]): number[] {
    const starts: number[] = []
    let start = 0
    for (const duration of durations) {
        starts.push(start)
        start += length(duration)
    }
    return starts
}

/** The length of the whole, every file's together. */
export function timelineDuration(durations: readonly number[]): number {
    return durations.reduce((sum, duration) => sum + length(duration), 0)
}

/**
 * The file `position` falls in and the offset into it. A position where one file ends and the
 * next starts belongs to the next; one before the start is the start, and one at or past the end is
 * the end of the last file, which is where a finished book stands.
 */
export function fileAt(durations: readonly number[], position: number): TimelinePlace {
    if (durations.length === 0) return { file: 0, offset: 0 }
    const wanted = Number.isFinite(position) ? Math.max(0, position) : 0
    let start = 0
    for (let file = 0; file < durations.length; file += 1) {
        const end = start + length(durations[file])
        if (wanted < end) return { file, offset: wanted - start }
        start = end
    }
    const last = durations.length - 1
    return { file: last, offset: length(durations[last]) }
}

/** The position on the whole of `offset` seconds into `file`; a file the timeline does not have counts from the start. */
export function timelinePosition(durations: readonly number[], file: number, offset: number): number {
    const start = fileStarts(durations)[file] ?? 0
    return start + (Number.isFinite(offset) ? Math.max(0, offset) : 0)
}

/**
 * Chapters marked within each file, such as the chapters each part of a book carries, as chapters
 * on the whole: `chapters[file]` holds that file's, their starts counted from its own start, and
 * each comes back with its start moved by where its file starts.
 */
export function chaptersAcrossFiles<C extends { start: number }>(
    durations: readonly number[],
    chapters: readonly (readonly C[] | undefined)[],
): C[] {
    const starts = fileStarts(durations)
    return chapters.flatMap((within, file) => (within ?? []).map((chapter) => ({ ...chapter, start: (starts[file] ?? 0) + chapter.start })))
}
