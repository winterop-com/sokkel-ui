import { describe, expect, it } from 'vitest'

import { ensure, partsLoaded } from './engine'

describe('the chart engine', () => {
    it('loads, once each, only the parts an option draws with', async () => {
        const before = partsLoaded()
        await ensure({ series: [{ type: 'bar', markLine: { data: [] } }], xAxis: {}, yAxis: {}, grid: {}, tooltip: {} })
        // The bar, its mark line and the grid, asked for three times; the tooltip comes with the engine.
        expect(partsLoaded() - before).toBe(3)
        await ensure({ series: [{ type: 'bar' }], xAxis: {}, yAxis: {} })
        expect(partsLoaded() - before).toBe(3)
    })
})
