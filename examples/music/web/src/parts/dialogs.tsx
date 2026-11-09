import { ConfirmDialog, DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { createStore, useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { changePlaylist, createPlaylist, deletePlaylist, playlists } from '../data'

/** The dialog standing over the page, asked for from any row's menu or the palette. */
type Asked =
    | { kind: 'new'; songs: readonly string[]; what?: string }
    | { kind: 'rename'; id: string }
    | { kind: 'delete'; id: string }
    | null

const asked = createStore<Asked>(null)

/** Opens the dialog that makes a playlist, holding `songs` when given. */
export const askNewPlaylist = (songs: readonly string[] = [], what?: string) => asked.set({ kind: 'new', songs, what })
export const askRename = (id: string) => asked.set({ kind: 'rename', id })
export const askDelete = (id: string) => asked.set({ kind: 'delete', id })

const songsWord = (count: number) => `${String(count)} ${count === 1 ? 'song' : 'songs'}`

/** A name for a playlist, typed into a dialog: a new one, or a new name for one. */
function NameDialog({
    title,
    description,
    start,
    verb,
    onName,
    onClose,
}: {
    title: string
    description?: string
    start: string
    verb: string
    onName: (name: string) => void
    onClose: () => void
}) {
    const [name, setName] = useState(start)
    const trimmed = name.trim()
    const why = trimmed === '' ? 'Give it a name' : trimmed === start ? 'The name is the same' : undefined
    const submit = () => {
        if (why !== undefined) return
        onName(trimmed)
        onClose()
    }
    return (
        <DialogShell
            open
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
            width="sm"
            phone="fit"
            title={title}
            description={description}
            confirm={{ label: verb, onConfirm: submit, why }}
        >
            <TextField id="playlist-name" label="Name" value={name} onChange={setName} onEnter={submit} autoFocus />
        </DialogShell>
    )
}

/** The playlist dialogs, drawn once at the app's root. */
export function Dialogs() {
    const now = useStore(asked)
    const rows = useStore(playlists.store) ?? []
    const close = () => asked.set(null)
    if (now === null) return null
    if (now.kind === 'new') {
        return (
            <NameDialog
                title="New playlist"
                description={now.songs.length > 0 ? `With ${now.what ?? songsWord(now.songs.length)}.` : undefined}
                start=""
                verb="Create"
                onName={(name) => {
                    const id = createPlaylist(name, now.songs)
                    toast.add({
                        type: 'success',
                        title: `Made ${name}`,
                        description: now.songs.length > 0 ? `With ${songsWord(now.songs.length)}.` : undefined,
                    })
                    go(`/playlists/${id}`)
                }}
                onClose={close}
            />
        )
    }
    const playlist = rows.find((row) => row.id === now.id)
    if (playlist === undefined) return null
    if (now.kind === 'rename') {
        return (
            <NameDialog
                title="Rename playlist"
                start={playlist.name}
                verb="Rename"
                onName={(name) => changePlaylist(playlist.id, { name })}
                onClose={close}
            />
        )
    }
    return (
        <ConfirmDialog
            open
            onOpenChange={(open) => {
                if (!open) close()
            }}
            question={`Delete ${playlist.name}?`}
            detail="The playlist goes; its songs stay in the library."
            confirm={{
                label: 'Delete',
                destructive: true,
                onConfirm: () => {
                    deletePlaylist(playlist.id)
                    close()
                    toast.add({ title: `Deleted ${playlist.name}` })
                    go('/playlists')
                },
            }}
        />
    )
}
