import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { chapterTimerStep, playedOn, SleepTimerMenu, useSleepTimer, type SleepTimerControls, type SleepTimerOptions } from './SleepTimer'

/** A stand-in for a DOM element, enough for React to render a tree that draws nothing into it. */
function container(): Element {
    const doc = {
        nodeType: 9,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        activeElement: null,
        body: null,
        documentElement: { contains: () => false },
        defaultView: { HTMLIFrameElement: class {}, getSelection: () => null },
    }
    return {
        nodeType: 1,
        tagName: 'DIV',
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: doc,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        textContent: '',
        firstChild: null,
        lastChild: null,
        childNodes: [],
    } as unknown as Element
}

/** Runs the hook in a tree that draws nothing, on a clock and an interval the test moves by hand. */
async function mounted(options: Omit<SleepTimerOptions, 'onSleep'>) {
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    const ticks: (() => void)[] = []
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((callback: () => void) => {
        ticks.push(callback)
        return ticks.length
    }) as unknown as typeof setInterval)
    vi.spyOn(globalThis, 'clearInterval').mockImplementation((id) => {
        if (typeof id === 'number') ticks[id - 1] = () => undefined
    })
    const slept = vi.fn()
    let seen: SleepTimerControls | undefined
    function Probe(props: Omit<SleepTimerOptions, 'onSleep'>) {
        seen = useSleepTimer({ ...props, onSleep: slept })
        return null
    }
    const root = createRoot(container())
    await act(async () => root.render(<Probe {...options} />))
    return {
        slept,
        controls: () => seen!,
        /** Moves the clock on, then runs the interval's latest callback once, as a throttled page does. */
        tick: async (seconds: number) => {
            clock += seconds * 1000
            await act(async () => ticks.at(-1)?.())
        },
        /** Moves the clock on and reports a new position. */
        report: async (seconds: number, props: Omit<SleepTimerOptions, 'onSleep'>) => {
            clock += seconds * 1000
            await act(async () => root.render(<Probe {...props} />))
        },
        set: async (timer: Parameters<SleepTimerControls['set']>[0]) => act(async () => seen!.set(timer)),
        unmount: async () => act(async () => root.unmount()),
    }
}

describe('SleepTimerMenu', () => {
    it('names the timer, and what is set and how long is left', () => {
        const off = renderToStaticMarkup(<SleepTimerMenu timer={null} onTimerChange={() => undefined} />)
        expect(off).toContain('aria-label="Sleep timer"')
        const counting = renderToStaticMarkup(<SleepTimerMenu timer={15} remaining={754} onTimerChange={() => undefined} />)
        expect(counting).toContain('aria-label="Sleep timer: 12:34 left"')
        expect(counting).toContain('12:34')
        const chapter = renderToStaticMarkup(<SleepTimerMenu timer="chapter" onTimerChange={() => undefined} />)
        expect(chapter).toContain('aria-label="Sleep timer: End of chapter"')
    })
})

describe('useSleepTimer', () => {
    it('starts off, with nothing left and no end to wait for', () => {
        let seen: SleepTimerControls | undefined
        function Probe() {
            seen = useSleepTimer({ playing: true, position: 40, chapters: [0, 60], onSleep: () => undefined })
            return null
        }
        renderToStaticMarkup(<Probe />)
        expect(seen?.timer).toBeNull()
        expect(seen?.remaining).toBeUndefined()
        expect(seen?.ended()).toBe(false)
    })
})

describe('a chapter sleep timer', () => {
    it('tells playing on from a seek by how far the position moved in the time between reports', () => {
        expect(playedOn(57, 62, 5)).toBe(true)
        expect(playedOn(30, 60, 0.25)).toBe(false)
        expect(playedOn(62, 57, 5)).toBe(false)
    })

    it('ends as playback passes into the next chapter, however seldom it is reported, but not on a jump to it', () => {
        expect(chapterTimerStep([0, 60, 120], 0, { from: 57, to: 62, seconds: 5, playing: true })).toEqual({ ended: true, anchor: 1 })
        expect(chapterTimerStep([0, 60, 120], 0, { from: 30, to: 60, seconds: 0.25, playing: true })).toEqual({ ended: false, anchor: 1 })
        expect(chapterTimerStep([0, 60, 120], 0, { from: 59.5, to: 60.2, seconds: 0.5, playing: false })).toEqual({
            ended: false,
            anchor: 1,
        })
        expect(chapterTimerStep([0, 60, 120], 1, { from: 70, to: 30, seconds: 0.25, playing: true })).toEqual({ ended: false, anchor: 0 })
    })
})

describe('useSleepTimer, running', () => {
    const flag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean; window?: unknown }
    beforeAll(() => {
        flag.IS_REACT_ACT_ENVIRONMENT = true
        flag.window ??= globalThis
    })
    afterAll(() => {
        delete flag.IS_REACT_ACT_ENVIRONMENT
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('counts minutes by the clock, so a late tick takes off all the time gone by', async () => {
        const timer = await mounted({ playing: true, position: 0 })
        await timer.set(5)
        await timer.tick(60)
        expect(timer.controls().remaining).toBe(240)
        await timer.tick(240)
        expect(timer.slept).toHaveBeenCalledTimes(1)
        await timer.unmount()
    })

    it('keeps a chapter timer going when Next chapter jumps into the next one', async () => {
        const chapters = [0, 60, 120]
        const timer = await mounted({ playing: true, position: 30, chapters })
        await timer.set('chapter')
        await timer.report(0.25, { playing: true, position: 60, chapters })
        expect(timer.slept).not.toHaveBeenCalled()
        expect(timer.controls().timer).toBe('chapter')
        await timer.unmount()
    })

    it('ends a chapter timer as playback passes on, reported every five seconds', async () => {
        const chapters = [0, 60, 120]
        const timer = await mounted({ playing: true, position: 57, chapters })
        await timer.set('chapter')
        await timer.report(5, { playing: true, position: 62, chapters })
        expect(timer.slept).toHaveBeenCalledTimes(1)
        await timer.unmount()
    })
})
