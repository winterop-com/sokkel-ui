/** What every part of the app reads and does: the vault, the reader's settings, the drafts being saved and the open tabs. */

import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'
import { folders as folderRows, notes as noteRows, prefs as prefRows } from './backend'
import { DEFAULT_PREFS, RECENT, badTitle, freeName, fromTemplate, type Folder, type Note, type Order, type Prefs, type View } from './model'
import { folderAndBelow, foldersIn, indexVault, notesIn, renameLinks, type Vault } from './vault'

/** A question the app is asking in a dialog, about a note or a folder. */
export type Asking =
    | { kind: 'new-folder'; parent: string | null }
    | { kind: 'rename-note'; id: string }
    | { kind: 'rename-folder'; id: string }
    | { kind: 'move-note'; id: string }
    | { kind: 'move-folder'; id: string }
    | { kind: 'delete-note'; id: string }
    | { kind: 'delete-folder'; id: string }
    | { kind: 'create'; title: string; folder: string | null }

/** Where the latest edit stands: saving, or saved at a time. */
export type SaveState = { state: 'idle' } | { state: 'saving' } | { state: 'saved'; at: number } | { state: 'failed'; reason: string }

export interface VaultState {
    vault: Vault
    loading: boolean
    error: string | undefined
    prefs: Prefs
    setPrefs: (patch: Partial<Omit<Prefs, 'id'>>) => Promise<void>
    /** Each edited note's text not saved yet, by its id. */
    drafts: Readonly<Record<string, string>>
    save: SaveState
    /** Puts a note's new text in, saved a moment after typing stops. */
    edit: (id: string, text: string) => void
    /** Saves a note's draft now, or every draft. */
    flush: (id?: string) => void
    createNote: (fields: { title?: string; folder?: string | null; body?: string; day?: string }) => Promise<Note>
    renameNote: (id: string, title: string) => Promise<number>
    moveNote: (id: string, folder: string | null) => Promise<void>
    deleteNote: (id: string) => Promise<void>
    createFolder: (name: string, parent: string | null) => Promise<Folder>
    renameFolder: (id: string, name: string) => Promise<void>
    moveFolder: (id: string, parent: string | null) => Promise<void>
    /** How the vault orders each folder. */
    order: Order
    /**
     * Puts a note or a folder into a folder (null for the top of the vault) at a place among the
     * notes or the folders there, counted without it; by name, only the folder it goes into counts.
     */
    place: (what: 'note' | 'folder', id: string, into: string | null, index: number) => Promise<void>
    deleteFolder: (id: string) => Promise<void>
    /** Rewrites one note's text, as linking a mention does. */
    rewrite: (id: string, change: (text: string) => string) => Promise<void>
    /** Goes to a note, at a heading if given. */
    open: (id: string, heading?: string) => void
    /** The heading a note was opened at, until its preview has scrolled there. */
    heading: string | null
    clearHeading: () => void
    /** Makes a note the shown tab and the newest of the recent ones. */
    show: (id: string) => void
    closeTab: (id: string) => void
    setView: (id: string, view: View) => void
    /** Opens a day's note, made from the template the first time. */
    openDay: (day: string) => void
    /** Follows a link's name: opens its note, or asks to make it. */
    follow: (target: string, from: Note | undefined, heading?: string) => void
    /** A new note in a folder, opened. */
    newNote: (folder: string | null) => void
    asking: Asking | null
    ask: (question: Asking | null) => void
}

const Context = createContext<VaultState | undefined>(undefined)

/** How long typing stops before a draft is saved, in milliseconds. */
const SAVE_AFTER = 700

/** The rank after every one of a level's notes or folders. */
const rankAfter = (level: readonly { rank?: number }[]) => level.reduce((most, one) => Math.max(most, one.rank ?? -1), -1) + 1

