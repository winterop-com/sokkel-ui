import type { ReactNode } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A part shown with a small caption naming the variant or state it is in: above it, or under it
 * with `below` for a part that reads first, such as a badge or an avatar.
 */
export function Specimen({
    label,
    below = false,
    className,
    children,
}: {
    label: string
    below?: boolean
    className?: string
    children: ReactNode
}) {
    const caption = <p className="text-xs text-muted-foreground">{label}</p>
    return (
        <Stack gap="sm" align="start" className={className}>
            {!below && caption}
            {children}
            {below && caption}
        </Stack>
    )
}
