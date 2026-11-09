/**
 * A made clip as the player's source: the element plays it from memory, and its stats say which
 * of the renditions plays, at the bitrate it came out at, over a link whose speed is simulated, as
 * a streaming engine would tell them.
 */

import type { VideoSource } from '@winterop-com/sokkel-ui/media/video-source'

import { RENDITIONS, type Clip } from '.'

/** What the simulated link carries, in bits per second, wandering slowly around 24 Mbps. */
function bandwidthAt(seconds: number): number {
    return Math.round(24_000_000 + 4_000_000 * Math.sin(seconds / 9) + 1_500_000 * Math.sin(seconds / 2.3))
}

export function clipSource(clip: Clip): VideoSource {
    const index = RENDITIONS.findIndex((one) => one.id === clip.rendition.id)
    return {
        id: clip.url,
        attach: (video) => {
            video.src = clip.url
            return () => {
                video.removeAttribute('src')
                video.load()
            }
        },
        stats: () => ({
            engine: 'Tidevann',
            bandwidth: bandwidthAt(performance.now() / 1000),
            // The renditions are listed best first, as an engine counts its levels from the lowest.
            level: {
                index: RENDITIONS.length - 1 - index,
                count: RENDITIONS.length,
                bitrate: clip.bitrate,
                width: clip.rendition.width,
                height: clip.rendition.height,
            },
            live: false,
        }),
    }
}
