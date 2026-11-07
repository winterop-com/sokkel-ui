import { describe, expect, it } from 'vitest'

import { byDay, calendarRange, dayOf, flows, nest, spread } from './shapes'

const ROWS = [
    { project: 'harbor', job: 'nightly-export', step: null, state: 'succeeded', rows: 100, day: '2026-10-02' },
    { project: 'harbor', job: 'nightly-export', step: 'upload', state: 'failed', rows: 0, day: '2026-10-02T23:10:00Z' },
    { project: 'harbor', job: 'send-digest', step: null, state: 'succeeded', rows: 20, day: '2026-10-05' },
    { project: 'juniper', job: 'sync-inventory', step: 'fetch', state: 'failed', rows: 0, day: '2026-11-01' },
    { project: 'juniper', job: 'sync-inventory', step: null, state: 'succeeded', rows: 60, day: 'not a day' },
    { project: 'juniper', job: '', step: null, state: 'skipped', rows: 0, day: '2026-11-01' },
]

describe('the shapes', () => {
    it('nests rows by a path, counting them, largest first', () => {
        expect(nest({ rows: ROWS, path: ['project', 'job'] })).toEqual([
            {
                name: 'harbor',
                value: 3,
                children: [
                    { name: 'nightly-export', value: 2 },
                    { name: 'send-digest', value: 1 },
                ],
            },
            { name: 'juniper', value: 3, children: [{ name: 'sync-inventory', value: 2 }] },
        ])
    })

    it('sizes nodes by the sum of a field, a row with an empty field stopping a level up', () => {
        const tree = nest({ rows: ROWS, path: ['project', 'job', 'state'], y: 'rows' })
        expect(tree.map((node) => [node.name, node.value])).toEqual([
            ['harbor', 120],
            ['juniper', 60],
        ])
        expect(tree[1].children).toEqual([
            {
                name: 'sync-inventory',
                value: 60,
                children: [
                    { name: 'succeeded', value: 60 },
                    { name: 'failed', value: 0 },
                ],
            },
        ])
    })

    it('counts the links between stages, skipping an empty one', () => {
        const flow = flows({ rows: ROWS, path: ['job', 'step', 'state'] })
        expect(flow.nodes.map((node) => [node.id, node.value])).toEqual([
            ['0:nightly-export', 2],
            ['0:send-digest', 1],
            ['0:sync-inventory', 2],
            ['1:upload', 1],
            ['1:fetch', 1],
            ['2:succeeded', 3],
            ['2:failed', 2],
            ['2:skipped', 1],
        ])
        expect(flow.links).toEqual([
            { source: '0:nightly-export', target: '2:succeeded', value: 1 },
            { source: '0:nightly-export', target: '1:upload', value: 1 },
            { source: '1:upload', target: '2:failed', value: 1 },
            { source: '0:send-digest', target: '2:succeeded', value: 1 },
            { source: '0:sync-inventory', target: '1:fetch', value: 1 },
            { source: '1:fetch', target: '2:failed', value: 1 },
            { source: '0:sync-inventory', target: '2:succeeded', value: 1 },
        ])
    })

    it('weighs links by a field and keeps the same label at two stages apart', () => {
        const rows = [
            { from: 'api', to: 'worker', rows: 5 },
            { from: 'worker', to: 'api', rows: 2 },
        ]
        const flow = flows({ rows, path: ['from', 'to'], y: 'rows', order: ['worker'] })
        expect(flow.nodes.map((node) => node.id)).toEqual(['0:worker', '0:api', '1:worker', '1:api'])
        expect(flow.links).toEqual([
            { source: '0:api', target: '1:worker', value: 5 },
            { source: '0:worker', target: '1:api', value: 2 },
        ])
    })

    it('reads days from dates and times', () => {
        expect(dayOf('2026-10-02T23:10:00Z')).toBe('2026-10-02')
        expect(dayOf(new Date(Date.UTC(2026, 9, 2)))).toBe('2026-10-02')
        expect(dayOf('Oct 2')).toBeNull()
    })

    it('spans whole months around the days', () => {
        expect(calendarRange(['2026-10-12', '2026-10-03'])).toEqual({ start: '2026-10-01', end: '2026-10-31', months: 1 })
        expect(calendarRange(['2026-02-10', '2026-11-30', 'later'])).toEqual({ start: '2026-02-01', end: '2026-11-30', months: 10 })
        expect(calendarRange(['2025-12-31', '2026-02-01'])).toEqual({ start: '2025-12-01', end: '2026-02-28', months: 3 })
        expect(calendarRange(['2028-02-02'])).toEqual({ start: '2028-02-01', end: '2028-02-29', months: 1 })
        expect(calendarRange([])).toBeNull()
    })

    it('combines each day, times folded into their day and rows without one left out', () => {
        expect(byDay({ rows: ROWS, x: 'day' })).toEqual([
            ['2026-10-02', 2],
            ['2026-10-05', 1],
            ['2026-11-01', 2],
        ])
        expect(byDay({ rows: ROWS, x: 'day', y: 'rows', aggregate: 'max' })).toEqual([
            ['2026-10-02', 100],
            ['2026-10-05', 20],
            ['2026-11-01', 0],
        ])
    })

    it('spreads each category from its 10th to its 90th percentile around the median', () => {
        const rows = Array.from({ length: 11 }, (_, index) => ({ day: index < 6 ? 'a' : 'b', wait: index * 10 }))
        expect(spread({ rows, x: 'day', y: 'wait' })).toEqual({
            categories: ['a', 'b'],
            series: [{ name: 'wait', low: [5, 64], middle: [25, 80], high: [45, 96] }],
        })
    })

    it('spreads between three fields per series', () => {
        const rows = [
            { day: 'a', job: 'x', low: 1, mid: 2, high: 3 },
            { day: 'a', job: 'x', low: 3, mid: 4, high: 5 },
            { day: 'b', job: 'y', low: 5, mid: 6, high: 9 },
        ]
        expect(spread({ rows, x: 'day', y: ['low', 'mid', 'high'], series: 'job' })).toEqual({
            categories: ['a', 'b'],
            series: [
                { name: 'x', low: [2, null], middle: [3, null], high: [4, null] },
                { name: 'y', low: [null, 5], middle: [null, 6], high: [null, 9] },
            ],
        })
    })
})
