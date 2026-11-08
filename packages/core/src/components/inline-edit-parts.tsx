import { useEffect, useId, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react'

import { cn } from '../lib/cn'
import { editKey, parseNumber, type EditMove, type EditOption, type EditorKind, type EditWords } from '../lib/edit'
import { DateField } from './DateField'
import { ISSUE_EDGE, IssueMark } from './IssueMark'
import { NumberField } from './NumberField'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Spinner } from './ui/spinner'
import { Textarea } from './ui/textarea'

/**
 * How an editor is drawn: `cell` over a table cell's whole box, its text where the cell's was;
 * `field` as a form field in place of a field value; `title` in a page title's type.
 */
export type EditorLook = 'cell' | 'field' | 'title'

export interface InlineEditorProps {
    kind: EditorKind
    look: EditorLook
    /** The editor's accessible name: the value's name, or the column's. */
    label: string
    draft: string
    onDraftChange: (draft: string) => void
    options?: readonly EditOption[]
    /** A save runs: the editor holds the typed text, read only, with a spinner at its end. */
    saving?: boolean
    /** Why the last save was refused, shown by a mark at the editor's end. */
    error?: string | null
    /** A select opens its list as the editor opens, as when the edit began with a press rather than a Tab. */
    openList?: boolean
    /** The typed text is selected as the editor opens; otherwise the caret goes to its end, after a key that started the edit. */
    selectAll?: boolean
    /** A table cell's keys: Tab moves to the next cell and Enter moves down. */
    inCell?: boolean
    align?: 'start' | 'end'
    placeholder?: string
    /** A key, or a button, that saves, drops or moves. */
    onMove: (move: EditMove) => void
    /** A select's choice, saved at once. */
    onChoose: (value: string) => void
    /** Focus left the editor for somewhere outside it. */
    onLeave: () => void
    /**
     * A save, or leaving, refused by the editor's own field: text a number or date field cannot
     * read, or a value outside its bounds, with what the field says of it.
     */
    onRefuse: (message: string, leaving: boolean) => void
    words: EditWords
    className?: string
}

/** Keeps a press inside the editor from reaching the row or the table around it, such as a row's open or its menu. */
const keep = (event: SyntheticEvent) => event.stopPropagation()

const SHAPE: Record<EditorLook, string> = {
    cell: 'h-full rounded-none border-0 bg-field px-3 ring-2 ring-ring ring-inset focus-visible:ring-2',
    field: 'h-8 px-2.5',
    // A title keeps its place: no box, only a rule under it, so its text stays where the title's was.
    // It is as wide as its text, as the title is, so a heading that sizes to its content gives it room.
    title: 'h-auto min-w-16 rounded-none border-0 border-b-2 border-ring bg-transparent px-0 py-0.5 font-heading text-page-title text-page-title-ink field-sizing-content focus-visible:border-ring focus-visible:ring-0 md:text-page-title dark:bg-transparent',
}

/** A typed field's frame over a table cell: the cell's own box, its figures at the end. */
const CELL_FRAME = 'h-full rounded-none border-0 px-3 ring-2 ring-ring ring-inset focus-within:ring-2'

/** A refused editor's edge: the issue edge for a field, the rule in the critical ink for a title. */
const REFUSED: Record<EditorLook, string> = {
    cell: 'ring-critical focus-visible:ring-critical focus-within:ring-critical',
    field: ISSUE_EDGE.critical,
    title: 'border-critical focus-visible:border-critical aria-invalid:ring-0',
}

/**
 * The control an edit types into: a text input, a text area, a `NumberField` or a `DateField`
 * drawn bare, or a select's list. It focuses itself as it opens, keeps every key and press inside
 * it from the row and the table around it, and tells its owner what a key, a choice or leaving it
 * asks for; the owner holds the draft and runs the save. Focus that moves into its list, its
 * calendar or its mark has not left it.
 */
