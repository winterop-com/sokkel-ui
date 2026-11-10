import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'

import { formatPhrase, formatTest, schemaFormats, type SchemaFormats } from './formats'
import { fieldSchema, given, pointer, valueAt, type Path, type SchemaIssue, type SchemaIssueKind } from './issues'
import type { JsonSchema } from './read'

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

/** Ajv with the standard formats and the app's; it logs errors only, so a format no one registered is passed over in silence. */
function checker(formats: SchemaFormats): Ajv2020 {
    const made = new Ajv2020({
        allErrors: true,
        strict: false,
        validateFormats: true,
        logger: { log: () => {}, warn: () => {}, error: (...args: unknown[]) => console.error(...args) },
    })
    addFormats(made)
    for (const [name, format] of Object.entries(formats)) made.addFormat(name, formatTest(format))
    return made
}

/** A compiled schema: the check, the schema it was compiled from, and the key ajv holds it under, for checking one branch of it. */
interface Compiled {
    check: ValidateFunction
    body: JsonSchema
    key: string
}

let ajv = checker({})
let formatsVersion = 0
let compiled = new WeakMap<JsonSchema, Compiled | Error>()
let keys = 0

/** Starts a fresh ajv when the registered formats have changed, so every schema compiles again with them. */
function current(): void {
    const { formats, version } = schemaFormats()
    if (version === formatsVersion) return
    formatsVersion = version
    ajv = checker(formats)
    compiled = new WeakMap()
}

declare const process: { env: { NODE_ENV?: string } }

/** Whether the build is a development one; a bundler writes NODE_ENV in, and a page without one counts as development. */
function developing(): boolean {
    try {
        return process.env.NODE_ENV !== 'production'
    } catch {
        return true
    }
}

let warned = false

/** Says once per page, in development, that schema checks run generated code, so a Content Security Policy needs 'unsafe-eval'. */
function warnOfGeneratedCode(): void {
    if (warned || !developing()) return
    warned = true
    console.warn(
        "sokkel-ui: schema checks compile each schema to a function with ajv (new Function), so a page with a Content Security Policy needs 'unsafe-eval' in script-src.",
    )
}

