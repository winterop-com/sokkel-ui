import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { VideoPlayer } from './VideoPlayer'

const CLIP = 'clip.webm'

describe('VideoPlayer and CORS', () => {
    it('hands `crossOrigin` to the video element, so tracks from another origin load', () => {
        expect(renderToStaticMarkup(<VideoPlayer src={CLIP} crossOrigin="anonymous" />)).toContain('crossorigin="anonymous"')
        expect(renderToStaticMarkup(<VideoPlayer src={CLIP} crossOrigin="use-credentials" />)).toContain('crossorigin="use-credentials"')
        expect(renderToStaticMarkup(<VideoPlayer src={CLIP} />)).not.toContain('crossorigin')
    })
})

describe('VideoPlayer with a cover', () => {
    it('draws the cover over the whole picture, the controls hidden and out of reach under it', () => {
        const html = renderToStaticMarkup(<VideoPlayer src={CLIP} defaultControlsVisible cover={<p>Up next</p>} />)
        expect(html).toContain('data-slot="video-cover"')
        expect(html).toContain('<p>Up next</p>')
        expect(html).toContain('data-controls="covered"')
        expect(html).toContain('inert=""')
    })

    it('draws no play button over the picture under a cover before the first play', () => {
        const bare = renderToStaticMarkup(<VideoPlayer src={CLIP} />)
        expect(bare.match(/aria-label="Play"/g)).toHaveLength(2)
        const covered = renderToStaticMarkup(<VideoPlayer src={CLIP} cover={<p>Up next</p>} />)
        expect(covered.match(/aria-label="Play"/g)).toHaveLength(1)
    })

    it('keeps the corner overlay over the cover', () => {
        const html = renderToStaticMarkup(<VideoPlayer src={CLIP} cover={<p>Up next</p>} overlay={<p>Stats</p>} />)
        expect(html.indexOf('<p>Stats</p>')).toBeGreaterThan(html.indexOf('<p>Up next</p>'))
    })

    it('without one, leaves the controls in reach', () => {
        for (const cover of [undefined, null, false]) {
            const html = renderToStaticMarkup(<VideoPlayer src={CLIP} defaultControlsVisible cover={cover} />)
            expect(html).not.toContain('data-slot="video-cover"')
            expect(html).not.toContain('inert')
            expect(html).toContain('data-controls="shown"')
        }
    })
})
