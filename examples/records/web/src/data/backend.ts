import { collection, storageKey, type Row } from 'tidevann-shared/backend'

import {
    type AnswerValue,
    type Answers,
    cellKey,
    formOf,
    FORMS,
    questionsOf,
    answerIssue,
    testAnswers,
    testPlace,
    type Form,
    type FormSection,
} from './forms'
import { COUNTRY, PLACES, placeOf } from './geo'

/** Where a response is now: received here, sent on and taken by the register, refused by it, or taken back out of it. */
export type ReceiptState = 'received' | 'forwarded' | 'rejected' | 'withdrawn'

export const STATES: readonly ReceiptState[] = ['received', 'forwarded', 'rejected', 'withdrawn']

export const STATE_WORDS: Record<ReceiptState, { label: string; note: string; tone: 'info' | 'good' | 'critical' | 'neutral' }> = {
    received: { label: 'Received', note: 'not yet sent on to the register', tone: 'info' },
    forwarded: { label: 'Forwarded', note: 'taken by the register', tone: 'good' },
    rejected: { label: 'Rejected', note: 'refused by the register', tone: 'critical' },
    withdrawn: { label: 'Withdrawn', note: 'taken back out of the register', tone: 'neutral' },
}

export const PEOPLE = ['ada', 'grace', 'linus', 'margaret'] as const
export type Person = (typeof PEOPLE)[number]

/** Who is using the app. */
export const ME: Person = 'grace'

export interface HistoryEntry {
    at: string
    state: ReceiptState
    by: string
    note?: string
}

/** One response as the server stored it: what it answers, for where and when, and where it is now. */
export interface Receipt {
    id: string
    /** The id the server gave the response: 32 hex digits, which the address and the API name it by. */
    receipt: string
    formId: string
    receivedAt: string
    state: ReceiptState
    place: string
    /** The period a periodic report is for. */
    period: string | null
    /** The day an event or a visit happened. */
    visitDate: string | null
    /** The registered household a registration or a follow-up is about. */
    householdId: string | null
    answers: Answers
    by: Person
    /** The seed test data was made from, when it was. */
    seed: number | null
    /** Why the register refused it. */
    refusal: string | null
    history: readonly HistoryEntry[]
}

/** A registered household, named by the identifier the server gave it. */
export interface Household {
    id: string
    identifier: string
    region: string
    site: string
    born: number
    size: number
    source: string
    treats: boolean | null
    registeredAt: string
    status: 'active' | 'completed'
}

const pad = (value: number) => String(value).padStart(2, '0')

