/**
 * The edits the pipeline graph makes, each written back into the pipeline's YAML: a step added,
 * removed, renamed or set, and a need added or taken away. Each takes the text and answers with the
 * new text, everything it does not touch written as it was.
 */

import { isMap, isScalar, isSeq, parseDocument, visit, type Document, type YAMLMap, type YAMLSeq } from 'yaml'

import type { StepKind } from './pipeline'

/** How the studio writes YAML: lists in brackets without padding, and long strings kept on one line. */
const WRITE = { flowCollectionPadding: false, lineWidth: 0 } as const

/** The pattern a step's id follows, as the pipeline schema has it. */
export const STEP_ID = /^[a-z][a-z0-9-]*$/

function read(text: string): Document | null {
    const doc = parseDocument(text, { prettyErrors: false })
    return doc.errors.length > 0 ? null : doc
}

/** The `steps` list, made when the pipeline has none yet. */
function stepList(doc: Document): YAMLSeq {
    const found = doc.get('steps', true)
    if (isSeq(found)) return found
    const made = doc.createNode([]) as YAMLSeq
    doc.set('steps', made)
    return made
}

function stepItems(doc: Document): YAMLMap[] {
    const found = doc.get('steps', true)
    return isSeq(found) ? found.items.filter((item): item is YAMLMap => isMap(item)) : []
}

function idOf(item: YAMLMap): string | undefined {
    const id = item.get('id')
    return typeof id === 'string' ? id : undefined
}

function needsOf(item: YAMLMap): string[] {
    const needs = item.get('needs', true)
    return isSeq(needs) ? needs.items.flatMap((need) => (isScalar(need) && typeof need.value === 'string' ? [need.value] : [])) : []
}

/** Sets a step's needs, written in brackets; none takes the key out. */
function setNeeds(doc: Document, item: YAMLMap, needs: readonly string[]) {
    if (needs.length === 0) {
        item.delete('needs')
        return
    }
    const list = doc.createNode([...needs]) as YAMLSeq
    list.flow = true
    if (item.has('needs')) item.set('needs', list)
    else {
        // A new `needs` goes after `kind`, where the pipelines write it.
        const pair = doc.createPair('needs', list)
        const at = item.items.findIndex((each) => isScalar(each.key) && each.key.value === 'kind')
        item.items.splice(at === -1 ? item.items.length : at + 1, 0, pair as (typeof item.items)[number])
    }
}

