/**
 * Chapters as the seconds each one starts at, in order from the start of what plays. The first
 * chapter starts where its start says; anything before it belongs to no chapter.
 */

/** How long into a chapter previous goes back to its start rather than to the chapter before. */
export const RESTART_AFTER = 3

/** The chapter playing at `position`: the last one started by then, or -1 before the first. */
export function chapterIndex(starts: readonly number[], position: number): number {
    let found = -1
    for (let index = 0; index < starts.length; index += 1) {
        if (starts[index] <= position) found = index
        else break
    }
    return found
}

/** Where chapter `index` starts and ends: at the next chapter's start, or at `duration` for the last. */
export function chapterSpan(starts: readonly number[], index: number, duration: number): { start: number; end: number } {
    const start = starts[index] ?? 0
    const end = index + 1 < starts.length ? starts[index + 1] : duration
    return { start, end: Math.max(start, end) }
}

/**
 * Where previous goes: the start of the chapter playing, or the start of the one before it within
 * the first `RESTART_AFTER` seconds of a chapter. Before the first chapter, the start of what plays.
 */
export function previousChapterStart(starts: readonly number[], position: number): number {
    const index = chapterIndex(starts, position)
    if (index < 0) return 0
    if (position - starts[index] > RESTART_AFTER || index === 0) return starts[index]
    return starts[index - 1]
}

/** Where next goes: the start of the chapter after the one playing, or `undefined` in the last. */
export function nextChapterStart(starts: readonly number[], position: number): number | undefined {
    return starts[chapterIndex(starts, position) + 1]
}

/** The part of `waveform`, levels across the whole of what plays, that falls between `start` and `end`. */
export function waveformSpan(waveform: readonly number[], duration: number, start: number, end: number): readonly number[] {
    if (duration <= 0 || waveform.length === 0) return waveform
    const from = Math.floor((start / duration) * waveform.length)
    const to = Math.ceil((end / duration) * waveform.length)
    return waveform.slice(from, Math.max(from + 1, to))
}
