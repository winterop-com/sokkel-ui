/**
 * What the demo server starts with: made-up patients of two clinics, their visits, vital signs and
 * conditions, the practitioners who saw them, and CQL libraries in a few versions. Every person is
 * invented, and the data is drawn from fixed numbers, so it is the same on every reset.
 */
import { toBase64, type Resource } from './model'

export const LOINC = 'http://loinc.org'
export const SNOMED = 'http://snomed.info/sct'
export const UCUM = 'http://unitsofmeasure.org'
const PATIENT_NUMBER = 'https://example.org/fhir/sid/patient-number'
const STAFF_NUMBER = 'https://example.org/fhir/sid/staff-number'
const CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category'
const CLINICAL = 'http://terminology.hl7.org/CodeSystem/condition-clinical'
const VERIFICATION = 'http://terminology.hl7.org/CodeSystem/condition-ver-status'
const ACT_CODE = 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
const LIBRARY_TYPE = 'http://terminology.hl7.org/CodeSystem/library-type'
export const LIBRARY_BASE = 'https://example.org/fhir/Library'

/** A version of a resource as the server first saw it. */
export interface Seeded {
    resource: Resource
    /** Earlier versions, oldest first, each with the instant it was saved. */
    earlier?: { at: string; resource: Resource }[]
}

/** The vital signs the clinics measure, with the LOINC code and unit of each. */
export const VITALS = [
    { id: 'weight', code: '29463-7', display: 'Body weight', unit: 'kg' },
    { id: 'heart-rate', code: '8867-4', display: 'Heart rate', unit: '/min' },
    { id: 'systolic', code: '8480-6', display: 'Systolic blood pressure', unit: 'mm[Hg]' },
] as const

const ORGANIZATIONS = [
    { id: 'org-harbor', name: 'Harbor Clinic', city: 'Bergen', line: 'Kaigaten 4' },
    { id: 'org-juniper', name: 'Juniper Health Center', city: 'Tromsø', line: 'Storgata 81' },
]

const PRACTITIONERS = [
    { id: 'prac-01', given: 'Hedda', family: 'Solberg', gender: 'female', org: 'org-harbor' },
    { id: 'prac-02', given: 'Viktor', family: 'Aasen', gender: 'male', org: 'org-harbor' },
    { id: 'prac-03', given: 'Runa', family: 'Eide', gender: 'female', org: 'org-juniper' },
]

/** The invented patients: name, gender, birth date, city, clinic, and a base for their measurements. */
const PATIENTS = [
    { given: ['Solveig'], family: 'Brekke', gender: 'female', born: '1958-03-14', city: 'Bergen', weight: 68, pulse: 71, systolic: 148 },
    { given: ['Tor', 'Erik'], family: 'Nyland', gender: 'male', born: '1971-09-02', city: 'Bergen', weight: 92, pulse: 78, systolic: 139 },
    { given: ['Ingrid'], family: 'Vik', gender: 'female', born: '1989-12-21', city: 'Bergen', weight: 61, pulse: 64, systolic: 117 },
    { given: ['Emil'], family: 'Haugland', gender: 'male', born: '2004-05-30', city: 'Bergen', weight: 74, pulse: 59, systolic: 121 },
    { given: ['Mira'], family: 'Lunde', gender: 'female', born: '1966-07-08', city: 'Bergen', weight: 83, pulse: 76, systolic: 152 },
    { given: ['Jonas'], family: 'Berget', gender: 'male', born: '1949-01-17', city: 'Bergen', weight: 79, pulse: 69, systolic: 161 },
    { given: ['Astrid'], family: 'Moen', gender: 'female', born: '1995-10-03', city: 'Tromsø', weight: 57, pulse: 66, systolic: 112 },
    { given: ['Liam'], family: 'Strandli', gender: 'male', born: '1982-04-26', city: 'Tromsø', weight: 101, pulse: 84, systolic: 144 },
    { given: ['Nora'], family: 'Dalen', gender: 'female', born: '1977-02-11', city: 'Tromsø', weight: 72, pulse: 73, systolic: 128 },
    { given: ['Henrik'], family: 'Fjellby', gender: 'male', born: '1963-11-29', city: 'Tromsø', weight: 88, pulse: 81, systolic: 157 },
    { given: ['Selma'], family: 'Aune', gender: 'female', born: '2011-06-15', city: 'Tromsø', weight: 39, pulse: 88, systolic: 104 },
    { given: ['Oskar'], family: 'Lie', gender: 'unknown', born: '1938-08-09', city: 'Tromsø', weight: 66, pulse: 62, systolic: 166 },
]

