import { snippet, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { ensureSyntaxTree, type syntaxTree } from '@codemirror/language'
import type { Diagnostic } from '@codemirror/lint'
import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

import { literal, resolve, typeLabel, type JsonSchema } from '../schema/read'
import { pointer, valueAt, withoutDeferred, type DeferredValue, type Path, type SchemaIssue } from '../schema/issues'
import type { validate } from '../schema/validate'
import { type WordMessages, type WordsPart } from '../../lib/words'
import { writeCount } from '../../lib/numbers'

type SyntaxNode = ReturnType<typeof syntaxTree>['topNode']

/** The languages a schema can check. */
export type SchemaLanguage = 'json' | 'yaml'

/**
 * The YAML version a plain scalar is read by: `1.2` by its core schema; `1.1` as YAML 1.1 servers
 * read it, where yes, no, on, off, y and n are booleans, `010` is octal, `0b101` binary, `1_000` a
 * thousand and `1:30` ninety.
 */
export type YamlVersion = '1.1' | '1.2'

/** Where a value is written in the document, and its key when it has one. */
export interface Span {
    from: number
    to: number
    key?: { from: number; to: number }
    /** The value's path from the document's root. */
    path: Path
}

/** A document read into a value, with where each value is written, by JSON Pointer. */
export interface ReadDocument {
    value: unknown
    spans: Map<string, Span>
    /** Where the text stops being the language, when it does. */
    broken?: { from: number; to: number }
    /**
     * Each document of a YAML stream that holds more than one, the first included, with where its
     * values are written. `value` and `spans` are the first document's.
     */
    documents?: { value: unknown; spans: Map<string, Span> }[]
}

/** The words a schema check says, so an app can translate them: a phrase for each kind of issue (`sayIssue` picks it), the syntax error and the completion's mark. */
export interface CodeSchemaWords {
    /** A required property is missing, given its name. */
    required: (property: string) => string
    /** A property the schema does not know, given its name. */
    additional: (property: string) => string
    /** The value is not of the type, given the type's name (object, string). */
    type: (expected: string) => string
    /** The value is none of the allowed ones, given them listed as written. */
    enum: (values: string) => string
    /** The value is not the one allowed, given it as written. */
    const: (value: string) => string
    minimum: (limit: number) => string
    exclusiveMinimum: (limit: number) => string
    maximum: (limit: number) => string
    exclusiveMaximum: (limit: number) => string
    minLength: (count: number) => string
    maxLength: (count: number) => string
    pattern: (pattern: string) => string
    format: (format: string) => string
    minItems: (count: number) => string
    maxItems: (count: number) => string
    uniqueItems: string
    /** A deprecated key is used. */
    deprecatedKey: string
    /** The schema cannot be compiled, given why. */
    unchecked: (reason: string) => string
    /** A rule without words of its own, given the validator's message, its first letter capitalized. */
    other: (message: string) => string
    /** The text is not valid in the language. */
    syntax: (language: SchemaLanguage) => string
    /** Beside a deprecated key offered in completion. */
    deprecated: string
}

const counted = (count: number, unit: string) => `${writeCount(count)} ${count === 1 ? unit : `${unit}s`}`

export const SCHEMA_WORDS: CodeSchemaWords = {
    required: (property) => `Missing the property ${property}`,
    additional: (property) => `${property} is not a known property`,
    type: (expected) => `Expected ${/^[aeiou]/.test(expected) ? 'an' : 'a'} ${expected}`,
    enum: (values) => `Expected one of ${values}`,
    const: (value) => `Expected ${value}`,
    minimum: (limit) => `Must be at least ${writeCount(limit)}`,
    exclusiveMinimum: (limit) => `Must be more than ${writeCount(limit)}`,
    maximum: (limit) => `Must be at most ${writeCount(limit)}`,
    exclusiveMaximum: (limit) => `Must be less than ${writeCount(limit)}`,
    minLength: (count) => `Use at least ${counted(count, 'character')}`,
    maxLength: (count) => `Use at most ${counted(count, 'character')}`,
    pattern: (pattern) => `Must match ${pattern}`,
    format: (format) => `Expected the ${format} format`,
    minItems: (count) => `Needs at least ${counted(count, 'item')}`,
    maxItems: (count) => `Holds at most ${counted(count, 'item')}`,
    uniqueItems: 'Each item only once',
    deprecatedKey: 'Deprecated: still accepted, and may be removed in a later version',
    unchecked: (reason) => `The schema cannot be checked: ${reason}`,
    other: (message) => message,
    syntax: (language) => `Not valid ${language === 'json' ? 'JSON' : 'YAML'}`,
    deprecated: 'deprecated',
}

/** Where a catalog holds a code editor's schema checks's words, and the arguments its phrases name. */
export const SCHEMA_PART: WordsPart<CodeSchemaWords> = {
    id: 'schema',
    words: SCHEMA_WORDS,
    args: {
        required: 'property',
        additional: 'property',
        type: 'expected',
        enum: 'values',
        const: 'value',
        minimum: 'limit',
        exclusiveMinimum: 'limit',
        maximum: 'limit',
        exclusiveMaximum: 'limit',
        minLength: 'count',
        maxLength: 'count',
        pattern: 'pattern',
        format: 'format',
        minItems: 'count',
        maxItems: 'count',
        unchecked: 'reason',
        other: 'message',
        syntax: 'language',
    },
}

/** A code editor's schema checks's phrases as ICU messages in English, for the catalog. */
export const SCHEMA_MESSAGES: WordMessages<CodeSchemaWords> = {
    required: 'Missing the property {property}',
    additional: '{property} is not a known property',
    type: 'Expected {expected, select, array {an array} object {an object} integer {an integer} other {a {expected}}}',
    enum: 'Expected one of {values}',
    const: 'Expected {value}',
    minimum: 'Must be at least {limit, number}',
    exclusiveMinimum: 'Must be more than {limit, number}',
    maximum: 'Must be at most {limit, number}',
    exclusiveMaximum: 'Must be less than {limit, number}',
    minLength: 'Use at least {count, plural, one {# character} other {# characters}}',
    maxLength: 'Use at most {count, plural, one {# character} other {# characters}}',
    pattern: 'Must match {pattern}',
    format: 'Expected the {format} format',
    minItems: 'Needs at least {count, plural, one {# item} other {# items}}',
    maxItems: 'Holds at most {count, plural, one {# item} other {# items}}',
    unchecked: 'The schema cannot be checked: {reason}',
    other: '{message}',
    syntax: 'Not valid {language, select, json {JSON} other {YAML}}',
}

/** An issue in a few words, by its kind's phrase. */
export function sayIssue(words: CodeSchemaWords, issue: SchemaIssue): string {
    switch (issue.kind) {
        case 'required':
            return words.required(String(issue.path[issue.path.length - 1]))
        case 'additional':
            return words.additional(issue.property)
        case 'type':
            return words.type(issue.expected)
        case 'enum':
            return words.enum(issue.values.map(literal).join(', '))
        case 'const':
            return words.const(literal(issue.value))
        case 'minimum':
            return issue.exclusive ? words.exclusiveMinimum(issue.limit) : words.minimum(issue.limit)
        case 'maximum':
            return issue.exclusive ? words.exclusiveMaximum(issue.limit) : words.maximum(issue.limit)
        case 'minLength':
            return words.minLength(issue.limit)
        case 'maxLength':
            return words.maxLength(issue.limit)
        case 'pattern':
            return words.pattern(issue.pattern)
        case 'format':
            return issue.phrase ?? words.format(issue.format)
        case 'minItems':
            return words.minItems(issue.limit)
        case 'maxItems':
            return words.maxItems(issue.limit)
        case 'uniqueItems':
            return words.uniqueItems
        case 'deprecated':
            return words.deprecatedKey
        case 'unchecked':
            return words.unchecked(issue.reason)
        case 'other':
            return words.other(issue.message.charAt(0).toUpperCase() + issue.message.slice(1))
    }
}

const text = (state: EditorState, node: SyntaxNode) => state.sliceDoc(node.from, node.to)

/** Sets a key on an object as its own, so `__proto__` is a key like any other and never the object's prototype. */
function own(out: Record<string, unknown>, key: string, value: unknown): void {
    Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true })
}