/** The local day `offset` days from today, as `YYYY-MM-DD`. */
export function day(offset = 0): string {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The instant `offset` days and `hour` hours from today's midnight, as an ISO string. */
function instant(offset: number, hour: number, minute = 0): string {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    date.setHours(hour, minute, 0, 0)
    return date.toISOString()
}

/** A receipt id: 32 hex digits from a seed, the same every time. */
function receiptId(seed: number): string {
    let out = ''
    let state = (seed * 2654435761) >>> 0
    while (out.length < 32) {
        state = (Math.imul(state ^ (state >>> 15), 2246822507) + 3266489909) >>> 0
        out += state.toString(16).padStart(8, '0')
    }
    return out.slice(0, 32)
}

let made = Date.now() % 100_000

/** A fresh receipt id. */
function newReceiptId(): string {
    made += 1
    return receiptId(made)
}

/** A household identifier: `H-` and two groups of four digits. */
function householdIdentifier(seed: number): string {
    const digits = String(Math.floor(10_000_000 + ((seed * 7_919) % 89_999_999))).padStart(8, '0')
    return `H-${digits.slice(0, 4)}-${digits.slice(4, 8)}`
}

function seedHouseholds(): Household[] {
    const rows: [string, string, number, number, string, boolean | null, number, 'active' | 'completed'][] = [
        ['bo', 'bo/baomahun', 1985, 4, 'well', true, -40, 'active'],
        ['bo', 'bo/bumpe', 1991, 6, 'river', false, -38, 'active'],
        ['kenema', 'kenema/baama', 1978, 3, 'standpipe', null, -35, 'completed'],
        ['kono', 'kono/baiama', 1969, 8, 'well', true, -30, 'active'],
        ['bombali', 'bombali/kamabai', 1994, 2, 'rain', false, -21, 'active'],
        ['port-loko', 'port-loko/lunsar', 1988, 5, 'tap', true, -12, 'active'],
        // The first household registered a second time by mistake, which the metadata check finds.
        ['bo', 'bo/bumpe', 1985, 4, 'well', true, -6, 'active'],
    ]
    return rows.map(([region, site, born, size, source, treats, offset, status], index) => ({
        id: `household-${String(index + 1)}`,
        identifier: householdIdentifier(index === 6 ? 11 : index + 11),
        region,
        site: placeOf(site) === undefined ? (PLACES.find((place) => place.parent === region)?.id ?? region) : site,
        born,
        size,
        source,
        treats,
        registeredAt: instant(offset, 10),
        status,
    }))
}

function seedReceipts(): Receipt[] {
    const households = seedHouseholds()
    interface Seed {
        form: string
        offset: number
        state: ReceiptState
        by: Person
        seed: number
        household?: number
        refusal?: string
        place?: string
    }
    const rows: Seed[] = [
        { form: 'FRM-SITE', offset: 0, state: 'received', by: 'grace', seed: 9104 },
        { form: 'FRM-SITE', offset: 0, state: 'received', by: 'linus', seed: 9105 },
        { form: 'FRM-HOME', offset: -1, state: 'received', by: 'margaret', seed: 9106, household: 0 },
        { form: 'FRM-MONTH', offset: -2, state: 'forwarded', by: 'ada', seed: 9101, place: 'bo/baomahun' },
        { form: 'FRM-SAMPLE', offset: -2, state: 'forwarded', by: 'grace', seed: 9107 },
        {
            form: 'FRM-SITE',
            offset: -3,
            state: 'rejected',
            by: 'linus',
            seed: 9108,
            refusal: 'The register takes a water level over 5 m only with a photo of the gauge.',
        },
        { form: 'FRM-HOME', offset: -4, state: 'forwarded', by: 'margaret', seed: 9109, household: 1 },
        { form: 'FRM-STOCK', offset: -5, state: 'forwarded', by: 'ada', seed: 9110, place: 'kenema' },
        { form: 'FRM-SITE', offset: -6, state: 'withdrawn', by: 'grace', seed: 9111 },
        { form: 'FRM-HOME', offset: -8, state: 'forwarded', by: 'margaret', seed: 9112, household: 0 },
        { form: 'FRM-EXIT', offset: -9, state: 'forwarded', by: 'linus', seed: 9113, household: 2 },
        { form: 'FRM-SAMPLE', offset: -11, state: 'forwarded', by: 'ada', seed: 9114 },
        { form: 'FRM-MONTH', offset: -33, state: 'forwarded', by: 'grace', seed: 9115, place: 'kono/baiama' },
    ]
    const registrations = households.map((household, index): Seed => ({
        form: 'FRM-ENROLL',
        offset: Math.round((Date.parse(household.registeredAt) - Date.now()) / 86_400_000),
        state: 'forwarded' as ReceiptState,
        by: PEOPLE[index % PEOPLE.length],
        seed: 9200 + index,
        household: index,
    }))
    return [...rows, ...registrations]
        .map((row, index) => {
            const form = formOf(row.form)
            if (form === undefined) throw new Error(`No form ${row.form}`)
            const household = row.household === undefined ? undefined : households[row.household]
            const answers: Record<string, AnswerValue> = testAnswers(form, row.seed)
            if (row.form === 'FRM-SITE' && row.state === 'rejected') answers.level = 6.4
            if (row.form === 'FRM-ENROLL' && household !== undefined)
                Object.assign(answers, { born: household.born, size: household.size, source: household.source, treats: household.treats })
            const at = instant(row.offset, 9 + (index % 8), (index * 13) % 60)
            const place = row.place ?? household?.site ?? testPlace(row.seed)
            const history: HistoryEntry[] = [{ at, state: 'received', by: row.by }]
            if (row.state !== 'received')
                history.push({
                    at: instant(row.offset, 18),
                    state: row.state === 'withdrawn' ? 'forwarded' : row.state,
                    by: 'server',
                    note: row.refusal,
                })
            if (row.state === 'withdrawn')
                history.push({ at: instant(row.offset + 1, 9), state: 'withdrawn', by: 'ada', note: 'Filed twice by mistake.' })
            return {
                id: `receipt-${String(index + 1)}`,
                receipt: receiptId(row.seed),
                formId: row.form,
                receivedAt: at,
                state: row.state,
                place,
                period:
                    form.period === 'monthly'
                        ? row.offset < -30
                            ? previousMonth(2)
                            : previousMonth(1)
                        : form.period === 'quarterly'
                          ? previousQuarter()
                          : null,
                visitDate: form.kind === 'periodic' ? null : at.slice(0, 10),
                householdId: household?.id ?? null,
                answers,
                by: row.by,
                seed: row.seed,
                refusal: row.refusal ?? null,
                history,
            }
        })
        .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
}

function previousMonth(back: number): string {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - back)
    return `${String(date.getFullYear())}${pad(date.getMonth() + 1)}`
}

