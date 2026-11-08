import { describe, expect, it } from 'vitest'

import { dictationMode, dictationProblem, dictationSupport, insertTranscript, recognitionText } from './use-dictation'

const BOTH = { recognition: true, recording: true }
const transcribe = async () => 'heard'

describe('dictationMode', () => {
    it('uses the recognition of the browser only when the app opts in and the browser has it', () => {
        expect(dictationMode({ recognition: true }, BOTH)).toBe('recognition')
        expect(dictationMode({ recognition: true }, { recognition: false, recording: true })).toBeNull()
        expect(dictationMode({ transcribe }, BOTH)).toBe('recording')
    })

    it('records for the transcriber of the app where the browser has no recognition', () => {
        expect(dictationMode({ recognition: true, transcribe }, { recognition: false, recording: true })).toBe('recording')
        expect(dictationMode({ recognition: true, transcribe }, BOTH)).toBe('recognition')
    })

    it('has nothing to dictate with when the app gives nothing, or the page cannot record', () => {
        expect(dictationMode({}, BOTH)).toBeNull()
        expect(dictationMode({ transcribe }, { recognition: true, recording: false })).toBeNull()
    })

    it('offers nothing outside a browser', () => {
        expect(dictationSupport()).toEqual({ recognition: false, recording: false })
    })
})

describe('insertTranscript', () => {
    it('appends to the end with a space between words', () => {
        expect(insertTranscript('Why did it fail', 'last night')).toEqual({ value: 'Why did it fail last night', caret: 26 })
        expect(insertTranscript('Why did it fail ', 'last night')).toEqual({ value: 'Why did it fail last night', caret: 26 })
        expect(insertTranscript('', '  Rerun the export  ')).toEqual({ value: 'Rerun the export', caret: 16 })
    })

    it('puts the text in at the caret, spaced from the words on both sides', () => {
        const put = insertTranscript('Rerun export', 'nightly-export', 6)
        expect(put.value).toBe('Rerun nightly-export export')
        expect(put.caret).toBe(20)
        expect(insertTranscript('Rerunexport', 'the', 5).value).toBe('Rerun the export')
    })

    it('keeps the caret within the text and changes nothing for silence', () => {
        expect(insertTranscript('abc', 'd', 99).value).toBe('abc d')
        expect(insertTranscript('abc', 'd', -4).value).toBe('d abc')
        expect(insertTranscript('abc', '   ', 1)).toEqual({ value: 'abc', caret: 1 })
    })
})

describe('dictationProblem', () => {
    it('tells a refused microphone from a missing one and from any other failure', () => {
        expect(dictationProblem(new DOMException('denied', 'NotAllowedError'))).toBe('refused')
        expect(dictationProblem('not-allowed')).toBe('refused')
        expect(dictationProblem(new DOMException('none', 'NotFoundError'))).toBe('missing')
        expect(dictationProblem('audio-capture')).toBe('missing')
        expect(dictationProblem(new Error('502 Bad Gateway'))).toBe('failed')
        expect(dictationProblem(undefined)).toBe('failed')
    })
})

describe('recognitionText', () => {
    it('joins the best guess of each result and evens out the spaces', () => {
        const results = [[{ transcript: 'rerun the' }, { transcript: 'rerun a' }], [{ transcript: '  nightly export ' }], []]
        expect(recognitionText(results)).toBe('rerun the nightly export')
    })
})
