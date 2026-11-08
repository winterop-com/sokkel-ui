import { MoreHorizontal, Play, Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'

export interface MediaCardWords {
    play: string
    playing: string
    menu: string
    watched: (percent: number) => string
}

const WORDS: MediaCardWords = {
    play: 'Play',
    playing: 'Now playing',
    menu: 'More actions',
    watched: (percent) => `${String(percent)}% watched`,
}

/**
 * One album, film or episode in a grid: the cover first, then its title and a line under it. The
 * whole card opens it; a play button rises over the cover on hover and on focus. A square cover is
 * an album, a wide one a video, which can carry its length on the frame and how much of it was
 * watched along the foot of the frame, and gets up to two lines for its title. The words take the
 * height they need, so a short title leaves no gap under a card alone in its row; cards sharing a
 * grid row still line up, the row as tall as its tallest card. The full title shows on
 * hover over the card. `layout="row"` sets the cover beside the words, as a list of
 * what plays next does, with the title on up to two lines.
 */
export function MediaCard({
    title,
    subtitle,
    cover,
    shape = 'square',
    layout = 'stack',
    href,
    onSelect,
    onPlay,
    playing = false,
    badge,
    progress,
    menu,
    className,
    words = WORDS,
}: {
    title: string
    /** Who made it, and when, or which episode it is. */
    subtitle?: ReactNode
    /** The artwork, which fills the frame. */
    cover: ReactNode
    shape?: 'square' | 'wide'
    /** The cover above the words, or beside them at `coverWidth`. */
    layout?: 'stack' | 'row'
    href?: string
    onSelect?: () => void
    /** Plays it without opening it; the button shows only when this is given. */
    onPlay?: () => void
    /** Marks the one playing now. */
    playing?: boolean
    /** A short mark on the frame's corner, such as the length of a video. */
    badge?: ReactNode
    /** How much was watched or heard, from 0 to 1. */
    progress?: number
    /** Items for the card's menu. */
    menu?: ReactNode
    className?: string
    words?: MediaCardWords
}) {
    const Cover = href !== undefined ? 'a' : 'button'
    const interactive = href !== undefined || onSelect !== undefined
    const watched = progress === undefined ? undefined : Math.round(Math.min(1, Math.max(0, progress)) * 100)
    return (
        <article
            className={cn(
                'group/media relative flex min-w-0',
                layout === 'row' ? 'flex-row items-start gap-3' : 'flex-col gap-2.5',
                className,
            )}
        >
            {interactive && (
                <Cover
                    {...(href !== undefined ? { href } : { type: 'button' as const, onClick: onSelect })}
                    title={title}
                    className="absolute inset-0 z-0 rounded-surface outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <span className="sr-only">{title}</span>
                </Cover>
            )}
            <div
                className={cn(
                    'pointer-events-none relative overflow-hidden rounded-surface bg-muted ring-1 ring-border transition-shadow [&>svg]:block [&>svg]:size-full',
                    shape === 'square' ? 'aspect-square' : 'aspect-video',
                    layout === 'row' && 'w-40 shrink-0',
                    interactive && 'group-hover/media:shadow-pop',
                )}
            >
                {cover}
                {badge !== undefined && (
                    <span
                        className={cn(
                            'absolute right-1.5 rounded-mini bg-shade/70 px-1.5 py-0.5 font-mono text-xs leading-4 text-on-shade tabular-nums',
                            watched !== undefined && watched > 0 ? 'bottom-2.5' : 'bottom-1.5',
                        )}
                    >
                        {badge}
                    </span>
                )}
                {playing && (
                    <span
                        className={cn(
                            'absolute flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pop',
                            shape === 'square' ? 'right-2 bottom-2' : 'top-2 left-2',
                        )}
                    >
                        <Volume2 className="size-4" aria-label={words.playing} />
                    </span>
                )}
                {onPlay !== undefined && !playing && (
                    <button
                        type="button"
                        onClick={onPlay}
                        aria-label={`${words.play}: ${title}`}
                        title={words.play}
                        className={cn(
                            'pointer-events-auto absolute z-10 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-pop transition-opacity outline-none group-focus-within/media:opacity-100 group-hover/media:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                            shape === 'square' ? 'right-2 bottom-2' : 'top-1/2 left-1/2 -translate-1/2',
                        )}
                    >
                        <Play className="size-4 translate-x-px fill-current" aria-hidden />
                    </button>
                )}
                {watched !== undefined && watched > 0 && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-shade/40" role="img" aria-label={words.watched(watched)}>
                        <span className="block h-full bg-primary" style={{ width: `${String(watched)}%` }} />
                    </span>
                )}
            </div>
            <div className={cn('pointer-events-none flex min-w-0 items-start gap-1', layout === 'row' && 'flex-1')}>
                <div className="flex min-w-0 flex-1 flex-col">
                    <h3
                        className={cn(
                            'text-sm leading-5 font-medium',
                            layout === 'row' || shape === 'wide' ? 'line-clamp-2' : 'truncate',
                            playing && 'text-primary-ink',
                        )}
                        title={title}
                    >
                        {title}
                    </h3>
                    {subtitle !== undefined && (
                        <p className={cn('text-xs leading-5 text-muted-foreground', layout === 'stack' && 'truncate')}>{subtitle}</p>
                    )}
                </div>
                {menu !== undefined && (
                    <div className="pointer-events-auto relative z-10 -mr-1.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                aria-label={`${words.menu}: ${title}`}
                                title={words.menu}
                                className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                            >
                                <MoreHorizontal className="size-4" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                {menu}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        </article>
    )
}

/** Media cards in a grid that fills its width: as many columns as fit, covers at least `min` wide. */
export function MediaGrid({
    shape = 'square',
    min,
    label,
    className,
    children,
}: {
    shape?: 'square' | 'wide'
    /** The narrowest a card is drawn, as a CSS length. */
    min?: string
    /** What the grid holds, for a screen reader. */
    label?: string
    className?: string
    children: ReactNode
}) {
    const narrowest = min ?? (shape === 'square' ? '9.5rem' : '15rem')
    return (
        <div
            role={label === undefined ? undefined : 'region'}
            aria-label={label}
            className={cn('grid gap-x-5 gap-y-6', className)}
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${narrowest}, 100%), 1fr))` }}
        >
            {children}
        </div>
    )
}
