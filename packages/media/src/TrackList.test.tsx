import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TrackList, type Track } from './TrackList'

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
