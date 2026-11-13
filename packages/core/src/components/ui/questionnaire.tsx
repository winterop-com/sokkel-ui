'use client'

import * as React from 'react'
import { Questionnaire as QuestionnairePrimitive } from '@shadcn/react/questionnaire'
import { cn } from '../../lib/cn'
import { INVALID_EDGE } from '../../lib/issue-edge'

import { buttonVariants, type Button } from './button'
import { CheckIcon } from 'lucide-react'

export type QuestionnaireProps = React.ComponentProps<typeof QuestionnairePrimitive.Root>

function Questionnaire({ className, ...props }: QuestionnaireProps) {
    return (
        <QuestionnairePrimitive.Root data-slot="questionnaire" className={cn('flex w-full min-w-0 flex-col gap-4', className)} {...props} />
    )
}

export type QuestionnaireProgressProps = React.ComponentProps<typeof QuestionnairePrimitive.Progress>

function QuestionnaireProgress({ className, ...props }: QuestionnaireProgressProps) {
    return (
        <QuestionnairePrimitive.Progress
            data-slot="questionnaire-progress"
            className={cn('min-h-lh w-fit min-w-[14ch] text-xs font-medium text-muted-foreground tabular-nums', className)}
            {...props}
        />
    )
}

export type QuestionnaireItemProps = React.ComponentProps<typeof QuestionnairePrimitive.Item>

function QuestionnaireItem({ className, ...props }: QuestionnaireItemProps) {
    return (
        <QuestionnairePrimitive.Item
            data-slot="questionnaire-item"
            className={cn('flex min-w-0 flex-col gap-4 border-0 p-0 outline-none', className)}
            {...props}
        />
    )
}

export type QuestionnaireTitleProps = React.ComponentProps<typeof QuestionnairePrimitive.Title>

function QuestionnaireTitle({ className, ...props }: QuestionnaireTitleProps) {
    return (
        <QuestionnairePrimitive.Title
            data-slot="questionnaire-title"
            className={cn('text-detail-title text-pretty [&:not(:has(~[data-slot=questionnaire-description]))]:mb-4', className)}
            {...props}
        />
    )
}

export type QuestionnaireDescriptionProps = React.ComponentProps<typeof QuestionnairePrimitive.Description>

function QuestionnaireDescription({ className, ...props }: QuestionnaireDescriptionProps) {
    return (
        <QuestionnairePrimitive.Description
            data-slot="questionnaire-description"
            className={cn('text-sm text-pretty text-muted-foreground', className)}
            {...props}
        />
    )
}

export type QuestionnaireChoicesProps = React.ComponentProps<typeof QuestionnairePrimitive.Choices>

function QuestionnaireChoices({ className, ...props }: QuestionnaireChoicesProps) {
    return (
        <QuestionnairePrimitive.Choices
            data-slot="questionnaire-choices"
            className={cn('group/questionnaire-choices grid min-w-0 gap-2', className)}
            {...props}
        />
    )
}

export type QuestionnaireChoiceProps = React.ComponentProps<typeof QuestionnairePrimitive.Choice>

function QuestionnaireChoice({ children, className, ...props }: QuestionnaireChoiceProps) {
    return (
        <QuestionnairePrimitive.Choice
            data-slot="questionnaire-choice"
            className={cn(
                'group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start gap-2.5 rounded-control border border-input bg-transparent px-3 py-2.5 text-start text-sm transition-colors outline-none select-none hover:bg-hover has-[>input:focus-visible]:outline-2 has-[>input:focus-visible]:outline-offset-2 has-[>input:focus-visible]:outline-ring has-[>input:focus-visible]:outline-solid data-invalid:border-critical/80 dark:bg-input/20 data-checked:border-primary/40 data-checked:bg-muted dark:data-checked:bg-muted',
                'data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
                className,
            )}
            {...props}
        >
            <QuestionnairePrimitive.ChoiceInput
                data-slot="questionnaire-choice-input"
                className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
            />
            <span
                aria-hidden="true"
                data-slot="questionnaire-choice-indicator"
                className="pointer-events-none relative flex size-4 shrink-0 translate-y-[--spacing(0.45)] items-center justify-center rounded-sm border border-input group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 group-data-[type=radio]/questionnaire-choice:rounded-full group-data-checked/questionnaire-choice:border-primary group-data-checked/questionnaire-choice:bg-primary group-data-checked/questionnaire-choice:text-primary-foreground dark:bg-input/30 dark:group-data-checked/questionnaire-choice:bg-primary"
            >
                <span
                    data-slot="questionnaire-choice-indicator-dot"
                    className="hidden size-2 rounded-full bg-primary-foreground group-data-[type=checkbox]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block"
                />
                <CheckIcon
                    data-slot="questionnaire-choice-indicator-check"
                    className="hidden size-3.5 group-data-[type=radio]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block"
                />
            </span>
            <QuestionnairePrimitive.ChoiceLabel
                data-slot="questionnaire-choice-label"
                className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug"
            >
                {children}
            </QuestionnairePrimitive.ChoiceLabel>
            <QuestionnairePrimitive.ChoiceShortcut
                data-slot="questionnaire-choice-shortcut"
                className="pointer-events-none ms-auto hidden size-5 shrink-0 translate-y-[--spacing(0.45)] items-center justify-center rounded-md border border-input bg-background font-mono text-2xs leading-none font-medium text-muted-foreground group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 group-data-[shortcut]/questionnaire-choice:inline-flex"
            />
        </QuestionnairePrimitive.Choice>
    )
}

