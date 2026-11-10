/**
 * A pipeline as the studio reads it: the schema its YAML is checked and completed against, the
 * steps read out of it with where each is written, and the `${...}` references the schema leaves
 * to the app, checked here.
 */

import type { CodeCompletion, CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { isMap, isScalar, isSeq, parseDocument, visit, type Node as YamlNode } from 'yaml'

export const STEP_KINDS = ['fetch', 'transform', 'validate', 'upload', 'notify'] as const
export type StepKind = (typeof STEP_KINDS)[number]

/** What each kind of step does, said on hover and in completion. */
export const KIND_DOCS: Record<StepKind, string> = {
    fetch: 'Reads rows from an address on example.org, as CSV, JSON or NDJSON.',
    transform: 'Reshapes the rows it is given with a jq or SQL script.',
    validate: 'Checks each row against rules, failing, skipping or warning on the rows it refuses.',
    upload: 'Writes the rows to a path in a bucket.',
    notify: 'Posts to a channel when the run ends in one of the states given.',
}

const ref = (name: string): JsonSchema => ({ $ref: `#/$defs/${name}` })
const when = (kind: StepKind): JsonSchema => ({
    if: { properties: { kind: { const: kind } }, required: ['kind'] },
    // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
    then: { required: ['with'], properties: { with: ref(kind) } },
})

/** The JSON Schema (2020-12) every pipeline is written in; each step's `with` follows from its `kind` through `allOf` and `if`. */
export const PIPELINE_SCHEMA: JsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Pipeline',
    type: 'object',
    required: ['name', 'steps'],
    additionalProperties: false,
    properties: {
        name: { type: 'string', pattern: '^[a-z][a-z0-9-]*$', description: "The pipeline's name, lowercase with dashes, as runs list it." },
        description: { type: 'string', description: 'What the pipeline is for, in a sentence.' },
        project: { enum: ['harbor', 'juniper', 'larkspur'], description: 'The project whose buckets and channels it uses.' },
        schedule: {
            type: 'string',
            pattern: '^\\S+( \\S+){4}$',
            description: 'When it runs by itself: a cron line of five fields, such as "0 2 * * *" for 02:00 every day.',
        },
        params: {
            type: 'object',
            description: 'Values the steps read as ${params.<name>}.',
            additionalProperties: { type: ['string', 'number', 'boolean'] },
        },
        steps: { type: 'array', minItems: 1, description: 'The steps, each after the steps it needs.', items: ref('step') },
    },
    $defs: {
        step: {
            type: 'object',
            required: ['id', 'kind'],
            additionalProperties: false,
            properties: {
                id: {
                    type: 'string',
                    pattern: '^[a-z][a-z0-9-]*$',
                    description: "The step's name in this pipeline, which needs and references use.",
                },
                kind: { enum: [...STEP_KINDS], description: 'What the step does; its kind decides what goes in with.' },
                needs: {
                    type: 'array',
                    uniqueItems: true,
                    items: { type: 'string' },
                    description: 'The steps that finish before this one starts.',
                },
                retries: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 5,
                    default: 0,
                    description: 'How many times a failed try is tried again, up to 5.',
                },
                timeout: {
                    type: 'string',
                    pattern: '^[0-9]+(s|m|h)$',
                    default: '10m',
                    description: 'How long one try may take: 30s, 10m, 1h.',
                },
                with: { type: 'object', description: "The step's settings, which its kind decides." },
            },
            allOf: STEP_KINDS.map(when),
        },
        fetch: {
            type: 'object',
            required: ['url'],
            additionalProperties: false,
            properties: {
                url: { type: 'string', pattern: '^https://', description: 'Where the rows are read from, over https.' },
                format: { enum: ['csv', 'json', 'ndjson'], default: 'json', description: 'How the answer is written.' },
                since: { type: 'string', description: 'Only rows changed since this long ago, such as 1d.' },
            },
        },
        transform: {
            type: 'object',
            required: ['script'],
            additionalProperties: false,
            properties: {
                language: { enum: ['jq', 'sql'], default: 'jq', description: 'The language the script is written in.' },
                script: { type: 'string', minLength: 1, description: 'What makes the new rows from the rows given.' },
            },
        },
        validate: {
            type: 'object',
            required: ['rules'],
            additionalProperties: false,
            properties: {
                rules: {
                    type: 'array',
                    minItems: 1,
                    description: 'The checks each row passes.',
                    items: {
                        type: 'object',
                        required: ['field', 'check'],
                        additionalProperties: false,
                        properties: {
                            field: { type: 'string', description: 'The field the rule checks.' },
                            check: { enum: ['required', 'unique', 'positive', 'email', 'date'], description: 'What the field must be.' },
                        },
                    },
                },
                on_invalid: {
                    enum: ['fail', 'skip', 'warn'],
                    default: 'fail',
                    description: 'What refused rows do: fail the run past max_rejected, be left out, or pass with a warning.',
                },
                max_rejected: {
                    type: 'integer',
                    minimum: 0,
                    default: 0,
                    description: 'How many refused rows fail allows before it fails.',
                },
            },
        },
        upload: {
            type: 'object',
            required: ['bucket', 'path'],
            additionalProperties: false,
            properties: {
                bucket: { type: 'string', pattern: '^[a-z][a-z0-9-]*$', description: 'The bucket written to.' },
                path: { type: 'string', description: 'Where in the bucket, such as orders/${run.date}.json.' },
                overwrite: { type: 'boolean', default: false, description: 'Whether a file already there is replaced.' },
            },
        },
        notify: {
            type: 'object',
            required: ['channel'],
            additionalProperties: false,
            properties: {
                channel: { type: 'string', pattern: '^#[a-z0-9-]+$', description: 'The channel posted to, such as #harbor.' },
                on: {
                    type: 'array',
                    uniqueItems: true,
                    items: { enum: ['succeeded', 'failed', 'cancelled'] },
                    default: ['failed'],
                    description: 'The run states that post.',
                },
                message: { type: 'string', description: 'What is posted; references are filled in.' },
            },
        },
    },
}

