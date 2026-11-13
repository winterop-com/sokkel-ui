/**
 * The simulated FHIR server: the resources it holds and every version of each, kept in the demo's
 * collections. It reads, creates, updates and deletes as a FHIR server's REST interface does:
 * checking a resource before it keeps it, refusing an update made against an older version, giving
 * each change a new version, and refusing to delete what other resources point at.
 */
import { collection, type Row } from 'tidevann-shared/backend'

import { keyOf, Refused, type Issue, type Resource } from './model'
import { seed } from './seed'
import { validate } from './validate'

export const SERVER = {
    name: 'harbor',
    base: 'https://fhir.example.org/r4',
    address: 'fhir.example.org/r4',
    version: 'FHIR 4.0.1',
}

/** The person using the workbench, who every change is saved as. */
export const ME = 'ada'

/** A resource as the server holds it, under its key `Type/id`. */
export interface Stored extends Row {
    type: string
    resource: Resource
}

/** One version of a resource, under `Type/id/_history/n`. */
export interface Version extends Row {
    key: string
    type: string
    versionId: number
    at: string
    by: string
    change: 'create' | 'update' | 'delete'
    /** The resource as that version left it; none for a delete. */
    resource: Resource | null
}

export const resources = collection<Stored>('resources', () =>
    seed().map(({ resource }) => ({ id: keyOf(resource), type: resource.resourceType, resource })),
)

export const history = collection<Version>('history', () =>
    seed().flatMap(({ resource, earlier = [] }) =>
        [...earlier, { at: resource.meta?.lastUpdated ?? '', resource }].map((version, index) => ({
            id: `${keyOf(resource)}/_history/${String(index + 1)}`,
            key: keyOf(resource),
            type: resource.resourceType,
            versionId: index + 1,
            at: version.at,
            by: index === 0 ? 'grace' : 'linus',
            change: index === 0 ? ('create' as const) : ('update' as const),
            resource: version.resource,
        })),
    ),
)

const versionOf = (resource: Resource) => Number(resource.meta?.versionId ?? '0')

/** Every resource that points at `key`, by its key. */
export function pointingAt(all: readonly Stored[], key: string): string[] {
    const needle = `"reference":"${key}"`
    return all.filter((row) => row.id !== key && JSON.stringify(row.resource).includes(needle)).map((row) => row.id)
}

/** The text an editor holds, read as JSON, or a refusal saying where it does not read. */
export function parse(text: string): unknown {
    try {
        return JSON.parse(text) as unknown
    } catch (error) {
        throw new Refused(400, [
            {
                severity: 'error',
                code: 'structure',
                message: `The text is not JSON: ${error instanceof Error ? error.message : String(error)}`,
            },
        ])
    }
}

async function keep(all: Stored[], type: string, resource: Resource, change: Version['change'], versionId: number): Promise<Resource> {
    const at = new Date().toISOString()
    const kept: Resource = { ...resource, meta: { ...resource.meta, versionId: String(versionId), lastUpdated: at } }
    const key = keyOf(kept)
    if (all.some((row) => row.id === key)) await resources.update(key, { resource: kept })
    else await resources.create({ type, resource: kept }, key)
    await history.create({ key, type, versionId, at, by: ME, change, resource: kept }, `${key}/_history/${String(versionId)}`)
    return kept
}

function refuseIssues(issues: readonly Issue[]): void {
    if (issues.some((issue) => issue.severity === 'error')) throw new Refused(422, issues)
}

/**
 * Updates `Type/id` with a resource, as `PUT [base]/Type/id` with `If-Match` the version it was
 * read at: refused with the issues found when it does not check, and with a conflict when someone
 * saved a newer version since. Returns the version kept and the warnings it carried.
 */
