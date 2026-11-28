'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { PaneHeader } from './PaneHeader'
import { Segmented } from './Segmented'
import { SplitPane, useSplitPane } from './SplitPane'
import { Toolbar } from './Toolbar'
import { useWords, type WordsPart } from '../lib/words'

export type EditPreviewPane = 'edit' | 'preview'

/** Which panes stand: the editor beside its preview, or one of them alone. */
export type EditPreviewView = 'both' | EditPreviewPane

export interface EditPreviewWords {
    /** The editing pane's title, and its option in the switch. */
    edit: string
    /** The preview pane's title, and its option in the switch. */
    preview: string
    /** What the switch is called, for a screen reader. */
    switch: string
    /** The edge between the panes, which drags to resize them. */
    resize: string
}

export const EDIT_PREVIEW_WORDS: EditPreviewWords = {
    edit: 'Edit',
    preview: 'Preview',
    switch: 'Show',
    resize: 'Resize the editor and its preview',
}

/** Where a catalog holds an editor and preview's words. */
export const EDIT_PREVIEW_PART: WordsPart<EditPreviewWords> = { id: 'editPreview', words: EDIT_PREVIEW_WORDS }

export interface EditPreviewProps {
    /** The editor, which fills its pane edge to edge. */
    edit: ReactNode
    /** What the source makes, padded in its pane. */
    preview: ReactNode
    /** Controls at the editing pane's head, such as a format menu; in the `pane` variant they stand beside the switch while it shows the editor. */
    editActions?: ReactNode
    previewActions?: ReactNode
    pane?: EditPreviewPane
    defaultPane?: EditPreviewPane
    onPaneChange?: (pane: EditPreviewPane) => void
    /** Which panes stand where the box is wide: both (the default), or the editor or the preview alone, as a reader chooses. */
    view?: EditPreviewView
    /** `cards` frames each pane under its title; `pane` sets the two edge to edge with a rule that drags between them, filling a pane of the app's, such as a note's body or a panel's options beside the panel. */
    variant?: 'cards' | 'pane'
    /** Remembers the share the panes are dragged to under this name in the browser's storage, in the `pane` variant. */
    id?: string
    /** The preview fills its pane edge to edge too, as a frame or a canvas does. */
    flushPreview?: boolean
    className?: string
    words?: Partial<EditPreviewWords>
}

/**
 * A source and what it makes, as an editor beside its live preview: markdown and the page, a
 * template and the message. Where its own box is wide (48rem and more) the two panes stand side by
 * side, each titled; narrower, a switch above shows one pane at a time, Edit or Preview. Either way
 * the panes take the height the box has left, never under 20rem, and scroll within it, so give it a height (a flex
 * child with `flex-1`, or a class) and the editor and preview fill it.
 *
 * The pane shown while narrow is held by the component unless the app passes `pane` and hears
 * `onPaneChange`. Both panes stay mounted while hidden, so the editor keeps its place and undo.
 *
 * `view` shows the editor or the preview alone at every width, for a reader who turns the other
 * off. `variant="pane"` fills a pane of the app's, such as a note's body under its header or a
 * panel's options beside the panel: the two stand edge to edge with no titles and the rule between
 * them drags (`SplitPane`, the share kept under `id`). Narrower than 40rem it shows one at a time
 * too, the switch in a strip across the top of the pane shown, with that pane's actions at its end.
 */
export function EditPreview({
    edit,
    preview,
    editActions,
    previewActions,
    pane: paneValue,
    defaultPane = 'edit',
    onPaneChange,
    view = 'both',
    variant = 'cards',
    id,
    flushPreview = false,
    className,
    words: given,
}: EditPreviewProps) {
    const words = useWords(EDIT_PREVIEW_PART, given)
    const [own, setOwn] = useState<EditPreviewPane>(defaultPane)
    const pane = view === 'both' ? (paneValue ?? own) : view
    const choose = (next: EditPreviewPane) => {
        if (paneValue === undefined) setOwn(next)
        onPaneChange?.(next)
    }
    if (variant === 'pane') {
        const strip = (name: EditPreviewPane, body: ReactNode) => (
            <PaneWithSwitch
                switchable={view === 'both'}
                bar={
                    <Toolbar variant="pane" end={name === 'edit' ? editActions : previewActions}>
                        <Segmented
                            label={words.switch}
                            value={pane}
                            options={[
                                { value: 'edit', label: words.edit },
                                { value: 'preview', label: words.preview },
                            ]}
                            onValueChange={choose}
                        />
                    </Toolbar>
                }
            >
                {body}
            </PaneWithSwitch>
        )
        return (
            <SplitPane
                id={id}
                className={cn('min-h-80', className)}
                first={strip('edit', edit)}
                second={strip('preview', <div className={cn(!flushPreview && 'p-(--density-panel-pad)')}>{preview}</div>)}
                narrow={pane === 'edit' ? 'first' : 'second'}
                only={view === 'edit' ? 'first' : view === 'preview' ? 'second' : undefined}
                words={{ resize: words.resize }}
            />
        )
    }
    const box = (name: EditPreviewPane, title: string, actions: ReactNode, flush: boolean, body: ReactNode) => (
        <section
            data-pane={pane === name ? 'shown' : 'hidden'}
            className={cn(
                'flex min-h-80 min-w-0 flex-1 flex-col overflow-hidden rounded-surface border border-border-strong bg-card',
                pane !== name && (view === 'both' ? '@max-3xl:hidden' : 'hidden'),
            )}
        >
            <PaneHeader variant="panel" title={title} actions={actions} className={cn(view === 'both' && '@max-3xl:hidden')} />
            <div className={cn('min-h-0 flex-1 overflow-auto', !flush && 'p-(--density-panel-pad)')}>{body}</div>
        </section>
    )
    return (
        <div data-slot="edit-preview" className={cn('@container flex min-h-0 min-w-0 flex-col', className)}>
            <div className="flex min-h-0 flex-1 flex-col gap-3 @3xl:flex-row @3xl:gap-(--density-section-gap)">
                {view === 'both' && (
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
                )}
                {box('edit', words.edit, editActions, true, edit)}
                {box('preview', words.preview, previewActions, flushPreview, preview)}
            </div>
        </div>
    )
}

/**
 * A pane of the `pane` variant: its content, under the switch while the split is narrow and shows it
 * alone. The content stays in the same place in the tree either way, so an editor keeps its undo as
 * the split narrows and widens.
 */
function PaneWithSwitch({ switchable, bar, children }: { switchable: boolean; bar: ReactNode; children: ReactNode }) {
    const split = useSplitPane()
    return (
        <div className="flex min-h-0 flex-col">
            {switchable && split?.narrow === true && bar}
            <div className="flex min-h-0 flex-1 flex-col overflow-auto [&>:only-child]:min-h-0 [&>:only-child]:flex-1">{children}</div>
        </div>
    )
}
