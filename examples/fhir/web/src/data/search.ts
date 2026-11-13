/**
 * FHIR search on the simulated server: `Type?param=value&...` read as the specification reads it.
 * Each search parameter is defined, as FHIR defines it, by a FHIRPath expression that picks the
 * values it matches from a resource; the expressions are evaluated by the FHIRPath engine. The
 * parameter types string, token, date, reference and quantity are matched with their modifiers
 * (`:exact`, `:contains`, `:not`, `:text`, `:missing`) and prefixes (`eq`, `ne`, `gt`, `lt`, `ge`,
 * `le`, `sa`, `eb`); a comma is an or, a repeated parameter an and. `_count`, `_offset`, `_sort`
 * and `_summary=count` shape the result, a searchset Bundle.
 */
import fhirpath from 'fhirpath'
import r4 from 'fhirpath/fhir-context/r4'

import { keyOf, type Issue, type Resource } from './model'
import { SERVER, type Stored } from './server'
import { TYPE_NAMES } from './types'

export type ParamType = 'string' | 'token' | 'date' | 'reference' | 'quantity' | 'uri'

export interface SearchParam {
    name: string
    type: ParamType
    expression: string
    doc: string
}

const COMMON: SearchParam[] = [
    { name: '_id', type: 'token', expression: 'Resource.id', doc: 'The logical id of the resource.' },
    { name: '_lastUpdated', type: 'date', expression: 'Resource.meta.lastUpdated', doc: 'When the resource last changed.' },
]

