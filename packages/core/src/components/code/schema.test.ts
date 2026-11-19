import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState, Transaction, type TransactionSpec } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import type { JsonSchema } from '../schema/read'
import { registerSchemaFormats } from '../schema/formats'
import { validate } from '../schema/validate'
import {
    jsonKeys,
    jsonSlot,
    namedSchema,
    pathRange,
    readDocument,
    requiredSnippet,
    schemaCompletion,
    schemaDiagnostics,
    schemaProblems,
    schemasAt,
    yamlKeys,
    yamlScalar,
    yamlSlot,
} from './schema'

const SCHEMA: JsonSchema = {
    type: 'object',
    required: ['code', 'steps'],
    additionalProperties: false,
    properties: {
        code: { type: 'string', description: 'The job code.' },
        paused: { type: 'boolean' },
        steps: {
            type: 'array',
            items: {
                type: 'object',
                properties: { name: { enum: ['fetch', 'transform', 'validate', 'upload', 'notify'] }, retries: { type: 'integer' } },
            },
        },
    },
}

const yamlState = (doc: string) => EditorState.create({ doc, extensions: [yaml()] })
const jsonState = (doc: string) => EditorState.create({ doc, extensions: [json()] })

describe('reading a document', () => {
    it('reads YAML into a value with every scalar typed', () => {
        const state = yamlState(
            'code: nightly-export\nsteps:\n  - name: fetch\n    retries: 3\nlabels: [a, "b"]\nnote: |\n  one\n  two\nempty:\n',
        )
        expect(readDocument(state, 'yaml')?.value).toEqual({
            code: 'nightly-export',
            steps: [{ name: 'fetch', retries: 3 }],
            labels: ['a', 'b'],
            note: 'one\ntwo\n',
            empty: null,
        })
        expect(yamlScalar('~')).toBeNull()
        expect(yamlScalar('0x1f')).toBe(31)
        expect(yamlScalar('True')).toBe(true)
    })

    it('reads JSON and says where it breaks', () => {
        expect(readDocument(jsonState('{"a": [1, true, null], "b": "x"}'), 'json')?.value).toEqual({ a: [1, true, null], b: 'x' })
        expect(readDocument(jsonState('{"a": }'), 'json')?.broken).toBeDefined()
    })

    it('reads plain scalars as YAML 1.1 does when asked', () => {
        for (const word of ['y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON', 'true']) expect(yamlScalar(word, '1.1')).toBe(true)
        for (const word of ['n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF', 'false']) expect(yamlScalar(word, '1.1')).toBe(false)
        expect(yamlScalar('~', '1.1')).toBeNull()
        expect(yamlScalar('010', '1.1')).toBe(8)
        expect(yamlScalar('-010', '1.1')).toBe(-8)
        expect(yamlScalar('0o10', '1.1')).toBe('0o10')
        expect(yamlScalar('0b101', '1.1')).toBe(5)
        expect(yamlScalar('0x1_f', '1.1')).toBe(31)
        expect(yamlScalar('1_000', '1.1')).toBe(1000)
        expect(yamlScalar('0', '1.1')).toBe(0)
        expect(yamlScalar('09', '1.1')).toBe('09')
        expect(yamlScalar('1:30', '1.1')).toBe(90)
        expect(yamlScalar('-1:30', '1.1')).toBe(-90)
        expect(yamlScalar('1:30.5', '1.1')).toBe(90.5)
        expect(yamlScalar('1_000.5', '1.1')).toBe(1000.5)
        expect(yamlScalar('.5', '1.1')).toBe(0.5)
        expect(yamlScalar('-.inf', '1.1')).toBe(-Infinity)
        expect(yamlScalar('.NaN', '1.1')).toBeNaN()
        expect(yamlScalar('nightly-export', '1.1')).toBe('nightly-export')
        // YAML 1.2 reads the same words as strings and numbers by its core schema.
        expect([yamlScalar('yes'), yamlScalar('off'), yamlScalar('010'), yamlScalar('0o10')]).toEqual(['yes', 'off', 10, 8])
        expect([yamlScalar('0b101'), yamlScalar('1_000'), yamlScalar('1:30')]).toEqual(['0b101', '1_000', '1:30'])
        expect(yamlScalar('.inf')).toBe(Infinity)
    })

    it('reads, checks and caches a YAML 1.1 document apart from a 1.2 one', () => {
        const state = yamlState('code: nightly-export\npaused: yes\nsteps:\n  - name: fetch\n    retries: 010\n')
        const older = readDocument(state, 'yaml', undefined, '1.1')
        const newer = readDocument(state, 'yaml')
        expect(older).not.toBe(newer)
        expect(older?.value).toEqual({ code: 'nightly-export', paused: true, steps: [{ name: 'fetch', retries: 8 }] })
        expect(newer?.value).toEqual({ code: 'nightly-export', paused: 'yes', steps: [{ name: 'fetch', retries: 10 }] })
        expect(readDocument(state, 'yaml', undefined, '1.1')).toBe(older)
        expect(schemaDiagnostics(state, 'yaml', SCHEMA, validate, undefined, undefined, '1.1')).toEqual([])
        expect(schemaDiagnostics(state, 'yaml', SCHEMA, validate).map((each) => each.path)).toEqual([['paused']])
    })

    it('reads a text once, and again only once it changes', () => {
        const state = jsonState('{"steps": [{"name": "fetch"}, {"name": "upload"}]}')
        const first = readDocument(state, 'json')
        expect(readDocument(state, 'json')).toBe(first)
        const moved = state.update({ selection: { anchor: 3 } }).state
        expect(readDocument(moved, 'json')).toBe(first)
        const edited = state.update({ changes: { from: 1, insert: ' ' } }).state
        expect(readDocument(edited, 'json')).not.toBe(first)
        expect(readDocument(edited, 'json')?.value).toEqual(first?.value)
    })

    it('reads a YAML alias as the value its anchor names, and a merge key into the mapping', () => {
        const doc = [
            'defaults: &defaults',
            '  retries: 2',
            '  timeout: 30',
            'steps: &steps [fetch, upload]',
            'nightly-export:',
            '  <<: *defaults',
            '  timeout: 60',
            '  steps: *steps',
            'sync-inventory:',
            '  <<: [*defaults, {owner: ada, retries: 5}]',
            '',
        ].join('\n')
        expect(readDocument(yamlState(doc), 'yaml')?.value).toEqual({
            defaults: { retries: 2, timeout: 30 },
            steps: ['fetch', 'upload'],
            'nightly-export': { retries: 2, timeout: 60, steps: ['fetch', 'upload'] },
            'sync-inventory': { retries: 2, timeout: 30, owner: 'ada' },
        })
    })

    it('reads every document of a YAML stream', () => {
        const read = readDocument(yamlState('code: nightly-export\n---\ncode: sync-inventory\n'), 'yaml')
        expect(read?.value).toEqual({ code: 'nightly-export' })
        expect(read?.documents?.map((document) => document.value)).toEqual([{ code: 'nightly-export' }, { code: 'sync-inventory' }])
        expect(readDocument(yamlState('code: nightly-export\n'), 'yaml')?.documents).toBeUndefined()
    })
})

