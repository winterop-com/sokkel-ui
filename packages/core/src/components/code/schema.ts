import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { ensureSyntaxTree, type syntaxTree } from '@codemirror/language'
import type { Diagnostic } from '@codemirror/lint'
import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

import { literal, resolve, typeLabel, type JsonSchema } from '../schema/read'
import { pointer, type Path, type SchemaIssue } from '../schema/issues'
import type { validate } from '../schema/validate'

type SyntaxNode = ReturnType<typeof syntaxTree>['topNode']

/** The languages a schema can check. */
export type SchemaLanguage = 'json' | 'yaml'

/** Where a value is written in the document, and its key when it has one. */
export interface Span {
    from: number
    to: number
    key?: { from: number; to: number }
}

/** A document read into a value, with where each value is written, by JSON Pointer. */
export interface ReadDocument {
    value: unknown
    spans: Map<string, Span>
    /** Where the text stops being the language, when it does. */
    broken?: { from: number; to: number }
}

/** The words a schema check says, so an app can translate them. */
export interface CodeSchemaWords {
    /** An issue in a few words. */
    say: (issue: SchemaIssue) => string
    /** The text is not valid in the language. */
    syntax: (language: SchemaLanguage) => string
}

const plural = (count: number, unit: string) => `${String(count)} ${count === 1 ? unit : `${unit}s`}`
const article = (word: string) => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`)

export const SCHEMA_WORDS: CodeSchemaWords = {
    say: (issue) => {
        switch (issue.kind) {
            case 'required':
                return `Missing the property ${String(issue.path[issue.path.length - 1])}`
            case 'additional':
                return `${issue.property} is not a known property`
            case 'type':
                return `Expected ${article(issue.expected)}`
            case 'enum':
                return `Expected one of ${issue.values.map(literal).join(', ')}`
            case 'const':
                return `Expected ${literal(issue.value)}`
            case 'minimum':
                return issue.exclusive ? `Must be more than ${String(issue.limit)}` : `Must be at least ${String(issue.limit)}`
            case 'maximum':
                return issue.exclusive ? `Must be less than ${String(issue.limit)}` : `Must be at most ${String(issue.limit)}`
            case 'minLength':
                return `Use at least ${plural(issue.limit, 'character')}`
            case 'maxLength':
                return `Use at most ${plural(issue.limit, 'character')}`
            case 'pattern':
                return `Must match ${issue.pattern}`
            case 'format':
                return `Expected the ${issue.format} format`
            case 'minItems':
                return `Needs at least ${plural(issue.limit, 'item')}`
            case 'maxItems':
                return `Holds at most ${plural(issue.limit, 'item')}`
            case 'uniqueItems':
                return 'Each item only once'
            case 'deprecated':
                return 'Deprecated: still accepted, and may be removed in a later version'
            case 'unchecked':
                return `The schema cannot be checked: ${issue.reason}`
            case 'other':
                return issue.message.charAt(0).toUpperCase() + issue.message.slice(1)
        }
    },
    syntax: (language) => `Not valid ${language === 'json' ? 'JSON' : 'YAML'}`,
}

const text = (state: EditorState, node: SyntaxNode) => state.sliceDoc(node.from, node.to)

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
    spans.set(pointer(path), { from: node.from, to: node.to, key })
    switch (node.name) {
        case 'Object': {
            const out: Record<string, unknown> = {}
            for (const property of children(node).filter((child) => child.name === 'Property')) {
                const name = property.getChild('PropertyName')
                const value = children(property).find((child) => child.name !== 'PropertyName' && child.name !== ':')
                if (name === null) continue
                const label = parseString(text(state, name))
                out[label] = value === undefined ? null : readJson(state, value, [...path, label], spans, { from: name.from, to: name.to })
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

/** A plain YAML scalar as the core schema reads it: null, a boolean, a number, else the string. */
export function yamlScalar(source: string): unknown {
    const plain = source
        .split('\n')
        .map((line) => line.trim())
        .join(' ')
    if (/^(?:~|null|Null|NULL|)$/.test(plain)) return null
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

/** A YAML tree read into a value. */
function readYaml(state: EditorState, node: SyntaxNode | null, path: Path, spans: Map<string, Span>, key?: Span['key']): unknown {
    if (node === null) return null
    if (node.name === 'Tagged' || node.name === 'Anchored') {
        const inner = children(node).find((child) => !['Tag', 'Anchor'].includes(child.name)) ?? null
        return readYaml(state, inner, path, spans, key)
    }
    spans.set(pointer(path), { from: node.from, to: node.to, key })
    switch (node.name) {
        case 'BlockMapping':
        case 'FlowMapping': {
            const out: Record<string, unknown> = {}
            for (const pair of children(node).filter((child) => child.name === 'Pair')) {
                const name = pair.getChild('Key')
                const value = children(pair).find((child) => !['Key', ':', 'Comment'].includes(child.name)) ?? null
                if (name === null) continue
                const scalar = name.firstChild
                const label =
                    scalar?.name === 'QuotedLiteral' ? yamlQuoted(text(state, scalar)) : text(state, name).trim().replace(/\s+/g, ' ')
                out[label] = readYaml(state, value, [...path, label], spans, { from: name.from, to: name.to })
            }
            return out
        }
        case 'BlockSequence':
        case 'FlowSequence':
            return children(node)
                .filter((child) => child.name === 'Item')
                .map((item, index) => {
                    const value = children(item).find((child) => child.name !== 'Comment') ?? null
                    return readYaml(state, value ?? item, [...path, index], spans)
                })
        case 'Item':
            return null
        case 'Literal':
            return yamlScalar(text(state, node))
        case 'QuotedLiteral':
            return yamlQuoted(text(state, node))
        case 'BlockLiteral':
            return yamlBlock(state, node)
        default:
            return null
    }
}

/**
 * A JSON or YAML document read into a value, with where each value is written. Null when the
 * document is too large to parse in the time given.
 */
export function readDocument(state: EditorState, language: SchemaLanguage, timeout = 400): ReadDocument | null {
    const tree = ensureSyntaxTree(state, state.doc.length, timeout)
    if (tree === null) return null
    const spans = new Map<string, Span>()
    const error = firstError(tree.topNode)
    const broken = error === null ? undefined : { from: error.from, to: Math.max(error.to, Math.min(error.from + 1, state.doc.length)) }
    if (language === 'json') {
        const root = children(tree.topNode)[0] ?? null
        return { value: root === null ? undefined : readJson(state, root, [], spans), spans, broken }
    }
    const document = tree.topNode.getChild('Document')
    const root =
        document === null
            ? null
            : (children(document).find((child) => !['DirectiveEnd', 'DocEnd', 'Comment', 'Directive'].includes(child.name)) ?? null)
    return { value: root === null ? null : readYaml(state, root, [], spans), spans, broken }
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
): Diagnostic[] {
    if (state.doc.length === 0) return []
    const read = readDocument(state, language)
    if (read === null) return []
    if (read.broken !== undefined) return [{ ...read.broken, severity: 'error', message: words.syntax(language) }]
    return check(schema, read.value).map((issue) => ({
        ...place(issue, read.spans, state),
        severity: issue.tone === 'critical' ? 'error' : 'warning',
        message: words.say(issue),
    }))
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

/** The slot at a position in YAML, read from the indentation of the lines above it. */
export function yamlSlot(state: EditorState, pos: number): Slot {
    const line = state.doc.lineAt(pos)
    const before = state.sliceDoc(line.from, pos)
    const here = yamlLine(before)
    const word = /[^\s:]*$/.exec(before)?.[0] ?? ''
    const from = pos - word.length
    const tail: Path = here.dashes.map(() => 0)
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
                found.unshift(0)
                target = dash
            }
        if (found.length > 0) path.unshift(found)
    }
    const at = [...path.flat(), ...tail]
    if (here.key !== undefined && pos - line.from > here.key.column + here.key.name.length)
        return { path: at, at: 'value', key: here.key.name, from, quoted: false }
    return { path: at, at: 'key', from, quoted: false }
}

/** The schemas a value at the path may follow: one, or each branch of a choice. */
export function schemasAt(schema: JsonSchema, path: Path, root: JsonSchema = schema): JsonSchema[] {
    const expand = (each: JsonSchema): JsonSchema[] => {
        const resolved = resolve(each, root)
        const branches = [...(resolved.anyOf ?? []), ...(resolved.oneOf ?? [])]
        return branches.length > 0 ? [resolved, ...branches.flatMap(expand)] : [resolved]
    }
    let current = expand(schema)
    for (const part of path) {
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
            .flatMap(expand)
    }
    return current
}

const quoteYaml = (value: unknown) =>
    typeof value === 'string' && /^[\w./@-][\w ./@-]*$/.test(value) && typeof yamlScalar(value) === 'string' ? value : literal(value)

/** The property names and values a schema allows where the cursor is. */
function schemaOptions(schema: JsonSchema, language: SchemaLanguage, slot: Slot): Completion[] {
    const json = language === 'json'
    if (slot.at === 'key') {
        const seen = new Set<string>()
        return schemasAt(schema, slot.path).flatMap((each) =>
            Object.entries(each.properties ?? {})
                .filter(([name]) => !seen.has(name) && seen.add(name) !== undefined)
                .map(([name, property]) => ({
                    label: name,
                    detail: typeLabel(property, schema),
                    info: resolve(property, schema).description,
                    type: 'property',
                    apply: json ? `"${name}": ` : `${name}: `,
                })),
        )
    }
    const path = slot.key === undefined ? slot.path : [...slot.path, slot.key]
    const values = schemasAt(schema, path).flatMap((each) => {
        if (each.const !== undefined) return [each.const]
        if (each.enum !== undefined) return each.enum
        const types = Array.isArray(each.type) ? each.type : [each.type]
        return types.includes('boolean') ? [true, false] : []
    })
    return [...new Set(values.map((value) => JSON.stringify(value)))].map((encoded) => {
        const value = JSON.parse(encoded) as unknown
        const written = json ? literal(value) : quoteYaml(value)
        return { label: typeof value === 'string' ? value : written, type: 'enum', apply: written }
    })
}

/** Completes property names and enum values from a schema, for JSON or YAML. */
export function schemaCompletion(schema: () => JsonSchema | undefined, language: SchemaLanguage) {
    return (context: CompletionContext): CompletionResult | null => {
        const current = schema()
        if (current === undefined) return null
        const slot = language === 'json' ? jsonSlot(context.state.doc.toString(), context.pos) : yamlSlot(context.state, context.pos)
        if (slot === null) return null
        if (slot.from === context.pos && !context.explicit && !(language === 'json' && slot.quoted)) return null
        const options = schemaOptions(current, language, slot)
        if (options.length === 0) return null
        if (!slot.quoted) return { from: slot.from, options }
        // Inside a JSON string: the option replaces the whole string, its quotes included.
        const after = context.state.sliceDoc(context.pos, context.pos + 1) === '"' ? 1 : 0
        return {
            from: slot.from,
            options: options.map((option) => ({
                ...option,
                apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
                    const insert = typeof option.apply === 'string' ? option.apply : option.label
                    view.dispatch({ changes: { from: from - 1, to: to + after, insert }, selection: { anchor: from - 1 + insert.length } })
                },
            })),
        }
    }
}
