// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { runningClocks } from '../hooks/use-clock'
import { Freshness, FRESHNESS_WORDS, freshnessOf, freshnessText, freshnessTick } from './Freshness'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const NOW = Date.UTC(2026, 10, 20, 14, 30)

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

describe('freshnessOf', () => {
    it('is live, recent, stale and lost as the reading ages past each threshold', () => {
        expect(freshnessOf(0)).toBe('live')
        expect(freshnessOf(4 * SECOND)).toBe('live')
        expect(freshnessOf(5 * SECOND)).toBe('recent')
        expect(freshnessOf(MINUTE)).toBe('stale')
        expect(freshnessOf(5 * MINUTE)).toBe('lost')
        expect(freshnessOf(null)).toBe('lost')
        expect(freshnessOf(30 * SECOND, { live: MINUTE, stale: 2 * MINUTE, lost: 3 * MINUTE })).toBe('live')
    })
})

describe('freshnessText', () => {
    it('says live, then the largest whole unit', () => {
        expect(freshnessText(2 * SECOND)).toBe('Live')
        expect(freshnessText(12 * SECOND)).toBe('12 s ago')
        expect(freshnessText(2 * MINUTE + 50 * SECOND)).toBe('2 min ago')
        expect(freshnessText(3 * 60 * MINUTE)).toBe('3 h ago')
        expect(freshnessText(50 * 60 * MINUTE)).toBe('2 d ago')
        expect(freshnessText(null)).toBe(FRESHNESS_WORDS.never)
    })

    it('reads the clock each second under a minute and less often after', () => {
        expect(freshnessTick(10 * SECOND)).toBe(SECOND)
        expect(freshnessTick(10 * MINUTE)).toBe(5 * SECOND)
        expect(freshnessTick(2 * 60 * MINUTE)).toBe(MINUTE)
    })
})

describe('Freshness', () => {
    it('marks its state and says its age against the given now', () => {
        const html = renderToStaticMarkup(<Freshness at={NOW - 9 * MINUTE} now={NOW} />)
        expect(html).toContain('data-state="lost"')
        expect(html).toContain('9 min ago')
        expect(html).toContain('text-warning-ink')
        expect(renderToStaticMarkup(<Freshness at={NOW - 2 * MINUTE} now={NOW} />)).toContain('text-faint')
    })

    it('runs one timer however many marks read the clock, and none once they are gone', () => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
        host = document.createElement('div')
        document.body.append(host)
        root = createRoot(host)
        const marks = Array.from({ length: 50 }, (_, index) => <Freshness key={index} at={NOW - index * 100} />)
        act(() => root?.render(<>{marks}</>))
        expect(runningClocks()).toBe(1)
        expect(host.textContent).toContain('Live')
        act(() => {
            vi.advanceTimersByTime(12 * SECOND)
        })
        expect(host.textContent).toContain('12 s ago')
        act(() => root?.render(<></>))
        expect(runningClocks()).toBe(0)
    })
})
