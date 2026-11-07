import * as React from 'react'
import { cn } from '../../lib/cn'

function MessageGroup({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="message-group" className={cn('flex min-w-0 flex-col gap-2', className)} {...props} />
}

function Message({ className, align = 'start', ...props }: React.ComponentProps<'div'> & { align?: 'start' | 'end' }) {
    return (
        <div
            data-slot="message"
            data-align={align}
            className={cn('group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse', className)}
            {...props}
        />
    )
}

function MessageAvatar({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="message-avatar"
            className={cn(
                'flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted group-has-data-[slot=message-footer]/message:-translate-y-8',
                className,
            )}
            {...props}
        />
    )
}

function MessageContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="message-content"
            className={cn(
                'flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end',
                className,
            )}
            {...props}
        />
    )
}

/**
 * The line over a message. `speaker` names who speaks, in the body size and ink and flush with the
 * content, for a turn that has no bubble to start it.
 */
function MessageHeader({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & { variant?: 'default' | 'speaker' }) {
    return (
        <div
            data-slot="message-header"
            data-variant={variant}
            className={cn(
                'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 data-[variant=speaker]:gap-2 data-[variant=speaker]:px-0 data-[variant=speaker]:text-sm data-[variant=speaker]:text-foreground',
                className,
            )}
            {...props}
        />
    )
}

/**
 * The line under a message. `actions` holds a row of buttons such as Copy and Try again, flush with
 * the content, wrapping when narrow, and a finger wide each on a touch screen.
 */
function MessageFooter({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & { variant?: 'default' | 'actions' }) {
    return (
        <div
            data-slot="message-footer"
            data-variant={variant}
            className={cn(
                'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end data-[variant=actions]:flex-wrap data-[variant=actions]:gap-2 data-[variant=actions]:px-0 pointer-coarse:data-[variant=actions]:*:data-[slot=button]:min-h-finger pointer-coarse:data-[variant=actions]:*:data-[slot=button]:min-w-finger',
                className,
            )}
            {...props}
        />
    )
}

export { MessageGroup, Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader }
