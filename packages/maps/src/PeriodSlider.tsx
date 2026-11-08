import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Slider } from '@winterop-com/sokkel-ui/primitives/slider'

/** One step of a period slider: what it answers with and what it is called. */
export interface Period {
    id: string
    label: string
}

export interface PeriodSliderWords {
    previous: string
    next: string
    play: string
    pause: string
}

const WORDS: PeriodSliderWords = { previous: 'Previous period', next: 'Next period', play: 'Play', pause: 'Pause' }

export interface PeriodSliderProps {
    /** What the periods are of, such as "Rainfall"; it names the slider for a screen reader. */
    label: string
    periods: readonly Period[]
    /** The id of the period shown. */
    value: string
    onValueChange: (id: string) => void
    /** Milliseconds between steps while playing. */
    interval?: number
    words?: Partial<PeriodSliderWords>
    className?: string
}

/**
 * Steps through a fixed run of periods, such as the months of a year: a slider with one stop per
 * period, buttons for the period before and after, and a play button that advances one period at
 * a time and stops at the last.
 */
export function PeriodSlider({ label, periods, value, onValueChange, interval = 1200, words, className }: PeriodSliderProps) {
    const said = { ...WORDS, ...words }
    const index = Math.max(
        0,
        periods.findIndex((period) => period.id === value),
    )
    const last = periods.length - 1
    const [playing, setPlaying] = useState(false)
    const step = (to: number) => onValueChange(periods[Math.min(Math.max(to, 0), last)].id)

    useEffect(() => {
        if (!playing) return
        if (index >= last) {
            setPlaying(false)
            return
        }
        const timer = setTimeout(() => onValueChange(periods[index + 1].id), interval)
        return () => clearTimeout(timer)
    }, [playing, index, last, interval, periods, onValueChange])

    return (
        <div
            className={cn(
                'flex w-full items-center gap-2 rounded-lg bg-card/95 px-2 py-1.5 shadow-xs ring-1 ring-foreground/10',
                className,
            )}
        >
            <IconButton
                label={playing ? said.pause : said.play}
                onClick={() => {
                    if (!playing && index >= last) step(0)
                    setPlaying(!playing)
                }}
            >
                {playing ? <Pause /> : <Play />}
            </IconButton>
            <IconButton label={said.previous} disabled={index === 0} onClick={() => step(index - 1)}>
                <ChevronLeft />
            </IconButton>
            <div className="flex min-w-0 flex-1 flex-col gap-1 px-1">
                <Slider
                    aria-label={label}
                    min={0}
                    max={Math.max(last, 1)}
                    step={1}
                    value={[index]}
                    disabled={periods.length < 2}
                    onValueChange={(next) => step(Array.isArray(next) ? next[0] : next)}
                />
                <div aria-hidden className="flex justify-between text-2xs leading-none text-muted-foreground">
                    <span>{periods[0]?.label}</span>
                    <span>{periods[last]?.label}</span>
                </div>
            </div>
            <IconButton label={said.next} disabled={index >= last} onClick={() => step(index + 1)}>
                <ChevronRight />
            </IconButton>
            <output aria-live="polite" className="min-w-20 pr-1 text-right text-sm font-medium tabular-nums">
                {periods[index]?.label}
            </output>
        </div>
    )
}
