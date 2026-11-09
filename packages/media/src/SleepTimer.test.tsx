import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SleepTimerMenu, useSleepTimer, type SleepTimerControls } from './SleepTimer'

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
