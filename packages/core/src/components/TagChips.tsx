import { ChevronDown } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

import { cn } from '../lib/cn'
import { Chip, type ChipTone } from './Chip'
import { useTableCell } from './table-cell'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export interface TagChipsWords {
    /** The chip that stands for the tags left out, given how many. */
    more: (count: number) => string
    /** A tag's name and tooltip where a press does more than its words say ("Filter by harbor"). */
    select?: (tag: string) => string
    /** The name of the chip that stands for the tags left out, given them, so it says which they are. */
    rest: (tags: readonly string[]) => string
}

const WORDS: TagChipsWords = {
    more: (count) => `+${String(count)}`,
    rest: (tags) => `${String(tags.length)} more: ${tags.join(', ')}`,
}

const RING =
    'rounded-chip outline-none focus-visible:outline-focus focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid'

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

export interface TagChipsProps {
    tags: readonly string[]
    max?: number
    /** `secondary` draws each tag on a faint wash, `outline` in a hairline edge. */
    variant?: 'secondary' | 'outline'
    /** The tags in the code face, as a chip's `mono`; on by default. */
    mono?: boolean
    /**
     * Makes each tag a button, pressed to open or filter by it, and the +N chip a menu of the tags
     * left out, each pressed the same way. The presses stop there, so a row around the tags is not
     * pressed too.
     */
    onSelect?: (tag: string, index: number) => void
    className?: string
    words?: Partial<TagChipsWords>
}

/**
 * A row of tags as chips that shows as many as fit the room it is given and a +N chip for the
 * rest, named by the tags it stands for and saying them on hover and focus. It takes the width
 * left in the row it sits in, so it goes beside a title or a name, and measures its chips again
 * whenever that width changes. In a `DataTable` cell it fits its column's room, and on a stacked
 * card it wraps onto more lines and shows every tag. `max` caps how many show even when more would
 * fit. With `onSelect` each tag is a button and the +N chip opens a menu of the rest, drawn as
 * chips and each one pressable as the shown tags are.
 */
export function TagChips({ tags, max, variant = 'secondary', mono = true, onSelect, className, words: given }: TagChipsProps) {
    const words = { ...WORDS, ...given }
    const tone: ChipTone = variant === 'outline' ? 'outline' : 'neutral'
    const cell = useTableCell()
    const stacked = cell.stacked
    const column = stacked ? 0 : cell.columnWidth
    const box = useRef<HTMLDivElement>(null)
    const ruler = useRef<HTMLDivElement>(null)
    const cap = Math.min(max ?? tags.length, tags.length)
    const [shown, setShown] = useState(cap)

    useLayoutEffect(() => {
        if (stacked) {
            setShown(cap)
            return
        }
        const node = box.current
        const measure = ruler.current
        if (node === null || measure === null) return
        const fit = () => {
            const chips = [...measure.children] as HTMLElement[]
            const more = chips.pop()?.offsetWidth ?? 0
            const count = fitCount(
                chips.map((chip) => chip.offsetWidth),
                column > 0 ? column : node.clientWidth,
                GAP,
                more,
            )
            setShown(Math.min(count, cap))
        }
        fit()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(fit)
        observer.observe(node)
        return () => observer.disconnect()
    }, [tags, cap, stacked, column])

    const rest = tags.slice(shown)
    const restName = words.rest(rest)
    return (
        <div
            ref={box}
            data-slot="tag-chips"
            className={cn('relative flex min-w-0 flex-1 items-center gap-1', stacked ? 'flex-wrap' : 'overflow-hidden', className)}
        >
            {/* Only where the row clips it: on a wrapping card it would widen whatever scrolls around it. */}
            {!stacked && (
                <div ref={ruler} aria-hidden className="invisible absolute top-0 left-0 flex gap-1">
                    {tags.map((tag, index) => (
                        <Chip key={index} mono={mono} tone={tone}>
                            {tag}
                        </Chip>
                    ))}
                    <Chip mono={mono} tone="outline">
                        {words.more(tags.length)}
                        {/* The menu chip's chevron, after the words' gap. */}
                        {onSelect !== undefined && <ChevronDown className="ms-1 inline" />}
                    </Chip>
                </div>
            )}
            {tags.slice(0, shown).map((tag, index) => (
                <Chip
                    key={index}
                    mono={mono}
                    tone={tone}
                    onSelect={onSelect === undefined ? undefined : () => onSelect(tag, index)}
                    selectLabel={onSelect === undefined ? undefined : words.select?.(tag)}
                    className="shrink"
                >
                    {tag}
                </Chip>
            ))}
            {rest.length > 0 &&
                (onSelect === undefined ? (
                    <Tooltip>
                        <TooltipTrigger render={<span tabIndex={0} aria-label={restName} className={cn('inline-flex shrink-0', RING)} />}>
                            <Chip mono={mono} tone="outline" className="text-muted-foreground">
                                {words.more(rest.length)}
                            </Chip>
                        </TooltipTrigger>
                        <TooltipContent>{rest.join(', ')}</TooltipContent>
                    </Tooltip>
                ) : (
                    <Chip
                        mono={mono}
                        tone="outline"
                        selectLabel={restName}
                        menuAlign="end"
                        menu={rest.map((tag, index) => ({
                            label: (
                                <Chip mono={mono} tone={tone}>
                                    {tag}
                                </Chip>
                            ),
                            onSelect: () => onSelect(tag, shown + index),
                        }))}
                        className="text-muted-foreground"
                    >
                        {words.more(rest.length)}
                    </Chip>
                ))}
        </div>
    )
}
