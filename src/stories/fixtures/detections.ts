import type { Detection, DetectionSample } from '@winterop-com/sokkel-ui/lib/detections'

/**
 * What a finder saw in `media/fixtures/street.webm`, a 12 second street drawn at 640 by 360: two
 * walkers crossing each other and a vehicle passing in front of them, sampled four times a second as
 * a detector would. The boxes follow the same motion the clip was drawn with, so they sit on what
 * they hold. The second walker is hidden behind the vehicle from 4.75 to 5.75 seconds, so the
 * finder loses it there and finds it again.
 */
const WIDTH = 640
const HEIGHT = 360
const STEP = 0.25

/** Samples every quarter second from `from` to `to`, leaving out the times `skip` says. */
function sampled(
    from: number,
    to: number,
    box: (t: number) => { x: number; y: number; w: number; h: number },
    skip: (t: number) => boolean = () => false,
): DetectionSample[] {
    const samples: DetectionSample[] = []
    for (let step = Math.round(from / STEP); step * STEP <= to; step += 1) {
        const t = step * STEP
        if (skip(t)) continue
        const { x, y, w, h } = box(t)
        samples.push({
            t,
            x: x / WIDTH,
            y: y / HEIGHT,
            w: w / WIDTH,
            h: h / HEIGHT,
            confidence: Math.round((0.93 - 0.08 * Math.abs(Math.sin(t * 1.7))) * 100) / 100,
        })
    }
    return samples
}

export const STREET_DETECTIONS: Detection[] = [
    { id: 'p-17', label: 'person', samples: sampled(0, 11.75, (t) => ({ x: 40 + 40 * t, y: 150, w: 26, h: 88 })) },
    {
        id: 'p-23',
        label: 'person',
        affiliation: 'unknown',
        samples: sampled(
            0,
            11.75,
            (t) => ({ x: 560 - 30 * t, y: 171, w: 24, h: 81 }),
            (t) => t > 4.6 && t < 5.9,
        ),
    },
    {
        id: 'v-4',
        label: 'vehicle',
        affiliation: 'neutral',
        samples: sampled(1.25, 7, (t) => ({ x: -110 + 90 * t, y: 228, w: 110, h: 56 })),
    },
]
