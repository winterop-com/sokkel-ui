import type { StringStream } from '@codemirror/language'

/**
 * What FHIRPath and CQL share as stream parsers. Each token is named by a highlight tag the editor
 * colors: `keyword`, `bool`, `null`, `number`, `string`, `comment`, `operator`, `bracket`,
 * `punctuation`, `variableName.function` for a function, `propertyName` for a member after a dot,
 * `variableName.special` for a name bound outside the program, and `variableName` for every other name.
 */

/** Where a line starts. */
export interface ProgramState {
    /** Inside a block comment carried over from the line before. */
    comment: boolean
    /** The last token was a `.`, so the next name is a member even when spelled like a keyword. */
    member: boolean
}

/** What one language spells its own way. */
export interface ProgramSyntax {
    keywords: ReadonlySet<string>
    operator: RegExp
    punctuation: RegExp
    number: RegExp
    /** A name written in quotes. */
    quotedName: RegExp
    /** A name bound outside the program, or null when the language has none. */
    binding: RegExp | null
}

/** A date, a time or a date-time written as a literal, `@2026-01-01T10:00:00Z` or `@T10:00`. */
const TEMPORAL =
    /^@(?:T\d{2}(?::\d{2}(?::\d{2}(?:\.\d+)?)?)?|\d{4}(?:-\d{2}(?:-\d{2})?)?(?:T(?:\d{2}(?::\d{2}(?::\d{2}(?:\.\d+)?)?)?)?(?:Z|[+-]\d{2}:\d{2})?)?)/

const NAME = /^[A-Za-z_]\w*/

export const startState = (): ProgramState => ({ comment: false, member: false })

export const copyState = (state: ProgramState): ProgramState => ({ ...state })

/** The rest of a block comment, up to and including its close when it is on this line. */
function blockComment(stream: StringStream, state: ProgramState): string {
    if (stream.skipTo('*/')) {
        stream.match('*/')
        state.comment = false
    } else {
        stream.skipToEnd()
    }
    return 'comment'
}

/** What a word is: a member after a dot, a function before a parenthesis, else a keyword or a name. */
function word(stream: StringStream, member: boolean, text: string, keywords: ReadonlySet<string>): string {
    const called = stream.match(/^\s*\(/, false) !== null
    if (member) return called ? 'variableName.function' : 'propertyName'
    if (keywords.has(text)) {
        if (text === 'true' || text === 'false') return 'bool'
        if (text === 'null') return 'null'
        return 'keyword'
    }
    return called ? 'variableName.function' : 'variableName'
}

/** One token of a program written in a language of this shape. */
export function programToken(stream: StringStream, state: ProgramState, syntax: ProgramSyntax): string | null {
    if (state.comment) return blockComment(stream, state)
    if (stream.eatSpace()) return null
    const member = state.member
    state.member = false
    if (stream.match('//')) {
        stream.skipToEnd()
        return 'comment'
    }
    if (stream.match('/*')) {
        state.comment = true
        return blockComment(stream, state)
    }
    if (stream.match(/^'(?:[^'\\]|\\.)*'/)) return 'string'
    if (stream.match(/^'(?:[^'\\]|\\.)*$/)) return 'invalid'
    if (stream.match(syntax.quotedName)) return 'variableName'
    if (syntax.binding !== null && stream.match(syntax.binding)) return 'variableName.special'
    if (stream.match(TEMPORAL)) return 'number'
    const name = stream.match(NAME) as RegExpMatchArray | null
    if (name !== null) return word(stream, member, name[0], syntax.keywords)
    if (stream.match(syntax.number)) return 'number'
    if (stream.match(/^[{}()[\]]/)) return 'bracket'
    if (stream.match(syntax.operator)) return 'operator'
    if (stream.eat('.')) {
        state.member = true
        return 'punctuation'
    }
    if (stream.match(syntax.punctuation)) return 'punctuation'
    stream.next()
    return 'invalid'
}

/** The comment marks both languages write, for the editor's toggle-comment commands. */
export const COMMENT_TOKENS = { line: '//', block: { open: '/*', close: '*/' } }