describe('schema diagnostics', () => {
    it('places each YAML issue on the text it is about', () => {
        const doc = 'code: nightly-export\nsteps:\n  - name: fetch\n    retries: many\n  - name: compress\nowner: ada\n'
        const state = yamlState(doc)
        const found = schemaDiagnostics(state, 'yaml', SCHEMA, validate).map((each) => [doc.slice(each.from, each.to), each.message])
        expect(found).toEqual(
            expect.arrayContaining([
                ['many', 'Expected an integer'],
                ['compress', 'Expected one of "fetch", "transform", "validate", "upload", "notify"'],
                ['owner', 'owner is not a known property'],
            ]),
        )
    })

    it('marks a missing property at its object and a broken document where it breaks', () => {
        const doc = '{\n  "code": "nightly-export"\n}'
        const [missing] = schemaDiagnostics(jsonState(doc), 'json', SCHEMA, validate)
        expect(missing.message).toBe('Missing the property steps')
        expect(missing.from).toBe(0)
        const [broken] = schemaDiagnostics(jsonState('{"code": }'), 'json', SCHEMA, validate)
        expect(broken.message).toBe('Not valid JSON')
    })

    it('takes an alias for its value and checks each document of a stream', () => {
        const aliased = 'code: &code nightly-export\nsteps:\n  - &step {name: fetch, retries: 2}\n  - *step\n'
        expect(schemaDiagnostics(yamlState(aliased), 'yaml', SCHEMA, validate)).toEqual([])
        const doc = 'code: nightly-export\nsteps: []\n---\ncode: sync-inventory\nsteps:\n  - name: fetch\n    retries: many\n'
        const found = schemaDiagnostics(yamlState(doc), 'yaml', SCHEMA, validate).map((each) => [
            doc.slice(each.from, each.to),
            each.message,
        ])
        expect(found).toEqual([['many', 'Expected an integer']])
    })

    it('reads a key such as __proto__ or constructor as a key of the document like any other', () => {
        const doc = '{"code": "nightly-export", "steps": [], "__proto__": {"paused": 1}, "constructor": 2}'
        const read = readDocument(jsonState(doc), 'json')?.value
        expect(Object.keys(read as object)).toEqual(['code', 'steps', '__proto__', 'constructor'])
        expect(Object.getPrototypeOf(read)).toBe(Object.prototype)
        const messages = schemaDiagnostics(jsonState(doc), 'json', SCHEMA, validate).map((each) => each.message)
        expect(messages).toEqual(['__proto__ is not a known property', 'constructor is not a known property'])
        const yamlDoc = 'base: &base {__proto__: 1}\nmerged:\n  <<: *base\n  constructor: 2\n'
        const yamlRead = readDocument(yamlState(yamlDoc), 'yaml')?.value as Record<string, unknown> | undefined
        expect(Object.keys(yamlRead?.merged as object)).toEqual(['__proto__', 'constructor'])
    })
})

