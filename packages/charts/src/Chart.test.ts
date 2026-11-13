import { describe, expect, it } from 'vitest'

import { sameSpec } from './Chart'

describe('sameSpec', () => {
    const rows = [{ month: 'Jan', value: 1 }]

    it('takes a spec whose lists and records are written anew with the same entries as the same', () => {
        expect(
            sameSpec(
                { rows, x: 'month', y: ['value'], fieldNames: { value: 'Value' } },
                { rows, x: 'month', y: ['value'], fieldNames: { value: 'Value' } },
            ),
        ).toBe(true)
    })

    it('tells a changed entry, a changed field and rows that are not the same list', () => {
        expect(sameSpec({ rows, fieldNames: { value: 'Value' } }, { rows, fieldNames: { value: 'Count' } })).toBe(false)
        expect(sameSpec({ rows, x: 'month' }, { rows, x: 'day' })).toBe(false)
        expect(sameSpec({ rows }, { rows: [...rows] })).toBe(false)
    })
})
