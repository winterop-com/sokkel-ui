import { describe, expect, it } from 'vitest'

import { isStatusColor, resolveStatus, RUN_STATUS_MAP, RUN_STATUSES, STATUS_CSS, type StatusMap } from './status'

const STATES: StatusMap = {
    draft: { color: 'neutral' },
    review: { label: 'in review', color: 'warning' },
    published: { color: 'good' },
    archived: { color: 'skipped' },
}

describe('resolveStatus', () => {
    it('knows every run state by its name, in its own color', () => {
        for (const status of RUN_STATUSES) expect(resolveStatus(status).color).toBe(status)
        expect(resolveStatus('completed_with_errors')).toMatchObject({ label: 'completed with errors', color: 'completed_with_errors' })
    })

    it("says an app's state in its words, or by its name, in its color", () => {
        expect(resolveStatus('review', STATES)).toMatchObject({ label: 'in review', color: 'warning' })
        expect(resolveStatus('published', STATES)).toMatchObject({ label: 'published', color: 'good' })
        expect(resolveStatus('archived', STATES)).toMatchObject({ label: 'archived', color: 'skipped' })
    })

    it("keeps the run states beside an app's own", () => {
        expect(resolveStatus('running', STATES)).toMatchObject({ label: 'running', color: 'running' })
    })

    it("takes an app's words and color for a run state it names", () => {
        expect(resolveStatus('failed', { failed: { label: 'feilet', color: 'critical' } })).toMatchObject({
            label: 'feilet',
            color: 'critical',
        })
    })

    it('draws a state no map knows neutral, said by its name', () => {
        expect(resolveStatus('on_hold', STATES)).toMatchObject({ label: 'on hold', color: 'neutral' })
    })

    it("never takes a state from a map's prototype", () => {
        expect(resolveStatus('constructor', STATES)).toMatchObject({ label: 'constructor', color: 'neutral' })
        expect(resolveStatus('toString')).toMatchObject({ label: 'toString', color: 'neutral' })
    })
})

describe('the status colors', () => {
    it('give every kind and every run state a CSS color', () => {
        for (const color of ['good', 'critical', 'warning', 'info', 'neutral', ...RUN_STATUSES]) expect(isStatusColor(color)).toBe(true)
        expect(isStatusColor('purple')).toBe(false)
        expect(isStatusColor('constructor')).toBe(false)
    })

    it('name a CSS color by its raw token, which exists whether or not a class uses it', () => {
        for (const css of Object.values(STATUS_CSS)) expect(css).toMatch(/^var\(--(?!color-)[a-z-]+\)$/)
    })

    it('know the run states in their own order', () => {
        expect(Object.keys(RUN_STATUS_MAP)).toEqual(RUN_STATUSES)
    })
})