describe('the schema check without its checker', () => {
    const doc = 'code: nightly-export\nsteps: []\n'

    it('knows nothing yet while the checker loads, save a document that does not read', () => {
        expect(schemaProblems(yamlState(doc), 'yaml', SCHEMA, undefined, null)).toBeUndefined()
        const [broken] = schemaProblems(jsonState('{"code": }'), 'json', SCHEMA, undefined, null) ?? []
        expect(broken.message).toBe('Not valid JSON')
    })

    it('fails closed once the checker failed to load', () => {
        const found = schemaProblems(yamlState(doc), 'yaml', SCHEMA, undefined, 'Failed to fetch')
        expect(found).toMatchObject([{ from: 0, to: 20, severity: 'error', message: 'The schema cannot be checked: Failed to fetch' }])
    })

    it('says what the checker finds once it has loaded', () => {
        expect(schemaProblems(yamlState(doc), 'yaml', SCHEMA, validate, 'Failed to fetch')).toEqual([])
    })
})

describe('schema completion', () => {
    it('finds the slot in half-written JSON', () => {
        const source = '{"steps": [{"name": "fe'
        expect(jsonSlot(source, source.length)).toMatchObject({ path: ['steps', 0], at: 'value', key: 'name', quoted: true })
        const key = '{"steps": [{"name": "fetch", "re'
        expect(jsonSlot(key, key.length)).toMatchObject({ path: ['steps', 0], at: 'key', quoted: true })
    })

    it('finds the slot in YAML from the indentation', () => {
        const doc = 'code: x\nsteps:\n  - name: fetch\n    re'
        expect(yamlSlot(yamlState(doc), doc.length)).toMatchObject({ path: ['steps', 0], at: 'key' })
        const value = 'steps:\n  - name: fe'
        expect(yamlSlot(yamlState(value), value.length)).toMatchObject({ path: ['steps', 0], at: 'value', key: 'name' })
        const item = 'steps:\n  - na'
        expect(yamlSlot(yamlState(item), item.length)).toMatchObject({ path: ['steps', 0], at: 'key' })
    })

    it('walks the schema along a path', () => {
        expect(schemasAt(SCHEMA, ['steps', 0, 'name'])[0].enum).toContain('validate')
    })

    it('finds nothing at a reference with a broken percent escape, and does not throw', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: { step: { $ref: '#/$defs/%E0%A4%A' }, mark: { $ref: '#%E0%A4%A' } },
            $defs: { step: { type: 'string' } },
        }
        expect(() => schemasAt(schema, ['step'])).not.toThrow()
        expect(() => schemasAt(schema, ['mark'])).not.toThrow()
        expect(schemasAt(schema, ['step']).some((each) => each.type === 'string')).toBe(false)
    })
    it('says a field that refers to a definition with no type by what it takes, never by its key', () => {
        const schema: JsonSchema = {
            type: 'object',
            $defs: { 'fetch.Payload': {} },
            properties: { body: { anyOf: [{ $ref: '#/$defs/fetch.Payload' }, { type: 'null' }] } },
        }
        const doc = 'bo'
        const found = schemaCompletion(() => schema, 'yaml')(new CompletionContext(yamlState(doc), doc.length, true))?.options ?? []
        expect(found.find((option) => option.label === 'body')?.detail).toBe('any or null')
    })
})

