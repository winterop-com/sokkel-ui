// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { RelativeTime } from './RelativeTime'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    vi.useRealTimers()
})

describe('RelativeTime without a now', () => {
    it('shares one timer among every time that reads itself again as often, and stops it once none is drawn', () => {
        vi.useFakeTimers({ now: new Date('2026-11-04T14:02:00Z') })
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        const minutes = Array.from({ length: 50 }, (_, index) => new Date(Date.UTC(2026, 10, 4, 14, 1 - (index % 30))))
        act(() =>
            made.render(
                <>
                    {minutes.map((date, index) => (
                        <RelativeTime key={index} date={date} focusable={false} locale="en" />
                    ))}
                </>,
            ),
        )
        expect(vi.getTimerCount()).toBe(1)
        expect(host.textContent).toContain('1 minute ago')
        act(() => vi.advanceTimersByTime(60_000))
        expect(host.textContent).toContain('2 minutes ago')
        expect(vi.getTimerCount()).toBe(1)
        act(() => made.render(<></>))
        expect(vi.getTimerCount()).toBe(0)
    })
})
