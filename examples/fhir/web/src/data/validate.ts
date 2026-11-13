/**
 * The server's check of a resource before it keeps it: the elements its type knows, each holding
 * what it should, the required ones there, codes from their value sets, and references that point
 * at a resource of an allowed type that the server holds.
 */
import type { Issue } from './model'
import { DATATYPES, isPrimitive, patternOf, typeDef, type ElementDef, type ElementType } from './types'

type Path = (string | number)[]

/** Whether the server holds the resource `Type/id`. */
export type Exists = (key: string) => boolean

function checkPrimitive(type: ElementType, value: unknown, path: Path, element: ElementDef, issues: Issue[]): void {
    if (type === 'boolean') {
        if (typeof value !== 'boolean')
            issues.push({ severity: 'error', code: 'value', path, message: `${element.name} must be true or false.` })
        return
    }
    if (type === 'decimal' || type === 'integer') {
        if (typeof value !== 'number' || (type === 'integer' && !Number.isInteger(value)))
            issues.push({
                severity: 'error',
                code: 'value',
                path,
                message: `${element.name} must be ${type === 'integer' ? 'a whole number' : 'a number'}.`,
            })
        return
    }
    if (typeof value !== 'string') {
        issues.push({ severity: 'error', code: 'value', path, message: `${element.name} must be a string.` })
        return
    }
    if (value === '') {
        issues.push({ severity: 'error', code: 'value', path, message: `${element.name} is empty; leave it out instead.` })
        return
    }
    const pattern = patternOf(type)
    if (pattern !== undefined && !pattern.test(value))
        issues.push({ severity: 'error', code: 'value', path, message: `"${value}" is not a valid ${type}.` })
    if (element.codes !== undefined && !element.codes.includes(value))
        issues.push({
            severity: 'error',
            code: 'code-invalid',
            path,
            message: `"${value}" is not in the value set of ${element.name}: ${element.codes.join(', ')}.`,
        })
}

function checkReference(value: Record<string, unknown>, path: Path, element: ElementDef, exists: Exists, issues: Issue[]): void {
    const reference = value.reference
    if (typeof reference !== 'string') return
    const match = /^([A-Z][A-Za-z]+)\/([A-Za-z0-9\-.]{1,64})$/.exec(reference)
    if (match === null) {
        issues.push({
            severity: 'error',
            code: 'value',
            path: [...path, 'reference'],
            message: `"${reference}" is not a reference of the form Type/id.`,
        })
        return
    }
    const [, type = ''] = match
    if (element.targets !== undefined && !element.targets.includes(type)) {
        issues.push({
            severity: 'error',
            code: 'invalid',
            path: [...path, 'reference'],
            message: `${element.name} may point at ${element.targets.join(' or ')}, not ${type}.`,
        })
        return
    }
    if (!exists(reference))
        issues.push({ severity: 'error', code: 'not-found', path: [...path, 'reference'], message: `The server holds no ${reference}.` })
}

function checkValue(element: ElementDef, value: unknown, path: Path, exists: Exists, issues: Issue[]): void {
    if (isPrimitive(element.type)) {
        checkPrimitive(element.type, value, path, element, issues)
        return
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        issues.push({ severity: 'error', code: 'structure', path, message: `${element.name} must be a ${element.type} object.` })
        return
    }
    checkElements(DATATYPES[element.type], value as Record<string, unknown>, path, exists, issues)
    if (element.type === 'Reference') checkReference(value as Record<string, unknown>, path, element, exists, issues)
}

function checkElements(elements: readonly ElementDef[], value: Record<string, unknown>, path: Path, exists: Exists, issues: Issue[]): void {
    for (const [name, child] of Object.entries(value)) {
        const element = elements.find((one) => one.name === name)
        if (element === undefined) {
            issues.push({ severity: 'error', code: 'structure', path: [...path, name], message: `Unknown element "${name}".` })
            continue
        }
        if (element.array === true) {
            if (!Array.isArray(child)) {
                issues.push({
                    severity: 'error',
                    code: 'structure',
                    path: [...path, name],
                    message: `${name} repeats, so it must be an array.`,
                })
                continue
            }
            if (child.length === 0)
                issues.push({
                    severity: 'error',
                    code: 'structure',
                    path: [...path, name],
                    message: `${name} is an empty array; leave it out instead.`,
                })
            child.forEach((item, index) => checkValue(element, item, [...path, name, index], exists, issues))
        } else if (Array.isArray(child)) {
            issues.push({
                severity: 'error',
                code: 'structure',
                path: [...path, name],
                message: `${name} does not repeat, so it must not be an array.`,
            })
        } else {
            checkValue(element, child, [...path, name], exists, issues)
        }
    }
    for (const element of elements)
        if (element.required === true && value[element.name] === undefined)
            issues.push({ severity: 'error', code: 'required', path, message: `${element.name} is required.` })
}

