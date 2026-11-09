import { LanguageSupport, StreamLanguage, type StreamParser, type StringStream } from '@codemirror/language'

interface MarkdownState {
    /** The mark a fenced block opened with, while inside one. */
    fence: string | null
    /** A link's words were just read, so its address follows. */
    address: boolean
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

/** Markdown inside a line: links between notes, tags, code, strong and emphasized words, links and addresses. */
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
    if (stream.match(/^\[\[[^[\]\n]+\]\]/)) return 'link'
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
    stream.eatWhile(/[^[`*_~!(<h#\\]/)
    return null
}

/** Markdown's tokens, one line at a time, with a fenced block kept open across lines. */
export const markdownParser: StreamParser<MarkdownState> = {
    name: 'markdown',
    startState: () => ({ fence: null, address: false }),
    copyState: (state) => ({ ...state }),
    token: (stream, state) => {
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
