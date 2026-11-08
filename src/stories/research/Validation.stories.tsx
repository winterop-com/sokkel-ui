import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, ChevronUp, CircleAlert, CornerDownRight, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { IssueCount, type Issue, type IssueEntry } from '@winterop-com/sokkel-ui/IssueMark'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Popover, PopoverContent, PopoverTrigger } from '@winterop-com/sokkel-ui/primitives/popover'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'

/**
 * The second validation round: the issue mark at a field's end stays, and what is weighed is
 * everything around it. Every option draws the same Tidevann job, nightly-export, with the same
 * issues: a schedule not written in cron and a host without its domain stop the save, and twelve
 * retries are allowed but worth a look. Each story lays its options side by side, lettered, so an
 * answer reads "1B, 2A, 3C, 4B, 5A".
 *
 * 1. Count: the count's look and place. A, Current; B, Filled; C, Text link; D, On the verb.
 * 2. List: where the list of issues shows. A, At the count; B, Summary on top; C, Inline only.
 * 3. Stepping: how a long form leads from one issue to the next. A, Previous and next; B, Next
 *    issue; C, Scroll marks.
 * 4. Warnings: warnings beside errors. A, Current; B, Two counts; C, One count; D, Split count.
 * 5. Page and dialog: a page form's bar against a dialog's footer. A, Beside the verb; B, At the
 *    start; C, Mixed; D, Washed bar.
 *
 * These are drafts for picking only; the pick folds into `IssueCount`, `Field` and `SchemaForm`.
 */
