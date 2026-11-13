import { Bookmark, ChevronDown, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'

import { cn } from '../lib/cn'
import { returnFocusOnKeyboard } from '../lib/focus'
import { viewChanges, type ListViewState, type ViewChange } from '../lib/list-views'
import { ConfirmDialog } from './DialogShell'
import { TextField } from './TextField'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Popover, PopoverContent } from './ui/popover'

export type { ListViewState, ViewChange }

/** A listing's setup kept under a name: its filters, sort and columns. */
export interface SavedView {
    id: string
    name: string
    state: ListViewState
    /** The app's own view, such as All: it can be picked and saved as a new one, never changed, renamed or deleted. */
    locked?: boolean
}

export interface SavedViewsWords {
    /** The menu's heading over the views. */
    views: string
    /** The trigger's text while the listing follows no view. */
    none: string
    /** Said beside the chosen view's name while the listing differs from it. */
    changed: string
    /** Saves the listing now into the chosen view. */
    save: string
    /** Saves the listing now as a new view, asking its name. */
    saveNew: string
    rename: string
    delete: string
    /** Puts the chosen view's setup back. */
    reset: string
    /** The name field. */
    name: string
    /** The name form's verb, for a new view and for a rename. */
    create: string
    renameDone: string
    cancel: string
    /** Why a name is refused. */
    nameTaken: string
    deleteQuestion: (name: string) => string
    deleteDetail: string
}

const WORDS: SavedViewsWords = {
    views: 'Views',
    none: 'Views',
    changed: 'Changed',
    save: 'Save',
    saveNew: 'Save as new view',
    rename: 'Rename',
    delete: 'Delete',
    reset: 'Reset',
    name: 'Name',
    create: 'Save',
    renameDone: 'Rename',
    cancel: 'Cancel',
    nameTaken: 'A view has this name already.',
    deleteQuestion: (name) => `Delete ${name}?`,
    deleteDetail: 'The listing stays as it is now.',
}

export interface SavedViewsProps {
    views: readonly SavedView[]
    /** The chosen view's id; none while the listing follows no view. */
    value: string | null
    /** A view picked from the menu, or the chosen one again on Reset: the app sets the listing to its state. */
    onValueChange: (view: SavedView) => void
    /** How the listing is set up now, compared with the chosen view. */
    current: ListViewState
    /** The table's column ids, so a column order is compared as the table draws it. */
    columns?: readonly string[]
    /** Saves the listing now into the chosen view: the app keeps `view`, which carries the new state. */
    onSave?: (view: SavedView) => void
    /** Saves the listing now as a new view under `name`: the app adds it and makes it the chosen one. */
    onSaveNew?: (name: string, state: ListViewState) => void
    onRename?: (view: SavedView, name: string) => void
    onDelete?: (view: SavedView) => void
    /** Opens the menu of views at first. */
    defaultOpen?: boolean
    words?: Partial<SavedViewsWords>
    className?: string
}

/**
 * The saved views of a listing: a menu that names the chosen view, lists the others to pick, and
 * saves the listing now as a new view, renames the chosen one or deletes it. While the listing
 * differs from the chosen view (its filters, sort or columns, compared by `viewChanges`) the
 * trigger says so, and Reset and Save stand beside it: Reset puts the view's setup back, Save keeps
 * the listing now in the view, or asks a name for a new one when the view is the app's own.
 *
 * The app keeps the views: the part takes `views` and says what changed through its callbacks, and
 * stores nothing itself. A name is asked in a popover under the trigger and a delete is confirmed
 * first.
 */
