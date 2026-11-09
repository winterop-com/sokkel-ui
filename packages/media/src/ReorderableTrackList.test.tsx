import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { landingOf, ReorderableTrackList, shiftOf } from './ReorderableTrackList'

const ROWS = [0, 1, 2, 3].map((index) => ({ top: index * 40, height: 40 }))

describe('ReorderableTrackList', () => {
    it('lands a held row past the middles its own middle has passed', () => {
        expect(landingOf(ROWS, 0, 0)).toBe(0)
        expect(landingOf(ROWS, 0, 19)).toBe(0)
        expect(landingOf(ROWS, 0, 41)).toBe(1)
        expect(landingOf(ROWS, 0, 200)).toBe(3)
        expect(landingOf(ROWS, 3, -41)).toBe(2)
        expect(landingOf(ROWS, 3, -500)).toBe(0)
    })

    it('moves aside the rows between where the held row was and where it lands', () => {
        expect([0, 1, 2, 3].map((index) => shiftOf(index, 0, 2))).toEqual([0, -1, -1, 0])
        expect([0, 1, 2, 3].map((index) => shiftOf(index, 3, 1))).toEqual([0, 1, 1, 0])
        expect([0, 1, 2, 3].map((index) => shiftOf(index, 1, 1))).toEqual([0, 0, 0, 0])
    })

    it('ends each row in a grip named for its track, after its own actions', () => {
        const html = renderToStaticMarkup(
            <ReorderableTrackList
                tracks={[
                    { id: 'a', title: 'Low Tide', duration: 120 },
                    { id: 'b', title: 'Salt Air', duration: 140 },
                ]}
                onMove={() => undefined}
                actions={() => <span data-action="" />}
                words={{ move: (title) => `Drag ${title}` }}
            />,
        )
        expect(html).toContain('aria-label="Drag Low Tide"')
        expect(html).toContain('aria-label="Drag Salt Air"')
        expect(html.indexOf('data-action')).toBeLessThan(html.indexOf('Drag Low Tide'))
    })
})