/** A value holding a `${...}` reference, which is filled in when the pipeline runs and so is left to the app to check. */
export const holdsReference = (value: unknown): boolean => typeof value === 'string' && value.includes('${')

/** What a run of a pipeline offers its references beside params and steps. */
export const RUN_FIELDS: Record<string, string> = {
    id: "The run's number.",
    date: 'The day the run started, as 2026-11-10.',
    started: 'When the run started, to the second.',
    by: 'Who started the run.',
}

/** What a step hands on, for `${steps.<id>.<field>}`. */
export const STEP_FIELDS: Record<string, string> = {
    rows: 'How many rows the step gave.',
    output: 'Where the step wrote what it gave.',
    rejected: 'How many rows a validate step refused.',
}

export interface StepInfo {
    id: string
    kind: string
    needs: string[]
    config: Record<string, unknown>
    retries: number
    /** Where the step's item is written, as offsets. */
    from: number
    to: number
}

export interface Pipeline {
    name: string
    project: string | undefined
    params: Record<string, unknown>
    steps: StepInfo[]
    /** What the app checks that the schema cannot: references, unknown needs, repeated ids and loops. */
    marks: CodeMark[]
    /** The YAML does not parse; the editor says where. */
    broken: boolean
}

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

/** The steps a step comes after, directly or through others. */
function before(steps: readonly StepInfo[], id: string): Set<string> {
    const byId = new Map(steps.map((step) => [step.id, step]))
    const seen = new Set<string>()
    const queue = [...(byId.get(id)?.needs ?? [])]
    while (queue.length > 0) {
        const at = queue.shift() as string
        if (seen.has(at)) continue
        seen.add(at)
        queue.push(...(byId.get(at)?.needs ?? []))
    }
    return seen
}

/** The steps in an order each comes after what it needs, or null when they loop. */
export function stepOrder(steps: readonly StepInfo[]): StepInfo[] | null {
    const done = new Set<string>()
    const order: StepInfo[] = []
    const known = new Set(steps.map((step) => step.id))
    while (order.length < steps.length) {
        const next = steps.find((step) => !done.has(step.id) && step.needs.every((need) => done.has(need) || !known.has(need)))
        if (next === undefined) return null
        done.add(next.id)
        order.push(next)
    }
    return order
}

/** Reads a pipeline's YAML: its steps and where they are, and what its references get wrong. */
export function readPipeline(text: string): Pipeline {
    const doc = parseDocument(text, { prettyErrors: false })
    if (doc.errors.length > 0) return { name: '', project: undefined, params: {}, steps: [], marks: [], broken: true }
    const value = asRecord(doc.toJS())
    const params = asRecord(value.params)
    const marks: CodeMark[] = []
    const steps: StepInfo[] = []
    const stepsNode = doc.get('steps', true)
    const needNodes = new Map<string, YamlNode[]>()
    if (isSeq(stepsNode)) {
        for (const item of stepsNode.items) {
            if (!isMap(item) || item.range === null || item.range === undefined) continue
            const raw = asRecord(item.toJSON())
            const id = typeof raw.id === 'string' ? raw.id : ''
            if (id === '') continue
            const needs = Array.isArray(raw.needs) ? raw.needs.filter((need): need is string => typeof need === 'string') : []
            const needsNode = item.get('needs', true)
            if (isSeq(needsNode)) needNodes.set(id, needsNode.items as YamlNode[])
            const idNode = item.get('id', true)
            if (steps.some((step) => step.id === id) && isScalar(idNode) && idNode.range)
                marks.push({ from: idNode.range[0], to: idNode.range[1], tone: 'error', message: `Another step is already named ${id}.` })
            steps.push({
                id,
                kind: typeof raw.kind === 'string' ? raw.kind : '',
                needs,
                config: asRecord(raw.with),
                retries: typeof raw.retries === 'number' ? raw.retries : 0,
                from: item.range[0],
                to: item.range[1],
            })
        }
    }
    const ids = new Set(steps.map((step) => step.id))
    for (const step of steps)
        for (const node of needNodes.get(step.id) ?? []) {
            if (!isScalar(node) || typeof node.value !== 'string' || !node.range) continue
            const need = node.value
            if (need === step.id)
                marks.push({ from: node.range[0], to: node.range[1], tone: 'error', message: 'A step cannot need itself.' })
            else if (!ids.has(need))
                marks.push({ from: node.range[0], to: node.range[1], tone: 'error', message: `No step is named ${need}.` })
            else if (before(steps, need).has(step.id))
                marks.push({
                    from: node.range[0],
                    to: node.range[1],
                    tone: 'error',
                    message: `${need} already comes after ${step.id}, so this makes a loop.`,
                })
        }
    // Each reference in a string names a param, a step this one comes after, or the run.
    visit(doc, {
        Scalar(_, node) {
            if (typeof node.value !== 'string' || !node.range || !node.value.includes('${')) return
            const [start, end] = node.range
            const source = text.slice(start, end)
            const owner = steps.find((step) => start >= step.from && start < step.to)
            for (const found of source.matchAll(/\$\{([^}]*)\}/g)) {
                const from = start + (found.index ?? 0)
                const to = from + found[0].length
                const problem = checkReference((found[1] ?? '').trim(), params, steps, owner)
                if (problem !== null) marks.push({ from, to, tone: problem.tone, message: problem.message })
            }
        },
    })
    return {
        name: typeof value.name === 'string' ? value.name : '',
        project: typeof value.project === 'string' ? value.project : undefined,
        params,
        steps,
        marks,
        broken: false,
    }
}