/** A value as a node, its lists of plain values written in brackets as the pipelines write them. */
function made(doc: Document, value: unknown) {
    const node = doc.createNode(value)
    visit(node, {
        Seq(_, seq) {
            if (seq.items.every((item) => isScalar(item))) seq.flow = true
        },
    })
    return node
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Sets `key` of `map` to `value`, changing only what differs: a map's keys one by one, a plain
 * value in its own quotes, a list kept in brackets when it was. Undefined takes the key out.
 */
function assign(doc: Document, map: YAMLMap, key: string, value: unknown) {
    if (value === undefined || value === '') {
        map.delete(key)
        return
    }
    const node = map.get(key, true)
    if (isMap(node) && isRecord(value)) {
        for (const pair of node.items.slice()) {
            const inner = isScalar(pair.key) ? pair.key.value : undefined
            if (typeof inner === 'string' && !(inner in value)) node.delete(inner)
        }
        for (const [inner, next] of Object.entries(value)) assign(doc, node, inner, next)
        return
    }
    if (isScalar(node) && (value === null || typeof value !== 'object')) {
        if (node.value !== value) node.value = value
        return
    }
    if (isSeq(node) && Array.isArray(value)) {
        if (JSON.stringify(node.toJSON()) === JSON.stringify(value)) return
        const list = made(doc, value) as YAMLSeq
        list.flow = node.flow === true && value.every((item) => item === null || typeof item !== 'object')
        map.set(key, list)
        return
    }
    map.set(key, made(doc, value))
}

function write(doc: Document): string {
    return doc.toString(WRITE)
}

/** Applies `change` to the pipeline's document; the text as it was when it does not read. */
function edit(text: string, change: (doc: Document) => void): string {
    const doc = read(text)
    if (doc === null) return text
    change(doc)
    return write(doc)
}

/** An id not yet taken, from a kind: fetch, fetch-2, fetch-3. */
export function freeId(taken: readonly string[], kind: string): string {
    const used = new Set(taken)
    if (!used.has(kind)) return kind
    for (let n = 2; ; n += 1) if (!used.has(`${kind}-${String(n)}`)) return `${kind}-${String(n)}`
}

/** What a new step of each kind starts with: settings the schema takes, for the person to change. */
export const STARTING_SETTINGS: Record<StepKind, Record<string, unknown>> = {
    fetch: { url: 'https://api.example.org/', format: 'json' },
    transform: { language: 'jq', script: '.' },
    validate: { rules: [{ field: 'id', check: 'required' }], on_invalid: 'fail' },
    upload: { bucket: 'exports', path: 'out/${run.date}.json' },
    notify: { channel: '#alerts', on: ['failed'] },
}

/**
 * Adds a step of `kind` after the steps in `needs`, written after the last of them so the list
 * still reads in order; with `before`, the step goes between `needs` and that step, which then
 * needs the new step in their place. Answers with the text and the new step's id.
 */
export function addStep(
    text: string,
    kind: StepKind,
    { needs = [], before }: { needs?: readonly string[]; before?: string } = {},
): { text: string; id: string } {
    const doc = read(text)
    if (doc === null) return { text, id: '' }
    const items = stepItems(doc)
    const id = freeId(
        items.flatMap((item) => idOf(item) ?? []),
        kind,
    )
    const step = doc.createNode({ id, kind }) as YAMLMap
    setNeeds(doc, step, needs)
    step.set('with', made(doc, STARTING_SETTINGS[kind]))
    const list = stepList(doc)
    list.flow = false
    const after = Math.max(-1, ...needs.map((need) => list.items.findIndex((item) => isMap(item) && idOf(item) === need)))
    list.items.splice(after === -1 ? list.items.length : after + 1, 0, step)
    if (before !== undefined) {
        const target = items.find((item) => idOf(item) === before)
        if (target !== undefined) setNeeds(doc, target, [...new Set(needsOf(target).map((need) => (needs.includes(need) ? id : need)))])
    }
    return { text: write(doc), id }
}

/** Takes steps out, and out of the needs of the steps that came after them. */
export function removeSteps(text: string, ids: readonly string[]): string {
    const gone = new Set(ids)
    return edit(text, (doc) => {
        const list = stepList(doc)
        list.items = list.items.filter((item) => !(isMap(item) && gone.has(idOf(item) ?? '')))
        for (const item of stepItems(doc)) {
            const needs = needsOf(item)
            if (needs.some((need) => gone.has(need)))
                setNeeds(
                    doc,
                    item,
                    needs.filter((need) => !gone.has(need)),
                )
        }
    })
}

/** Makes `target` need `source`. */
export function connect(text: string, source: string, target: string): string {
    return edit(text, (doc) => {
        const item = stepItems(doc).find((each) => idOf(each) === target)
        if (item === undefined) return
        const needs = needsOf(item)
        if (!needs.includes(source)) setNeeds(doc, item, [...needs, source])
    })
}

/** Takes `source` out of what `target` needs. */
export function disconnect(text: string, source: string, target: string): string {
    return edit(text, (doc) => {
        const item = stepItems(doc).find((each) => idOf(each) === target)
        if (item !== undefined)
            setNeeds(
                doc,
                item,
                needsOf(item).filter((need) => need !== source),
            )
    })
}

/** Gives a step a new id, in its own item, in every step's needs and in every `${steps.<id>...}` reference. */
export function renameStep(text: string, from: string, to: string): string {
    return edit(text, (doc) => {
        for (const item of stepItems(doc)) {
            if (idOf(item) === from) item.set('id', to)
            const needs = needsOf(item)
            if (needs.includes(from))
                setNeeds(
                    doc,
                    item,
                    needs.map((need) => (need === from ? to : need)),
                )
        }
        const pattern = new RegExp(`\\$\\{(\\s*)steps\\.${from.replaceAll('-', '\\-')}(?=[.}\\s])`, 'g')
        visit(doc, {
            Scalar(_, node) {
                if (typeof node.value === 'string' && node.value.includes('${'))
                    node.value = node.value.replace(pattern, (_match, space: string) => `\${${space}steps.${to}`)
            },
        })
    })
}

/** The fields of a step the graph's settings edit: everything but its id, kind and needs. */
export type StepFields = Record<string, unknown>

/** A step's settings as they are written: every field but its id, kind and needs. */
export function stepFields(text: string, id: string): StepFields | undefined {
    const doc = read(text)
    const item = doc === null ? undefined : stepItems(doc).find((each) => idOf(each) === id)
    if (item === undefined) return undefined
    const all = item.toJSON() as Record<string, unknown>
    const { id: _id, kind: _kind, needs: _needs, ...rest } = all
    return rest
}

/**
 * Writes a step's settings: each field given is set, in the place it is written or else at the
 * end, and each field left out or empty is taken out, its id, kind and needs kept.
 */
export function setStepFields(text: string, id: string, fields: StepFields): string {
    return edit(text, (doc) => {
        const item = stepItems(doc).find((each) => idOf(each) === id)
        if (item === undefined) return
        for (const pair of item.items.slice()) {
            const key = isScalar(pair.key) ? pair.key.value : undefined
            if (typeof key !== 'string' || key === 'id' || key === 'kind' || key === 'needs') continue
            if (!(key in fields)) item.delete(key)
        }
        for (const [key, value] of Object.entries(fields)) {
            const settings = item.items.findIndex((pair) => isScalar(pair.key) && pair.key.value === 'with')
            if (key === 'with' || item.has(key) || settings === -1 || value === undefined || value === '') assign(doc, item, key, value)
            // A new field goes before the settings, where the pipelines write retries and timeout.
            else item.items.splice(settings, 0, doc.createPair(key, made(doc, value)) as (typeof item.items)[number])
        }
    })
}
