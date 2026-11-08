import { describe, expect, it } from 'vitest'

import { chapterIndex, chapterSpan, nextChapterStart, previousChapterStart, waveformSpan } from './chapters'

const STARTS = [0, 600, 1500, 2400]

describe('chapters', () => {
    it('finds the chapter playing, and none before the first', () => {
        expect(chapterIndex(STARTS, 0)).toBe(0)
        expect(chapterIndex(STARTS, 599.9)).toBe(0)
        expect(chapterIndex(STARTS, 600)).toBe(1)
        expect(chapterIndex(STARTS, 9000)).toBe(3)
        expect(chapterIndex([30, 90], 10)).toBe(-1)
        expect(chapterIndex([], 10)).toBe(-1)
    })

    it('spans a chapter to the next start, the last to the end', () => {
        expect(chapterSpan(STARTS, 1, 3000)).toEqual({ start: 600, end: 1500 })
        expect(chapterSpan(STARTS, 3, 3000)).toEqual({ start: 2400, end: 3000 })
    })

    it('goes back to the chapter start, or to the one before within its first seconds', () => {
        expect(previousChapterStart(STARTS, 700)).toBe(600)
        expect(previousChapterStart(STARTS, 602)).toBe(0)
        expect(previousChapterStart(STARTS, 1)).toBe(0)
        expect(previousChapterStart([30, 90], 10)).toBe(0)
    })

    it('goes on to the next chapter, and nowhere from the last', () => {
        expect(nextChapterStart(STARTS, 700)).toBe(1500)
        expect(nextChapterStart(STARTS, 2500)).toBeUndefined()
        expect(nextChapterStart([30, 90], 10)).toBe(30)
    })

    it('cuts the waveform to the part a chapter covers', () => {
        const levels = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
        expect(waveformSpan(levels, 100, 20, 50)).toEqual([0.2, 0.3, 0.4])
        expect(waveformSpan(levels, 0, 20, 50)).toBe(levels)
    })
})
