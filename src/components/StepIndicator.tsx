import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { DialogShell } from './DialogShell'
import { cn } from '../lib/cn'

/** One step of a dialog that is filled in a step at a time. */
export interface Step {
    id: string
    label: string
}

export interface StepIndicatorWords {
    /** Said for the current step, and shown on a phone where the labels have no room. */
    step: (number: number, total: number) => string
}

const STEP_WORDS: StepIndicatorWords = { step: (number, total) => `Step ${String(number)} of ${String(total)}` }

/**
 * Where a person is in a run of steps: each step numbered and named, the done ones checked and
 * pressable to go back to, the current one filled. On a phone only the current step is named.
 */
export function StepIndicator({
    steps,
    current,
    onStep,
    className,
    words: given,
}: {
    steps: readonly Step[]
    /** The index of the current step. */
    current: number
    /** Goes back to a done step; without it the steps are only shown. */
    onStep?: (index: number) => void
    className?: string
    words?: Partial<StepIndicatorWords>
}) {
    const words = { ...STEP_WORDS, ...given }
    return (
        <nav aria-label={words.step(current + 1, steps.length)} className={cn('flex flex-col gap-2', className)}>
            <ol className="flex items-center gap-2">
                {steps.map((step, index) => {
                    const done = index < current
                    const here = index === current
                    const mark = (
                        <>
                            <span
                                className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[0.6875rem] leading-none tabular-nums',
                                    here && 'bg-primary text-primary-foreground',
                                    done && 'bg-primary/15 text-foreground',
                                    !here && !done && 'border border-border-strong text-muted-foreground',
                                )}
                                aria-hidden
                            >
                                {done ? <Check className="size-3" /> : index + 1}
                            </span>
                            <span
                                className={cn(
                                    'truncate text-[0.8125rem]',
                                    here ? 'font-medium text-foreground' : 'text-muted-foreground max-sm:hidden',
                                )}
                            >
                                {step.label}
                            </span>
                        </>
                    )
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
                            {done && onStep !== undefined ? (
                                <button
                                    type="button"
                                    onClick={() => onStep(index)}
                                    className="-mx-1 flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                                >
                                    {mark}
                                </button>
                            ) : (
                                <span className="flex min-w-0 items-center gap-2 py-0.5">{mark}</span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

export interface WizardDialogWords extends StepIndicatorWords {
    next: string
    back: string
    cancel: string
}

const WIZARD_WORDS: WizardDialogWords = { ...STEP_WORDS, next: 'Next', back: 'Back', cancel: 'Cancel' }

/**
 * A dialog filled in a step at a time: the step indicator under the title, the current step's
 * body, and Back and Next in the footer. The last step's verb is the one that finishes. A step
 * that is not ready shuts Next and says why.
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
    children,
    words: given,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    steps: readonly Step[]
    current: number
    onCurrentChange: (index: number) => void
    /** The last step's verb. */
    finish: { label: string; onFinish: () => void; busy?: boolean; busyLabel?: string }
    /** Why the current step cannot be left forward yet. */
    why?: string
    width?: 'sm' | 'md' | 'lg' | 'xl'
    footer?: ReactNode
    /** The current step's body. */
    children?: ReactNode
    words?: Partial<WizardDialogWords>
}) {
    const words = { ...WIZARD_WORDS, ...given }
    const last = current === steps.length - 1
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
                    onStep={finish.busy === true ? undefined : onCurrentChange}
                    words={{ step: words.step }}
                    className="-mx-4 border-y border-border px-4 py-2.5"
                />
            }
            back={current > 0 ? () => onCurrentChange(current - 1) : undefined}
            confirm={
                last
                    ? { label: finish.label, onConfirm: finish.onFinish, busy: finish.busy, busyLabel: finish.busyLabel, why }
                    : { label: words.next, onConfirm: () => onCurrentChange(current + 1), why }
            }
            footer={footer}
            words={{ cancel: words.cancel, back: words.back }}
        >
            {children}
        </DialogShell>
    )
}
