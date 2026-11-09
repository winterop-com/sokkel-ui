import type { VideoStats } from '@winterop-com/sokkel-ui/media/video-stats'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { VideoStatsOverlay, type VideoStatsRow } from './VideoStatsOverlay'

const READING: VideoStats = {
    resolution: { width: 1920, height: 1080 },
    bitrate: 4_200_000,
    bandwidth: 18_400_000,
    bufferAhead: 1.4,
    droppedFrames: 3,
    totalFrames: 1204,
    level: null,
    levels: null,
    engine: 'hls.js',
    live: false,
    playing: true,
    readyState: 4,
}

const SERVER: VideoStatsRow[] = [
    { label: 'Transcode', value: '0.92x realtime' },
    { label: 'Segments', value: '38 of 412' },
]

describe('VideoStatsOverlay with a headline', () => {
    it("says the verdict in the title's place, in its tone's ink", () => {
        const html = renderToStaticMarkup(<VideoStatsOverlay stats={READING} headline="Buffering often" tone="warning" />)
        expect(html).toContain('Buffering often')
        expect(html).toContain('text-terminal-warning')
        expect(html).not.toContain('<h2')
        expect(html).toContain('aria-label="Stats"')
    })

    it("inks good news and bad news, and plain news in the text's own", () => {
        expect(renderToStaticMarkup(<VideoStatsOverlay stats={READING} headline="Playing smoothly" tone="good" />)).toContain(
            'text-status-succeeded',
        )
        expect(renderToStaticMarkup(<VideoStatsOverlay stats={READING} headline="Stalled" tone="critical" />)).toContain(
            'text-terminal-critical',
        )
        const plain = renderToStaticMarkup(<VideoStatsOverlay stats={READING} headline="Paused" />)
        expect(plain).not.toMatch(/text-(status-succeeded|terminal-warning|terminal-critical)/)
    })

    it('without one, keeps its title', () => {
        expect(renderToStaticMarkup(<VideoStatsOverlay stats={READING} />)).toMatch(/<h2[^>]*>Stats<\/h2>/)
    })
})

describe("VideoStatsOverlay with the app's rows", () => {
    it("lists them after the player's own, in their order", () => {
        const html = renderToStaticMarkup(<VideoStatsOverlay stats={READING} rows={SERVER} />)
        const dropped = html.indexOf('Dropped frames')
        const transcode = html.indexOf('Transcode')
        expect(dropped).toBeGreaterThan(0)
        expect(transcode).toBeGreaterThan(dropped)
        expect(html.indexOf('Segments')).toBeGreaterThan(transcode)
        expect(html).toContain('title="0.92x realtime"')
    })

    it('shows them before the first reading, under the wait', () => {
        const html = renderToStaticMarkup(<VideoStatsOverlay stats={null} rows={SERVER} />)
        expect(html).toContain('Waiting for the player')
        expect(html).toContain('Transcode')
        expect(html).not.toContain('Dropped frames')
    })

    it('draws no list before the first reading when it has none', () => {
        expect(renderToStaticMarkup(<VideoStatsOverlay stats={null} />)).not.toContain('<dl')
    })
})
