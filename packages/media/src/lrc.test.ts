import { describe, expect, it } from 'vitest'

import { lyricLineAt, parseLyrics } from './lrc'

const LRC = `[ti:Low Tide]
[ar:Ada]
[al:Harbor]
[length: 03:12]
[00:12.00]The water leaves the harbor wall
[00:17.5]and every boat lies down
[00:23.250][01:05.00]Low tide, low tide
[00:29.00]
[00:31.00]<00:31.00>we wait <00:32.10>for the turn`

describe('reading LRC', () => {
    it('times each line and keeps the tags', () => {
        const lyrics = parseLyrics(LRC)
        expect(lyrics.timed).toBe(true)
        expect(lyrics.tags).toEqual({ ti: 'Low Tide', ar: 'Ada', al: 'Harbor', length: '03:12' })
        expect(lyrics.lines[0]).toEqual({ text: 'The water leaves the harbor wall', time: 12 })
        expect(lyrics.lines[1].time).toBe(17.5)
        expect(lyrics.lines[2].time).toBe(23.25)
    })

    it('sings a line with several stamps at each, in the order sung', () => {
        const lines = parseLyrics(LRC).lines
        expect(lines.map((line) => line.time)).toEqual([12, 17.5, 23.25, 29, 31, 65])
        expect(lines[5].text).toBe('Low tide, low tide')
    })

    it('keeps a stamped blank line as a pause and drops the times of single words', () => {
        const lines = parseLyrics(LRC).lines
        expect(lines[3]).toEqual({ text: '', time: 29 })
        expect(lines[4].text).toBe('we wait for the turn')
    })

    it('reads a fraction as decimal, after a point or a colon', () => {
        const times = parseLyrics('[01:02.5]a\n[01:02.50]b\n[01:02:500]c\n[1:02]d').lines.map((line) => line.time)
        expect(times).toEqual([62, 62.5, 62.5, 62.5])
    })

    it('moves every line earlier by a positive offset, and later by a negative one', () => {
        expect(parseLyrics('[offset:+500]\n[00:10.00]a').lines[0].time).toBe(9.5)
        expect(parseLyrics('[offset:-250]\n[00:10.00]a').lines[0].time).toBe(10.25)
        expect(parseLyrics('[00:00.20]a\n[00:10.00]b\n[offset:1000]').lines[0].time).toBe(0)
    })

    it('keeps lines that share a moment in the order written', () => {
        expect(parseLyrics('[00:05.00]first\n[00:05.00]second').lines.map((line) => line.text)).toEqual(['first', 'second'])
    })
})

describe('untimed lyrics', () => {
    it('reads plain text as a page, one blank line between verses', () => {
        const lyrics = parseLyrics('\n\nOne\nTwo\n\n\n\nThree\n\n')
        expect(lyrics.timed).toBe(false)
        expect(lyrics.lines).toEqual([{ text: 'One' }, { text: 'Two' }, { text: '' }, { text: 'Three' }])
    })

    it('keeps a bracketed line that is no tag as words', () => {
        const lyrics = parseLyrics('[Chorus: Ada]\nLow tide')
        expect(lyrics.lines.map((line) => line.text)).toEqual(['[Chorus: Ada]', 'Low tide'])
        expect(lyrics.tags).toEqual({})
    })

    it('reads LRC whose stamps are all at zero as untimed, the stamps gone', () => {
        const lyrics = parseLyrics('[ar:Ada]\n[00:00.00]One\n[00:00.00]Two')
        expect(lyrics.timed).toBe(false)
        expect(lyrics.lines).toEqual([{ text: 'One' }, { text: 'Two' }])
    })

    it('has no lines in an empty text', () => {
        expect(parseLyrics('').lines).toEqual([])
        expect(parseLyrics('  \n ').timed).toBe(false)
    })
})

describe('the line being sung', () => {
    const lines = parseLyrics(LRC).lines

    it('is the last one started, and none before the first', () => {
        expect(lyricLineAt(lines, 0)).toBe(-1)
        expect(lyricLineAt(lines, 11.99)).toBe(-1)
        expect(lyricLineAt(lines, 12)).toBe(0)
        expect(lyricLineAt(lines, 20)).toBe(1)
        expect(lyricLineAt(lines, 64)).toBe(4)
        expect(lyricLineAt(lines, 600)).toBe(5)
    })

    it('is none on untimed lines', () => {
        expect(lyricLineAt([{ text: 'One' }, { text: 'Two' }], 30)).toBe(-1)
    })
})
