import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { CompletionContext } from '@codemirror/autocomplete'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { schemaCompletion, schemaDiagnostics } from './code/schema'
import { JSON_SCHEMA_2020_12 } from './json-schema'
import { validate } from './schema/validate'

const VOCABULARIES = ['core', 'applicator', 'unevaluated', 'validation', 'meta-data', 'format-annotation', 'content']

/** ajv's copy of the dialect's schema and its vocabularies, merged as the module merges them. */
function flattenedFromAjv(): unknown {
    const dir = dirname(createRequire(import.meta.url).resolve('ajv/dist/refs/json-schema-2020-12/schema.json'))
    const read = (name: string) => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8')) as Record<string, Record<string, unknown>>
    const root = read('schema')
    const properties: Record<string, unknown> = {}
    const defs: Record<string, unknown> = {}
    for (const vocabulary of VOCABULARIES.map((name) => read(`meta/${name}`))) {
        Object.assign(properties, vocabulary.properties)
        Object.assign(defs, vocabulary.$defs ?? {})
    }
    Object.assign(properties, root.properties)
    const merged = { $schema: root.$schema, $dynamicAnchor: 'meta', title: root.title, type: root.type, properties, $defs: defs }
    const text = JSON.stringify(merged).replaceAll(/"meta\/[a-z-]+#\/\$defs\//g, '"#/$defs/')
    return JSON.parse(text)
}

/** The same object with every `true` schema written `{}`, as the module writes it. */
function trueAsEmpty(value: unknown, key = ''): unknown {
    const schemaSlots = new Set(['const', 'default', 'items'])
    if (value === true && schemaSlots.has(key)) return {}
    if (Array.isArray(value)) return value.map((each) => trueAsEmpty(each))
    if (typeof value === 'object' && value !== null)
        return Object.fromEntries(Object.entries(value).map(([inner, each]) => [inner, trueAsEmpty(each, inner)]))
    return value
}

const labelsAt = async (language: 'json' | 'yaml', doc: string, marker: string) => {
    const state = EditorState.create({ doc, extensions: [language === 'json' ? json() : yaml()] })
    const pos = doc.indexOf(marker) + marker.length
    const result = await schemaCompletion(() => JSON_SCHEMA_2020_12, language)(new CompletionContext(state, pos, true))
    return (result?.options ?? []).map((option) => option.label)
}

describe('JSON_SCHEMA_2020_12', () => {
    it("is ajv's copy of the 2020-12 meta-schema with its vocabularies merged", () => {
        expect(JSON_SCHEMA_2020_12).toEqual(trueAsEmpty(flattenedFromAjv()))
    })

    it('refers to nothing outside itself', () => {
        const refs = JSON.stringify(JSON_SCHEMA_2020_12).match(/"\$(dynamic)?[rR]ef":"[^"]*"/g) ?? []
        expect(refs.length).toBeGreaterThan(10)
        for (const ref of refs) expect(ref).toMatch(/:"#/)
    })

    it('completes keywords at the top of a schema', async () => {
        const labels = await labelsAt('json', '{\n  "\n}', '{\n  "')
        expect(labels).toEqual(expect.arrayContaining(['$schema', 'type', 'properties', 'required', 'items', 'allOf', 'title']))
    })

    it('completes keywords inside properties.<name>', async () => {
        const doc = '{\n  "type": "object",\n  "properties": {\n    "code": { "" }\n  }\n}'
        const labels = await labelsAt('json', doc, '"code": { "')
        expect(labels).toEqual(expect.arrayContaining(['type', 'description', 'enum', 'pattern', 'properties']))
    })

    it('completes keywords inside items, in YAML too', async () => {
        const doc = 'type: array\nitems:\n  ty\n'
        expect(await labelsAt('yaml', doc, '  ty')).toEqual(expect.arrayContaining(['type', 'minLength', 'format']))
        const jsonDoc = '{\n  "type": "array",\n  "items": { "" }\n}'
        expect(await labelsAt('json', jsonDoc, '"items": { "')).toEqual(expect.arrayContaining(['type', 'properties', 'required']))
    })

    it('completes the simple types as the value of type', async () => {
        const doc = '{\n  "properties": {\n    "code": { "type": "" }\n  }\n}'
        expect(await labelsAt('json', doc, '"type": "')).toEqual(expect.arrayContaining(['string', 'object']))
    })

    it('checks a schema document with validate()', () => {
        expect(validate(JSON_SCHEMA_2020_12, { type: 'object', required: ['code'], properties: { code: { type: 'string' } } })).toEqual([])
        const issues = validate(JSON_SCHEMA_2020_12, {
            type: 'object',
            required: 'code',
            properties: { code: { type: 'text', minLength: -1 } },
            items: { pattern: 4 },
        })
        const paths = issues.map((issue) => issue.path.join('.'))
        expect(paths).toEqual(expect.arrayContaining(['required', 'properties.code.type', 'properties.code.minLength', 'items.pattern']))
    })

    it('places each issue in an edited schema on the text it is about', () => {
        const doc = 'type: object\nproperties:\n  code:\n    type: text\n'
        const state = EditorState.create({ doc, extensions: [yaml()] })
        const found = schemaDiagnostics(state, 'yaml', JSON_SCHEMA_2020_12, validate).map((each) => doc.slice(each.from, each.to))
        expect(found).toContain('text')
    })
})
