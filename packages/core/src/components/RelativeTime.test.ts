import { describe, expect, it } from 'vitest'

import { exactTime, relativeTime, tickFor } from './RelativeTime'

const NOW = new Date('2026-11-04T14:02:00Z')
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const at = (ms: number) => new Date(NOW.getTime() + ms)

describe('relativeTime', () => {
    it('says now under a minute either way', () => {
        expect(relativeTime(at(-20_000), NOW, { locale: 'en' })).toBe('now')
        expect(relativeTime(at(40_000), NOW, { locale: 'en' })).toBe('now')
    })

    it('takes the largest whole unit', () => {
        expect(relativeTime(at(-3 * MINUTE), NOW, { locale: 'en' })).toBe('3 minutes ago')
        expect(relativeTime(at(-59 * MINUTE), NOW, { locale: 'en' })).toBe('59 minutes ago')
        expect(relativeTime(at(-2 * HOUR), NOW, { locale: 'en' })).toBe('2 hours ago')
        expect(relativeTime(at(-4 * DAY), NOW, { locale: 'en' })).toBe('4 days ago')
        expect(relativeTime(at(-15 * DAY), NOW, { locale: 'en' })).toBe('2 weeks ago')
        expect(relativeTime(at(-70 * DAY), NOW, { locale: 'en' })).toBe('2 months ago')
        expect(relativeTime(at(-400 * DAY), NOW, { locale: 'en' })).toBe('last year')
    })

    it('says a day either way as yesterday and tomorrow', () => {
        expect(relativeTime(at(-DAY), NOW, { locale: 'en' })).toBe('yesterday')
        expect(relativeTime(at(DAY), NOW, { locale: 'en' })).toBe('tomorrow')
    })

    it('says a time ahead as ahead', () => {
        expect(relativeTime(at(45 * MINUTE), NOW, { locale: 'en' })).toBe('in 45 minutes')
    })

    it('takes the length and the locale', () => {
        expect(relativeTime(at(-3 * MINUTE), NOW, { locale: 'en', length: 'short' })).toBe('3 min. ago')
        expect(relativeTime(at(-2 * HOUR), NOW, { locale: 'de' })).toBe('vor 2 Stunden')
    })
})

describe('tickFor', () => {
    it('reads again more often the nearer the time is', () => {
        expect(tickFor(-3 * MINUTE)).toBe(15_000)
        expect(tickFor(-5 * HOUR)).toBe(MINUTE)
        expect(tickFor(3 * DAY)).toBe(HOUR)
    })
})

describe("an app's own conventions", () => {
    const own = {
        locale: 'en',
        length: 'narrow',
        numeric: 'always',
        rounding: 'round',
        nowWithin: 45_000,
        now: 'just now',
        horizon: 30 * DAY,
    } as const

    it('keeps to numbers and rounds to the nearest unit', () => {
        expect(relativeTime(at(-DAY), NOW, own)).not.toMatch(/yesterday/)
        expect(relativeTime(at(-90 * MINUTE), NOW, { locale: 'en', rounding: 'round' })).toBe('2 hours ago')
        expect(relativeTime(at(-89 * MINUTE), NOW, { locale: 'en' })).toBe('1 hour ago')
    })

    it('says its own word for now, within its own window', () => {
        expect(relativeTime(at(-44_000), NOW, own)).toBe('just now')
        expect(relativeTime(at(-46_000), NOW, own)).not.toBe('just now')
    })

    it('says the date past the horizon, spelled as asked', () => {
        const iso = (date: Date) => date.toISOString().slice(0, 10)
        expect(relativeTime(at(-70 * DAY), NOW, { ...own, horizonDate: iso })).toBe('2026-08-26')
        expect(relativeTime(at(-29 * DAY), NOW, { ...own, horizonDate: iso })).not.toBe('2026-10-06')
    })
})

describe('exactTime', () => {
    it("spells the instant with Intl options or the app's own function", () => {
        expect(exactTime(NOW, { locale: 'en', timeZone: 'UTC', exact: { year: 'numeric' } })).toBe('2026')
        const own = (date: Date) => `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`
        expect(exactTime(NOW, { exact: own })).toBe('2026-11-04 14:02:00 UTC')
    })
})