/** The conditions some patients have, by the patient's place in the list. */
const CONDITIONS: { patient: number; code: string; display: string; onset: string; status: 'active' | 'resolved' }[] = [
    { patient: 0, code: '38341003', display: 'Hypertensive disorder', onset: '2019-04-02', status: 'active' },
    { patient: 1, code: '44054006', display: 'Diabetes mellitus type 2', onset: '2021-01-19', status: 'active' },
    { patient: 1, code: '38341003', display: 'Hypertensive disorder', onset: '2022-08-30', status: 'active' },
    { patient: 4, code: '38341003', display: 'Hypertensive disorder', onset: '2017-10-11', status: 'active' },
    { patient: 5, code: '38341003', display: 'Hypertensive disorder', onset: '2012-03-05', status: 'active' },
    { patient: 5, code: '44054006', display: 'Diabetes mellitus type 2', onset: '2015-06-22', status: 'active' },
    { patient: 6, code: '195967001', display: 'Asthma', onset: '2008-09-14', status: 'active' },
    { patient: 7, code: '44054006', display: 'Diabetes mellitus type 2', onset: '2024-02-07', status: 'active' },
    { patient: 9, code: '38341003', display: 'Hypertensive disorder', onset: '2020-12-01', status: 'active' },
    { patient: 10, code: '195967001', display: 'Asthma', onset: '2016-03-28', status: 'resolved' },
    { patient: 11, code: '38341003', display: 'Hypertensive disorder', onset: '2005-07-19', status: 'active' },
]

/** The days of the year's six visits, the same for every patient but shifted by a few days each. */
const VISIT_DAYS = ['2026-01-12', '2026-03-09', '2026-05-04', '2026-07-06', '2026-09-07', '2026-10-26']

/** A fixed wobble for the n-th measurement, so the series look measured without being random. */
const wobble = (n: number, size: number) => Math.round(Math.sin(n * 1.7 + 0.4) * size * 10) / 10

const pad = (n: number, width = 3) => String(n).padStart(width, '0')

