// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PeriodSlider } from './PeriodSlider'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const PERIODS = [
    { id: '2026-01', label: 'January' },
    { id: '2026-02', label: 'February' },
    { id: '2026-03', label: 'March' },
]

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    vi.useRealTimers()
})

function mount(node: React.ReactNode) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(node))
    return host
}

const press = (element: HTMLElement, label: string) =>
    act(() => {
        element.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)?.click()
    })

describe('PeriodSlider', () => {
    it('steps on while its parent renders more often than the interval, with a new handler each time', () => {
        vi.useFakeTimers()
        const seen: string[] = []
        const draw = () => (
            <PeriodSlider label="Rainfall" periods={PERIODS} value="2026-01" interval={1200} onValueChange={(id) => seen.push(id)} />
        )
        const element = mount(draw())
        press(element, 'Play')
        for (let tick = 0; tick < 4; tick += 1) {
            act(() => vi.advanceTimersByTime(500))
            act(() => root?.render(draw()))
        }
        expect(seen).toEqual(['2026-02'])
    })

    it('offers no play with no periods to step through', () => {
        const onValueChange = vi.fn()
        const element = mount(<PeriodSlider label="Rainfall" periods={[]} value="" onValueChange={onValueChange} />)
        expect(element.querySelector<HTMLButtonElement>('[aria-label="Play"]')?.disabled).toBe(true)
        press(element, 'Play')
        expect(onValueChange).not.toHaveBeenCalled()
    })
})
