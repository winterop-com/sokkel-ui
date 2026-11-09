import type { ApiAnswer, ApiParamHint, ApiPresetGroup, ApiRequest } from '@winterop-com/sokkel-ui/ApiPlayground'

import { forward, households, receipts, Refused, SERVER, STATES, submit, Unreachable, type Receipt, type Submission } from './backend'
import { FORMS, formOf, questionCount, testAnswers, testPlace } from './forms'
import { PLACES, placeOf } from './geo'
import { checkMetadata } from './health'

/** One route of the demo server: a method, a path pattern, what it answers, and the parameters it reads. */
interface Route {
    method: 'GET' | 'POST'
    pattern: RegExp
    path: string
    description: string
    params?: readonly ApiParamHint[]
    answer: (match: RegExpExecArray, query: URLSearchParams, body: unknown) => Promise<[number, unknown]>
}

const STATUS: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    404: 'Not Found',
    422: 'Unprocessable Content',
    503: 'Service Unavailable',
}

const page = <T>(items: readonly T[], query: URLSearchParams) => {
    const count = Math.max(1, Math.min(100, Number(query.get('count') ?? 20) || 20))
    return { total: items.length, count: Math.min(count, items.length), items: items.slice(0, count) }
}

const receiptJson = (receipt: Receipt) => ({
    id: receipt.receipt,
    form: receipt.formId,
    state: receipt.state,
    receivedAt: receipt.receivedAt,
    place: receipt.place,
    period: receipt.period,
    visitDate: receipt.visitDate,
    household: receipt.householdId,
    by: receipt.by,
    answers: receipt.answers,
    refusal: receipt.refusal,
})

const COUNT: ApiParamHint = { name: 'count', description: 'How many to answer, 20 unless asked; at most 100.' }