export function InlineEditor({
    kind,
    look,
    label,
    draft,
    onDraftChange,
    options = [],
    saving = false,
    error = null,
    openList = true,
    selectAll = true,
    inCell = false,
    align = 'start',
    placeholder,
    onMove,
    onChoose,
    onLeave,
    onRefuse,
    words,
    className,
}: InlineEditorProps) {
    const id = useId()
    const box = useRef<HTMLSpanElement>(null)
    const control = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLButtonElement>(null)
    const chosen = useRef(false)
    // What a number or date field finds wrong with what is typed, which refuses a save.
    const fieldIssue = useRef<string | null>(null)
    // A refusal opens its mark at once, so it is read without a second press; typing closes it.
    const [markOpen, setMarkOpen] = useState(error !== null)
    useEffect(() => setMarkOpen(error !== null), [error])

    // Leaving waits a moment: focus that lands in a popup the editor draws (its list, its calendar, its mark)
    // comes back through React's tree and keeps the editor open.
    const latest = useRef({ onLeave, onRefuse })
    latest.current = { onLeave, onRefuse }
    const leaving = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    useEffect(() => () => clearTimeout(leaving.current), [])

    useEffect(() => {
        const element = control.current ?? box.current?.querySelector('input') ?? null
        if (element === null) return
        element.focus({ preventScroll: look === 'cell' })
        if ('setSelectionRange' in element && typeof element.setSelectionRange === 'function') {
            // Several lines are added to more often than replaced, so their caret goes to the end.
            if (selectAll && kind !== 'multiline') element.select()
            else element.setSelectionRange(element.value.length, element.value.length)
        }
        // Only as the editor opens; later renders leave the caret where the person put it.
    }, [])

    const move = (next: EditMove) => {
        if (next !== 'cancel' && fieldIssue.current !== null) return onRefuse(fieldIssue.current, false)
        onMove(next)
    }

    const onKeyDown = (event: KeyboardEvent) => {
        keep(event)
        // A popup's own keys (a list's Enter, a calendar's Escape) are its own; only Tab moves on from it.
        const inPopup = !(box.current?.contains(event.target as Node) ?? true)
        if (inPopup && event.key !== 'Tab') return
        const next = editKey(event, kind, inCell)
        if (next === undefined) return
        event.preventDefault()
        if (saving && next !== 'next' && next !== 'previous') return
        move(next)
    }

    const edge = error !== null && REFUSED[look]
    const end = saving || error !== null
    const typed = kind === 'number' || kind === 'date'
    const atEnd = align === 'end' || (look === 'cell' && kind === 'number')
    // The mark and the spinner sit at the side the text runs away from, so neither covers it, and clear of a field's buttons.
    const markLeft = (atEnd || typed) && kind !== 'select'

    let field
    if (kind === 'select') {
        const items = options.map((option) => ({ value: option.value, label: option.label ?? option.value }))
        field = (
            <Select
                items={items}
                value={draft}
                defaultOpen={openList}
                onValueChange={(value) => {
                    chosen.current = true
                    onChoose(String(value))
                }}
                onOpenChange={(open, details) => {
                    if (open) return
                    // Closed by choosing the value it had, by Escape or by a press outside: nothing changes.
                    if (details.reason !== 'item-press') onMove('cancel')
                    else queueMicrotask(() => !chosen.current && onMove('cancel'))
                }}
                disabled={saving}
            >
                <SelectTrigger
                    ref={control}
                    aria-label={label}
                    aria-invalid={error !== null || undefined}
                    className={cn(
                        'w-full',
                        look === 'cell' ? cn(SHAPE.cell, 'pr-2 data-[size=default]:h-full') : look === 'title' && SHAPE.title,
                        end && 'pr-9',
                        edge,
                    )}
                >
                    <SelectValue />
                </SelectTrigger>
                {/* The editor's owner puts the focus back as the editor closes, on the table or the value. */}
                <SelectContent finalFocus={false}>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    } else if (typed) {
        const frame = cn(look === 'cell' && CELL_FRAME, atEnd && '[&_input]:text-right', end && 'pl-9', look === 'cell' && edge)
        const shared = {
            id,
            label,
            bare: true,
            readOnly: saving,
            placeholder,
            error,
            className: frame,
            onIssueChange: (issue: { text: string } | null) => {
                fieldIssue.current = issue?.text ?? null
            },
        }
        field =
            kind === 'number' ? (
                <NumberField
                    {...shared}
                    defaultValue={parseNumber(draft) ?? null}
                    onValueChange={(value) => onDraftChange(value === null ? '' : String(value))}
                />
            ) : (
                <DateField {...shared} defaultValue={draft === '' ? null : draft} onValueChange={(value) => onDraftChange(value ?? '')} />
            )
    } else if (kind === 'multiline') {
        field = (
            <Textarea
                ref={control}
                aria-label={label}
                aria-invalid={error !== null || undefined}
                value={draft}
                rows={3}
                readOnly={saving}
                placeholder={placeholder}
                onChange={(event) => onDraftChange(event.target.value)}
                className={cn(
                    look === 'field' && 'min-h-20',
                    // In a cell the text area grows down over the rows under it, from the cell's own height.
                    look === 'cell' &&
                        'absolute inset-x-0 top-0 z-10 min-h-full rounded-none border-0 bg-field px-3 py-2 ring-2 ring-ring ring-inset focus-visible:ring-2',
                    look === 'title' && cn(SHAPE.title, 'min-h-0'),
                    end && 'pr-9',
                    edge,
                )}
            />
        )
    } else {
        field = (
            <Input
                ref={control}
                type="text"
                aria-label={label}
                aria-invalid={error !== null || undefined}
                value={draft}
                readOnly={saving}
                placeholder={placeholder}
                autoComplete="off"
                onChange={(event) => onDraftChange(event.target.value)}
                className={cn(SHAPE[look], atEnd && 'text-right', end && (markLeft ? 'pl-9' : 'pr-9'), edge)}
            />
        )
    }

    return (
        <span
            ref={box}
            data-slot="inline-editor"
            aria-busy={saving || undefined}
            className={cn(
                'relative flex min-w-0',
                look === 'cell' ? 'absolute inset-0' : look === 'title' ? 'w-fit max-w-full' : 'w-full flex-col gap-2',
                className,
            )}
            onKeyDown={onKeyDown}
            onClick={keep}
            onDoubleClick={keep}
            onContextMenu={keep}
            onFocus={() => clearTimeout(leaving.current)}
            onBlur={() => {
                clearTimeout(leaving.current)
                leaving.current = setTimeout(() => {
                    if (fieldIssue.current !== null) latest.current.onRefuse(fieldIssue.current, true)
                    else latest.current.onLeave()
                })
            }}
        >
            <span className={cn('relative flex min-w-0 flex-1', look === 'cell' && 'h-full')}>
                {field}
                {saving ? (
                    <span
                        className={cn(
                            'pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted-foreground',
                            markLeft && 'left-2.5',
                            look === 'cell' && kind === 'multiline' && 'z-10 h-(--density-row)',
                        )}
                    >
                        <Spinner className="size-3.5" aria-label={words.saving} />
                    </span>
                ) : (
                    error !== null && (
                        <IssueMark
                            issues={[{ tone: 'critical', text: error }]}
                            open={markOpen}
                            onOpenChange={setMarkOpen}
                            className={cn(markLeft && 'left-1', look === 'cell' && kind === 'multiline' && 'z-10')}
                        />
                    )
                )}
            </span>
            {kind === 'multiline' && look === 'field' && (
                <span className="flex items-center gap-1.5">
                    <Button size="xs" disabled={saving} onMouseDown={(event) => event.preventDefault()} onClick={() => move('save')}>
                        {words.save}
                    </Button>
                    <Button
                        size="xs"
                        variant="ghost"
                        disabled={saving}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => move('cancel')}
                    >
                        {words.cancel}
                    </Button>
                </span>
            )}
        </span>
    )
}