export function SavedViews({
    views,
    value,
    onValueChange,
    current,
    columns,
    onSave,
    onSaveNew,
    onRename,
    onDelete,
    defaultOpen = false,
    words: given,
    className,
}: SavedViewsProps) {
    const words = { ...WORDS, ...given }
    const nameId = useId()
    const trigger = useRef<HTMLButtonElement>(null)
    const asking = useRef(false)
    const [naming, setNaming] = useState<'new' | 'rename' | null>(null)
    const [name, setName] = useState('')
    const [deleting, setDeleting] = useState(false)
    const chosen = views.find((view) => view.id === value)
    const changed = chosen !== undefined && viewChanges(chosen.state, current, columns).length > 0
    const own = chosen !== undefined && chosen.locked !== true
    const canSave = own && onSave !== undefined
    const canRename = own && onRename !== undefined
    const canDelete = own && onDelete !== undefined

    const ask = (kind: 'new' | 'rename') => {
        asking.current = true
        setName(kind === 'rename' ? (chosen?.name ?? '') : '')
        setNaming(kind)
    }
    const save = () => {
        if (chosen !== undefined) onSave?.({ ...chosen, state: current })
    }
    const trimmed = name.trim()
    const taken = views.some(
        (view) =>
            view.name.trim().toLocaleLowerCase('en-US') === trimmed.toLocaleLowerCase('en-US') &&
            view !== (naming === 'rename' ? chosen : undefined),
    )
    const submit = (event: FormEvent) => {
        event.preventDefault()
        if (trimmed === '' || taken) return
        if (naming === 'new') onSaveNew?.(trimmed, current)
        else if (naming === 'rename' && chosen !== undefined) onRename?.(chosen, trimmed)
        setNaming(null)
    }

    return (
        <div data-slot="saved-views" className={cn('flex min-w-0 flex-wrap items-center gap-2', className)}>
            <DropdownMenu
                defaultOpen={defaultOpen}
                onOpenChange={(open) => {
                    if (open) asking.current = false
                }}
            >
                <DropdownMenuTrigger ref={trigger} render={<Button variant="outline" className="max-w-full min-w-0 justify-start" />}>
                    <Bookmark aria-hidden className="text-muted-foreground" />
                    <span className="min-w-0 truncate">{chosen?.name ?? words.none}</span>
                    {changed && <span className="shrink-0 font-normal text-muted-foreground">{words.changed}</span>}
                    <ChevronDown aria-hidden className="text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64" finalFocus={(type) => !asking.current && returnFocusOnKeyboard(type)}>
                    {views.length > 0 && (
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>{words.views}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={value ?? ''}
                                onValueChange={(id: string) => {
                                    const view = views.find((one) => one.id === id)
                                    if (view !== undefined) onValueChange(view)
                                }}
                            >
                                {views.map((view) => (
                                    <DropdownMenuRadioItem key={view.id} value={view.id} label={view.name} closeOnClick>
                                        <span className="min-w-0 truncate">{view.name}</span>
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuGroup>
                    )}
                    {(canSave || onSaveNew !== undefined || canRename || canDelete) && views.length > 0 && <DropdownMenuSeparator />}
                    {canSave && (
                        <DropdownMenuItem disabled={!changed} onClick={save}>
                            <Save aria-hidden />
                            {words.save}
                        </DropdownMenuItem>
                    )}
                    {onSaveNew !== undefined && (
                        <DropdownMenuItem onClick={() => ask('new')}>
                            <Plus aria-hidden />
                            {words.saveNew}
                        </DropdownMenuItem>
                    )}
                    {canRename && (
                        <DropdownMenuItem onClick={() => ask('rename')}>
                            <Pencil aria-hidden />
                            {words.rename}
                        </DropdownMenuItem>
                    )}
                    {canDelete && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                                asking.current = true
                                setDeleting(true)
                            }}
                        >
                            <Trash2 aria-hidden />
                            {words.delete}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            {changed && (
                <>
                    <Button variant="ghost" className="text-muted-foreground" onClick={() => onValueChange(chosen)}>
                        {words.reset}
                    </Button>
                    {(canSave || (chosen.locked === true && onSaveNew !== undefined)) && (
                        <Button variant="secondary" onClick={() => (canSave ? save() : ask('new'))}>
                            {canSave ? words.save : words.saveNew}
                        </Button>
                    )}
                </>
            )}
            <Popover open={naming !== null} onOpenChange={(open) => !open && setNaming(null)}>
                <PopoverContent anchor={trigger} align="start" className="w-72 max-w-(--available-width)">
                    <form onSubmit={submit} className="flex flex-col gap-3">
                        <TextField
                            id={nameId}
                            label={words.name}
                            value={name}
                            onChange={setName}
                            autoFocus
                            autoComplete="off"
                            error={trimmed !== '' && taken ? words.nameTaken : null}
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setNaming(null)}>
                                {words.cancel}
                            </Button>
                            <Button type="submit" disabled={trimmed === '' || taken}>
                                {naming === 'rename' ? words.renameDone : words.create}
                            </Button>
                        </div>
                    </form>
                </PopoverContent>
            </Popover>
            {chosen !== undefined && (
                <ConfirmDialog
                    open={deleting}
                    onOpenChange={setDeleting}
                    question={words.deleteQuestion(chosen.name)}
                    detail={words.deleteDetail}
                    confirm={{
                        label: words.delete,
                        destructive: true,
                        onConfirm: () => {
                            setDeleting(false)
                            onDelete?.(chosen)
                        },
                    }}
                    words={{ cancel: words.cancel }}
                />
            )}
        </div>
    )
}