describe('schema completion in place', () => {
    const view = () => {
        let state = jsonState('')
        return {
            get state() {
                return state
            },
            set: (next: EditorState) => (state = next),
            dispatch(spec: TransactionSpec) {
                state = state.update(spec).state
            },
        }
    }

    const complete = (state: EditorState, schema: JsonSchema, language: 'json' | 'yaml') =>
        schemaCompletion(() => schema, language)(new CompletionContext(state, state.doc.length, true))

    it('leaves out the keys already written and lists required ones first', () => {
        const doc = '{"paused": true, "'
        const result = complete(jsonState(doc), SCHEMA, 'json')
        const labels = result?.options.map((option) => option.label)
        expect(labels).not.toContain('paused')
        expect(result?.options.filter((option) => option.boost === 1).map((option) => option.label)).toEqual(['code', 'steps'])
        const yamlDoc = 'code: x\nsteps:\n  - name: fetch\n    \n'
        const state = yamlState(yamlDoc)
        const items = schemaCompletion(() => SCHEMA, 'yaml')(new CompletionContext(state, yamlDoc.length - 1, true))
        expect(items?.options.map((option) => option.label)).toEqual(['retries'])
    })

    it('finds the keys around the cursor in JSON', () => {
        const source = '{\n  "code": "x",\n  "st\n  "steps": [{"name": "y"}],\n  "paused": false\n}'
        expect([...jsonKeys(source, source.indexOf('"st\n') + 3)]).toEqual(['code', 'steps', 'paused'])
        const nested = 'code: x\nsteps:\n  - name: fetch\n    re\n    retries: 2\n  - name: upload\nowner: ada\n'
        expect([...yamlKeys(yamlState(nested), nested.indexOf('re\n') + 2, 4)]).toEqual(['name', 'retries'])
    })

    it('puts a key in with its default selected, or opened for its value', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                retries: { type: 'integer', default: 3 },
                labels: { type: 'object' },
                steps: { type: 'array' },
                owner: { type: 'string' },
            },
        }
        const editor = view()
        editor.set(jsonState('{"'))
        const options = complete(editor.state, schema, 'json')?.options ?? []
        const apply = (label: string) => {
            editor.set(jsonState('{"'))
            const option = options.find((each) => each.label === label)
            if (option === undefined) throw new Error(`No option ${label}`)
            ;(option.apply as (view: unknown, completion: unknown, from: number, to: number) => void)(editor, option, 2, 2)
            const { from, to } = editor.state.selection.main
            return [editor.state.doc.toString(), editor.state.sliceDoc(from, to), from]
        }
        expect(apply('retries')).toEqual(['{"retries": 3', '3', 12])
        expect(apply('labels')).toEqual(['{"labels": {}', '', 12])
        expect(apply('owner')).toEqual(['{"owner": ""', '', 11])
        const yamlOptions = complete(
            yamlState('steps:\n  '),
            { type: 'object', properties: { steps: { type: 'object', properties: schema.properties } } },
            'yaml',
        )
        expect(yamlOptions?.options.map((option) => option.label)).toEqual(['retries', 'labels', 'steps', 'owner'])
    })

    it('follows then and else as well as anyOf and oneOf', () => {
        const schema: JsonSchema = {
            type: 'object',
            if: { properties: { kind: { const: 'http' } } },
            // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
            then: { properties: { url: { type: 'string' } } },
            else: { properties: { command: { type: 'string' } } },
            properties: { kind: { enum: ['http', 'shell'] } },
        }
        const names = schemasAt(schema, []).flatMap((each) => Object.keys(each.properties ?? {}))
        expect(names).toEqual(['kind', 'url', 'command'])
    })

    it('reads the schema a document names for itself', () => {
        expect(namedSchema('# yaml-language-server: $schema=./job.schema.json\ncode: x\n', 'yaml')).toBe('./job.schema.json')
        expect(namedSchema('$schema: https://json-schema.org/draft/2020-12/schema\ntype: object\n', 'yaml')).toBe(
            'https://json-schema.org/draft/2020-12/schema',
        )
        expect(namedSchema('steps:\n  $schema: nested\n', 'yaml')).toBeUndefined()
        expect(namedSchema('{"a": {"$schema": "nested"}, "$schema": "top", ', 'json')).toBe('top')
    })

    it('checks a schema document against the dialect it names', () => {
        const meta: JsonSchema = { $id: 'https://json-schema.org/draft/2020-12/schema' }
        expect(validate(meta, { type: 'object', required: ['code'] })).toEqual([])
        expect(validate(meta, { type: 'object', required: 'code' }).map((issue) => issue.path)).toContainEqual(['required'])
    })
})

