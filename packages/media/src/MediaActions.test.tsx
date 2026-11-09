import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChannelRow } from './ChannelRow'
import { MediaActions } from './MediaActions'

const rate = () => undefined

describe('MediaActions', () => {
    it('writes the like count short and marks the rating held', () => {
        const html = renderToStaticMarkup(<MediaActions rating="like" likes={4_102} onRatingChange={rate} />)
        expect(html).toContain('aria-label="Like: 4.1K"')
        expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Like: 4.1K"/)
        expect(html).toMatch(/aria-pressed="false"[^>]*aria-label="Dislike"/)
    })

    it('draws the like pair only when the app hears it', () => {
        expect(renderToStaticMarkup(<MediaActions likes={12} />)).not.toContain('Like')
    })

    it('draws each action in the row, pressed for a toggle that is on, and More only when it holds something', () => {
        const actions = [
            { id: 'share', label: 'Share' },
            { id: 'save', label: 'Saved', pressed: true },
        ]
        const html = renderToStaticMarkup(<MediaActions actions={actions} />)
        expect(html).toContain('>Share<')
        expect(html).toMatch(/aria-pressed="true"[^>]*>Saved</)
        // The ruler, out of sight, measures More too; only the one after the actions is drawn.
        expect(html.match(/aria-label="More"/g)).toHaveLength(1)
        expect(
            renderToStaticMarkup(<MediaActions actions={actions} menu={<span>Report</span>} />).match(/aria-label="More"/g),
        ).toHaveLength(2)
    })
})

describe('ChannelRow', () => {
    it('says the followers short, and Follow or Following with the state held', () => {
        const html = renderToStaticMarkup(<ChannelRow name="Harbor Workshop" followers={48_200} onFollowingChange={rate} />)
        expect(html).toContain('48.2K followers')
        expect(html).toMatch(/aria-pressed="false"[^>]*>Follow</)
        expect(renderToStaticMarkup(<ChannelRow name="Harbor Workshop" following onFollowingChange={rate} />)).toContain('Following')
    })

    it('links the picture and the name to the channel, and offers Follow only when the app hears it', () => {
        const html = renderToStaticMarkup(<ChannelRow name="Harbor Workshop" href="#/channel/harbor" />)
        expect(html).toContain('href="#/channel/harbor"')
        expect(html).not.toContain('Follow')
    })
})
