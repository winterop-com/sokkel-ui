// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AlertTicker, alertTickerNext, alertTickerShown, type AlertTickerItem, type AlertTickerProps } from './AlertTicker'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const ITEMS: readonly AlertTickerItem[] = [
    { id: 'a', text: 'Weather warnings stopped answering', tone: 'critical', when: '14:21' },
    { id: 'b', text: 'Flights answers slowly', tone: 'warning' },
    { id: 'c', text: 'Vessels is back', tone: 'good' },
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
    host = undefined
    document.documentElement.removeAttribute('data-motion')
    vi.useRealTimers()
})

function draw(props: Partial<AlertTickerProps> = {}): HTMLElement {
    vi.useFakeTimers()
    const element = document.createElement('div')
    host = element
    document.body.append(element)
    root = createRoot(element)
    act(() => root?.render(<AlertTicker label="Alerts" items={ITEMS} {...props} />))
    return element
}

function pass(ms: number) {
    act(() => {
        vi.advanceTimersByTime(ms)
    })
}

describe('alertTickerShown and alertTickerNext', () => {
    it('show the index, the last item past the end, and none with no items', () => {
        expect(alertTickerShown(1, 3)).toBe(1)
        expect(alertTickerShown(7, 3)).toBe(2)
        expect(alertTickerShown(-2, 3)).toBe(0)
        expect(alertTickerShown(0, 0)).toBe(-1)
    })

    it('move to the next and start over after the last', () => {
        expect(alertTickerNext(0, 3)).toBe(1)
        expect(alertTickerNext(2, 3)).toBe(0)
        expect(alertTickerNext(0, 1)).toBe(0)
        expect(alertTickerNext(0, 0)).toBe(-1)
    })
})

describe('AlertTicker', () => {
    it('shows the default index first, with its tone, its time and its place', () => {
        const html = renderToStaticMarkup(<AlertTicker label="Alerts" items={ITEMS} />)
        expect(html).toContain('aria-label="Alerts"')
        expect(html).toContain('Weather warnings stopped answering')
        expect(html).toContain('data-tone="critical"')
        expect(html).toContain('animate-live')
        expect(html).toContain('14:21')
        expect(html).toContain('1 of 3')
        expect(html).not.toContain('animate-in')
        expect(renderToStaticMarkup(<AlertTicker label="Alerts" items={ITEMS} defaultIndex={2} />)).toContain('Vessels is back')
    })

    it('says there are none, and says no place for one', () => {
        expect(renderToStaticMarkup(<AlertTicker label="Alerts" items={[]} />)).toContain('No alerts')
        expect(renderToStaticMarkup(<AlertTicker label="Alerts" items={ITEMS.slice(0, 1)} />)).not.toContain('alert-ticker-position')
    })

    it('moves to the next each interval, sliding it in, and starts over after the last', () => {
        const seen: number[] = []
        const element = draw({ interval: 1000, onIndexChange: (index) => seen.push(index) })
        expect(element.textContent).toContain('Weather warnings')
        pass(1000)
        expect(element.textContent).toContain('Flights answers slowly')
        expect(element.querySelector('[data-slot="alert-ticker-item"]')?.className).toContain('animate-in')
        pass(1000)
        pass(1000)
        expect(element.textContent).toContain('Weather warnings')
        expect(seen).toEqual([1, 2, 0])
    })

    it('holds still while paused, with one alert, and where motion is reduced', () => {
        const paused = draw({ interval: 1000, paused: true })
        pass(5000)
        expect(paused.textContent).toContain('Weather warnings')
        act(() => root?.unmount())
        const one = draw({ interval: 1000, items: ITEMS.slice(0, 1) })
        expect(vi.getTimerCount()).toBe(0)
        expect(one.textContent).toContain('Weather warnings')
        act(() => root?.unmount())
        document.documentElement.setAttribute('data-motion', 'off')
        const reduced = draw({ interval: 1000 })
        pass(5000)
        expect(reduced.textContent).toContain('Weather warnings')
    })

    it('shows the index it is given and asks for the next rather than moving', () => {
        const seen: number[] = []
        const element = draw({ interval: 1000, index: 1, onIndexChange: (index) => seen.push(index) })
        pass(1000)
        expect(element.textContent).toContain('Flights answers slowly')
        expect(seen).toEqual([2])
    })

    it('makes the alert shown a button that gives its id', () => {
        const chosen: string[] = []
        const element = draw({ paused: true, onSelect: (id) => chosen.push(id) })
        const button = element.querySelector('button')
        act(() => button?.click())
        expect(chosen).toEqual(['a'])
    })

    it('holds while its button has focus though the pointer has left, and moves on once neither holds it', () => {
        const element = draw({ interval: 1000, onSelect: () => undefined })
        const strip = element.querySelector('section')
        const over = (type: string) => act(() => void strip?.dispatchEvent(new MouseEvent(type, { bubbles: true })))
        over('pointerover')
        act(() => element.querySelector('button')?.focus())
        over('pointerout')
        pass(5000)
        expect(element.textContent).toContain(ITEMS[0].text as string)
        over('pointerover')
        act(() => element.querySelector('button')?.blur())
        pass(5000)
        expect(element.textContent).toContain(ITEMS[0].text as string)
        over('pointerout')
        pass(1000)
        expect(element.textContent).toContain(ITEMS[1].text as string)
    })
})