const shift = (day: string, days: number) => {
    const date = new Date(`${day}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
}

const meta = (at: string) => ({ versionId: '1', lastUpdated: at })

function organizations(): Resource[] {
    return ORGANIZATIONS.map((org) => ({
        resourceType: 'Organization',
        id: org.id,
        meta: meta('2026-01-02T08:00:00Z'),
        active: true,
        name: org.name,
        telecom: [{ system: 'email', value: `${org.id.slice(4)}@example.org`, use: 'work' }],
        address: [{ use: 'work', line: [org.line], city: org.city, country: 'Norway' }],
    }))
}

function practitioners(): Resource[] {
    return PRACTITIONERS.map((prac, index) => ({
        resourceType: 'Practitioner',
        id: prac.id,
        meta: meta('2026-01-02T08:30:00Z'),
        identifier: [{ system: STAFF_NUMBER, value: `S-${pad(index + 41)}` }],
        active: true,
        name: [{ use: 'official', family: prac.family, given: [prac.given], prefix: ['Dr.'] }],
        gender: prac.gender,
        telecom: [{ system: 'email', value: `${prac.given.toLowerCase()}.${prac.family.toLowerCase()}@example.org`, use: 'work' }],
        qualification: [
            {
                code: { coding: [{ system: SNOMED, code: '309343006', display: 'Physician' }], text: 'Physician' },
                issuer: { reference: `Organization/${prac.org}` },
            },
        ],
    }))
}

const patientId = (index: number) => `pat-${pad(index + 1)}`
const orgOf = (index: number) => (PATIENTS[index]?.city === 'Bergen' ? 'org-harbor' : 'org-juniper')
const pracOf = (index: number) => (orgOf(index) === 'org-harbor' ? (index % 2 === 0 ? 'prac-01' : 'prac-02') : 'prac-03')
const nameOf = (index: number) => {
    const patient = PATIENTS[index]
    return patient === undefined ? '' : `${patient.given.join(' ')} ${patient.family}`
}

function patients(): Resource[] {
    return PATIENTS.map((patient, index) => ({
        resourceType: 'Patient',
        id: patientId(index),
        meta: meta('2026-01-05T09:00:00Z'),
        identifier: [{ use: 'usual', system: PATIENT_NUMBER, value: `P-${pad(index + 1001, 4)}` }],
        active: true,
        name: [{ use: 'official', family: patient.family, given: patient.given }],
        telecom: [{ system: 'phone', value: `+47 400 ${pad(index * 37 + 120)} ${pad(index * 11 + 10, 2)}`, use: 'mobile' }],
        gender: patient.gender,
        birthDate: patient.born,
        address: [
            {
                use: 'home',
                line: [`${['Fjordveien', 'Sjøgata', 'Bakken', 'Lia'][index % 4] ?? ''} ${String(index + 3)}`],
                city: patient.city,
                country: 'Norway',
            },
        ],
        generalPractitioner: [{ reference: `Practitioner/${pracOf(index)}` }],
        managingOrganization: { reference: `Organization/${orgOf(index)}` },
    }))
}

function encounters(): Resource[] {
    return PATIENTS.flatMap((_, index) =>
        VISIT_DAYS.map((day, visit) => {
            const date = shift(day, index % 5)
            return {
                resourceType: 'Encounter',
                id: `enc-${pad(index + 1)}-${String(visit + 1)}`,
                meta: meta(`${date}T11:00:00Z`),
                status: 'finished',
                class: { system: ACT_CODE, code: 'AMB', display: 'ambulatory' },
                type: [{ coding: [{ system: SNOMED, code: '185349003', display: 'Encounter for check up' }], text: 'Check-up' }],
                subject: { reference: `Patient/${patientId(index)}`, display: nameOf(index) },
                participant: [{ individual: { reference: `Practitioner/${pracOf(index)}` } }],
                period: { start: `${date}T09:00:00Z`, end: `${date}T09:40:00Z` },
                serviceProvider: { reference: `Organization/${orgOf(index)}` },
            }
        }),
    )
}

function observations(): Resource[] {
    return PATIENTS.flatMap((patient, index) =>
        VISIT_DAYS.flatMap((day, visit) => {
            const date = shift(day, index % 5)
            const at = `${date}T09:${pad(10 + (index % 5) * 5, 2)}:00Z`
            const n = index * 10 + visit
            const values: Record<(typeof VITALS)[number]['id'], number> = {
                weight: Math.round((patient.weight + wobble(n, 1.6) - visit * 0.3) * 10) / 10,
                'heart-rate': Math.round(patient.pulse + wobble(n + 3, 6)),
                systolic: Math.round(patient.systolic + wobble(n + 5, 9) - (patient.systolic > 140 ? visit * 2 : 0)),
            }
            return VITALS.map((vital) => ({
                resourceType: 'Observation',
                id: `obs-${pad(index + 1)}-${String(visit + 1)}-${vital.id}`,
                meta: meta(`${date}T11:00:00Z`),
                status: 'final',
                category: [{ coding: [{ system: CATEGORY, code: 'vital-signs', display: 'Vital Signs' }] }],
                code: { coding: [{ system: LOINC, code: vital.code, display: vital.display }], text: vital.display },
                subject: { reference: `Patient/${patientId(index)}`, display: nameOf(index) },
                encounter: { reference: `Encounter/enc-${pad(index + 1)}-${String(visit + 1)}` },
                effectiveDateTime: at,
                performer: [{ reference: `Practitioner/${pracOf(index)}` }],
                valueQuantity: { value: values[vital.id], unit: vital.unit, system: UCUM, code: vital.unit },
            }))
        }),
    )
}

function conditions(): Resource[] {
    return CONDITIONS.map((condition, index) => ({
        resourceType: 'Condition',
        id: `cond-${pad(index + 1)}`,
        meta: meta('2026-01-05T09:30:00Z'),
        clinicalStatus: { coding: [{ system: CLINICAL, code: condition.status }] },
        verificationStatus: { coding: [{ system: VERIFICATION, code: 'confirmed' }] },
        category: [
            {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                        code: 'problem-list-item',
                        display: 'Problem List Item',
                    },
                ],
            },
        ],
        code: { coding: [{ system: SNOMED, code: condition.code, display: condition.display }], text: condition.display },
        subject: { reference: `Patient/${patientId(condition.patient)}`, display: nameOf(condition.patient) },
        onsetDateTime: condition.onset,
        recordedDate: condition.onset,
        recorder: { reference: `Practitioner/${pracOf(condition.patient)}` },
    }))
}

const HYPERTENSION_V1 = `library HypertensionControl version '1.0.0'

using FHIR version '4.0.1'

codesystem "LOINC": 'http://loinc.org'
codesystem "SNOMED": 'http://snomed.info/sct'

code "Systolic blood pressure": '8480-6' from "LOINC"
code "Hypertensive disorder": '38341003' from "SNOMED"

parameter "Measurement Period" Interval<DateTime>
  default Interval[@2026-01-01T00:00:00.0, @2027-01-01T00:00:00.0)

context Patient

define "Has Hypertension":
  exists ([Condition: "Hypertensive disorder"] C
    where C.clinicalStatus ~ 'active')

define "Latest Systolic":
  Last([Observation: "Systolic blood pressure"] O
    where O.effective during "Measurement Period"
    sort by effective).value as Quantity

define "Controlled":
  "Has Hypertension" and "Latest Systolic" < 140 'mm[Hg]'
`

const HYPERTENSION_V2 = HYPERTENSION_V1.replace("version '1.0.0'", "version '1.1.0'").replace(
    `define "Controlled":
  "Has Hypertension" and "Latest Systolic" < 140 'mm[Hg]'
`,
    `// Under 140 counts as controlled; older patients get until 150.
define "Is Older":
  AgeInYearsAt(start of "Measurement Period") >= 80

define "Controlled":
  "Has Hypertension"
    and "Latest Systolic" < (if "Is Older" then 150 'mm[Hg]' else 140 'mm[Hg]')
`,
)

const HYPERTENSION_V3 = HYPERTENSION_V2.replace(
    `  Last([Observation: "Systolic blood pressure"] O
    where O.effective during "Measurement Period"
    sort by effective).value as Quantity`,
    `  Last([Observation: "Systolic blood pressure"] O
    where O.status in { 'final', 'amended' }
      and O.effective during "Measurement Period"
    sort by effective).value as Quantity`,
)

const WEIGHT_V1 = `library WeightFollowUp version '0.1.0'

using FHIR version '4.0.1'

codesystem "LOINC": 'http://loinc.org'

code "Body weight": '29463-7' from "LOINC"

context Patient

define "Weights":
  [Observation: "Body weight"] O
    sort by effective

define "First Weight": First("Weights").value as Quantity
define "Latest Weight": Last("Weights").value as Quantity
`

const WEIGHT_V2 = `${WEIGHT_V1}
/* A loss of five percent or more over the year asks for a follow-up. */
define "Lost Weight":
  "Latest Weight" < "First Weight" * 0.95
`

function library(
    id: string,
    name: string,
    title: string,
    version: string,
    status: string,
    description: string,
    cql: string,
    at: string,
    versionId: string,
): Resource {
    return {
        resourceType: 'Library',
        id,
        meta: { versionId, lastUpdated: at },
        url: `${LIBRARY_BASE}/${name}`,
        version,
        name,
        title,
        status,
        type: { coding: [{ system: LIBRARY_TYPE, code: 'logic-library' }] },
        date: at,
        publisher: 'Tidevann',
        description,
        content: [{ contentType: 'text/cql', data: toBase64(cql) }],
    }
}

function libraries(): Seeded[] {
    const hypertension = (version: string, status: string, cql: string, at: string, versionId: string) =>
        library(
            'lib-hypertension',
            'HypertensionControl',
            'Hypertension control',
            version,
            status,
            'Whether a patient with hypertension had their systolic pressure under control at the last measurement.',
            cql,
            at,
            versionId,
        )
    const weight = (cql: string, at: string, versionId: string) =>
        library(
            'lib-weight',
            'WeightFollowUp',
            'Weight follow-up',
            '0.1.0',
            'draft',
            'Patients whose weight fell over the year, for a follow-up visit.',
            cql,
            at,
            versionId,
        )
    return [
        {
            resource: hypertension('1.1.0', 'active', HYPERTENSION_V3, '2026-10-20T13:12:00Z', '3'),
            earlier: [
                { at: '2026-03-02T10:00:00Z', resource: hypertension('1.0.0', 'active', HYPERTENSION_V1, '2026-03-02T10:00:00Z', '1') },
                { at: '2026-08-14T15:40:00Z', resource: hypertension('1.1.0', 'draft', HYPERTENSION_V2, '2026-08-14T15:40:00Z', '2') },
            ],
        },
        {
            resource: weight(WEIGHT_V2, '2026-11-03T09:05:00Z', '2'),
            earlier: [{ at: '2026-10-29T14:20:00Z', resource: weight(WEIGHT_V1, '2026-10-29T14:20:00Z', '1') }],
        },
    ]
}

/** Every resource the server starts with, with the earlier versions of those that have them. */
export function seed(): Seeded[] {
    const plain = [...organizations(), ...practitioners(), ...patients(), ...encounters(), ...observations(), ...conditions()]
    return [...plain.map((resource) => ({ resource })), ...libraries()]
}

/** A new resource of a type, as the editor opens it: the elements it must have, and a few it usually has. */
export function template(type: string): Resource {
    const base = { resourceType: type, id: '' }
    switch (type) {
        case 'Patient':
            return { ...base, active: true, name: [{ use: 'official', family: '', given: [''] }], gender: 'unknown', birthDate: '' }
        case 'Practitioner':
            return { ...base, active: true, name: [{ use: 'official', family: '', given: [''] }] }
        case 'Organization':
            return { ...base, active: true, name: '' }
        case 'Encounter':
            return {
                ...base,
                status: 'planned',
                class: { system: ACT_CODE, code: 'AMB', display: 'ambulatory' },
                subject: { reference: 'Patient/pat-001' },
            }
        case 'Observation':
            return {
                ...base,
                status: 'preliminary',
                code: { coding: [{ system: LOINC, code: '8867-4', display: 'Heart rate' }] },
                subject: { reference: 'Patient/pat-001' },
                valueQuantity: { value: 70, unit: '/min', system: UCUM, code: '/min' },
            }
        case 'Condition':
            return {
                ...base,
                clinicalStatus: { coding: [{ system: CLINICAL, code: 'active' }] },
                code: { text: '' },
                subject: { reference: 'Patient/pat-001' },
            }
        case 'Library':
            return {
                ...base,
                status: 'draft',
                type: { coding: [{ system: LIBRARY_TYPE, code: 'logic-library' }] },
                content: [
                    {
                        contentType: 'text/cql',
                        data: toBase64("library NewLibrary version '0.1.0'\n\nusing FHIR version '4.0.1'\n\ncontext Patient\n"),
                    },
                ],
            }
        default:
            return base
    }
}
