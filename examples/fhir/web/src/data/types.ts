/**
 * The resource types the server keeps and their elements: what each element holds, whether it
 * repeats or is required, the codes it takes and the types it may point at. The server checks a
 * resource against them, the editor gets them as a JSON Schema, and the listings read them.
 */
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'

/** The primitive types an element may hold. */
type Primitive = 'string' | 'boolean' | 'code' | 'id' | 'uri' | 'date' | 'dateTime' | 'instant' | 'decimal' | 'integer' | 'markdown'

/** The data types made of elements. */
type Complex =
    | 'HumanName'
    | 'Identifier'
    | 'ContactPoint'
    | 'Address'
    | 'CodeableConcept'
    | 'Coding'
    | 'Reference'
    | 'Period'
    | 'Quantity'
    | 'Attachment'
    | 'Meta'
    | 'Narrative'
    | 'Annotation'
    | 'Participant'
    | 'Qualification'
    | 'Component'

export type ElementType = Primitive | Complex

export interface ElementDef {
    name: string
    type: ElementType
    array?: boolean
    required?: boolean
    /** The codes a `code` element takes, from its required value set. */
    codes?: readonly string[]
    /** The resource types a Reference may point at. */
    targets?: readonly string[]
    doc: string
}

export interface TypeDef {
    name: string
    /** What one resource of the type is, for the listings. */
    about: string
    elements: readonly ElementDef[]
}

const BASE: readonly ElementDef[] = [
    { name: 'resourceType', type: 'code', required: true, doc: 'The type of the resource.' },
    { name: 'id', type: 'id', doc: 'The logical id of the resource, as the server names it.' },
    { name: 'meta', type: 'Meta', doc: 'The version and the time of the last change, which the server keeps.' },
    { name: 'text', type: 'Narrative', doc: 'A summary for a person to read.' },
]

