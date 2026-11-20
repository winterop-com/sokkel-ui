import { LanguageSupport, StreamLanguage, type StreamParser, type StringStream } from '@codemirror/language'

interface MarkdownState {
    /** The mark a fenced block opened with, while inside one. */
    fence: string | null
    /** A link's words were just read, so its address follows. */
    address: boolean
    /** The frontmatter: not yet known (the first line decides), open, or done with (or never there). */
    front: 'start' | 'open' | 'done'
    /** Inside an HTML comment that runs over lines. */
    comment: boolean
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

/** An HTML comment, which `Markdown` never draws: to its end on this line, or to the line's end when it runs on. */
function comment(stream: StringStream, state: MarkdownState): string {
    const end = stream.string.indexOf('-->', stream.pos + (state.comment ? 0 : 4))
    if (end < 0) {
        state.comment = true
        stream.skipToEnd()
    } else {
        state.comment = false
        stream.pos = end + 3
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
    if (stream.match(/^==(?=[^\s=])[^\n]*?[^\s=]==/)) return 'inserted'
    if (stream.match('<!--', false)) return comment(stream, state)
    if (stream.match(/^(`+)[^`]+?\1/)) return 'monospace'
    if (stream.match(/^(\*\*|__)(?=\S)[^\n]*?\S\1/)) return 'strong'
    if (stream.match(/^([*_])(?=[^\s*_])[^\n]*?[^\s*_]\1(?![*_])/) || stream.match(/^([*_])[^\s*_]\1/)) return 'emphasis'
    if (stream.match(/^~~(?=\S)[^\n]*?\S~~/)) return 'strikethrough'
    if (stream.match(/^!?\[[^\]\n]*\](?=\()/)) {
        state.address = true
        return 'link'
    }
    if (stream.match(/^<https?:\/\/[^>\s]+>/) || stream.match(/^https?:\/\/[^\s)<]+/)) return 'url'
    if ((before === '' || /[\s([{"'“‘]/u.test(before)) && stream.match(TAG)) return 'labelName'
    if (stream.match(/^\\./)) return 'escape'
    stream.next()
    stream.eatWhile(/[^[`*_~!(<h#\\=]/)
    return null
}

/** Markdown's tokens, one line at a time, with a fenced block kept open across lines. */
export const markdownParser: StreamParser<MarkdownState> = {
    name: 'markdown',
    startState: () => ({ fence: null, address: false, front: 'start', comment: false }),
    copyState: (state) => ({ ...state }),
    blankLine: (state) => {
        // A document whose first line is blank has no frontmatter.
        if (state.front === 'start') state.front = 'done'
    },
    token: (stream, state) => {
        if (state.comment) return comment(stream, state)
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
