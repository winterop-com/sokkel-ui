import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimClock } from '../simulate'

const START = Date.parse('2026-11-20T14:30:00Z')

/** A real clock a test moves by hand, with the timers moved along with it. */
function real() {
    let at = 50_000
    return {
        now: () => at,
        /** Real time passes and the timers due in it fire. */
        pass(ms: number) {
            for (let left = ms; left > 0; left -= Math.min(left, 100)) {
                const step = Math.min(left, 100)
                at += step
                vi.advanceTimersByTime(step)
            }
        },
        /** Real time passes while every timer sleeps, as in a hidden tab. */
        sleep(ms: number) {
            at += ms
        },
    }
}

describe('createSimClock', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('stands at its start until the first tick', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 30, now: world.now })
        expect(clock.get()).toBe(START)
        world.sleep(999)
        expect(clock.get()).toBe(START)
        expect(clock.playing).toBe(true)
        expect(clock.speed).toBe(30)
    })

    it('moves in whole ticks at its speed, read with no timer running', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 30, now: world.now })
        world.sleep(1000)
        expect(clock.get()).toBe(START + 30_000)
        world.sleep(1500)
        expect(clock.get()).toBe(START + 60_000)
        world.sleep(500)
        expect(clock.get()).toBe(START + 90_000)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('plays live at a speed of 1 by default, a second a tick', () => {
        const world = real()
        const clock = createSimClock({ start: START, now: world.now })
        world.sleep(4200)
        expect(clock.get()).toBe(START + 4000)
    })

    it('tells its listeners each tick, and passes the same moments every time', () => {
        const run = () => {
            const world = real()
            const clock = createSimClock({ start: START, speed: 60, now: world.now })
            const seen: number[] = [clock.get()]
            const stop = clock.subscribe(() => seen.push(clock.get()))
            world.pass(5000)
            stop()
            return seen
        }
        const first = run()
        expect(first).toEqual([START, START + 60_000, START + 120_000, START + 180_000, START + 240_000, START + 300_000])
        expect(run()).toEqual(first)
    })

    it('holds the same moment between two ticks, for a store to hand out', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 10, now: world.now })
        const stop = clock.subscribe(() => undefined)
        world.pass(1400)
        expect(clock.get()).toBe(START + 10_000)
        world.pass(500)
        expect(clock.get()).toBe(START + 10_000)
        world.pass(100)
        expect(clock.get()).toBe(START + 20_000)
        stop()
    })

    it('runs one timer while it plays and something listens, and none otherwise', () => {
        const world = real()
        const clock = createSimClock({ start: START, now: world.now })
        expect(vi.getTimerCount()).toBe(0)
        const first = clock.subscribe(() => undefined)
        const second = clock.subscribe(() => undefined)
        expect(vi.getTimerCount()).toBe(1)
        clock.pause()
        expect(vi.getTimerCount()).toBe(0)
        clock.play()
        expect(vi.getTimerCount()).toBe(1)
        first()
        expect(vi.getTimerCount()).toBe(1)
        second()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('takes the ticks a slowed timer missed with the next one', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 30, now: world.now })
        const seen: number[] = []
        const stop = clock.subscribe(() => seen.push(clock.get()))
        world.pass(1000)
        // A hidden tab: five seconds pass before the timer fires again.
        world.sleep(4000)
        world.pass(1000)
        expect(seen).toEqual([START + 30_000, START + 180_000])
        stop()
    })

    it('counts a timer that fires a little early or late as one tick', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 30, now: world.now })
        const seen: number[] = []
        const stop = clock.subscribe(() => seen.push(clock.get()))
        // The timer fires at its second, while the real clock reads a little short of it, then a little past.
        world.sleep(-3)
        world.pass(1000)
        world.sleep(40)
        world.pass(1000)
        world.pass(1000)
        expect(seen).toEqual([START + 30_000, START + 60_000, START + 90_000])
        stop()
    })

    it('holds while paused and plays on from where it stood', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 30, now: world.now })
        const stop = clock.subscribe(() => undefined)
        world.pass(2000)
        clock.pause()
        expect(clock.playing).toBe(false)
        world.pass(60_000)
        expect(clock.get()).toBe(START + 60_000)
        clock.play()
        expect(clock.get()).toBe(START + 60_000)
        world.pass(1000)
        expect(clock.get()).toBe(START + 90_000)
        stop()
    })

    it('can start paused, and stands at its start until played', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 30, playing: false, now: world.now })
        world.sleep(10_000)
        expect(clock.get()).toBe(START)
        clock.play()
        world.sleep(1000)
        expect(clock.get()).toBe(START + 30_000)
    })

    it('seeks to a moment and plays on from it, a whole tick later', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 30, now: world.now })
        const seen: number[] = []
        const stop = clock.subscribe(() => seen.push(clock.get()))
        world.pass(1600)
        clock.seek(START - 3_600_000)
        expect(clock.get()).toBe(START - 3_600_000)
        world.pass(900)
        expect(clock.get()).toBe(START - 3_600_000)
        world.pass(100)
        expect(clock.get()).toBe(START - 3_600_000 + 30_000)
        expect(seen).toEqual([START + 30_000, START - 3_600_000, START - 3_600_000 + 30_000])
        stop()
    })

    it('seeks while paused and stays there', () => {
        const world = real()
        const clock = createSimClock({ start: START, playing: false, now: world.now })
        clock.seek(START + 5000)
        world.sleep(9000)
        expect(clock.get()).toBe(START + 5000)
    })

    it('changes speed from the next tick on', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 10, now: world.now })
        const stop = clock.subscribe(() => undefined)
        world.pass(2000)
        clock.setSpeed(60)
        expect(clock.speed).toBe(60)
        expect(clock.get()).toBe(START + 20_000)
        world.pass(1000)
        expect(clock.get()).toBe(START + 80_000)
        stop()
    })

    it('counts the ticks before a change of speed at the speed they passed at', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 10, now: world.now })
        world.sleep(3000)
        clock.setSpeed(1)
        world.sleep(2000)
        expect(clock.get()).toBe(START + 30_000 + 2000)
    })

    it('tells its listeners of a seek, a pause, a play and a change of speed', () => {
        const world = real()
        const clock = createSimClock({ start: START, now: world.now })
        const told = vi.fn()
        const stop = clock.subscribe(told)
        clock.pause()
        clock.pause()
        clock.play()
        clock.play()
        clock.seek(START + 1)
        clock.setSpeed(2)
        expect(told).toHaveBeenCalledTimes(4)
        stop()
        clock.seek(START)
        expect(told).toHaveBeenCalledTimes(4)
    })

    it('ticks at the length it is given', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: 4, tick: 250, now: world.now })
        const seen: number[] = []
        const stop = clock.subscribe(() => seen.push(clock.get()))
        world.pass(1000)
        expect(seen).toEqual([START + 1000, START + 2000, START + 3000, START + 4000])
        stop()
    })

    it('plays backward at a negative speed', () => {
        const world = real()
        const clock = createSimClock({ start: START, speed: -60, now: world.now })
        world.sleep(2000)
        expect(clock.get()).toBe(START - 120_000)
    })
})