/** The rank before every one of a level's notes or folders. */
const rankBefore = (level: readonly { rank?: number }[]) => level.reduce((least, one) => Math.min(least, one.rank ?? 0), 0) - 1

const failed = (what: string) => (error: unknown) => {
    toast.add({ type: 'error', title: what, description: error instanceof Error ? error.message : String(error) })
    throw error
}

export function VaultProvider({ children }: { children: ReactNode }) {
    const noteList = useCollection(noteRows)
    const folderList = useCollection(folderRows)
    const prefList = useCollection(prefRows)
    // A change to the settings stands at once, before the backend answers, so a second change made meanwhile builds on it.
    const [pending, setPending] = useState<Partial<Prefs>>({})
    const stored = prefList.rows?.[0] ?? DEFAULT_PREFS
    const prefs = useMemo(() => ({ ...stored, ...pending }), [stored, pending])
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [save, setSave] = useState<SaveState>({ state: 'idle' })
    const [asking, ask] = useState<Asking | null>(null)
    const [heading, setHeading] = useState<string | null>(null)
    const timers = useRef(new Map<string, number>())
    const latest = useRef(drafts)
    latest.current = drafts

    const saved = noteList.rows
    const live = useMemo(
        () => (saved ?? []).map((note) => (drafts[note.id] === undefined ? note : { ...note, body: drafts[note.id] as string })),
        [saved, drafts],
    )
    const vault = useMemo(() => indexVault(live, folderList.rows ?? []), [live, folderList.rows])
    const vaultRef = useRef(vault)
    vaultRef.current = vault
    const prefsRef = useRef(prefs)
    prefsRef.current = prefs

    const setPrefs = useCallback((patch: Partial<Omit<Prefs, 'id'>>) => {
        const mine = prefsRef.current
        prefsRef.current = { ...mine, ...patch }
        setPending((now) => ({ ...now, ...patch }))
        const settle = () =>
            setPending((now) => {
                const rest = { ...now }
                for (const key of Object.keys(patch) as (keyof typeof patch)[]) if (rest[key] === patch[key]) delete rest[key]
                return rest
            })
        return prefRows.update(mine.id, patch).then(settle, (error: unknown) => {
            settle()
            return failed('The settings were not saved')(error)
        })
    }, [])

    const flush = useCallback((only?: string) => {
        for (const [id, text] of Object.entries(latest.current)) {
            if (only !== undefined && id !== only) continue
            window.clearTimeout(timers.current.get(id))
            timers.current.delete(id)
            setSave({ state: 'saving' })
            noteRows.update(id, { body: text, updated: Date.now() }).then(
                () => {
                    setSave({ state: 'saved', at: Date.now() })
                    // The draft goes once what was saved is what it holds; typing since keeps it.
                    setDrafts((now) => {
                        if (now[id] !== text) return now
                        const { [id]: _gone, ...rest } = now
                        return rest
                    })
                },
                (error: unknown) => setSave({ state: 'failed', reason: error instanceof Error ? error.message : String(error) }),
            )
        }
    }, [])

    const edit = useCallback(
        (id: string, text: string) => {
            setDrafts((now) => ({ ...now, [id]: text }))
            latest.current = { ...latest.current, [id]: text }
            window.clearTimeout(timers.current.get(id))
            timers.current.set(
                id,
                window.setTimeout(() => flush(id), SAVE_AFTER),
            )
        },
        [flush],
    )

    // What is typed is saved before the page goes, too.
    useEffect(() => {
        const leave = () => flush()
        window.addEventListener('pagehide', leave)
        return () => window.removeEventListener('pagehide', leave)
    }, [flush])

    const bodyOf = (id: string) => latest.current[id] ?? vaultRef.current.byId.get(id)?.body ?? ''

    const rewrite = useCallback(async (id: string, change: (text: string) => string) => {
        window.clearTimeout(timers.current.get(id))
        const text = change(bodyOf(id))
        setDrafts((now) => {
            const { [id]: _gone, ...rest } = now
            return rest
        })
        latest.current = Object.fromEntries(Object.entries(latest.current).filter(([key]) => key !== id))
        await noteRows.update(id, { body: text, updated: Date.now() }).then(() => undefined, failed('The note was not saved'))
        // oxlint-disable-next-line react/exhaustive-deps
    }, [])

    const show = useCallback(
        (id: string) => {
            const mine = prefsRef.current
            const tabs = mine.tabs.includes(id) ? mine.tabs : [...mine.tabs, id]
            const recent = [id, ...mine.recent.filter((one) => one !== id)].slice(0, RECENT)
            if (mine.active === id && tabs === mine.tabs && mine.recent[0] === id) return
            const views = mine.views[id] === undefined ? { ...mine.views, [id]: mine.defaultView } : mine.views
            void setPrefs({ tabs, active: id, recent, views })
        },
        [setPrefs],
    )

    const open = useCallback((id: string, at?: string) => {
        setHeading(at ?? null)
        go(`/note/${id}`)
    }, [])

    const closeTab = useCallback(
        (id: string) => {
            flush(id)
            const mine = prefsRef.current
            const at = mine.tabs.indexOf(id)
            const tabs = mine.tabs.filter((one) => one !== id)
            const { [id]: _view, ...views } = mine.views
            const next = mine.active === id ? (tabs[Math.min(at, tabs.length - 1)] ?? null) : mine.active
            void setPrefs({ tabs, active: next, views })
            if (mine.active === id && window.location.hash.startsWith('#/note/')) go(next === null ? '/notes' : `/note/${next}`)
        },
        [flush, setPrefs],
    )

    const createNote = useCallback(async (fields: { title?: string; folder?: string | null; body?: string; day?: string }) => {
        const taken = vaultRef.current.notes.map((note) => note.title)
        const title = freeName(fields.title?.trim() || 'Untitled', taken)
        const now = Date.now()
        const folder = fields.folder ?? null
        const level = vaultRef.current.notes.filter((note) => note.folder === folder)
        return noteRows
            .create({
                title,
                folder,
                // In the reader's own order a new note goes last, and a daily note first, as the newest day.
                rank: fields.day === undefined ? rankAfter(level) : rankBefore(level),
                body: fields.body ?? `# ${title}\n\n`,
                created: now,
                updated: now,
                ...(fields.day === undefined ? {} : { day: fields.day }),
            })
            .catch(failed('The note was not made'))
    }, [])

    const renameNote = useCallback(async (id: string, title: string) => {
        const current = vaultRef.current
        const note = current.byId.get(id)
        if (note === undefined) throw new Error('That note is gone.')
        const name = title.trim()
        if (name === note.title) return 0
        const refused = badTitle(
            name,
            current.notes.filter((one) => one.id !== id).map((one) => one.title),
        )
        if (refused !== null) throw new Error(refused)
        flush()
        const linking = current.backlinks.get(id) ?? []
        // A first heading that repeats the old name takes the new one.
        const own = bodyOf(id).replace(new RegExp(`^# ${note.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `# ${name}`)
        await noteRows.update(id, { title: name, body: own, updated: Date.now() }).catch(failed('The note was not renamed'))
        for (const { from } of linking) await rewrite(from.id, (text) => renameLinks(text, note.title, name))
        return linking.length
        // oxlint-disable-next-line react/exhaustive-deps
    }, [])

    const moveNote = useCallback(async (id: string, folder: string | null) => {
        const level = vaultRef.current.notes.filter((note) => note.folder === folder && note.id !== id)
        await noteRows.update(id, { folder, rank: rankAfter(level) }).then(() => undefined, failed('The note was not moved'))
        const where = folder === null ? 'the top of the vault' : vaultRef.current.path(folder)
        toast.add({ type: 'success', title: `Moved to ${where}`, description: vaultRef.current.byId.get(id)?.title })
    }, [])

    const deleteNote = useCallback(
        async (id: string) => {
            const title = vaultRef.current.byId.get(id)?.title
            window.clearTimeout(timers.current.get(id))
            setDrafts((now) => {
                const { [id]: _gone, ...rest } = now
                return rest
            })
            await noteRows.remove(id).catch(failed('The note was not deleted'))
            const mine = prefsRef.current
            if (mine.tabs.includes(id)) closeTab(id)
            void setPrefs({ recent: prefsRef.current.recent.filter((one) => one !== id) })
            toast.add({ title: 'Note deleted', description: title })
        },
        [closeTab, setPrefs],
    )

    const createFolder = useCallback(async (name: string, parent: string | null) => {
        const level = vaultRef.current.folders.filter((folder) => folder.parent === parent)
        const siblings = level.map((folder) => folder.name)
        return folderRows
            .create({ name: freeName(name.trim() || 'New folder', siblings), parent, rank: rankAfter(level) })
            .catch(failed('The folder was not made'))
    }, [])

    const renameFolder = useCallback(async (id: string, name: string) => {
        const trimmed = name.trim()
        if (trimmed === '') throw new Error('A folder needs a name.')
        const folder = vaultRef.current.folderById.get(id)
        const siblings = vaultRef.current.folders
            .filter((one) => one.parent === folder?.parent && one.id !== id)
            .map((one) => one.name.toLowerCase())
        if (siblings.includes(trimmed.toLowerCase())) throw new Error(`A folder named ${trimmed} is already there.`)
        await folderRows.update(id, { name: trimmed }).then(() => undefined, failed('The folder was not renamed'))
    }, [])

    const moveFolder = useCallback(async (id: string, parent: string | null) => {
        if (parent !== null && folderAndBelow(vaultRef.current, id).has(parent)) throw new Error('A folder cannot go inside itself.')
        const level = vaultRef.current.folders.filter((folder) => folder.parent === parent && folder.id !== id)
        await folderRows.update(id, { parent, rank: rankAfter(level) }).then(() => undefined, failed('The folder was not moved'))
        const where = parent === null ? 'the top of the vault' : vaultRef.current.path(parent)
        toast.add({ type: 'success', title: `Moved to ${where}`, description: vaultRef.current.folderById.get(id)?.name })
    }, [])

    const deleteFolder = useCallback(
        async (id: string) => {
            const current = vaultRef.current
            const gone = folderAndBelow(current, id)
            const name = current.folderById.get(id)?.name
            const inside = current.notes.filter((note) => note.folder !== null && gone.has(note.folder))
            for (const note of inside) await deleteNote(note.id)
            for (const folder of gone) await folderRows.remove(folder).catch(failed('The folder was not deleted'))
            if (prefsRef.current.dailyFolder !== null && gone.has(prefsRef.current.dailyFolder)) void setPrefs({ dailyFolder: null })
            toast.add({ title: 'Folder deleted', description: `${name ?? 'The folder'} and ${String(inside.length)} notes in it` })
        },
        [deleteNote, setPrefs],
    )

    const order: Order = prefs.order ?? 'manual'

    const place = useCallback(
        async (what: 'note' | 'folder', id: string, into: string | null, index: number) => {
            const current = vaultRef.current
            const mine = prefsRef.current
            const manual = (mine.order ?? 'manual') === 'manual'
            if (what === 'folder') {
                const folder = current.folderById.get(id)
                if (folder === undefined) return
                if (!manual) return folder.parent === into ? undefined : moveFolder(id, into)
                if (into !== null && folderAndBelow(current, id).has(into)) throw new Error('A folder cannot go inside itself.')
                const level = insertItem(
                    foldersIn(current, into, 'manual').filter((one) => one.id !== id),
                    folder,
                    index,
                )
                // Every folder of the level is ranked by its new place; only those that changed are saved.
                await Promise.all(
                    level.flatMap((one, rank) =>
                        one.rank === rank && one.parent === into ? [] : [folderRows.update(one.id, { rank, parent: into })],
                    ),
                ).catch(failed('The folder was not moved'))
                if (folder.parent !== into)
                    toast.add({
                        type: 'success',
                        title: `Moved to ${into === null ? 'the top of the vault' : current.path(into)}`,
                        description: folder.name,
                    })
                return
            }
            const note = current.byId.get(id)
            if (note === undefined) return
            if (!manual) return note.folder === into ? undefined : moveNote(id, into)
            const level = insertItem(
                notesIn(current, into, 'manual', mine.dailyFolder).filter((one) => one.id !== id),
                note,
                index,
            )
            await Promise.all(
                level.flatMap((one, rank) =>
                    one.rank === rank && one.folder === into ? [] : [noteRows.update(one.id, { rank, folder: into })],
                ),
            ).catch(failed('The note was not moved'))
            if (note.folder !== into)
                toast.add({
                    type: 'success',
                    title: `Moved to ${into === null ? 'the top of the vault' : current.path(into)}`,
                    description: note.title,
                })
        },
        [moveFolder, moveNote],
    )

    const openDay = useCallback(
        (date: string) => {
            const found = vaultRef.current.notes.find(
                (note) => note.day === date || (note.title === date && note.folder === prefsRef.current.dailyFolder),
            )
            if (found !== undefined) return open(found.id)
            const mine = prefsRef.current
            void createNote({ title: date, folder: mine.dailyFolder, body: fromTemplate(mine.template, date), day: date }).then((note) => {
                toast.add({ type: 'success', title: `Daily note for ${date}`, description: 'Made from the template.' })
                open(note.id)
            })
        },
        [createNote, open],
    )

    const follow = useCallback(
        (target: string, from: Note | undefined, at?: string) => {
            const found = vaultRef.current.resolve(target)
            if (found !== undefined) open(found.id, at)
            else ask({ kind: 'create', title: target.trim(), folder: from?.folder ?? null })
        },
        [open],
    )

    const newNote = useCallback(
        (folder: string | null) => {
            void createNote({ folder }).then((note) => {
                open(note.id)
                ask({ kind: 'rename-note', id: note.id })
            })
        },
        [createNote, open],
    )

    const setView = useCallback((id: string, view: View) => void setPrefs({ views: { ...prefsRef.current.views, [id]: view } }), [setPrefs])

    const value = useMemo(
        (): VaultState => ({
            vault,
            loading: noteList.rows === undefined || folderList.rows === undefined,
            error: noteList.error ?? folderList.error ?? prefList.error,
            prefs,
            setPrefs,
            drafts,
            save,
            edit,
            flush,
            createNote,
            renameNote,
            moveNote,
            deleteNote,
            createFolder,
            renameFolder,
            moveFolder,
            order,
            place,
            deleteFolder,
            rewrite,
            open,
            heading,
            clearHeading: () => setHeading(null),
            show,
            closeTab,
            setView,
            openDay,
            follow,
            newNote,
            asking,
            ask,
        }),
        [
            vault,
            noteList.rows,
            noteList.error,
            folderList.rows,
            folderList.error,
            prefList.error,
            prefs,
            setPrefs,
            drafts,
            save,
            edit,
            flush,
            createNote,
            renameNote,
            moveNote,
            deleteNote,
            createFolder,
            renameFolder,
            moveFolder,
            order,
            place,
            deleteFolder,
            rewrite,
            open,
            heading,
            show,
            closeTab,
            setView,
            openDay,
            follow,
            newNote,
            asking,
        ],
    )
    return <Context value={value}>{children}</Context>
}

export function useVault(): VaultState {
    const state = useContext(Context)
    if (state === undefined) throw new Error('useVault is used outside VaultProvider')
    return state
}
