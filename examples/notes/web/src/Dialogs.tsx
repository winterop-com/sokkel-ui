/** The questions the app asks in a dialog: a name for a folder, a new name, where to move, whether to delete or make a note. */

import { ConsequenceList } from '@winterop-com/sokkel-ui/ConsequenceList'
import { ConfirmDialog, DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TreeSelect } from '@winterop-com/sokkel-ui/TreeSelect'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { FileText, Folder as FolderIcon } from 'lucide-react'
import { useState } from 'react'

import { badTitle } from './model'
import { useVault, type Asking } from './state'
import { folderAndBelow, folderTree, ROOT } from './vault'

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** A name typed in a dialog and saved through the app's call, which may refuse it. */
function NameDialog({
    title,
    label,
    verb,
    start,
    check,
    onSave,
    onClose,
}: {
    title: string
    label: string
    verb: string
    start: string
    check?: (name: string) => string | null
    onSave: (name: string) => Promise<unknown>
    onClose: () => void
}) {
    const [name, setName] = useState(start)
    const [busy, setBusy] = useState(false)
    const [refused, setRefused] = useState<string | null>(null)
    const issue = refused ?? check?.(name) ?? null
    const submit = () => {
        if (issue !== null || busy) return
        setBusy(true)
        onSave(name).then(onClose, (error: unknown) => {
            setRefused(reason(error))
            setBusy(false)
        })
    }
    return (
        <DialogShell
            open
            onOpenChange={(open) => !open && !busy && onClose()}
            width="sm"
            phone="fit"
            title={title}
            confirm={{ label: verb, onConfirm: submit, busy, busyLabel: 'Saving', why: issue ?? undefined }}
        >
            <TextField
                id="name"
                label={label}
                value={name}
                autoFocus
                error={name.trim() === '' ? null : issue}
                onChange={(next) => {
                    setName(next)
                    setRefused(null)
                }}
                onEnter={submit}
            />
        </DialogShell>
    )
}

/** Where a note or a folder goes: a folder picked from the vault's, or its top. */
function MoveDialog({ asking, onClose }: { asking: Extract<Asking, { kind: 'move-note' | 'move-folder' }>; onClose: () => void }) {
    const { vault, moveNote, moveFolder, order } = useVault()
    const note = asking.kind === 'move-note' ? vault.byId.get(asking.id) : undefined
    const folder = asking.kind === 'move-folder' ? vault.folderById.get(asking.id) : undefined
    const now = note?.folder ?? folder?.parent ?? null
    const [into, setInto] = useState(now ?? ROOT)
    const [busy, setBusy] = useState(false)
    const blocked = folder === undefined ? new Set<string>() : folderAndBelow(vault, folder.id)
    const target = into === ROOT ? null : into
    const why =
        target === now ? 'It is there already.' : target !== null && blocked.has(target) ? 'A folder cannot go inside itself.' : undefined
    const name = note?.title ?? folder?.name ?? ''
    return (
        <DialogShell
            open
            onOpenChange={(open) => !open && !busy && onClose()}
            width="sm"
            phone="fit"
            title={`Move ${name}`}
            confirm={{
                label: 'Move',
                busy,
                busyLabel: 'Moving',
                why,
                onConfirm: () => {
                    setBusy(true)
                    const moved = note !== undefined ? moveNote(note.id, target) : moveFolder(asking.id, target)
                    moved.then(onClose, (error: unknown) => {
                        toast.add({ type: 'error', title: 'Not moved', description: reason(error) })
                        setBusy(false)
                    })
                },
            }}
        >
            <Field id="move-into" label="Into">
                <TreeSelect
                    id="move-into"
                    nodes={folderTree(vault, 'Vault', order)}
                    value={[into]}
                    onValueChange={(ids) => setInto(ids[0] ?? ROOT)}
                    defaultExpanded={[ROOT]}
                    className="w-full"
                />
            </Field>
        </DialogShell>
    )
}

