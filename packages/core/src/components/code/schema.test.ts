import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState, type TransactionSpec } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import type { JsonSchema } from '../schema/read'
import { validate } from '../schema/validate'
import {
    jsonKeys,
    jsonSlot,
    namedSchema,
    readDocument,
    schemaCompletion,
    schemaDiagnostics,
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
