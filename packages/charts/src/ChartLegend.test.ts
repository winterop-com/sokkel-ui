import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { chartLegend, chartLegendItems } from './chart-legend'
import { ChartLegend, legendStats } from './ChartLegend'

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

/** The modules a file imports at once, leaving out types and what it loads on first use. */
const imported = (file: string) => [...source(file).matchAll(/^import (?!type )[^;]*?from '([^']+)'/gm)].map((match) => match[1])

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

    it('writes each entry its figure beside its label with figures', () => {
        const items = [
            { key: 'succeeded', label: 'succeeded', color: 'var(--status-succeeded)', values: [1203] },
            { key: 'failed', label: 'failed', color: 'var(--status-failed)', values: [17] },
        ]
        expect(renderToStaticMarkup(createElement(ChartLegend, { items }))).not.toContain('1,203')
        const html = renderToStaticMarkup(createElement(ChartLegend, { items, figures: true }))
        expect(html).toContain('>1,203<')
        expect(html).toContain('>17<')
    })

    it('loads the table only for table mode, so a list carries none of it', () => {
        expect(imported('ChartLegend.tsx')).not.toContain('@winterop-com/sokkel-ui/DataTable')
        expect(source('ChartLegend.tsx')).toContain("import('@winterop-com/sokkel-ui/DataTable')")
    })
})

describe('chartLegend', () => {
    it("names a kind's legend and imports none, every kind's legend loading from its own file", async () => {
        expect(imported('chart-legend.ts')).toEqual(['react', './kinds/legends'])
        expect(imported('kinds/legends.ts')).toEqual([])
        const spec = {
            rows: [
                { job: 'nightly-export', runs: 3 },
                { job: 'sync-inventory', runs: 2 },
            ],
            x: 'job',
            y: 'runs',
        }
        expect(chartLegend('pie', spec)).toEqual({ kind: 'pie', spec })
        expect((await chartLegendItems('pie', spec)).map((item) => [item.key, item.values])).toEqual([
            ['nightly-export', [3]],
            ['sync-inventory', [2]],
        ])
    })
})