function children(node: SyntaxNode): SyntaxNode[] {
    const out: SyntaxNode[] = []
    for (let child = node.firstChild; child !== null; child = child.nextSibling) out.push(child)
    return out
}

function firstError(node: SyntaxNode): SyntaxNode | null {
    const cursor = node.cursor()
    do if (cursor.type.isError) return cursor.node
    while (cursor.next())
    return null
}

/** A JSON tree read into a value. */
function readJson(state: EditorState, node: SyntaxNode, path: Path, spans: Map<string, Span>, key?: Span['key']): unknown {
    spans.set(pointer(path), { from: node.from, to: node.to, key, path })
    switch (node.name) {
        case 'Object': {
            const out: Record<string, unknown> = {}
            for (const property of children(node).filter((child) => child.name === 'Property')) {
                const name = property.getChild('PropertyName')
                const value = children(property).find((child) => child.name !== 'PropertyName' && child.name !== ':')
                if (name === null) continue
                const label = parseString(text(state, name))
                own(
                    out,
                    label,
                    value === undefined ? null : readJson(state, value, [...path, label], spans, { from: name.from, to: name.to }),
                )
            }
            return out
        }
        case 'Array':
            return children(node)
                .filter((child) => !['[', ']', ','].includes(child.name))
                .map((child, index) => readJson(state, child, [...path, index], spans))
        case 'String':
            return parseString(text(state, node))
        case 'Number':
            return Number(text(state, node))
        case 'True':
            return true
        case 'False':
            return false
        default:
            return null
    }
}

function parseString(source: string): string {
    try {
        return JSON.parse(source) as string
    } catch {
        return source.replace(/^"|"$/g, '')
    }
}

/** A plain YAML scalar as YAML 1.2's core schema reads it, or YAML 1.1's: null, a boolean, a number, else the string. */
export function yamlScalar(source: string, version: YamlVersion = '1.2'): unknown {
    const plain = source
        .split('\n')
        .map((line) => line.trim())
        .join(' ')
    if (/^(?:~|null|Null|NULL|)$/.test(plain)) return null
    if (version === '1.1') return yaml11Scalar(plain)
    if (/^(?:true|True|TRUE)$/.test(plain)) return true
    if (/^(?:false|False|FALSE)$/.test(plain)) return false
    if (/^[-+]?\d+$/.test(plain)) return Number(plain)
    if (/^0o[0-7]+$/.test(plain)) return Number.parseInt(plain.slice(2), 8)
    if (/^0x[0-9a-fA-F]+$/.test(plain)) return Number.parseInt(plain.slice(2), 16)
    if (/^[-+]?(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][-+]?\d+)?$/.test(plain)) return Number(plain)
    if (/^[-+]?\.(?:inf|Inf|INF)$/.test(plain)) return plain.startsWith('-') ? -Infinity : Infinity
    if (/^\.(?:nan|NaN|NAN)$/.test(plain)) return Number.NaN
    return plain
}

/** A plain scalar, not null, as YAML 1.1's types read it; an underscore in a number is only a separator. */
function yaml11Scalar(plain: string): unknown {
    if (/^(?:y|Y|yes|Yes|YES|on|On|ON|true|True|TRUE)$/.test(plain)) return true
    if (/^(?:n|N|no|No|NO|off|Off|OFF|false|False|FALSE)$/.test(plain)) return false
    const sign = plain.startsWith('-') ? -1 : 1
    const digits = plain.replace(/^[-+]/, '').replaceAll('_', '')
    if (/^[-+]?0b[01_]+$/.test(plain)) return sign * Number.parseInt(digits.slice(2), 2)
    if (/^[-+]?0x[0-9a-fA-F_]+$/.test(plain)) return sign * Number.parseInt(digits.slice(2), 16)
    if (/^[-+]?0[0-7_]+$/.test(plain)) return sign * Number.parseInt(digits, 8)
    if (/^[-+]?(?:0|[1-9][\d_]*)$/.test(plain)) return sign * Number(digits)
    // Sexagesimal, base 60: 1:30 is 90, and 1:30.5 is 90.5.
    if (/^[-+]?[1-9][\d_]*(?::[0-5]?\d)+$/.test(plain) || /^[-+]?\d[\d_]*(?::[0-5]?\d)+\.[\d_]*$/.test(plain))
        return sign * digits.split(':').reduce((sum, part) => sum * 60 + Number(part), 0)
    if (/^[-+]?(?:\d[\d_]*\.[\d_]*|\.\d[\d_]*)(?:[eE][-+]?\d+)?$/.test(plain)) return sign * Number(digits)
    if (/^[-+]?\.(?:inf|Inf|INF)$/.test(plain)) return sign * Infinity
    if (/^\.(?:nan|NaN|NAN)$/.test(plain)) return Number.NaN
    return plain
}

