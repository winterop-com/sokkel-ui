import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { QuickAdd } from '@winterop-com/sokkel-ui/QuickAdd'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { CalendarDays, FileText, FolderInput, FolderPlus, Pencil, Trash2 } from 'lucide-react'

import type { Note } from '../model'
import { useVault, type VaultState } from '../state'
import { folderAndBelow, notesInOrder, type Vault } from '../vault'

/** What a note dragged from a listing is to the vault's tree, which takes it into a folder. */
export const NOTE_KIND = 'note'

/** What a listing shows of a note: its name, where it is, its tags, the links into it and when it changed. */
export function noteColumns(vault: Vault): DataColumn<Note>[] {
    return [
        {
            id: 'title',
            header: 'Name',
            width: 'minmax(14rem,2fr)',
            cell: (note) => (
                <Row gap="xs" className="min-w-0">
                    {note.day === undefined ? (
                        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : (
                        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className="truncate font-medium">{note.title}</span>
                </Row>
            ),
            sortValue: (note) => note.title.toLowerCase(),
        },
        {
            id: 'folder',
            header: 'Folder',
            width: 'minmax(8rem,1fr)',
            stack: 'secondary',
            cell: (note) => <span className="truncate text-muted-foreground">{vault.path(note.folder) || 'Vault'}</span>,
            sortValue: (note) => vault.path(note.folder),
        },
        {
            id: 'tags',
            header: 'Tags',
            width: 'minmax(8rem,1fr)',
            stack: 'none',
            cell: (note) => <TagChips tags={(vault.tagsOf.get(note.id) ?? []).map((tag) => `#${tag}`)} />,
        },
        {
            id: 'links',
            header: 'Links in',
            width: '6rem',
            align: 'end',
            stack: 'none',
            cell: (note) => vault.backlinks.get(note.id)?.length ?? 0,
            sortValue: (note) => vault.backlinks.get(note.id)?.length ?? 0,
        },
        {
            id: 'updated',
            header: 'Changed',
            width: '8.5rem',
            stack: 'secondary',
            cell: (note) => <RelativeTime date={note.updated} length="short" className="text-muted-foreground" />,
            sortValue: (note) => note.updated,
        },
    ]
}

/** What a note's row offers in its menu. */
export function noteActions(state: Pick<VaultState, 'open' | 'ask'>): (note: Note) => DataAction[] {
    return (note) => [
        { id: 'open', label: 'Open', icon: <FileText />, onSelect: () => state.open(note.id) },
        { id: 'rename', label: 'Rename', icon: <Pencil />, onSelect: () => state.ask({ kind: 'rename-note', id: note.id }) },
        { id: 'move', label: 'Move to', icon: <FolderInput />, onSelect: () => state.ask({ kind: 'move-note', id: note.id }) },
        { id: 'line', separator: true },
        {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => state.ask({ kind: 'delete-note', id: note.id }),
        },
    ]
}

/**
 * Every note in the vault, or in one folder and the folders under it, with a field that makes a
 * note. By name they are listed newest change first; in the reader's own order they are listed as
 * the tree holds them, each row dragged by its grip to another place, among the notes of the folder
 * it lands in, or onto a folder of the rail's tree.
 */
export function AllNotes({ folder }: { folder?: string }) {
    const state = useVault()
    const { vault, loading, error, open, ask, createNote, order, place, prefs } = state
    const manual = order === 'manual'
    const within = folder === undefined ? null : folderAndBelow(vault, folder)
    const inside = manual
        ? notesInOrder(vault, folder ?? null, order, prefs.dailyFolder)
        : within === null
          ? vault.notes
          : vault.notes.filter((note) => note.folder !== null && within.has(note.folder))

    /** Moves the row at `from` to `to`: into the folder of the row it lands after (or before, at the top), at that place among its notes. */
    const reorder = (from: number, to: number) => {
        const moved = inside[from]
        if (moved === undefined) return
        const next = moveItem(inside, from, to)
        const into = (next[to - 1] ?? next[to + 1] ?? moved).folder
        const index = next.filter((note) => note.folder === into || note.id === moved.id).findIndex((note) => note.id === moved.id)
        void place('note', moved.id, into, index)
    }
    const name = folder === undefined ? 'All notes' : (vault.folderById.get(folder)?.name ?? 'Folder')

    return (
        <>
            <PageHeader
                title={name}
                count={`${String(inside.length)} ${inside.length === 1 ? 'note' : 'notes'}`}
                description={folder === undefined ? undefined : vault.path(folder)}
                actions={
                    folder === undefined ? (
                        <Button size="sm" variant="outline" onClick={() => ask({ kind: 'new-folder', parent: null })}>
                            <FolderPlus />
                            New folder
                        </Button>
                    ) : (
                        <>
                            <IconButton label="Rename folder" onClick={() => ask({ kind: 'rename-folder', id: folder })}>
                                <Pencil />
                            </IconButton>
                            <IconButton label="Move folder" onClick={() => ask({ kind: 'move-folder', id: folder })}>
                                <FolderInput />
                            </IconButton>
                            <IconButton label="Delete folder" onClick={() => ask({ kind: 'delete-folder', id: folder })}>
                                <Trash2 />
                            </IconButton>
                            <Button size="sm" variant="outline" onClick={() => ask({ kind: 'new-folder', parent: folder })}>
                                <FolderPlus />
                                New folder
                            </Button>
                        </>
                    )
                }
            />
            <QuickAdd
                placeholder={folder === undefined ? 'New note' : `New note in ${name}`}
                onAdd={(title) => createNote({ title, folder: folder ?? null }).then((note) => open(note.id))}
                validate={(title) => (vault.resolve(title) === undefined ? null : `${title.trim()} is already in the vault.`)}
            />
            <PageState loading={loading} error={error}>
                <DataTable
                    key={order}
                    variant="list"
                    minWidth="auto"
                    stackLayout="compact"
                    columns={noteColumns(vault)}
                    rows={inside}
                    rowKey={(note) => note.id}
                    defaultSort={manual ? null : { column: 'updated', direction: 'desc' }}
                    onReorder={manual ? reorder : undefined}
                    rowLabel={(note) => note.title}
                    dragKind={NOTE_KIND}
                    onOpen={(note) => open(note.id)}
                    rowActions={noteActions(state)}
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyTitle>No notes here</EmptyTitle>
                                <EmptyDescription>Name one in the field above and it opens.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                />
            </PageState>
        </>
    )
}
