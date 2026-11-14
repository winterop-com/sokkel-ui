import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

import { letsGo, useBusyRelease } from '../hooks/use-busy-release'
import { BUSY_RELEASE } from '../lib/durations'
import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { cn } from '../lib/cn'

/** A dialog's width from `md` up, where it stands as a box; below `md` it is a full-screen sheet. */
const WIDTHS = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-4xl',
    full: 'md:h-[calc(100svh-2rem)] md:max-h-[calc(100svh-2rem)] md:w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)]',
} as const

/** A `fit` dialog stays a box below `md` too, at its width while the window has room for it. */
const FIT_WIDTHS: Record<keyof typeof WIDTHS, string> = {
    sm: 'max-md:max-w-[min(24rem,calc(100%-2rem))]',
    md: 'max-md:max-w-[min(32rem,calc(100%-2rem))]',
    lg: 'max-md:max-w-[min(42rem,calc(100%-2rem))]',
    xl: 'max-md:max-w-[min(56rem,calc(100%-2rem))]',
    full: '',
}

/** Below `md` a sheet fills the screen: square corners, and no edge or shadow, as nothing lies around it. */
export const SHEET =
    'max-md:top-0 max-md:left-0 max-md:h-svh max-md:max-h-none max-md:w-screen max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0 max-md:shadow-none'

/** The one verb a dialog confirms with. */
export interface DialogConfirm {
    label: string
    onConfirm: () => void
    /** Why it cannot be pressed now; the button stays focusable and says so on hover and on focus. */
    why?: string
    /**
     * Working: the verb spins, and nothing closes the dialog until it is done, or until it has run
     * the dialog's `busyRelease`, when Escape and Cancel, now Stop waiting, let it go.
     */
    busy?: boolean
    busyLabel?: string
    destructive?: boolean
}

export interface DialogShellWords {
    cancel: string
    back: string
    /** The corner close's name. */
    close: string
    /** Cancel's word once a busy confirm has run past `busyRelease`: closing then leaves the work to settle, nothing cancelled. */
    stopWaiting: string
}