function yamlQuoted(source: string): string {
    if (source.startsWith("'")) return source.slice(1, -1).replaceAll("''", "'")
    try {
        return JSON.parse(source.replace(/\n\s*/g, ' ')) as string
    } catch {
        return source.slice(1, -1)
    }
}

function yamlBlock(state: EditorState, node: SyntaxNode): string {
    const header = node.getChild('BlockLiteralHeader')
    const content = node.getChild('BlockLiteralContent')
    if (content === null) return ''
    const lines = text(state, content).split('\n')
    const indent = Math.min(...lines.filter((line) => line.trim() !== '').map((line) => /^ */.exec(line)?.[0].length ?? 0))
    const body = lines.map((line) => line.slice(indent))
    const folded = header !== null && text(state, header).startsWith('>')
    const joined = folded ? body.join(' ').replace(/ {2,}/g, ' ') : body.join('\n')
    return `${joined.replace(/\n+$/, '')}\n`
}

/** The values a YAML document's anchors name, by name, as they are read in order. */
type Anchors = Map<string, unknown>

/** Whether a mapping's pair is a merge key, `<<`, whose mappings fill the keys it does not set itself. */
const isMerge = (state: EditorState, name: SyntaxNode) => name.firstChild?.name === 'Literal' && text(state, name).trim() === '<<'

/** A YAML tree read into a value, an alias as the value its anchor names. */
function readYaml(
    state: EditorState,
    node: SyntaxNode | null,
    path: Path,
    spans: Map<string, Span>,
    anchors: Anchors,
    version: YamlVersion,
    key?: Span['key'],
): unknown {
    if (node === null) {
        // A key with nothing after it holds null, written where its key is.
        if (key !== undefined) spans.set(pointer(path), { from: key.from, to: key.to, key, path })
        return null
    }
    if (node.name === 'Tagged' || node.name === 'Anchored') {
        const inner = children(node).find((child) => !['Tag', 'Anchor'].includes(child.name)) ?? null
        const value = readYaml(state, inner, path, spans, anchors, version, key)
        const anchor = node.getChild('Anchor')
        if (anchor !== null) anchors.set(text(state, anchor).slice(1), value)
        return value
    }
    spans.set(pointer(path), { from: node.from, to: node.to, key, path })
    switch (node.name) {
        case 'BlockMapping':
        case 'FlowMapping': {
            const out: Record<string, unknown> = {}
            const merged: Record<string, unknown>[] = []
            for (const pair of children(node).filter((child) => child.name === 'Pair')) {
                const name = pair.getChild('Key')
                const value = children(pair).find((child) => !['Key', ':', 'Comment'].includes(child.name)) ?? null
                if (name === null) continue
                if (isMerge(state, name)) {
                    const from = readYaml(state, value, path, new Map(), anchors, version)
                    for (const one of Array.isArray(from) ? from : [from])
                        if (one !== null && typeof one === 'object' && !Array.isArray(one)) merged.push(one as Record<string, unknown>)
                    continue
                }
                const scalar = name.firstChild
                const label =
                    scalar?.name === 'QuotedLiteral' ? yamlQuoted(text(state, scalar)) : text(state, name).trim().replace(/\s+/g, ' ')
                own(out, label, readYaml(state, value, [...path, label], spans, anchors, version, { from: name.from, to: name.to }))
            }
            if (merged.length === 0) return out
            // The mapping's own keys win, then the merged mappings in the order they are listed.
            const all: Record<string, unknown> = {}
            for (const one of [...[...merged].reverse(), out]) for (const [name, held] of Object.entries(one)) own(all, name, held)
            return all
        }
        case 'BlockSequence':
        case 'FlowSequence':
            return children(node)
                .filter((child) => child.name === 'Item')
                .map((item, index) => {
                    const value = children(item).find((child) => child.name !== 'Comment') ?? null
                    return readYaml(state, value ?? item, [...path, index], spans, anchors, version)
                })
        case 'Alias':
            return anchors.get(text(state, node).slice(1)) ?? null
        case 'Item':
            return null
        case 'Literal':
            return yamlScalar(text(state, node), version)
        case 'QuotedLiteral':
            return yamlQuoted(text(state, node))
        case 'BlockLiteral':
            return yamlBlock(state, node)
        default:
            return null
    }
}

/** How a document is read: JSON, or YAML by one of its versions. */
type Reading = 'json' | `yaml ${YamlVersion}`

/** Documents already read, by their text and how they were read: a text is never changed, only replaced. */
const readings = new WeakMap<EditorState['doc'], Partial<Record<Reading, ReadDocument>>>()

/**
 * A JSON or YAML document read into a value, with where each value is written, YAML's plain
 * scalars by `yamlVersion`. Null when the document is too large to parse in the time given. A text
 * is read once per language and version, so the marks and the check of one edit share one reading.
 */
export function readDocument(
    state: EditorState,
    language: SchemaLanguage,
    timeout = 400,
    yamlVersion: YamlVersion = '1.2',
): ReadDocument | null {
    const reading: Reading = language === 'json' ? 'json' : `yaml ${yamlVersion}`
    const known = readings.get(state.doc)?.[reading]
    if (known !== undefined) return known
    const read = readTree(state, language, timeout, yamlVersion)
    if (read !== null) readings.set(state.doc, { ...readings.get(state.doc), [reading]: read })
    return read
}

