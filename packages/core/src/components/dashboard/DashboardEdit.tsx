import { Check, Pencil, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '../ui/button'
import type { DashboardLayoutItem } from './DashboardArrange'

/** The words a dashboard's edit buttons say, each with an English default. */
export interface DashboardEditWords {
    edit: string
    done: string
    cancel: string
    reset: string
    /** Why Reset is shut while the layout is already the default. */
    isDefault: string
}

export const DASHBOARD_EDIT_WORDS: DashboardEditWords = {
    edit: 'Edit',
    done: 'Done',
    cancel: 'Cancel',
    reset: 'Reset',
    isDefault: 'The dashboard is as it comes.',
}

export interface DashboardEditOptions<T extends DashboardLayoutItem> {
    /** The layout as kept. */
    layout: readonly T[]
    /** The layout Reset puts back; no Reset without it. */
    defaultLayout?: readonly T[]
    /** Keeps the edited layout once Done is pressed; a promise holds the edited layout drawn until it settles. */
    onSave: (layout: T[]) => void | Promise<unknown>
    /** Whether two items are the same in place and width; by `id` and `span` when left out. */
    same?: (left: T, right: T) => boolean
}

/** A dashboard's edit mode: the layout to draw, and what its buttons do. */
export interface DashboardEdit<T extends DashboardLayoutItem> {
    editing: boolean
    /** The layout to draw: the edits while editing, else the kept one. */
    layout: T[]
    /** Takes a change to the layout, such as `DashboardArrange`'s `onLayoutChange`. */
    change: (layout: T[]) => void
    edit: () => void
    /** Keeps the edits, when there are any, and leaves edit mode. */
    done: () => void
    /** Throws the edits away and leaves edit mode. */
    cancel: () => void
    /** Puts the default layout in the edits, kept once Done is pressed; undefined without a default. */
    reset: (() => void) | undefined
    /** Whether the edits differ from the kept layout. */
    changed: boolean
    /** Whether the layout drawn is the default. */
    isDefault: boolean
}

const sameItem = (left: DashboardLayoutItem, right: DashboardLayoutItem) => left.id === right.id && left.span === right.span

/**
 * Edit mode for an arranged dashboard: while editing, every move, width, removal and addition goes
 * into a draft, Done keeps it through `onSave`, Cancel throws it away and Reset puts the default in
 * the draft. Its `layout` and `change` go to `DashboardArrange`, and `DashboardEditActions` draws
 * the buttons.
 */
export function useDashboardEdit<T extends DashboardLayoutItem>({
    layout,
    defaultLayout,
    onSave,
    same = sameItem,
}: DashboardEditOptions<T>): DashboardEdit<T> {
    const [draft, setDraft] = useState<T[] | null>(null)
    // The layout last saved, drawn until the save settles, so Done never jumps back.
    const [held, setHeld] = useState<T[] | null>(null)
    const equal = (left: readonly T[], right: readonly T[]) =>
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && same(item, other)
        })
    const kept = held ?? [...layout]
    const shown = draft ?? kept
    const done = () => {
        if (draft !== null && !equal(draft, kept)) {
            const saved = draft
            const result = onSave(saved)
            if (result instanceof Promise) {
                setHeld(saved)
                const clear = () => setHeld((now) => (now === saved ? null : now))
                result.then(clear, clear)
            }
        }
        setDraft(null)
    }
    return {
        editing: draft !== null,
        layout: shown,
        change: (next) => setDraft(next),
        edit: () => setDraft(kept),
        done,
        cancel: () => setDraft(null),
        reset: defaultLayout === undefined ? undefined : () => setDraft([...defaultLayout]),
        changed: draft !== null && !equal(draft, kept),
        isDefault: defaultLayout !== undefined && equal(shown, defaultLayout),
    }
}

export interface DashboardEditActionsProps<T extends DashboardLayoutItem> {
    /** The edit mode, from `useDashboardEdit`. */
    edit: DashboardEdit<T>
    size?: 'sm' | 'default'
    /** Drawn before Edit while not editing, such as the page's other actions. */
    children?: ReactNode
    /** The page's primary action, drawn after Edit while not editing, so it stays last. */
    primary?: ReactNode
    words?: Partial<DashboardEditWords>
}

/**
 * A dashboard's edit buttons for its page header: Edit, and while editing Reset (shut while the
 * layout is the default), Cancel and Done. `children` and `primary` are the page's other actions,
 * before and after Edit, hidden while editing.
 */
export function DashboardEditActions<T extends DashboardLayoutItem>({
    edit,
    size = 'sm',
    children,
    primary,
    words: given,
}: DashboardEditActionsProps<T>) {
    const words = { ...DASHBOARD_EDIT_WORDS, ...given }
    if (!edit.editing)
        return (
            <>
                {children}
                <Button variant="outline" size={size} onClick={edit.edit}>
                    <Pencil aria-hidden />
                    {words.edit}
                </Button>
                {primary}
            </>
        )
    return (
        <>
            {edit.reset !== undefined && (
                <Button variant="ghost" size={size} onClick={edit.reset} reason={edit.isDefault ? words.isDefault : undefined}>
                    <RotateCcw aria-hidden />
                    {words.reset}
                </Button>
            )}
            <Button variant="outline" size={size} onClick={edit.cancel}>
                {words.cancel}
            </Button>
            <Button size={size} onClick={edit.done}>
                <Check aria-hidden />
                {words.done}
            </Button>
        </>
    )
}
