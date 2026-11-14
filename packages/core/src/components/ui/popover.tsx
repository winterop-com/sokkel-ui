import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cn } from '../../lib/cn'
import { POPUP } from '../../lib/popup'
import { returnFocusOnKeyboard } from '../../lib/focus'

export type PopoverProps = PopoverPrimitive.Root.Props

function Popover({ ...props }: PopoverProps) {
    return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

export type PopoverTriggerProps = PopoverPrimitive.Trigger.Props

function PopoverTrigger({ ...props }: PopoverTriggerProps) {
    return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

export type PopoverContentProps = PopoverPrimitive.Popup.Props &
    Pick<PopoverPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset' | 'anchor' | 'collisionPadding'>

function PopoverContent({
    className,
    align = 'center',
    alignOffset = 0,
    side = 'bottom',
    sideOffset = 4,
    anchor,
    collisionPadding,
    ...props
}: PopoverContentProps) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
                anchor={anchor}
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                collisionPadding={collisionPadding}
                className="isolate z-popover"
            >
                <PopoverPrimitive.Popup
                    data-slot="popover-content"
                    className={cn(
                        POPUP,
                        'z-popover flex w-72 origin-(--transform-origin) flex-col gap-2.5 p-2.5 text-sm outline-hidden duration-fast data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        className,
                    )}
                    finalFocus={returnFocusOnKeyboard}
                    {...props}
                />
            </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
    )
}

export type PopoverHeaderProps = React.ComponentProps<'div'>

function PopoverHeader({ className, ...props }: PopoverHeaderProps) {
    return <div data-slot="popover-header" className={cn('flex flex-col gap-0.5 text-sm', className)} {...props} />
}

export type PopoverTitleProps = PopoverPrimitive.Title.Props

function PopoverTitle({ className, ...props }: PopoverTitleProps) {
    return <PopoverPrimitive.Title data-slot="popover-title" className={cn('font-medium', className)} {...props} />
}

export type PopoverDescriptionProps = PopoverPrimitive.Description.Props

function PopoverDescription({ className, ...props }: PopoverDescriptionProps) {
    return <PopoverPrimitive.Description data-slot="popover-description" className={cn('text-muted-foreground', className)} {...props} />
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger }
