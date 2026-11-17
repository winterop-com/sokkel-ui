import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as React from 'react'

import { trackRange, trackTops, windowedTrackList } from './track-window'
import { TRACK_WINDOW_FROM, TrackList, type Track } from './TrackList'

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

    it('draws a long list in part, the current row always among the rows drawn once its window is here', () => {
        const many = Array.from({ length: TRACK_WINDOW_FROM + 300 }, (_, at) => ({
            id: `t${String(at)}`,
            title: `Song ${String(at)}`,
            duration: 180,
        }))
        const rows = (html: string) => html.match(/<li/g)?.length ?? 0
        // Before its window has loaded, as on the server, a long list draws its first rows.
        expect(rows(renderToStaticMarkup(<TrackList tracks={many} current="t450" />))).toBe(40)
        expect(rows(renderToStaticMarkup(<TrackList tracks={many.slice(0, TRACK_WINDOW_FROM)} />))).toBe(TRACK_WINDOW_FROM)
        const WindowedTrackList = windowedTrackList(React)
        const html = renderToStaticMarkup(
            <WindowedTrackList
                tracks={many}
                current="t450"
                onMeasured={() => undefined}
                rowAt={(index, Row) => <Row key={index} track={many[index]} index={index} />}
                headAt={() => null}
                Row={(props) => <li {...props} />}
                className=""
            />,
        )
        const drawn = [...html.matchAll(/data-track-index="(\d+)"/g)].map((match) => Number(match[1]))
        expect(drawn.length).toBeLessThan(60)
        expect(drawn).toContain(450)
    })
})
