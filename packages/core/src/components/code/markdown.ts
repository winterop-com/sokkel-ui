import { LanguageSupport, StreamLanguage, type StreamParser, type StringStream } from '@codemirror/language'

interface MarkdownState {
    /** The mark a fenced block opened with, while inside one. */
    fence: string | null
    /** A link's words were just read, so its address follows. */
    address: boolean
    /** The frontmatter: not yet known (the first line decides), open, or done with (or never there). */
    front: 'start' | 'open' | 'done'
    /** Inside a comment that runs over lines: the `-->` or `%%` that closes it, or '' outside one. */
    comment: '' | '-->' | '%%'
}

/** A frontmatter line that reads as properties: blank, a comment, indented, a list item, or a key and a colon. */
const PROPERTY_LINE = /^(\s|#|- |-$|[\p{L}\p{N}_.-]+(?: [\p{L}\p{N}_.-]+){0,3}:(\s|$)|"[^"\n]*":(\s|$)|'[^'\n]*':(\s|$))/u

/** A property's key at a frontmatter line's start. */
const PROPERTY_KEY = /^(?:[\p{L}\p{N}_.-]+(?: [\p{L}\p{N}_.-]+){0,3}|"[^"\n]*"|'[^'\n]*')(?=:(\s|$))/u

/**
 * A line of the frontmatter, the YAML between a `---` on the document's first line and the next
 * `---` or `...`: the fences as punctuation, each key as a property. A line that reads as no property
 * ends it, so a document that opens with a rule and a sentence is read as markdown, as `Markdown` reads it.
 */
function frontmatter(stream: StringStream, state: MarkdownState): string | null | undefined {
    if (state.front === 'start') {
        if (!stream.match(/^---[ \t]*$/)) {
            state.front = 'done'
            return undefined
        }
        state.front = 'open'
        return 'processingInstruction'
    }
    if (state.front !== 'open') return undefined
    if (stream.match(/^(---|\.\.\.)[ \t]*$/)) {
        state.front = 'done'
        return 'processingInstruction'
    }
    if (!PROPERTY_LINE.test(stream.string)) {
        state.front = 'done'
        return undefined
    }
    if (stream.match(PROPERTY_KEY)) return 'propertyName'
    stream.skipToEnd()
    return null
}

/**
 * An HTML or `%%` comment, which `Markdown` never draws: to its end on this line, or to the line's
 * end when it runs on. `closer` is what closes it, given when it opens here.
 */
function comment(stream: StringStream, state: MarkdownState, closer?: '-->' | '%%'): string {
    const close = closer ?? state.comment
    if (close === '') return 'comment'
    const end = stream.string.indexOf(close, stream.pos + (closer === undefined ? 0 : closer === '-->' ? 4 : 2))
    if (end < 0) {
        state.comment = close
        stream.skipToEnd()
    } else {
        state.comment = ''
        stream.pos = end + close.length
    }
    return 'comment'
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const TAG = /^#[\p{L}\p{N}_/-]*[\p{L}_][\p{L}\p{N}_/-]*/u

/** What a line starts with: a fence, a heading, a rule, a quote or a list item. */
function lineStart(stream: StringStream, state: MarkdownState): string | null | undefined {
    const fence = (stream.match(FENCE, false) as RegExpMatchArray | null)?.[1]
    if (state.fence !== null) {
        const closes =
            fence !== undefined && fence[0] === state.fence[0] && fence.length >= state.fence.length && stream.string.trim() === fence
        if (closes) state.fence = null
        stream.skipToEnd()
        return closes ? 'processingInstruction' : 'monospace'
    }
    if (fence !== undefined) {
        state.fence = fence
        stream.skipToEnd()
        return 'processingInstruction'
    }
    if (stream.match(/^ {0,3}#{1,6}(?=\s|$)/)) {
        stream.skipToEnd()
        return 'heading'
    }
    if (stream.match(/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/)) return 'contentSeparator'
    if (stream.match(/^ {0,3}>\s?/)) return 'quote'
    if (stream.match(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/)) return 'list'
    return undefined
}

/** Where each kind of closing mark stands in one line, found once, so an opening mark finds its closer by search. */
interface Closers {
    line: string
    /** Each `==` with no space or `=` before it. */
    marked: number[]
    /** Each `**` and each `__` with no space before it. */
    stars: number[]
    unders: number[]
    /** Each `*` and each `_` with no space, `*` or `_` before it and no `*` or `_` after it. */
    star: number[]
    under: number[]
    /** Each `~~` with no space before it. */
    struck: number[]
    /** Each `]`. */
    bracket: number[]
}

let closersOf: Closers | undefined

/** The closing marks of a line, read in one pass and kept while its tokens are read. */
function closers(line: string): Closers {
    if (closersOf?.line === line) return closersOf
    const out: Closers = { line, marked: [], stars: [], unders: [], star: [], under: [], struck: [], bracket: [] }
    const solid = (at: number) => at >= 0 && !/\s/.test(line[at])
    for (let at = 0; at < line.length; at += 1) {
        const char = line[at]
        const next = line[at + 1]
        if (char === '=' && next === '=' && solid(at - 1) && line[at - 1] !== '=') out.marked.push(at)
        if (char === '*' && next === '*' && solid(at - 1)) out.stars.push(at)
        if (char === '_' && next === '_' && solid(at - 1)) out.unders.push(at)
        if ((char === '*' || char === '_') && solid(at - 1) && !/[*_]/.test(line[at - 1]) && !/[*_]/.test(next ?? '')) {
            ;(char === '*' ? out.star : out.under).push(at)
        }
        if (char === '~' && next === '~' && solid(at - 1)) out.struck.push(at)
        if (char === ']') out.bracket.push(at)
    }
    closersOf = out
    return out
}

/** The first of the sorted places at or after `from`, or undefined. */
function firstFrom(places: readonly number[], from: number): number | undefined {
    let low = 0
    let high = places.length
    while (low < high) {
        const middle = (low + high) >> 1
        if (places[middle] < from) low = middle + 1
        else high = middle
    }
    return places[low]
}

/** Moves the stream past a closing mark `length` long at `at`, if there is one; whether it did. */
function closeAt(stream: StringStream, at: number | undefined, length: number): boolean {
    if (at === undefined) return false
    stream.pos = at + length
    return true
}

/**
 * Markdown inside a line: links between notes and embeds, callout markers, highlights, comments, tags,
 * code, strong and emphasized words, links and addresses.
 */
function inline(stream: StringStream, state: MarkdownState): string | null {
    const address = state.address
    state.address = false
    if (address && stream.match(/^\([^)\s]*(?:\s+"[^"]*")?\)/)) return 'url'
    const before = stream.pos === 0 ? '' : stream.string[stream.pos - 1]
    // An underscore inside a word, as in a job's name, starts no emphasis.
    if (stream.peek() === '_' && /[\p{L}\p{N}]/u.test(before)) {
        stream.eatWhile(/[\p{L}\p{N}_]/u)
        return null
    }
    if (stream.match(/^!?\[\[[^[\]\n]+\]\]/)) return 'link'
    // A callout's marker, right after the quote's `>`: `[!warning]`, folded with `-` or `+`.
    if (stream.peek() === '[' && /^ {0,3}(?:>\s?)+$/.test(stream.string.slice(0, stream.pos)) && stream.match(/^\[![a-z][\w-]*\][+-]?/i))
        return 'keyword'
    // Each mark below closes at the first closer its kind has after it, found in the line's closers,
    // so a line of marks that never close is read in time in step with its length.
    const line = stream.string
    const at = stream.pos
    const char = line[at]
    if (
        char === '=' &&
        line[at + 1] === '=' &&
        /[^\s=]/.test(line[at + 2] ?? ' ') &&
        closeAt(stream, firstFrom(closers(line).marked, at + 3), 2)
    )
        return 'inserted'
    if (stream.match('<!--', false)) return comment(stream, state, '-->')
    if (char === '%' && line[at + 1] === '%' && before !== '\\') return comment(stream, state, '%%')
    if (stream.match(/^(`+)[^`]+?\1/)) return 'monospace'
    if ((char === '*' || char === '_') && line[at + 1] === char && /\S/.test(line[at + 2] ?? ' ')) {
        const table = char === '*' ? closers(line).stars : closers(line).unders
        if (closeAt(stream, firstFrom(table, at + 3), 2)) return 'strong'
    }
    if ((char === '*' || char === '_') && /[^\s*_]/.test(line[at + 1] ?? ' ')) {
        const table = char === '*' ? closers(line).star : closers(line).under
        if (closeAt(stream, firstFrom(table, at + 2), 1)) return 'emphasis'
    }
    if (stream.match(/^([*_])[^\s*_]\1/)) return 'emphasis'
    if (
        char === '~' &&
        line[at + 1] === '~' &&
        /\S/.test(line[at + 2] ?? ' ') &&
        closeAt(stream, firstFrom(closers(line).struck, at + 3), 2)
    )
        return 'strikethrough'
    const opens = char === '[' ? at : char === '!' && line[at + 1] === '[' ? at + 1 : -1
    if (opens >= 0) {
        // The words run to the first `]`; a link only when `(` follows that one.
        const end = firstFrom(closers(line).bracket, opens + 1)
        if (end !== undefined && line[end + 1] === '(' && closeAt(stream, end, 1)) {
            state.address = true
            return 'link'
        }
    }
    if (stream.match(/^<https?:\/\/[^>\s]+>/) || stream.match(/^https?:\/\/[^\s)<]+/)) return 'url'
    if ((before === '' || /[\s([{"'“‘]/u.test(before)) && stream.match(TAG)) return 'labelName'
    if (stream.match(/^\\./)) return 'escape'
    stream.next()
    stream.eatWhile(/[^[`*_~!(<h#\\=%]/)
    return null
}

/** Markdown's tokens, one line at a time, with a fenced block kept open across lines. */
export const markdownParser: StreamParser<MarkdownState> = {
    name: 'markdown',
    startState: () => ({ fence: null, address: false, front: 'start', comment: '' }),
    copyState: (state) => ({ ...state }),
    blankLine: (state) => {
        // A document whose first line is blank has no frontmatter.
        if (state.front === 'start') state.front = 'done'
    },
    token: (stream, state) => {
        if (state.comment !== '') return comment(stream, state)
        if (state.front !== 'done') {
            if (state.front === 'open' && !stream.sol()) {
                stream.skipToEnd()
                return null
            }
            const front = frontmatter(stream, state)
            if (front !== undefined) return front
        }
        if (stream.sol()) {
            const start = lineStart(stream, state)
            if (start !== undefined) return start
        }
        if (state.fence !== null) {
            stream.skipToEnd()
            return 'monospace'
        }
        return inline(stream, state)
    },
    languageData: { closeBrackets: { brackets: ['(', '[', '{', '`', '"'] } },
}

const markdownLanguage = StreamLanguage.define(markdownParser)

/** Markdown for the code editor, as notes and documents are written in it. */
export function markdown(): LanguageSupport {
    return new LanguageSupport(markdownLanguage)
}
