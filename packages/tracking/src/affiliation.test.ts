import { partMessageIds } from '@winterop-com/sokkel-ui/lib/catalog'
import { describe, expect, it } from 'vitest'

import {
    AFFILIATION_ORDER,
    AFFILIATION_TOKENS,
    compareAffiliation,
    groupByAffiliation,
    sortByAffiliation,
    TRACKING_PART,
    TRACKING_WORDS,
} from './affiliation'
import { TRACK_AFFILIATIONS, TRACK_KINDS, type Track } from './track'

const track = (id: string, affiliation: Track['affiliation']): Track => ({ id, lon: 0, lat: 0, affiliation, kind: 'vessel' })

describe('the words', () => {
    it('name every affiliation and every kind', () => {
        expect(Object.keys(TRACKING_WORDS.affiliations).sort()).toEqual([...TRACK_AFFILIATIONS].sort())
        expect(Object.keys(TRACKING_WORDS.kinds).sort()).toEqual([...TRACK_KINDS].sort())
    })

    it('are held under the message ids an app translates by', () => {
        const ids = partMessageIds(TRACKING_PART).map(([id]) => id)
        expect(ids).toContain('tracking.affiliations.hostile')
        expect(ids).toContain('tracking.kinds.aircraft')
        expect(ids).toHaveLength(TRACK_AFFILIATIONS.length + TRACK_KINDS.length)
    })
})

describe('the order', () => {
    it('puts the most pressing first', () => {
        expect(AFFILIATION_ORDER).toEqual(['hostile', 'unknown', 'pending', 'neutral', 'friend'])
        expect([...TRACK_AFFILIATIONS].sort(compareAffiliation)).toEqual(AFFILIATION_ORDER)
    })

    it('sorts tracks by it, keeping the order within an affiliation', () => {
        const tracks = [track('a', 'friend'), track('b', 'hostile'), track('c', 'friend'), track('d', 'unknown'), track('e', 'hostile')]
        expect(sortByAffiliation(tracks).map((one) => one.id)).toEqual(['b', 'e', 'd', 'a', 'c'])
        expect(tracks.map((one) => one.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('groups tracks by it, leaving out affiliations with none', () => {
        const groups = groupByAffiliation([track('a', 'neutral'), track('b', 'pending'), track('c', 'neutral')])
        expect(groups.map(([affiliation, members]) => [affiliation, members.map((one) => one.id)])).toEqual([
            ['pending', ['b']],
            ['neutral', ['a', 'c']],
        ])
        expect(groupByAffiliation([])).toEqual([])
    })
})

describe('the color tokens', () => {
    it('name one for every affiliation', () => {
        expect(AFFILIATION_TOKENS).toEqual({
            friend: 'track-friend',
            hostile: 'track-hostile',
            neutral: 'track-neutral',
            unknown: 'track-unknown',
            pending: 'track-pending',
        })
    })
})
