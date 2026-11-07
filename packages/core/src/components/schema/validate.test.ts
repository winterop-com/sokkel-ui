import { describe, expect, it } from 'vitest'

import type { JsonSchema } from './read'
import { fieldSchema, pointer, validate } from './validate'

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
