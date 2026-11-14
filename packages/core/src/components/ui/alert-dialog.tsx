import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { cn } from '../../lib/cn'

import { Button } from './button'

export type AlertDialogProps = AlertDialogPrimitive.Root.Props

function AlertDialog({ ...props }: AlertDialogProps) {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

export type AlertDialogTriggerProps = AlertDialogPrimitive.Trigger.Props

function AlertDialogTrigger({ ...props }: AlertDialogTriggerProps) {
    return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

export type AlertDialogPortalProps = AlertDialogPrimitive.Portal.Props

function AlertDialogPortal({ ...props }: AlertDialogPortalProps) {
    return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

export type AlertDialogOverlayProps = AlertDialogPrimitive.Backdrop.Props

function AlertDialogOverlay({ className, ...props }: AlertDialogOverlayProps) {
    return (
        <AlertDialogPrimitive.Backdrop
            data-slot="alert-dialog-overlay"
            className={cn(
                'fixed inset-0 isolate z-dialog bg-shade/10 duration-fast data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
                className,
            )}
            {...props}
        />
    )
}

export type AlertDialogContentProps = AlertDialogPrimitive.Popup.Props & {
    size?: 'default' | 'sm'
}

function AlertDialogContent({ className, size = 'default', ...props }: AlertDialogContentProps) {
    return (
        <AlertDialogPortal>
            <AlertDialogOverlay />
            <AlertDialogPrimitive.Popup
                data-slot="alert-dialog-content"
                data-size={size}
                className={cn(
                    'group/alert-dialog-content fixed top-1/2 left-1/2 z-dialog grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-surface border border-border-strong bg-popover p-4 text-popover-foreground shadow-dialog duration-fast outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                    className,
                )}
                {...props}
            />
        </AlertDialogPortal>
    )
}

export type AlertDialogHeaderProps = React.ComponentProps<'div'>

function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
    return (
        <div
            data-slot="alert-dialog-header"
            className={cn(
                'grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]',
                className,
            )}
            {...props}
        />
    )
}

export type AlertDialogFooterProps = React.ComponentProps<'div'>

function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
    return (
        <div
            data-slot="alert-dialog-footer"
            className={cn(
                '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-surface border-t bg-muted/50 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end',
                className,
            )}
            {...props}
        />
    )
}

export type AlertDialogMediaProps = React.ComponentProps<'div'>

function AlertDialogMedia({ className, ...props }: AlertDialogMediaProps) {
    return (
        <div
            data-slot="alert-dialog-media"
            className={cn(
                "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
                className,
            )}
            {...props}
        />
    )
}

export type AlertDialogTitleProps = React.ComponentProps<typeof AlertDialogPrimitive.Title>

function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
    return (
        <AlertDialogPrimitive.Title
            data-slot="alert-dialog-title"
            className={cn(
                'font-heading text-detail-title sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2',
                className,
            )}
            {...props}
        />
    )
}

export type AlertDialogDescriptionProps = React.ComponentProps<typeof AlertDialogPrimitive.Description>

function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
    return (
        <AlertDialogPrimitive.Description
            data-slot="alert-dialog-description"
            className={cn(
                'text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
                className,
            )}
            {...props}
        />
    )
}

export type AlertDialogActionProps = React.ComponentProps<typeof Button>

function AlertDialogAction({ className, ...props }: AlertDialogActionProps) {
    return <Button data-slot="alert-dialog-action" className={cn(className)} {...props} />
}

export type AlertDialogCancelProps = AlertDialogPrimitive.Close.Props & Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>

function AlertDialogCancel({ className, variant = 'outline', size = 'default', ...props }: AlertDialogCancelProps) {
    return (
        <AlertDialogPrimitive.Close
            data-slot="alert-dialog-cancel"
            className={cn(className)}
            render={<Button variant={variant} size={size} />}
            {...props}
        />
    )
}

export {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
    AlertDialogTrigger,
}
