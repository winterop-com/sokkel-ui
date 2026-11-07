/** The parts of a JSON Schema this library reads; anything else is carried through untouched. */
export interface JsonSchema {
    $ref?: string
    $defs?: Record<string, JsonSchema>
    definitions?: Record<string, JsonSchema>
    type?: string | string[]
    title?: string
    description?: string
    format?: string
    enum?: unknown[]
    const?: unknown
    default?: unknown
    examples?: unknown[]
    properties?: Record<string, JsonSchema>
    required?: string[]
    additionalProperties?: boolean | JsonSchema
    items?: JsonSchema
    oneOf?: JsonSchema[]
    anyOf?: JsonSchema[]
    allOf?: JsonSchema[]
    minimum?: number
    maximum?: number
    exclusiveMinimum?: number
    exclusiveMaximum?: number
    minLength?: number
    maxLength?: number
    minItems?: number
    maxItems?: number
    pattern?: string
    readOnly?: boolean
    writeOnly?: boolean
    deprecated?: boolean
    [key: string]: unknown
}

/** A schema with its local `$ref` followed, against the root's `$defs` or `definitions`. */
export function resolve(schema: JsonSchema, root: JsonSchema): JsonSchema {
    let current = schema
    for (let hops = 0; current.$ref !== undefined && hops < 16; hops += 1) {
        const match = /^#\/(\$defs|definitions)\/(.+)$/.exec(current.$ref)
        const target = match === null ? undefined : root[match[1] === '$defs' ? '$defs' : 'definitions']?.[match[2]]
        if (target === undefined) break
        const { $ref: _ref, ...rest } = current
        current = { ...target, ...rest }
    }
    if (current.allOf !== undefined) {
        const merged: JsonSchema = { ...current }
        delete merged.allOf
        for (const part of current.allOf.map((each) => resolve(each, root))) {
            merged.properties = { ...merged.properties, ...part.properties }
            merged.required = [...(merged.required ?? []), ...(part.required ?? [])]
            for (const [key, value] of Object.entries(part)) if (!(key in merged)) merged[key] = value
        }
        return merged
    }
    return current
}

/** The name a reference points at, for a type label: `#/$defs/Address` reads `Address`. */
function refName(schema: JsonSchema): string | undefined {
    return schema.$ref?.split('/').pop()
}

/** A schema's type in a few words: `string, email`, `array of Address`, `integer or null`, `one of 2`. */
export function typeLabel(schema: JsonSchema, root: JsonSchema): string {
    const name = refName(schema)
    const resolved = resolve(schema, root)
    if (resolved.const !== undefined) return 'constant'
    if (resolved.enum !== undefined) return 'one of the values'
    if (resolved.oneOf !== undefined) return `one of ${resolved.oneOf.length}`
    if (resolved.anyOf !== undefined) return `any of ${resolved.anyOf.length}`
    const types = Array.isArray(resolved.type) ? resolved.type : resolved.type === undefined ? [] : [resolved.type]
    const nullable = types.includes('null')
    const main = types.filter((type) => type !== 'null')
    let label: string
    if (main.length === 0) label = name ?? (resolved.properties !== undefined ? 'object' : 'any')
    else if (main.length > 1) label = main.join(' or ')
    else if (main[0] === 'array') label = resolved.items === undefined ? 'array' : `array of ${typeLabel(resolved.items, root)}`
    else if (main[0] === 'object' && name !== undefined) label = name
    else label = main[0]
    if (resolved.format !== undefined && main.length === 1 && main[0] === 'string') label = `string, ${resolved.format}`
    return nullable ? `${label} or null` : label
}

/** A value as a schema writes it: strings quoted, everything else as JSON. */
export function literal(value: unknown): string {
    return typeof value === 'string' ? JSON.stringify(value) : (JSON.stringify(value) ?? String(value))
}

/** The rules on a value, each said in a few words: `at least 1`, `up to 64 characters`, `matches ^[a-z]`. */
export function constraints(schema: JsonSchema): string[] {
    const out: string[] = []
    const range = (low?: number, high?: number, lowOpen?: number, highOpen?: number) => {
        if (low !== undefined && high !== undefined) out.push(`${low} to ${high}`)
        else if (low !== undefined) out.push(`at least ${low}`)
        else if (high !== undefined) out.push(`at most ${high}`)
        if (lowOpen !== undefined) out.push(`more than ${lowOpen}`)
        if (highOpen !== undefined) out.push(`less than ${highOpen}`)
    }
    range(schema.minimum, schema.maximum, schema.exclusiveMinimum, schema.exclusiveMaximum)
    const count = (low: number | undefined, high: number | undefined, unit: string) => {
        const of = (n: number) => `${n} ${n === 1 ? unit : `${unit}s`}`
        if (low !== undefined && high !== undefined) out.push(low === high ? `exactly ${of(low)}` : `${low} to ${of(high)}`)
        else if (low !== undefined) out.push(`at least ${of(low)}`)
        else if (high !== undefined) out.push(`up to ${of(high)}`)
    }
    count(schema.minLength, schema.maxLength, 'character')
    count(schema.minItems, schema.maxItems, 'item')
    if (schema.pattern !== undefined) out.push(`matches ${schema.pattern}`)
    if (schema.additionalProperties === false) out.push('no other fields')
    return out
}

/** The schema whose fields a row opens into: an object's own, or an array's items'. */
export function childSchema(schema: JsonSchema, root: JsonSchema): JsonSchema | undefined {
    const resolved = resolve(schema, root)
    if (resolved.properties !== undefined) return resolved
    if (resolved.items !== undefined) {
        const items = resolve(resolved.items, root)
        if (items.properties !== undefined) return items
    }
    return undefined
}