/** The search parameters each type takes, beside the common ones. */
const BY_TYPE: Record<string, SearchParam[]> = {
    Patient: [
        { name: 'name', type: 'string', expression: 'Patient.name', doc: 'Any part of a name: given, family, prefix or text.' },
        { name: 'family', type: 'string', expression: 'Patient.name.family', doc: 'The family name.' },
        { name: 'given', type: 'string', expression: 'Patient.name.given', doc: 'A given name.' },
        { name: 'gender', type: 'token', expression: 'Patient.gender', doc: 'male, female, other or unknown.' },
        { name: 'birthdate', type: 'date', expression: 'Patient.birthDate', doc: 'The date of birth.' },
        { name: 'address-city', type: 'string', expression: 'Patient.address.city', doc: 'The city of an address.' },
        { name: 'identifier', type: 'token', expression: 'Patient.identifier', doc: 'A patient number, as system|value.' },
        { name: 'active', type: 'token', expression: 'Patient.active', doc: 'Whether the record is in use.' },
        {
            name: 'general-practitioner',
            type: 'reference',
            expression: 'Patient.generalPractitioner',
            doc: 'The patient’s own practitioner.',
        },
        { name: 'organization', type: 'reference', expression: 'Patient.managingOrganization', doc: 'The clinic that keeps the record.' },
    ],
    Practitioner: [
        { name: 'name', type: 'string', expression: 'Practitioner.name', doc: 'Any part of a name.' },
        { name: 'family', type: 'string', expression: 'Practitioner.name.family', doc: 'The family name.' },
        { name: 'gender', type: 'token', expression: 'Practitioner.gender', doc: 'male, female, other or unknown.' },
        { name: 'identifier', type: 'token', expression: 'Practitioner.identifier', doc: 'A staff number, as system|value.' },
        { name: 'active', type: 'token', expression: 'Practitioner.active', doc: 'Whether the record is in use.' },
    ],
    Organization: [
        { name: 'name', type: 'string', expression: 'Organization.name', doc: 'The name of the organization.' },
        { name: 'address-city', type: 'string', expression: 'Organization.address.city', doc: 'The city of an address.' },
        { name: 'active', type: 'token', expression: 'Organization.active', doc: 'Whether the record is in use.' },
    ],
    Encounter: [
        { name: 'status', type: 'token', expression: 'Encounter.status', doc: 'Where the encounter stands.' },
        { name: 'class', type: 'token', expression: 'Encounter.class', doc: 'Ambulatory, inpatient, virtual and the like.' },
        { name: 'date', type: 'date', expression: 'Encounter.period.start', doc: 'When it started.' },
        { name: 'subject', type: 'reference', expression: 'Encounter.subject', doc: 'The patient.' },
        { name: 'patient', type: 'reference', expression: 'Encounter.subject', doc: 'The patient.' },
        { name: 'practitioner', type: 'reference', expression: 'Encounter.participant.individual', doc: 'A practitioner who took part.' },
        { name: 'service-provider', type: 'reference', expression: 'Encounter.serviceProvider', doc: 'The clinic that gave the care.' },
    ],
    Observation: [
        { name: 'code', type: 'token', expression: 'Observation.code', doc: 'What was observed, as system|code.' },
        { name: 'category', type: 'token', expression: 'Observation.category', doc: 'The kind, such as vital-signs.' },
        { name: 'status', type: 'token', expression: 'Observation.status', doc: 'Where the result stands.' },
        { name: 'subject', type: 'reference', expression: 'Observation.subject', doc: 'Who it is about.' },
        { name: 'patient', type: 'reference', expression: 'Observation.subject', doc: 'The patient it is about.' },
        { name: 'encounter', type: 'reference', expression: 'Observation.encounter', doc: 'The encounter it was made in.' },
        { name: 'date', type: 'date', expression: 'Observation.effective', doc: 'When it was observed.' },
        { name: 'value-quantity', type: 'quantity', expression: 'Observation.value.ofType(Quantity)', doc: 'The value, such as gt140.' },
        { name: 'performer', type: 'reference', expression: 'Observation.performer', doc: 'Who is responsible.' },
    ],
    Condition: [
        { name: 'code', type: 'token', expression: 'Condition.code', doc: 'The condition, as system|code.' },
        {
            name: 'clinical-status',
            type: 'token',
            expression: 'Condition.clinicalStatus',
            doc: 'active, recurrence, remission or resolved.',
        },
        { name: 'subject', type: 'reference', expression: 'Condition.subject', doc: 'Who has the condition.' },
        { name: 'patient', type: 'reference', expression: 'Condition.subject', doc: 'The patient who has it.' },
        { name: 'onset-date', type: 'date', expression: 'Condition.onset.ofType(dateTime)', doc: 'When it started.' },
        { name: 'recorded-date', type: 'date', expression: 'Condition.recordedDate', doc: 'When it was first recorded.' },
    ],
    Library: [
        { name: 'name', type: 'string', expression: 'Library.name', doc: 'The name for machines.' },
        { name: 'title', type: 'string', expression: 'Library.title', doc: 'The name for people.' },
        { name: 'version', type: 'token', expression: 'Library.version', doc: 'The business version.' },
        { name: 'status', type: 'token', expression: 'Library.status', doc: 'draft, active or retired.' },
        { name: 'url', type: 'uri', expression: 'Library.url', doc: 'The canonical address.' },
        { name: 'description', type: 'string', expression: 'Library.description', doc: 'Words in the description.' },
    ],
}

/** The result parameters every search takes. */
export const RESULT_PARAMS: SearchParam[] = [
    { name: '_count', type: 'token', expression: '', doc: 'How many to return in one page.' },
    { name: '_offset', type: 'token', expression: '', doc: 'How many matches to skip, for the next page.' },
    { name: '_sort', type: 'token', expression: '', doc: 'Parameters to sort by, a leading - for descending.' },
    { name: '_summary', type: 'token', expression: '', doc: 'count returns only how many match.' },
]

/** The search parameters a type takes, its own first. */
export function paramsOf(type: string): SearchParam[] {
    return [...(BY_TYPE[type] ?? []), ...COMMON]
}

const compiled = new Map<string, (resource: Resource) => unknown[]>()

