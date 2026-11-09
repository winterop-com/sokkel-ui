import { Ellipsis, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ButtonGroup } from '@winterop-com/sokkel-ui/primitives/button-group'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { fitCount } from '@winterop-com/sokkel-ui/TagChips'

/** What the viewer thinks of what plays: liked, disliked, or neither. */
export type MediaRating = 'like' | 'dislike' | null

/** One action on what plays, such as Share or Save, which moves into More when the row has no room for it. */
export interface MediaAction {
    id: string
    /** What the action says, in the row and as its entry in More. */
    label: string
    icon?: ReactNode
    onSelect?: () => void
    disabled?: boolean
    /** On or off, for an action that toggles, such as Saved: pressed in the row, checked in More. */
    pressed?: boolean
    /** Drawn in the row in place of the plain button, such as a `DownloadButton`. */
    render?: ReactNode
    /** Drawn in More in place of the plain entry; the plain entry calls `onSelect`. */
    menu?: ReactNode
}

/** The words the cluster says, each with an English default. */
export interface MediaActionsWords {
    like: string
    dislike: string
    more: string
    /** The like count as the like button writes it: `4.1K`. */
    count: (count: number) => string
}

const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export const MEDIA_ACTIONS_WORDS: MediaActionsWords = {
    like: 'Like',
    dislike: 'Dislike',
    more: 'More',
    count: (count) => short.format(count),
}

/** The gap between the buttons, in pixels: `gap-2` below. */
const GAP = 8

export interface MediaActionsProps {
    rating?: MediaRating
    /** How many liked it, written short on the like button. */
    likes?: number
    /** Like or dislike was pressed: the new rating, null when the one held was pressed again. The pair shows only when this is given. */
    onRatingChange?: (rating: MediaRating) => void
    /** The actions after the like pair, in order; those the row has no room for move, from the last, into More. */
    actions?: readonly MediaAction[]
    /** Entries that are always in More, after the actions moved there, such as Report or the stats. */
    menu?: ReactNode
    /** Opens More on the first render, for a still view of it. */
    defaultMoreOpen?: boolean
    words?: Partial<MediaActionsWords>
    className?: string
}

/** An action as the row draws it: the app's own node, or an outlined button with its icon and label. */
function Inline({ action }: { action: MediaAction }) {
    if (action.render !== undefined) return action.render
    return (
        <Button
            variant="outline"
            size="sm"
            disabled={action.disabled}
            aria-pressed={action.pressed}
            onClick={action.onSelect}
            className={cn(action.pressed === true && 'bg-muted text-foreground')}
        >
            {action.icon}
            {action.label}
        </Button>
    )
}

/** An action as More lists it: the app's own entry, a checked entry for a toggle, or a plain one. */
function Entry({ action }: { action: MediaAction }) {
    if (action.menu !== undefined) return action.menu
    if (action.pressed !== undefined) {
        return (
            <DropdownMenuCheckboxItem checked={action.pressed} disabled={action.disabled} onCheckedChange={() => action.onSelect?.()}>
                {action.icon}
                {action.label}
            </DropdownMenuCheckboxItem>
        )
    }
    return (
        <DropdownMenuItem disabled={action.disabled} onClick={action.onSelect}>
            {action.icon}
            {action.label}
        </DropdownMenuItem>
    )
}

/** The More button, drawn by the menu's trigger and by the ruler alike. */
function moreButton(label: string) {
    return <Button variant="outline" size="icon-sm" aria-label={label} title={label} />
}

/**
 * What the viewer does with a video or an episode, in one row under it: like and dislike joined,
 * the like count on the first, then the app's actions (Share, Save, Download) as outlined buttons,
 * and More. The row is measured on itself, so the actions it has no room for move from the last into
 * More, as a plain entry, a checked one for a toggle or the action's own `menu`, and come back out as
 * it widens; `menu` holds entries that are always in More. Beside a `ChannelRow`'s channel it stands
 * at the line's end; on a line of its own it starts at the left.
 */
export function MediaActions({
    rating = null,
    likes,
    onRatingChange,
    actions = [],
    menu,
    defaultMoreOpen = false,
    words: given,
    className,
}: MediaActionsProps) {
    const words = { ...MEDIA_ACTIONS_WORDS, ...given }
    const root = useRef<HTMLDivElement>(null)
    const pair = useRef<HTMLDivElement>(null)
    const ruler = useRef<HTMLDivElement>(null)
    const [fit, setFit] = useState(actions.length)
    const always = menu !== undefined && menu !== null && menu !== false
    useLayoutEffect(() => {
        const box = root.current
        const measure = ruler.current
        if (box === null || measure === null) return
        const update = () => {
            const boxes = [...measure.children] as HTMLElement[]
            const more = boxes.pop()?.offsetWidth ?? 0
            const widths = boxes.map((one) => one.offsetWidth)
            const fixed = pair.current === null ? 0 : pair.current.offsetWidth + GAP
            // More stands at the end whenever it holds entries of its own, so its room is kept.
            const room = box.clientWidth - fixed - (always ? more + GAP : 0)
            setFit(fitCount(widths, room, GAP, always ? 0 : more))
        }
        update()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(update)
        observer.observe(box)
        observer.observe(measure)
        return () => observer.disconnect()
    }, [actions.length, always])
    const inline = actions.slice(0, fit)
    const folded = actions.slice(fit)
    const liked = rating === 'like'
    const disliked = rating === 'dislike'
    return (
        <div
            ref={root}
            data-slot="media-actions"
            className={cn('relative flex min-w-0 flex-1 items-center gap-2 @2xl/channel:justify-end', className)}
        >
            {/* Every action and More at their own widths, out of sight, so what fits is known before it is drawn. */}
            <div
                ref={ruler}
                aria-hidden
                inert
                className="pointer-events-none invisible absolute top-0 left-0 flex h-0 w-max items-center gap-2 overflow-hidden"
            >
                {actions.map((action) => (
                    <div key={action.id} className="flex shrink-0 items-center">
                        <Inline action={action} />
                    </div>
                ))}
                <div className="flex shrink-0 items-center">{moreButton(words.more)}</div>
            </div>
            {onRatingChange !== undefined && (
                <ButtonGroup ref={pair} className="shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        aria-pressed={liked}
                        aria-label={likes === undefined ? words.like : `${words.like}: ${words.count(likes)}`}
                        title={words.like}
                        onClick={() => onRatingChange(liked ? null : 'like')}
                    >
                        <ThumbsUp className={cn(liked && 'fill-current')} aria-hidden />
                        {likes !== undefined && <span className="tabular-nums">{words.count(likes)}</span>}
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-pressed={disliked}
                        aria-label={words.dislike}
                        title={words.dislike}
                        onClick={() => onRatingChange(disliked ? null : 'dislike')}
                    >
                        <ThumbsDown className={cn(disliked && 'fill-current')} aria-hidden />
                    </Button>
                </ButtonGroup>
            )}
            {inline.map((action) => (
                <div key={action.id} className="flex shrink-0 items-center">
                    <Inline action={action} />
                </div>
            ))}
            {(folded.length > 0 || always) && (
                <DropdownMenu defaultOpen={defaultMoreOpen}>
                    <DropdownMenuTrigger render={moreButton(words.more)}>
                        <Ellipsis aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto min-w-48">
                        {folded.map((action) => (
                            <Entry key={action.id} action={action} />
                        ))}
                        {folded.length > 0 && always && <DropdownMenuSeparator />}
                        {menu}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )
}
