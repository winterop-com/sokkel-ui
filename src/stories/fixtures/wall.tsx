import { Activity, CloudLightning, Plane, Satellite, Ship, Waves } from 'lucide-react'
import type { ReactNode } from 'react'

import type { AlertTickerItem } from '@winterop-com/sokkel-ui/AlertTicker'
import type { WallStatus } from '@winterop-com/sokkel-ui/StatusWall'
import { WATCH_NOW } from './watch'

/** The moment Tidevann's wall is drawn at, the harbor watch's own. */
export const WALL_NOW = WATCH_NOW

/** One source of the wall as a tile shows it. */
export interface WallSource {
    id: string
    name: string
    /** What kind of source it is, over its name. */
    kind: string
    icon: ReactNode
    status: WallStatus
    /** Its latest latency in milliseconds; none while it does not answer. */
    latency?: number
    detail?: string
    /** Its latency over the last readings, oldest first. */
    series?: readonly number[]
    /** Milliseconds before the wall's now it last answered; null when it never has. */
    lag: number | null
    simulated?: boolean
}

/** The feeds and services on Tidevann's wall: most up, one slow, one gone, one not heard from yet. */
export const WALL_SOURCES: readonly WallSource[] = [
    {
        id: 'earthquakes',
        name: 'Earthquakes',
        kind: 'Feed',
        icon: <Activity aria-hidden />,
        status: 'up',
        latency: 182,
        detail: '14 events in the last hour',
        series: [190, 176, 204, 181, 172, 188, 195, 179, 184, 170, 191, 182],
        lag: 2_000,
    },
    {
        id: 'vessels',
        name: 'Vessels',
        kind: 'Feed',
        icon: <Ship aria-hidden />,
        status: 'up',
        latency: 96,
        detail: '312 vessels in view',
        series: [88, 92, 101, 97, 90, 94, 99, 103, 95, 91, 98, 96],
        lag: 1_000,
        simulated: true,
    },
    {
        id: 'flights',
        name: 'Flights',
        kind: 'Feed',
        icon: <Plane aria-hidden />,
        status: 'degraded',
        latency: 1_240,
        detail: 'Slow answers since 14:12',
        series: [210, 224, 218, 240, 390, 620, 810, 990, 1_180, 1_090, 1_310, 1_240],
        lag: 48_000,
    },
    {
        id: 'satellites',
        name: 'Satellites',
        kind: 'Feed',
        icon: <Satellite aria-hidden />,
        status: 'up',
        latency: 340,
        detail: '58 passes today',
        series: [320, 335, 362, 348, 330, 341, 356, 338, 329, 344, 351, 340],
        lag: 4_000,
        simulated: true,
    },
    {
        id: 'weather',
        name: 'Weather warnings',
        kind: 'Feed',
        icon: <CloudLightning aria-hidden />,
        status: 'down',
        detail: 'No answer from feeds.example.org',
        series: [410, 432, 398, 455, 470, 620, 900, 1_400, 2_800, 5_000, 5_000, 5_000],
        lag: 540_000,
    },
    {
        id: 'tides',
        name: 'Tide gauges',
        kind: 'Feed',
        icon: <Waves aria-hidden />,
        status: 'unknown',
        detail: 'Not checked yet',
        lag: null,
    },
    {
        id: 'api',
        name: 'api',
        kind: 'Service',
        icon: undefined,
        status: 'up',
        latency: 41,
        detail: 'api.example.org',
        series: [38, 44, 40, 39, 47, 42, 36, 41, 45, 40, 43, 41],
        lag: 1_000,
    },
    {
        id: 'worker',
        name: 'worker',
        kind: 'Service',
        icon: undefined,
        status: 'up',
        latency: 67,
        detail: '3 jobs running',
        series: [70, 64, 72, 69, 61, 66, 74, 68, 63, 71, 65, 67],
        lag: 3_000,
    },
]

/** The wall's latest alerts, the latest first. */
export const WALL_ALERTS: readonly AlertTickerItem[] = [
    { id: 'weather-down', tone: 'critical', text: 'Weather warnings stopped answering at feeds.example.org', when: '14:21' },
    { id: 'flights-slow', tone: 'warning', text: 'Flights answers in 1.2 s, six times its usual', when: '14:12' },
    { id: 'quake', tone: 'info', text: 'Magnitude 5.8 earthquake, 40 km off the coast of Iceland', when: '14:05' },
    { id: 'vessels-back', tone: 'good', text: 'Vessels is back after 4 minutes', when: '13:48' },
    { id: 'export', tone: 'quiet', text: 'nightly-export finished in 3 min 12 s', when: '13:30' },
]
