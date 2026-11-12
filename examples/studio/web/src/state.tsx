/** What every part of the studio reads and does: the files and their open documents, the runs, the tabs and the reader's settings. */

import { createSharedDocument, type SharedDocument } from '@winterop-com/sokkel-ui/CodeEditor'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'
import { files as fileRows, prefs as prefRows, runs as runRows } from './backend'
import { DEFAULT_PREFS, kindOf, type FileKind, type Prefs, type Project, type Run, type WorkFile } from './model'
import { template } from './seed'

/** A question the studio is asking in a dialog. */
export type Asking =
    | { kind: 'new'; project: Project; fileKind: FileKind }
    | { kind: 'rename'; id: string }
    | { kind: 'delete'; id: string }
    /** Tabs with changes not saved, about to close. */
    | { kind: 'close'; ids: string[] }

/** Where the latest save stands. */
export type SaveState = { state: 'idle' } | { state: 'saving' } | { state: 'saved'; at: number } | { state: 'failed'; reason: string }

/** Where a tab leads: a file's page, or a table's rows. */
export const tabHref = (id: string) => (id.startsWith('table:') ? `/table/${id.slice('table:'.length)}` : `/file/${id}`)

export interface StudioState {
    files: readonly WorkFile[]
    byId: ReadonlyMap<string, WorkFile>
    loading: boolean
    runs: readonly Run[]
    prefs: Prefs
    setPrefs: (patch: Partial<Omit<Prefs, 'id'>>) => Promise<void>
    /** The document a file is edited in, made from its saved text the first time; one for every editor of it, kept until its tab closes. */
    docFor: (file: WorkFile) => SharedDocument
    /** The files whose document holds changes not saved. */
    dirty: ReadonlySet<string>
    save: (id: string) => Promise<void>
    saveAll: () => Promise<void>
    saving: SaveState
    /** Puts a file's document back to what was saved. */
    revert: (id: string) => void
    /** Shows a tab: a file's id or `table:<name>`. */
    open: (id: string) => void
    /** Makes a tab the shown one, adding it to the strip, as its page opens. */
    show: (id: string) => void
    /** Closes tabs, asking first about those with changes not saved. */
    close: (ids: readonly string[]) => void
    /** Closes tabs as they are, dropping their changes. */
    closeNow: (ids: readonly string[]) => void
    createFile: (project: Project, kind: FileKind, name: string) => Promise<WorkFile>
    renameFile: (id: string, name: string) => Promise<void>
    moveFile: (id: string, project: Project) => Promise<void>
    deleteFile: (id: string) => Promise<void>
    /** Runs a pipeline from its document as it stands, and answers with the run. */
    run: (id: string) => Promise<Run | undefined>
    cancel: (run: Run) => void
    asking: Asking | null
    ask: (question: Asking | null) => void
}

const Context = createContext<StudioState | undefined>(undefined)

const failed = (what: string) => (error: unknown) => {
    toast.add({ type: 'error', title: what, description: error instanceof Error ? error.message : String(error) })
    throw error
}

