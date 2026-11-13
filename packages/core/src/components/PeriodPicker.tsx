import { useEffect, useMemo, useState } from 'react'

import { cn } from '../lib/cn'
import {
    PERIOD_ISSUE_WORDS,
    PERIOD_TYPES,
    parsePeriod,
    periodIssue,
    recentPeriods,
    type PeriodIssueWords,
    type PeriodType,
} from '../lib/periods'
import { ISSUE_EDGE, ISSUE_WORDS, IssueMark, type IssueWords } from './IssueMark'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from './ui/select'

export type { Period, PeriodType } from '../lib/periods'

/** The words a period picker says. */
export interface PeriodPickerWords extends PeriodIssueWords, IssueWords {
    /** The last row of the list, which opens the field an id is typed in. */
    other: string
    /** The typed field's name. */
    typed: string
    /** What the trigger says before a period is chosen. */
    placeholder: string
}

const WORDS: PeriodPickerWords = {
    ...PERIOD_ISSUE_WORDS,
    ...ISSUE_WORDS,
    other: 'Other period',
    typed: 'Period id',
    placeholder: 'Choose a period',
}

/** The list's value for its last row, which no period id can be. */
const OTHER = '\u0000other'

export interface PeriodPickerProps {
    /** The type of period the report is made for; the list offers that type's recent periods. */
    type: PeriodType
    /** The chosen period's id, or null for none. */
    value: string | null
    onValueChange: (id: string | null) => void
    /** The day the recent periods count back from, as `YYYY-MM-DD`; today when not given. */
    today?: string
    /** How many recent periods are listed; the type's own number when not given (`PERIOD_TYPES`). */
    count?: number
    /** The trigger's id, for a `Field`'s label. */
    id?: string
    /** Hears what is wrong with a typed id, or null once it reads, so a form can count it. */
    onIssueChange?: (issue: string | null) => void
    disabled?: boolean
    className?: string
    words?: Partial<PeriodPickerWords>
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Today as `YYYY-MM-DD` in the page's own zone. */
function localToday(): string {
    const now = new Date()
    return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The period a report is made for: the recent periods of its type, newest first, each with its id
 * in the code face, and Other period last, which opens a field where any id is typed. A typed id is
 * read by its shape (`parsePeriod`) and refused with the issue mark until it names a period of the
 * type, saying what the type looks like; the value changes only once it reads. A value not in the
 * list, such as an older period, opens on the typed field. Ids are as `lib/periods` writes them:
 * `20261108`, `2026W45`, `202611`, `202611B`, `2026Q4`, `2026S2`, `2026`.
 */
export function PeriodPicker({
    type,
    value,
    onValueChange,
    today,
    count,
    id,
    onIssueChange,
    disabled,
    className,
    words: given,
}: PeriodPickerProps) {
    const words = { ...WORDS, ...given }
    const day = today ?? localToday()
    const periods = useMemo(() => recentPeriods(type, day, count), [type, day, count])
    const listed = value !== null && periods.some((period) => period.id === value)
    const [typing, setTyping] = useState(value !== null && !listed)
    const [text, setText] = useState(value !== null && !listed ? value : '')
    const issue = typing ? periodIssue(text, type, words) : null
    const shown = typing && text.trim() !== '' ? issue : null

    // A value set from outside that the list does not hold opens the typed field on it.
    useEffect(() => {
        if (value !== null && !periods.some((period) => period.id === value) && value !== text.trim()) {
            setTyping(true)
            setText(value)
        }
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a new value from outside is followed; the text follows typing
    }, [value, periods])

    useEffect(() => onIssueChange?.(shown), [shown, onIssueChange])

    const items = [...periods.map((period) => ({ value: period.id, label: period.label })), { value: OTHER, label: words.other }]
    const selected = typing ? OTHER : listed ? value : null
    const typedId = id === undefined ? undefined : `${id}-typed`

    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <Select
                items={items}
                value={selected}
                disabled={disabled}
                onValueChange={(next) => {
                    if (next === null) return
                    if (next === OTHER) {
                        setTyping(true)
                        const read = parsePeriod(text, type)
                        if (read !== null) onValueChange(read.id)
                        return
                    }
                    setTyping(false)
                    onValueChange(next)
                }}
            >
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={words.placeholder}>
                        {(chosen: string | null) => {
                            if (chosen === OTHER) return words.other
                            const period = periods.find((one) => one.id === chosen)
                            return period === undefined ? words.placeholder : <PeriodRow label={period.label} id={period.id} />
                        }}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="max-h-80">
                    {periods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                            <PeriodRow label={period.label} id={period.id} />
                        </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value={OTHER}>{words.other}</SelectItem>
                </SelectContent>
            </Select>
            {typing && (
                <div className="relative min-w-0">
                    <Input
                        id={typedId}
                        aria-label={words.typed}
                        aria-invalid={shown !== null || undefined}
                        placeholder={PERIOD_TYPES[type].example}
                        value={text}
                        disabled={disabled}
                        autoComplete="off"
                        spellCheck={false}
                        className={cn('font-mono', shown !== null && cn('pr-9', ISSUE_EDGE.critical))}
                        onChange={(event) => {
                            const next = event.target.value
                            setText(next)
                            const read = parsePeriod(next, type)
                            onValueChange(read === null ? null : read.id)
                        }}
                    />
                    {shown !== null && <IssueMark issues={[{ tone: 'critical', text: shown }]} words={words} />}
                </div>
            )}
        </div>
    )
}

function PeriodRow({ label, id }: { label: string; id: string }) {
    return (
        <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate">{label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{id}</span>
        </span>
    )
}