const meta: Meta = {
    title: 'Research/Validation round',
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

type Tone = Issue['tone']

const INK: Record<Tone, string> = { critical: 'text-critical-ink', warning: 'text-warning-ink' }
const ICON: Record<Tone, typeof CircleAlert> = { critical: CircleAlert, warning: TriangleAlert }

/** One setting of the job: its field, its value, and what is wrong with it. */
interface Setting {
    id: string
    label: string
    hint?: string
    value: string
    mono?: boolean
    numeric?: boolean
    issue?: Issue
}

const NAME: Setting = { id: 'name', label: 'Name', value: 'nightly-export', mono: true }
const SCHEDULE: Setting = {
    id: 'schedule',
    label: 'Schedule',
    hint: 'cron',
    value: 'every night at 2',
    mono: true,
    issue: { tone: 'critical', text: 'Write the schedule in cron.', detail: 'Such as 0 2 * * * for 02:00 every night.' },
}
const RETRIES: Setting = {
    id: 'retries',
    label: 'Retries',
    value: '12',
    numeric: true,
    issue: { tone: 'warning', text: 'Twelve retries can hold the queue for hours.', detail: 'Five or fewer is usual.' },
}
const HOST: Setting = {
    id: 'host',
    label: 'Target host',
    value: 'export',
    mono: true,
    issue: { tone: 'critical', text: 'Enter the full host name.', detail: 'Such as export.example.org.' },
}

/** The short form every story but Stepping draws: two errors and a warning. */
const SHORT: readonly Setting[] = [NAME, SCHEDULE, RETRIES, HOST]

/** The long form Stepping draws, taller than its frame: three errors and a warning far apart. */
const LONG: readonly Setting[] = [
    NAME,
    { id: 'project', label: 'Project', value: 'harbor' },
    SCHEDULE,
    { id: 'zone', label: 'Time zone', value: 'Europe/Oslo' },
    { id: 'timeout', label: 'Timeout', hint: 'minutes', value: '30', numeric: true },
    RETRIES,
    {
        id: 'delay',
        label: 'Retry delay',
        hint: 'seconds',
        value: 'soon',
        numeric: true,
        issue: { tone: 'critical', text: 'Enter the delay in seconds.', detail: 'Such as 120 for two minutes.' },
    },
    { id: 'step', label: 'First step', value: 'fetch' },
    HOST,
    { id: 'path', label: 'Upload path', value: '/exports/nightly', mono: true },
    { id: 'notify', label: 'Notify', value: 'ada, grace' },
    { id: 'owner', label: 'Owner', value: 'margaret' },
]

/** The settings with issues, errors first, in the form's order within each tone. */
function issuesOf(settings: readonly Setting[]): Setting[] {
    const withIssue = settings.filter((setting) => setting.issue !== undefined)
    return [...withIssue.filter((s) => s.issue?.tone === 'critical'), ...withIssue.filter((s) => s.issue?.tone === 'warning')]
}

function countOf(settings: readonly Setting[]) {
    return {
        critical: settings.filter((s) => s.issue?.tone === 'critical').length,
        warning: settings.filter((s) => s.issue?.tone === 'warning').length,
    }
}

/** A form's own state: which field's mark is open, and how to go to a field. */
function useJobForm(prefix: string, initial: string | null = null) {
    const [open, setOpen] = useState<string | null>(initial)
    const go = (id: string) => {
        const input = document.getElementById(`${prefix}-${id}`)
        input?.scrollIntoView({ block: 'center' })
        input?.focus({ preventScroll: true })
        setOpen(id)
    }
    return { prefix, open, setOpen, go }
}
type JobForm = ReturnType<typeof useJobForm>

function entriesOf(form: JobForm, settings: readonly Setting[]): IssueEntry[] {
    return issuesOf(settings).map((setting) => ({
        label: setting.label,
        issue: setting.issue as Issue,
        onGo: () => form.go(setting.id),
    }))
}

/** The job's fields, each with the library's issue mark. */
function JobFields({ form, settings }: { form: JobForm; settings: readonly Setting[] }) {
    return (
        <>
            {settings.map((setting) => (
                <TextField
                    key={setting.id}
                    id={`${form.prefix}-${setting.id}`}
                    label={setting.label}
                    hint={setting.hint}
                    mono={setting.mono}
                    numeric={setting.numeric}
                    defaultValue={setting.value}
                    issues={setting.issue === undefined ? [] : [setting.issue]}
                    issueOpen={form.open === setting.id}
                    onIssueOpenChange={(next) => form.setOpen(next ? setting.id : null)}
                />
            ))}
        </>
    )
}

/* ------------------------------------------------------------------------------------------------
 * The frame around an option, and the sheet of options.
 * --------------------------------------------------------------------------------------------- */

function Sheet({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground max-sm:px-3">
            <div className="mx-auto flex max-w-400 flex-col gap-5">
                <h1 className="text-title font-semibold">{title}</h1>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-6">{children}</div>
            </div>
        </div>
    )
}

function Option({ letter, name, note, children }: { letter: string; name: string; note: string; children: ReactNode }) {
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-sm font-semibold">
                    {letter}. {name}
                </h2>
                <p className="text-xs text-muted-foreground">{note}</p>
            </div>
            {children}
        </section>
    )
}

/** A short form on a card, closed by its bar. */
function Card({ children, bar }: { children: ReactNode; bar: ReactNode }) {
    return (
        <Surface className="flex flex-col gap-4 p-4">
            {children}
            <FormBar placement="end">{bar}</FormBar>
        </Surface>
    )
}

/* ------------------------------------------------------------------------------------------------
 * Drafts of the count and its list.
 * --------------------------------------------------------------------------------------------- */

