import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'

import { resolve, type JsonSchema } from './read'

/** Where a value sits in a document: the keys and indexes from the root down. */
export type Path = readonly (string | number)[]

/** A path as one string, a JSON Pointer: `/schedule/0/at`. The root is the empty string. */
export function pointer(path: Path): string {
    return path.map((part) => `/${String(part).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('')
}

/** What is wrong with a value, by rule; the form says it in words. */
export type SchemaIssueKind =
    | { kind: 'required' }
    | { kind: 'type'; expected: string }
    | { kind: 'enum'; values: readonly unknown[] }
    | { kind: 'const'; value: unknown }
    | { kind: 'minimum'; limit: number; exclusive: boolean }
    | { kind: 'maximum'; limit: number; exclusive: boolean }
    | { kind: 'minLength'; limit: number }
    | { kind: 'maxLength'; limit: number }
    | { kind: 'pattern'; pattern: string }
    | { kind: 'format'; format: string }
    | { kind: 'minItems'; limit: number }
    | { kind: 'maxItems'; limit: number }
    | { kind: 'uniqueItems' }
    | { kind: 'deprecated' }
    /** The object has a property the schema does not allow; the issue sits at the object. */
    | { kind: 'additional'; property: string }
    /** The schema could not be compiled, so nothing can be checked and nothing passes. */
    | { kind: 'unchecked'; reason: string }
    /** A rule without words of its own, said as the validator says it. */
    | { kind: 'other'; keyword: string; message: string }

/** One thing a schema says about a value: where, how bad, which rule, and a value that satisfies it when one is plain. */
export type SchemaIssue = SchemaIssueKind & {
    path: Path
    /** `warning` is allowed but worth a look; only `critical` stops a submit. */
    tone: 'critical' | 'warning'
    fix?: unknown
}

/** Whether a value counts as given: not undefined, not null, and not an empty string. */
export function given(value: unknown): boolean {
    return value !== undefined && value !== null && value !== ''
}

/** The schema's types, without `null`, and whether `null` is allowed. */
export function types(schema: JsonSchema): { main: string[]; nullable: boolean } {
    const all = Array.isArray(schema.type) ? schema.type : schema.type === undefined ? [] : [schema.type]
    const variants = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]
    const nullable = all.includes('null') || variants.some((variant) => variant.type === 'null')
    return { main: all.filter((type) => type !== 'null'), nullable }
}

/**
 * The schema a field is drawn from: `anyOf: [X, {type: null}]`, the shape a nullable field is
 * often written in, reads as X.
 */
export function fieldSchema(schema: JsonSchema, root: JsonSchema): JsonSchema {
    const resolved = resolve(schema, root)
    const variants = resolved.anyOf ?? resolved.oneOf
    if (variants === undefined) return resolved
    const real = variants.filter((variant) => variant.type !== 'null')
    if (real.length !== 1) return resolved
    const { anyOf: _any, oneOf: _one, ...rest } = resolved
    return { ...resolve(real[0], root), ...rest }
}

/** The value at a path, or undefined where the path runs out. */
export function valueAt(value: unknown, path: Path): unknown {
    let current = value
    for (const part of path) {
        if (current === null || typeof current !== 'object') return undefined
        current = (current as Record<string | number, unknown>)[part]
    }
    return current
}

/** A value that matches the pattern, made from the given one by the usual repairs, when one does. */
function repair(value: string, pattern: string): string | undefined {
    let test: RegExp
    try {
        test = new RegExp(pattern, 'u')
    } catch {
        return undefined
    }
    const trimmed = value.trim()
    const slug = trimmed
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    const parts = slug.split('-')
    const lead = parts.findIndex((part) => /^[a-z]/.test(part))
    const rotated = lead > 0 ? [...parts.slice(lead), ...parts.slice(0, lead)].join('-') : slug
    const candidates = [trimmed, trimmed.toLowerCase(), slug, rotated, slug.replace(/^[^a-z]+/, '')]
    return candidates.find((candidate) => candidate !== '' && candidate !== value && test.test(candidate))
}

const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true })
addFormats(ajv)
const compiled = new WeakMap<JsonSchema, ValidateFunction | Error>()

/** The schema compiled to a check, or why it could not be: a broken schema, or a page whose policy forbids generated code. */
function compile(schema: JsonSchema): ValidateFunction | Error {
    const known = compiled.get(schema)
    if (known !== undefined) return known
    const { $schema: _dialect, $id: _id, ...body } = schema
    let check: ValidateFunction | Error
    try {
        check = ajv.compile(body)
    } catch (error) {
        check = error instanceof Error ? error : new Error(String(error))
        console.error('The schema could not be compiled, so no value passes it:', check)
    }
    compiled.set(schema, check)
    return check
}

/** A JSON Pointer read back into a path, indexes as numbers. */
function parse(at: string): (string | number)[] {
    if (at === '') return []
    return at
        .slice(1)
        .split('/')
        .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
        .map((part) => (/^\d+$/.test(part) ? Number(part) : part))
}

/** An ajv error as an issue, with a fix when one is plain from the value and the rule. */
function read(error: ErrorObject, document: unknown): SchemaIssue {
    const params = error.params as Record<string, unknown>
    const path = parse(error.instancePath)
    const value = valueAt(document, path)
    const at = (issue: SchemaIssueKind, fix?: unknown): SchemaIssue => ({
        ...issue,
        path,
        tone: 'critical',
        ...(fix === undefined ? {} : { fix }),
    })
    switch (error.keyword) {
        case 'required':
            return { kind: 'required', path: [...path, String(params.missingProperty)], tone: 'critical' }
        case 'type': {
            const expected = String(params.type).split(',')[0]
            const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN
            return at({ kind: 'type', expected }, expected === 'integer' && Number.isFinite(number) ? Math.round(number) : undefined)
        }
        case 'enum':
            return at({ kind: 'enum', values: (params.allowedValues as unknown[]) ?? [] })
        case 'const':
            return at({ kind: 'const', value: params.allowedValue }, params.allowedValue)
        case 'minimum':
        case 'exclusiveMinimum':
            return at(
                { kind: 'minimum', limit: Number(params.limit), exclusive: error.keyword === 'exclusiveMinimum' },
                error.keyword === 'minimum' ? Number(params.limit) : undefined,
            )
        case 'maximum':
        case 'exclusiveMaximum':
            return at(
                { kind: 'maximum', limit: Number(params.limit), exclusive: error.keyword === 'exclusiveMaximum' },
                error.keyword === 'maximum' ? Number(params.limit) : undefined,
            )
        case 'minLength':
            return at({ kind: 'minLength', limit: Number(params.limit) })
        case 'maxLength':
            return at(
                { kind: 'maxLength', limit: Number(params.limit) },
                typeof value === 'string' ? [...value].slice(0, Number(params.limit)).join('') : undefined,
            )
        case 'pattern':
            return at(
                { kind: 'pattern', pattern: String(params.pattern) },
                typeof value === 'string' ? repair(value, String(params.pattern)) : undefined,
            )
        case 'format': {
            const format = String(params.format)
            const text = typeof value === 'string' ? value.trim() : ''
            const fix = (format === 'uri' || format === 'url') && /^[^\s/:]+\.[^\s]+$/.test(text) ? `https://${text}` : undefined
            return at({ kind: 'format', format }, fix)
        }
        case 'minItems':
            return at({ kind: 'minItems', limit: Number(params.limit) })
        case 'maxItems':
            return at(
                { kind: 'maxItems', limit: Number(params.limit) },
                Array.isArray(value) ? value.slice(0, Number(params.limit)) : undefined,
            )
        case 'uniqueItems': {
            const seen = Array.isArray(value) ? value.map((item) => JSON.stringify(item)) : []
            return at(
                { kind: 'uniqueItems' },
                Array.isArray(value) ? value.filter((_, index) => seen.indexOf(seen[index]) === index) : undefined,
            )
        }
        case 'additionalProperties':
        case 'unevaluatedProperties':
            return at({ kind: 'additional', property: String(params.additionalProperty ?? params.unevaluatedProperty) })
        default:
            return at({ kind: 'other', keyword: error.keyword, message: error.message ?? error.keyword })
    }
}

