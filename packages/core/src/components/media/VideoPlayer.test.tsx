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

describe('VideoPlayer with renditions and the buttons of the app', () => {
    const qualities = [
        { value: 'auto', label: 'Auto', detail: '720p' },
        { value: '720', label: '720p' },
        { value: '360', label: '360p' },
    ]

    it('says the chosen rendition on the quality button, and the first while none is chosen', () => {
        const chosen = renderToStaticMarkup(<VideoPlayer src={CLIP} defaultControlsVisible qualities={qualities} quality="360" />)
        expect(chosen).toContain('aria-label="Quality: 360p"')
        const none = renderToStaticMarkup(<VideoPlayer src={CLIP} defaultControlsVisible qualities={qualities} />)
        expect(none).toContain('aria-label="Quality: Auto"')
    })

    it('offers no quality menu for one rendition or none', () => {
        expect(renderToStaticMarkup(<VideoPlayer src={CLIP} qualities={[qualities[0]]} />)).not.toContain('Quality:')
        expect(renderToStaticMarkup(<VideoPlayer src={CLIP} />)).not.toContain('Quality:')
    })

    it('draws the buttons of the app among the controls, before full screen', () => {
        const html = renderToStaticMarkup(
            <VideoPlayer src={CLIP} defaultControlsVisible actions={<button type="button">Theater</button>} />,
        )
        expect(html.indexOf('>Theater<')).toBeGreaterThan(0)
        expect(html.indexOf('>Theater<')).toBeLessThan(html.indexOf('aria-label="Fullscreen"'))
    })
})