function checkReference(
    reference: string,
    params: Record<string, unknown>,
    steps: readonly StepInfo[],
    owner: StepInfo | undefined,
): { tone: 'error' | 'warning'; message: string } | null {
    const [root, name, field, ...rest] = reference.split('.')
    if (root === 'params') {
        if (name === undefined || name === '') return { tone: 'error', message: 'Name a param: ${params.<name>}.' }
        if (!(name in params)) {
            const known = Object.keys(params)
            return {
                tone: 'error',
                message: `No param is named ${name}.${known.length === 0 ? ' The pipeline has no params.' : ` The params are ${known.join(', ')}.`}`,
            }
        }
        return field === undefined ? null : { tone: 'error', message: 'A param has no fields.' }
    }
    if (root === 'run') {
        if (name === undefined || !(name in RUN_FIELDS))
            return { tone: 'error', message: `A run has ${Object.keys(RUN_FIELDS).join(', ')}.` }
        return null
    }
    if (root === 'steps') {
        const step = steps.find((one) => one.id === name)
        if (step === undefined) return { tone: 'error', message: `No step is named ${name ?? ''}.` }
        if (field === undefined || !(field in STEP_FIELDS) || rest.length > 0)
            return { tone: 'error', message: `A step hands on ${Object.keys(STEP_FIELDS).join(', ')}.` }
        if (owner === undefined) return { tone: 'error', message: 'Only a step can read what another step hands on.' }
        if (owner.id === step.id) return { tone: 'error', message: 'A step cannot read what it hands on itself.' }
        if (!before(steps, owner.id).has(step.id))
            return { tone: 'warning', message: `${owner.id} does not come after ${step.id}; add it to needs.` }
        return null
    }
    return { tone: 'error', message: `Unknown reference. Start it with params, steps or run.` }
}

/** The words a reference completes from: the roots, the params, the steps and their fields, and the run's. */
export function referenceWords(pipeline: Pipeline): CodeCompletion[] {
    return [
        { label: 'params', detail: 'root', docs: "The pipeline's params.", kind: 'keyword' },
        { label: 'steps', detail: 'root', docs: 'What the steps hand on.', kind: 'keyword' },
        { label: 'run', detail: 'root', docs: 'The run this is.', kind: 'keyword' },
        ...Object.entries(pipeline.params).map(([name, value]) => ({
            label: name,
            detail: `param = ${String(value)}`,
            kind: 'variable' as const,
        })),
        ...pipeline.steps.map((step) => ({ label: step.id, detail: `${step.kind} step`, kind: 'function' as const })),
        ...Object.entries(STEP_FIELDS).map(([label, docs]) => ({ label, detail: 'step field', docs, kind: 'property' as const })),
        ...Object.entries(RUN_FIELDS).map(([label, docs]) => ({ label, detail: 'run field', docs, kind: 'property' as const })),
    ]
}

/** What a word in a pipeline is, for its hover: a kind of step, a step or a param. */
export function describeWord(pipeline: Pipeline, word: string): string | null {
    if ((STEP_KINDS as readonly string[]).includes(word)) {
        const step = pipeline.steps.find((one) => one.id === word)
        const kind = KIND_DOCS[word as StepKind]
        return step === undefined || step.kind === word ? kind : `${kind} Also a ${step.kind} step here.`
    }
    const step = pipeline.steps.find((one) => one.id === word)
    if (step !== undefined) return `A ${step.kind} step${step.needs.length === 0 ? ', first to run' : `, after ${step.needs.join(', ')}`}.`
    if (word in pipeline.params) return `A param, ${String(pipeline.params[word])}.`
    return null
}
