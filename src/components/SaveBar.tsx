import { cn } from '../lib/cn'
import { Button } from './ui/button'

export interface SaveBarWords {
    unsaved: (count: number) => string
    discard: string
    save: string
    saving: string
}

const WORDS: SaveBarWords = {
    unsaved: (count) => (count === 1 ? '1 unsaved change' : `${String(count)} unsaved changes`),
    discard: 'Discard',
    save: 'Save',
    saving: 'Saving',
}

/**
 * The bar pinned to the foot of a page while its edits are not yet saved: how many there are at
 * the left, Discard and Save at the right. It is the last child of the page's scrolling content
 * and stays at its bottom edge; with no changes it draws nothing, so the page keeps its full
 * height.
 */
export function SaveBar({
    count,
    onSave,
    onDiscard,
    busy = false,
    inset = 'page',
    className,
    words: given,
}: {
    /** How many edits are unsaved. */
    count: number
    onSave: () => void
    onDiscard: () => void
    busy?: boolean
    /** The bar's side padding: a page's inset, or a panel's, for a sheet or a side panel. */
    inset?: 'page' | 'panel'
    className?: string
    words?: Partial<SaveBarWords>
}) {
    const words = { ...WORDS, ...given }
    if (count === 0) return null
    return (
        <div className={cn('sticky bottom-0 z-20 border-t border-border-strong bg-sidebar', className)}>
            <div
                className={cn(
                    'flex items-center gap-2 py-2.5',
                    inset === 'page' ? 'px-(--density-page-inset)' : 'px-(--density-panel-pad)',
                )}
            >
                <span role="status" className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden />
                    <span className="truncate">{words.unsaved(count)}</span>
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="ghost" disabled={busy} onClick={onDiscard}>
                        {words.discard}
                    </Button>
                    <Button size="sm" disabled={busy} onClick={onSave}>
                        {busy ? words.saving : words.save}
                    </Button>
                </div>
            </div>
        </div>
    )
}
