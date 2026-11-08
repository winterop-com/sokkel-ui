import { describe, expect, it } from 'vitest'

import { followTop } from './follow'

const VIEW = { top: 400, height: 300 }

describe('following a row', () => {
    it('leaves a row in view alone when only revealing it', () => {
        expect(followTop({ top: 450, height: 40 }, VIEW, 2000, 'reveal')).toBeUndefined()
        expect(followTop({ top: 660, height: 40 }, VIEW, 2000, 'reveal')).toBeUndefined()
    })

    it('centers a row out of view, or cut at an edge', () => {
        expect(followTop({ top: 1200, height: 40 }, VIEW, 2000, 'reveal')).toBe(1070)
        expect(followTop({ top: 680, height: 40 }, VIEW, 2000, 'reveal')).toBe(550)
        expect(followTop({ top: 100, height: 40 }, VIEW, 2000, 'reveal')).toBe(0)
    })

    it('always centers when told to, until it is centered', () => {
        expect(followTop({ top: 500, height: 40 }, VIEW, 2000, 'center')).toBe(370)
        expect(followTop({ top: 530, height: 40 }, VIEW, 2000, 'center')).toBeUndefined()
    })

    it('stops at the end of what scrolls', () => {
        expect(followTop({ top: 1980, height: 40 }, VIEW, 1700, 'center')).toBe(1700)
        expect(followTop({ top: 10, height: 40 }, { top: 0, height: 300 }, -5, 'center')).toBeUndefined()
    })
})
