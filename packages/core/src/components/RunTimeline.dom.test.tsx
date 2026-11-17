// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { formatShift, RunTimeline, timelineTicks, type RunTimelineLane, type RunTimelineShift } from './RunTimeline'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = Date.UTC(2026, 10, 14, 12)

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
})

function draw(node: React.ReactNode): HTMLElement {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(node))
    return host
}

const LANES: RunTimelineLane[] = [
    {
        id: 'nightly-export',
        name: 'nightly-export',
        detail: 'Every day at 02:00',
        runs: [
            { id: 'a', at: NOW - DAY, status: 'succeeded' },
            { id: 'b', at: NOW - 2 * DAY, status: 'failed' },
            { id: 'c', at: NOW + DAY },
            { id: 'd', at: NOW + 2 * DAY },
        ],
    },
    { id: 'running', name: 'Concurrency', total: true, runs: [] },
]

describe('timelineTicks', () => {
    it('picks the finest step that fits the width, on the zone midnight', () => {
        const { step, ticks } = timelineTicks(NOW - 16 * DAY, NOW + 14 * DAY, 900, 'UTC')
        expect(step).toBe(3 * DAY)
        expect(ticks.every((at) => at % DAY === 0)).toBe(true)
    })

    it('lands day ticks on the zone midnight, not UTC', () => {
        const { ticks } = timelineTicks(NOW - 5 * DAY, NOW + 5 * DAY, 640, 'Europe/Oslo')
        expect(ticks.every((at) => (at + HOUR) % DAY === 0)).toBe(true)
    })

    it('uses hours for a day', () => {
        expect(timelineTicks(NOW - 12 * HOUR, NOW + 12 * HOUR, 640, 'UTC').step).toBe(3 * HOUR)
    })
})

describe('formatShift', () => {
    it('writes a shift short and signed', () => {
        expect(formatShift(2 * HOUR)).toBe('+2h')
        expect(formatShift(-(DAY + 6 * HOUR))).toBe('-1d 6h')
        expect(formatShift(45 * 60_000)).toBe('+45m')
        expect(formatShift(0)).toBe('+0m')
    })
})

describe('RunTimeline', () => {
    it('draws a lane per job, past runs filled and upcoming ones hollow, and a legend', () => {
        const page = draw(<RunTimeline lanes={LANES} from={NOW - 7 * DAY} to={NOW + 7 * DAY} now={NOW} timeZone="UTC" />)
        expect(page.querySelectorAll('[data-lane]')).toHaveLength(2)
        expect(page.querySelector<HTMLElement>('[data-run="a"]')?.style.backgroundColor).not.toBe('')
        expect(page.querySelector<HTMLElement>('[data-run="c"]')?.className).toContain('border')
        expect(page.textContent).toContain('Scheduled')
        expect(page.textContent).toContain('Now')
    })

    it('chooses a lane by its name, never the total', () => {
        const chosen: string[] = []
        const page = draw(
            <RunTimeline lanes={LANES} from={NOW - 7 * DAY} to={NOW + 7 * DAY} now={NOW} onSelect={(lane) => chosen.push(lane)} />,
        )
        const buttons = page.querySelectorAll('button')
        expect(buttons).toHaveLength(1)
        act(() => buttons[0].click())
        expect(chosen).toEqual(['nightly-export'])
    })

    it("shifts the chosen lane's upcoming runs with the arrows, never before now", () => {
        const heard: RunTimelineShift[] = []
        const page = draw(
            <RunTimeline
                lanes={LANES}
                from={NOW - 7 * DAY}
                to={NOW + 7 * DAY}
                now={NOW}
                selected="nightly-export"
                snap={HOUR}
                onShift={(shift) => heard.push(shift)}
            />,
        )
        const handle = page.querySelector<HTMLElement>('[data-shift-handle]')
        expect(handle).not.toBeNull()
        act(() => handle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
        act(() => handle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
        expect(heard).toEqual([
            { lane: 'nightly-export', by: HOUR },
            { lane: 'nightly-export', by: -HOUR },
        ])
        const far = draw(
            <RunTimeline
                lanes={[{ ...LANES[0], runs: [{ id: 'soon', at: NOW + 30 * 60_000 }] }]}
                from={NOW - DAY}
                to={NOW + DAY}
                now={NOW}
                selected="nightly-export"
                snap={HOUR}
                onShift={(shift) => heard.push(shift)}
            />,
        )
        act(() =>
            far.querySelector('[data-shift-handle]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
        )
        expect(heard).toHaveLength(2)
    })
})
