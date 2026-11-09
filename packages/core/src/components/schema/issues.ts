/**
 * Where a value sits in a document and what a schema says is wrong with it: the paths, the issues
 * and the reading of a field's schema that a form draws with. It needs no schema checker, so a form
 * draws before `validate`, which carries ajv, has loaded.
 */
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

/** A key held by place, moved as a list's items are taken out or moved: the new index for an old one, or null for gone. */
export function shiftKey(key: string, list: string, map: (index: number) => number | null): string | null {
    if (!key.startsWith(`${list}/`)) return key
    const rest = key.slice(list.length + 1)
    const slash = rest.indexOf('/')
    const head = slash === -1 ? rest : rest.slice(0, slash)
    if (!/^\d+$/.test(head)) return key
    const next = map(Number(head))
    return next === null ? null : `${list}/${String(next)}${slash === -1 ? '' : rest.slice(slash)}`
}

export function shiftSet(keys: ReadonlySet<string>, list: string, map: (index: number) => number | null): ReadonlySet<string> {
    return new Set([...keys].map((key) => shiftKey(key, list, map)).filter((key): key is string => key !== null))
}

export function shiftRecord<T>(record: Record<string, T>, list: string, map: (index: number) => number | null): Record<string, T> {
    const out: Record<string, T> = {}
    for (const [key, value] of Object.entries(record)) {
        const next = shiftKey(key, list, map)
        if (next !== null) out[next] = value
    }
    return out
}

/** Whether a value is left unchecked, such as one holding a reference that is filled in later. */
export type DeferredValue = (value: unknown) => boolean

/**
 * The issues a check found, without those about a value `deferred` leaves unchecked or anything
 * inside one: a field holding `${steps.fetch.rows}` where a number goes is not an error, as it is
 * filled in later.
 */
export function withoutDeferred<I extends { path: Path }>(
    issues: readonly I[],
    document: unknown,
    deferred: DeferredValue | undefined,
): I[] {
    if (deferred === undefined) return [...issues]
    return issues.filter((issue) => {
        for (let depth = issue.path.length; depth >= 0; depth -= 1)
            if (deferred(valueAt(document, issue.path.slice(0, depth)))) return false
        return true
    })
}
