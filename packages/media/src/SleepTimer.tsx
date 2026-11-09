import { Moon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { toneButton, type MediaTone } from '@winterop-com/sokkel-ui/media/MediaControls'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { chapterIndex } from './chapters'

/**
 * When playback stops: after a number of minutes of playing, at the end of the chapter playing
 * (`chapter`), at the end of what plays (`end`), or never (`null`).
 */
export type SleepTimer = number | 'chapter' | 'end' | null

/** The minutes the menu offers unless told others. */
export const SLEEP_MINUTES: readonly number[] = [5, 10, 15, 30, 45, 60]

/** The words the sleep timer says, each with an English default. */
export interface SleepTimerWords {
    /** The button's and the menu's name. */
    label: string
    off: string
    minutes: (minutes: number) => string
    /** The timer to the end of the chapter playing. */
    chapter: string
    /** The timer to the end of what plays. */
    end: string
    /** What the button says of a running timer, given the time left as written. */
    left: (time: string) => string
}

export const SLEEP_TIMER_WORDS: SleepTimerWords = {
    label: 'Sleep timer',
    off: 'Off',
    minutes: (minutes) => `${String(minutes)} minutes`,
    chapter: 'End of chapter',
    end: 'End of episode',
    left: (time) => `${time} left`,
}

const OFF = 'off'

/** The timer as the menu's value. */
function valueOf(timer: SleepTimer): string {
    return timer === null ? OFF : String(timer)
}

/** The menu's value as a timer. */
function timerOf(value: string): SleepTimer {
    if (value === OFF) return null
    if (value === 'chapter' || value === 'end') return value
    return Number(value)
}

export interface SleepTimerMenuProps {
    timer: SleepTimer
    onTimerChange: (timer: SleepTimer) => void
    /** The seconds left of a timer in minutes, written on the button while it runs. */
    remaining?: number
    /** The minutes offered. */
    minutes?: readonly number[]
    /** Whether End of chapter is offered, for what has chapters. */
    chapters?: boolean
    tone?: MediaTone
    /** Holds the menu inside an element that may go fullscreen, where a menu on the body would not show. */
    container?: ComponentProps<typeof DropdownMenuContent>['container']
    className?: string
    words?: Partial<SleepTimerWords>
}

/**
 * A sleep timer for a long listen, a podcast or a book: a moon in the player's transport, such as
 * `MediaBar`'s `extra`, that opens a menu of minutes, the end of the chapter and the end of the
 * episode. A running timer draws the moon in the accent, with the time left beside it while it
 * counts minutes. `useSleepTimer` keeps the timer and pauses when it runs out.
 */
export function SleepTimerMenu({
    timer,
    onTimerChange,
    remaining,
    minutes = SLEEP_MINUTES,
    chapters = false,
    tone = 'surface',
    container,
    className,
    words,
}: SleepTimerMenuProps) {
    const said = { ...SLEEP_TIMER_WORDS, ...words }
    const counting = typeof timer === 'number' && remaining !== undefined
    const state =
        timer === null
            ? undefined
            : counting
              ? said.left(formatTime(remaining))
              : timer === 'chapter'
                ? said.chapter
                : timer === 'end'
                  ? said.end
                  : said.minutes(timer)
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={state === undefined ? said.label : `${said.label}: ${state}`}
                        className={cn(
                            'w-auto min-w-8 px-1.5 font-mono text-xs tabular-nums',
                            toneButton(tone),
                            tone === 'surface' && (timer === null ? 'text-muted-foreground' : 'text-primary-ink'),
                            tone === 'overlay' && timer !== null && 'text-terminal-accent',
                            className,
                        )}
                    />
                }
            >
                <Moon aria-hidden />
                {counting && formatTime(remaining)}
            </DropdownMenuTrigger>
            <DropdownMenuContent container={container} side="top" align="end" className="w-auto min-w-24">
                <DropdownMenuRadioGroup value={valueOf(timer)} onValueChange={(value: string) => onTimerChange(timerOf(value))}>
                    <DropdownMenuRadioItem value={OFF} closeOnClick>
                        {said.off}
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    {minutes.map((option) => (
                        <DropdownMenuRadioItem key={option} value={String(option)} closeOnClick>
                            {said.minutes(option)}
                        </DropdownMenuRadioItem>
                    ))}
                    <DropdownMenuSeparator />
                    {chapters && (
                        <DropdownMenuRadioItem value="chapter" closeOnClick>
                            {said.chapter}
                        </DropdownMenuRadioItem>
                    )}
                    <DropdownMenuRadioItem value="end" closeOnClick>
                        {said.end}
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export interface SleepTimerOptions {
    playing: boolean
    /** Seconds from the start of what plays. */
    position: number
    /** Where each chapter starts, in seconds, for a timer to the end of the chapter. */
    chapters?: readonly number[]
    /** Pauses what plays, called once as the timer runs out. */
    onSleep: () => void
}

export interface SleepTimerControls {
    timer: SleepTimer
    /** The seconds left of a timer in minutes, counted while playing. */
    remaining: number | undefined
    set: (timer: SleepTimer) => void
    /**
     * Tells the timer that what plays has ended. A timer to the end, or to the end of the last
     * chapter, runs out there and answers true, so the app stops rather than going on to the next.
     */
    ended: () => boolean
}

/**
 * Keeps a sleep timer for `SleepTimerMenu`. Minutes count down only while playing, so a pause holds
 * them; a timer to the end of the chapter runs out as playback passes from the chapter it was set in
 * into the next, and follows a seek into another chapter, timing that one instead; a timer to the
 * end runs out through `ended`. Running out calls `onSleep` and turns the timer off.
 */
export function useSleepTimer({ playing, position, chapters, onSleep }: SleepTimerOptions): SleepTimerControls {
    const [timer, setTimer] = useState<SleepTimer>(null)
    const [remaining, setRemaining] = useState<number | undefined>(undefined)
    const sleep = useRef(onSleep)
    sleep.current = onSleep
    const left = useRef<number | undefined>(undefined)
    // The chapter a chapter timer waits to see the end of.
    const anchor = useRef(-1)
    const where = useRef({ position, chapters })
    where.current = { position, chapters }

    const set = useCallback((next: SleepTimer) => {
        const { position: at, chapters: starts } = where.current
        anchor.current = starts === undefined ? -1 : chapterIndex(starts, at)
        left.current = typeof next === 'number' ? next * 60 : undefined
        setRemaining(left.current)
        setTimer(next)
    }, [])

    const runOut = useCallback(() => {
        left.current = undefined
        setRemaining(undefined)
        setTimer(null)
        sleep.current()
    }, [])

    useEffect(() => {
        if (typeof timer !== 'number' || !playing) return
        const tick = window.setInterval(() => {
            const next = (left.current ?? 0) - 1
            if (next <= 0) {
                runOut()
                return
            }
            left.current = next
            setRemaining(next)
        }, 1000)
        return () => window.clearInterval(tick)
    }, [timer, playing, runOut])

    useEffect(() => {
        if (timer !== 'chapter' || chapters === undefined) return
        const index = chapterIndex(chapters, position)
        if (index === anchor.current) return
        // Played on from the chapter it waited on into the next: the chapter has ended.
        if (playing && index === anchor.current + 1 && position - chapters[index] < 2) runOut()
        else anchor.current = index
    }, [timer, chapters, position, playing, runOut])

    const ended = useCallback(() => {
        if (timer !== 'end' && timer !== 'chapter') return false
        runOut()
        return true
    }, [timer, runOut])

    return { timer, remaining, set, ended }
}
