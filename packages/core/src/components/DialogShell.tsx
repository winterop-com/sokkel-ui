import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Spinner } from './ui/spinner'
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

/** Which of the frame's parts a dialog draws, from what it was given. */
export function shellParts({
    confirm,
    actions,
    footer,
    dismissible = true,
}: Pick<DialogShellProps, 'confirm' | 'actions' | 'footer' | 'dismissible'>): { close: boolean; footer: boolean; cancel: boolean } {
    const confirms = confirm !== undefined
    return {
        close: !confirms && dismissible,
        footer: confirms || actions !== undefined || footer !== undefined,
        cancel: confirms && dismissible,
    }
}

export interface DialogShellProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    width?: keyof typeof WIDTHS
    /** On a phone: `sheet` covers the screen, for a form; `fit` is sized to its content inside the screen's margins, for a short question. */
    phone?: 'sheet' | 'fit'
    title: ReactNode
    description?: ReactNode
    /** Held under the title, outside the scrolling body: a step indicator, a tab bar. */
    header?: ReactNode
    confirm?: DialogConfirm
    /** Draws Back before the confirm, for a dialog of steps. */
    back?: () => void
    /**
     * More buttons, between Cancel and the confirm: a second way to finish. Without a confirm they
     * are the footer's only verbs (Copy, Download), with no Cancel, the corner's close closing.
     */
    actions?: ReactNode
    /** When false there is no Cancel, and Escape and the backdrop leave the dialog open. */
    dismissible?: boolean
    /** When false a press outside leaves the dialog open, while Cancel, the close and Escape still close it. */
    closeOnOutsidePress?: boolean
    /** The element focused when the dialog opens, in place of the first field in the body. */
    initialFocus?: RefObject<HTMLElement | null>
    /** Something at the footer's left: a note, a secondary link. */
    footer?: ReactNode
    /** The form's `IssueCount`, set just before the verbs it stops. */
    count?: ReactNode
    children?: ReactNode
    className?: string
    words?: Partial<DialogShellWords>
}

/**
 * Every dialog's frame: a title (and an optional line under it), the body that scrolls when it
 * is taller than the window, and a footer with Cancel and the one confirming verb at the right.
 *
 * On a phone the dialog is a full-screen sheet with its footer held to the bottom, so the verbs
 * are always in reach; `phone="fit"` keeps a short one sized to its content inside the screen's
 * margins instead, as a confirm is. The verbs stand in a row at the right while they fit it, and
 * each takes the whole width, the confirm on top, once they do not. A shut confirm stays focusable and carries its reason as a tooltip rather
 * than going dead. Opening focuses the first field in the body, or `initialFocus`. While the confirm is busy, Cancel, Back, Escape and the backdrop do nothing.
 *
 * A dialog with nothing to confirm, one thing to read, closes from the corner; its `actions` (Copy,
 * Download) stand alone in the footer, with no Cancel.
 */
export function DialogShell({
    open,
    onOpenChange,
    width = 'md',
    phone = 'sheet',
    title,
    description,
    header,
    confirm,
    back,
    actions,
    dismissible = true,
    closeOnOutsidePress = true,
    initialFocus,
    footer,
    count,
    children,
    className,
    words: given,
}: DialogShellProps) {
    const parts = shellParts({ confirm, actions, footer, dismissible })
    const words = { ...WORDS, ...given }
    const busy = confirm?.busy === true
    const shut = confirm?.why !== undefined || busy
    const held = busy || !dismissible
    const body = useRef<HTMLDivElement>(null)
    // A dialog drawn open from its first render asks for its first field before its body is there,
    // and the popup takes focus; this moves it on to the field once the body is drawn.
    useEffect(() => {
        if (!open || initialFocus !== undefined) return
        const frame = requestAnimationFrame(() => {
            const field = body.current?.querySelector<HTMLElement>(FIELD)
            if (field != null && !body.current?.contains(document.activeElement)) field.focus()
        })
        return () => cancelAnimationFrame(frame)
    }, [open, initialFocus])
    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && held) return
                onOpenChange(next)
            }}
            disablePointerDismissal={!closeOnOutsidePress}
        >
            <DialogContent
                showCloseButton={parts.close}
                initialFocus={initialFocus ?? (() => body.current?.querySelector<HTMLElement>(FIELD) ?? true)}
                aria-busy={busy || undefined}
                className={cn(
                    'flex max-h-[calc(100svh-4rem)] flex-col gap-4',
                    WIDTHS[width],
                    NESTED,
                    phone === 'sheet' &&
                        'max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
                    className,
                )}
            >
                <DialogHeader className={parts.close ? 'pr-8' : undefined}>
                    <DialogTitle>{title}</DialogTitle>
                    {description !== undefined && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {header}
                {children !== undefined && (
                    <div ref={body} className="-mx-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
                        {children}
                    </div>
                )}
                {parts.footer && (
                    <DialogFooter
                        className={cn(
                            'mt-auto items-center',
                            phone === 'sheet' && 'max-sm:pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]',
                        )}
                    >
                        {footer !== undefined && <div className="mr-auto min-w-0 text-xs text-muted-foreground">{footer}</div>}
                        {count}
                        {/* As wide as its verbs while they fit one row, else the whole width with a verb to each line. */}
                        <div className="flex w-fit max-w-full flex-wrap-reverse justify-end gap-2 *:grow">
                            {parts.cancel && (
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
                            {confirm !== undefined && (
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
                            )}
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

export interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    question: ReactNode
    /** One line on what the answer does, where the question does not say it. */
    detail?: ReactNode
    confirm: DialogConfirm
    /** What the answer touches, when one line cannot say it: a list of what goes with it. */
    children?: ReactNode
    /** When false a press outside leaves the question open; Cancel and Escape still close it. */
    closeOnOutsidePress?: boolean
    /** The element focused when the question opens, such as a field in its body. */
    initialFocus?: RefObject<HTMLElement | null>
    words?: Partial<DialogShellWords>
}

/**
 * A question with one answer to confirm: the title is the question ("Delete import-orders?"),
 * there is no body unless one is given, and a destructive answer is drawn as one. On a phone it
 * stays sized to its content, never a full-screen sheet.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    question,
    detail,
    confirm,
    children,
    closeOnOutsidePress,
    initialFocus,
    words,
}: ConfirmDialogProps) {
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="sm"
            phone="fit"
            title={question}
            description={detail}
            confirm={confirm}
            closeOnOutsidePress={closeOnOutsidePress}
            initialFocus={initialFocus}
            words={words}
        >
            {children}
        </DialogShell>
    )
}