describe('a schema that picks a branch by a sibling value', () => {
    // As a pipeline's document schema attaches each block's config: allOf of if/then on the step.
    const PIPELINE: JsonSchema = {
        type: 'object',
        properties: {
            steps: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: { block: { enum: ['http', 'shell'] }, config: { type: 'object' } },
                    allOf: [
                        {
                            if: { properties: { block: { const: 'http' } }, required: ['block'] },
                            // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
                            then: {
                                properties: { config: { properties: { url: { type: 'string' }, method: { enum: ['GET', 'POST'] } } } },
                            },
                        },
                        {
                            if: { properties: { block: { const: 'shell' } }, required: ['block'] },
                            // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
                            then: {
                                properties: { config: { properties: { command: { type: 'string', description: 'What the step runs.' } } } },
                            },
                        },
                    ],
                },
            },
        },
    }
    const doc = 'steps:\n  - block: http\n    config:\n      u\n  - block: shell\n    config:\n      c\n'

    const keysAt = (marker: string) => {
        const state = yamlState(doc)
        const pos = doc.indexOf(marker) + marker.length
        const result = schemaCompletion(() => PIPELINE, 'yaml')(new CompletionContext(state, pos, true))
        return (result?.options ?? []).map((option) => option.label)
    }

    it('reads each list item at its own index', () => {
        const state = yamlState(doc)
        expect(yamlSlot(state, doc.indexOf('      c') + 7).path).toEqual(['steps', 1, 'config'])
    })

    it("offers a step's config only the keys of its own block", () => {
        expect(keysAt('      u')).toEqual(['url', 'method'])
        expect(keysAt('      c')).toEqual(['command'])
    })

    it('follows both branches when the document is not known', () => {
        const names = schemasAt(PIPELINE, ['steps', 0, 'config']).flatMap((each) => Object.keys(each.properties ?? {}))
        expect(names).toEqual(expect.arrayContaining(['url', 'method', 'command']))
    })
})

describe('a schema that refers to itself', () => {
    /** A schema for schemas, as a meta-schema is: its parts point back at the root, by `$ref` or by an anchor. */
    const META: JsonSchema = {
        $dynamicAnchor: 'meta',
        type: 'object',
        properties: {
            type: { enum: ['string', 'integer', 'object', 'array'] },
            title: { type: 'string' },
            properties: { type: 'object', additionalProperties: { $ref: '#' } },
            items: { $dynamicRef: '#meta' },
            not: { $ref: '#/properties/items' },
        },
    }

    it('walks into a part that points at the root, by a pointer, an anchor or a dynamic reference', () => {
        expect(schemasAt(META, ['properties', 'id', 'type'])[0].enum).toContain('integer')
        expect(schemasAt(META, ['items', 'type'])[0].enum).toContain('array')
        expect(schemasAt(META, ['not', 'properties', 'id', 'items', 'title'])[0].type).toBe('string')
    })

    it('offers the keys of a schema nested inside one being written', async () => {
        const doc = '{\n  "properties": {\n    "id": { "' + '' + '" }\n  }\n}'
        const pos = doc.indexOf('{ "') + 3
        const result = await schemaCompletion(() => META, 'json')(new CompletionContext(jsonState(doc), pos, true))
        expect(result?.options.map((option) => option.label)).toEqual(expect.arrayContaining(['type', 'title', 'items']))
    })
})