/** A dialog's own words in English; a dialog with words of its own starts from these. */
export const DIALOG_SHELL_WORDS: DialogShellWords = { cancel: 'Cancel', back: 'Back', close: 'Close', stopWaiting: 'Stop waiting' }

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
    /** The dialog's width; `full` fills the window but a margin, its height too, for a workbench such as a tester beside its input. */
    width?: keyof typeof WIDTHS
    /** Below `md`: `sheet` covers the screen, for a form; `fit` stays a box sized to its content inside the screen's margins, for a short question. */
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
    /**
     * How long, in ms, a busy confirm holds the dialog before Escape and Cancel, now saying Stop
     * waiting, let it go, the confirm still busy until the work settles: the `busy-release` token's
     * 5000 by default.
     */
    busyRelease?: number
    /**
     * The element focused when the dialog opens, in place of the first field in the body; `confirm`
     * focuses the confirming verb, so Enter confirms a dialog with nothing to fill.
     */
    initialFocus?: RefObject<HTMLElement | null> | 'confirm'
    /** Where focus goes when the dialog closes: the element that opened it unless given, nowhere when false. */
    finalFocus?: RefObject<HTMLElement | null> | boolean
    /** Held between the body and the footer, outside the scroll: a form's refusal, a status line. */
    status?: ReactNode
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
 * Below `md` (768), on a phone or a foldable, the dialog is a full-screen sheet with its footer held
 * to the bottom, so the verbs are always in reach; `phone="fit"` keeps a short one a box sized to
 * its content inside the screen's margins instead, as a confirm is. From `md` it is a box of its
 * `width` on the `elevation-dialog` shadow, edged in `border-strong`. The verbs stand in a row at the right while they fit it, and
 * each takes the whole width, the confirm on top, once they do not. A shut confirm stays focusable and carries its reason as a tooltip rather
 * than going dead. Opening focuses the first field in the body, or `initialFocus` (the confirm, with `'confirm'`). While the confirm is busy, Cancel, Back, Escape and the backdrop do nothing;
 * once it has been busy for `busyRelease` (5 seconds), Escape and Cancel, which then says Stop
 * waiting, close the dialog again, the confirm busy until the work settles and nothing cancelled.
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
    busyRelease = BUSY_RELEASE,
    initialFocus,
    finalFocus,
    status,
    footer,
    count,
    children,
    className,
    words: given,
}: DialogShellProps) {
    const parts = shellParts({ confirm, actions, footer, dismissible })
    const words = { ...DIALOG_SHELL_WORDS, ...given }
    const busy = confirm?.busy === true
    // A busy confirm holds the dialog until it has run `busyRelease`; then Escape and Cancel let it go.
    const released = useBusyRelease(busy, busyRelease)
    const body = useRef<HTMLDivElement>(null)
    const verb = useRef<HTMLButtonElement>(null)
    const first = initialFocus === 'confirm' ? verb : initialFocus
    // A dialog drawn open from its first render asks for its first field before its body is there,
    // and the popup takes focus; this moves it on to the field once the body is drawn.
    useEffect(() => {
        if (!open || first !== undefined) return
        const frame = requestAnimationFrame(() => {
            const field = body.current?.querySelector<HTMLElement>(FIELD)
            if (field != null && !body.current?.contains(document.activeElement)) field.focus()
        })
        return () => cancelAnimationFrame(frame)
    }, [open, first])
    return (
        <Dialog
            open={open}
            onOpenChange={(next, details) => {
                if (!next && (!dismissible || !letsGo(busy, released, details.reason))) return
                onOpenChange(next)
            }}
            disablePointerDismissal={!closeOnOutsidePress}
        >
            <DialogContent
                showCloseButton={parts.close}
                closeLabel={words.close}
                initialFocus={first ?? (() => body.current?.querySelector<HTMLElement>(FIELD) ?? true)}
                finalFocus={finalFocus}
                aria-busy={busy || undefined}
                className={cn(
                    'flex max-h-[calc(100svh-4rem)] flex-col gap-4',
                    WIDTHS[width],
                    NESTED,
                    phone === 'sheet' ? SHEET : FIT_WIDTHS[width],
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
                {status !== undefined && <div data-slot="dialog-status">{status}</div>}
                {parts.footer && (
                    <DialogFooter
                        className={cn(
                            'mt-auto items-center',
                            phone === 'sheet' && 'max-md:rounded-none max-md:pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]',
                        )}
                    >
                        {footer !== undefined && <div className="mr-auto min-w-0 text-xs text-muted-foreground">{footer}</div>}
                        {count}
                        {/* As wide as its verbs while they fit one row, else the whole width with a verb to each line. */}
                        <div className="flex w-fit max-w-full flex-wrap-reverse justify-end gap-2 *:grow">
                            {parts.cancel && (
                                <DialogClose render={<Button variant="ghost" />} disabled={busy && !released}>
                                    {released ? words.stopWaiting : words.cancel}
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
                                    ref={verb}
                                    variant={confirm.destructive === true ? 'destructive' : 'default'}
                                    reason={confirm.why}
                                    busy={busy}
                                    onClick={confirm.onConfirm}
                                >
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
    /** How long, in ms, a busy answer holds the question before Escape and Stop waiting let it go; 5000 by default. */
    busyRelease?: number
    /** The element focused when the question opens, such as a field in its body. */
    initialFocus?: RefObject<HTMLElement | null>
    /** Held above the answers: why the server refused the last one, as a `ProblemLine`. */
    status?: ReactNode
    words?: Partial<DialogShellWords>
}

/**
 * A question with one answer to confirm: the title is the question ("Delete import-orders?"),
 * there is no body unless one is given, and a destructive answer is drawn as one. Below `md` it
 * stays a box sized to its words, never a full-screen sheet.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    question,
    detail,
    confirm,
    children,
    closeOnOutsidePress,
    busyRelease,
    initialFocus,
    status,
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
            busyRelease={busyRelease}
            initialFocus={initialFocus}
            status={status}
            words={words}
        >
            {children}
        </DialogShell>
    )
}
