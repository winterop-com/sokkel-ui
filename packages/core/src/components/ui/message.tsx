import * as React from 'react'
import { cn } from '../../lib/cn'

export type MessageGroupProps = React.ComponentProps<'div'>

function MessageGroup({ className, ...props }: MessageGroupProps) {
    return <div data-slot="message-group" className={cn('flex min-w-0 flex-col gap-2', className)} {...props} />
}

export type MessageProps = React.ComponentProps<'div'> & { align?: 'start' | 'end' }

function Message({ className, align = 'start', ...props }: MessageProps) {
    return (
        <div
            data-slot="message"
            data-align={align}
            className={cn('group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse', className)}
            {...props}
        />
    )
}

export type MessageAvatarProps = React.ComponentProps<'div'>

function MessageAvatar({ className, ...props }: MessageAvatarProps) {
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

export type MessageContentProps = React.ComponentProps<'div'>

function MessageContent({ className, ...props }: MessageContentProps) {
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

export type MessageHeaderProps = React.ComponentProps<'div'> & { variant?: 'default' | 'speaker' }

/**
 * The line over a message. `speaker` names who speaks, in the body size and ink and flush with the
 * content, for a turn that has no bubble to start it.
 */
function MessageHeader({ className, variant = 'default', ...props }: MessageHeaderProps) {
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

export type MessageFooterProps = React.ComponentProps<'div'> & { variant?: 'default' | 'actions' }

/**
 * The line under a message. `actions` holds a row of buttons such as Copy and Try again, flush with
 * the content, wrapping when narrow, and a finger wide each on a touch screen.
 */
function MessageFooter({ className, variant = 'default', ...props }: MessageFooterProps) {
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
