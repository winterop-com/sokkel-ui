import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { WatchLayout } from './WatchLayout'

describe('WatchLayout', () => {
    it('draws the player, then what is under it, then the aside, so a narrow page reads them in that order', () => {
        const html = renderToStaticMarkup(
            <WatchLayout player={<p>Player</p>} aside={<p>Up next</p>}>
                <p>Title</p>
            </WatchLayout>,
        )
        expect(html.indexOf('Player')).toBeLessThan(html.indexOf('Title'))
        expect(html.indexOf('Title')).toBeLessThan(html.indexOf('Up next'))
        expect(html).toContain('<aside')
    })

    it('keeps the player in the same place in theater, so it is not mounted again', () => {
        const plain = renderToStaticMarkup(<WatchLayout player={<p>Player</p>} aside={<p>Up next</p>} />)
        const theater = renderToStaticMarkup(<WatchLayout theater player={<p>Player</p>} aside={<p>Up next</p>} />)
        const depth = (html: string) => html.slice(0, html.indexOf('<p>Player')).split('<div').length
        expect(depth(theater)).toBe(depth(plain))
    })

    it('draws no aside when there is none', () => {
        expect(renderToStaticMarkup(<WatchLayout player={<p>Player</p>} />)).not.toContain('<aside')
    })
})
