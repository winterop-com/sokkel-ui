import { describe, expect, test } from 'vitest'

import { constraints, resolve, typeLabel, type JsonSchema } from './read'

const ROOT: JsonSchema = {
    type: 'object',
    $defs: {
        Address: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
        'fetch.Payload': { description: 'Any JSON value.' },
        'fetch.Method': { enum: ['GET', 'POST'] },
        'fetch.Timeout': { type: 'integer' },
    },
}

describe("a schema's type in words", () => {
    test('says the format of a string and the items of an array', () => {
        expect(typeLabel({ type: 'string', format: 'email' }, ROOT)).toBe('string, email')
        expect(typeLabel({ type: 'array', items: { type: 'integer' } }, ROOT)).toBe('array of integer')
        expect(typeLabel({ type: 'array', items: { $ref: '#/$defs/Address' } }, ROOT)).toBe('array of Address')
    })

    test('says nullable, choices and constants plainly', () => {
        expect(typeLabel({ type: ['integer', 'null'] }, ROOT)).toBe('integer or null')
        expect(typeLabel({ oneOf: [{ type: 'string' }, { type: 'number' }] }, ROOT)).toBe('string or number')
        expect(typeLabel({ anyOf: [{ type: 'integer' }, { type: 'null' }] }, ROOT)).toBe('integer or null')
        const five = [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array' }, { type: 'object' }]
        expect(typeLabel({ anyOf: five }, ROOT)).toBe('any of 5')
        expect(typeLabel({ enum: ['a', 'b'] }, ROOT)).toBe('one of the values')
        expect(typeLabel({ const: 'v1' }, ROOT)).toBe('constant')
    })

    test('follows a $ref for its type and never says a $defs key in place of one', () => {
        const value = { $ref: '#/$defs/fetch.Payload' }
        expect(typeLabel(value, ROOT)).toBe('any')
        expect(typeLabel({ anyOf: [value, { type: 'null' }] }, ROOT)).toBe('any or null')
        expect(typeLabel({ type: 'array', items: value }, ROOT)).toBe('array of any')
        expect(typeLabel({ anyOf: [{ $ref: '#/$defs/fetch.Timeout' }, { type: 'null' }] }, ROOT)).toBe('integer or null')
        expect(typeLabel({ $ref: '#/$defs/fetch.Method' }, ROOT)).toBe('one of the values')
    })
})

describe('the rules on a value', () => {
    test('read as short phrases', () => {
        expect(constraints({ minimum: 1, maximum: 3600 })).toEqual(['1 to 3600'])
        expect(constraints({ maxLength: 64, pattern: '^[a-z]' })).toEqual(['up to 64 characters', 'matches ^[a-z]'])
        expect(constraints({ additionalProperties: false })).toEqual(['no other fields'])
        expect(constraints({ minLength: 2, maxLength: 2 })).toEqual(['exactly 2 characters'])
        expect(constraints({ minItems: 1 })).toEqual(['at least 1 item'])
    })
})

describe('references', () => {
    test('follow a local $ref and merge allOf', () => {
        expect(resolve({ $ref: '#/$defs/Address' }, ROOT).required).toEqual(['city'])
        const merged = resolve(
            { allOf: [{ properties: { a: { type: 'string' } }, required: ['a'] }, { properties: { b: { type: 'number' } } }] },
            ROOT,
        )
        expect(Object.keys(merged.properties ?? {})).toEqual(['a', 'b'])
        expect(merged.required).toEqual(['a'])
    })
})
