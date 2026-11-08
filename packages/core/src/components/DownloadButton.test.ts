import { describe, expect, it } from 'vitest'

import { downloadShare } from './DownloadButton'

describe('downloadShare', () => {
    it('counts parts over the total', () => {
        expect(downloadShare({ count: 3, total: 12 })).toBe(0.25)
    })

    it('takes a share given, held between 0 and 1', () => {
        expect(downloadShare({ value: 0.4, count: 1, total: 2 })).toBe(0.4)
        expect(downloadShare({ value: 1.5 })).toBe(1)
    })

    it('is nothing without a total', () => {
        expect(downloadShare({ count: 3 })).toBe(0)
        expect(downloadShare({ count: 3, total: 0 })).toBe(0)
    })
})
