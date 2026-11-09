import { describe, expect, it } from 'vitest'

import { columnBands, columnName } from './table'

describe('columnBands', () => {
    it('runs neighbors with the same band together and leaves every unbanded column on its own', () => {
        const columns = [{}, { band: 'api' }, { band: 'api' }, { band: 'worker' }, {}, {}, { band: 'api' }]
        expect(columnBands(columns)).toEqual([
            { band: undefined, start: 0, span: 1 },
            { band: 'api', start: 1, span: 2 },
            { band: 'worker', start: 3, span: 1 },
            { band: undefined, start: 4, span: 1 },
            { band: undefined, start: 5, span: 1 },
            { band: 'api', start: 6, span: 1 },
        ])
    })
})

describe('columnName', () => {
    it('names a banded column by its band and its header', () => {
        expect(columnName({ header: 'failed', band: 'worker' })).toBe('worker · failed')
        expect(columnName({ header: 'Total' })).toBe('Total')
    })
})
