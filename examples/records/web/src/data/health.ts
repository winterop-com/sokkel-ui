import type { Household } from './backend'
import { FORMS, questionsOf } from './forms'
import { PLACES, placeName } from './geo'

export type Severity = 'error' | 'warning' | 'note'

export const SEVERITY: Record<Severity, { label: string; dot: string }> = {
    error: { label: 'Errors', dot: 'var(--critical)' },
    warning: { label: 'Warnings', dot: 'var(--warning)' },
    note: { label: 'Notes', dot: 'var(--faint)' },
}

/** Something the server's metadata holds that a record cannot carry cleanly. */
export interface Finding {
    id: string
    severity: Severity
    /** The kind of object: forms, questions, places, code lists, households. */
    kind: string
    object: string
    objectId: string
    field: string
    problem: string
    cost: string
    /** Where the object is shown in the app. */
    href?: string
}

/** Each language's share of the strings the forms say, translated. */
export interface Coverage {
    language: string
    name: string
    translated: number
    total: number
}

/** Runs every check over the metadata and the households the server holds. */
export function checkMetadata(households: readonly Household[]): Finding[] {
    const findings: Finding[] = []
    const add = (finding: Omit<Finding, 'id'>) => findings.push({ ...finding, id: `${finding.kind}:${finding.objectId}:${finding.field}` })

    for (const place of PLACES)
        if (place.level === 'site' && place.position === null)
            add({
                severity: 'warning',
                kind: 'places',
                object: place.name,
                objectId: place.id,
                field: 'position',
                problem: 'The position cannot be read: a coordinate is not a number.',
                cost: 'The site is left off the map, and the map frames its region in its place.',
                href: `#/places/${place.id}`,
            })

    const seen = new Map<string, string>()
    for (const place of PLACES.filter((one) => one.level === 'site')) {
        const key = `${place.parent ?? ''}:${place.name.toLowerCase()}`
        const first = seen.get(key)
        if (first === undefined) seen.set(key, place.id)
        else
            add({
                severity: 'note',
                kind: 'places',
                object: place.name,
                objectId: place.id,
                field: 'name',
                problem: `Shares its name with ${first} in ${placeName(place.parent)}.`,
                cost: 'Pickers tell the two apart by their ids only.',
                href: `#/places/${place.id}`,
            })
    }

    for (const form of FORMS) {
        for (const question of questionsOf(form)) {
            if (question.type === 'computed') continue
            if (question.required !== true && question.description === undefined && question.help === undefined)
                add({
                    severity: 'note',
                    kind: 'questions',
                    object: question.label,
                    objectId: `${form.id}.${question.id}`,
                    field: 'description',
                    problem: 'An optional question with no description or help.',
                    cost: 'Nothing tells the person filling it in when to leave it empty.',
                    href: `#/forms/${form.id}`,
                })
            if ((question.type === 'integer' || question.type === 'decimal') && question.max === undefined)
                add({
                    severity: 'warning',
                    kind: 'questions',
                    object: question.label,
                    objectId: `${form.id}.${question.id}`,
                    field: 'max',
                    problem: 'A number with no highest value.',
                    cost: 'A slip of the finger is filed as it is typed.',
                    href: `#/forms/${form.id}`,
                })
        }
        if (form.kind === 'followup' && form.repeats !== true && form.id === 'FRM-EXIT')
            add({
                severity: 'note',
                kind: 'forms',
                object: form.title,
                objectId: form.id,
                field: 'translations',
                problem: 'Not yet translated into any language.',
                cost: 'It is shown in English to everyone.',
                href: `#/forms/${form.id}`,
            })
    }

    add({
        severity: 'warning',
        kind: 'code lists',
        object: 'Main water source',
        objectId: 'LST-SOURCE.standpipe',
        field: 'code',
        problem: 'The code "public standpipe" holds a space.',
        cost: 'The register files it as "public_standpipe", so a search by the code misses it.',
        href: '#/forms/FRM-ENROLL',
    })

    const byIdentifier = new Map<string, Household[]>()
    for (const household of households)
        byIdentifier.set(household.identifier, [...(byIdentifier.get(household.identifier) ?? []), household])
    for (const [identifier, twins] of byIdentifier)
        if (twins.length > 1)
            add({
                severity: 'error',
                kind: 'households',
                object: identifier,
                objectId: twins.map((twin) => twin.id).join(', '),
                field: 'identifier',
                problem: `${String(twins.length)} households carry the same identifier.`,
                cost: 'The register refuses the second registration and every visit filed against it.',
                href: `#/people/${twins[1].id}`,
            })

    for (const household of households)
        if (household.size > 20)
            add({
                severity: 'warning',
                kind: 'households',
                object: household.identifier,
                objectId: household.id,
                field: 'size',
                problem: `${String(household.size)} people in one household, more than the survey expects.`,
                cost: 'Water per person is worked out low for every visit to it.',
                href: `#/people/${household.id}`,
            })

    return findings
}

/** The strings the forms say, counted, and how many of them each language has. */
export function coverage(): Coverage[] {
    const total = FORMS.reduce((sum, form) => sum + 2 + questionsOf(form).length * 2 + (form.grid?.rows.length ?? 0), 0)
    return [
        { language: 'pt', name: 'Portuguese', translated: Math.round(total * 0.08), total },
        { language: 'ar', name: 'Arabic', translated: Math.round(total * 0.31), total },
        { language: 'fr', name: 'French', translated: Math.round(total * 0.74), total },
        { language: 'en-GB', name: 'British English', translated: total, total },
    ]
}
