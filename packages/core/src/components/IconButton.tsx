import type { ComponentProps, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/**
 * A button that shows only an icon. Its label is its accessible name and its tooltip, so the two
 * never drift apart. A ghost button draws its icon in the quiet ink until hovered; `pressed` marks
 * a toggle as on, filled as a pressed toggle is everywhere else.
 */
export function IconButton({
    label,
    children,
    variant = 'ghost',
    size = 'icon-sm',
    pressed,
    side = 'top',
    className,
    ...props
}: Omit<ComponentProps<typeof Button>, 'children' | 'size' | 'aria-label' | 'aria-pressed'> & {
    /** What the button does, said by its tooltip and its accessible name. */
    label: string
    /** The icon. */
    children: ReactNode
    size?: 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg'
    /** On or off, for a button that toggles; leave it out for one that acts. */
    pressed?: boolean
    /** Which side the tooltip opens on. */
    side?: 'top' | 'bottom' | 'left' | 'right'
}) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        {...props}
                        variant={variant}
                        size={size}
                        aria-label={label}
                        aria-pressed={pressed}
                        className={cn(
                            variant === 'ghost' && 'text-muted-foreground',
                            pressed === true && 'bg-muted text-foreground',
                            className,
                        )}
                    />
                }
            >
                {children}
            </TooltipTrigger>
            <TooltipContent side={side}>{label}</TooltipContent>
        </Tooltip>
    )
}
