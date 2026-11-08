import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { PaneHeader } from './PaneHeader'
import { Segmented } from './Segmented'

export type EditPreviewPane = 'edit' | 'preview'

export interface EditPreviewWords {
    /** The editing pane's title, and its option in the switch. */
    edit: string
    /** The preview pane's title, and its option in the switch. */
    preview: string
    /** What the switch is called, for a screen reader. */
    switch: string
}

const WORDS: EditPreviewWords = { edit: 'Edit', preview: 'Preview', switch: 'Show' }

/**
 * A source and what it makes, as an editor beside its live preview: markdown and the page, a
 * template and the message. Where its own box is wide (48rem and more) the two panes stand side by
 * side, each titled; narrower, a switch above shows one pane at a time, Edit or Preview. Either way
 * the panes take the height the box has left, never under 20rem, and scroll within it, so give it a height (a flex
 * child with `flex-1`, or a class) and the editor and preview fill it.
 *
 * The pane shown while narrow is held by the component unless the app passes `pane` and hears
 * `onPaneChange`. Both panes stay mounted while hidden, so the editor keeps its place and undo.
 */
export function EditPreview({
    edit,
    preview,
    editActions,
    previewActions,
    pane: paneValue,
    defaultPane = 'edit',
    onPaneChange,
    flushPreview = false,
    className,
    words: given,
}: {
    /** The editor, which fills its pane edge to edge. */
    edit: ReactNode
    /** What the source makes, padded in its pane. */
    preview: ReactNode
    /** Controls at the editing pane's head, such as a format menu. */
    editActions?: ReactNode
    previewActions?: ReactNode
    pane?: EditPreviewPane
    defaultPane?: EditPreviewPane
    onPaneChange?: (pane: EditPreviewPane) => void
    /** The preview fills its pane edge to edge too, as a frame or a canvas does. */
    flushPreview?: boolean
    className?: string
    words?: Partial<EditPreviewWords>
}) {
    const words = { ...WORDS, ...given }
    const [own, setOwn] = useState<EditPreviewPane>(defaultPane)
    const pane = paneValue ?? own
    const choose = (next: EditPreviewPane) => {
        if (paneValue === undefined) setOwn(next)
        onPaneChange?.(next)
    }
    const box = (shown: boolean, title: string, actions: ReactNode, flush: boolean, body: ReactNode) => (
        <section
            data-pane={shown ? 'shown' : 'hidden'}
            className={cn(
                'flex min-h-80 min-w-0 flex-1 flex-col overflow-hidden rounded-surface border border-border-strong bg-card',
                !shown && '@max-3xl:hidden',
            )}
        >
            <PaneHeader variant="panel" title={title} actions={actions} className="@max-3xl:hidden" />
            <div className={cn('min-h-0 flex-1 overflow-auto', !flush && 'p-(--density-panel-pad)')}>{body}</div>
        </section>
    )
    return (
        <div data-slot="edit-preview" className={cn('@container flex min-h-0 min-w-0 flex-col', className)}>
            <div className="flex min-h-0 flex-1 flex-col gap-3 @3xl:flex-row @3xl:gap-(--density-section-gap)">
                <div className="flex items-center justify-between gap-2 @3xl:hidden">
                    <Segmented
                        label={words.switch}
                        value={pane}
                        options={[
                            { value: 'edit', label: words.edit },
                            { value: 'preview', label: words.preview },
                        ]}
                        onValueChange={choose}
                    />
                    <div className="flex items-center gap-1">{pane === 'edit' ? editActions : previewActions}</div>
                </div>
                {box(pane === 'edit', words.edit, editActions, true, edit)}
                {box(pane === 'preview', words.preview, previewActions, flushPreview, preview)}
            </div>
        </div>
    )
}
