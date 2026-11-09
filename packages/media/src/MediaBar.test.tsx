import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MediaBar, type MediaBarProps } from './MediaBar'

const BAR: MediaBarProps = {
    title: 'Northern Coast',
    artist: 'Ada',
    playing: false,
    onPlayingChange: () => undefined,
    position: 83,
    duration: 245,
    onSeek: () => undefined,
    volume: 0.7,
    onVolumeChange: () => undefined,
}

describe('MediaBar with a face', () => {
    it('draws the face in place of the words and the scrubber, keeping the transport', () => {
        for (const size of [undefined, 182]) {
            const html = renderToStaticMarkup(<MediaBar {...BAR} defaultSize={size} face={<span>Tidevann deck</span>} />)
            expect(html).toContain('data-slot="media-bar-face"')
            expect(html).toContain('Tidevann deck')
            expect(html).not.toContain('Northern Coast')
            expect(html).not.toContain('aria-label="Seek"')
            expect(html).toContain('aria-label="Play"')
        }
    })

    it('without one, says what plays over its scrubber', () => {
        for (const face of [undefined, null, false]) {
            const html = renderToStaticMarkup(<MediaBar {...BAR} face={face} />)
            expect(html).toContain('Northern Coast')
            expect(html).toContain('aria-label="Seek"')
        }
    })
})

describe('MediaBar at a starting height', () => {
    it('starts grown at `defaultSize`, and at a held `size` over it', () => {
        expect(renderToStaticMarkup(<MediaBar {...BAR} defaultSize={182} />)).toContain('data-size="grown"')
        expect(renderToStaticMarkup(<MediaBar {...BAR} />)).toContain('data-size="line"')
        const held = renderToStaticMarkup(<MediaBar {...BAR} defaultSize={64} size={240} onSizeChange={() => undefined} />)
        expect(held).toContain('height:240px')
    })
})

describe('MediaBar skips', () => {
    it('moves back and forward by one interval, written on both', () => {
        const html = renderToStaticMarkup(<MediaBar {...BAR} skip={15} />)
        expect(html).toContain('aria-label="Back 15 seconds"')
        expect(html).toContain('aria-label="Forward 15 seconds"')
    })

    it('moves each way by its own interval, each button saying and drawing its own', () => {
        const html = renderToStaticMarkup(<MediaBar {...BAR} skip={{ back: 15, forward: 30 }} />)
        expect(html).toContain('aria-label="Back 15 seconds"')
        expect(html).toContain('aria-label="Forward 30 seconds"')
        expect(html).toMatch(/>15<\/span>/)
        expect(html).toMatch(/>30<\/span>/)
    })
})