export type QuestionnaireChoiceDescriptionProps = React.ComponentProps<'span'>

function QuestionnaireChoiceDescription({ className, ...props }: QuestionnaireChoiceDescriptionProps) {
    return <span data-slot="questionnaire-choice-description" className={cn('text-muted-foreground', className)} {...props} />
}

export type QuestionnaireInputProps = React.ComponentProps<typeof QuestionnairePrimitive.Input>

function QuestionnaireInput({ className, ...props }: QuestionnaireInputProps) {
    return (
        <div data-slot="questionnaire-input-wrapper" className="group/questionnaire-input relative w-full min-w-0">
            <QuestionnairePrimitive.Input
                data-slot="questionnaire-input"
                className={cn(
                    'h-8 min-h-11 w-full min-w-0 rounded-control border border-input bg-transparent px-2.5 py-1 text-base transition-[color,box-shadow,background-color] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 sm:min-h-0 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80',
                    'selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground',
                    INVALID_EDGE,
                    className,
                )}
                {...props}
            />
        </div>
    )
}

export type QuestionnaireErrorProps = React.ComponentProps<typeof QuestionnairePrimitive.Error>

function QuestionnaireError({ className, ...props }: QuestionnaireErrorProps) {
    return (
        <QuestionnairePrimitive.Error
            data-slot="questionnaire-error"
            className={cn('mt-2 text-sm text-destructive', className)}
            {...props}
        />
    )
}

export type QuestionnaireActionsProps = React.ComponentProps<'div'>

function QuestionnaireActions({ className, ...props }: QuestionnaireActionsProps) {
    return (
        <div
            data-slot="questionnaire-actions"
            className={cn('grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:min-h-8', className)}
            {...props}
        />
    )
}

export type QuestionnairePreviousProps = React.ComponentProps<typeof QuestionnairePrimitive.Previous> &
    Pick<React.ComponentProps<typeof Button>, 'size' | 'variant'>

function QuestionnairePrevious({ children, className, size = 'default', variant = 'outline', ...props }: QuestionnairePreviousProps) {
    return (
        <QuestionnairePrimitive.Previous
            data-slot="questionnaire-previous"
            data-size={size}
            data-variant={variant}
            className={cn(buttonVariants({ size, variant }), 'col-start-1 row-start-1 min-h-11 justify-self-start sm:min-h-0', className)}
            {...props}
        >
            {children ?? 'Previous'}
        </QuestionnairePrimitive.Previous>
    )
}

export type QuestionnaireSkipProps = React.ComponentProps<typeof QuestionnairePrimitive.Skip> &
    Pick<React.ComponentProps<typeof Button>, 'size' | 'variant'>

function QuestionnaireSkip({ children, className, size = 'default', variant = 'outline', ...props }: QuestionnaireSkipProps) {
    return (
        <QuestionnairePrimitive.Skip
            data-slot="questionnaire-skip"
            data-size={size}
            data-variant={variant}
            className={cn(buttonVariants({ size, variant }), 'col-start-2 row-start-1 min-h-11 justify-self-end sm:min-h-0', className)}
            {...props}
        >
            {children ?? 'Skip'}
        </QuestionnairePrimitive.Skip>
    )
}

export type QuestionnaireNextProps = React.ComponentProps<typeof QuestionnairePrimitive.Next> &
    Pick<React.ComponentProps<typeof Button>, 'size' | 'variant'>

function QuestionnaireNext({ children, className, size = 'default', variant = 'default', ...props }: QuestionnaireNextProps) {
    return (
        <QuestionnairePrimitive.Next
            data-slot="questionnaire-next"
            data-size={size}
            data-variant={variant}
            className={cn(buttonVariants({ size, variant }), 'col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0', className)}
            {...props}
        >
            {children ?? 'Next'}
        </QuestionnairePrimitive.Next>
    )
}

export type QuestionnaireSubmitProps = React.ComponentProps<typeof QuestionnairePrimitive.Submit> &
    Pick<React.ComponentProps<typeof Button>, 'size' | 'variant'>

function QuestionnaireSubmit({ children, className, size = 'default', variant = 'default', ...props }: QuestionnaireSubmitProps) {
    return (
        <QuestionnairePrimitive.Submit
            data-slot="questionnaire-submit"
            data-size={size}
            data-variant={variant}
            className={cn(buttonVariants({ size, variant }), 'col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0', className)}
            {...props}
        >
            {children ?? 'Submit'}
        </QuestionnairePrimitive.Submit>
    )
}

export {
    Questionnaire,
    QuestionnaireActions,
    QuestionnaireChoice,
    QuestionnaireChoiceDescription,
    QuestionnaireChoices,
    QuestionnaireDescription,
    QuestionnaireError,
    QuestionnaireInput,
    QuestionnaireItem,
    QuestionnaireNext,
    QuestionnairePrevious,
    QuestionnaireProgress,
    QuestionnaireSkip,
    QuestionnaireSubmit,
    QuestionnaireTitle,
}