const ROUTES: Route[] = [
    {
        method: 'GET',
        pattern: /^\/metadata$/,
        path: '/metadata',
        description: 'What the server is and what it offers; every preset here was built from it.',
        answer: async () => [
            200,
            {
                name: SERVER.name,
                version: SERVER.version,
                base: SERVER.base,
                kinds: ['forms', 'places', 'households', 'responses'],
                operations: ['draft', 'forward', 'health'],
            },
        ],
    },
    {
        method: 'GET',
        pattern: /^\/forms$/,
        path: '/forms',
        description: 'Every form, with its kind and how many questions it asks.',
        params: [{ name: 'kind', description: 'periodic, event, registration or followup.' }, COUNT],
        answer: async (_, query) => [
            200,
            page(
                FORMS.filter((form) => query.get('kind') === null || form.kind === query.get('kind')).map((form) => ({
                    id: form.id,
                    title: form.title,
                    kind: form.kind,
                    questions: questionCount(form),
                })),
                query,
            ),
        ],
    },
    {
        method: 'GET',
        pattern: /^\/forms\/([\w-]+)$/,
        path: '/forms/FRM-SITE',
        description: 'One form, read by its id, with its sections and questions.',
        answer: async (match) => {
            const form = formOf(match[1])
            return form === undefined ? [404, { error: `No form is called ${match[1]}.` }] : [200, form]
        },
    },
    {
        method: 'GET',
        pattern: /^\/forms\/([\w-]+)\/draft$/,
        path: '/forms/FRM-SITE/draft',
        description: 'Test answers for a form, the same again for the same seed.',
        params: [{ name: 'seed', description: 'A whole number; the same seed draws the same answers.' }],
        answer: async (match, query) => {
            const form = formOf(match[1])
            if (form === undefined) return [404, { error: `No form is called ${match[1]}.` }]
            const seed = Number(query.get('seed') ?? 1)
            if (!Number.isInteger(seed)) return [400, { error: `seed must be a whole number; ${query.get('seed') ?? ''} is not.` }]
            return [200, { form: form.id, seed, place: testPlace(seed), answers: testAnswers(form, seed) }]
        },
    },
    {
        method: 'GET',
        pattern: /^\/places$/,
        path: '/places',
        description: 'The places records are made at: the country, its regions and their sites.',
        params: [
            { name: 'level', description: 'country, region or site.' },
            { name: 'parent', description: 'Only the places under this one.' },
            COUNT,
        ],
        answer: async (_, query) => [
            200,
            page(
                PLACES.filter(
                    (place) =>
                        (query.get('level') === null || place.level === query.get('level')) &&
                        (query.get('parent') === null || place.parent === query.get('parent')),
                ),
                query,
            ),
        ],
    },
    {
        method: 'GET',
        pattern: /^\/places\/(.+)$/,
        path: '/places/bo',
        description: 'One place, read by its id.',
        answer: async (match) => {
            const place = placeOf(decodeURIComponent(match[1]))
            return place === undefined ? [404, { error: `No place has the id ${match[1]}.` }] : [200, place]
        },
    },
    {
        method: 'GET',
        pattern: /^\/households$/,
        path: '/households',
        description: 'The registered households, newest first.',
        params: [{ name: 'identifier', description: 'Only the household with this identifier.' }, COUNT],
        answer: async (_, query) => {
            const all = (await households.list()).sort((left, right) => right.registeredAt.localeCompare(left.registeredAt))
            const asked = query.get('identifier')
            return [200, page(asked === null ? all : all.filter((one) => one.identifier.toLowerCase() === asked.toLowerCase()), query)]
        },
    },
    {
        method: 'GET',
        pattern: /^\/responses$/,
        path: '/responses',
        description: 'Every response the server stored, newest first.',
        params: [
            { name: 'state', description: STATES.join(', ') },
            { name: 'form', description: 'Only the responses to one form.' },
            COUNT,
        ],
        answer: async (_, query) => {
            const all = await receipts.list()
            const state = query.get('state')
            if (state !== null && !(STATES as readonly string[]).includes(state))
                return [400, { error: `state is one of ${STATES.join(', ')}.` }]
            return [
                200,
                page(
                    all
                        .filter(
                            (one) =>
                                (state === null || one.state === state) && (query.get('form') === null || one.formId === query.get('form')),
                        )
                        .map(receiptJson),
                    query,
                ),
            ]
        },
    },
    {
        method: 'GET',
        pattern: /^\/responses\/([0-9a-f]+)$/,
        path: '/responses/{id}',
        description: 'One response, read by its receipt id.',
        answer: async (match) => {
            const found = (await receipts.list()).find((one) => one.receipt === match[1])
            return found === undefined ? [404, { error: `No response has the receipt ${match[1]}.` }] : [200, receiptJson(found)]
        },
    },
    {
        method: 'POST',
        pattern: /^\/responses$/,
        path: '/responses',
        description: 'Files a response. The body names the form, the place and the answers.',
        answer: async (_, __, body) => {
            if (typeof body !== 'object' || body === null)
                return [400, { error: 'The body is a JSON object naming form, place and answers.' }]
            const given = body as Partial<Record<string, unknown>>
            const submission: Submission = {
                formId: String(given.form ?? ''),
                place: typeof given.place === 'string' ? given.place : null,
                period: typeof given.period === 'string' ? given.period : null,
                visitDate: typeof given.visitDate === 'string' ? given.visitDate : null,
                householdId: typeof given.household === 'string' ? given.household : null,
                answers: (typeof given.answers === 'object' && given.answers !== null ? given.answers : {}) as Submission['answers'],
                seed: null,
            }
            try {
                const receipt = await submit(submission)
                return [201, receiptJson(receipt)]
            } catch (failure) {
                if (failure instanceof Refused) return [422, { error: 'The response was refused.', issues: failure.issues }]
                throw failure
            }
        },
    },
    {
        method: 'POST',
        pattern: /^\/responses\/([0-9a-f]+)\/forward$/,
        path: '/responses/{id}/forward',
        description: 'Sends one received response on to the register, which takes or refuses it.',
        answer: async (match) => {
            const found = (await receipts.list()).find((one) => one.receipt === match[1])
            if (found === undefined) return [404, { error: `No response has the receipt ${match[1]}.` }]
            if (found.state !== 'received' && found.state !== 'rejected')
                return [422, { error: `A ${found.state} response is not sent again.` }]
            return [200, receiptJson(await forward(found))]
        },
    },
    {
        method: 'GET',
        pattern: /^\/health$/,
        path: '/health',
        description: 'What the metadata holds that a record cannot carry cleanly.',
        answer: async () => {
            const findings = checkMetadata(await households.list())
            return [200, { total: findings.length, findings }]
        },
    },
]