/** The elements a data type is made of. */
export const DATATYPES: Record<Complex, readonly ElementDef[]> = {
    HumanName: [
        {
            name: 'use',
            type: 'code',
            codes: ['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'],
            doc: 'The purpose of this name.',
        },
        { name: 'text', type: 'string', doc: 'The name as a whole.' },
        { name: 'family', type: 'string', doc: 'The family name.' },
        { name: 'given', type: 'string', array: true, doc: 'Given names, the first first.' },
        { name: 'prefix', type: 'string', array: true, doc: 'Parts before the name.' },
        { name: 'suffix', type: 'string', array: true, doc: 'Parts after the name.' },
        { name: 'period', type: 'Period', doc: 'When the name was in use.' },
    ],
    Identifier: [
        { name: 'use', type: 'code', codes: ['usual', 'official', 'temp', 'secondary', 'old'], doc: 'The purpose of this identifier.' },
        { name: 'system', type: 'uri', doc: 'The namespace of the value.' },
        { name: 'value', type: 'string', doc: 'The value, unique in the system.' },
    ],
    ContactPoint: [
        { name: 'system', type: 'code', codes: ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'], doc: 'The kind of contact.' },
        { name: 'value', type: 'string', doc: 'The address or number.' },
        { name: 'use', type: 'code', codes: ['home', 'work', 'temp', 'old', 'mobile'], doc: 'The purpose of this contact.' },
    ],
    Address: [
        { name: 'use', type: 'code', codes: ['home', 'work', 'temp', 'old', 'billing'], doc: 'The purpose of this address.' },
        { name: 'line', type: 'string', array: true, doc: 'Street, number and the like.' },
        { name: 'city', type: 'string', doc: 'The city or town.' },
        { name: 'postalCode', type: 'string', doc: 'The postal code.' },
        { name: 'country', type: 'string', doc: 'The country.' },
    ],
    CodeableConcept: [
        { name: 'coding', type: 'Coding', array: true, doc: 'Codes from terminologies.' },
        { name: 'text', type: 'string', doc: 'The concept in plain words.' },
    ],
    Coding: [
        { name: 'system', type: 'uri', doc: 'The terminology the code is from.' },
        { name: 'code', type: 'code', doc: 'The code.' },
        { name: 'display', type: 'string', doc: 'The code in words.' },
    ],
    Reference: [
        { name: 'reference', type: 'string', doc: 'The target as `Type/id`.' },
        { name: 'display', type: 'string', doc: 'The target in words.' },
    ],
    Period: [
        { name: 'start', type: 'dateTime', doc: 'When it starts.' },
        { name: 'end', type: 'dateTime', doc: 'When it ends.' },
    ],
    Quantity: [
        { name: 'value', type: 'decimal', doc: 'The amount.' },
        { name: 'unit', type: 'string', doc: 'The unit in words.' },
        { name: 'system', type: 'uri', doc: 'The system the unit is coded in.' },
        { name: 'code', type: 'code', doc: 'The unit as a code.' },
    ],
    Attachment: [
        { name: 'contentType', type: 'code', doc: 'The media type of the content.' },
        { name: 'data', type: 'string', doc: 'The content in base64.' },
        { name: 'title', type: 'string', doc: 'What to call the content.' },
    ],
    Meta: [
        { name: 'versionId', type: 'id', doc: 'The version, which the server sets.' },
        { name: 'lastUpdated', type: 'instant', doc: 'When the version was saved, which the server sets.' },
    ],
    Narrative: [
        { name: 'status', type: 'code', codes: ['generated', 'extensions', 'additional', 'empty'], doc: 'Where the text came from.' },
        { name: 'div', type: 'string', doc: 'The text as limited XHTML.' },
    ],
    Annotation: [
        { name: 'authorString', type: 'string', doc: 'Who wrote it.' },
        { name: 'time', type: 'dateTime', doc: 'When it was written.' },
        { name: 'text', type: 'markdown', doc: 'The note.' },
    ],
    Participant: [
        { name: 'type', type: 'CodeableConcept', array: true, doc: 'The role in the encounter.' },
        { name: 'individual', type: 'Reference', targets: ['Practitioner'], doc: 'Who took part.' },
    ],
    Qualification: [
        { name: 'code', type: 'CodeableConcept', doc: 'The qualification.' },
        { name: 'issuer', type: 'Reference', targets: ['Organization'], doc: 'Who issued it.' },
    ],
    Component: [
        { name: 'code', type: 'CodeableConcept', required: true, doc: 'What the component measures.' },
        { name: 'valueQuantity', type: 'Quantity', doc: 'The component as a quantity.' },
    ],
}

export const TYPES: readonly TypeDef[] = [
    {
        name: 'Patient',
        about: 'A person the clinics care for',
        elements: [
            ...BASE,
            { name: 'identifier', type: 'Identifier', array: true, doc: 'Numbers the patient is known by.' },
            { name: 'active', type: 'boolean', doc: 'Whether the record is in use.' },
            { name: 'name', type: 'HumanName', array: true, doc: 'The names the patient goes by.' },
            { name: 'telecom', type: 'ContactPoint', array: true, doc: 'How to reach the patient.' },
            { name: 'gender', type: 'code', codes: ['male', 'female', 'other', 'unknown'], doc: 'The gender for administration.' },
            { name: 'birthDate', type: 'date', doc: 'The date of birth.' },
            { name: 'deceasedBoolean', type: 'boolean', doc: 'Whether the patient has died.' },
            { name: 'address', type: 'Address', array: true, doc: 'Where the patient lives.' },
            {
                name: 'generalPractitioner',
                type: 'Reference',
                array: true,
                targets: ['Practitioner', 'Organization'],
                doc: 'The patient’s own practitioner or clinic.',
            },
            { name: 'managingOrganization', type: 'Reference', targets: ['Organization'], doc: 'The clinic that keeps the record.' },
        ],
    },
    {
        name: 'Practitioner',
        about: 'A person who gives care',
        elements: [
            ...BASE,
            { name: 'identifier', type: 'Identifier', array: true, doc: 'Numbers the practitioner is known by.' },
            { name: 'active', type: 'boolean', doc: 'Whether the record is in use.' },
            { name: 'name', type: 'HumanName', array: true, doc: 'The names the practitioner goes by.' },
            { name: 'telecom', type: 'ContactPoint', array: true, doc: 'How to reach the practitioner.' },
            { name: 'gender', type: 'code', codes: ['male', 'female', 'other', 'unknown'], doc: 'The gender for administration.' },
            { name: 'qualification', type: 'Qualification', array: true, doc: 'Degrees, licenses and the like.' },
        ],
    },
    {
        name: 'Organization',
        about: 'A clinic or another body',
        elements: [
            ...BASE,
            { name: 'identifier', type: 'Identifier', array: true, doc: 'Numbers the organization is known by.' },
            { name: 'active', type: 'boolean', doc: 'Whether the record is in use.' },
            { name: 'name', type: 'string', doc: 'The name the organization goes by.' },
            { name: 'telecom', type: 'ContactPoint', array: true, doc: 'How to reach the organization.' },
            { name: 'address', type: 'Address', array: true, doc: 'Where the organization is.' },
        ],
    },
    {
        name: 'Encounter',
        about: 'A visit, a stay or a call',
        elements: [
            ...BASE,
            {
                name: 'status',
                type: 'code',
                required: true,
                codes: ['planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled', 'entered-in-error', 'unknown'],
                doc: 'Where the encounter stands.',
            },
            { name: 'class', type: 'Coding', required: true, doc: 'Ambulatory, inpatient, virtual and the like.' },
            { name: 'type', type: 'CodeableConcept', array: true, doc: 'What kind of encounter it is.' },
            { name: 'subject', type: 'Reference', targets: ['Patient'], doc: 'The patient.' },
            { name: 'participant', type: 'Participant', array: true, doc: 'Who took part.' },
            { name: 'period', type: 'Period', doc: 'When it took place.' },
            { name: 'reasonCode', type: 'CodeableConcept', array: true, doc: 'Why it took place.' },
            { name: 'serviceProvider', type: 'Reference', targets: ['Organization'], doc: 'The clinic that gave the care.' },
        ],
    },
    {
        name: 'Observation',
        about: 'A measurement or a finding',
        elements: [
            ...BASE,
            {
                name: 'status',
                type: 'code',
                required: true,
                codes: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'],
                doc: 'Where the result stands.',
            },
            { name: 'category', type: 'CodeableConcept', array: true, doc: 'The kind of observation, such as vital signs.' },
            { name: 'code', type: 'CodeableConcept', required: true, doc: 'What was observed.' },
            { name: 'subject', type: 'Reference', targets: ['Patient'], doc: 'Who it is about.' },
            { name: 'encounter', type: 'Reference', targets: ['Encounter'], doc: 'The encounter it was made in.' },
            { name: 'effectiveDateTime', type: 'dateTime', doc: 'When it was observed.' },
            { name: 'issued', type: 'instant', doc: 'When it was made available.' },
            { name: 'performer', type: 'Reference', array: true, targets: ['Practitioner', 'Organization'], doc: 'Who is responsible.' },
            { name: 'valueQuantity', type: 'Quantity', doc: 'The result as a quantity.' },
            { name: 'valueString', type: 'string', doc: 'The result as text.' },
            { name: 'valueCodeableConcept', type: 'CodeableConcept', doc: 'The result as a code.' },
            { name: 'interpretation', type: 'CodeableConcept', array: true, doc: 'High, low, normal and the like.' },
            { name: 'note', type: 'Annotation', array: true, doc: 'Comments on the result.' },
            { name: 'component', type: 'Component', array: true, doc: 'Results measured together, such as both blood pressures.' },
        ],
    },
    {
        name: 'Condition',
        about: 'A problem, a diagnosis or a concern',
        elements: [
            ...BASE,
            { name: 'clinicalStatus', type: 'CodeableConcept', doc: 'Active, recurrence, remission or resolved.' },
            { name: 'verificationStatus', type: 'CodeableConcept', doc: 'How certain it is.' },
            { name: 'category', type: 'CodeableConcept', array: true, doc: 'A problem list item or an encounter diagnosis.' },
            { name: 'severity', type: 'CodeableConcept', doc: 'How severe it is.' },
            { name: 'code', type: 'CodeableConcept', doc: 'The condition.' },
            { name: 'subject', type: 'Reference', required: true, targets: ['Patient'], doc: 'Who has the condition.' },
            { name: 'encounter', type: 'Reference', targets: ['Encounter'], doc: 'The encounter it was recorded in.' },
            { name: 'onsetDateTime', type: 'dateTime', doc: 'When it started.' },
            { name: 'abatementDateTime', type: 'dateTime', doc: 'When it ended.' },
            { name: 'recordedDate', type: 'dateTime', doc: 'When it was first recorded.' },
            { name: 'recorder', type: 'Reference', targets: ['Practitioner'], doc: 'Who recorded it.' },
            { name: 'note', type: 'Annotation', array: true, doc: 'Comments on the condition.' },
        ],
    },
    {
        name: 'Library',
        about: 'A body of logic, such as CQL',
        elements: [
            ...BASE,
            { name: 'url', type: 'uri', doc: 'The canonical address of the library.' },
            { name: 'version', type: 'string', doc: 'The business version, which the CQL names.' },
            { name: 'name', type: 'string', doc: 'The name for machines, which the CQL names.' },
            { name: 'title', type: 'string', doc: 'The name for people.' },
            {
                name: 'status',
                type: 'code',
                required: true,
                codes: ['draft', 'active', 'retired', 'unknown'],
                doc: 'Where the library stands.',
            },
            { name: 'type', type: 'CodeableConcept', required: true, doc: 'Logic library, model definition and the like.' },
            { name: 'date', type: 'dateTime', doc: 'When it last changed in substance.' },
            { name: 'publisher', type: 'string', doc: 'Who publishes it.' },
            { name: 'description', type: 'markdown', doc: 'What the library is for.' },
            { name: 'content', type: 'Attachment', array: true, doc: 'The library’s text, such as CQL.' },
        ],
    },
]

export const TYPE_NAMES = TYPES.map((type) => type.name)

export const typeDef = (name: string) => TYPES.find((type) => type.name === name)

const PATTERNS: Partial<Record<Primitive, string>> = {
    id: '^[A-Za-z0-9\\-.]{1,64}$',
    date: '^\\d{4}(-\\d{2}(-\\d{2})?)?$',
    dateTime: '^\\d{4}(-\\d{2}(-\\d{2}(T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:\\d{2}))?)?)?$',
    instant: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$',
}

export function isPrimitive(type: ElementType): type is Primitive {
    return !(type in DATATYPES)
}

/** The pattern a primitive's text must match, when it has one. */
export const patternOf = (type: ElementType): RegExp | undefined => {
    const pattern = isPrimitive(type) ? PATTERNS[type] : undefined
    return pattern === undefined ? undefined : new RegExp(pattern)
}

/** One element's schema, without the array around a repeating one. */
function single(element: ElementDef): JsonSchema {
    const { type } = element
    if (!isPrimitive(type)) return { $ref: `#/$defs/${type}`, description: element.doc }
    if (type === 'boolean') return { type: 'boolean', description: element.doc }
    if (type === 'decimal') return { type: 'number', description: element.doc }
    if (type === 'integer') return { type: 'integer', description: element.doc }
    const pattern = PATTERNS[type]
    return {
        type: 'string',
        description: element.doc,
        ...(element.codes === undefined ? {} : { enum: [...element.codes] }),
        ...(pattern === undefined ? {} : { pattern }),
    }
}

function objectSchema(elements: readonly ElementDef[]): JsonSchema {
    const required = elements.filter((element) => element.required === true).map((element) => element.name)
    return {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(
            elements.map((element) => [
                element.name,
                element.array === true ? { type: 'array', items: single(element), minItems: 1, description: element.doc } : single(element),
            ]),
        ),
        ...(required.length === 0 ? {} : { required }),
    }
}

/** A JSON Schema (2020-12) for one resource type, for the editor to check and complete from. */
export function schemaFor(name: string): JsonSchema | undefined {
    const def = typeDef(name)
    if (def === undefined) return undefined
    const schema = objectSchema(def.elements)
    const properties = {
        ...(schema.properties as Record<string, JsonSchema>),
        resourceType: { const: name, description: 'The type of the resource.' },
    }
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        ...schema,
        properties,
        $defs: Object.fromEntries(Object.entries(DATATYPES).map(([type, elements]) => [type, objectSchema(elements)])),
    }
}
