import { useRef, type ReactNode } from 'react'

import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Spinner } from './ui/spinner'
import { cn } from '../lib/cn'
import type { IssueEntry } from './IssueMark'
import { IssueMarks } from './IssueMarks'

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
    /** Working: the verb spins, and nothing closes the dialog until it is done. */
    busy?: boolean
    busyLabel?: string
    destructive?: boolean
}

export interface DialogShellWords {
    cancel: string
    back: string
}

const WORDS: DialogShellWords = { cancel: 'Cancel', back: 'Back' }

/** Dims a dialog while another is open on top of it. */
export const NESTED =
    'data-nested-dialog-open:after:pointer-events-none data-nested-dialog-open:after:absolute data-nested-dialog-open:after:inset-0 data-nested-dialog-open:after:rounded-[inherit] data-nested-dialog-open:after:bg-shade/40'

/** What the dialog focuses first when it opens: the first field in its body, ahead of the header. */
const FIELD = [
    'input:not([disabled]):not([type=hidden]):not([type=file]):not([aria-hidden=true]):not([tabindex="-1"])',
    'textarea:not([disabled])',
    'select:not([disabled])',
].join(', ')

/**
 * Every dialog's frame: a title (and an optional line under it), the body that scrolls when it
 * is taller than the window, and a footer with Cancel and the one confirming verb at the right.
 *
 * On a phone the dialog is a full-screen sheet with its footer held to the bottom, so the verbs
 * are always in reach. A shut confirm stays focusable and carries its reason as a tooltip rather
 * than going dead. Opening focuses the first field in the body. While the confirm is busy, Cancel, Back, Escape and the backdrop do nothing.
 */
export function DialogShell({
    open,
    onOpenChange,
    width = 'md',
    title,
    description,
    header,
    confirm,
    back,
    actions,
    dismissible = true,
    footer,
    count,
    marks,
    children,
    className,
    words: given,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    width?: keyof typeof WIDTHS
    title: ReactNode
    description?: ReactNode
    /** Held under the title, outside the scrolling body: a step indicator, a tab bar. */
    header?: ReactNode
    confirm?: DialogConfirm
    /** Draws Back before the confirm, for a dialog of steps. */
    back?: () => void
    /** More buttons, between Cancel and the confirm: a second way to finish. */
    actions?: ReactNode
    /** When false there is no Cancel, and Escape and the backdrop leave the dialog open. */
    dismissible?: boolean
    /** Something at the footer's left: a note, a secondary link. */
    footer?: ReactNode
    /** The form's `IssueCount`, set just before the verbs it stops. */
    count?: ReactNode
    /** The form's issues, marked on a strip beside the body when it scrolls (`IssueMarks`). */
    marks?: readonly IssueEntry[]
    children?: ReactNode
    className?: string
    words?: Partial<DialogShellWords>
}) {
    const words = { ...WORDS, ...given }
    const busy = confirm?.busy === true
    const shut = confirm?.why !== undefined || busy
    const held = busy || !dismissible
    const body = useRef<HTMLDivElement>(null)
    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && held) return
                onOpenChange(next)
            }}
        >
            <DialogContent
                showCloseButton={confirm === undefined && dismissible}
                initialFocus={() => body.current?.querySelector<HTMLElement>(FIELD) ?? true}
                aria-busy={busy || undefined}
                className={cn(
                    'flex max-h-[calc(100svh-4rem)] flex-col gap-4',
                    WIDTHS[width],
                    NESTED,
                    'max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
                    className,
                )}
            >
                <DialogHeader className={confirm === undefined && dismissible ? 'pr-8' : undefined}>
                    <DialogTitle className="text-base leading-6 font-medium">{title}</DialogTitle>
                    {description !== undefined && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {header}
                {children !== undefined && (
                    <div className="-mx-4 flex min-h-0 flex-1">
                        <div ref={body} className="min-w-0 flex-1 space-y-4 overflow-y-auto px-4">
                            {children}
                        </div>
                        {marks !== undefined && <IssueMarks scroller={body} list={marks} />}
                    </div>
                )}
                {confirm !== undefined && (
                    <DialogFooter className="mt-auto items-center">
                        {footer !== undefined && <div className="mr-auto min-w-0 text-xs text-muted-foreground">{footer}</div>}
                        {count}
                        {dismissible && (
                            <DialogClose render={<Button variant="ghost" />} disabled={busy}>
                                {words.cancel}
                            </DialogClose>
                        )}
                        {back !== undefined && (
                            <Button variant="outline" disabled={busy} onClick={back}>
                                {words.back}
                            </Button>
                        )}
                        {actions}
                        <Button
                            variant={confirm.destructive === true ? 'destructive' : 'default'}
                            aria-disabled={shut || undefined}
                            title={confirm.why}
                            className={cn(
                                shut && 'cursor-not-allowed',
                                confirm.why !== undefined && 'opacity-50',
                                busy && 'cursor-progress',
                            )}
                            onClick={shut ? undefined : confirm.onConfirm}
                        >
                            {busy && <Spinner aria-hidden role={undefined} aria-label={undefined} />}
                            {busy ? (confirm.busyLabel ?? confirm.label) : confirm.label}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

/**
 * A question with one answer to confirm: the title is the question ("Delete import-orders?"),
 * there is no body unless one is given, and a destructive answer is drawn as one.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    question,
    detail,
    confirm,
    children,
    words,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    question: ReactNode
    /** One line on what the answer does, where the question does not say it. */
    detail?: ReactNode
    confirm: DialogConfirm
    /** What the answer touches, when one line cannot say it: a list of what goes with it. */
    children?: ReactNode
    words?: Partial<DialogShellWords>
}) {
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="sm"
            title={question}
            description={detail}
            confirm={confirm}
            words={words}
        >
            {children}
        </DialogShell>
    )
}
