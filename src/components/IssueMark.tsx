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

/**
 * The mark at the end of an input whose value has issues: pressing it opens what is wrong, what
 * to do, and the actions that put it right. It sits inside the input's box, which takes `pr-9`,
 * so a form keeps its height whatever it has to say. Nothing renders without an issue.
 */
export function IssueMark({
    issues,
    open,
    onOpenChange,
    className,
}: {
    issues: readonly Issue[]
    open?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string
}) {
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
                            'absolute inset-y-0 right-1 my-auto flex size-7 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted',
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
    toFix: (count: number) => string
    toLookAt: (count: number) => string
}

const COUNT_WORDS: IssueCountWords = {
    toFix: (count) => `${String(count)} to fix`,
    toLookAt: (count) => `${String(count)} to look at`,
}

/** One issue in a form's list: the field it belongs to, what it says, and how to go to it. */
export interface IssueEntry {
    label: string
    issue: Issue
    /** Takes the person to the field and opens its mark. */
    onGo: () => void
}

const EDGE = {
    critical: 'border-critical/40 bg-critical/8 hover:bg-critical/12 data-popup-open:bg-critical/12',
    warning: 'border-warning/45 bg-warning/8 hover:bg-warning/12 data-popup-open:bg-warning/12',
} as const

/**
 * How many issues stop the submit, as a control beside the verb, or how many warnings when nothing
 * stops it. Pressing it opens the issues right there, each naming its field, and choosing one
 * goes to that field and opens its mark. Nothing renders at zero. A dialog takes it in its `count` slot, beside its verbs.
 */
export function IssueCount({
    critical,
    warning = 0,
    list,
    words: given,
}: {
    critical: number
    warning?: number
    list: readonly IssueEntry[]
    words?: Partial<IssueCountWords>
}) {
    const words = { ...COUNT_WORDS, ...given }
    const [open, setOpen] = useState(false)
    const tone = critical > 0 ? 'critical' : warning > 0 ? 'warning' : null
    if (tone === null) return null
    const Icon = ICON[tone]
    const face = cn(
        'flex h-7 min-w-0 items-center gap-1.5 rounded-control border px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        INK[tone],
        EDGE[tone],
    )
    const said = (
        <>
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{tone === 'critical' ? words.toFix(critical) : words.toLookAt(warning)}</span>
        </>
    )
    if (list.length === 0) {
        return <span className={face}>{said}</span>
    }
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<button type="button" className={face} />}>{said}</PopoverTrigger>
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
                            className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
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