/** The list of issues, each naming its field; choosing one goes there and opens its mark. */
function IssueList({ entries, onChoose }: { entries: readonly IssueEntry[]; onChoose?: () => void }) {
    return (
        <>
            {entries.map((entry) => {
                const Mark = ICON[entry.issue.tone]
                return (
                    <button
                        key={entry.label}
                        type="button"
                        onClick={() => {
                            onChoose?.()
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
        </>
    )
}

/** A count drawn by `face` that opens the list above it. */
function ListCount({
    face,
    children,
    entries,
    defaultOpen = false,
}: {
    face: string
    children: ReactNode
    entries: readonly IssueEntry[]
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<button type="button" className={face} />}>{children}</PopoverTrigger>
            <PopoverContent
                side="top"
                align="start"
                sideOffset={6}
                initialFocus={false}
                finalFocus={false}
                className="w-[min(22rem,calc(100vw-2rem))] gap-1 p-1.5"
            >
                <IssueList entries={entries} onChoose={() => setOpen(false)} />
            </PopoverContent>
        </Popover>
    )
}

const CHIP = 'flex h-7 min-w-0 items-center gap-1.5 rounded-control border px-2 text-xs font-medium outline-none'
const CHIP_TONE: Record<Tone, string> = {
    critical: 'border-critical/40 bg-critical/8 text-critical-ink hover:bg-critical/12 data-popup-open:bg-critical/12',
    warning: 'border-warning/45 bg-warning/8 text-warning-ink hover:bg-warning/12 data-popup-open:bg-warning/12',
}
const FILLED =
    'flex h-7 items-center gap-1.5 rounded-control bg-critical px-2.5 text-xs font-semibold text-critical-foreground outline-none'
const LINK =
    'flex h-7 items-center gap-1 rounded-sm text-sm font-medium text-critical-ink underline decoration-critical/40 underline-offset-3 outline-none hover:decoration-critical'

function Verbs({ save = <Button size="sm">Save</Button>, cancel = true }: { save?: ReactNode; cancel?: boolean }) {
    return (
        <>
            {cancel && (
                <Button size="sm" variant="ghost">
                    Cancel
                </Button>
            )}
            {save}
        </>
    )
}

/** Save carrying the count of what stops it. */
function SaveWithCount({ count, entries }: { count: number; entries: readonly IssueEntry[] }) {
    return (
        <Popover>
            <PopoverTrigger render={<Button size="sm" aria-disabled className="cursor-not-allowed gap-2" />}>
                Save
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-chip bg-critical px-1 text-xs font-semibold text-critical-foreground">
                    {count}
                </span>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                sideOffset={6}
                initialFocus={false}
                className="w-[min(22rem,calc(100vw-2rem))] gap-1 p-1.5"
            >
                <p className="px-2 pt-1 text-xs text-muted-foreground">Fix these to save</p>
                <IssueList entries={entries} />
            </PopoverContent>
        </Popover>
    )
}

/* ------------------------------------------------------------------------------------------------
 * 1. Count
 * --------------------------------------------------------------------------------------------- */

function CountOption({ letter }: { letter: 'A' | 'B' | 'C' | 'D' }) {
    const form = useJobForm(`count-${letter}`)
    const entries = entriesOf(form, SHORT)
    const { critical, warning } = countOf(SHORT)
    const bar = {
        A: (
            <>
                <IssueCount critical={critical} warning={warning} list={entries} />
                <Verbs />
            </>
        ),
        B: (
            <>
                <ListCount face={FILLED} entries={entries}>
                    <CircleAlert className="size-3.5" aria-hidden />
                    {critical} to fix
                </ListCount>
                <Verbs />
            </>
        ),
        C: (
            <>
                <ListCount face={LINK} entries={entries}>
                    <CircleAlert className="size-4" aria-hidden />
                    {critical} issues
                </ListCount>
                <Verbs />
            </>
        ),
        D: <Verbs save={<SaveWithCount count={critical} entries={entries} />} />,
    }[letter]
    return (
        <Card bar={bar}>
            <JobFields form={form} settings={SHORT} />
        </Card>
    )
}

/**
 * 1. Count, the count's look and place. A, Current: the tinted chip beside the verb, "2 to fix".
 * B, Filled: the same place, filled in the danger color. C, Text link: "2 issues" as a link in the
 * danger ink, no box. D, On the verb: Save carries the count as a badge, and pressing it lists
 * what stops it.
 */
export const Count: StoryObj = {
    render: () => (
        <Sheet title="1. The count's look and place">
            <Option letter="A" name="Current" note="A tinted chip beside the verb, as today.">
                <CountOption letter="A" />
            </Option>
            <Option letter="B" name="Filled" note="The same chip filled in the danger color.">
                <CountOption letter="B" />
            </Option>
            <Option letter="C" name="Text link" note="The count said as a link in the danger ink.">
                <CountOption letter="C" />
            </Option>
            <Option letter="D" name="On the verb" note="Save carries the count; pressing it lists the issues.">
                <CountOption letter="D" />
            </Option>
        </Sheet>
    ),
}

/* ------------------------------------------------------------------------------------------------
 * 2. List
 * --------------------------------------------------------------------------------------------- */

function Summary({ entries }: { entries: readonly IssueEntry[] }) {
    return (
        <div role="alert" className="flex flex-col gap-1.5 rounded-surface border border-critical/40 bg-critical/8 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-critical-ink">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                {entries.filter((entry) => entry.issue.tone === 'critical').length} to fix before saving
            </p>
            <ul className="flex flex-col gap-1 pl-6">
                {entries.map((entry) => (
                    <li key={entry.label} className="text-sm">
                        <button
                            type="button"
                            onClick={entry.onGo}
                            className="text-left underline decoration-border-strong underline-offset-3 outline-none hover:decoration-foreground"
                        >
                            <span className="font-medium">{entry.label}</span>: {entry.issue.text}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function ListOption({ letter }: { letter: 'A' | 'B' | 'C' }) {
    const form = useJobForm(`list-${letter}`, letter === 'C' ? SCHEDULE.id : null)
    const entries = entriesOf(form, SHORT)
    const { critical, warning } = countOf(SHORT)
    const face = cn(CHIP, CHIP_TONE.critical)
    const said = (
        <>
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {critical} to fix
        </>
    )
    if (letter === 'A') {
        return (
            <Card
                bar={
                    <>
                        <ListCount face={face} entries={entries} defaultOpen>
                            {said}
                        </ListCount>
                        <Verbs />
                    </>
                }
            >
                <JobFields form={form} settings={SHORT} />
            </Card>
        )
    }
    if (letter === 'B') {
        return (
            <Card
                bar={
                    <>
                        <IssueCount critical={critical} warning={warning} list={[]} />
                        <Verbs />
                    </>
                }
            >
                <Summary entries={entries} />
                <JobFields form={form} settings={SHORT} />
            </Card>
        )
    }
    const first = issuesOf(SHORT)[0]
    return (
        <Card
            bar={
                <>
                    <button type="button" className={face} onClick={() => form.go(first.id)}>
                        {said}
                    </button>
                    <Verbs />
                </>
            }
        >
            <JobFields form={form} settings={SHORT} />
        </Card>
    )
}

/**
 * 2. List, where the issues are listed. A, At the count: pressing the count opens the list above
 * it, as today (shown open). B, Summary on top: the list stands at the top of the form once it is
 * submitted, each entry going to its field; the form grows by the summary. C, Inline only: no list;
 * the count goes straight to the first issue and opens its mark (shown after pressing it).
 */
export const List: StoryObj = {
    render: () => (
        <Sheet title="2. Where the list shows">
            <Option letter="A" name="At the count" note="The count opens the list above it.">
                <ListOption letter="A" />
            </Option>
            <Option letter="B" name="Summary on top" note="The list heads the form after a save.">
                <ListOption letter="B" />
            </Option>
            <Option letter="C" name="Inline only" note="The count opens the first field's mark.">
                <ListOption letter="C" />
            </Option>
        </Sheet>
    ),
}

/* ------------------------------------------------------------------------------------------------
 * 3. Stepping
 * --------------------------------------------------------------------------------------------- */

/** A long form scrolling in a frame of a page's height, its bar held to the frame's foot. */
function LongFrame({ form, bar, beside }: { form: JobForm; bar: ReactNode; beside?: ReactNode }) {
    return (
        <Surface className="flex h-160 max-h-[calc(100svh-10rem)] min-h-96">
            <div className="h-full min-w-0 flex-1 overflow-y-auto">
                <div className="flex min-h-full flex-col">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <JobFields form={form} settings={LONG} />
                    </div>
                    <FormBar inset="panel">{bar}</FormBar>
                </div>
            </div>
            {beside}
        </Surface>
    )
}

function SteppingOption({ letter }: { letter: 'A' | 'B' | 'C' }) {
    const steps = issuesOf(LONG)
    const form = useJobForm(`step-${letter}`, steps[0].id)
    const [at, setAt] = useState(0)
    const step = (to: number) => {
        const next = (to + steps.length) % steps.length
        setAt(next)
        form.go(steps[next].id)
    }
    const { critical } = countOf(LONG)
    const tone = steps[at].issue?.tone ?? 'critical'
    if (letter === 'A') {
        return (
            <LongFrame
                form={form}
                bar={
                    <>
                        <div className={cn(CHIP, CHIP_TONE[tone], 'gap-0 px-0.5')}>
                            <IconButton label="Previous issue" size="icon-xs" className="text-current" onClick={() => step(at - 1)}>
                                <ChevronUp aria-hidden />
                            </IconButton>
                            <span className="px-1 tabular-nums">
                                {at + 1} of {steps.length}
                            </span>
                            <IconButton label="Next issue" size="icon-xs" className="text-current" onClick={() => step(at + 1)}>
                                <ChevronDown aria-hidden />
                            </IconButton>
                        </div>
                        <Verbs />
                    </>
                }
            />
        )
    }
    if (letter === 'B') {
        return (
            <LongFrame
                form={form}
                bar={
                    <>
                        <button type="button" className={cn(CHIP, CHIP_TONE.critical)} onClick={() => step(at + 1)}>
                            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                            {critical} to fix
                            <span className="flex items-center gap-1 border-l border-critical/30 pl-1.5 text-foreground">
                                <CornerDownRight className="size-3.5" aria-hidden />
                                Next: {steps[(at + 1) % steps.length].label}
                            </span>
                        </button>
                        <Verbs />
                    </>
                }
            />
        )
    }
    return (
        <LongFrame
            form={form}
            bar={
                <>
                    <IssueCount critical={critical} warning={0} list={entriesOf(form, LONG)} />
                    <Verbs />
                </>
            }
            beside={
                <div className="relative w-3 shrink-0 border-l border-border bg-muted/40" aria-hidden>
                    {LONG.map((setting, index) =>
                        setting.issue === undefined ? null : (
                            <button
                                key={setting.id}
                                type="button"
                                tabIndex={-1}
                                onClick={() => step(steps.indexOf(setting))}
                                className={cn(
                                    'absolute inset-x-0.5 h-2 rounded-sm',
                                    setting.issue.tone === 'critical' ? 'bg-critical' : 'bg-warning',
                                    steps[at] === setting && 'ring-2 ring-ring/60',
                                )}
                                style={{ top: `${String(((index + 0.5) / (LONG.length + 1)) * 100)}%` }}
                            />
                        ),
                    )}
                </div>
            }
        />
    )
}

/**
 * 3. Stepping, how a long form leads from one issue to the next; each step scrolls the field into
 * view, focuses it and opens its mark, and each option starts at the first issue. A, Previous and
 * next: the count becomes "1 of 4" between up and down arrows. B, Next issue: the count names the
 * next field and goes there when pressed, round to the first after the last. C, Scroll marks: a mark
 * beside the scroll bar for each issue, at its place in the form, beside today's count.
 */
export const Stepping: StoryObj = {
    render: () => (
        <Sheet title="3. Leading from one issue to the next">
            <Option letter="A" name="Previous and next" note="Arrows step through the issues, errors first.">
                <SteppingOption letter="A" />
            </Option>
            <Option letter="B" name="Next issue" note="The count names the next field and goes there.">
                <SteppingOption letter="B" />
            </Option>
            <Option letter="C" name="Scroll marks" note="A mark beside the scroll bar for each issue.">
                <SteppingOption letter="C" />
            </Option>
        </Sheet>
    ),
}

/* ------------------------------------------------------------------------------------------------
 * 4. Warnings
 * --------------------------------------------------------------------------------------------- */

function WarningCounts({
    letter,
    critical,
    warning,
    entries,
}: {
    letter: string
    critical: number
    warning: number
    entries: IssueEntry[]
}) {
    if (letter === 'A') return <IssueCount critical={critical} warning={warning} list={entries} />
    if (letter === 'B') {
        return (
            <>
                {critical > 0 && (
                    <ListCount face={cn(CHIP, CHIP_TONE.critical)} entries={entries.filter((entry) => entry.issue.tone === 'critical')}>
                        <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                        {critical} to fix
                    </ListCount>
                )}
                {warning > 0 && (
                    <ListCount face={cn(CHIP, CHIP_TONE.warning)} entries={entries.filter((entry) => entry.issue.tone === 'warning')}>
                        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                        {warning} to look at
                    </ListCount>
                )}
            </>
        )
    }
    const tone: Tone = critical > 0 ? 'critical' : 'warning'
    if (letter === 'C') {
        const Icon = ICON[tone]
        const total = critical + warning
        return (
            <ListCount face={cn(CHIP, CHIP_TONE[tone])} entries={entries}>
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {total} {total === 1 ? 'issue' : 'issues'}
            </ListCount>
        )
    }
    return (
        <ListCount face={cn(CHIP, 'border-border-strong bg-card px-0 hover:bg-hover data-popup-open:bg-hover', 'gap-0')} entries={entries}>
            {critical > 0 && (
                <span className="flex items-center gap-1 px-2 text-critical-ink">
                    <CircleAlert className="size-3.5" aria-hidden />
                    {critical}
                </span>
            )}
            {warning > 0 && (
                <span className={cn('flex items-center gap-1 px-2 text-warning-ink', critical > 0 && 'border-l border-border')}>
                    <TriangleAlert className="size-3.5" aria-hidden />
                    {warning}
                </span>
            )}
        </ListCount>
    )
}

function WarningOption({ letter }: { letter: 'A' | 'B' | 'C' | 'D' }) {
    const form = useJobForm(`warn-${letter}`)
    const entries = entriesOf(form, SHORT)
    const { critical, warning } = countOf(SHORT)
    return (
        <div className="flex flex-col gap-3">
            <Card
                bar={
                    <>
                        <WarningCounts letter={letter} critical={critical} warning={warning} entries={entries} />
                        <Verbs cancel={false} />
                    </>
                }
            >
                <JobFields form={form} settings={SHORT} />
            </Card>
            <Surface className="flex flex-col gap-1.5 p-3">
                <p className="text-xs text-muted-foreground">Once the errors are fixed</p>
                <FormBar placement="end">
                    <WarningCounts
                        letter={letter}
                        critical={0}
                        warning={warning}
                        entries={entries.filter((entry) => entry.issue.tone === 'warning')}
                    />
                    <Verbs cancel={false} />
                </FormBar>
            </Surface>
        </div>
    )
}

/**
 * 4. Warnings, said beside errors; under each form its bar once the errors are fixed, with Save
 * alone so the counts have the room. A, Current:
 * the count says only the errors while there are any, and the warnings after. B, Two counts: a
 * count for each tone in its own ink. C, One count: every issue counted together in the worst
 * one's ink. D, Split count: one control with a figure for each tone.
 */
export const Warnings: StoryObj = {
    render: () => (
        <Sheet title="4. Warnings beside errors">
            <Option letter="A" name="Current" note="Errors only, until none are left.">
                <WarningOption letter="A" />
            </Option>
            <Option letter="B" name="Two counts" note="A count for each tone, in its own ink.">
                <WarningOption letter="B" />
            </Option>
            <Option letter="C" name="One count" note="All issues together, in the worst ink.">
                <WarningOption letter="C" />
            </Option>
            <Option letter="D" name="Split count" note="One control, a figure for each tone.">
                <WarningOption letter="D" />
            </Option>
        </Sheet>
    ),
}

/* ------------------------------------------------------------------------------------------------
 * 5. Page and dialog
 * --------------------------------------------------------------------------------------------- */

type Place = 'verb' | 'start'

/** A page's form scrolling over its bar at the foot. */
function PageFrame({ place, washed = false }: { place: Place; washed?: boolean }) {
    const form = useJobForm(`page-${place}-${String(washed)}`)
    const entries = entriesOf(form, SHORT)
    const { critical, warning } = countOf(SHORT)
    const count = washed ? (
        <ListCount face={LINK} entries={entries}>
            <CircleAlert className="size-4" aria-hidden />
            {critical} to fix before saving
        </ListCount>
    ) : (
        <IssueCount critical={critical} warning={warning} list={entries} />
    )
    return (
        <Surface className="h-96">
            <div className="h-full overflow-y-auto">
                <div className="flex min-h-full flex-col">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <p className="text-title font-semibold">nightly-export</p>
                        <JobFields form={form} settings={SHORT} />
                    </div>
                    <FormBar
                        inset="panel"
                        note={
                            place === 'start' || washed ? (
                                <>
                                    {count}
                                    {!washed && <span className="max-sm:hidden">Draft saved at 09:52</span>}
                                </>
                            ) : (
                                'Draft saved at 09:52'
                            )
                        }
                        className={washed ? 'border-critical/50 bg-critical-wash' : undefined}
                    >
                        {place === 'verb' && !washed && count}
                        <Button size="sm" variant="ghost">
                            Cancel
                        </Button>
                        <Button size="sm" variant="outline">
                            Save draft
                        </Button>
                        <Button size="sm" aria-disabled className="cursor-not-allowed">
                            Save
                        </Button>
                    </FormBar>
                </div>
            </div>
        </Surface>
    )
}

/** A dialog drawn in place, as `DialogShell` draws one: title, body, and its footer. */
function DialogFrame({ place, washed = false }: { place: Place; washed?: boolean }) {
    const form = useJobForm(`dialog-${place}-${String(washed)}`)
    const entries = entriesOf(form, SHORT)
    const { critical, warning } = countOf(SHORT)
    const count = washed ? (
        <ListCount face={LINK} entries={entries}>
            <CircleAlert className="size-4" aria-hidden />
            {critical} to fix
        </ListCount>
    ) : (
        <IssueCount critical={critical} warning={warning} list={entries} />
    )
    return (
        <div className="flex w-full max-w-md flex-col gap-4 self-start rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <p className="text-base leading-6 font-medium">Edit job</p>
            <div className="flex flex-col gap-4">
                <JobFields form={form} settings={SHORT} />
            </div>
            <div
                className={cn(
                    '-mx-4 -mb-4 flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4',
                    washed && 'border-critical/50 bg-critical-wash',
                )}
            >
                {(place === 'start' || washed) && <div className="mr-auto min-w-0">{count}</div>}
                {place === 'verb' && !washed && count}
                <Button variant="ghost">Cancel</Button>
                <Button aria-disabled className="cursor-not-allowed">
                    Save
                </Button>
            </div>
        </div>
    )
}

function PlaceOption({
    letter,
    name,
    note,
    page,
    dialog,
    washed,
}: {
    letter: string
    name: string
    note: string
    page: Place
    dialog: Place
    washed?: boolean
}) {
    return (
        <Option letter={letter} name={name} note={note}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-xs text-faint">Page</p>
                    <PageFrame place={page} washed={washed} />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-xs text-faint">Dialog</p>
                    <DialogFrame place={dialog} washed={washed} />
                </div>
            </div>
        </Option>
    )
}

/**
 * 5. Page and dialog, a page form's bar against a dialog's footer. A, Beside the verb: the count
 * just before the verbs in both, as today. B, At the start: the count opens the bar and the footer,
 * at the left, the verbs alone at the right. C, Mixed: at the start of a page's wide bar, beside
 * the verb in a dialog's narrow footer. D, Washed bar: while something stops the save, the bar and
 * the footer take the danger wash and say so in words at their start.
 */
export const PageAndDialog: StoryObj = {
    name: 'Page and dialog',
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground max-sm:px-3">
            <div className="mx-auto flex max-w-400 flex-col gap-5">
                <h1 className="text-title font-semibold">5. A page form&apos;s bar against a dialog&apos;s footer</h1>
                <div className="flex flex-col gap-10">
                    <PlaceOption
                        letter="A"
                        name="Beside the verb"
                        note="The count just before the verbs, in both."
                        page="verb"
                        dialog="verb"
                    />
                    <PlaceOption
                        letter="B"
                        name="At the start"
                        note="The count opens the bar and the footer."
                        page="start"
                        dialog="start"
                    />
                    <PlaceOption
                        letter="C"
                        name="Mixed"
                        note="At the start of a page, beside the verb in a dialog."
                        page="start"
                        dialog="verb"
                    />
                    <PlaceOption
                        letter="D"
                        name="Washed bar"
                        note="The bar and the footer take the danger wash."
                        page="start"
                        dialog="start"
                        washed
                    />
                </div>
            </div>
        </div>
    ),
}