/** The values a parameter's expression picks from a resource. */
function valuesOf(param: SearchParam, resource: Resource): unknown[] {
    const expression = param.expression.replace(/^Resource\./, `${resource.resourceType}.`)
    let run = compiled.get(expression)
    if (run === undefined) {
        const made = fhirpath.compile(expression, r4)
        run = (one: Resource) => made(one) as unknown[]
        compiled.set(expression, run)
    }
    return run(resource)
}

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** The strings a string parameter matches against in a value: a name's or an address's parts, or the text. */
function stringsOf(value: unknown): string[] {
    if (typeof value === 'string') return [value]
    if (typeof value !== 'object' || value === null) return []
    return Object.entries(value as Record<string, unknown>)
        .filter(([name]) => ['family', 'given', 'text', 'prefix', 'suffix', 'line', 'city', 'postalCode', 'country'].includes(name))
        .flatMap(([, part]) => (Array.isArray(part) ? part : [part]))
        .filter((part): part is string => typeof part === 'string')
}

/** The system and code pairs a token parameter matches against in a value. */
function tokensOf(value: unknown): { system?: string; code: string; text?: string }[] {
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return [{ code: String(value) }]
    if (typeof value !== 'object' || value === null) return []
    const fields = value as Record<string, unknown>
    if (Array.isArray(fields.coding))
        return (fields.coding as Record<string, unknown>[]).flatMap((coding) =>
            tokensOf(coding).map((token) => ({ ...token, text: typeof fields.text === 'string' ? fields.text : token.text })),
        )
    const code = fields.code ?? fields.value
    if (typeof code !== 'string') return []
    return [
        {
            code,
            ...(typeof fields.system === 'string' ? { system: fields.system } : {}),
            ...(typeof fields.display === 'string' ? { text: fields.display } : {}),
        },
    ]
}

const PREFIXES = ['eq', 'ne', 'gt', 'lt', 'ge', 'le', 'sa', 'eb'] as const
type Prefix = (typeof PREFIXES)[number]

function prefixed(text: string): { prefix: Prefix; rest: string } {
    const head = text.slice(0, 2) as Prefix
    if (PREFIXES.includes(head) && /^[\d-]/.test(text.slice(2))) return { prefix: head, rest: text.slice(2) }
    return { prefix: 'eq', rest: text }
}

function compare(order: number, prefix: Prefix): boolean {
    switch (prefix) {
        case 'eq':
            return order === 0
        case 'ne':
            return order !== 0
        case 'gt':
        case 'sa':
            return order > 0
        case 'lt':
        case 'eb':
            return order < 0
        case 'ge':
            return order >= 0
        case 'le':
            return order <= 0
    }
}

const DATE = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/

/** Whether one value matches one of a parameter's alternatives, or says why the alternative cannot be read. */
function matchOne(param: SearchParam, modifier: string | undefined, wanted: string, value: unknown): boolean {
    switch (param.type) {
        case 'string': {
            const asked = fold(wanted)
            return stringsOf(value).some((text) => {
                const have = fold(text)
                if (modifier === 'exact') return text === wanted
                if (modifier === 'contains') return have.includes(asked)
                return have.startsWith(asked)
            })
        }
        case 'uri':
            return value === wanted
        case 'token': {
            const bar = wanted.indexOf('|')
            const system = bar === -1 ? undefined : wanted.slice(0, bar)
            const code = bar === -1 ? wanted : wanted.slice(bar + 1)
            return tokensOf(value).some((token) => {
                if (modifier === 'text') return fold(token.text ?? token.code).includes(fold(wanted))
                const systemOk = system === undefined || (system === '' ? token.system === undefined : token.system === system)
                const codeOk = code === '' || token.code === code
                return systemOk && codeOk
            })
        }
        case 'reference': {
            const target = typeof value === 'object' && value !== null ? (value as { reference?: unknown }).reference : undefined
            if (typeof target !== 'string') return false
            return wanted.includes('/') ? target === wanted : target.endsWith(`/${wanted}`)
        }
        case 'date': {
            if (typeof value !== 'string') return false
            const { prefix, rest } = prefixed(wanted)
            const have = value.slice(0, rest.length)
            return compare(have.localeCompare(rest), prefix)
        }
        case 'quantity': {
            const amount = typeof value === 'object' && value !== null ? (value as { value?: unknown; code?: unknown; unit?: unknown }) : {}
            if (typeof amount.value !== 'number') return false
            const [number = '', , unit] = wanted.split('|')
            const { prefix, rest } = prefixed(number)
            if (unit !== undefined && unit !== '' && amount.code !== unit && amount.unit !== unit) return false
            return compare(Math.sign(amount.value - Number(rest)), prefix)
        }
    }
}

