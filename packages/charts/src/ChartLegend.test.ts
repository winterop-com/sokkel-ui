import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChartLegend, legendStats } from './ChartLegend'

describe('legendStats', () => {
    it('works out the min, max, mean and last value, leaving out gaps', () => {
        expect(legendStats([4, null, 2, 9, undefined, 5])).toEqual({ min: 2, max: 9, avg: 5, current: 5 })
    })

    it('has no figures for a series with no values', () => {
        expect(legendStats([null])).toEqual({ min: null, max: null, avg: null, current: null })
    })
})

describe('ChartLegend', () => {
    it('makes each toggle a finger tall below md', () => {
        const html = renderToStaticMarkup(
            createElement(ChartLegend, { items: [{ key: 'harbor', label: 'harbor', color: 'var(--chart-2)' }] }),
        )
        expect(html).toContain('max-md:h-finger')
    })
})
