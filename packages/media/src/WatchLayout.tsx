import type { ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'

export interface WatchLayoutProps {
    /** The player, such as `VideoPlayer`. */
    player: ReactNode
    /** What stands under the player: the title, the channel, the description and the comments. */
    children?: ReactNode
    /** What stands beside them, such as what plays next. */
    aside?: ReactNode
    /** Spans the player across the aside's column too, no taller than the window, the aside starting under it. */
    theater?: boolean
    className?: string
}

/**
 * A watch page: the player, what is under it, and an aside beside both, such as what plays next.
 * On a wide page the aside stands to the right of the player and runs down beside what is under
 * it; in `theater` the player spans the aside's column too, as tall as the window lets it be, and
 * the aside starts under it. On a narrow page the three stack, the aside last. The width is the
 * page's own, measured on the layout, and the player keeps its place in the page as the layout
 * changes, so a video plays on through it.
 */
export function WatchLayout({ player, children, aside, theater = false, className }: WatchLayoutProps) {
    const beside = aside !== undefined && aside !== null && aside !== false
    return (
        <div data-slot="watch-layout" className={cn('@container/watch min-w-0', className)}>
            <div
                className={cn(
                    'grid min-w-0 grid-cols-1 gap-x-6 gap-y-5',
                    beside && '@4xl/watch:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] @4xl/watch:grid-rows-[auto_1fr]',
                )}
            >
                <div
                    className={cn(
                        'min-w-0',
                        // In theater the player is as wide as the page while its height fits the window, centered.
                        theater && 'w-full justify-self-center @4xl/watch:max-w-[calc((100svh-9rem)*16/9)]',
                        beside && theater && '@4xl/watch:col-span-2',
                    )}
                >
                    {player}
                </div>
                <div className={cn('min-w-0', beside && '@4xl/watch:col-start-1 @4xl/watch:row-start-2')}>{children}</div>
                {beside && (
                    <aside
                        className={cn(
                            'min-w-0 @4xl/watch:col-start-2',
                            theater ? '@4xl/watch:row-start-2' : '@4xl/watch:row-span-2 @4xl/watch:row-start-1',
                        )}
                    >
                        {aside}
                    </aside>
                )}
            </div>
        </div>
    )
}
