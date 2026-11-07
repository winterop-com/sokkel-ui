import { describe, expect, it } from 'vitest'

import { wordCount } from './AssistantReply'

describe('wordCount', () => {
    it('counts the words of markdown, its marks aside', () => {
        expect(wordCount('Start with the **latest** run, then its `log`.')).toBe(8)
    })

    it('counts nothing in an empty or blank text', () => {
        expect(wordCount('')).toBe(0)
        expect(wordCount('  \n - ** \n')).toBe(0)
    })
})
