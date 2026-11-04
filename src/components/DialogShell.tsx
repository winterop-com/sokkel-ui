import type { ReactNode } from 'react'

import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { cn } from '../lib/cn'

const WIDTHS = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
} as const

/** The one verb a dialog confirms with. */
export interface DialogConfirm {
    label: string
    onConfirm: () => void
    /** Why it cannot be pressed now; the button stays focusable and says so on hover. */
    why?: string
    busy?: boolean
    busyLabel?: string
    destructive?: boolean
}

/**
 * Every dialog's frame: a title (and an optional line under it), the body that scrolls when it
 * is taller than the window, and a footer with Cancel and the one confirming verb at the right.
 *
 * On a phone the dialog is a full-screen sheet with its footer held to the bottom, so the verbs
 * are always in reach. A shut confirm stays focusable and carries its reason as a tooltip rather
 * than going dead.
 */
export function DialogShell({
    open,
    onOpenChange,
    width = 'md',
    title,
    description,
    confirm,
    footer,
    children,
    words = { cancel: 'Cancel' },
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    width?: keyof typeof WIDTHS
    title: ReactNode
    description?: ReactNode
    confirm?: DialogConfirm
    /** Something at the footer's left: a note, a secondary link. */
    footer?: ReactNode
    children?: ReactNode
    words?: { cancel: string }
}) {
    const shut = confirm?.why !== undefined || confirm?.busy === true
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={confirm === undefined}
                className={cn(
                    'flex max-h-[calc(100svh-4rem)] flex-col gap-4',
                    WIDTHS[width],
                    'max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
                )}
            >
                <DialogHeader className={confirm === undefined ? 'pr-8' : undefined}>
                    <DialogTitle className="text-base leading-6 font-medium">{title}</DialogTitle>
                    {description !== undefined && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {children !== undefined && <div className="-mx-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-4">{children}</div>}
                {confirm !== undefined && (
                    <DialogFooter className="mt-auto items-center">
                        {footer !== undefined && <div className="mr-auto min-w-0 text-xs text-muted-foreground">{footer}</div>}
                        <DialogClose render={<Button variant="ghost" />}>{words.cancel}</DialogClose>
                        <Button
                            variant={confirm.destructive === true ? 'destructive' : 'default'}
                            aria-disabled={shut || undefined}
                            title={confirm.why}
                            className={cn(shut && 'cursor-not-allowed opacity-50')}
                            onClick={shut ? undefined : confirm.onConfirm}
                        >
                            {confirm.busy === true ? (confirm.busyLabel ?? confirm.label) : confirm.label}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

/**
 * A question with one answer to confirm: the title is the question ("Delete weather-gate?"),
 * there is no body, and a destructive answer is drawn as one.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    question,
    detail,
    confirm,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    question: ReactNode
    /** One line on what the answer does, where the question does not say it. */
    detail?: ReactNode
    confirm: DialogConfirm
}) {
    return <DialogShell open={open} onOpenChange={onOpenChange} width="sm" title={question} description={detail} confirm={confirm} />
}
