import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { KindColor } from '../lib/kind'
import { PersonAvatar } from './PersonAvatar'

export interface ProfileRowProps {
    name: string
    /** The short fact under the name. */
    detail?: ReactNode
    image?: string
    color?: KindColor
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
 * narrow row.
 */
export function ProfileRow({ name, detail, image, color, action, actions, className }: ProfileRowProps) {
    return (
        <div data-slot="profile-row" className={cn('flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3', className)}>
            <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar name={name} image={image} color={color} size="lg" />
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm leading-5 font-medium">{name}</span>
                    {detail !== undefined && <span className="truncate text-xs leading-4 text-muted-foreground">{detail}</span>}
                </div>
                {action !== undefined && <div className="ml-1 flex shrink-0 items-center">{action}</div>}
            </div>
            {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