/** Answers a request as the demo server does, through the same backend the app uses. */
export async function answer(request: ApiRequest): Promise<ApiAnswer> {
    const started = performance.now()
    const [path, inline = ''] = request.path.split('?')
    const query = new URLSearchParams(inline)
    for (const param of request.params) if (param.name.trim() !== '') query.append(param.name.trim(), param.value)
    let status: number
    let body: unknown
    let parsed: unknown = undefined
    if (request.method !== 'GET' && request.body !== undefined && request.body.trim() !== '') {
        try {
            parsed = JSON.parse(request.body) as unknown
        } catch (failure) {
            return done(started, 400, { error: `The body is not JSON: ${failure instanceof Error ? failure.message : String(failure)}` })
        }
    }
    const route = ROUTES.find((one) => one.method === request.method && one.pattern.test(path))
    if (route === undefined) {
        const other = ROUTES.some((one) => one.pattern.test(path))
        return done(started, other ? 405 : 404, { error: other ? `${path} does not take ${request.method}.` : `Nothing answers ${path}.` })
    }
    try {
        ;[status, body] = await route.answer(route.pattern.exec(path) as RegExpExecArray, query, parsed)
    } catch (failure) {
        if (failure instanceof Unreachable) throw failure
        status = 503
        body = { error: failure instanceof Error ? failure.message : String(failure) }
    }
    return done(started, status, body)
}

function done(started: number, status: number, body: unknown): ApiAnswer {
    return {
        status,
        statusText: STATUS[status] ?? (status === 405 ? 'Method Not Allowed' : ''),
        ms: performance.now() - started,
        body: JSON.stringify(body, null, 2),
    }
}

/** The parameters a path answers to. */
export function hintsFor(path: string): ApiParamHint[] {
    return [...(ROUTES.find((route) => route.method === 'GET' && route.pattern.test(path))?.params ?? [])]
}

/** The server's own requests: its reads, and the operations it declares. */
export function presets(sample: string | undefined): ApiPresetGroup[] {
    const reads = ROUTES.filter((route) => route.method === 'GET')
    return [
        {
            title: 'Reads',
            note: 'A list answers twenty to a page, newest first.',
            presets: reads.map((route) => ({
                id: `${route.method} ${route.path}`,
                method: route.method,
                path: route.path === '/responses/{id}' ? `/responses/${sample ?? '{id}'}` : route.path,
                params: route.path.endsWith('/draft') ? [{ name: 'seed', value: '9104' }] : undefined,
                description: route.description,
            })),
        },
        {
            title: 'Operations',
            note: 'They change what the server holds.',
            presets: [
                {
                    id: 'POST /responses',
                    method: 'POST',
                    path: '/responses',
                    body: JSON.stringify(
                        {
                            form: 'FRM-SAMPLE',
                            place: 'bo/baomahun',
                            visitDate: new Date().toISOString().slice(0, 10),
                            answers: { bottle: 'B-2041', taken: '09:40', preserved: true },
                        },
                        null,
                        2,
                    ),
                    description: 'Files a water sample from Baomahun.',
                },
                {
                    id: 'POST /responses/{id}/forward',
                    method: 'POST',
                    path: `/responses/${sample ?? '{id}'}/forward`,
                    description: 'Sends the newest received response on to the register.',
                },
            ],
        },
    ]
}