/** Why one alternative of a parameter cannot be read, or null when it can. */
function badValue(param: SearchParam, wanted: string): string | null {
    if (wanted === '') return `${param.name} is empty.`
    if (param.type === 'date' && !DATE.test(prefixed(wanted).rest))
        return `"${wanted}" is not a date; write it as 2026-03-01, with a prefix such as ge if wanted.`
    if (param.type === 'quantity' && !Number.isFinite(Number(prefixed(wanted.split('|')[0] ?? '').rest)))
        return `"${wanted}" is not a quantity; write it as a number, with a prefix such as gt and |system|unit if wanted.`
    return null
}

export interface SearchResult {
    type: string
    /** The query as the server read it, its parameters in the order given. */
    query: string
    total: number
    matches: Stored[]
    /** What the server could not read and so left out. */
    issues: Issue[]
    bundle: Resource
    offset: number
    count: number
}

/** A query's type and its parameters, from `Patient?gender=female`, `/Patient?...` or a whole address. */
export function readQuery(text: string): { type: string; params: [string, string][] } {
    const trimmed = text.trim().replace(SERVER.base, '').replace(/^\/+/, '')
    const at = trimmed.indexOf('?')
    const type = (at === -1 ? trimmed : trimmed.slice(0, at)).trim()
    const search = at === -1 ? '' : trimmed.slice(at + 1)
    const params = [...new URLSearchParams(search).entries()]
    return { type, params }
}

