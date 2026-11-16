// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ScrollingWaveform } from './waveform'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined
let frames: FrameRequestCallback[] = []

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    const context = new Proxy(
        {},
        { get: (_, name) => (name === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => undefined) },
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
    document.documentElement.removeAttribute('data-motion')
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

function mount(element: React.ReactElement) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(element))
    return host
}

/** Runs the frames asked for, as the browser would, a few times over. */
function runFrames(times: number) {
    for (let at = 1; at <= times; at += 1) {
        const now = frames
        frames = []
        for (const frame of now) frame(at * 16)
    }
}

describe('ScrollingWaveform', () => {
    it('scrolls frame after frame while active', () => {
        mount(<ScrollingWaveform />)
        runFrames(3)
        expect(frames).toHaveLength(1)
    })

    it('draws once and stops while held still', () => {
        const page = mount(<ScrollingWaveform active={false} />)
        runFrames(3)
        expect(frames).toHaveLength(0)
        expect(page.firstElementChild?.hasAttribute('active')).toBe(false)
    })

    it('draws once and stops while motion is reduced', () => {
        document.documentElement.setAttribute('data-motion', 'off')
        mount(<ScrollingWaveform />)
        runFrames(3)
        expect(frames).toHaveLength(0)
    })

    it('draws from its seed, never from chance or the clock', () => {
        const random = vi.spyOn(Math, 'random')
        const clock = vi.spyOn(Date, 'now')
        mount(<ScrollingWaveform seed={7} />)
        runFrames(3)
        expect(random).not.toHaveBeenCalled()
        expect(clock).not.toHaveBeenCalled()
    })
})
