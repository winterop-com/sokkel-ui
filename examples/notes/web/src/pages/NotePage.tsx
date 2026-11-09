import { CodeEditor, type CodeCompletion } from '@winterop-com/sokkel-ui/CodeEditor'
import { DocumentTabs, type DocumentTab } from '@winterop-com/sokkel-ui/DocumentTabs'
import { EditPreview } from '@winterop-com/sokkel-ui/EditPreview'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { headingId, Markdown, type MarkdownLinks } from '@winterop-com/sokkel-ui/Markdown'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { CalendarDays, Ellipsis, FilePlus, FileText, FolderInput, History, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

import { go } from 'tidevann-shared/router'
import { badTitle, type Note, type View } from '../model'
import { useVault } from '../state'

const VIEWS = [
    { value: 'edit', label: 'Edit' },
    { value: 'both', label: 'Both' },
    { value: 'preview', label: 'Read' },
] as const

const NEXT_VIEW: Record<View, View> = { edit: 'both', both: 'preview', preview: 'edit' }

/** One note: the open notes as tabs over it, its name to rename in place, and its markdown beside the page it makes. */
export function NotePage({ note }: { note: Note }) {
    const { vault, prefs, drafts, edit, flush, show, closeTab, open, setView, renameNote, follow, ask, newNote, heading, clearHeading } =
        useVault()
    const preview = useRef<HTMLDivElement>(null)
    const view = prefs.views[note.id] ?? prefs.defaultView

    useEffect(() => show(note.id), [note.id, show])

    // A note opened at a heading scrolls its preview there once drawn.
    useEffect(() => {
        if (heading === null) return
        const target = preview.current?.querySelector<HTMLElement>(`#${CSS.escape(headingId(heading))}`)
        if (target !== null && target !== undefined) target.scrollIntoView({ block: 'start' })
        clearHeading()
    }, [heading, note.id, clearHeading])

    useShortcuts(
        [
            {
                id: 'view',
                key: 'e',
                mod: true,
                inFields: true,
                label: 'Show the editor, both or the page',
                group: 'This note',
                run: () => setView(note.id, NEXT_VIEW[view]),
            },
            { id: 'save', key: 's', mod: true, inFields: true, label: 'Save now', group: 'This note', run: () => flush(note.id) },
        ],
        [note.id, view],
    )

    const tabs = prefs.tabs.flatMap((id): DocumentTab[] => {
        const one = vault.byId.get(id)
        if (one === undefined) return []
        const where = vault.path(one.folder)
        return [
            {
                id,
                label: one.title,
                icon: one.day === undefined ? FileText : CalendarDays,
                dirty: drafts[id] !== undefined,
                title: where === '' ? one.title : `${where} / ${one.title}`,
            },
        ]
    })
    const recent = prefs.recent.filter((id) => id !== note.id && vault.byId.has(id))

    const completions = useMemo<CodeCompletion[]>(
        () =>
            vault.notes
                .filter((one) => one.id !== note.id)
                .map((one) => ({ label: one.title, detail: vault.path(one.folder) || 'Vault', kind: 'text' as const })),
        [vault, note.id],
    )
    const links = useMemo<MarkdownLinks>(
        () => ({
            onOpen: (target, at) => follow(target, note, at),
            exists: (target) => vault.resolve(target) !== undefined,
            onTag: (tag) => go(`/tags/${encodeURIComponent(tag)}`),
        }),
        [vault, note, follow],
    )
    const others = vault.notes.filter((one) => one.id !== note.id).map((one) => one.title)

    return (
        <Stack gap="none" className="h-full min-h-0">
            <DocumentTabs
                tabs={tabs}
                active={note.id}
                onActiveChange={(id) => open(id)}
                onClose={closeTab}
                words={{ label: 'Open notes' }}
                end={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon-xs" aria-label="Recent notes" title="Recent notes" />}
                            >
                                <History />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Recent</DropdownMenuLabel>
                                    {recent.length === 0 ? (
                                        <DropdownMenuItem disabled>No other note opened yet</DropdownMenuItem>
                                    ) : (
                                        recent.map((id) => {
                                            const one = vault.byId.get(id)
                                            return one === undefined ? null : (
                                                <DropdownMenuItem key={id} onClick={() => open(id)}>
                                                    {one.day === undefined ? <FileText /> : <CalendarDays />}
                                                    <span className="truncate">{one.title}</span>
                                                </DropdownMenuItem>
                                            )
                                        })
                                    )}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <IconButton label="New note" size="icon-xs" onClick={() => newNote(note.folder)}>
                            <FilePlus />
                        </IconButton>
                    </>
                }
            />
            <PaneHeader
                title={
                    <InlineEdit
                        label="Name"
                        value={note.title}
                        validate={(title) => (title.trim() === note.title ? null : badTitle(title, others))}
                        onSave={(title) => renameNote(note.id, title).then(() => undefined)}
                    />
                }
                actions={
                    <>
                        <Segmented size="sm" label="Show" value={view} options={VIEWS} onValueChange={(next) => setView(note.id, next)} />
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More" title="More" />}>
                                <Ellipsis />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => ask({ kind: 'rename-note', id: note.id })}>
                                    <Pencil />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => ask({ kind: 'move-note', id: note.id })}>
                                    <FolderInput />
                                    Move to
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => closeTab(note.id)}>
                                    <FileText />
                                    Close tab
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => ask({ kind: 'delete-note', id: note.id })}>
                                    <Trash2 />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
            <EditPreview
                key={note.id}
                variant="pane"
                id="notes-split"
                view={view}
                className="flex-1"
                edit={
                    <CodeEditor
                        label={`${note.title} as markdown`}
                        language="markdown"
                        variant="pane"
                        value={drafts[note.id] ?? note.body}
                        onChange={(text) => edit(note.id, text)}
                        links={completions}
                        wrap={prefs.wrap}
                        lineNumbers={prefs.lineNumbers}
                        size={prefs.fontSize}
                        search
                        placeholder="Write in markdown; [[ links to a note, # tags it"
                    />
                }
                preview={
                    <div ref={preview}>
                        <Markdown content={drafts[note.id] ?? note.body} scale="document" anchors links={links} />
                    </div>
                }
            />
        </Stack>
    )
}