/** Runs a search against the server's resources: the matches, ordered and paged, as a searchset Bundle. */
export function search(all: readonly Stored[], text: string, pageSize: number): SearchResult {
    const { type, params } = readQuery(text)
    const issues: Issue[] = []
    if (!TYPE_NAMES.includes(type))
        issues.push({
            severity: 'error',
            code: 'not-supported',
            message:
                type === ''
                    ? 'Name a resource type first, as in Patient?name=ada.'
                    : `The server keeps no ${type} resources; it keeps ${TYPE_NAMES.join(', ')}.`,
        })
    const known = paramsOf(type)
    let rows = all.filter((row) => row.type === type)
    let count = pageSize
    let offset = 0
    let sort: string[] = []
    let summary = false
    const used: [string, string][] = []
    for (const [key, value] of params) {
        const [name = '', modifier] = key.split(':')
        if (name === '_count') {
            const n = Number(value)
            if (Number.isInteger(n) && n >= 0) {
                count = Math.min(n, 500)
                used.push([key, value])
            } else
                issues.push({
                    severity: 'warning',
                    code: 'value',
                    message: `_count takes a whole number, not "${value}"; it was left out.`,
                })
            continue
        }
        if (name === '_offset') {
            offset = Math.max(0, Number(value) || 0)
            used.push([key, value])
            continue
        }
        if (name === '_sort') {
            sort = value.split(',').filter((one) => one !== '')
            const unknown = sort.filter((one) => !known.some((param) => param.name === one.replace(/^-/, '')))
            for (const one of unknown)
                issues.push({
                    severity: 'warning',
                    code: 'not-supported',
                    message: `${type} has no parameter ${one.replace(/^-/, '')} to sort by; it was left out.`,
                })
            sort = sort.filter((one) => !unknown.includes(one))
            used.push([key, value])
            continue
        }
        if (name === '_summary') {
            summary = value === 'count'
            used.push([key, value])
            continue
        }
        const param = known.find((one) => one.name === name)
        if (param === undefined) {
            issues.push({
                severity: 'warning',
                code: 'not-supported',
                message: `${type} has no search parameter ${name}; it was left out.`,
            })
            continue
        }
        if (modifier !== undefined && !['missing', 'exact', 'contains', 'not', 'text'].includes(modifier)) {
            issues.push({
                severity: 'warning',
                code: 'not-supported',
                message: `The modifier :${modifier} is not supported; ${key} was left out.`,
            })
            continue
        }
        if (modifier === 'missing') {
            const missing = value === 'true'
            rows = rows.filter((row) => (valuesOf(param, row.resource).length === 0) === missing)
            used.push([key, value])
            continue
        }
        const alternatives = value.split(',')
        const bad = alternatives.map((one) => badValue(param, one)).find((reason) => reason !== null)
        if (bad !== undefined && bad !== null) {
            issues.push({ severity: 'error', code: 'value', message: `${bad} ${key} was left out.` })
            continue
        }
        rows = rows.filter((row) => {
            const values = valuesOf(param, row.resource)
            const hit = alternatives.some((wanted) => values.some((one) => matchOne(param, modifier, wanted, one)))
            return modifier === 'not' ? !hit : hit
        })
        used.push([key, value])
    }
    if (sort.length > 0) {
        const keys = sort.map((one) => ({ param: known.find((param) => param.name === one.replace(/^-/, '')), down: one.startsWith('-') }))
        const first = (param: SearchParam | undefined, row: Stored) => {
            if (param === undefined) return ''
            const value = valuesOf(param, row.resource)[0]
            return typeof value === 'object' ? (stringsOf(value)[0] ?? tokensOf(value)[0]?.code ?? '') : String(value ?? '')
        }
        rows = [...rows].sort((left, right) => {
            for (const { param, down } of keys) {
                const order = first(param, left).localeCompare(first(param, right), 'en', { numeric: true })
                if (order !== 0) return down ? -order : order
            }
            return 0
        })
    }
    const total = rows.length
    const page = summary ? [] : rows.slice(offset, offset + count)
    const query = `${type}${used.length === 0 ? '' : `?${used.map(([key, value]) => `${key}=${value}`).join('&')}`}`
    const link = (at: number) => {
        const rest = used.filter(([key]) => key !== '_offset')
        const shown = [...rest, ...(at === 0 ? [] : [['_offset', String(at)] as [string, string]])]
        return `${SERVER.base}/${type}${shown.length === 0 ? '' : `?${shown.map(([key, value]) => `${key}=${value}`).join('&')}`}`
    }
    const links = [{ relation: 'self', url: link(offset) }]
    if (!summary && offset + count < total) links.push({ relation: 'next', url: link(offset + count) })
    if (!summary && offset > 0) links.push({ relation: 'previous', url: link(Math.max(0, offset - count)) })
    const bundle: Resource = {
        resourceType: 'Bundle',
        id: 'search',
        type: 'searchset',
        total,
        link: links,
        entry: [
            ...page.map((row) => ({ fullUrl: `${SERVER.base}/${keyOf(row.resource)}`, resource: row.resource, search: { mode: 'match' } })),
            ...(issues.length === 0
                ? []
                : [
                      {
                          resource: {
                              resourceType: 'OperationOutcome',
                              issue: issues.map((issue) => ({ severity: issue.severity, code: issue.code, diagnostics: issue.message })),
                          },
                          search: { mode: 'outcome' },
                      },
                  ]),
        ],
    }
    if (bundle.entry !== undefined && (bundle.entry as unknown[]).length === 0) delete bundle.entry
    return { type, query, total, matches: page, issues, bundle, offset, count }
}
