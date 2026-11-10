import { describe, expect, it, vi } from 'vitest'

import type { JsonSchema } from './read'
import { registerSchemaFormats } from './formats'
import { fieldSchema, pointer } from './issues'
import { validate } from './validate'

const JOB: JsonSchema = {
    type: 'object',
    required: ['code', 'endpoint', 'retries'],
    properties: {
        code: { type: 'string', pattern: '^[a-z][a-z0-9-]*$', maxLength: 12 },
        endpoint: { type: 'string', format: 'uri' },
        retries: { type: 'integer', minimum: 0, maximum: 5 },
        owner: { type: 'string', format: 'email' },
        legacy: { type: 'boolean', deprecated: true },
        tags: { type: 'array', items: { type: 'string', minLength: 2 }, maxItems: 3, uniqueItems: true },
        note: { anyOf: [{ type: 'string', maxLength: 4 }, { type: 'null' }] },
        steps: { type: 'array', minItems: 1, items: { $ref: '#/$defs/Step' } },
    },
    $defs: { Step: { type: 'object', required: ['run'], properties: { run: { type: 'string' } } } },
}

const issues = (value: unknown) => validate(JOB, value).map(({ path, kind, tone, fix }) => ({ at: pointer(path), kind, tone, fix }))

describe('validate', () => {
    it('passes a good value', () => {
        expect(issues({ code: 'export', endpoint: 'https://hooks.example.org', retries: 2, steps: [{ run: 'go' }] })).toEqual([])
    })

    it('names each missing required field', () => {
        expect(
            issues({ code: '', steps: [{ run: 'go' }] })
                .map((issue) => issue.at)
                .sort(),
        ).toEqual(['/code', '/endpoint', '/retries'])
    })

    it('offers a repaired value for a pattern', () => {
        const found = issues({ code: '24h-export', endpoint: 'https://a.example.org', retries: 0, steps: [{}] })
        expect(found).toContainEqual({ at: '/code', kind: 'pattern', tone: 'critical', fix: 'export-24h' })
        expect(found).toContainEqual({ at: '/steps/0/run', kind: 'required', tone: 'critical', fix: undefined })
    })

    it('offers the bound for a number out of range, and a whole number for a fraction', () => {
        expect(issues({ code: 'a', endpoint: 'https://a.example.org', retries: 9, steps: [{ run: 'x' }] })).toEqual([
            { at: '/retries', kind: 'maximum', tone: 'critical', fix: 5 },
        ])
        expect(issues({ code: 'a', endpoint: 'https://a.example.org', retries: 1.6, steps: [{ run: 'x' }] })[0]).toMatchObject({
            kind: 'type',
            fix: 2,
        })
    })

    it('reads formats, and offers https:// for an address without one', () => {
        const found = issues({ code: 'a', endpoint: 'hooks.example.org/x', retries: 1, owner: 'ada', steps: [{ run: 'x' }] })
        expect(found).toEqual([
            { at: '/endpoint', kind: 'format', tone: 'critical', fix: 'https://hooks.example.org/x' },
            { at: '/owner', kind: 'format', tone: 'critical', fix: undefined },
        ])
    })

    it('checks arrays, their items, and a nullable field in its anyOf form', () => {
        const found = issues({
            code: 'a',
            endpoint: 'https://a.example.org',
            retries: 1,
            tags: ['ok', 'x', 'ok', 'more'],
            note: 'too long',
            steps: [],
        })
        expect(found.map((issue) => `${issue.at} ${issue.kind}`).sort()).toEqual([
            '/note maxLength',
            '/steps minItems',
            '/tags maxItems',
            '/tags uniqueItems',
            '/tags/1 minLength',
        ])
        expect(issues({ code: 'a', endpoint: 'https://a.example.org', retries: 1, note: null, steps: [{ run: 'x' }] })).toEqual([])
    })

    it('warns, without stopping, on a deprecated field that is set', () => {
        expect(issues({ code: 'a', endpoint: 'https://a.example.org', retries: 1, legacy: true, steps: [{ run: 'x' }] })).toEqual([
            { at: '/legacy', kind: 'deprecated', tone: 'warning', fix: undefined },
        ])
    })
})

describe('a schema that cannot be compiled', () => {
    it('fails closed with one issue at the root', () => {
        const broken: JsonSchema = { type: 'object', properties: { code: { type: 'string', pattern: '[' } } }
        const found = validate(broken, { code: 'anything' })
        expect(found).toHaveLength(1)
        expect(found[0]).toMatchObject({ kind: 'unchecked', path: [], tone: 'critical' })
    })
})

describe('fieldSchema', () => {
    it('reads a nullable anyOf as its one real type', () => {
        expect(fieldSchema({ title: 'Note', anyOf: [{ type: 'string' }, { type: 'null' }] }, {})).toEqual({ type: 'string', title: 'Note' })
    })
})

describe('pointer', () => {
    it('escapes as JSON Pointer does', () => {
        expect(pointer(['a/b', 0, 'c~d'])).toBe('/a~1b/0/c~0d')
    })
})

