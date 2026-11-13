import { describe, expect, it } from 'vitest'

import { insertItem, moveItem, stepTo } from './reorder'

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']

describe('moving an item in a list', () => {
    it('takes it out and puts it back at its new place, the rest closing up', () => {
        expect(moveItem(JOBS, 0, 2)).toEqual(['sync-inventory', 'rebuild-index', 'nightly-export', 'send-digest', 'import-orders'])
        expect(moveItem(JOBS, 4, 0)).toEqual(['import-orders', 'nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest'])
        expect(moveItem(JOBS, 1, 4)).toEqual(['nightly-export', 'rebuild-index', 'send-digest', 'import-orders', 'sync-inventory'])
    })

    it('leaves the list as it was for a move to its own place or out of range, without touching the list given', () => {
        expect(moveItem(JOBS, 2, 2)).toEqual(JOBS)
        expect(moveItem(JOBS, -1, 2)).toEqual(JOBS)
        expect(moveItem(JOBS, 1, 5)).toEqual(JOBS)
        expect(moveItem(JOBS, 0, 1)).not.toBe(JOBS)
        expect(JOBS[0]).toBe('nightly-export')
    })

    it('puts a new item in at a place held within the ends', () => {
        expect(insertItem(['fetch', 'upload'], 'validate', 1)).toEqual(['fetch', 'validate', 'upload'])
        expect(insertItem(['fetch'], 'notify', 9)).toEqual(['fetch', 'notify'])
        expect(insertItem(['fetch'], 'notify', -3)).toEqual(['notify', 'fetch'])
    })

    it('steps a place along a list, never off its ends', () => {
        expect(stepTo(0, 1, 3)).toBe(1)
        expect(stepTo(2, -1, 3)).toBe(1)
        expect(stepTo(0, -1, 3)).toBeUndefined()
        expect(stepTo(2, 1, 3)).toBeUndefined()
        expect(stepTo(1, 0, 3)).toBeUndefined()
    })
})
