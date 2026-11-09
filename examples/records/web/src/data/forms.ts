import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { parsePeriod, PERIOD_TYPES, recentPeriods, type PeriodType } from '@winterop-com/sokkel-ui/lib/periods'

import { bankHeight, PLACES } from './geo'

/** How a form is filed: counts for a place over a period, one event, a person's registration, or a visit to a registered person. */
export type FormKind = 'periodic' | 'event' | 'registration' | 'followup'

export const KIND: Record<FormKind, { label: string; color: KindColor; group: string; note: string }> = {
    periodic: {
        label: 'Periodic report',
        color: 'teal',
        group: 'Periodic reports',
        note: 'Counts for a place over a period. No person involved.',
    },
    event: {
        label: 'Single event',
        color: 'pink',
        group: 'Single events',
        note: 'One visit or sample, recorded without registering anyone.',
    },
    registration: {
        label: 'Registration',
        color: 'violet',
        group: 'Programs',
        note: 'A person is registered once, then each form under the registration records one of their visits.',
    },
    followup: { label: 'Follow-up', color: 'green', group: 'Programs', note: '' },
}

export type QuestionType = 'text' | 'multiline' | 'integer' | 'decimal' | 'date' | 'time' | 'yesno' | 'choice' | 'computed'

/** What a question holds: text, a number, yes or no, or nothing yet. */
export type AnswerValue = string | number | boolean | null

export type Answers = Readonly<Record<string, AnswerValue>>

export interface Option {
    value: string
    label: string
}

/** A rule that works an answer out from the others, with why in words. */
export interface Formula {
    why: string
    expression: string
    compute: (answers: Answers, context: FillContext) => number | null
}

export interface Question {
    /** The answer's key, which the record and the API name it by. */
    id: string
    label: string
    type: QuestionType
    required?: boolean
    description?: string
    help?: string
    unit?: string
    min?: number
    max?: number
    options?: readonly Option[]
    formula?: Formula
    /** A yes or no that keeps no No. */
    yesOnly?: boolean
}

export interface FormSection {
    id: string
    title: string
    description?: string
    questions: readonly Question[]
}

/** A grid of counts: a row per question under its part, a column per category. */
export interface CountGrid {
    by: string
    categories: readonly Option[]
    rows: readonly { id: string; part: string; label: string }[]
}

export interface Form {
    id: string
    title: string
    kind: FormKind
    description: string
    /** The period a periodic report is made for. */
    period?: PeriodType
    sections: readonly FormSection[]
    grid?: CountGrid
    /** The program a registration or a follow-up belongs to. */
    program?: string
    /** A follow-up taken more than once per person. */
    repeats?: boolean
    /** The form's own code list for an answer, by id. */
}

/** What a form is filled for: where, when, and for whom. */
export interface FillContext {
    place: string | null
    period: string | null
    visitDate: string | null
    person: { householdSize: number } | null
}

const SOURCES: Option[] = [
    { value: 'tap', label: 'Tap at home' },
    { value: 'standpipe', label: 'Public standpipe' },
    { value: 'well', label: 'Protected well' },
    { value: 'river', label: 'River or stream' },
    { value: 'rain', label: 'Rainwater' },
]

const SITE_KINDS: Option[] = [
    { value: 'river', label: 'River' },
    { value: 'lake', label: 'Lake' },
    { value: 'well', label: 'Well' },
    { value: 'coast', label: 'Coast' },
]

export const PROGRAMS: Record<string, { title: string; description: string }> = {
    'PRG-WATER': {
        title: 'Household water survey',
        description: 'Households registered once, then visited at home through the year.',
    },
}

