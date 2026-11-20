import type { ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@winterop-com/sokkel-ui/primitives/tooltip'

import type { MapCorner } from './context'

export interface ControlButtonProps {
    label: string
    /** The element its tooltip is drawn in, so it shows in full screen too. */
    container: HTMLElement | null
    onClick: () => void
    /** Drawn pressed, for a tool that is on. */
    pressed?: boolean
    /** The corner the button stands in, which its tooltip opens away from; the top right by default. */
    corner?: MapCorner
    children: ReactNode
}

/** One of the map's own buttons, in the library's look, with its name as a tooltip. */
export function ControlButton({ label, container, onClick, pressed, corner = 'top-right', children }: ControlButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={label}
                        aria-pressed={pressed}
                        className={cn(
                            'bg-card text-foreground shadow-surface hover:bg-hover dark:bg-card',
                            pressed === true && 'border-primary bg-accent text-accent-foreground hover:bg-accent dark:bg-accent',
                        )}
                        onClick={onClick}
                    />
                }
            >
                {children}
            </TooltipTrigger>
            <TooltipContent side={corner.endsWith('left') ? 'right' : 'left'} container={container}>
                {label}
            </TooltipContent>
        </Tooltip>
    )
}
