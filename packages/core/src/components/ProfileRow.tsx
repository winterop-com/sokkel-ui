import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { KindColor } from '../lib/kind'
import { Link } from './Link'
import { PersonAvatar } from './PersonAvatar'

export interface ProfileRowProps {
    name: string
    /** The short fact under the name. */
    detail?: ReactNode
    image?: string
    color?: KindColor
    /** Their own page, opened from the picture and the name. */
    href?: string
    /** `lg` heads the page about them: a large picture and the name as the page's title. */
    size?: 'md' | 'lg'
    /** Beside the name: Follow, Message. */
    action?: ReactNode
    /** At the row's end. */
    actions?: ReactNode
    className?: string
}

/**
 * Someone a page is about, in one line: their picture, their name over a short fact (followers,
 * a team, a role) and an action beside them, such as Follow. The picture is as tall as the two
 * lines, and the action is centered on them, so the row reads as one piece. `actions` at the row's
 * end hold whatever the page does with the thing itself (like, share, save) and wrap under on a
 * narrow row, as the action goes under the name where the two do not fit on a line. With `href` the
 * picture and the name open their own page; `size="lg"` heads that page, the name its title.
 */
export function ProfileRow({ name, detail, image, color, href, size = 'md', action, actions, className }: ProfileRowProps) {
    const large = size === 'lg'
    const Name = large ? 'h1' : 'span'
    const Who = href === undefined ? 'div' : Link
    return (
        <div data-slot="profile-row" className={cn('flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3', className)}>
            {/* The action goes under the name rather than cut it short, where the two do not fit on a line. */}
            <div className={cn('flex min-w-0 flex-wrap items-center', large ? 'gap-4' : 'gap-3')}>
                <Who
                    href={href}
                    className={cn(
                        'group/profile flex min-w-0 items-center',
                        large ? 'gap-4' : 'gap-3',
                        href !== undefined &&
                            'rounded-mini outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    )}
                >
                    <PersonAvatar name={name} image={image} color={color} size={large ? 'xl' : 'lg'} />
                    <div className="flex min-w-0 flex-col">
                        <Name
                            className={cn(
                                'truncate',
                                large ? 'text-page-title' : 'text-sm leading-5 font-medium',
                                href !== undefined && 'group-hover/profile:underline',
                            )}
                        >
                            {name}
                        </Name>
                        {detail !== undefined && (
                            <span className={cn('truncate text-muted-foreground', large ? 'text-help' : 'text-xs leading-4')}>
                                {detail}
                            </span>
                        )}
                    </div>
                </Who>
                {action !== undefined && <div className="ml-1 flex shrink-0 items-center">{action}</div>}
            </div>
            {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
