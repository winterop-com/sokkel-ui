import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TRACK_WINDOW_FROM, TrackList, trackRange, trackTops, type Track } from './TrackList'

const SET: Track[] = [
    { id: '1-1', number: 1, title: 'Low Water', duration: 214, disc: 1 },
    { id: '1-2', number: 2, title: 'Harbor Wall', duration: 247, disc: 1 },
    { id: '2-1', number: 1, title: 'Spring Tide', duration: 198, disc: 2 },
    { id: '2-2', number: 2, title: 'High Water', duration: 312, disc: 2 },
]

/** The heads a list draws, in order. */
const heads = (html: string) =>
    [...html.matchAll(/data-slot="track-list-disc"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/g)].map((match) => match[1])

describe('TrackList discs', () => {
    it('heads each disc of a set where its tracks begin', () => {
        expect(heads(renderToStaticMarkup(<TrackList tracks={SET} />))).toEqual(['Disc 1', 'Disc 2'])
    })

    it('draws no head for a list on one disc, numbered or not', () => {
        expect(heads(renderToStaticMarkup(<TrackList tracks={SET.slice(0, 2)} />))).toEqual([])
        const plain = SET.map((track) => ({ ...track, disc: undefined }))
        expect(heads(renderToStaticMarkup(<TrackList tracks={plain} />))).toEqual([])
    })

    it('counts a track without a disc as on the first, and says the head in the words given', () => {
        const mixed = [{ ...SET[0], disc: undefined }, ...SET.slice(2)]
        const html = renderToStaticMarkup(<TrackList tracks={mixed} words={{ disc: (disc) => `Side ${String(disc)}` }} />)
        expect(heads(html)).toEqual(['Side 1', 'Side 2'])
    })
})

describe('TrackList windowing', () => {
    it('places each row under the head of the disc it opens', () => {
        expect(trackTops([true, false, true, false], 48, 36)).toEqual({ tops: [0, 84, 132, 216], height: 264 })
    })

    it('draws the rows in view and a dozen either side', () => {
        const { tops } = trackTops(
            Array.from({ length: 1_000 }, () => false),
            50,
            0,
        )
        expect(trackRange(tops, 0, 400)).toEqual({ first: 0, last: 20 })
        expect(trackRange(tops, 10_000, 400)).toEqual({ first: 188, last: 220 })
        expect(trackRange(tops, -300, 400)).toEqual({ first: 0, last: 14 })
        expect(trackRange(tops, 49_900, 400)).toEqual({ first: 986, last: 1_000 })
    })

    it('draws a long list in part, the current row always among the rows drawn', () => {
        const many = Array.from({ length: TRACK_WINDOW_FROM + 300 }, (_, at) => ({
            id: `t${String(at)}`,
            title: `Song ${String(at)}`,
            duration: 180,
        }))
        const drawn = (html: string) => [...html.matchAll(/data-track-index="(\d+)"/g)].map((match) => Number(match[1]))
        const long = drawn(renderToStaticMarkup(<TrackList tracks={many} current="t450" />))
        expect(long.length).toBeLessThan(60)
        expect(long).toContain(450)
        expect(drawn(renderToStaticMarkup(<TrackList tracks={many.slice(0, TRACK_WINDOW_FROM)} />)).length).toBe(TRACK_WINDOW_FROM)
    })
})

describe('TrackList links', () => {
    it('makes a row given an address a link, its number the button that plays it', () => {
        const html = renderToStaticMarkup(
            <TrackList
                tracks={SET.slice(0, 2)}
                href={(track) => (track.id === '1-1' ? `#/songs/${track.id}` : undefined)}
                onPlay={() => undefined}
            />,
        )
        expect(html).toContain('href="#/songs/1-1"')
        expect(html.match(/<a /g)?.length).toBe(1)
        expect(html).toContain('aria-label="Play Low Water"')
        expect(html).toContain('aria-label="Play Harbor Wall"')
    })
})
