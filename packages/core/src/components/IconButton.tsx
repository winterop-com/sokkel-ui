import { useId, type ComponentProps, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Button } from './ui/button'
import { Kbd } from './ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export type IconButtonProps = Omit<
    ComponentProps<typeof Button>,
    'children' | 'size' | 'aria-label' | 'aria-pressed' | 'reason' | 'reasonSide'
> & {
    /** What the button does, said by its tooltip and its accessible name. */
    label: string
    /** A sentence the tooltip says in place of the label, where the short name needs more said. */
    tooltip?: ReactNode
    /** The key that does the same, drawn as a key in the tooltip, such as `shortcutLabel('e')`. */
    shortcut?: string
    /** For an action that destroys: the critical tint under the pointer. */
    destructive?: boolean
    /** The icon. */
    children: ReactNode
    size?: 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg'
    /** On or off, for a button that toggles; leave it out for one that acts. */
    pressed?: boolean
    /** Which side the tooltip opens on. */
    side?: 'top' | 'bottom' | 'left' | 'right'
    /** Why the button cannot be pressed now; given, the button is disabled and its tooltip says it, a tap showing it too. */
    reason?: ReactNode
}

/**
 * A button that shows only an icon. Its label is its accessible name and its tooltip, so the two
 * never drift apart. A ghost button draws its icon in the quiet ink until hovered; `pressed` marks
 * a toggle as on, filled as a pressed toggle is everywhere else. `reason` disables the button and
 * adds why to its tooltip, under the label, and to its description (`aria-describedby`) for a
 * screen reader; the button stays focusable so the reason can be read, and a tap by touch or pen
 * shows the tooltip, as a shut `Button`'s does.
 * `tooltip` gives the tooltip a longer sentence than the name, `shortcut` draws the key that does
 * the same beside it, and `destructive` tints a button that deletes in the critical tone under the
 * pointer.
 */
export function IconButton({
    label,
    tooltip,
    shortcut,
    destructive = false,
    children,
    variant = 'ghost',
    size = 'icon-sm',
    pressed,
    side = 'top',
    reason,
    disabled,
    className,
    ...props
}: IconButtonProps) {
    const held = reason !== undefined && reason !== null && reason !== false
    const reasonId = useId()
    const said = tooltip ?? label
    // `aria-pressed` reaches here through the spread despite the type; `pressed` wins, and it stands in.
    const given = (props as { 'aria-pressed'?: boolean | 'true' | 'false' | 'mixed' })['aria-pressed']
    const on = pressed ?? (given === undefined ? undefined : given === true || given === 'true')
    const shown = (
        <Tooltip tap={held}>
            <TooltipTrigger
                render={
                    <Button
                        {...props}
                        aria-describedby={
                            held ? [props['aria-describedby'], reasonId].filter(Boolean).join(' ') : props['aria-describedby']
                        }
                        variant={variant}
                        size={size}
                        aria-label={label}
                        aria-pressed={on}
                        disabled={held || disabled}
                        focusableWhenDisabled={held || props.focusableWhenDisabled}
                        destructiveHover={destructive || props.destructiveHover}
                        className={cn(variant === 'ghost' && 'text-muted-foreground', on === true && 'bg-muted text-foreground', className)}
                    />
                }
            >
                {children}
            </TooltipTrigger>
            <TooltipContent side={side}>
                {held ? (
                    <span className="flex flex-col">
                        <span className="font-medium">{said}</span>
                        <span>{reason}</span>
                    </span>
                ) : (
                    said
                )}
                {shortcut !== undefined && <Kbd>{shortcut}</Kbd>}
            </TooltipContent>
        </Tooltip>
    )
    if (!held) return shown
    return (
        <>
            {shown}
            {/* The reason unseen and always drawn, for the description to point at, as `Button` keeps its own. */}
            <span id={reasonId} aria-hidden className="sr-only">
                {reason}
            </span>
        </>
    )
}