/** The schema compiled to a check, or why it could not be: a broken schema, or a page whose policy forbids generated code. */
function compile(schema: JsonSchema): Compiled | Error {
    current()
    const known = compiled.get(schema)
    if (known !== undefined) return known
    const { $schema: _dialect, $id: id, ...body } = schema
    // A schema that is only the address of a dialect ajv carries, such as JSON Schema 2020-12, is that dialect's meta-schema.
    const carried = typeof id === 'string' && Object.keys(body).length === 0 ? ajv.getSchema(id) : undefined
    if (carried !== undefined) {
        const known: Compiled = { check: carried, body: carried.schema as JsonSchema, key: id as string }
        compiled.set(schema, known)
        return known
    }
    let check: Compiled | Error
    try {
        warnOfGeneratedCode()
        keys += 1
        const key = `urn:sokkel-ui:schema:${keys}`
        ajv.addSchema(body, key)
        const made = ajv.getSchema(key)
        if (made === undefined) throw new Error('The schema could not be compiled.')
        check = { check: made, body, key }
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
            const phrase = formatPhrase(format)
            return at({ kind: 'format', format, ...(phrase === undefined ? {} : { phrase }) }, fix)
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

/** Whether an instance path is the given one or under it. */
function within(at: string, base: string): boolean {
    return at === base || at.startsWith(`${base}/`)
}

/** The part of a schema a schema path points at, following local references, or undefined when it cannot be found. */
function schemaAt(root: JsonSchema, at: string): unknown {
    if (!at.startsWith('#')) return undefined
    let node: unknown = root
    try {
        for (const part of at.slice(1).split('/').slice(1)) {
            const key = decodeURIComponent(part).replaceAll('~1', '/').replaceAll('~0', '~')
            if (node === null || typeof node !== 'object') return undefined
            node = (node as Record<string, unknown>)[key]
        }
    } catch {
        return undefined
    }
    return node
}

/** A subschema with its local `$ref` followed, a few steps deep. */
function followed(root: JsonSchema, node: unknown): JsonSchema | undefined {
    let at = node
    for (let step = 0; step < 8; step += 1) {
        if (at === null || typeof at !== 'object') return undefined
        const ref = (at as JsonSchema).$ref
        if (typeof ref !== 'string' || !ref.startsWith('#')) return at as JsonSchema
        at = schemaAt(root, ref)
    }
    return undefined
}

/** The properties a branch fixes to one value, by `const` or a one-value `enum`, in it or its `allOf`. */
function discriminators(root: JsonSchema, branch: unknown): Map<string, unknown> {
    const out = new Map<string, unknown>()
    const visit = (node: unknown, depth: number) => {
        const schema = followed(root, node)
        if (schema === undefined || depth > 4) return
        for (const [key, property] of Object.entries(schema.properties ?? {})) {
            const fixed = followed(root, property)
            if (fixed === undefined) continue
            if ('const' in fixed) out.set(key, fixed.const)
            else if (Array.isArray(fixed.enum) && fixed.enum.length === 1) out.set(key, fixed.enum[0])
        }
        for (const part of schema.allOf ?? []) visit(part, depth + 1)
    }
    visit(branch, 0)
    return out
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * The errors of one failed `anyOf` or `oneOf` (at `at` in the list) narrowed to the branch that fits the
 * value: the one whose fixed properties match it, else the one with the fewest errors, preferring a
 * branch of the value's type. Ajv lists each branch's errors in order just before the combinator's
 * own, so each branch is checked alone to learn how many are its. Undefined when they cannot be told apart.
 */
function narrowed(
    errors: ErrorObject[],
    at: number,
    made: Compiled,
    document: unknown,
): { start: number; kept: ErrorObject[] } | undefined {
    const error = errors[at]
    const base = error.instancePath
    const value = valueAt(document, parse(base))
    const branches = schemaAt(made.body, error.schemaPath)
    if (!Array.isArray(branches)) return undefined
    const counts: number[] = []
    for (let index = 0; index < branches.length; index += 1) {
        let check: ValidateFunction | undefined
        try {
            check = ajv.getSchema(`${made.key}${error.schemaPath}/${index}`)
        } catch {
            return undefined
        }
        if (check === undefined) return undefined
        counts.push(check(value) ? 0 : (check.errors?.length ?? 0))
    }
    const start = at - counts.reduce((sum, count) => sum + count, 0)
    if (start < 0 || errors.slice(start, at).some((other) => !within(other.instancePath, base))) return undefined
    const chunks = counts.map((count, index) => {
        const from = start + counts.slice(0, index).reduce((sum, each) => sum + each, 0)
        return errors.slice(from, from + count)
    })
    // More than one branch passed a oneOf: that is the whole complaint.
    if (counts.some((count) => count === 0)) return { start, kept: [error] }
    const fixed = branches.map((branch) => discriminators(made.body, branch))
    const record = value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
    const fits = fixed
        .map((properties, index) => ({ properties, index }))
        .filter(
            ({ properties }) =>
                record !== undefined && properties.size > 0 && [...properties].every(([key, want]) => same(record[key], want)),
        )
        .map(({ index }) => index)
    if (fits.length === 0 && record !== undefined) {
        // A fixed property every branch has, set to a value none takes: say which values it takes.
        const shared = [...fixed[0].keys()].find((key) => fixed.every((properties) => properties.has(key)) && record[key] !== undefined)
        if (shared !== undefined) {
            const allowed = fixed
                .map((properties) => properties.get(shared))
                .filter((want, index, all) => all.findIndex((other) => same(other, want)) === index)
            const path = `${base}/${shared.replaceAll('~', '~0').replaceAll('/', '~1')}`
            return { start, kept: [{ ...error, keyword: 'enum', instancePath: path, params: { allowedValues: allowed } }] }
        }
    }
    const candidates = fits.length > 0 ? fits : branches.map((_, index) => index)
    const rank = (index: number) => {
        const chunk = chunks[index]
        const wrongType = chunk.some((other) => other.keyword === 'type' && other.instancePath === base)
        return (wrongType ? 1_000_000 : 0) + withoutExplainedPatterns(chunk).length
    }
    const best = candidates.reduce((pick, index) => (rank(index) < rank(pick) ? index : pick))
    const kept = fitting(chunks[best], made, document)
    return { start, kept: kept.length > 0 ? kept : [error] }
}

/** The errors without a `pattern` at a place where a `format` also failed: the format names what the raw pattern only spells out. */
function withoutExplainedPatterns<E extends { instancePath: string; keyword: string }>(errors: E[]): E[] {
    return errors.filter(
        (error) =>
            error.keyword !== 'pattern' || !errors.some((other) => other.keyword === 'format' && other.instancePath === error.instancePath),
    )
}

/** The errors with every failed `anyOf` and `oneOf`, at any depth, narrowed to the branch that fits the value. */
function fitting(errors: ErrorObject[], made: Compiled, document: unknown): ErrorObject[] {
    const out = [...errors]
    for (let at = out.length - 1; at >= 0; at -= 1) {
        if (out[at].keyword !== 'anyOf' && out[at].keyword !== 'oneOf') continue
        const found = narrowed(out, at, made, document)
        if (found === undefined) continue
        out.splice(found.start, at - found.start + 1, ...found.kept)
        at = found.start
    }
    return out
}

/** The errors without an `if`'s "must match then" when its `then` or `else` said what is wrong, at or under the same place. */
function withoutSettledIfs(errors: ErrorObject[]): ErrorObject[] {
    return errors.filter(
        (error) =>
            error.keyword !== 'if' ||
            !errors.some((other) => other !== error && other.keyword !== 'if' && within(other.instancePath, error.instancePath)),
    )
}

/**
 * Everything a schema says is wrong with a value, each at its path, checked by ajv against
 * JSON Schema 2020-12 with the standard formats; and, as warnings, the deprecated fields it sets.
 * Empty strings are read as absent, the way a form leaves a cleared field. A schema that cannot be
 * compiled, because it is broken or because the page's Content Security Policy forbids the code ajv
 * generates, gives one `unchecked` issue at the root, so a form fails closed rather than open. A failed `anyOf` or
 * `oneOf`, at any depth, reports only the branch that fits the value: the one whose `const` (or
 * one-value `enum`) properties match it, else the one with the fewest errors; so a nullable field
 * reports what is wrong with the real branch, not that the value is not null. An `if` whose
 * `then` or `else` said what is wrong adds nothing of its own, and neither does a `pattern` where
 * a `format` failed on the same value. Formats an app registers with
 * `registerSchemaFormats` are checked; any other unknown format is passed over.
 */
export function validate(schema: JsonSchema, value: unknown): SchemaIssue[] {
    const document = prune(value)
    const made = compile(schema)
    if (made instanceof Error) return [{ kind: 'unchecked', reason: made.message, path: [], tone: 'critical' }]
    const errors = withoutExplainedPatterns(
        withoutSettledIfs(fitting(made.check(document) ? [] : [...(made.check.errors ?? [])], made, document)),
    )
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
