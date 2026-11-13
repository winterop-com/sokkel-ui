import { CircleAlert, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from './ui/popover'

/** Something a person can press to put an issue right: use a value, check again. */
export interface IssueAction {
    label: ReactNode
    icon?: ReactNode
    onClick: () => void
}

/** What a field says is wrong with its value. A `warning` is allowed; a `critical` one stops the submit. */
export interface Issue {
    tone: 'critical' | 'warning'
    text: string
    /** What to do, when the message alone does not say it. */
    detail?: string
    actions?: readonly IssueAction[]
}

const INK = { critical: 'text-critical-ink', warning: 'text-warning-ink' } as const
const ICON = { critical: CircleAlert, warning: TriangleAlert } as const

/** An input's edge for the worst of its issues, overriding the primitive's own invalid ring. */
export const ISSUE_EDGE = {
    critical:
        'border-critical/80 focus-visible:border-critical aria-invalid:border-critical/80 aria-invalid:ring-0 aria-invalid:focus-visible:ring-3 aria-invalid:focus-visible:ring-critical/25 dark:aria-invalid:border-critical/80',
    warning: 'border-warning/80 focus-visible:border-warning focus-visible:ring-warning/25',
} as const

/** The tone of the worst issue, or null for none. */
export function worst(issues: readonly Issue[]): Issue['tone'] | null {
    if (issues.some((issue) => issue.tone === 'critical')) return 'critical'
    return issues.length > 0 ? 'warning' : null
}

/** The words a screen reader hears before a message, so it is not taken for a hint. */
const PREFIX = { critical: 'Error: ', warning: 'Warning: ' } as const

/** Every issue said as one sentence, for a control's `aria-label` or description. */
export function spoken(issues: readonly Issue[]): string {
    return issues.map((issue) => `${PREFIX[issue.tone]}${issue.text}${issue.detail === undefined ? '' : `. ${issue.detail}`}`).join(' ')
}

export interface IssueMarkProps {
    issues: readonly Issue[]
    open?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string
}

/**
 * The mark at the end of an input whose value has issues: pressing it opens what is wrong, what
 * to do, and the actions that put it right. It sits inside the input's box, which takes `pr-9`,
 * so a form keeps its height whatever it has to say. Nothing renders without an issue.
 */
export function IssueMark({ issues, open, onOpenChange, className }: IssueMarkProps) {
    const tone = worst(issues)
    if (tone === null) return null
    const Icon = ICON[tone]
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger
                render={
                    <button
                        type="button"
                        aria-label={spoken(issues)}
                        className={cn(
                            'absolute inset-y-0 right-1 my-auto flex size-(--density-control-sm) items-center justify-center rounded-md outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-hover',
                            INK[tone],
                            className,
                        )}
                    />
                }
            >
                <Icon className="size-4" aria-hidden />
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="end"
                sideOffset={6}
                initialFocus={false}
                finalFocus={false}
                className="w-[min(20rem,calc(100vw-2rem))] gap-3 p-3"
            >
                {issues.map((issue, index) => {
                    const Mark = ICON[issue.tone]
                    return (
                        <div key={index} className="flex flex-col gap-2">
                            <div className="flex items-start gap-2">
                                <Mark className={cn('mt-0.5 size-4 shrink-0', INK[issue.tone])} aria-hidden />
                                <div className="flex min-w-0 flex-col gap-0.5">
                                    <PopoverTitle className="text-sm leading-5 font-medium">{issue.text}</PopoverTitle>
                                    {issue.detail !== undefined && (
                                        <PopoverDescription className="text-xs">{issue.detail}</PopoverDescription>
                                    )}
                                </div>
                            </div>
                            {issue.actions !== undefined && issue.actions.length > 0 && (
                                <div className="flex flex-wrap gap-x-3 gap-y-1 pl-6">
                                    {issue.actions.map((action, at) => (
                                        <button
                                            key={at}
                                            type="button"
                                            onClick={() => {
                                                onOpenChange?.(false)
                                                action.onClick()
                                            }}
                                            className="flex items-center gap-1 rounded-sm text-xs text-foreground underline decoration-border-strong underline-offset-3 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3"
                                        >
                                            {action.icon}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </PopoverContent>
        </Popover>
    )
}

export interface IssueCountWords {
    /** How many issues stop the submit, said to a screen reader: `2 errors`. */
    errors: (count: number) => string
    /** How many warnings, said to a screen reader: `1 warning`. */
    warnings: (count: number) => string
}

const COUNT_WORDS: IssueCountWords = {
    errors: (count) => `${String(count)} ${count === 1 ? 'error' : 'errors'}`,
    warnings: (count) => `${String(count)} ${count === 1 ? 'warning' : 'warnings'}`,
}

/** One issue in a form's list: the field it belongs to, what it says, and how to go to it. */
export interface IssueEntry {
    label: string
    issue: Issue
    /** Takes the person to the field and opens its mark. */
    onGo: () => void
    /** The id of the field's control, so `IssueMarks` can place the issue beside the scroll bar. */
    target?: string
}

const EDGE = {
    critical: 'border-critical/40 bg-critical/8 hover:bg-critical/12 data-popup-open:bg-critical/12',
    warning: 'border-warning/45 bg-warning/8 hover:bg-warning/12 data-popup-open:bg-warning/12',
} as const

export interface IssueCountProps {
    critical: number
    warning?: number
    list: readonly IssueEntry[]
    /** Starts with the list open. */
    defaultOpen?: boolean
    words?: Partial<IssueCountWords>
}

/**
 * A form's issues as one control beside the verb: a figure for each kind, the errors that stop the
 * submit in the critical ink and the warnings in the warning ink, on the tint of the worst. Pressing
 * it opens the issues right there, each naming its field, and choosing one goes to that field and
 * opens its mark. Nothing renders at zero. A dialog takes it in its `count` slot, beside its verbs.
 */
export function IssueCount({ critical, warning = 0, list, defaultOpen = false, words: given }: IssueCountProps) {
    const words = { ...COUNT_WORDS, ...given }
    const [open, setOpen] = useState(defaultOpen)
    const tone = critical > 0 ? 'critical' : warning > 0 ? 'warning' : null
    if (tone === null) return null
    const label = [critical > 0 && words.errors(critical), warning > 0 && words.warnings(warning)].filter(Boolean).join(', ')
    const face = cn(
        'flex h-(--density-control-sm) min-w-0 items-center rounded-control border text-xs font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        EDGE[tone],
    )
    const figures = (
        [
            ['critical', critical],
            ['warning', warning],
        ] as const
    )
        .filter(([, count]) => count > 0)
        .map(([kind, count], index) => {
            const Icon = ICON[kind]
            return (
                <span key={kind} className={cn('flex items-center gap-1 px-2', INK[kind], index > 0 && 'border-l border-current/25')}>
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    {count}
                </span>
            )
        })
    const said = <span className="flex items-center">{figures}</span>
    if (list.length === 0) {
        return (
            <span role="status" aria-label={label} className={face}>
                {said}
            </span>
        )
    }
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<button type="button" aria-label={label} className={face} />}>{said}</PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={6} className="w-[min(22rem,calc(100vw-2rem))] gap-1 p-1.5">
                {list.map((entry, index) => {
                    const Mark = ICON[entry.issue.tone]
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => {
                                setOpen(false)
                                entry.onGo()
                            }}
                            className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-hover focus-visible:bg-hover"
                        >
                            <Mark className={cn('mt-0.5 size-4 shrink-0', INK[entry.issue.tone])} aria-hidden />
                            <span className="flex min-w-0 flex-col">
                                <span className="text-xs text-muted-foreground">{entry.label}</span>
                                <span className="text-sm leading-5">{entry.issue.text}</span>
                            </span>
                        </button>
                    )
                })}
            </PopoverContent>
        </Popover>
    )
}