const DOCUMENT: JsonSchema = {
    oneOf: [{ $ref: '#/$defs/Pipeline' }, { $ref: '#/$defs/Triggers' }],
    $defs: {
        Pipeline: {
            type: 'object',
            required: ['kind', 'steps'],
            additionalProperties: false,
            properties: {
                kind: { const: 'pipeline' },
                params: { type: 'object' },
                steps: { type: 'array', items: { $ref: '#/$defs/Step' } },
            },
        },
        Triggers: {
            type: 'object',
            required: ['kind', 'triggers'],
            additionalProperties: false,
            properties: {
                kind: { const: 'triggers' },
                triggers: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['job', 'at'],
                        properties: { job: { type: 'string' }, at: { type: 'string', pattern: '^\\d{2}:\\d{2}$' } },
                    },
                },
            },
        },
        Step: {
            type: 'object',
            required: ['name', 'block'],
            properties: { name: { type: 'string' }, block: { type: 'string' }, config: { type: 'object' } },
            allOf: [
                {
                    if: { properties: { block: { const: 'http.request' } } },
                    // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
                    then: { properties: { config: { $ref: '#/$defs/HttpRequest' } } },
                },
                {
                    if: { properties: { block: { const: 'send-digest' } } },
                    // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
                    then: { properties: { config: { $ref: '#/$defs/SendDigest' } } },
                },
            ],
        },
        HttpRequest: {
            type: 'object',
            required: ['url'],
            additionalProperties: false,
            properties: { url: { type: 'string', format: 'uri' }, follow_redirects: { type: 'boolean' } },
        },
        SendDigest: { type: 'object', additionalProperties: false, properties: { to: { type: 'string' } } },
    },
}

const found = (schema: JsonSchema, value: unknown) =>
    validate(schema, value)
        .map((issue) => `${pointer(issue.path)} ${issue.kind}`)
        .sort()

describe('a schema with branches', () => {
    it('reports only the branch whose fixed kind the document has', () => {
        expect(
            found(DOCUMENT, {
                kind: 'pipeline',
                params: {},
                steps: [{ name: 'fetch', block: 'http.request', config: { url: 'https://api.example.org', follow_redirects: 3, nope: 1 } }],
            }),
        ).toEqual(['/steps/0/config additional', '/steps/0/config/follow_redirects type'])
    })

    it('reports the other document by its own kind', () => {
        expect(found(DOCUMENT, { kind: 'triggers', triggers: [{ job: 'nightly-export', at: '2am' }, { at: '03:00' }] })).toEqual([
            '/triggers/0/at pattern',
            '/triggers/1/job required',
        ])
    })

    it('passes a good document of either kind', () => {
        expect(found(DOCUMENT, { kind: 'triggers', triggers: [{ job: 'sync-inventory', at: '03:00' }] })).toEqual([])
        expect(found(DOCUMENT, { kind: 'pipeline', steps: [{ name: 'notify', block: 'send-digest', config: { to: 'ada' } }] })).toEqual([])
    })

    it('says which kinds there are when the document names none of them', () => {
        expect(validate(DOCUMENT, { kind: 'schedule', steps: [] })).toEqual([
            { kind: 'enum', values: ['pipeline', 'triggers'], path: ['kind'], tone: 'critical' },
        ])
    })

    it('reports the closest branch when the document has no kind', () => {
        expect(found(DOCUMENT, { steps: [] })).toEqual(['/kind required'])
    })

    it('narrows a branch inside a property, and prefers the branch of the value type', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                target: {
                    anyOf: [
                        { type: 'string' },
                        { type: 'object', required: ['host'], properties: { host: { type: 'string' }, port: { type: 'integer' } } },
                    ],
                },
            },
        }
        expect(found(schema, { target: { host: 'api.example.org', port: 'x' } })).toEqual(['/target/port type'])
    })
})

describe('formats', () => {
    it('passes over an unknown format in silence, and checks one once it is registered', () => {
        const schema: JsonSchema = { type: 'object', properties: { every: { type: 'string', format: 'humane-duration' } } }
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            expect(found(schema, { every: 'often' })).toEqual([])
            expect(warn.mock.calls.flat().some((said) => String(said).includes('unknown format'))).toBe(false)
        } finally {
            warn.mockRestore()
        }
        registerSchemaFormats({ 'humane-duration': /^\d+[smhd]$/, size: (value) => /^\d+[KMG]?B$/.test(value), 'storage-uri': true })
        expect(found(schema, { every: 'often' })).toEqual(['/every format'])
        expect(found(schema, { every: '5m' })).toEqual([])
        const sized: JsonSchema = {
            type: 'object',
            properties: { size: { type: 'string', format: 'size' }, at: { type: 'string', format: 'storage-uri' } },
        }
        expect(found(sized, { size: '12 parsecs', at: 'anything' })).toEqual(['/size format'])
    })
})
