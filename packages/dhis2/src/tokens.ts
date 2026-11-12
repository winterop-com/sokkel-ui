import type { StreamParser, StringStream } from '@codemirror/language'

/**
 * What DHIS2's two expression languages share as stream parsers: one grammar, read the same way.
 * Each token is named by a highlight tag the editor colors: `variableName.special` for a data item in
 * braces (`#{uid.uid}`, `A{name}`, `V{current_date}`) and for `[days]`, `variableName.function` for a
 * known function, `keyword` for `and`, `or`, `not`, `in`, `distinct` and the `deGroup:` tags,
 * `atom` for a wildcard, a reporting-rate metric and an upper-case word such as `SUM`, `bool`, `null`,
 * `number` (a date such as `2026-6-30` too), `string`, `comment`, `operator`, `bracket`,
 * `punctuation`, and `variableName` for every other name, a function or variable the editor was not
 * given among them.
 */

/** Where a line starts. */
export interface ExpressionState {
    /** Inside a block comment carried over from the line before. */
    comment: boolean
    /** Inside a data item's braces: the letters before its `{`, or null outside one. */
    item: string | null
    /** The last token was a `.` after a value, so the next name may be a function written after it. */
    member: boolean
}

/** The names one parser knows, as sets. */
interface Known {
    functions: ReadonlySet<string>
    variables: ReadonlySet<string>
}

const KEYWORDS: ReadonlySet<string> = new Set(['and', 'or', 'not', 'in', 'distinct'])

/** The counts a reporting rate item `R{dataSet.metric}` reads. */
const METRICS: ReadonlySet<string> = new Set([
    'REPORTING_RATE',
    'REPORTING_RATE_ON_TIME',
    'ACTUAL_REPORTS',
    'ACTUAL_REPORTS_ON_TIME',
    'EXPECTED_REPORTS',
])

const NAME = /^[A-Za-z_]\w*/
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
/** A date as `.minDate` and `.maxDate` take it, `2026-1-1`. */
const DATE = /^[1-9]\d{3}-[01]?\d-[0-3]?\d(?![\d.])/
/** The opening of a data item: a data element, attribute, constant, program data element, program indicator, indicator, group count, reporting rate, variable. */
const ITEM = /^(?:OUG|[#ACDINRVX])\{/
const CALLED = /^\s*\(/

const startState = (): ExpressionState => ({ comment: false, item: null, member: false })

const copyState = (state: ExpressionState): ExpressionState => ({ ...state })

/** The rest of a block comment, up to and including its close when it is on this line. */
function blockComment(stream: StringStream, state: ExpressionState): string {
    if (stream.skipTo('*/')) {
        stream.match('*/')
        state.comment = false
    } else {
        stream.skipToEnd()
    }
    return 'comment'
}

/** One token inside a data item's braces. */
function itemToken(stream: StringStream, state: ExpressionState, known: Known): string | null {
    const kind = state.item
    if (stream.eatSpace()) return null
    if (stream.eat('}')) {
        state.item = null
        return 'variableName.special'
    }
    if (stream.match(/^(?:deGroup|coGroup|co):/)) return 'keyword'
    if (stream.eat('*')) return 'atom'
    if (stream.eat('.') || stream.eat('&')) return 'punctuation'
    // A program rule variable's name may hold spaces, dashes and digits, so a word runs to a dot or the brace.
    const word = stream.match(/^[^\s.}*&]+/) as RegExpMatchArray | null
    if (word === null) {
        stream.next()
        return 'invalid'
    }
    if (kind === 'V') return known.variables.has(word[0]) ? 'variableName.special' : 'variableName'
    if (METRICS.has(word[0])) return 'atom'
    return 'variableName.special'
}

/** A name outside braces: a function when known and called, else a keyword, a literal or a name. */
function nameToken(stream: StringStream, known: Known, member: boolean): string {
    if (member) {
        const name = stream.match(NAME) as RegExpMatchArray
        return known.functions.has(`.${name[0]}`) && stream.match(CALLED, false) !== null ? 'variableName.function' : 'variableName'
    }
    const program = stream.match(/^d2:[A-Za-z_]\w*/) as RegExpMatchArray | null
    if (program !== null)
        return known.functions.has(program[0]) && stream.match(CALLED, false) !== null ? 'variableName.function' : 'variableName'
    const name = (stream.match(NAME) as RegExpMatchArray)[0]
    // A function named with a dot, `orgUnit.group`, is one name when it is known and called.
    const dotted = stream.match(/^\.([A-Za-z_]\w*)(?=\s*\()/, false) as RegExpMatchArray | null
    if (dotted !== null && known.functions.has(`${name}.${dotted[1]}`)) {
        stream.match(dotted[0])
        return 'variableName.function'
    }
    if (name === 'true' || name === 'false') return 'bool'
    if (name === 'null') return 'null'
    if (KEYWORDS.has(name)) return 'keyword'
    if (stream.match(CALLED, false) !== null) return known.functions.has(name) ? 'variableName.function' : 'variableName'
    if (/^[A-Z][A-Z0-9_]+$/.test(name)) return 'atom'
    return 'variableName'
}

/** One token of an expression. */
function expressionToken(stream: StringStream, state: ExpressionState, known: Known): string | null {
    // A data item never runs across lines, so one left open ends with its line.
    if (stream.sol()) state.item = null
    if (state.comment) return blockComment(stream, state)
    if (state.item !== null) return itemToken(stream, state, known)
    if (stream.eatSpace()) return null
    const member = state.member
    state.member = false
    if (stream.match('/*')) {
        state.comment = true
        return blockComment(stream, state)
    }
    if (stream.match(/^'(?:[^'\\]|\\.)*'/) || stream.match(/^"(?:[^"\\]|\\.)*"/)) return 'string'
    if (stream.match(/^['"].*/)) return 'invalid'
    const item = stream.match(ITEM) as RegExpMatchArray | null
    if (item !== null) {
        state.item = item[0].slice(0, -1)
        return 'variableName.special'
    }
    if (stream.match(/^\[[A-Za-z]\w*\]/)) return 'variableName.special'
    if (stream.match(/^PS_EVENTDATE:/)) return 'keyword'
    if (stream.match(DATE)) return 'number'
    if (stream.match(NAME, false) || stream.match(/^d2:/, false)) return nameToken(stream, known, member)
    if (stream.match(NUMBER)) return 'number'
    if (stream.eat('.')) {
        state.member = true
        return 'punctuation'
    }
    if (stream.match(/^[()[\]{}]/)) return 'bracket'
    if (stream.match(/^(?:[=!]==?|<=|>=|&&|\|\||[+\-*/%^<>!])/)) return 'operator'
    if (stream.eat(',')) return 'punctuation'
    stream.next()
    return 'invalid'
}

/** A stream parser for one of the languages, knowing those names. */
export function expressionParser(
    name: string,
    functions: readonly string[],
    variables: readonly string[],
): StreamParser<ExpressionState> & { name: string } {
    const known: Known = { functions: new Set(functions), variables: new Set(variables) }
    return {
        name,
        startState,
        copyState,
        token: (stream, state) => expressionToken(stream, state, known),
        languageData: {
            commentTokens: { block: { open: '/*', close: '*/' } },
            closeBrackets: { brackets: ['(', '[', '{', "'", '"'] },
        },
    }
}
