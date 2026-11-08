/**
 * Lyrics as lines, read from LRC or plain text. LRC times each line with one or more stamps before
 * it, `[mm:ss.xx]`, and may carry metadata tags such as `[ar:Ada]` and an `[offset:+250]` in
 * milliseconds that moves every line earlier. Pure, so which line is sung at a position has tests
 * and `Lyrics` only draws it.
 */

/** One line, and the second it is sung at when the lyrics are timed. */
export interface LyricLine {
    text: string
    /** Seconds from the start; absent on untimed lyrics. */
    time?: number
}

export interface ParsedLyrics {
    /** Timed lines in the order they are sung; untimed ones in the order written, blank lines between verses kept. */
    lines: readonly LyricLine[]
    /** Whether the lines follow the music: some line is sung after the start. */
    timed: boolean
    /** The metadata tags, keyed in lower case: `ti` the title, `ar` the artist, `al` the album, `length`, `offset` and the rest. */
    tags: Readonly<Record<string, string>>
}

/** The tags LRC defines; a bracketed line with another name, such as `[Chorus: Ada]`, is a line of the lyrics. */
const TAGS = new Set(['ti', 'ar', 'al', 'au', 'by', 're', 've', 'tool', 'length', 'offset', 'la', 'lang', '#'])

const TAG = /^\[([A-Za-z#]+)\s*:(.*)\]$/

/** `[m:ss]` with an optional fraction after a point or a colon: `[01:02.5]`, `[01:02.50]`, `[01:02:500]`. */
const STAMP = /^\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]\s*/

/** A word's own time in enhanced LRC, `<01:02.50>`, dropped from the text. */
const WORD_STAMP = /<\d+:\d{1,2}(?:[.:]\d{1,3})?>\s*/g

/** The seconds a stamp says; the fraction is decimal, so `.5` is half a second. */
function secondsOf(match: RegExpExecArray): number {
    const fraction = match[3] === undefined ? 0 : Number(match[3].padEnd(3, '0')) / 1000
    return Number(match[1]) * 60 + Number(match[2]) + fraction
}

/** `lines` with blank runs closed up to one blank line and none at either end. */
function settle(lines: LyricLine[]): LyricLine[] {
    const kept: LyricLine[] = []
    for (const line of lines) {
        if (line.text === '' && (kept.length === 0 || kept[kept.length - 1].text === '')) continue
        kept.push(line)
    }
    while (kept.length > 0 && kept[kept.length - 1].text === '') kept.pop()
    return kept
}

/**
 * Lyrics read from `text`. A line may carry several stamps, `[00:12.00][01:30.00] the chorus`,
 * and is sung at each of them. When some line is sung after the start the lyrics are timed: the
 * stamped lines in the order they are sung, the `offset` tag applied, and unstamped lines left
 * out. Otherwise they are untimed, every line in the order written, as a page to read; that covers
 * plain text and LRC whose stamps are all at zero.
 */
export function parseLyrics(text: string): ParsedLyrics {
    const tags: Record<string, string> = {}
    const stamped: { text: string; time: number; order: number }[] = []
    const plain: LyricLine[] = []
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        const tag = TAG.exec(line)
        if (tag !== null && TAGS.has(tag[1].toLowerCase())) {
            tags[tag[1].toLowerCase()] = tag[2].trim()
            continue
        }
        const times: number[] = []
        let rest = line
        for (let match = STAMP.exec(rest); match !== null; match = STAMP.exec(rest)) {
            times.push(secondsOf(match))
            rest = rest.slice(match[0].length)
        }
        const words = rest.replace(WORD_STAMP, '').trim()
        plain.push({ text: words })
        for (const time of times) stamped.push({ text: words, time, order: stamped.length })
    }
    const timed = stamped.some((line) => line.time > 0)
    if (!timed) return { lines: settle(plain), timed: false, tags }
    const offset = Number(tags.offset ?? 0) / 1000
    const lines = stamped
        .toSorted((one, other) => one.time - other.time || one.order - other.order)
        .map((line) => ({ text: line.text, time: Math.max(0, line.time - (Number.isFinite(offset) ? offset : 0)) }))
    return { lines, timed: true, tags }
}

/** The line being sung at `position`: the last one started by then, or -1 before the first and on untimed lines. */
export function lyricLineAt(lines: readonly LyricLine[], position: number): number {
    let found = -1
    for (let index = 0; index < lines.length; index += 1) {
        const time = lines[index].time
        if (time === undefined) continue
        if (time > position) break
        found = index
    }
    return found
}