/** The deprecated fields a value sets, found by walking the schema beside it. */
function deprecated(schema: JsonSchema, value: unknown, root: JsonSchema, path: Path): SchemaIssue[] {
    if (!given(value)) return []
    const at = fieldSchema(schema, root)
    const out: SchemaIssue[] = at.deprecated === true ? [{ kind: 'deprecated', path, tone: 'warning' }] : []
    if (Array.isArray(value) && at.items !== undefined)
        value.forEach((item, index) => out.push(...deprecated(at.items as JsonSchema, item, root, [...path, index])))
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && at.properties !== undefined)
        for (const [key, child] of Object.entries(at.properties))
            out.push(...deprecated(child, (value as Record<string, unknown>)[key], root, [...path, key]))
    return out
}

/**
 * Everything a schema says is wrong with a value, each at its path, checked by ajv against
 * JSON Schema 2020-12 with the standard formats; and, as warnings, the deprecated fields it sets.
 * Empty strings are read as absent, the way a form leaves a cleared field. A schema that cannot be
 * compiled, because it is broken or because the page's Content Security Policy forbids the code ajv
 * generates, gives one `unchecked` issue at the root, so a form fails closed rather than open. A nullable `anyOf`
 * reports what is wrong with the real branch, not that the value is not null.
 */
export function validate(schema: JsonSchema, value: unknown): SchemaIssue[] {
    const document = prune(value)
    const check = compile(schema)
    if (check instanceof Error) return [{ kind: 'unchecked', reason: check.message, path: [], tone: 'critical' }]
    const errors = check(document) ? [] : (check.errors ?? [])
    const issues = errors
        .filter((error) => !(error.keyword === 'type' && error.params.type === 'null'))
        .filter(
            (error) =>
                !['anyOf', 'oneOf'].includes(error.keyword) ||
                !errors.some(
                    (other) => other !== error && other.instancePath === error.instancePath && !['anyOf', 'oneOf'].includes(other.keyword),
                ),
        )
        .map((error) => read(error, document))
    const seen = new Set<string>()
    const unique = issues.filter((issue) => {
        const key = `${pointer(issue.path)} ${issue.kind}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
    return [...unique, ...deprecated(schema, document, schema, [])]
}

/** The value with every empty string and undefined property taken out, so a cleared field reads as absent. */
function prune(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(prune)
    if (value !== null && typeof value === 'object')
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, child]) => child !== undefined && child !== '')
                .map(([key, child]) => [key, prune(child)]),
        )
    return value
}
