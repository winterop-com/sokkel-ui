import { describe, expect, it } from 'vitest'

import { dataCell, dataColumns } from './data-columns'
import type { ChartSpec } from './kinds'

const RUNS = [
    { time: '00:00', job: 'nightly-export', runs: 1200, seconds: 3.25, host: 'api.example.org' },
    { time: '01:00', job: 'sync-inventory', runs: null, seconds: 4, host: 'api.example.org' },
]

const fields = (columns: ReturnType<typeof dataColumns>) => columns.map((column) => [column.field, column.header, column.numeric])

describe('dataColumns', () => {
    it('reads x, series and y from the spec, labels first and figures after', () => {
        const spec: ChartSpec = { rows: RUNS, x: 'time', y: 'runs', series: 'job', fieldNames: { runs: 'Runs' } }
        expect(fields(dataColumns('line', spec))).toEqual([
            ['time', 'time', false],
            ['job', 'job', false],
            ['runs', 'Runs', true],
        ])
    })

    it('gives each y field its own unit, in order', () => {
        const spec: ChartSpec = { rows: RUNS, x: 'time', y: ['runs', 'seconds'], unit: ['', ' s'] }
        const columns = dataColumns('bar', spec)
        expect(columns.map((column) => column.unit)).toEqual([0, 0, 1])
        expect(dataCell(columns[2], RUNS[0], spec)).toBe('3.25 s')
    })

    it("puts a fan's bands around its median in quantile order, history and points after, each field once", () => {
        const spec: ChartSpec = {
            rows: [],
            x: 'week',
            y: 'median',
            bands: [
                { low: 'q10', high: 'q90' },
                { low: 'q25', high: 'q75' },
            ],
            history: 'observed',
            points: 'observed',
        }
        expect(dataColumns('fan', spec).map((column) => column.field)).toEqual(['week', 'q10', 'q25', 'median', 'q75', 'q90', 'observed'])
    })

    it('orders any number of bands from the outermost low to the outermost high', () => {
        const spec: ChartSpec = {
            rows: [],
            x: 'week',
            series: 'project',
            y: 'q50',
            bands: [
                { low: 'q05', high: 'q95' },
                { low: 'q10', high: 'q90' },
                { low: 'q25', high: 'q75' },
            ],
        }
        expect(dataColumns('fan', spec).map((column) => column.field)).toEqual([
            'week',
            'project',
            'q05',
            'q10',
            'q25',
            'q50',
            'q75',
            'q90',
            'q95',
        ])
    })

    it('adds the fields of dataFields after the drawn ones, named through fieldNames and written as they are', () => {
        const spec: ChartSpec = {
            rows: RUNS,
            x: 'time',
            y: 'runs',
            format: (value) => value.toFixed(1),
            unit: ' runs',
            dataFields: ['host', 'seconds', 'runs', 'missing'],
            fieldNames: { host: 'Host' },
        }
        const columns = dataColumns('line', spec)
        expect(fields(columns)).toEqual([
            ['time', 'time', false],
            ['runs', 'runs', true],
            ['host', 'Host', false],
            ['seconds', 'seconds', true],
            ['missing', 'missing', false],
        ])
        expect(columns.slice(2).every((column) => column.plain)).toBe(true)
        expect(dataCell(columns[1], RUNS[0], spec)).toBe('1200.0 runs')
        expect(dataCell(columns[2], RUNS[0], spec)).toBe('api.example.org')
        expect(dataCell(columns[3], RUNS[0], spec)).toBe('3.25')
    })

    it('shows every field once where the spec draws none, dataFields among them', () => {
        expect(dataColumns('bar', { rows: RUNS, dataFields: ['host'] }).map((column) => column.field)).toEqual([
            'time',
            'job',
            'runs',
            'seconds',
            'host',
        ])
    })

    it("puts a grid's facet and a nesting path first", () => {
        const spec: ChartSpec = { rows: RUNS, path: ['host', 'job'], value: 'runs' }
        expect(dataColumns('treemap', spec, 'time').map((column) => column.field)).toEqual(['time', 'host', 'job', 'runs'])
    })

    it("takes a scatter's x as a figure", () => {
        expect(dataColumns('scatter', { rows: RUNS, x: 'seconds', y: 'runs' })[0].numeric).toBe(true)
    })

    it('shows every field of the rows where the spec names none', () => {
        expect(fields(dataColumns('bar', { rows: RUNS }))).toEqual([
            ['time', 'time', false],
            ['job', 'job', false],
            ['runs', 'runs', true],
            ['seconds', 'seconds', true],
            ['host', 'host', false],
        ])
    })
})

describe('dataCell', () => {
    const spec: ChartSpec = { rows: RUNS, x: 'time', y: 'runs' }
    const [time, runs] = dataColumns('line', spec)

    it('writes a figure as the chart does, with grouped thousands', () => {
        expect(dataCell(runs, RUNS[0], spec)).toBe('1,200')
    })

    it('writes a missing figure as a dash and a label as it is', () => {
        expect(dataCell(runs, RUNS[1], spec)).toBe('-')
        expect(dataCell(time, RUNS[1], spec)).toBe('01:00')
    })

    it("takes the spec's format and unit", () => {
        const formatted: ChartSpec = { ...spec, format: (value) => value.toFixed(1), unit: '%' }
        expect(dataCell(runs, RUNS[0], formatted)).toBe('1200.0%')
    })
})