/** The dialog the app is asking in, if any. */
export function Dialogs() {
    const { asking, ask, vault, renameNote, renameFolder, createFolder, deleteNote, deleteFolder, createNote, open } = useVault()
    const [busy, setBusy] = useState(false)
    const close = () => ask(null)
    if (asking === null) return null
    const key = JSON.stringify(asking)

    if (asking.kind === 'new-folder')
        return (
            <NameDialog
                key={key}
                title={asking.parent === null ? 'New folder' : `New folder in ${vault.path(asking.parent)}`}
                label="Name"
                verb="Make"
                start="New folder"
                onSave={(name) => createFolder(name, asking.parent)}
                onClose={close}
            />
        )

    if (asking.kind === 'rename-note') {
        const note = vault.byId.get(asking.id)
        if (note === undefined) return null
        const others = vault.notes.filter((one) => one.id !== note.id).map((one) => one.title)
        return (
            <NameDialog
                key={key}
                title="Rename note"
                label="Name"
                verb="Rename"
                start={note.title}
                check={(name) => (name.trim() === note.title ? null : badTitle(name, others))}
                onSave={(name) =>
                    renameNote(note.id, name).then((count) => {
                        if (count > 0)
                            toast.add({
                                type: 'success',
                                title: 'Renamed',
                                description: `${String(count)} notes linking to it now say ${name.trim()}.`,
                            })
                    })
                }
                onClose={close}
            />
        )
    }

    if (asking.kind === 'rename-folder') {
        const folder = vault.folderById.get(asking.id)
        if (folder === undefined) return null
        return (
            <NameDialog
                key={key}
                title="Rename folder"
                label="Name"
                verb="Rename"
                start={folder.name}
                check={(name) => (name.trim() === '' ? 'A folder needs a name.' : null)}
                onSave={(name) => renameFolder(folder.id, name)}
                onClose={close}
            />
        )
    }

    if (asking.kind === 'move-note' || asking.kind === 'move-folder') return <MoveDialog key={key} asking={asking} onClose={close} />

    if (asking.kind === 'delete-note') {
        const note = vault.byId.get(asking.id)
        if (note === undefined) return null
        const linking = vault.backlinks.get(note.id)?.length ?? 0
        return (
            <ConfirmDialog
                open
                onOpenChange={(next) => !next && !busy && close()}
                question={`Delete ${note.title}?`}
                detail={
                    linking === 0
                        ? 'No note links to it.'
                        : `${String(linking)} ${linking === 1 ? 'note links' : 'notes link'} to it; those links will lead nowhere.`
                }
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    busy,
                    busyLabel: 'Deleting',
                    onConfirm: () => {
                        setBusy(true)
                        void deleteNote(note.id).finally(() => {
                            setBusy(false)
                            close()
                        })
                    },
                }}
            />
        )
    }

    if (asking.kind === 'delete-folder') {
        const folder = vault.folderById.get(asking.id)
        if (folder === undefined) return null
        const gone = folderAndBelow(vault, folder.id)
        const notes = vault.notes.filter((note) => note.folder !== null && gone.has(note.folder)).length
        return (
            <ConfirmDialog
                open
                onOpenChange={(next) => !next && !busy && close()}
                question={`Delete ${folder.name}?`}
                detail="What it holds goes with it."
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    busy,
                    busyLabel: 'Deleting',
                    onConfirm: () => {
                        setBusy(true)
                        void deleteFolder(folder.id).finally(() => {
                            setBusy(false)
                            close()
                        })
                    },
                }}
            >
                <ConsequenceList
                    items={[
                        { icon: <FileText />, label: notes === 1 ? 'Note' : 'Notes', count: notes },
                        ...(gone.size > 1
                            ? [{ icon: <FolderIcon />, label: gone.size === 2 ? 'Folder' : 'Folders', count: gone.size - 1 }]
                            : []),
                    ]}
                />
            </ConfirmDialog>
        )
    }

    // A link to a note that is not there yet.
    return (
        <ConfirmDialog
            open
            onOpenChange={(next) => !next && !busy && close()}
            question={`Make ${asking.title}?`}
            detail={`No note is named ${asking.title} yet. Make it${asking.folder === null ? '' : ` in ${vault.path(asking.folder)}`} and open it.`}
            confirm={{
                label: 'Make note',
                busy,
                busyLabel: 'Making',
                onConfirm: () => {
                    setBusy(true)
                    void createNote({ title: asking.title, folder: asking.folder })
                        .then((note) => open(note.id))
                        .finally(() => {
                            setBusy(false)
                            close()
                        })
                },
            }}
        />
    )
}