function readTree(state: EditorState, language: SchemaLanguage, timeout: number, yamlVersion: YamlVersion): ReadDocument | null {
    const tree = ensureSyntaxTree(state, state.doc.length, timeout)
    if (tree === null) return null
    const spans = new Map<string, Span>()
    const error = firstError(tree.topNode)
    const broken = error === null ? undefined : { from: error.from, to: Math.max(error.to, Math.min(error.from + 1, state.doc.length)) }
    if (language === 'json') {
        const root = children(tree.topNode)[0] ?? null
        return { value: root === null ? undefined : readJson(state, root, [], spans), spans, broken }
    }
    const documents = tree.topNode.getChildren('Document').map((document, index) => {
        const root = children(document).find((child) => !['DirectiveEnd', 'DocEnd', 'Comment', 'Directive'].includes(child.name)) ?? null
        const own = index === 0 ? spans : new Map<string, Span>()
        return { value: root === null ? null : readYaml(state, root, [], own, new Map(), yamlVersion), spans: own }
    })
    return {
        value: documents[0]?.value ?? null,
        spans,
        broken,
        ...(documents.length > 1 ? { documents } : {}),
    }
}

/** Where an issue sits: the value it names when that is one line, else its key, else the first line of the nearest value written above it. */
function place(issue: SchemaIssue, spans: Map<string, Span>, state: EditorState): { from: number; to: number } {
    const target: Path =
        issue.kind === 'additional' ? [...issue.path, issue.property] : issue.kind === 'required' ? issue.path.slice(0, -1) : issue.path
    const whole = issue.kind !== 'additional' && issue.kind !== 'required'
    for (let depth = target.length; depth >= 0; depth -= 1) {
        const span = spans.get(pointer(target.slice(0, depth)))
        if (span === undefined) continue
        const line = state.doc.lineAt(span.from)
        if (whole && depth === target.length && span.to <= line.to && !/^[[{]/.test(state.sliceDoc(span.from, span.from + 1))) return span
        if (span.key !== undefined) return span.key
        return { from: span.from, to: Math.min(span.to, line.to) }
    }
    const first = state.doc.line(1)
    return { from: first.from, to: first.to }
}

/**
 * What a schema finds wrong with a JSON or YAML document, as diagnostics on the text, checked by
 * `check`: `validate`, passed in so this module carries no checker of its own.
 */
export function schemaDiagnostics(
    state: EditorState,
    language: SchemaLanguage,
    schema: JsonSchema,
    check: typeof validate,
    words: CodeSchemaWords = SCHEMA_WORDS,
    deferred?: DeferredValue,
    yamlVersion: YamlVersion = '1.2',
): PathDiagnostic[] {
    if (state.doc.length === 0) return []
    const read = readDocument(state, language, undefined, yamlVersion)
    if (read === null) return []
    if (read.broken !== undefined) return [{ ...read.broken, severity: 'error', message: words.syntax(language) }]
    // Each document of a stream is checked against the schema on its own.
    return (read.documents ?? [read]).flatMap(({ value, spans }) =>
        withoutDeferred(check(schema, value), value, deferred).map((issue) => ({
            ...place(issue, spans, state),
            severity: issue.tone === 'critical' ? ('error' as const) : ('warning' as const),
            message: sayIssue(words, issue),
            path: issue.kind === 'additional' ? [...issue.path, issue.property] : issue.path,
        })),
    )
}

/**
 * What the schema check shows while its checker may not be there: what `check` finds once it has
 * loaded; before that, where the text stops being the language, if it does, else one error at the
 * start that the schema cannot be checked when the checker failed to load (`failed` saying why),
 * so the check fails closed; and undefined while it loads, nothing being known yet.
 */
export function schemaProblems(
    state: EditorState,
    language: SchemaLanguage,
    schema: JsonSchema,
    check: typeof validate | undefined,
    failed: string | null,
    words: CodeSchemaWords = SCHEMA_WORDS,
    deferred?: DeferredValue,
    yamlVersion: YamlVersion = '1.2',
): PathDiagnostic[] | undefined {
    if (check !== undefined) return schemaDiagnostics(state, language, schema, check, words, deferred, yamlVersion)
    if (state.doc.length === 0) return []
    const broken = readDocument(state, language, undefined, yamlVersion)?.broken
    if (broken !== undefined) return [{ ...broken, severity: 'error', message: words.syntax(language) }]
    if (failed === null) return undefined
    const first = state.doc.line(1)
    const issue: SchemaIssue = { kind: 'unchecked', reason: failed, path: [], tone: 'critical' }
    return [{ from: first.from, to: first.to, severity: 'error', message: sayIssue(words, issue), path: [] }]
}

/** A diagnostic with the path of the value it is about, when a schema check found it. */
export type PathDiagnostic = Diagnostic & { path?: Path }

/**
 * Where the value at a path is written in a JSON or YAML document, its key included; null when the
 * document has no such value or cannot be read.
 */
export function pathRange(state: EditorState, language: SchemaLanguage, path: Path): { from: number; to: number } | null {
    const read = readDocument(state, language)
    if (read === null) return null
    const span = read.spans.get(pointer(path))
    if (span === undefined) return null
    return { from: span.key?.from ?? span.from, to: span.to }
}

/** Where the cursor is in the document's structure: the path to the object or array it is in, and whether it is at a key or a value. */
export interface Slot {
    path: Path
    at: 'key' | 'value'
    /** The key whose value is being written, at a value. */
    key?: string
    /** Where the word being completed starts. */
    from: number
    /** The cursor is inside a JSON string, after its opening quote. */
    quoted: boolean
}

type Frame = { kind: 'object'; key?: string; slot: 'key' | 'value' } | { kind: 'array'; index: number }

/** The slot at a position in JSON, read by scanning the text before it, so a half-written document works. */
export function jsonSlot(source: string, pos: number): Slot | null {
    const stack: Frame[] = []
    let stringStart = -1
    for (let index = 0; index < pos; index += 1) {
        const char = source[index]
        if (stringStart >= 0) {
            if (char === '\\') index += 1
            else if (char === '"') {
                const top = stack[stack.length - 1]
                if (top?.kind === 'object' && top.slot === 'key') top.key = parseString(source.slice(stringStart, index + 1))
                stringStart = -1
            }
            continue
        }
        const top = stack[stack.length - 1]
        if (char === '"') stringStart = index
        else if (char === '{') stack.push({ kind: 'object', slot: 'key' })
        else if (char === '[') stack.push({ kind: 'array', index: 0 })
        else if (char === '}' || char === ']') stack.pop()
        else if (char === ':' && top?.kind === 'object') top.slot = 'value'
        else if (char === ',' && top?.kind === 'object') {
            top.slot = 'key'
            top.key = undefined
        } else if (char === ',' && top?.kind === 'array') top.index += 1
    }
    const top = stack[stack.length - 1]
    if (top === undefined) return null
    const path: Path = stack.slice(0, -1).map((frame) => (frame.kind === 'object' ? (frame.key ?? '') : frame.index))
    const quoted = stringStart >= 0
    const from = quoted ? stringStart + 1 : pos - (/[\w-]*$/.exec(source.slice(0, pos))?.[0].length ?? 0)
    if (top.kind === 'array') return { path: [...path, top.index], at: 'value', from, quoted }
    if (top.slot === 'key') return { path, at: 'key', from, quoted }
    return { path, at: 'value', key: top.key, from, quoted }
}

/** The columns a YAML line opens: its dashes and its key, each with the column it starts at. */
function yamlLine(line: string): { dashes: number[]; key?: { name: string; column: number; open: boolean }; content: number } {
    const dashes: number[] = []
    let column = /^ */.exec(line)?.[0].length ?? 0
    for (let match = /^-(?: +|$)/.exec(line.slice(column)); match !== null; match = /^-(?: +|$)/.exec(line.slice(column))) {
        dashes.push(column)
        column += match[0].length
    }
    const key = /^("(?:[^"\\]|\\.)*"|'[^']*'|[^\s:#][^:#]*?)\s*:(?:\s+|$)(.*)$/.exec(line.slice(column))
    if (key === null) return { dashes, content: column }
    const name = key[1].startsWith('"') ? parseString(key[1]) : key[1].replace(/^'|'$/g, '')
    return { dashes, key: { name, column, open: key[2].replace(/#.*$/, '').trim() === '' }, content: column }
}

/** How many items of the list whose dashes stand at `column` come before the line, back to the list's own key. */
function itemsBefore(state: EditorState, lineNumber: number, column: number): number {
    let count = 0
    for (let number = lineNumber - 1; number >= 1; number -= 1) {
        const text = state.doc.line(number).text
        if (text.trim() === '' || text.trim().startsWith('#')) continue
        const parsed = yamlLine(text)
        const start = parsed.dashes[0] ?? parsed.content
        if (start < column) break
        if (parsed.dashes[0] === column) count += 1
    }
    return count
}

/** The slot at a position in YAML, read from the indentation of the lines above it, each list item at its own index. */
export function yamlSlot(state: EditorState, pos: number): Slot {
    const line = state.doc.lineAt(pos)
    const before = state.sliceDoc(line.from, pos)
    const here = yamlLine(before)
    const word = /[^\s:]*$/.exec(before)?.[0] ?? ''
    const from = pos - word.length
    const tail: Path = here.dashes.map((dash, index) => (index === 0 ? itemsBefore(state, line.number, dash) : 0))
    let target = here.dashes[0] ?? here.content
    const path: Path[] = []
    for (let number = line.number - 1; number >= 1 && target > 0; number -= 1) {
        const above = state.doc.line(number).text
        if (above.trim() === '' || above.trim().startsWith('#')) continue
        const parsed = yamlLine(above)
        const found: (string | number)[] = []
        if (parsed.key !== undefined && parsed.key.column < target && parsed.key.open) {
            found.unshift(parsed.key.name)
            target = parsed.key.column
        }
        for (const dash of [...parsed.dashes].reverse())
            if (dash < target) {
                found.unshift(dash === parsed.dashes[0] ? itemsBefore(state, number, dash) : 0)
                target = dash
            }
        if (found.length > 0) path.unshift(found)
    }
    const at = [...path.flat(), ...tail]
    if (here.key !== undefined && pos - line.from > here.key.column + here.key.name.length)
        return { path: at, at: 'value', key: here.key.name, from, quoted: false }
    return { path: at, at: 'key', from, quoted: false }
}

/** A schema with its local `$ref` followed, its `allOf` left in place. */
/** The schema an anchor names: the one carrying it as `$anchor` or `$dynamicAnchor`, the root first. */
function anchored(root: JsonSchema, name: string): JsonSchema | undefined {
    const seen = new Set<unknown>()
    const search = (node: unknown): JsonSchema | undefined => {
        if (typeof node !== 'object' || node === null || seen.has(node)) return undefined
        seen.add(node)
        const record = node as Record<string, unknown>
        if (!Array.isArray(node) && (record.$anchor === name || record.$dynamicAnchor === name)) return node as JsonSchema
        for (const child of Object.values(record)) {
            const found = search(child)
            if (found !== undefined) return found
        }
        return undefined
    }
    return search(root)
}

/** The schema a reference inside the document names: `#`, a JSON Pointer such as `#/$defs/step`, or an anchor such as `#meta`. */
function resolveLocal(root: JsonSchema, ref: string): JsonSchema | undefined {
    if (!ref.startsWith('#')) return undefined
    const rest = ref.slice(1)
    if (rest === '') return root
    // A reference with a broken percent escape names nothing, as the checker reads it.
    const decoded = (text: string): string | undefined => {
        try {
            return decodeURIComponent(text)
        } catch {
            return undefined
        }
    }
    if (!rest.startsWith('/')) {
        const anchor = decoded(rest)
        return anchor === undefined ? undefined : anchored(root, anchor)
    }
    let node: unknown = root
    for (const raw of rest.slice(1).split('/')) {
        const part = decoded(raw)?.replaceAll('~1', '/').replaceAll('~0', '~')
        if (part === undefined) return undefined
        if (typeof node !== 'object' || node === null) return undefined
        node = (node as Record<string, unknown>)[part]
    }
    return typeof node === 'object' && node !== null && !Array.isArray(node) ? (node as JsonSchema) : undefined
}

function followRef(schema: JsonSchema, root: JsonSchema): JsonSchema {
    let current = schema
    for (let hops = 0; hops < 16; hops += 1) {
        const ref =
            typeof current.$ref === 'string' ? current.$ref : typeof current.$dynamicRef === 'string' ? current.$dynamicRef : undefined
        if (ref === undefined) break
        const target = resolveLocal(root, ref)
        if (target === undefined) break
        const { $ref: _ref, $dynamicRef: _dynamic, ...rest } = current
        current = { ...target, ...rest }
    }
    return current
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function hasType(value: unknown, type: string): boolean {
    switch (type) {
        case 'object':
            return isRecord(value)
        case 'array':
            return Array.isArray(value)
        case 'integer':
            return typeof value === 'number' && Number.isInteger(value)
        case 'number':
            return typeof value === 'number'
        case 'null':
            return value === null
        default:
            return typeof value === type
    }
}

/** Whether a value meets an `if`: the parts a condition is written with (const, enum, type, required, properties, allOf, anyOf, not). */
export function satisfies(condition: JsonSchema, value: unknown): boolean {
    if (condition.const !== undefined && !same(condition.const, value)) return false
    if (condition.enum !== undefined && !condition.enum.some((one) => same(one, value))) return false
    if (condition.type !== undefined) {
        const types = Array.isArray(condition.type) ? condition.type : [condition.type]
        if (!types.some((type) => hasType(value, type))) return false
    }
    if (condition.required !== undefined && (!isRecord(value) || condition.required.some((key) => !(key in value)))) return false
    if (condition.properties !== undefined && isRecord(value))
        for (const [key, inner] of Object.entries(condition.properties)) if (key in value && !satisfies(inner, value[key])) return false
    if (condition.allOf !== undefined && !condition.allOf.every((part) => satisfies(part, value))) return false
    if (condition.anyOf !== undefined && !condition.anyOf.some((part) => satisfies(part, value))) return false
    const not = condition.not as JsonSchema | undefined
    if (not !== undefined && satisfies(not, value)) return false
    return true
}

/**
 * The schemas a value at the path may follow: one, each branch of a choice, each part of an
 * `allOf`, and a conditional's `then` or `else`. Given the `document`, each `if` is decided against
 * the value it is about, so only the branch that applies is followed; without it both are.
 */
export function schemasAt(schema: JsonSchema, path: Path, root: JsonSchema = schema, document?: { value: unknown }): JsonSchema[] {
    const expand = (each: JsonSchema, at: Path): JsonSchema[] => {
        const {
            allOf,
            if: test,
            then,
            else: otherwise,
            ...own
        } = followRef(each, root) as JsonSchema & {
            if?: JsonSchema
            then?: JsonSchema
            else?: JsonSchema
        }
        const out: JsonSchema[] = [own]
        for (const branch of [...(own.anyOf ?? []), ...(own.oneOf ?? [])]) out.push(...expand(branch, at))
        for (const part of allOf ?? []) out.push(...expand(part, at))
        if (typeof test === 'object' && test !== null) {
            const holds = document === undefined ? undefined : satisfies(test, valueAt(document.value, at))
            if (holds !== false && typeof then === 'object' && then !== null) out.push(...expand(then, at))
            if (holds !== true && typeof otherwise === 'object' && otherwise !== null) out.push(...expand(otherwise, at))
        }
        return out
    }
    let current = expand(schema, [])
    path.forEach((part, depth) => {
        const at = path.slice(0, depth + 1)
        current = current
            .flatMap((each) => {
                if (typeof part === 'number') {
                    const prefix = each.prefixItems as JsonSchema[] | undefined
                    return [prefix?.[part] ?? each.items].filter((item) => item !== undefined)
                }
                const named = each.properties?.[part]
                if (named !== undefined) return [named]
                return typeof each.additionalProperties === 'object' ? [each.additionalProperties] : []
            })
            .flatMap((each) => expand(each, at))
    })
    return current
}

/** A value written in YAML, a string quoted when either version would read it as something else. */
const quoteYaml = (value: unknown) =>
    typeof value === 'string' &&
    /^[\w./@-][\w ./@-]*$/.test(value) &&
    typeof yamlScalar(value) === 'string' &&
    typeof yamlScalar(value, '1.1') === 'string'
        ? value
        : literal(value)

/** The end of the JSON string that opens at `start`, just past its closing quote; one left open ends with its line. */
function stringEnd(source: string, start: number): number {
    let end = start + 1
    while (end < source.length && source[end] !== '"' && source[end] !== '\n') end += source[end] === '\\' ? 2 : 1
    return source[end] === '"' ? end + 1 : end
}

/** The keys of the JSON object around `pos`, without the key being written there. */
export function jsonKeys(source: string, pos: number): Set<string> {
    const found = new Set<string>()
    const opens: number[] = []
    let quote = -1
    for (let index = 0; index < pos; index += 1) {
        const char = source[index]
        if (quote >= 0) {
            if (char === '\\') index += 1
            else if (char === '"') quote = -1
            continue
        }
        if (char === '"') quote = index
        else if (char === '{' || char === '[') opens.push(index)
        else if (char === '}' || char === ']') opens.pop()
    }
    const open = opens[opens.length - 1]
    if (open === undefined || source[open] !== '{') return found
    let start = pos
    let end = pos
    if (quote >= 0) {
        start = quote
        end = stringEnd(source, quote)
    } else {
        while (start > open + 1 && /[\w$-]/.test(source[start - 1])) start -= 1
        while (end < source.length && /[\w$-]/.test(source[end])) end += 1
    }
    /** Each `"name":` at the object's own depth between two places, stopping where the object closes. */
    const scan = (from: number, to: number) => {
        let depth = 0
        let pending: string | null = null
        for (let index = from; index < to; index += 1) {
            const char = source[index]
            if (char === '"') {
                const close = stringEnd(source, index)
                if (depth === 0) pending = parseString(source.slice(index, close))
                index = close - 1
                continue
            }
            if (char === ':' && depth === 0 && pending !== null) found.add(pending)
            if (!/\s/.test(char)) pending = null
            if (char === '{' || char === '[') depth += 1
            else if (char === '}' || char === ']') {
                depth -= 1
                if (depth < 0) return
            }
        }
    }
    scan(open + 1, start)
    scan(end, source.length)
    return found
}

/** The keys a YAML mapping already holds beside the line at `pos`, read from the lines with the same key column. */
export function yamlKeys(state: EditorState, pos: number, column: number): Set<string> {
    const found = new Set<string>()
    const here = state.doc.lineAt(pos).number
    const startOf = (parsed: ReturnType<typeof yamlLine>) => parsed.dashes[0] ?? parsed.content
    for (let number = here - 1; number >= 1; number -= 1) {
        const text = state.doc.line(number).text
        if (text.trim() === '' || text.trim().startsWith('#')) continue
        const parsed = yamlLine(text)
        if (parsed.key?.column === column && startOf(parsed) <= column) found.add(parsed.key.name)
        if (startOf(parsed) < column) break
    }
    for (let number = here + 1; number <= state.doc.lines; number += 1) {
        const text = state.doc.line(number).text
        if (text.trim() === '' || text.trim().startsWith('#')) continue
        const parsed = yamlLine(text)
        if (startOf(parsed) < column) break
        if (parsed.key?.column === column && parsed.dashes.length === 0) found.add(parsed.key.name)
    }
    return found
}

/** An option as inserted: its text, and what to select of it once it is in. */
interface Option extends Completion {
    insert: string
    /** The schema marks the key deprecated: it is listed last, struck through. */
    deprecated?: boolean
    /** Offsets into `insert` to select, or the one place to leave the cursor. */
    select?: [number, number]
    /** A CodeMirror snippet put in instead of `insert`, its fields reached in turn with Tab. */
    template?: string
}

function types(schema: JsonSchema): string[] {
    if (Array.isArray(schema.type)) return schema.type
    if (schema.type !== undefined) return [schema.type]
    if (schema.properties !== undefined) return ['object']
    return []
}

/** Text put in a snippet as written: its braces escaped, so none starts a field. */
const snippetText = (text: string) => text.replace(/[{}]/g, '\\$&')

/** A snippet field holding `text`, numbered so two fields with the same text stay apart; a text with braces is put in as written. */
const field = (seq: number, text = '') =>
    /[{}]/.test(text) ? snippetText(text) : text === '' ? `\${${String(seq)}}` : `\${${String(seq)}:${text}}`

/** The value a required key is put in with: its default, its constant or first choice, or a field for the type it takes. */
function requiredValue(property: JsonSchema | undefined, root: JsonSchema, language: SchemaLanguage, seq: number): string {
    const resolved = property === undefined ? {} : resolve(property, root)
    const write = (value: unknown) => (language === 'json' ? literal(value) : quoteYaml(value))
    const given = resolved.default !== undefined ? resolved.default : resolved.const !== undefined ? resolved.const : resolved.enum?.[0]
    if (given !== undefined) return field(seq, write(given))
    const kinds = types(resolved)
    const kind = kinds.length === 1 ? kinds[0] : undefined
    if (kind === 'string') return language === 'json' ? `"${field(seq)}"` : field(seq)
    if (kind === 'number' || kind === 'integer') return field(seq, '0')
    if (kind === 'boolean') return field(seq, 'false')
    if (kind === 'object') return `${snippetText('{')}${field(seq)}${snippetText('}')}`
    if (kind === 'array') return `[${field(seq)}]`
    if (kind === 'null') return 'null'
    return field(seq)
}

/**
 * A key whose object has `required` keys, as a CodeMirror snippet that puts in the whole object
 * with each required key and a field for its value, reached in turn with Tab; undefined for an
 * object that requires nothing. `column` is where the key starts on its line and `indent` the
 * line's own indent, which the snippet adds to each line after the first.
 */
export function requiredSnippet(
    name: string,
    property: JsonSchema,
    root: JsonSchema,
    language: SchemaLanguage,
    column: number,
    indent: number,
): string | undefined {
    const resolved = resolve(property, root)
    const kinds = types(resolved)
    const required = (resolved.required ?? []).filter((key, index, all) => all.indexOf(key) === index)
    if (kinds.length !== 1 || kinds[0] !== 'object' || required.length === 0) return undefined
    const value = (key: string, index: number) => requiredValue(resolved.properties?.[key], root, language, index + 1)
    if (language === 'json') {
        const lines = required.map((key, index) => `\t${snippetText(JSON.stringify(key))}: ${value(key, index)}`)
        return `${snippetText(JSON.stringify(name))}: ${snippetText('{')}\n${lines.join(',\n')}\n${snippetText('}')}`
    }
    const pad = ' '.repeat(Math.max(0, column + 2 - indent))
    return [`${snippetText(name)}:`, ...required.map((key, index) => `${pad}${snippetText(key)}: ${value(key, index)}`)].join('\n')
}

/** A property's key as completed: with its default when it has one, else opened for the value it takes. */
function keyOption(
    name: string,
    property: JsonSchema,
    root: JsonSchema,
    language: SchemaLanguage,
    column: number,
    required: boolean,
    words: CodeSchemaWords,
    indent = 0,
): Option {
    const resolved = resolve(property, root)
    const kinds = types(resolved)
    const deprecated = resolved.deprecated === true
    const option = {
        label: name,
        detail: deprecated ? words.deprecated : typeLabel(property, root),
        info: resolved.description,
        type: 'property',
        boost: deprecated ? -99 : required ? 1 : 0,
        ...(deprecated ? { deprecated } : {}),
    }
    const template = resolved.default === undefined ? requiredSnippet(name, property, root, language, column, indent) : undefined
    if (template !== undefined) return { ...option, insert: '', template }
    if (language === 'json') {
        const head = `${JSON.stringify(name)}: `
        if (resolved.default !== undefined) {
            const value = literal(resolved.default)
            return { ...option, insert: head + value, select: [head.length, head.length + value.length] }
        }
        const empty =
            kinds.length !== 1
                ? undefined
                : kinds[0] === 'object'
                  ? '{}'
                  : kinds[0] === 'array'
                    ? '[]'
                    : kinds[0] === 'string' && resolved.enum === undefined
                      ? '""'
                      : undefined
        if (empty === undefined) return { ...option, insert: head }
        return { ...option, insert: head + empty, select: [head.length + 1, head.length + 1] }
    }
    const head = `${name}:`
    if (resolved.default !== undefined) {
        const value = quoteYaml(resolved.default)
        return { ...option, insert: `${head} ${value}`, select: [head.length + 1, head.length + 1 + value.length] }
    }
    const pad = ' '.repeat(column + 2)
    if (kinds.length === 1 && kinds[0] === 'object') return { ...option, insert: `${head}\n${pad}` }
    if (kinds.length === 1 && kinds[0] === 'array') return { ...option, insert: `${head}\n${pad}- ` }
    return { ...option, insert: `${head} ` }
}

/** The property names and values a schema allows where the cursor is. */
function schemaOptions(
    schema: JsonSchema,
    language: SchemaLanguage,
    slot: Slot,
    present: Set<string>,
    column: number,
    document?: { value: unknown },
    words: CodeSchemaWords = SCHEMA_WORDS,
    indent = 0,
): Option[] {
    const json = language === 'json'
    if (slot.at === 'key') {
        const seen = new Set<string>(present)
        return schemasAt(schema, slot.path, schema, document).flatMap((each) =>
            Object.entries(each.properties ?? {})
                .filter(([name]) => !seen.has(name) && seen.add(name) !== undefined)
                .map(([name, property]) =>
                    keyOption(name, property, schema, language, column, each.required?.includes(name) ?? false, words, indent),
                ),
        )
    }
    const path = slot.key === undefined ? slot.path : [...slot.path, slot.key]
    const values = schemasAt(schema, path, schema, document).flatMap((each) => {
        if (each.const !== undefined) return [each.const]
        if (each.enum !== undefined) return each.enum
        return types(each).includes('boolean') ? [true, false] : []
    })
    return [...new Set(values.map((value) => JSON.stringify(value)))].map((encoded) => {
        const value = JSON.parse(encoded) as unknown
        const written = json ? literal(value) : quoteYaml(value)
        return { label: typeof value === 'string' ? value : written, type: 'enum', insert: written }
    })
}

/**
 * Completes property names and enum values from a schema, for JSON or YAML. A key already in its
 * object is not offered again, a required one is listed first and a deprecated one last, marked
 * `deprecated`; a key is put in with its default
 * selected, or opened for the object, list or string it takes. A key whose object requires keys is
 * put in whole, as a snippet: each required key with its default or a field for its value, Tab
 * going from one field to the next.
 */
export function schemaCompletion(
    schema: () => JsonSchema | undefined,
    language: SchemaLanguage,
    words: () => CodeSchemaWords = () => SCHEMA_WORDS,
    yamlVersion: YamlVersion = '1.2',
) {
    return (context: CompletionContext): CompletionResult | null => {
        const current = schema()
        if (current === undefined) return null
        const source = context.state.doc.toString()
        const slot = language === 'json' ? jsonSlot(source, context.pos) : yamlSlot(context.state, context.pos)
        if (slot === null) return null
        if (slot.from === context.pos && !context.explicit && !(language === 'json' && slot.quoted)) return null
        const line = context.state.doc.lineAt(slot.from)
        const column = slot.from - line.from
        const indent = /^\s*/.exec(line.text)?.[0].length ?? 0
        const present =
            slot.at !== 'key'
                ? new Set<string>()
                : language === 'json'
                  ? jsonKeys(source, context.pos)
                  : yamlKeys(context.state, context.pos, column)
        // The document as written so far, so a conditional schema offers the keys of the branch that applies.
        const read = readDocument(context.state, language, 100, yamlVersion)
        const options = schemaOptions(
            current,
            language,
            slot,
            present,
            column,
            read === null ? undefined : { value: read.value },
            words(),
            indent,
        )
        if (options.length === 0) return null
        // Inside a JSON string an option replaces the whole string, its quotes included.
        const after = slot.quoted && context.state.sliceDoc(context.pos, context.pos + 1) === '"' ? 1 : 0
        return {
            from: slot.from,
            options: options.map(({ insert, select, template, ...option }) => ({
                ...option,
                apply: (view: EditorView, completion: Completion, from: number, to: number) => {
                    const start = slot.quoted ? from - 1 : from
                    if (template !== undefined) return snippet(template)(view, completion, start, to + after)
                    const [anchor, head] = select ?? [insert.length, insert.length]
                    view.dispatch({
                        changes: { from: start, to: to + after, insert },
                        selection: { anchor: start + anchor, head: start + head },
                        userEvent: 'input.complete',
                    })
                },
            })),
        }
    }
}

/** What the schema says of the key under the pointer: its type and its description. */
export function schemaHover(schema: () => JsonSchema | undefined, language: SchemaLanguage, yamlVersion: YamlVersion = '1.2') {
    return (view: EditorView, pos: number) => {
        const current = schema()
        if (current === undefined) return null
        const read = readDocument(view.state, language, 100, yamlVersion)
        if (read === null) return null
        const span = [...read.spans.values()].find((each) => each.key !== undefined && each.key.from <= pos && pos <= each.key.to)
        if (span?.key === undefined) return null
        const found = schemasAt(current, span.path, current, { value: read.value })
        const typed = found.find((each) => ['type', 'anyOf', 'oneOf', 'enum', 'const', 'properties'].some((key) => each[key] !== undefined))
        const description = found.find((each) => each.description !== undefined)?.description
        if (typed === undefined && description === undefined) return null
        const kind = typeLabel(typed ?? {}, current)
        return {
            pos: span.key.from,
            end: span.key.to,
            above: true,
            create: () => {
                const dom = document.createElement('div')
                dom.className = 'cm-hover'
                const detail = document.createElement('div')
                detail.className = 'cm-hover-detail'
                detail.textContent = kind
                dom.append(detail)
                if (description !== undefined) dom.append(description)
                return { dom }
            },
        }
    }
}

/**
 * The address of the schema a document names for itself: a top-level `$schema` key in JSON or
 * YAML, or a `# yaml-language-server: $schema=<address>` line in YAML.
 */
export function namedSchema(source: string, language: SchemaLanguage): string | undefined {
    if (language === 'yaml') {
        const line = /^#\s*yaml-language-server:\s*\$schema=(\S+)/m.exec(source)
        if (line !== null) return line[1]
        const key = /^(?:\$schema|"\$schema"|'\$schema')\s*:\s*["']?([^\s"'#]+)/m.exec(source)
        return key?.[1]
    }
    let depth = 0
    for (let index = 0; index < source.length; index += 1) {
        const char = source[index]
        if (char === '{' || char === '[') depth += 1
        else if (char === '}' || char === ']') depth -= 1
        else if (char === '"') {
            const end = stringEnd(source, index)
            const name = source.slice(index, end)
            index = end - 1
            if (depth !== 1 || name !== '"$schema"') continue
            const value = /^\s*:\s*("(?:[^"\\]|\\.)*")/.exec(source.slice(end))
            if (value !== null) return parseString(value[1])
        }
    }
    return undefined
}
