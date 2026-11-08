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
