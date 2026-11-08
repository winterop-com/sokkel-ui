import { describe, expect, it } from 'vitest'

import { insertMention, matchPeople, mentionQuery, mentionsIn, type MentionPerson } from './mentions'

const PEOPLE: MentionPerson[] = [
    { id: 'u-ada', name: 'Ada Berg', handle: 'ada' },
    { id: 'u-grace', name: 'Grace Holm', handle: 'grace' },
    { id: 'u-linus', name: 'Linus Dahl', handle: 'linus' },
    { id: 'margaret', name: 'Margaret Lund' },
]

describe('mentionQuery', () => {
    it('reads the handle typed after an @ up to the caret', () => {
        expect(mentionQuery('Ask @gr', 7)).toEqual({ start: 4, query: 'gr' })
        expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' })
        expect(mentionQuery('(@ada', 5)).toEqual({ start: 1, query: 'ada' })
    })

    it('reads only up to the caret', () => {
        expect(mentionQuery('Ask @grace now', 7)).toEqual({ start: 4, query: 'gr' })
    })

    it('starts none inside a word or an address', () => {
        expect(mentionQuery('ada@example.org', 15)).toBeNull()
        expect(mentionQuery('send@', 5)).toBeNull()
    })

    it('ends at a space', () => {
        expect(mentionQuery('Ask @grace now', 14)).toBeNull()
        expect(mentionQuery('Ask @grace ', 11)).toBeNull()
    })

    it('gives up on a run too long to be a handle', () => {
        expect(mentionQuery(`@${'a'.repeat(60)}`, 61)).toBeNull()
    })
})

describe('insertMention', () => {
    it('puts the handle in with a space after it, and the caret after the space', () => {
        expect(insertMention('Ask @gr', 4, 7, 'grace')).toEqual({ value: 'Ask @grace ', caret: 11 })
    })

    it('replaces a handle the caret stands inside, and keeps a space that follows', () => {
        expect(insertMention('Ask @grac about it', 4, 7, 'grace')).toEqual({ value: 'Ask @grace about it', caret: 11 })
    })

    it('adds a space before text that follows at once', () => {
        expect(insertMention('@,', 0, 1, 'ada')).toEqual({ value: '@ada ,', caret: 5 })
    })
})

describe('mentionsIn', () => {
    it('gives the ids mentioned, each once, in the order first mentioned', () => {
        expect(mentionsIn('@grace can you and @ada look? Thanks @grace.', PEOPLE)).toEqual(['u-grace', 'u-ada'])
    })

    it('reads a person without a handle by their id', () => {
        expect(mentionsIn('cc @margaret', PEOPLE)).toEqual(['margaret'])
    })

    it('reads a handle whatever its case, and not an address or an unknown handle', () => {
        expect(mentionsIn('@Linus, write to ada@example.org or @nobody', PEOPLE)).toEqual(['u-linus'])
    })

    it('does not read a handle that only starts like one', () => {
        expect(mentionsIn('@adam', PEOPLE)).toEqual([])
    })
})

describe('matchPeople', () => {
    it('ranks a start of a handle or name before a later word, and that before a part', () => {
        const people: MentionPerson[] = [
            { id: '1', name: 'Ada Grace', handle: 'ada' },
            { id: '2', name: 'Grace Holm', handle: 'grace' },
            { id: '3', name: 'Ragna Lund', handle: 'ragna' },
        ]
        expect(matchPeople(people, 'gra').map((person) => person.id)).toEqual(['2', '1'])
        expect(matchPeople(people, 'ra').map((person) => person.id)).toEqual(['3', '1', '2'])
    })

    it('gives everyone up to the limit for an empty query', () => {
        expect(matchPeople(PEOPLE, '', 2).map((person) => person.id)).toEqual(['u-ada', 'u-grace'])
    })

    it('gives no one for a query nobody matches', () => {
        expect(matchPeople(PEOPLE, 'zz')).toEqual([])
    })
})
