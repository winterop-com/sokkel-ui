import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { DialogShell, type DialogConfirm } from './DialogShell'
import { FormBar } from './FormBar'
import { PageHeader } from './PageHeader'
import { Page } from './Shell'
import { SubNav } from './SubNav'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { cn } from '../lib/cn'

/** One step of a form filled in a step at a time. */
export interface Step {
    id: string
    label: string
    /** What the step asks, under its label where the steps stand down the side. */
    description?: string
}

/** Where a step stands against the current one. */
export type StepState = 'done' | 'current' | 'upcoming'

/** Whether the step at `index` is done, the current one, or still to come. */
export function stepState(index: number, current: number): StepState {
    if (index < current) return 'done'
    return index === current ? 'current' : 'upcoming'
}

export interface StepIndicatorWords {
    /** Said for the current step, and shown on a phone where the labels have no room. */
    step: (number: number, total: number) => string
}

const STEP_WORDS: StepIndicatorWords = { step: (number, total) => `Step ${String(number)} of ${String(total)}` }

export interface StepIndicatorProps {
    steps: readonly Step[]
    /** The index of the current step. */
    current: number
    /** Goes back to a done step; without it the steps are only shown. */
    onStep?: (index: number) => void
    /** `horizontal` in a row, as under a dialog's title; `vertical` down a column, each step with its description. */
    orientation?: 'horizontal' | 'vertical'
    className?: string
    words?: Partial<StepIndicatorWords>
}

/** A step's number in its circle: filled for the current step, checked once done, outlined still to come. */
function StepMark({ index, state }: { index: number; state: StepState }) {
    return (
        <span
            className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-2xs leading-none tabular-nums',
                state === 'current' && 'bg-primary text-primary-foreground',
                state === 'done' && 'bg-primary/15 text-foreground',
                state === 'upcoming' && 'border border-border-strong text-muted-foreground',
            )}
            aria-hidden
        >
            {state === 'done' ? <Check className="size-3" /> : index + 1}
        </span>
    )
}

/** A done step pressed to go back to, or a step only shown. */
function StepPress({
    pressable,
    onPress,
    className,
    children,
}: {
    pressable: boolean
    onPress: () => void
    className: string
    children: ReactNode
}) {
    if (!pressable) return <span className={cn(className, 'py-0.5')}>{children}</span>
    return (
        <button
            type="button"
            onClick={onPress}
            className={cn(
                className,
                '-mx-1 rounded-md px-1 py-0.5 text-left outline-none hover:bg-hover focus-visible:ring-focus focus-visible:ring-ring/50',
            )}
        >
            {children}
        </button>
    )
}

/**
 * Where a person is in a run of steps: each step numbered and named, the done ones checked and
 * pressable to go back to, the current one filled. In a row only the current step is named on a
 * phone; down a column (`vertical`) every step is, with its description under it, joined by a line
 * that is drawn in the primary ink as far as the person has come.
 */