export function StudioProvider({ children }: { children: ReactNode }) {
    const fileList = useCollection(fileRows)
    const runList = useCollection(runRows)
    const prefList = useCollection(prefRows)
    // A change to the settings stands at once, before the backend answers, so a second change made meanwhile builds on it.
    const [pending, setPending] = useState<Partial<Prefs>>({})
    const stored = prefList.rows?.[0] ?? DEFAULT_PREFS
    // Settings kept before a setting was added take its default.
    const prefs = useMemo(() => ({ ...DEFAULT_PREFS, ...stored, ...pending }), [stored, pending])
    const prefsRef = useRef(prefs)
    prefsRef.current = prefs
    const [asking, ask] = useState<Asking | null>(null)
    const [saving, setSaving] = useState<SaveState>({ state: 'idle' })
    const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set())

    const files = useMemo(() => fileList.rows ?? [], [fileList.rows])
    const byId = useMemo(() => new Map(files.map((file) => [file.id, file])), [files])
    const savedRef = useRef(byId)
    savedRef.current = byId
    const runs = useMemo(() => [...(runList.rows ?? [])].sort((a, b) => b.number - a.number), [runList.rows])
    const runsRef = useRef(runs)
    runsRef.current = runs

    const docs = useRef(new Map<string, { doc: SharedDocument; stop: () => void }>())
    const mark = useCallback((id: string, changed: boolean) => {
        setDirty((now) => {
            if (now.has(id) === changed) return now
            const next = new Set(now)
            if (changed) next.add(id)
            else next.delete(id)
            return next
        })
    }, [])

    const docFor = useCallback(
        (file: WorkFile) => {
            const kept = docs.current.get(file.id)
            if (kept !== undefined) return kept.doc
            const doc = createSharedDocument(file.text)
            const stop = doc.subscribe((text) => mark(file.id, text !== savedRef.current.get(file.id)?.text))
            docs.current.set(file.id, { doc, stop })
            return doc
        },
        [mark],
    )

    // A save, or a file put back from elsewhere, settles whether its document still differs.
    useEffect(() => {
        for (const [id, { doc }] of docs.current) {
            const saved = byId.get(id)
            mark(id, saved !== undefined && doc.text !== saved.text)
        }
    }, [byId, mark])

    const drop = useCallback(
        (id: string) => {
            docs.current.get(id)?.stop()
            docs.current.delete(id)
            mark(id, false)
        },
        [mark],
    )

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

    const save = useCallback(async (id: string) => {
        const kept = docs.current.get(id)
        if (kept === undefined) return
        const text = kept.doc.text
        setSaving({ state: 'saving' })
        try {
            await fileRows.update(id, { text, updated: Date.now() })
            setSaving({ state: 'saved', at: Date.now() })
        } catch (error) {
            setSaving({ state: 'failed', reason: error instanceof Error ? error.message : String(error) })
            failed('The file was not saved')(error)
        }
    }, [])

    const saveAll = useCallback(async () => {
        await Promise.all([...docs.current.keys()].filter((id) => dirty.has(id)).map((id) => save(id)))
    }, [dirty, save])

    const revert = useCallback((id: string) => {
        const saved = savedRef.current.get(id)
        const kept = docs.current.get(id)
        if (saved !== undefined && kept !== undefined) kept.doc.setText(saved.text)
    }, [])

    const show = useCallback(
        (id: string) => {
            const now = prefsRef.current
            if (now.active === id && now.tabs.includes(id)) return
            void setPrefs({ active: id, tabs: now.tabs.includes(id) ? now.tabs : [...now.tabs, id] })
        },
        [setPrefs],
    )

    const open = useCallback((id: string) => go(tabHref(id)), [])

    const closeNow = useCallback(
        (ids: readonly string[]) => {
            const now = prefsRef.current
            const tabs = now.tabs.filter((tab) => !ids.includes(tab))
            for (const id of ids) drop(id)
            if (now.active !== null && ids.includes(now.active)) {
                const at = now.tabs.indexOf(now.active)
                const next = tabs[Math.min(at, tabs.length - 1)] ?? null
                void setPrefs({ tabs, active: next })
                go(next === null ? '/' : tabHref(next))
            } else void setPrefs({ tabs })
        },
        [drop, setPrefs],
    )

    const close = useCallback(
        (ids: readonly string[]) => {
            const unsaved = ids.filter((id) => dirty.has(id))
            if (unsaved.length > 0) ask({ kind: 'close', ids: [...ids] })
            else closeNow(ids)
        },
        [dirty, closeNow],
    )

    const createFile = useCallback(async (project: Project, kind: FileKind, name: string) => {
        const made = await fileRows
            .create({ project, kind, name: `${name}${kindOf(kind).extension}`, text: template(kind, name, project), updated: Date.now() })
            .catch(failed('The file was not made'))
        go(tabHref(made.id))
        return made
    }, [])

    const renameFile = useCallback(async (id: string, name: string) => {
        const file = savedRef.current.get(id)
        if (file === undefined) return
        await fileRows.update(id, { name: `${name}${kindOf(file.kind).extension}` }).catch(failed('The file was not renamed'))
    }, [])

    const moveFile = useCallback(async (id: string, project: Project) => {
        await fileRows.update(id, { project }).catch(failed('The file was not moved'))
    }, [])

    const deleteFile = useCallback(
        async (id: string) => {
            await fileRows.remove(id).catch(failed('The file was not deleted'))
            closeNow([id])
        },
        [closeNow],
    )

    const run = useCallback(
        async (id: string) => {
            const file = savedRef.current.get(id)
            if (file === undefined || file.kind !== 'pipeline') return undefined
            const doc = docFor(file)
            const number = (runsRef.current[0]?.number ?? 0) + 1
            try {
                // The runner reads YAML, so it loads with the first run.
                const { startRun } = await import('./simulate')
                return await startRun(file, doc.text, number, doc.text !== file.text)
            } catch (error) {
                failed('The run did not start')(error)
                return undefined
            }
        },
        [docFor],
    )

    const value = useMemo<StudioState>(
        () => ({
            files,
            byId,
            loading: fileList.rows === undefined,
            runs,
            prefs,
            setPrefs,
            docFor,
            dirty,
            save,
            saveAll,
            saving,
            revert,
            open,
            show,
            close,
            closeNow,
            createFile,
            renameFile,
            moveFile,
            deleteFile,
            run,
            cancel: (going: Run) => void import('./simulate').then(({ cancelRun }) => cancelRun(going)),
            asking,
            ask,
        }),
        [
            files,
            byId,
            fileList.rows,
            runs,
            prefs,
            setPrefs,
            docFor,
            dirty,
            save,
            saveAll,
            saving,
            revert,
            open,
            show,
            close,
            closeNow,
            createFile,
            renameFile,
            moveFile,
            deleteFile,
            run,
            asking,
        ],
    )
    return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useStudio(): StudioState {
    const state = useContext(Context)
    if (state === undefined) throw new Error('useStudio is used outside StudioProvider.')
    return state
}
