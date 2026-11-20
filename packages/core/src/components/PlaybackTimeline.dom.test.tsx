// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PlaybackTimeline, scrubTime, stepTime } from './PlaybackTimeline'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NOW = Date.UTC(2026, 10, 20, 14, 30)
const FROM = NOW - 6 * HOUR

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
    vi.useRealTimers()
})

function draw(node: React.ReactNode): HTMLElement {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(node))
    return host
}

describe('scrubTime', () => {
    it('reads a time from a point, and returns to live at or near the live edge', () => {
        expect(scrubTime(300, 600, FROM, NOW, NOW)).toBe(FROM + 3 * HOUR)
        expect(scrubTime(0, 600, FROM, NOW, NOW)).toBe(FROM)
        expect(scrubTime(600, 600, FROM, NOW, NOW)).toBeNull()
        expect(scrubTime(595, 600, FROM, NOW, NOW)).toBeNull()
        expect(scrubTime(580, 600, FROM, NOW, NOW)).not.toBeNull()
    })
})

describe('stepTime', () => {
    it('steps back from live, and returns to live once it reaches the edge', () => {
        expect(stepTime(null, -MINUTE, FROM, NOW)).toBe(NOW - MINUTE)
        expect(stepTime(NOW - MINUTE, MINUTE, FROM, NOW)).toBeNull()
        expect(stepTime(FROM + MINUTE, -5 * MINUTE, FROM, NOW)).toBe(FROM)
    })
})

describe('PlaybackTimeline', () => {
    it('says Live while live, and the time once played back', () => {
        const live = draw(<PlaybackTimeline from={FROM} to={NOW} value={null} onValueChange={() => undefined} timeZone="UTC" />)
        expect(live.querySelector('[data-slot="playback-readout"]')?.textContent).toBe('Live')
        act(() =>
            root?.render(<PlaybackTimeline from={FROM} to={NOW} value={NOW - 2 * HOUR} onValueChange={() => undefined} timeZone="UTC" />),
        )
        expect(live.querySelector('[data-slot="playback-readout"]')?.textContent).toContain('12:30:00')
    })

    it('moves by the keys, End returning to live', () => {
        const heard: (number | null)[] = []
        const box = draw(<PlaybackTimeline from={FROM} to={NOW} value={NOW - HOUR} onValueChange={(value) => heard.push(value)} />)
        const head = box.querySelector<HTMLElement>('[role="slider"]')
        act(() => head?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
        act(() => head?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
        expect(heard).toEqual([NOW - HOUR - MINUTE, null])
    })

    it('plays at its rate and returns to live at the edge', () => {
        vi.useFakeTimers()
        const heard: (number | null)[] = []
        draw(
            <PlaybackTimeline
                from={FROM}
                to={NOW}
                value={NOW - 30_000}
                onValueChange={(value) => heard.push(value)}
                defaultPlaying
                rate={60}
            />,
        )
        act(() => {
            vi.advanceTimersByTime(250)
        })
        expect(heard).toEqual([NOW - 15_000])
    })

    it('draws its activity as one bar a bin', () => {
        const box = draw(<PlaybackTimeline from={FROM} to={NOW} value={null} onValueChange={() => undefined} activity={[1, 4, 2, 0]} />)
        expect(box.querySelectorAll('[data-slot="playback-strip"] rect')).toHaveLength(4)
    })
})
