import { describe, expect, test } from 'vitest'

import { runLink } from './RunGraph'

const still = { handing: false, reduced: false }

describe('a run graph edge', () => {
    test('takes the hue its source settled in, and none from a source not yet ended', () => {
        expect(runLink('succeeded', 'succeeded', still).tint).toBe('succeeded')
        expect(runLink('failed', 'skipped', still).tint).toBe('failed')
        expect(runLink('running', 'queued', still).tint).toBeUndefined()
        expect(runLink('queued', 'queued', still).tint).toBeUndefined()
    })

    test('is dashed into a skipped step only, apart from its tone', () => {
        expect(runLink('failed', 'skipped', still)).toMatchObject({ dashed: true, tone: 'quiet' })
        expect(runLink('running', 'queued', still)).toMatchObject({ dashed: false, tone: 'quiet' })
    })

    test('flows from a step that produced into one running, and stands lit with motion reduced', () => {
        expect(runLink('succeeded', 'running', still).motion).toBe('flowing')
        expect(runLink('succeeded', 'running', { handing: false, reduced: true }).motion).toBe('lit')
        expect(runLink('succeeded', 'succeeded', still).motion).toBeUndefined()
        expect(runLink('failed', 'running', still).motion).toBeUndefined()
    })

    test('pulses once as its source hands over to a step still reading, and not with motion reduced', () => {
        expect(runLink('succeeded', 'queued', { handing: true, reduced: false }).motion).toBe('pulse')
        expect(runLink('succeeded', 'queued', { handing: true, reduced: true }).motion).toBeUndefined()
        expect(runLink('succeeded', 'skipped', { handing: true, reduced: false }).motion).toBeUndefined()
    })
})
