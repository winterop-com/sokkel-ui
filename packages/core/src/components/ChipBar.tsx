import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { Button } from './ui/button'

/** One chip in a `ChipBar`. */
export interface Chip<T extends string = string> {
    value: T
    label: string
}

export interface ChipBarWords {
    /** The buttons that scroll the row a page back and forward. */
    back: string
    forward: string
}

const WORDS: ChipBarWords = { back: 'Scroll back', forward: 'Scroll forward' }

/**
 * A row of chips with one chosen, such as topics over a feed. When the chips run past the row's
 * room it scrolls sideways with no scroll bar: the cut edges fade, and an arrow at each side that
 * has more scrolls a page that way (a phone swipes). The chosen chip is kept in view.
 */
export function ChipBar<T extends string = string>({
    label,
    chips,
    value,
    onValueChange,
    words: given,
    className,
}: {
    /** The row's accessible name. */
    label: string
    chips: readonly Chip<T>[]
    value: T
    onValueChange: (value: T) => void
    words?: Partial<ChipBarWords>
    className?: string
}) {
    const words = { ...WORDS, ...given }
    const row = useRef<HTMLDivElement>(null)
    const [more, setMore] = useState({ back: false, forward: false })

    const measure = useCallback(() => {
        const element = row.current
        if (element === null) return
        const end = element.scrollWidth - element.clientWidth
        setMore({ back: element.scrollLeft > 1, forward: element.scrollLeft < end - 1 })
    }, [])

    useEffect(() => {
        const element = row.current
        if (element === null) return
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        element.addEventListener('scroll', measure, { passive: true })
        return () => {
            observer.disconnect()
            element.removeEventListener('scroll', measure)
        }
    }, [measure])

    useEffect(() => {
        const chosen = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
        chosen?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [value])

    const page = (direction: 1 | -1) => {
        const element = row.current
        if (element === null) return
        element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' })
    }

    return (
        <div role="group" aria-label={label} data-slot="chip-bar" className={cn('relative flex min-w-0 items-center', className)}>
            <div
                ref={row}
                className="flex min-w-0 flex-1 scroll-fade-x scrollbar-none items-center gap-2 overflow-x-auto overscroll-x-contain py-0.5"
            >
                {chips.map((chip) => (
                    <Button
                        key={chip.value}
                        size="sm"
                        variant={chip.value === value ? 'default' : 'secondary'}
                        aria-pressed={chip.value === value}
                        className="shrink-0"
                        onClick={() => onValueChange(chip.value)}
                    >
                        {chip.label}
                    </Button>
                ))}
            </div>
            {more.back && (
                <IconButton
                    label={words.back}
                    size="icon-sm"
                    variant="ghost"
                    className="absolute left-0 bg-background pointer-coarse:hidden"
                    onClick={() => page(-1)}
                >
                    <ChevronLeft aria-hidden />
                </IconButton>
            )}
            {more.forward && (
                <IconButton
                    label={words.forward}
                    size="icon-sm"
                    variant="ghost"
                    className="absolute right-0 bg-background pointer-coarse:hidden"
                    onClick={() => page(1)}
                >
                    <ChevronRight aria-hidden />
                </IconButton>
            )}
        </div>
    )
}
