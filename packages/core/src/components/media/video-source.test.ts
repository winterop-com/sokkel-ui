import { describe, expect, test } from 'vitest'

import { mediaError, nextTry, RETRY_DELAY } from './video-source'

describe("a media element's error", () => {
    test('reads its kind from the code', () => {
        expect(mediaError({ code: 2, message: 'net::ERR_CONNECTION_RESET' })).toEqual({
            kind: 'network',
            message: 'net::ERR_CONNECTION_RESET',
        })
        expect(mediaError({ code: 3, message: 'PIPELINE_ERROR_DECODE' })).toEqual({ kind: 'decode', message: 'PIPELINE_ERROR_DECODE' })
        expect(mediaError({ code: 4, message: 'Format error' })).toEqual({ kind: 'unsupported', message: 'Format error' })
    })

    test('is no error when the fetch was aborted or there is none', () => {
        expect(mediaError({ code: 1, message: '' })).toBeNull()
        expect(mediaError(null)).toBeNull()
    })

    test('names the code when the browser says nothing', () => {
        expect(mediaError({ code: 2, message: '' })?.message).toBe('MediaError 2')
    })
})

describe('the next try', () => {
    test('waits a second, then twice as long each time', () => {
        expect(nextTry('stalled', 0, 3)).toEqual({ delay: RETRY_DELAY })
        expect(nextTry('network', 1, 3)).toEqual({ delay: RETRY_DELAY * 2 })
        expect(nextTry('decode', 2, 3)).toEqual({ delay: RETRY_DELAY * 4 })
    })

    test('gives up once the tries are spent, or at once with none', () => {
        expect(nextTry('network', 3, 3)).toBeNull()
        expect(nextTry('stalled', 0, 0)).toBeNull()
    })

    test('gives up at once on media the browser cannot play', () => {
        expect(nextTry('unsupported', 0, 3)).toBeNull()
    })
})
