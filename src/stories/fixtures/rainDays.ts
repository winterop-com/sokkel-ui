/**
 * Rain and river flow at Tidevann's gauging sites, one row per region and day from June to October
 * 2026: the rain that fell, the river's flow, and the import runs the day's readings started.
 * Seeded, so every story draws the same.
 */

import { seeded } from './runRows'

export const RAIN_REGIONS = ['South Asia', 'Western Europe', 'East Africa'] as const

/** One region's day. */
export interface RainDay {
    [field: string]: unknown
    /** The day, `2026-06-01` to `2026-10-31`. */
    day: string
    /** The day as a label, `Jun 1`. */
    date: string
    region: (typeof RAIN_REGIONS)[number]
    /** The rain that fell, in millimeters. */
    rainfall: number
    /** The river's flow, in cubic meters a second. */
    flow: number
    /** The import runs the day's readings started. */
    runs: number
}

/**
 * Each region's season, June to October: the chance of rain on a day and a wet day's mean rainfall
 * in each month, and its river: the flow it never drops under, how much a millimeter of rain adds,
 * and the share of that a day later.
 */
const CLIMATE: Record<RainDay['region'], { wet: number[]; mean: number[]; base: number; gain: number; keep: number }> = {
    'South Asia': { wet: [0.55, 0.8, 0.78, 0.6, 0.3], mean: [14, 22, 20, 15, 9], base: 140, gain: 6, keep: 0.9 },
    'Western Europe': { wet: [0.4, 0.35, 0.38, 0.45, 0.55], mean: [5, 5, 6, 6, 8], base: 45, gain: 3, keep: 0.82 },
    'East Africa': { wet: [0.12, 0.08, 0.08, 0.15, 0.55], mean: [4, 3, 3, 5, 12], base: 12, gain: 2.5, keep: 0.85 },
}

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct']
const DAY = 86_400_000

/** The region days: a monsoon in South Asia, steady rain in Western Europe, and the short rains starting in East Africa in October. */
export const RAIN_DAYS: RainDay[] = (() => {
    const random = seeded(23)
    const held = new Map<string, number>()
    const rows: RainDay[] = []
    for (let time = Date.UTC(2026, 5, 1); time <= Date.UTC(2026, 9, 31); time += DAY) {
        const date = new Date(time)
        const month = date.getUTCMonth() - 5
        const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
        for (const region of RAIN_REGIONS) {
            const climate = CLIMATE[region]
            const wet = random() < climate.wet[month]
            const rainfall = wet ? Math.min(120, Math.round(-climate.mean[month] * Math.log(1 - random() * 0.98) * 10) / 10) : 0
            const store = (held.get(region) ?? 0) * climate.keep + rainfall * climate.gain
            held.set(region, store)
            rows.push({
                day: date.toISOString().slice(0, 10),
                date: `${MONTHS[month]} ${String(date.getUTCDate())}`,
                region,
                rainfall,
                flow: Math.round((climate.base + store) * (0.97 + random() * 0.06)),
                runs: 2 + Math.round(rainfall / 3) + (weekend ? 0 : 1) + Math.floor(random() * 2),
            })
        }
    }
    return rows
})()
