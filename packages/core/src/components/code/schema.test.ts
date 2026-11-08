import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import type { JsonSchema } from '../schema/read'
import { validate } from '../schema/validate'
import { jsonSlot, readDocument, schemaDiagnostics, schemasAt, yamlScalar, yamlSlot } from './schema'

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
