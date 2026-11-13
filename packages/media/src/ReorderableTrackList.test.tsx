import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ReorderableTrackList } from './ReorderableTrackList'

describe('ReorderableTrackList', () => {
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