/**
 * Everything wrong with a resource the server is asked to keep as `type`, under `id` when it is
 * being updated; `exists` says whether a reference's target is on the server.
 */
export function validate(resource: unknown, type: string, id: string | undefined, exists: Exists): Issue[] {
    const issues: Issue[] = []
    if (typeof resource !== 'object' || resource === null || Array.isArray(resource))
        return [{ severity: 'error', code: 'structure', message: 'A resource is a JSON object.' }]
    const fields = resource as Record<string, unknown>
    const def = typeDef(type)
    if (def === undefined) return [{ severity: 'error', code: 'not-supported', message: `The server keeps no ${type} resources.` }]
    if (fields.resourceType !== type)
        return [
            {
                severity: 'error',
                code: 'invalid',
                path: ['resourceType'],
                message: `resourceType is ${JSON.stringify(fields.resourceType)}, but this is a ${type}.`,
            },
        ]
    if (id !== undefined && fields.id !== id)
        issues.push({
            severity: 'error',
            code: 'invalid',
            path: ['id'],
            message: `id is ${JSON.stringify(fields.id)}, but the resource is ${type}/${id}.`,
        })
    checkElements(def.elements, fields, [], exists, issues)
    const values = Object.keys(fields).filter((name) => name.startsWith('value'))
    if (values.length > 1)
        issues.push({
            severity: 'error',
            code: 'structure',
            path: [values[1] ?? ''],
            message: `Only one value[x] is allowed, and this has ${values.join(' and ')}.`,
        })
    if (type === 'Observation' && fields.subject === undefined)
        issues.push({ severity: 'warning', code: 'business-rule', message: 'An observation without a subject is about no one.' })
    if (type === 'Library') issues.push(...libraryIssues(fields))
    return issues
}

/** A Library's CQL against its own elements: the name and version it declares must be the library's. */
function libraryIssues(fields: Record<string, unknown>): Issue[] {
    const content = Array.isArray(fields.content) ? (fields.content as { contentType?: string; data?: string }[]) : []
    const index = content.findIndex((one) => one.contentType === 'text/cql')
    const cql = content[index]
    if (cql?.data === undefined) return []
    let text: string
    try {
        text = new TextDecoder().decode(Uint8Array.from(atob(cql.data), (char) => char.charCodeAt(0)))
    } catch {
        return [{ severity: 'error', code: 'value', path: ['content', index, 'data'], message: 'The CQL is not valid base64.' }]
    }
    const declared = cqlHeader(text)
    if (declared === undefined)
        return [
            {
                severity: 'error',
                code: 'invalid',
                path: ['content', index, 'data'],
                message: 'The CQL does not start with a library declaration.',
            },
        ]
    const issues: Issue[] = []
    if (fields.name !== undefined && fields.name !== declared.name)
        issues.push({
            severity: 'error',
            code: 'invalid',
            path: ['name'],
            message: `The CQL declares the library ${declared.name}, not ${String(fields.name)}.`,
        })
    if (fields.version !== undefined && declared.version !== undefined && fields.version !== declared.version)
        issues.push({
            severity: 'error',
            code: 'invalid',
            path: ['version'],
            message: `The CQL declares version ${declared.version}, not ${String(fields.version)}.`,
        })
    return issues
}

/** The name and version a CQL library declares on its first line of code. */
export function cqlHeader(text: string): { name: string; version?: string; line: number } | undefined {
    const lines = text.split('\n')
    for (const [index, line] of lines.entries()) {
        const trimmed = line.trim()
        if (trimmed === '' || trimmed.startsWith('//')) continue
        const match = /^library\s+("[^"]+"|[A-Za-z_]\w*)(?:\s+version\s+'([^']*)')?/.exec(trimmed)
        if (match === null) return undefined
        return { name: (match[1] ?? '').replace(/"/g, ''), version: match[2], line: index + 1 }
    }
    return undefined
}