describe('problems and places', () => {
    it('gives each finding of a check the path of the value it is about', () => {
        const doc = 'code: nightly-export\nsteps:\n  - name: fetch\n    retries: many\n  - name: compress\nowner: ada\n'
        const found = schemaDiagnostics(yamlState(doc), 'yaml', SCHEMA, validate).map((each) => each.path)
        expect(found).toEqual(expect.arrayContaining([['steps', 0, 'retries'], ['steps', 1, 'name'], ['owner']]))
    })

    it('finds where the value at a path is written, its key included', () => {
        const doc = 'code: nightly-export\nsteps:\n  - name: fetch\n    retries: 3\n  - name: upload\n'
        const state = yamlState(doc)
        const at = pathRange(state, 'yaml', ['steps', 1])
        expect(at === null ? null : doc.slice(at.from, at.to).trim()).toBe('name: upload')
        const key = pathRange(state, 'yaml', ['steps', 0, 'retries'])
        expect(key === null ? null : doc.slice(key.from, key.to)).toBe('retries: 3')
        expect(pathRange(state, 'yaml', ['steps', 4])).toBeNull()
        const json = jsonState('{"steps": [{"name": "fetch"}]}')
        const named = pathRange(json, 'json', ['steps', 0, 'name'])
        expect(named === null ? null : json.doc.sliceString(named.from, named.to)).toBe('"name": "fetch"')
    })
})

