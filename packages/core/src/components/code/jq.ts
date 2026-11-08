import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { LanguageSupport, StreamLanguage, syntaxTree, type StreamParser, type StringStream } from '@codemirror/language'

/** Where the tokenizer is: in code, in a string, or in a string's `\(...)`, which holds code again. */
type Frame = { kind: 'string' } | { kind: 'interpolation'; depth: number }

interface JqState {
    stack: Frame[]
    /** The last word was `def`, so the next name is a definition. */
    defining: boolean
}

const DEFINITION = new Set(['def'])
const CONTROL = new Set([
    'if',
    'then',
    'elif',
    'else',
    'end',
    'reduce',
    'foreach',
    'try',
    'catch',
    'label',
    'import',
    'include',
    'as',
    '__loc__',
])
const OPERATOR_WORDS = new Set(['and', 'or', 'not'])

const OPERATOR = /^(?:\?\/\/|\/\/=|\|=|\+=|-=|\*=|\/=|%=|\/\/|==|!=|<=|>=|[|,+\-*/%<>=?])/
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
const NAME = /^[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*/

function top(state: JqState): Frame | undefined {
    return state.stack[state.stack.length - 1]
}

function inString(stream: StringStream, state: JqState): string {
    if (stream.match('\\(')) {
        state.stack.push({ kind: 'interpolation', depth: 0 })
        return 'string.special'
    }
    if (stream.match(/^\\./)) return 'escape'
    if (stream.eat('"')) {
        state.stack.pop()
        return 'string'
    }
    stream.match(/^[^"\\]+/)
    return 'string'
}

function inCode(stream: StringStream, state: JqState): string | null {
    if (stream.eatSpace()) return null
    const frame = top(state)
    if (frame?.kind === 'interpolation') {
        if (stream.peek() === '(') frame.depth += 1
        if (stream.peek() === ')') {
            if (frame.depth === 0) {
                stream.next()
                state.stack.pop()
                return 'string.special'
            }
            frame.depth -= 1
        }
    }
    const defining = state.defining
    state.defining = false
    if (stream.eat('#')) {
        stream.skipToEnd()
        return 'comment'
    }
    if (stream.eat('"')) {
        state.stack.push({ kind: 'string' })
        return 'string'
    }
    if (stream.match(/^@[A-Za-z0-9_]+/)) return 'string.special'
    if (stream.match(/^\$(?:__loc__|[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*)/)) return 'variableName'
    if (stream.match(NUMBER)) return 'number'
    if (stream.match('..')) return 'operator'
    if (stream.match(/^\.[A-Za-z_][A-Za-z0-9_]*/)) return 'propertyName'
    if (stream.match(/^\."(?:[^"\\]|\\[^(])*"/)) return 'propertyName'
    if (stream.eat('.')) return 'operator'
    const name = stream.match(NAME) as RegExpMatchArray | null
    if (name !== null) {
        const word = name[0]
        if (DEFINITION.has(word)) {
            state.defining = true
            return 'definitionKeyword'
        }
        if (CONTROL.has(word)) return 'controlKeyword'
        if (OPERATOR_WORDS.has(word)) return 'operatorKeyword'
        if (word === 'true' || word === 'false') return 'bool'
        if (word === 'null') return 'null'
        return defining ? 'variableName.definition' : 'variableName.function'
    }
    if (stream.match(OPERATOR)) return 'operator'
    if (stream.match(/^[()[\]{}]/)) return 'bracket'
    if (stream.match(/^[:;]/)) return 'punctuation'
    stream.next()
    return 'invalid'
}

/** jq's grammar as tokens, written from the jq manual: one pass, line by line, strings and their interpolations kept across lines. */
export const jqParser: StreamParser<JqState> = {
    name: 'jq',
    startState: () => ({ stack: [], defining: false }),
    copyState: (state) => ({ stack: state.stack.map((frame) => ({ ...frame })), defining: state.defining }),
    token: (stream, state) => (top(state)?.kind === 'string' ? inString(stream, state) : inCode(stream, state)),
    languageData: { commentTokens: { line: '#' }, closeBrackets: { brackets: ['(', '[', '{', '"'] } },
}

/** jq's built-in filters, each with what it does. */
export const JQ_BUILTINS: readonly Completion[] = (
    [
        ['length', 'The length of a string, array or object; the absolute value of a number.'],
        ['keys', "An object's keys, sorted, or an array's indexes."],
        ['keys_unsorted', "An object's keys in their order."],
        ['values', 'The input unless it is null.'],
        ['has(key)', 'Whether the input has the key or index.'],
        ['in(object)', 'Whether the input is a key of the object.'],
        ['map(f)', 'Runs f on each item of an array and collects the results.'],
        ['map_values(f)', 'Runs f on each value of an object or array, keeping the keys.'],
        ['path(f)', 'The paths f selects, as arrays.'],
        ['paths', 'Every path in the input.'],
        ['getpath(path)', 'The value at the path.'],
        ['setpath(path; value)', 'The input with the value at the path set.'],
        ['del(f)', 'The input without what f selects.'],
        ['to_entries', 'An object as an array of {key, value}.'],
        ['from_entries', 'An array of {key, value} as an object.'],
        ['with_entries(f)', 'Runs f on each {key, value} of an object.'],
        ['select(f)', 'The input when f is true, else nothing.'],
        ['empty', 'No output at all.'],
        ['error(message)', 'Stops with an error carrying the message.'],
        ['add', 'Adds the items of an array together.'],
        ['any', 'Whether any item of an array is true.'],
        ['all', 'Whether every item of an array is true.'],
        ['flatten', 'An array of arrays as one array.'],
        ['range(n)', 'The numbers from 0 up to n.'],
        ['floor', 'A number rounded down.'],
        ['sqrt', "A number's square root."],
        ['tostring', 'The input as a string.'],
        ['tonumber', 'A string read as a number.'],
        ['type', 'The type of the input, as a string.'],
        ['sort', 'An array sorted.'],
        ['sort_by(f)', 'An array sorted by what f gives for each item.'],
        ['group_by(f)', 'An array grouped by what f gives for each item.'],
        ['unique', 'An array sorted with duplicates removed.'],
        ['unique_by(f)', 'An array with one item for each value f gives.'],
        ['min', 'The smallest item of an array.'],
        ['max', 'The largest item of an array.'],
        ['min_by(f)', 'The item for which f gives the smallest value.'],
        ['max_by(f)', 'The item for which f gives the largest value.'],
        ['reverse', 'An array or string in reverse.'],
        ['contains(x)', 'Whether the input contains x.'],
        ['inside(x)', 'Whether x contains the input.'],
        ['startswith(s)', 'Whether a string starts with s.'],
        ['endswith(s)', 'Whether a string ends with s.'],
        ['ltrimstr(s)', 'A string without s at its start.'],
        ['rtrimstr(s)', 'A string without s at its end.'],
        ['split(s)', 'A string split at each s.'],
        ['join(s)', 'The strings of an array joined with s between.'],
        ['ascii_downcase', 'A string in lowercase.'],
        ['ascii_upcase', 'A string in uppercase.'],
        ['test(regex)', 'Whether a string matches the regular expression.'],
        ['match(regex)', 'The matches of the regular expression.'],
        ['capture(regex)', "The regular expression's named groups as an object."],
        ['sub(regex; s)', 'A string with the first match replaced by s.'],
        ['gsub(regex; s)', 'A string with every match replaced by s.'],
        ['recurse', 'The input and everything inside it.'],
        ['env', 'The environment variables as an object.'],
        ['input', 'The next input.'],
        ['inputs', 'Every remaining input.'],
        ['debug', 'The input, also written to the error stream.'],
        ['tojson', 'The input as JSON text.'],
        ['fromjson', 'JSON text read as a value.'],
        ['now', 'The current time in seconds since the epoch.'],
        ['todate', 'Seconds since the epoch as an ISO 8601 date.'],
        ['fromdate', 'An ISO 8601 date as seconds since the epoch.'],
        ['limit(n; f)', 'The first n outputs of f.'],
        ['first', 'The first item of an array.'],
        ['last', 'The last item of an array.'],
        ['nth(n)', 'The nth item of an array.'],
        ['indices(s)', 'The indexes at which s occurs.'],
        ['isempty(f)', 'Whether f gives no output.'],
        ['objects', 'The input when it is an object.'],
        ['arrays', 'The input when it is an array.'],
        ['strings', 'The input when it is a string.'],
        ['numbers', 'The input when it is a number.'],
        ['tostream', 'The input as a stream of path and leaf pairs.'],
        ['fromstream(f)', 'A value built from a stream of path and leaf pairs.'],
        ['splits(regex)', 'The parts of a string between the matches.'],
        ['ascii', 'The character of a code point.'],
        ['explode', 'A string as an array of code points.'],
        ['implode', 'An array of code points as a string.'],
        ['abs', "A number's absolute value."],
    ] as const
).map(([signature, info]) => ({
    label: signature.replace(/\(.*$/, ''),
    detail: signature.includes('(') ? signature.slice(signature.indexOf('(')) : undefined,
    info,
    type: 'function',
}))

const KEYWORDS: readonly Completion[] = [...DEFINITION, ...CONTROL, ...OPERATOR_WORDS]
    .filter((word) => word !== '__loc__')
    .map((label) => ({ label, type: 'keyword' }))

/** The built-in filters and keywords, offered at a name outside strings and comments. */
function completeJq(context: CompletionContext): CompletionResult | null {
    const node = syntaxTree(context.state).resolveInner(context.pos, -1)
    if (/string|comment/.test(node.name)) return null
    const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/)
    if (word === null && !context.explicit) return null
    if (word !== null && context.state.sliceDoc(word.from - 1, word.from).match(/[.$@]/)) return null
    return { from: word?.from ?? context.pos, options: [...JQ_BUILTINS, ...KEYWORDS], validFor: /^[A-Za-z_][A-Za-z0-9_]*$/ }
}

export const jqLanguage = StreamLanguage.define(jqParser)

/** jq for the code editor: its highlighting, `#` comments, closing brackets and its built-in filters offered as completions. */
export function jq(): LanguageSupport {
    return new LanguageSupport(jqLanguage, jqLanguage.data.of({ autocomplete: completeJq }))
}
