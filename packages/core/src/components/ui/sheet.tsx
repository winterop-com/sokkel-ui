import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { cn } from '../../lib/cn'

import { Button } from './button'
import { XIcon } from 'lucide-react'

export type SheetProps = SheetPrimitive.Root.Props

function Sheet({ ...props }: SheetProps) {
    return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

export type SheetTriggerProps = SheetPrimitive.Trigger.Props

function SheetTrigger({ ...props }: SheetTriggerProps) {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

export type SheetCloseProps = SheetPrimitive.Close.Props

function SheetClose({ ...props }: SheetCloseProps) {
    return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
    return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
    return (
        <SheetPrimitive.Backdrop
            data-slot="sheet-overlay"
            className={cn(
                'fixed inset-0 z-dialog bg-shade/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0',
                className,
            )}
            {...props}
        />
    )
}

export type SheetContentProps = SheetPrimitive.Popup.Props & {
    side?: 'top' | 'right' | 'bottom' | 'left'
    /** How wide a side sheet opens on a wide window; on a phone `md` and `lg` take the whole width. */
    size?: 'sm' | 'md' | 'lg' | 'xl'
    /** The parts sit against each other with no gap, for a header and a body that draw their own rule and padding. */
    flush?: boolean
    showCloseButton?: boolean
}

function SheetContent({
    className,
    children,
    side = 'right',
    size = 'sm',
    flush = false,
    showCloseButton = true,
    ...props
}: SheetContentProps) {
    return (
        <SheetPortal>
            <SheetOverlay />
            <SheetPrimitive.Popup
                data-slot="sheet-content"
                data-side={side}
                className={cn(
                    'fixed z-dialog flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-base ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
                    size === 'md' &&
                        'data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-md data-[side=right]:sm:max-w-md',
                    size === 'lg' &&
                        'data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl',
                    size === 'xl' &&
                        'data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-4xl data-[side=right]:sm:max-w-4xl',
                    flush && 'gap-0',
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <SheetPrimitive.Close
                        data-slot="sheet-close"
                        render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
                    >
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </SheetPrimitive.Close>
                )}
            </SheetPrimitive.Popup>
        </SheetPortal>
    )
}

export type SheetHeaderProps = React.ComponentProps<'div'>

function SheetHeader({ className, ...props }: SheetHeaderProps) {
    return <div data-slot="sheet-header" className={cn('flex flex-col gap-0.5 p-4', className)} {...props} />
}

export type SheetFooterProps = React.ComponentProps<'div'>

function SheetFooter({ className, ...props }: SheetFooterProps) {
    return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
}

export type SheetTitleProps = SheetPrimitive.Title.Props

function SheetTitle({ className, ...props }: SheetTitleProps) {
    return (
        <SheetPrimitive.Title
            data-slot="sheet-title"
            className={cn('font-heading text-detail-title text-foreground', className)}
            {...props}
        />
    )
}

export type SheetDescriptionProps = SheetPrimitive.Description.Props

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
    return (
        <SheetPrimitive.Description data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
    )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