export async function update(
    type: string,
    id: string,
    resource: unknown,
    readAt: number,
): Promise<{ resource: Resource; warnings: Issue[] }> {
    const all = await resources.list()
    const key = `${type}/${id}`
    const current = all.find((row) => row.id === key)
    if (current === undefined) throw new Refused(404, [{ severity: 'error', code: 'not-found', message: `The server holds no ${key}.` }])
    const issues = validate(resource, type, id, (target) => all.some((row) => row.id === target))
    refuseIssues(issues)
    const now = versionOf(current.resource)
    if (now !== readAt)
        throw new Refused(412, [
            {
                severity: 'error',
                code: 'conflict',
                message: `${key} was saved as version ${String(now)} since this was read at version ${String(readAt)}. Reload it to see the change.`,
            },
        ])
    const given = resource as Resource
    if (JSON.stringify({ ...given, meta: undefined }) === JSON.stringify({ ...current.resource, meta: undefined }))
        return {
            resource: current.resource,
            warnings: [{ severity: 'information', code: 'informational', message: 'Nothing changed, so no new version was made.' }],
        }
    const kept = await keep(all, type, given, 'update', now + 1)
    return { resource: kept, warnings: issues }
}

/** Makes an id for a new resource of a type that no resource has. */
function freshId(all: readonly Stored[], type: string): string {
    const prefix =
        {
            Patient: 'pat',
            Practitioner: 'prac',
            Organization: 'org',
            Encounter: 'enc',
            Observation: 'obs',
            Condition: 'cond',
            Library: 'lib',
        }[type] ?? type.toLowerCase()
    let n = all.filter((row) => row.type === type).length + 1
    while (all.some((row) => row.id === `${type}/${prefix}-${String(n).padStart(3, '0')}`)) n += 1
    return `${prefix}-${String(n).padStart(3, '0')}`
}

/**
 * Creates a resource, as `POST [base]/Type`: under the id it names when that is free (a client-given
 * id, as `PUT` would), else under one the server makes.
 */
export async function create(type: string, resource: unknown): Promise<{ resource: Resource; warnings: Issue[] }> {
    const all = await resources.list()
    const fields = (typeof resource === 'object' && resource !== null ? resource : {}) as Record<string, unknown>
    const named = typeof fields.id === 'string' && fields.id !== '' ? fields.id : undefined
    if (named !== undefined && all.some((row) => row.id === `${type}/${named}`))
        throw new Refused(409, [
            {
                severity: 'error',
                code: 'duplicate',
                path: ['id'],
                message: `${type}/${named} is taken; leave id empty for the server to make one.`,
            },
        ])
    const id = named ?? freshId(all, type)
    const withId: Record<string, unknown> = { ...fields, id }
    delete withId.meta
    const issues = validate(withId, type, id, (target) => all.some((row) => row.id === target))
    refuseIssues(issues)
    // A resource made again under a deleted one's id goes on from its versions.
    const past = (await history.list()).filter((version) => version.key === `${type}/${id}`)
    const kept = await keep(all, type, withId as Resource, 'create', Math.max(0, ...past.map((version) => version.versionId)) + 1)
    return { resource: kept, warnings: issues }
}

/** Deletes `Type/id`, as `DELETE [base]/Type/id`, refused while other resources point at it. */
export async function remove(key: string): Promise<void> {
    const all = await resources.list()
    const current = all.find((row) => row.id === key)
    if (current === undefined) throw new Refused(404, [{ severity: 'error', code: 'not-found', message: `The server holds no ${key}.` }])
    const pointers = pointingAt(all, key)
    if (pointers.length > 0)
        throw new Refused(409, [
            {
                severity: 'error',
                code: 'conflict',
                message: `${String(pointers.length)} resource${pointers.length === 1 ? '' : 's'} point at ${key}, such as ${pointers.slice(0, 3).join(', ')}. Delete or change them first.`,
            },
        ])
    const versionId = versionOf(current.resource) + 1
    await resources.remove(key)
    await history.create(
        { key, type: current.type, versionId, at: new Date().toISOString(), by: ME, change: 'delete', resource: null },
        `${key}/_history/${String(versionId)}`,
    )
}
