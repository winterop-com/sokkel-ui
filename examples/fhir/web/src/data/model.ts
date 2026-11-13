/** The shapes the workbench reads: a FHIR resource as JSON, and the server's words about one. */

/** A FHIR resource as the server holds it: its type, its id, its version and the rest of its elements. */
export interface Resource {
    resourceType: string
    id: string
    meta?: { versionId?: string; lastUpdated?: string }
    [element: string]: unknown
}

/** One issue the server found, as a FHIR OperationOutcome's issue says it. */
export interface Issue {
    severity: 'error' | 'warning' | 'information'
    code: string
    /** What it is about, as the element's path from the resource, such as `['name', 0, 'family']`. */
    path?: readonly (string | number)[]
    message: string
}

/** A refusal from the server, carrying the OperationOutcome's issues. */
export class Refused extends Error {
    constructor(
        readonly status: number,
        readonly issues: readonly Issue[],
    ) {
        super(issues.find((issue) => issue.severity === 'error')?.message ?? issues[0]?.message ?? `Refused with ${String(status)}`)
    }
}

/** An issue's path as FHIRPath writes it: `Patient.name[0].family`. */
export function issuePath(type: string, path: readonly (string | number)[] | undefined): string {
    if (path === undefined || path.length === 0) return type
    return path.reduce<string>((text, part) => (typeof part === 'number' ? `${text}[${String(part)}]` : `${text}.${part}`), type)
}

/** An OperationOutcome resource from issues, as the server answers a refusal. */
export function outcome(type: string, issues: readonly Issue[]): Resource {
    return {
        resourceType: 'OperationOutcome',
        id: 'outcome',
        issue: issues.map((issue) => ({
            severity: issue.severity,
            code: issue.code,
            diagnostics: issue.message,
            ...(issue.path === undefined ? {} : { expression: [issuePath(type, issue.path)] }),
        })),
    }
}

/** The text a Coding or CodeableConcept is read as: its text, its first display, or its code. */
export function conceptText(value: unknown): string {
    if (typeof value !== 'object' || value === null) return ''
    const concept = value as { text?: string; coding?: { display?: string; code?: string }[]; display?: string; code?: string }
    return concept.text ?? concept.coding?.[0]?.display ?? concept.coding?.[0]?.code ?? concept.display ?? concept.code ?? ''
}

/** A HumanName list as one name: the first's given names and family. */
export function humanName(value: unknown): string {
    if (!Array.isArray(value) || value.length === 0) return ''
    const name = value[0] as { text?: string; given?: string[]; family?: string; prefix?: string[] }
    if (name.text !== undefined) return name.text
    return [...(name.prefix ?? []), ...(name.given ?? []), name.family ?? ''].filter((part) => part !== '').join(' ')
}

/** A Quantity as text: `72 /min`, `81.4 kg`. */
export function quantityText(value: unknown): string {
    if (typeof value !== 'object' || value === null) return ''
    const quantity = value as { value?: number; unit?: string; code?: string }
    if (quantity.value === undefined) return ''
    return `${String(quantity.value)} ${quantity.unit ?? quantity.code ?? ''}`.trim()
}

/** A reference's target as `Type/id`, or its display. */
export function referenceText(value: unknown): string {
    if (typeof value !== 'object' || value === null) return ''
    const reference = value as { reference?: string; display?: string }
    return reference.display ?? reference.reference ?? ''
}

/** A resource's key on the server: `Patient/pat-001`. */
export const keyOf = (resource: Pick<Resource, 'resourceType' | 'id'>) => `${resource.resourceType}/${resource.id}`

/** Text as base64 in UTF-8, as an Attachment's `data` holds it. */
export function toBase64(text: string): string {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
}

/** An Attachment's base64 `data` as text. */
export function fromBase64(data: string): string {
    const binary = atob(data)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}
