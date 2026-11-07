import { describe, expect, it } from 'vitest'

import { thresholdBands } from './ThresholdLegend'

describe('thresholdBands', () => {
    const write = (value: number) => `${value}%`

    it('writes the first band as below the second, the last as and up, and the middle as a range', () => {
        const bands = thresholdBands([{ color: 'critical' }, { value: 90, color: 'warning' }, { value: 97, color: 'good' }], write)
        expect(bands).toEqual([
            { color: 'critical', range: 'Below 90%' },
            { color: 'warning', range: '90% to 97%' },
            { color: 'good', range: '97% and up' },
        ])
    })

    it('leaves a single band without a range', () => {
        expect(thresholdBands([{ color: 'chart-2' }], write)).toEqual([{ color: 'chart-2', range: '' }])
    })
})
