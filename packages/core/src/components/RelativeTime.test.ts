import { describe, expect, it } from 'vitest'

import { relativeTime, tickFor } from './RelativeTime'

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
