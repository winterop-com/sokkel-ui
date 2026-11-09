import type { StatusMap } from '@winterop-com/sokkel-ui/lib/status'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { createContext, useContext, useEffect, type ReactNode } from 'react'

import type { AnswerValue, Form, Question } from './data/forms'
import { KIND } from './data/forms'

/** The states a response is in, in the app's words and colors, for every chip and dot. */
export const RECEIPT_STATUSES: StatusMap = {
    received: { color: 'info' },
    forwarded: { color: 'good' },
    rejected: { color: 'critical' },
    withdrawn: { color: 'neutral' },
    active: { color: 'good', label: 'active' },
    completed: { color: 'neutral', label: 'completed' },
}

/** A state's color as a CSS color, for a dot. */
export const STATE_DOT: Record<string, string> = {
    received: 'var(--status-running)',
    forwarded: 'var(--status-succeeded)',
    rejected: 'var(--status-failed)',
    withdrawn: 'var(--status-cancelled)',
}

export function KindBadge({ form }: { form: Form }) {
    return <Badge kind={KIND[form.kind].color}>{KIND[form.kind].label}</Badge>
}

export function StateChip({ state }: { state: string }) {
    return <StatusChip status={state} />
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
export const NUMBER = new Intl.NumberFormat('en-US')

/** An ISO instant as a date and time, in the page's zone. */
export function when(iso: string): string {
    return DATE_TIME.format(new Date(iso))
}

/** A `YYYY-MM-DD` day, or the day of an ISO instant, as a date. */
export function onDay(text: string): string {
    const [year = 0, month = 1, date = 1] = text.slice(0, 10).split('-').map(Number)
    return DATE.format(new Date(year, month - 1, date))
}

/** An answer as the record shows it: yes or no in words, a choice by its label, a number with its unit. */
export function answerText(question: Question | undefined, value: AnswerValue): string {
    if (value === null || value === '') return ''
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (question?.options !== undefined) return question.options.find((option) => option.value === value)?.label ?? String(value)
    if (typeof value === 'number') {
        const unit = question?.unit
        return `${NUMBER.format(value)}${unit !== undefined && !unit.includes(' to ') ? ` ${unit}` : ''}`
    }
    return String(value)
}

/** What the shell's foot says for the page: a note at its start and facts at its end. */
export interface Foot {
    note?: ReactNode
    items?: ReactNode
}

export const FootContext = createContext<(foot: Foot) => void>(() => undefined)

/** Says what the shell's foot holds while a page is shown. */
export function useFoot(note: ReactNode, items?: ReactNode, deps: readonly unknown[] = [note]): void {
    const set = useContext(FootContext)
    useEffect(() => {
        set({ note, items })
        // The foot follows the words the page passes, not the nodes made anew each draw.
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- the deps say when the foot's words change
    }, [set, ...deps])
}

/** The plural of a count's noun. */
export function count(value: number, one: string, many = `${one}s`): string {
    return `${NUMBER.format(value)} ${value === 1 ? one : many}`
}