describe("a pipeline's steps, each configured by its block", () => {
    /** A field's value, or a reference to one filled in when the pipeline runs. */
    const REFERENCE: JsonSchema = { type: 'string', pattern: '^\\$\\{[^}]+\\}$' }
    const either = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, REFERENCE] })
    const PIPELINE: JsonSchema = {
        type: 'object',
        properties: {
            steps: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['name', 'block'],
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        block: { enum: ['fetch', 'wait'] },
                        config: {},
                    },
                    allOf: [
                        {
                            if: { properties: { block: { const: 'fetch' } }, required: ['block'] },
                            // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
                            then: {
                                properties: {
                                    config: {
                                        type: 'object',
                                        properties: {
                                            retries: either({ type: 'integer', minimum: 0 }),
                                            host: either({ type: 'string', format: 'hostname' }),
                                            legacy: { type: 'string', deprecated: true },
                                        },
                                    },
                                },
                            },
                        },
                        {
                            if: { properties: { block: { const: 'wait' } }, required: ['block'] },
                            // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
                            then: {
                                properties: {
                                    config: {
                                        type: 'object',
                                        properties: {
                                            for: either({ type: 'string', format: 'humane-duration', pattern: '^(?:(?:\\d+[smhd])+)$' }),
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
            },
        },
    }
    registerSchemaFormats({ 'humane-duration': /^(?:\d+[smhd])+$/ })

    const diagnose = (doc: string) =>
        schemaDiagnostics(yamlState(doc), 'yaml', PIPELINE, validate).map((each) => [doc.slice(each.from, each.to), each.message])

    const options = (doc: string, marker: string) => {
        const state = yamlState(doc)
        const pos = doc.indexOf(marker) + marker.length
        return schemaCompletion(() => PIPELINE, 'yaml')(new CompletionContext(state, pos, true))?.options ?? []
    }

    it('marks an empty config at its key, not the step around it', () => {
        const doc = 'steps:\n  - name: wait-a-while\n    description: Waits before the upload\n    block: wait\n    config:\n'
        expect(diagnose(doc)).toEqual([['config', 'Expected an object']])
        const at = pathRange(yamlState(doc), 'yaml', ['steps', 0, 'config'])
        expect(at === null ? null : doc.slice(at.from, at.to)).toBe('config')
    })

    it('says a value that fails a format once, by the format, never by its raw pattern', () => {
        const doc = 'steps:\n  - name: pause\n    block: wait\n    config:\n      for: 5 parsecs\n'
        expect(diagnose(doc)).toEqual([['5 parsecs', 'Expected the humane-duration format']])
        expect(diagnose(doc.replace('5 parsecs', '5m'))).toEqual([])
        expect(diagnose(doc.replace('5 parsecs', '${steps.fetch.delay}'))).toEqual([])
    })

    it('says a failed format by the phrase it was registered with', () => {
        const doc = 'steps:\n  - name: pause\n    block: wait\n    config:\n      for: 5 parsecs\n'
        registerSchemaFormats({ 'humane-duration': { test: /^(?:\d+[smhd])+$/, say: 'Expected a duration such as 30s or 5m' } })
        try {
            expect(diagnose(doc)).toEqual([['5 parsecs', 'Expected a duration such as 30s or 5m']])
            expect(diagnose(doc.replace('5 parsecs', '5m'))).toEqual([])
        } finally {
            registerSchemaFormats({ 'humane-duration': /^(?:\d+[smhd])+$/ })
        }
    })

    it('describes a field by its own type, not by the reference beside it', () => {
        const doc = 'steps:\n  - name: get\n    block: fetch\n    config:\n      r\n'
        const details = Object.fromEntries(options(doc, '      r').map((option) => [option.label, option.detail]))
        expect(details).toMatchObject({ retries: 'integer', host: 'string, hostname' })
    })

    it('lists a deprecated key last, marked deprecated', () => {
        const doc = 'steps:\n  - name: get\n    block: fetch\n    config:\n      r\n'
        const found = options(doc, '      r')
        const legacy = found.find((option) => option.label === 'legacy')
        expect(legacy).toMatchObject({ detail: 'deprecated', deprecated: true })
        const others = found.filter((option) => option !== legacy).map((option) => option.boost ?? 0)
        expect(Math.min(...others)).toBeGreaterThan(legacy?.boost ?? 0)
    })
})

describe('completing a key with the keys its object requires', () => {
    const SCHEDULE: JsonSchema = {
        type: 'object',
        properties: {
            schedule: {
                type: 'object',
                required: ['cron', 'zone', 'retries', 'paused', 'step'],
                properties: {
                    cron: { type: 'string' },
                    zone: { type: 'string', default: 'UTC' },
                    retries: { type: 'integer' },
                    paused: { type: 'boolean' },
                    step: { enum: ['fetch', 'upload'] },
                    owner: { type: 'string' },
                },
            },
            labels: { type: 'object' },
        },
    }

    /** Applies the option for `label` where the document ends, as a pick from the list does, and reads the document and the first field chosen. */
    const pick = (state: EditorState, language: 'json' | 'yaml', label: string) => {
        let now = state
        const editor = {
            get state() {
                return now
            },
            // A snippet dispatches a transaction, any other option a spec.
            dispatch(given: Transaction | TransactionSpec) {
                now = given instanceof Transaction ? given.state : now.update(given).state
            },
        }
        const result = schemaCompletion(() => SCHEDULE, language)(new CompletionContext(state, state.doc.length, true))
        const option = result?.options.find((each) => each.label === label)
        if (option === undefined || result === null) throw new Error(`No option ${label}`)
        ;(option.apply as (view: unknown, completion: unknown, from: number, to: number) => void)(
            editor,
            option,
            result.from,
            state.doc.length,
        )
        const { from, to } = now.selection.main
        return { text: now.doc.toString(), chosen: now.sliceDoc(from, to), at: from }
    }

    it('writes the template with each required key and a field for its value', () => {
        expect(requiredSnippet('schedule', SCHEDULE.properties?.schedule ?? {}, SCHEDULE, 'json', 1, 0)).toBe(
            '"schedule": \\{\n\t"cron": "${1}",\n\t"zone": ${2:"UTC"},\n\t"retries": ${3:0},\n\t"paused": ${4:false},\n\t"step": ${5:"fetch"}\n\\}',
        )
        expect(requiredSnippet('labels', { type: 'object' }, SCHEDULE, 'json', 0, 0)).toBeUndefined()
    })

    it('puts the whole object in JSON, the first field chosen', () => {
        const { text, chosen, at } = pick(jsonState('{\n  "sch'), 'json', 'schedule')
        expect(text).toBe(
            '{\n  "schedule": {\n    "cron": "",\n    "zone": "UTC",\n    "retries": 0,\n    "paused": false,\n    "step": "fetch"\n  }',
        )
        expect(chosen).toBe('')
        expect(text.slice(at - 1, at + 1)).toBe('""')
    })

    it('puts the whole mapping in YAML, indented under the key', () => {
        const { text, chosen } = pick(yamlState('code: x\nsch'), 'yaml', 'schedule')
        expect(text).toBe('code: x\nschedule:\n  cron: \n  zone: UTC\n  retries: 0\n  paused: false\n  step: fetch')
        expect(chosen).toBe('')
    })

    it('keeps a key whose object requires nothing as it was', () => {
        expect(pick(jsonState('{"lab'), 'json', 'labels').text).toBe('{"labels": {}')
    })
})
