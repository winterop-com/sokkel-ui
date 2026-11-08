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