function previousQuarter(): string {
    const date = new Date()
    const quarter = Math.floor(date.getMonth() / 3)
    return quarter === 0 ? `${String(date.getFullYear() - 1)}Q4` : `${String(date.getFullYear())}Q${String(quarter)}`
}

export const receipts = collection<Receipt>('receipts', seedReceipts)
export const households = collection<Household>('households', seedHouseholds)

// The server: whether it answers, kept in this browser so the outage survives a reload.

export const SERVER = {
    name: 'Tidevann records',
    version: '2.4.0',
    base: 'https://records.example.org/api',
    address: 'records.example.org',
}

/** Whether the demo server has been told not to answer. */
export function serverDown(): boolean {
    const key = storageKey('offline')
    try {
        return localStorage.getItem(key) === 'yes'
    } catch {
        return false
    }
}

const downListeners = new Set<() => void>()

export function setServerDown(down: boolean): void {
    const key = storageKey('offline')
    try {
        if (down) localStorage.setItem(key, 'yes')
        else localStorage.removeItem(key)
    } catch {
        // Storage refused: the outage lasts this session only.
    }
    for (const listener of downListeners) listener()
}

export function onServerDownChange(listener: () => void): () => void {
    downListeners.add(listener)
    return () => downListeners.delete(listener)
}