export function StepIndicator({ steps, current, onStep, orientation = 'horizontal', className, words: given }: StepIndicatorProps) {
    const words = { ...STEP_WORDS, ...given }
    const label = words.step(current + 1, steps.length)
    if (orientation === 'vertical') {
        return (
            <nav aria-label={label} className={className}>
                <ol className="flex flex-col">
                    {steps.map((step, index) => {
                        const state = stepState(index, current)
                        return (
                            <li key={step.id} aria-current={state === 'current' ? 'step' : undefined} className="relative pb-5 last:pb-0">
                                {index < steps.length - 1 && (
                                    <span
                                        className={cn(
                                            'absolute top-6 bottom-0 left-2.5 w-px -translate-x-1/2',
                                            state === 'done' ? 'bg-primary/40' : 'bg-border',
                                        )}
                                        aria-hidden
                                    />
                                )}
                                <StepPress
                                    pressable={state === 'done' && onStep !== undefined}
                                    onPress={() => onStep?.(index)}
                                    className="flex w-full min-w-0 items-start gap-3"
                                >
                                    <StepMark index={index} state={state} />
                                    <span className="flex min-w-0 flex-col">
                                        <span
                                            className={cn(
                                                'text-sm leading-5',
                                                state === 'current' ? 'font-medium text-foreground' : 'text-muted-foreground',
                                            )}
                                        >
                                            {step.label}
                                        </span>
                                        {step.description !== undefined && (
                                            <span className="text-xs text-muted-foreground">{step.description}</span>
                                        )}
                                    </span>
                                </StepPress>
                            </li>
                        )
                    })}
                </ol>
            </nav>
        )
    }
    return (
        <nav aria-label={label} className={cn('flex flex-col gap-2', className)}>
            <ol className="flex items-center gap-2">
                {steps.map((step, index) => {
                    const state = stepState(index, current)
                    const here = state === 'current'
                    return (
                        <li
                            key={step.id}
                            aria-current={here ? 'step' : undefined}
                            className={cn('flex min-w-0 items-center gap-2', here ? 'shrink-0' : 'shrink')}
                        >
                            {index > 0 && (
                                <span
                                    className={cn('h-px w-4 shrink-0 sm:w-6', index <= current ? 'bg-primary/40' : 'bg-border')}
                                    aria-hidden
                                />
                            )}
                            <StepPress
                                pressable={state === 'done' && onStep !== undefined}
                                onPress={() => onStep?.(index)}
                                className="flex min-w-0 items-center gap-2"
                            >
                                <StepMark index={index} state={state} />
                                <span
                                    className={cn(
                                        'truncate text-xs',
                                        here ? 'font-medium text-foreground' : 'text-muted-foreground max-sm:hidden',
                                    )}
                                >
                                    {step.label}
                                </span>
                            </StepPress>
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

/** The words a run of steps says, in a dialog and on a page alike. */
export interface WizardWords extends StepIndicatorWords {
    next: string
    back: string
    cancel: string
}

/** The words a wizard dialog says. */
export type WizardDialogWords = WizardWords

/** The words a wizard page says. */
export interface WizardViewWords extends WizardWords {
    /** The steps column's resize edge. */
    resize: string
}

const WIZARD_WORDS: WizardWords = { ...STEP_WORDS, next: 'Next', back: 'Back', cancel: 'Cancel' }

/** The verb on the last step, which finishes. */
export interface WizardFinish {
    label: string
    onFinish: () => void
    /** Working: the verb spins, and nothing moves between the steps until it is done. */
    busy?: boolean
    busyLabel?: string
}

/** What a run of steps offers at its current step. */
export interface WizardMoves {
    /** Goes a step back; absent on the first step. */
    back?: () => void
    /** Next, or the finish on the last step, held with the step's `why`. */
    confirm: DialogConfirm
    /** Goes back to a done step; absent while finishing. */
    step?: (index: number) => void
    /** The finish is working, so Back waits too. */
    busy: boolean
}

/**
 * The moves at step `current` of `count`: Back from the second step on, Next until the last step
 * and the finish there, each shut with `why` while the step is not ready, and no jumping back to a
 * done step while the finish is busy.
 */
export function wizardMoves({
    count,
    current,
    onCurrentChange,
    finish,
    why,
    next,
}: {
    count: number
    current: number
    onCurrentChange: (index: number) => void
    finish: WizardFinish
    why?: string
    next: string
}): WizardMoves {
    const busy = finish.busy === true
    const last = current >= count - 1
    return {
        back: current > 0 ? () => onCurrentChange(current - 1) : undefined,
        confirm: last
            ? { label: finish.label, onConfirm: finish.onFinish, busy: finish.busy, busyLabel: finish.busyLabel, why }
            : { label: next, onConfirm: () => onCurrentChange(current + 1), why },
        step: busy ? undefined : onCurrentChange,
        busy,
    }
}

export interface WizardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    steps: readonly Step[]
    current: number
    onCurrentChange: (index: number) => void
    /** The last step's verb. */
    finish: WizardFinish
    /** Why the current step cannot be left forward yet. */
    why?: string
    width?: 'sm' | 'md' | 'lg' | 'xl'
    footer?: ReactNode
    /** The current step's `IssueCount`, beside the verbs. */
    count?: ReactNode
    /** The current step's body. */
    children?: ReactNode
    words?: Partial<WizardDialogWords>
}

/**
 * A dialog filled in a step at a time: the step indicator under the title, the current step's
 * body, and Back and Next in the footer. The last step's verb is the one that finishes. A step
 * that is not ready shuts Next and says why. `WizardView` lays the same steps out on a page.
 */
export function WizardDialog({
    open,
    onOpenChange,
    title,
    description,
    steps,
    current,
    onCurrentChange,
    finish,
    why,
    width = 'lg',
    footer,
    count,
    children,
    words: given,
}: WizardDialogProps) {
    const words = { ...WIZARD_WORDS, ...given }
    const moves = wizardMoves({ count: steps.length, current, onCurrentChange, finish, why, next: words.next })
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width={width}
            title={title}
            description={description}
            header={
                <StepIndicator
                    steps={steps}
                    current={current}
                    onStep={moves.step}
                    words={{ step: words.step }}
                    className="-mx-4 border-y border-border px-4 py-2.5"
                />
            }
            back={moves.back}
            confirm={moves.confirm}
            footer={footer}
            count={count}
            words={{ cancel: words.cancel, back: words.back }}
        >
            {children}
        </DialogShell>
    )
}

export interface WizardViewProps {
    title: string
    /** A sentence under the title: what the steps make. */
    description?: ReactNode
    steps: readonly Step[]
    current: number
    onCurrentChange: (index: number) => void
    /** The last step's verb. */
    finish: WizardFinish
    /** Why the current step cannot be left forward yet. */
    why?: string
    /** Adds Cancel at the start of the footer, which leaves without finishing. */
    onCancel?: () => void
    /** Where the steps stand: down the side (the default), or along the top over the step's body. */
    layout?: 'side' | 'top'
    /** A note in the footer: how much is filled in, when the draft was kept. */
    footer?: ReactNode
    /** The current step's `IssueCount`, beside the verbs. */
    count?: ReactNode
    /** The current step's body. */
    children?: ReactNode
    className?: string
    words?: Partial<WizardViewWords>
}

/**
 * A form filled in a step at a time, laid out as a page of the app inside `Shell`, with the moves
 * of `WizardDialog`: the steps down the side in a `SubNav` (or along the top with `layout="top"`),
 * the page's title and the current step's body, and a `FormBar` across the foot with Back, and Next
 * or the finish on the last step. A step that is not ready shuts Next and says why; a done step is
 * pressed to go back to it. `onCancel` adds Cancel at the footer's start.
 *
 * Below the `lg` breakpoint the steps stand along the top whatever the layout, with only the
 * current one named on a phone.
 */
export function WizardView({
    title,
    description,
    steps,
    current,
    onCurrentChange,
    finish,
    why,
    onCancel,
    layout = 'side',
    footer,
    count,
    children,
    className,
    words: given,
}: WizardViewProps) {
    const words = { ...WIZARD_WORDS, resize: 'Resize the column', ...given }
    const moves = wizardMoves({ count: steps.length, current, onCurrentChange, finish, why, next: words.next })
    const side = layout === 'side'
    const shut = moves.confirm.why !== undefined || moves.busy
    return (
        <div data-slot="wizard-view" className={cn('flex h-full min-h-0 flex-col', className)}>
            <div className="flex min-h-0 flex-1">
                {side && (
                    <SubNav label={title} defaultSize={256} words={{ resize: words.resize }}>
                        <StepIndicator
                            steps={steps}
                            current={current}
                            onStep={moves.step}
                            orientation="vertical"
                            words={{ step: words.step }}
                            className="px-2 pt-1"
                        />
                    </SubNav>
                )}
                <div className="min-w-0 flex-1 overflow-y-auto">
                    <Page className="max-w-3xl">
                        <PageHeader title={title} description={description} />
                        <StepIndicator
                            steps={steps}
                            current={current}
                            onStep={moves.step}
                            words={{ step: words.step }}
                            className={cn('border-y border-border py-2.5', side && 'lg:hidden')}
                        />
                        <div className="flex flex-col gap-4">{children}</div>
                    </Page>
                </div>
            </div>
            <FormBar
                note={footer}
                start={
                    onCancel === undefined ? undefined : (
                        <Button variant="ghost" size="sm" disabled={moves.busy} onClick={onCancel}>
                            {words.cancel}
                        </Button>
                    )
                }
            >
                {count}
                {moves.back !== undefined && (
                    <Button variant="outline" size="sm" disabled={moves.busy} onClick={moves.back}>
                        {words.back}
                    </Button>
                )}
                <Button
                    size="sm"
                    reason={moves.confirm.why}
                    aria-disabled={moves.busy || undefined}
                    className={cn(moves.busy && 'cursor-progress')}
                    onClick={shut ? undefined : moves.confirm.onConfirm}
                >
                    {moves.busy && <Spinner aria-hidden role={undefined} aria-label={undefined} />}
                    {moves.busy ? (moves.confirm.busyLabel ?? moves.confirm.label) : moves.confirm.label}
                </Button>
            </FormBar>
        </div>
    )
}