export const FORMS: readonly Form[] = [
    {
        id: 'FRM-MONTH',
        title: 'Monthly station summary',
        kind: 'periodic',
        period: 'monthly',
        description: "A month's counts at one station, by the kind of site each was taken at.",
        sections: [],
        grid: {
            by: 'kind of site',
            categories: SITE_KINDS,
            rows: [
                { id: 'readings', part: 'Readings', label: 'Gauge readings taken' },
                { id: 'missed', part: 'Readings', label: 'Readings missed' },
                { id: 'flagged', part: 'Readings', label: 'Readings flagged for review' },
                { id: 'samples', part: 'Samples', label: 'Water samples sent to the lab' },
                { id: 'refused', part: 'Samples', label: 'Samples the lab refused' },
                { id: 'visits', part: 'Upkeep', label: 'Visits by observers' },
                { id: 'repairs', part: 'Upkeep', label: 'Repairs made' },
            ],
        },
    },
    {
        id: 'FRM-STOCK',
        title: 'Gauge and kit stock',
        kind: 'periodic',
        period: 'quarterly',
        description: 'What a region holds in store at the end of a quarter.',
        sections: [
            {
                id: 'gauges',
                title: 'Gauges',
                questions: [
                    { id: 'gauges_store', label: 'Gauge boards in store', type: 'integer', required: true, min: 0, max: 500 },
                    {
                        id: 'gauges_broken',
                        label: 'Gauge boards broken',
                        type: 'integer',
                        min: 0,
                        max: 500,
                        help: 'Count each board once.',
                    },
                ],
            },
            {
                id: 'kits',
                title: 'Sampling kits',
                description: 'Counted on the last working day of the quarter.',
                questions: [
                    { id: 'bottles', label: 'Sample bottles', type: 'integer', required: true, min: 0, max: 5000 },
                    { id: 'strips', label: 'Test strips', type: 'integer', min: 0, max: 20000, unit: 'strips' },
                    {
                        id: 'reorder',
                        label: 'Reorder needed',
                        type: 'yesno',
                        description: 'Whether the store runs out before the next delivery.',
                    },
                ],
            },
        ],
    },
    {
        id: 'FRM-SITE',
        title: 'Site visit',
        kind: 'event',
        description: 'One visit to a site: the readings at the gauge, the conditions, and what the observer saw.',
        sections: [
            {
                id: 'reading',
                title: 'Measurements',
                description: 'Read at the gauge, in the units beside each label.',
                questions: [
                    {
                        id: 'level',
                        label: 'Water level',
                        type: 'decimal',
                        unit: 'm',
                        required: true,
                        min: 0,
                        max: 10,
                        description: 'Read off the gauge board before the sample is taken.',
                    },
                    {
                        id: 'clearance',
                        label: 'Clearance below the bank',
                        type: 'computed',
                        unit: 'm',
                        formula: {
                            why: "The site's bank height less the water level. Below 0.5 m the site is flagged for flooding.",
                            expression: 'bank_height - level',
                            compute: (answers, context) =>
                                typeof answers.level === 'number' && context.place !== null
                                    ? Math.round((bankHeight(context.place) - answers.level) * 100) / 100
                                    : null,
                        },
                    },
                    { id: 'temperature', label: 'Water temperature', type: 'decimal', unit: '°C', min: -5, max: 45 },
                    {
                        id: 'turbidity',
                        label: 'Turbidity',
                        type: 'integer',
                        unit: 'NTU',
                        min: 0,
                        max: 1000,
                        help: 'Read after the sample has settled.',
                    },
                    { id: 'ph', label: 'pH', type: 'decimal', min: 0, max: 14, unit: '0 to 14' },
                ],
            },
            {
                id: 'check',
                title: 'Site check',
                description: 'The conditions at the site during the visit.',
                questions: [
                    {
                        id: 'access',
                        label: 'Could you reach the site?',
                        type: 'choice',
                        required: true,
                        options: [
                            { value: 'open', label: 'Yes, on the usual path' },
                            { value: 'partly', label: 'Only part of it' },
                            { value: 'closed', label: 'No, the way was closed' },
                        ],
                    },
                    {
                        id: 'weather',
                        label: 'Weather during the reading',
                        type: 'choice',
                        options: [
                            { value: 'dry', label: 'Dry' },
                            { value: 'rain', label: 'Light rain' },
                            { value: 'storm', label: 'Heavy rain or wind' },
                        ],
                    },
                    { id: 'cleaned', label: 'Gauge board cleaned', type: 'yesno', description: 'Before the reading was taken.' },
                    {
                        id: 'damaged',
                        label: 'Gauge damaged',
                        type: 'yesno',
                        yesOnly: true,
                        help: 'Yes or not answered: this question keeps no No.',
                    },
                ],
            },
            {
                id: 'notes',
                title: 'Notes',
                questions: [
                    { id: 'notes', label: 'What else did you see?', type: 'multiline', help: 'Anything the next visitor should know.' },
                ],
            },
        ],
    },
    {
        id: 'FRM-SAMPLE',
        title: 'Water sample',
        kind: 'event',
        description: 'A sample taken for the lab, with what it was taken in and how it travels.',
        sections: [
            {
                id: 'sample',
                title: 'Sample',
                questions: [
                    {
                        id: 'bottle',
                        label: 'Bottle number',
                        type: 'text',
                        required: true,
                        help: 'As written on the bottle, such as B-2041.',
                    },
                    { id: 'taken', label: 'Taken at', type: 'time', required: true },
                    { id: 'preserved', label: 'Kept cool on the way', type: 'yesno' },
                    {
                        id: 'lab',
                        label: 'Lab',
                        type: 'choice',
                        options: [
                            { value: 'north', label: 'North lab' },
                            { value: 'south', label: 'South lab' },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'FRM-ENROLL',
        title: 'Household registration',
        kind: 'registration',
        program: 'PRG-WATER',
        description: 'Registers a household in the water survey. The household is given an identifier when the record is filed.',
        sections: [
            {
                id: 'household',
                title: 'Household',
                questions: [
                    { id: 'born', label: 'Year the head of household was born', type: 'integer', required: true, min: 1920, max: 2010 },
                    { id: 'size', label: 'People in the household', type: 'integer', required: true, min: 1, max: 30 },
                    { id: 'source', label: 'Main water source', type: 'choice', required: true, options: SOURCES },
                    { id: 'treats', label: 'Treats water at home', type: 'yesno', description: 'Boils, filters or adds chlorine.' },
                ],
            },
        ],
    },
    {
        id: 'FRM-HOME',
        title: 'Home visit',
        kind: 'followup',
        program: 'PRG-WATER',
        repeats: true,
        description: 'One visit to a registered household. Each visit is its own record.',
        sections: [
            {
                id: 'stored',
                title: 'Water at home',
                questions: [
                    { id: 'stored', label: 'Water stored at home', type: 'decimal', unit: 'liters', required: true, min: 0, max: 2000 },
                    {
                        id: 'per_person',
                        label: 'Water per person',
                        type: 'computed',
                        unit: 'liters',
                        formula: {
                            why: "The water stored at home shared over the household's people, as registered. Under 15 liters a person is a shortfall.",
                            expression: 'stored / household_size',
                            compute: (answers, context) =>
                                typeof answers.stored === 'number' && context.person !== null && context.person.householdSize > 0
                                    ? Math.round((answers.stored / context.person.householdSize) * 10) / 10
                                    : null,
                        },
                    },
                    { id: 'covered', label: 'Containers covered', type: 'yesno' },
                    {
                        id: 'chlorine',
                        label: 'Chlorine test',
                        type: 'choice',
                        options: [
                            { value: 'none', label: 'None found' },
                            { value: 'low', label: 'Low' },
                            { value: 'good', label: 'Good' },
                            { value: 'high', label: 'Too high' },
                        ],
                    },
                ],
            },
            {
                id: 'health',
                title: 'Health',
                questions: [
                    {
                        id: 'ill',
                        label: 'Anyone ill with diarrhea in the last two weeks',
                        type: 'yesno',
                        description: 'Ask the head of household.',
                    },
                ],
            },
        ],
    },
    {
        id: 'FRM-EXIT',
        title: 'Exit interview',
        kind: 'followup',
        program: 'PRG-WATER',
        description: 'The last visit, as a household leaves the survey. One record per household.',
        sections: [
            {
                id: 'exit',
                title: 'Leaving',
                questions: [
                    {
                        id: 'reason',
                        label: 'Why the household leaves',
                        type: 'choice',
                        required: true,
                        options: [
                            { value: 'moved', label: 'Moved away' },
                            { value: 'declined', label: 'Declined further visits' },
                            { value: 'ended', label: 'The survey ended' },
                        ],
                    },
                    { id: 'better', label: 'Water at home better than at the start', type: 'yesno' },
                ],
            },
        ],
    },
]

export function formOf(id: string | undefined): Form | undefined {
    return FORMS.find((form) => form.id === id)
}

/** Every question a form asks, in order. */
export function questionsOf(form: Form): Question[] {
    return form.sections.flatMap((section) => section.questions)
}

/** How many questions a form asks: its fields, or its grid's cells. */
export function questionCount(form: Form): number {
    return form.grid === undefined ? questionsOf(form).length : form.grid.rows.length * form.grid.categories.length
}

/** A grid's key for one cell: the row and the category. */
export const cellKey = (row: string, category: string) => `${row}.${category}`

/** What is wrong with an answer, or null. Required questions left empty are said by `unanswered`. */
export function answerIssue(question: Question, value: AnswerValue): string | null {
    if (value === null || value === '') return null
    if (question.type === 'integer' || question.type === 'decimal') {
        if (typeof value !== 'number' || !Number.isFinite(value)) return `${String(value)} is not a number.`
        if (question.type === 'integer' && !Number.isInteger(value))
            return `${String(value)} is not a whole number, which this question counts in.`
        if (question.min !== undefined && value < question.min)
            return `${String(value)} is below ${String(question.min)}, the lowest this form takes.`
        if (question.max !== undefined && value > question.max)
            return `${String(value)} is above ${String(question.max)}, the highest this form takes.`
    }
    if (question.type === 'time' && typeof value === 'string' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
        return `${value} is not a time of day. Write it as 24-hour hours and minutes, such as 09:40.`
    return null
}

/** The range a number question takes, said as a hint. */
export function rangeHint(question: Question): string | undefined {
    const { min, max } = question
    if (min !== undefined && max !== undefined) return `Between ${String(min)} and ${String(max)}.`
    if (min !== undefined) return `${String(min)} or more.`
    if (max !== undefined) return `${String(max)} or less.`
    return undefined
}

/** A seeded run of numbers from 0 to 1, the same for the same seed. */
export function seeded(seed: number): () => number {
    let state = seed >>> 0 || 1
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0
        return state / 0x100000000
    }
}

/** Answers made up for a form from a seed, each within what the form takes. */
export function testAnswers(form: Form, seed: number): Record<string, AnswerValue> {
    const next = seeded(seed)
    const answers: Record<string, AnswerValue> = {}
    if (form.grid !== undefined) {
        for (const row of form.grid.rows)
            for (const category of form.grid.categories)
                answers[cellKey(row.id, category.value)] = Math.floor(next() * (row.id === 'readings' ? 140 : 24))
        return answers
    }
    for (const question of questionsOf(form)) {
        const low = question.min ?? 0
        const high = question.max ?? 100
        if (question.type === 'computed') continue
        if (question.type === 'integer')
            answers[question.id] = Math.round(low + next() * Math.min(high - low, question.id === 'born' ? 70 : 40))
        else if (question.type === 'decimal')
            answers[question.id] =
                Math.round(
                    (low +
                        next() * Math.min(high - low, question.id === 'ph' ? 4 : question.id === 'level' ? 3.5 : 60) +
                        (question.id === 'ph' ? 5 : 0)) *
                        100,
                ) / 100
        else if (question.type === 'yesno') answers[question.id] = question.yesOnly === true ? (next() < 0.3 ? true : null) : next() < 0.6
        else if (question.type === 'choice')
            answers[question.id] = question.options?.[Math.floor(next() * (question.options.length ?? 1))]?.value ?? null
        else if (question.type === 'time')
            answers[question.id] =
                `${String(7 + Math.floor(next() * 10)).padStart(2, '0')}:${String(Math.floor(next() * 60)).padStart(2, '0')}`
        else if (question.type === 'text') answers[question.id] = `B-${String(2000 + Math.floor(next() * 900))}`
        else if (question.type === 'multiline')
            answers[question.id] = next() < 0.5 ? 'The path to the gauge was clear. Nothing else to report.' : ''
        else if (question.type === 'date') answers[question.id] = null
    }
    return answers
}

/** The sites a test fill may report from, the same for the same seed. */
export function testPlace(seed: number): string {
    const sites = PLACES.filter((place) => place.level === 'site' && place.position !== null)
    return sites[Math.floor(seeded(seed + 7)() * sites.length)]?.id ?? sites[0].id
}

/** The last whole period of a type before today, which a report is usually made for. */
export function lastWholePeriod(type: PeriodType, today: string): string {
    return recentPeriods(type, today, 2)[1]?.id ?? recentPeriods(type, today, 1)[0].id
}

export { parsePeriod }

/** What each type of period is called. */
export const PERIOD_LABEL = Object.fromEntries(Object.entries(PERIOD_TYPES).map(([type, info]) => [type, info.label])) as Record<
    PeriodType,
    string
>
