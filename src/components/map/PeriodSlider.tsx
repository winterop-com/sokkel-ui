import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Slider } from '../ui/slider'

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

/**
 * Steps through a fixed run of periods, such as the months of a year: a slider with one stop per
 * period, buttons for the period before and after, and a play button that advances one period at
 * a time and stops at the last.
 */
export function PeriodSlider({
    label,
    periods,
    value,
    onValueChange,
    interval = 1200,
    words,
    className,
}: {
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
}) {
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
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={playing ? said.pause : said.play}
                onClick={() => {
                    if (!playing && index >= last) step(0)
                    setPlaying(!playing)
                }}
            >
                {playing ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={said.previous} disabled={index === 0} onClick={() => step(index - 1)}>
                <ChevronLeft />
            </Button>
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
                <div aria-hidden className="flex justify-between text-[11px] leading-none text-muted-foreground">
                    <span>{periods[0]?.label}</span>
                    <span>{periods[last]?.label}</span>
                </div>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={said.next} disabled={index >= last} onClick={() => step(index + 1)}>
                <ChevronRight />
            </Button>
            <output aria-live="polite" className="min-w-20 pr-1 text-right text-sm font-medium tabular-nums">
                {periods[index]?.label}
            </output>
        </div>
    )
}
