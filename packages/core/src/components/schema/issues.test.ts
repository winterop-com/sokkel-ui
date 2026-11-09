import { describe, expect, it } from 'vitest'

import { shiftKey, shiftRecord, shiftSet } from './issues'

const removing = (gone: number) => (at: number) => (at === gone ? null : at > gone ? at - 1 : at)

describe('marks kept by place', () => {
    it('follow their items when one is taken out', () => {
        const touched = new Set(['/steps/0/name', '/steps/1/name', '/steps/2/retries', '/code', '/stepsx/1'])
        expect([...shiftSet(touched, '/steps', removing(1))]).toEqual(['/steps/0/name', '/steps/1/retries', '/code', '/stepsx/1'])
        expect(shiftRecord({ '/steps/2': 'x', '/steps/0': 'y' }, '/steps', removing(0))).toEqual({ '/steps/1': 'x' })
    })

    it('follow an item that moves', () => {
        const up = (at: number) => (at === 2 ? 1 : at === 1 ? 2 : at)
        expect(shiftKey('/steps/2/name', '/steps', up)).toBe('/steps/1/name')
        expect(shiftKey('/steps/1', '/steps', up)).toBe('/steps/2')
        expect(shiftKey('/labels/1', '/steps', up)).toBe('/labels/1')
    })
})
