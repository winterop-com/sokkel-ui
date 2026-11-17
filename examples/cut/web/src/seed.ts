/** The projects the demo starts with: three edits cut from the bin, one for each of Tidevann's projects. */

import { defaultTracks, type Clip, type Project } from './model'

const HOUR = 3_600_000
const DAY = 24 * HOUR

const clip = (id: string, track: string, start: number, duration: number, rest: Partial<Clip> = {}): Clip => ({
    id,
    track,
    start,
    duration,
    inPoint: 0,
    ...rest,
})

export function seedProjects(now = Date.now()): Project[] {
    return [
        {
            id: 'harbor',
            name: 'Harbor morning',
            owner: 'ada',
            created: now - 9 * DAY,
            updated: now - 2 * HOUR,
            tracks: defaultTracks(),
            clips: [
                clip('harbor-t1', 'T1', 0, 4, { text: 'Harbor morning' }),
                clip('harbor-t2', 'T1', 20, 3.5, { text: 'High water at 06:40' }),
                clip('harbor-v1', 'V1', 0, 8, { source: 'harbor-dawn', inPoint: 2 }),
                clip('harbor-v2', 'V1', 8, 6, { source: 'lighthouse', inPoint: 4 }),
                clip('harbor-v3', 'V1', 14, 6, { source: 'ferry-route', inPoint: 1 }),
                clip('harbor-v4', 'V1', 20, 6, { source: 'tide-chart', inPoint: 5 }),
                clip('harbor-a1', 'A1', 0, 26, { source: 'surf', inPoint: 0, volume: 0.8 }),
            ],
        },
        {
            id: 'juniper',
            name: 'Juniper field notes',
            owner: 'grace',
            created: now - 6 * DAY,
            updated: now - 1 * DAY,
            tracks: defaultTracks(),
            clips: [
                clip('juniper-t1', 'T1', 0.5, 3.5, { text: 'Field notes: the ridge' }),
                clip('juniper-v1', 'V1', 0, 7, { source: 'ridge-snow', inPoint: 3 }),
                clip('juniper-v2', 'V1', 7, 9, { source: 'wind-farm', inPoint: 2 }),
                clip('juniper-v3', 'V1', 16, 8, { source: 'aurora', inPoint: 6 }),
                clip('juniper-a1', 'A1', 0, 24, { source: 'high-wind', inPoint: 1, volume: 0.7 }),
            ],
        },
        {
            id: 'larkspur',
            name: 'Larkspur line',
            owner: 'linus',
            created: now - 4 * DAY,
            updated: now - 3 * DAY,
            tracks: defaultTracks(),
            clips: [
                clip('larkspur-t1', 'T1', 0, 3, { text: 'The Larkspur line' }),
                clip('larkspur-t2', 'T1', 13, 3, { text: 'Into the city' }),
                clip('larkspur-v1', 'V1', 0, 13, { source: 'coast-line', inPoint: 0 }),
                clip('larkspur-v2', 'V1', 13, 9, { source: 'city-rain', inPoint: 2 }),
                clip('larkspur-a1', 'A1', 0, 13, { source: 'rails', inPoint: 4, volume: 0.9 }),
                clip('larkspur-a2', 'A2', 12, 10, { source: 'roof-rain', inPoint: 0, volume: 0.6 }),
            ],
        },
    ]
}