export class Unreachable extends Error {
    constructor() {
        super('The server is not answering.')
    }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Asks the server whether it answers, as the top bar's menu does. */
export async function probe(): Promise<{ version: string }> {
    await wait(600)
    if (serverDown()) throw new Unreachable()
    return { version: SERVER.version }
}

async function guard(): Promise<void> {
    if (serverDown()) {
        await wait(150)
        throw new Unreachable()
    }
}

// What the app asks of the server.

export interface Submission {
    formId: string
    place: string | null
    period: string | null
    visitDate: string | null
    householdId: string | null
    answers: Answers
    seed: number | null
}

/** A refusal of a submission: what is wrong, by question. */
export class Refused extends Error {
    constructor(readonly issues: readonly { question: string; text: string }[]) {
        super(`The server refused the response: ${issues.map((issue) => issue.text).join(' ')}`)
    }
}

/** Checks a submission as the server does, answering with each issue. */
export function checkSubmission(submission: Submission): { question: string; text: string }[] {
    const form = formOf(submission.formId)
    if (form === undefined) return [{ question: 'form', text: `No form is called ${submission.formId}.` }]
    const issues: { question: string; text: string }[] = []
    if (submission.place === null || placeOf(submission.place) === undefined)
        issues.push({ question: 'place', text: 'Say where the record is from.' })
    if (form.period !== undefined && submission.period === null)
        issues.push({ question: 'period', text: 'Say which period the report is for.' })
    if ((form.kind === 'followup' || form.kind === 'event') && submission.visitDate === null)
        issues.push({ question: 'visitDate', text: 'Say when the visit was.' })
    if (form.kind === 'followup' && submission.householdId === null)
        issues.push({ question: 'household', text: 'Say which household the visit was to.' })
    for (const question of questionsOf(form)) {
        const value = submission.answers[question.id] ?? null
        const issue = answerIssue(question, value)
        if (issue !== null) issues.push({ question: question.id, text: `${question.label}: ${issue}` })
    }
    return issues
}

/** Files a response, and for a registration the household it registers; answers with the receipt. */
export async function submit(submission: Submission): Promise<Receipt> {
    await guard()
    const issues = checkSubmission(submission)
    if (issues.length > 0) throw new Refused(issues)
    const form = formOf(submission.formId)
    let householdId = submission.householdId
    if (form?.kind === 'registration') {
        const place = placeOf(submission.place)
        const all = await households.list()
        const household = await households.create({
            identifier: householdIdentifier(all.length + 11 + (Date.now() % 997)),
            region: place?.level === 'site' ? (place.parent ?? COUNTRY) : (place?.id ?? COUNTRY),
            site: place?.id ?? COUNTRY,
            born: Number(submission.answers.born),
            size: Number(submission.answers.size),
            source: String(submission.answers.source),
            treats: typeof submission.answers.treats === 'boolean' ? submission.answers.treats : null,
            registeredAt: new Date().toISOString(),
            status: 'active',
        })
        householdId = household.id
    }
    if (form?.kind === 'followup' && form.id === 'FRM-EXIT' && householdId !== null)
        await households.update(householdId, { status: 'completed' })
    const at = new Date().toISOString()
    return receipts.create({
        receipt: newReceiptId(),
        formId: submission.formId,
        receivedAt: at,
        state: 'received',
        place: submission.place ?? COUNTRY,
        period: submission.period,
        visitDate: submission.visitDate,
        householdId,
        answers: submission.answers,
        by: ME,
        seed: submission.seed,
        refusal: null,
        history: [{ at, state: 'received', by: ME }],
    })
}

/** Why the register refuses a response, or null when it takes it. */
export function registerRefusal(receipt: Receipt): string | null {
    const level = receipt.answers.level
    if (typeof level === 'number' && level > 5) return 'The register takes a water level over 5 m only with a photo of the gauge.'
    const stored = receipt.answers.stored
    if (typeof stored === 'number' && stored > 1500) return 'The register holds at most 1,500 liters stored in one home; check the count.'
    return null
}

/** Sends a received or refused response on to the register, which takes or refuses it. */
export async function forward(receipt: Receipt): Promise<Receipt> {
    await guard()
    const refusal = registerRefusal(receipt)
    const state: ReceiptState = refusal === null ? 'forwarded' : 'rejected'
    return receipts.update(receipt.id, {
        state,
        refusal,
        history: [...receipt.history, { at: new Date().toISOString(), state, by: 'server', note: refusal ?? undefined }],
    })
}

/** Sends every received response on, answering with how many were taken and refused. */
export async function forwardAll(): Promise<{ taken: number; refused: number }> {
    await guard()
    const waiting = (await receipts.list()).filter((receipt) => receipt.state === 'received')
    let refused = 0
    for (const receipt of waiting) if ((await forward(receipt)).state === 'rejected') refused += 1
    return { taken: waiting.length - refused, refused }
}

/** Takes a forwarded response back out of the register. */
export async function withdraw(receipt: Receipt, note: string): Promise<Receipt> {
    await guard()
    return receipts.update(receipt.id, {
        state: 'withdrawn',
        history: [
            ...receipt.history,
            { at: new Date().toISOString(), state: 'withdrawn', by: ME, note: note.trim() === '' ? undefined : note.trim() },
        ],
    })
}

/** A receipt by the id the server gave it. */
export function receiptOf(all: readonly Receipt[] | undefined, code: string | undefined): Receipt | undefined {
    return all?.find((receipt) => receipt.receipt === code)
}

/** The receipts of a household, newest first. */
export function eventsOf(all: readonly Receipt[], householdId: string): Receipt[] {
    return all
        .filter((receipt) => receipt.householdId === householdId)
        .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
}

/** A grid answer's value, for a periodic report's cell. */
export function cellOf(answers: Answers, row: string, category: string): number | null {
    const value = answers[cellKey(row, category)]
    return typeof value === 'number' ? value : null
}

/** One section of a form's layout: the section, and its questions in the order they are asked. */
export interface LayoutSection {
    id: string
    questions: readonly string[]
}

/** The order a form asks its sections and questions in, as arranged on its Layout page; the form's own order where none was kept. */
export interface Layout extends Row {
    sections: readonly LayoutSection[]
}

export const layouts = collection<Layout>('layouts', () => [])

/** A form's sections and questions in the order it asks them now. */
export function layoutOf(form: Form): LayoutSection[] {
    return form.sections.map((section) => ({ id: section.id, questions: section.questions.map((question) => question.id) }))
}

/**
 * The form with its sections and questions in the layout's order. A section or a question the
 * layout does not place keeps its place in the form's own order, so a form changed since stays whole.
 */
export function arranged(form: Form, layout: Layout | undefined): Form {
    if (layout === undefined) return form
    const questions = new Map(questionsOf(form).map((question) => [question.id, question]))
    const placed = new Set<string>()
    const sections: FormSection[] = []
    for (const entry of layout.sections) {
        const section = form.sections.find((one) => one.id === entry.id)
        if (section === undefined || sections.some((one) => one.id === section.id)) continue
        const asked = entry.questions.flatMap((id) => {
            const question = questions.get(id)
            if (question === undefined || placed.has(id)) return []
            placed.add(id)
            return [question]
        })
        sections.push({ ...section, questions: asked })
    }
    for (const section of form.sections) if (!sections.some((one) => one.id === section.id)) sections.push({ ...section, questions: [] })
    for (const section of form.sections)
        for (const question of section.questions) {
            if (placed.has(question.id)) continue
            const home = sections.find((one) => one.id === section.id)
            if (home !== undefined) home.questions = [...home.questions, question]
        }
    return { ...form, sections }
}

/** Keeps a form's layout on the server, the order every later fill asks it in. */
export async function saveLayout(formId: string, sections: readonly LayoutSection[]): Promise<void> {
    await guard()
    const kept = (await layouts.list()).some((layout) => layout.id === formId)
    if (kept) await layouts.update(formId, { sections })
    else await layouts.create({ sections }, formId)
}

/** Drops a form's layout, so it asks in the order the form was made with. */
export async function resetLayout(formId: string): Promise<void> {
    await guard()
    if ((await layouts.list()).some((layout) => layout.id === formId)) await layouts.remove(formId)
}

/** What the person keeps for themselves: the order of the forms they start records from. */
export interface Preferences extends Row {
    /** Form ids in the order Start a record lists them; forms it leaves out follow in the server's order. */
    formOrder: readonly string[]
}

export const preferences = collection<Preferences>('preferences', () => [{ id: ME, formOrder: [] }])

/** The forms in the person's order. */
export function inOrder(order: readonly string[] | undefined): Form[] {
    const rank = new Map((order ?? []).map((id, index) => [id, index]))
    return [...FORMS].sort(
        (left, right) =>
            (rank.get(left.id) ?? order?.length ?? 0) - (rank.get(right.id) ?? order?.length ?? 0) ||
            FORMS.indexOf(left) - FORMS.indexOf(right),
    )
}

export { FORMS }
