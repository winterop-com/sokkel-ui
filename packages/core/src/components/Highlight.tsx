/** A span of a text by its character offsets: from `start`, up to but not including `end`. */
export interface HighlightRange {
    start: number
    end: number
}

/** A piece of a text, marked or not. */
export interface HighlightPart {
    text: string
    marked: boolean
}

/**
 * The text cut into pieces at the ranges, each piece marked or not. Ranges are held to the text,
 * empty ones are dropped, and ranges that overlap or touch are joined into one, in any order given.
 */
export function highlightParts(text: string, ranges: readonly HighlightRange[]): HighlightPart[] {
    const held = ranges
        .map((range) => ({
            start: Math.max(0, Math.min(text.length, Math.floor(range.start))),
            end: Math.max(0, Math.min(text.length, Math.floor(range.end))),
        }))
        .filter((range) => range.end > range.start)
        .sort((a, b) => a.start - b.start)
    const joined: HighlightRange[] = []
    for (const range of held) {
        const last = joined.at(-1)
        if (last !== undefined && range.start <= last.end) last.end = Math.max(last.end, range.end)
        else joined.push({ ...range })
    }
    const parts: HighlightPart[] = []
    let from = 0
    for (const range of joined) {
        if (range.start > from) parts.push({ text: text.slice(from, range.start), marked: false })
        parts.push({ text: text.slice(range.start, range.end), marked: true })
        from = range.end
    }
    if (from < text.length) parts.push({ text: text.slice(from), marked: false })
    return parts
}

/**
 * A text with spans of it marked, such as the words a search matched or the phrase a model picked
 * out. Give one span as `start` and `end`, or several as `ranges`; both are character offsets into
 * the text. The mark is the accent's tint under the accent's ink.
 */
export function Highlight({
    text,
    start,
    end,
    ranges = [],
    className,
}: {
    text: string
    /** Where the one marked span starts, with `end`. */
    start?: number
    /** Where the one marked span ends, not included. */
    end?: number
    /** Several marked spans, beside the one given by `start` and `end`. */
    ranges?: readonly HighlightRange[]
    className?: string
}) {
    const all = start !== undefined && end !== undefined ? [{ start, end }, ...ranges] : ranges
    return (
        <span className={className}>
            {highlightParts(text, all).map((part, index) =>
                part.marked ? (
                    <mark key={index} className="rounded-mini bg-primary/15 box-decoration-clone text-primary-ink">
                        {part.text}
                    </mark>
                ) : (
                    part.text
                ),
            )}
        </span>
    )
}
