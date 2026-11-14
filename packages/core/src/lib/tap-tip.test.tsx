import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IconButton } from '../components/IconButton'
import { Button } from '../components/ui/button'
import { TIP_HOLD } from './durations'
import { tapTip } from './tap-tip'

/**
 * A tooltip as `Tooltip` holds it, with every change made or asked: a tap shows and closes it itself,
 * and a change Base UI asks for goes through the tap's `allows`, a close then stopping the tap's hold.
 */
function tooltip() {
    const said: string[] = []
    let open = false
    const taps = tapTip((next) => {
        said.push(next ? 'shown by the tap' : 'closed by the tap')
        open = next
    })
    const ask = (next: boolean, reason: string) => {
        if (!taps.allows(next, reason)) return said.push(`${next ? 'open' : 'close'} refused (${reason})`)
        said.push(`${next ? 'open' : 'close'} (${reason})`)
        open = next
        if (!next) taps.stop()
    }
    return { press: (pointer: string) => taps.press(pointer, open), said, ask, isOpen: () => open }
}

describe('a tooltip shown by a tap', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('holds for the tip-hold token, 4 seconds', () => {
        const tokens = JSON.parse(readFileSync(join(__dirname, '..', '..', 'tokens', 'tokens.json'), 'utf8')) as {
            themes: { tidevann: { light: Record<string, string> } }
        }
        expect(tokens.themes.tidevann.light['tip-hold']).toBe('4000ms')
        expect(TIP_HOLD).toBe(4000)
    })

    it('opens on a tap by touch or pen', () => {
        for (const pointer of ['touch', 'pen']) {
            const tip = tooltip()
            tip.press(pointer)
            expect(tip.isOpen()).toBe(true)
            expect(tip.said).toEqual(['shown by the tap'])
        }
    })

    it('leaves a mouse press alone: hover and focus show the tooltip as they always have', () => {
        const tip = tooltip()
        tip.press('mouse')
        expect(tip.isOpen()).toBe(false)
        expect(tip.said).toEqual([])
    })

    it('stays up until the hold has run, then closes', () => {
        const tip = tooltip()
        tip.press('touch')
        vi.advanceTimersByTime(TIP_HOLD - 1)
        expect(tip.isOpen()).toBe(true)
        vi.advanceTimersByTime(1)
        expect(tip.isOpen()).toBe(false)
    })

    it('closes on a tap on the trigger again', () => {
        const tip = tooltip()
        tip.press('touch')
        tip.press('touch')
        expect(tip.isOpen()).toBe(false)
        // The hold's timer went with it: nothing is closed again later.
        vi.advanceTimersByTime(TIP_HOLD)
        expect(tip.said).toEqual(['shown by the tap', 'closed by the tap'])
    })

    it('closes on the next press anywhere else, and the hold goes with it', () => {
        const tip = tooltip()
        tip.press('touch')
        tip.ask(false, 'outside-press')
        expect(tip.isOpen()).toBe(false)
        vi.advanceTimersByTime(TIP_HOLD)
        expect(tip.said).toEqual(['shown by the tap', 'close (outside-press)'])
        // A tap after it opens it again, held anew.
        tip.press('touch')
        expect(tip.isOpen()).toBe(true)
    })

    it('is not closed by a hover ending while a tap holds it, as a pen lifting reports', () => {
        const tip = tooltip()
        tip.press('pen')
        tip.ask(false, 'trigger-hover')
        expect(tip.isOpen()).toBe(true)
        vi.advanceTimersByTime(TIP_HOLD)
        expect(tip.isOpen()).toBe(false)
    })

    it('lets a hover close a tooltip a tap does not hold, as ever', () => {
        const tip = tooltip()
        tip.ask(true, 'trigger-hover')
        tip.ask(false, 'trigger-hover')
        expect(tip.isOpen()).toBe(false)
    })

    it('holds a tooltip keyboard focus opened once it is tapped, and closes it after the hold', () => {
        const tip = tooltip()
        tip.ask(true, 'trigger-focus')
        tip.press('touch')
        expect(tip.said).toEqual(['open (trigger-focus)', 'shown by the tap'])
        vi.advanceTimersByTime(TIP_HOLD)
        expect(tip.isOpen()).toBe(false)
    })

    it('restarts the hold on a tap after another way closed it', () => {
        const tip = tooltip()
        tip.press('touch')
        vi.advanceTimersByTime(TIP_HOLD - 1000)
        tip.ask(false, 'escape-key')
        tip.press('touch')
        vi.advanceTimersByTime(TIP_HOLD - 1)
        expect(tip.isOpen()).toBe(true)
        vi.advanceTimersByTime(1)
        expect(tip.isOpen()).toBe(false)
    })
})

describe('a shut button whose tooltip takes a tap', () => {
    it('draws on the server, shut and still described by its reason', () => {
        for (const html of [
            renderToStaticMarkup(<Button reason="A run of nightly-export is already under way.">Run now</Button>),
            renderToStaticMarkup(
                <IconButton label="Run again" reason="The last run is still going.">
                    R
                </IconButton>,
            ),
        ]) {
            const described = /aria-describedby="([^"]+)"/.exec(html)?.[1]
            expect(described).toBeDefined()
            expect(html).toContain(`id="${described ?? ''}"`)
            expect(html).toContain('aria-disabled="true"')
        }
    })
})
