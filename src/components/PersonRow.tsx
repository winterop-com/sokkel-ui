import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { PersonAvatar } from './PersonAvatar'

/**
 * A person as a row names them: their picture, their username in the code face over a second line
 * (an email, a team), and an optional `aside` at the row's end, such as their role or a control
 * that changes it. `note` sits after the name in the quiet ink, for "(you)".
 */
export function PersonRow({
    name,
    detail,
    note,
    image,
    aside,
    className,
}: {
    name: string
    detail?: ReactNode
    /** A short word after the name, such as "(you)". */
    note?: ReactNode
    image?: string
    aside?: ReactNode
    className?: string
}) {
    return (
        <span className={cn('flex min-w-0 flex-1 items-center gap-3', className)}>
            <PersonAvatar name={name} image={image} />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-mono text-xs">
                    {name}
                    {note !== undefined && <span className="ml-1.5 font-sans text-muted-foreground">{note}</span>}
                </span>
                {detail !== undefined && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
            </span>
            {aside !== undefined && <span className="flex shrink-0 items-center text-xs text-muted-foreground">{aside}</span>}
        </span>
    )
}
