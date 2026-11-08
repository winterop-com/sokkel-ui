import { useLayoutEffect, useRef, useState } from 'react'

import { cn } from '../lib/cn'
import { Badge } from './ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export interface TagChipsWords {
    /** The chip that stands for the tags left out, given how many. */
    more: (count: number) => string
}

const WORDS: TagChipsWords = { more: (count) => `+${String(count)}` }

/**
 * How many chips of these widths fit a room, the gap between each two, with room kept for the
 * chip that counts the rest whenever some are left out.
 */
export function fitCount(widths: readonly number[], room: number, gap: number, moreWidth: number): number {
    const all = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1)
    if (all <= room) return widths.length
    let used = moreWidth
    let count = 0
    for (const width of widths) {
        if (used + gap + width > room) break
        used += gap + width
        count += 1
    }
    return count
}

/** The gap between chips, in pixels; `gap-1` below. */
const GAP = 4

/**
 * A row of tags as chips that shows as many as fit the room it is given and a +N chip for the
 * rest, which names them on hover and focus. It takes the width left in the row it sits in, so it
 * goes beside a title or a name, and measures its chips again whenever that width changes. `max`
 * caps how many show even when more would fit.
 */
export function TagChips({
    tags,
    max,
    variant = 'secondary',
    className,
    words: given,
}: {
    tags: readonly string[]
    max?: number
    variant?: 'secondary' | 'outline'
    className?: string
    words?: Partial<TagChipsWords>
}) {
    const words = { ...WORDS, ...given }
    const box = useRef<HTMLDivElement>(null)
    const ruler = useRef<HTMLDivElement>(null)
    const [shown, setShown] = useState(tags.length)

    useLayoutEffect(() => {
        const node = box.current
        const measure = ruler.current
        if (node === null || measure === null) return
        const fit = () => {
            const chips = [...measure.children] as HTMLElement[]
            const more = chips.pop()?.offsetWidth ?? 0
            const count = fitCount(
                chips.map((chip) => chip.offsetWidth),
                node.clientWidth,
                GAP,
                more,
            )
            setShown(Math.min(count, max ?? tags.length))
        }
        fit()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(fit)
        observer.observe(node)
        return () => observer.disconnect()
    }, [tags, max])

    const rest = tags.slice(shown)
    return (
        <div ref={box} data-slot="tag-chips" className={cn('relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden', className)}>
            <div ref={ruler} aria-hidden className="invisible absolute top-0 left-0 flex gap-1">
                {tags.map((tag, index) => (
                    <Badge key={index} variant={variant}>
                        {tag}
                    </Badge>
                ))}
                <Badge variant="outline">{words.more(tags.length)}</Badge>
            </div>
            {tags.slice(0, shown).map((tag, index) => (
                <Badge key={index} variant={variant} className="max-w-full min-w-0 shrink">
                    <span className="truncate">{tag}</span>
                </Badge>
            ))}
            {rest.length > 0 && (
                <Tooltip>
                    <TooltipTrigger render={<Badge variant="outline" tabIndex={0} className="text-muted-foreground" />}>
                        {words.more(rest.length)}
                    </TooltipTrigger>
                    <TooltipContent>{rest.join(', ')}</TooltipContent>
                </Tooltip>
            )}
        </div>
    )
}
