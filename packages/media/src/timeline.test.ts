import { describe, expect, it } from 'vitest'

import { chapterIndex, chapterSpan } from './chapters'
import { chaptersAcrossFiles, fileAt, fileStarts, timelineDuration, timelinePosition } from './timeline'

/** Three files of ten minutes each, played end to end. */
const FILES = [600, 600, 600]

describe('several files as one timeline', () => {
    it('starts each file where the ones before it end', () => {
        expect(fileStarts(FILES)).toEqual([0, 600, 1200])
        expect(timelineDuration(FILES)).toBe(1800)
        expect(fileStarts([300, Number.NaN, 200])).toEqual([0, 300, 300])
    })

    it('finds the file a position falls in and the offset into it', () => {
        expect(fileAt(FILES, 0)).toEqual({ file: 0, offset: 0 })
        expect(fileAt(FILES, 300)).toEqual({ file: 0, offset: 300 })
        expect(fileAt(FILES, 700)).toEqual({ file: 1, offset: 100 })
        expect(fileAt(FILES, 1500)).toEqual({ file: 2, offset: 300 })
    })

    it('gives a boundary to the file it starts', () => {
        expect(fileAt(FILES, 600)).toEqual({ file: 1, offset: 0 })
        expect(fileAt(FILES, 1200)).toEqual({ file: 2, offset: 0 })
        expect(fileAt([600, 0, 600], 600)).toEqual({ file: 2, offset: 0 })
    })

    it('places the end, and past it, at the end of the last file, and before the start at the start', () => {
        expect(fileAt(FILES, 1800)).toEqual({ file: 2, offset: 600 })
        expect(fileAt(FILES, 9999)).toEqual({ file: 2, offset: 600 })
        expect(fileAt(FILES, -10)).toEqual({ file: 0, offset: 0 })
        expect(fileAt([], 100)).toEqual({ file: 0, offset: 0 })
    })

    it('reads a file and an offset back onto the whole', () => {
        expect(timelinePosition(FILES, 1, 100)).toBe(700)
        const { file, offset } = fileAt(FILES, 1234)
        expect(timelinePosition(FILES, file, offset)).toBe(1234)
        expect(timelinePosition(FILES, 9, 30)).toBe(30)
        expect(timelinePosition(FILES, 2, -5)).toBe(1200)
    })

    it('moves on to the next file where one ends', () => {
        const end = timelinePosition(FILES, 0, FILES[0])
        expect(fileAt(FILES, end)).toEqual({ file: 1, offset: 0 })
    })
})

describe('chapters across files', () => {
    /** Chapters on the whole: the second starts in the first file and ends in the second. */
    const STARTS = [0, 450, 1100, 1500]

    it('finds the chapter playing on either side of a file boundary', () => {
        expect(chapterIndex(STARTS, 590)).toBe(1)
        expect(chapterIndex(STARTS, 610)).toBe(1)
        expect(fileAt(FILES, STARTS[1])).toEqual({ file: 0, offset: 450 })
        expect(chapterSpan(STARTS, 1, timelineDuration(FILES))).toEqual({ start: 450, end: 1100 })
    })

    it('moves the chapters each file carries onto the whole', () => {
        const chapters = chaptersAcrossFiles(FILES, [
            [
                { title: 'One', start: 0 },
                { title: 'Two', start: 450 },
            ],
            undefined,
            [{ title: 'Three', start: 100 }],
        ])
        expect(chapters).toEqual([
            { title: 'One', start: 0 },
            { title: 'Two', start: 450 },
            { title: 'Three', start: 1300 },
        ])
    })
})
