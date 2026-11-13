/** What the vault's notes say about each other: their links and backlinks, their tags, and where they sit. */

import type { TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { mentionsOf, tagsIn, wikiLinksIn, type WikiLink } from '@winterop-com/sokkel-ui/lib/wiki-links'
import { CalendarDays, FileText, Folder as FolderIcon, FolderOpen } from 'lucide-react'

import type { Folder, Note, Order } from './model'

/** A link from one note to another, with the line it stands in. */
export interface Backlink {
    from: Note
    link: WikiLink
    line: string
}

/** A place a note's name is written in another note without a link. */
export interface Mention {
    from: Note
    at: { from: number; to: number }
    line: string
}

export interface Vault {
    notes: readonly Note[]
    folders: readonly Folder[]
    byId: ReadonlyMap<string, Note>
    folderById: ReadonlyMap<string, Folder>
    /** Each note's links out, by its id. */
    links: ReadonlyMap<string, readonly WikiLink[]>
    /** The links into each note, by its id. */
    backlinks: ReadonlyMap<string, readonly Backlink[]>
    /** Each note's tags, by its id, and the notes under each tag. */
    tagsOf: ReadonlyMap<string, readonly string[]>
    tagged: ReadonlyMap<string, readonly Note[]>
    /** The note a link's name names, in any case. */
    resolve: (target: string) => Note | undefined
    /** A folder's path from the top: Projects / Services. */
    path: (folder: string | null) => string
}

/** The line a range of a text stands in, cut to about `room` characters around the range. */
export function lineAround(text: string, from: number, to: number, room = 90): string {
    const start = text.lastIndexOf('\n', from - 1) + 1
    const endAt = text.indexOf('\n', to)
    const line = text.slice(start, endAt === -1 ? text.length : endAt)
    const at = from - start
    if (line.length <= room) return line.trim()
    const left = Math.max(0, at - Math.floor(room / 3))
    const cut = line.slice(left, left + room)
    return `${left > 0 ? '…' : ''}${cut.trim()}${left + room < line.length ? '…' : ''}`
}

export function indexVault(notes: readonly Note[], folders: readonly Folder[]): Vault {
    const byId = new Map(notes.map((note) => [note.id, note]))
    const byTitle = new Map(notes.map((note) => [note.title.toLowerCase(), note]))
    const folderById = new Map(folders.map((folder) => [folder.id, folder]))
    const resolve = (target: string) => byTitle.get(target.trim().toLowerCase())
    const links = new Map<string, WikiLink[]>()
    const backlinks = new Map<string, Backlink[]>()
    const tagsOf = new Map<string, string[]>()
    const tagged = new Map<string, Note[]>()
    for (const note of notes) {
        const out = wikiLinksIn(note.body)
        links.set(note.id, out)
        for (const link of out) {
            const to = resolve(link.target)
            if (to === undefined || to.id === note.id) continue
            const list = backlinks.get(to.id) ?? []
            // One entry per note linking, at its first link.
            if (!list.some((one) => one.from.id === note.id))
                list.push({ from: note, link, line: lineAround(note.body, link.from, link.to) })
            backlinks.set(to.id, list)
        }
        const tags = tagsIn(note.body)
        tagsOf.set(note.id, tags)
        for (const tag of tags) tagged.set(tag, [...(tagged.get(tag) ?? []), note])
    }
    const path = (folder: string | null): string => {
        const names: string[] = []
        for (let at = folder; at !== null;) {
            const found = folderById.get(at)
            if (found === undefined || names.length > 32) break
            names.unshift(found.name)
            at = found.parent
        }
        return names.join(' / ')
    }
    return { notes, folders, byId, folderById, links, backlinks, tagsOf, tagged, resolve, path }
}

/** The places other notes write a note's name without linking it, one per note at its first. */
export function unlinkedMentions(vault: Vault, note: Note): Mention[] {
    return vault.notes.flatMap((other) => {
        if (other.id === note.id) return []
        const [first] = mentionsOf(other.body, note.title)
        return first === undefined ? [] : [{ from: other, at: first, line: lineAround(other.body, first.from, first.to) }]
    })
}

/** Two names in reading order, numbers by their value. */
function byName(a: string, b: string): number {
    return a.localeCompare(b, 'en', { numeric: true })
}

/** Two places in the reader's own order; one without a place goes after those with one. */
function byRank(a: { rank?: number }, b: { rank?: number }): number {
    return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
}

/** The folders directly in a folder (null for the top of the vault), in the vault's order. */
export function foldersIn(vault: Vault, parent: string | null, order: Order): Folder[] {
    return vault.folders
        .filter((folder) => folder.parent === parent)
        .sort((a, b) => (order === 'manual' ? byRank(a, b) : 0) || byName(a.name, b.name))
}

/** The notes directly in a folder, in the vault's order: by name with daily notes newest first, or the reader's own. */
export function notesIn(vault: Vault, folder: string | null, order: Order, daily: string | null): Note[] {
    const named = (a: Note, b: Note) => (folder !== null && folder === daily ? byName(b.title, a.title) : byName(a.title, b.title))
    return vault.notes.filter((note) => note.folder === folder).sort((a, b) => (order === 'manual' ? byRank(a, b) : 0) || named(a, b))
}

/**
 * Every note in a folder and the folders under it (the whole vault for null), in the tree's order:
 * a folder's notes after its folders, and at the top the notes outside every folder last.
 */
export function notesInOrder(vault: Vault, top: string | null, order: Order, daily: string | null): Note[] {
    const walk = (folder: string | null): Note[] => [
        ...foldersIn(vault, folder, order).flatMap((one) => walk(one.id)),
        ...notesIn(vault, folder, order, daily),
    ]
    return walk(top)
}

/** The vault as a tree: its folders with their folders and notes, then the notes at the top. */
export function vaultTree(vault: Vault, daily: string | null, order: Order): TreeNode[] {
    const level = (parent: string | null): TreeNode[] => [
        ...foldersIn(vault, parent, order).map((folder) => ({
            id: `folder:${folder.id}`,
            label: folder.name,
            icon: FolderIcon,
            openIcon: FolderOpen,
            children: level(folder.id),
        })),
        ...notesIn(vault, parent, order, daily).map((note) => ({
            id: note.id,
            label: note.title,
            icon: note.day === undefined ? FileText : CalendarDays,
        })),
    ]
    return level(null)
}

/** The folders alone as a tree, under the top of the vault, for picking where a note or a folder goes. */
export function folderTree(vault: Vault, top: string, order: Order): TreeNode[] {
    const level = (parent: string | null): TreeNode[] =>
        foldersIn(vault, parent, order).map((folder) => ({
            id: folder.id,
            label: folder.name,
            icon: FolderIcon,
            openIcon: FolderOpen,
            children: level(folder.id),
        }))
    return [{ id: ROOT, label: top, icon: FolderIcon, openIcon: FolderOpen, children: level(null) }]
}

/** The id the top of the vault stands under where a folder is picked. */
export const ROOT = '~vault'

/** A folder and every folder under it. */
export function folderAndBelow(vault: Vault, id: string): Set<string> {
    const out = new Set([id])
    for (let grew = true; grew;) {
        grew = false
        for (const folder of vault.folders) {
            if (folder.parent !== null && out.has(folder.parent) && !out.has(folder.id)) {
                out.add(folder.id)
                grew = true
            }
        }
    }
    return out
}

/** A text with every link to `from` renamed to `to`, keeping a heading and the words shown. */
export function renameLinks(text: string, from: string, to: string): string {
    const lower = from.toLowerCase()
    let out = ''
    let at = 0
    for (const link of wikiLinksIn(text)) {
        if (link.target.toLowerCase() !== lower) continue
        out += text.slice(at, link.from)
        out += `[[${to}${link.heading === undefined ? '' : `#${link.heading}`}${link.label === undefined ? '' : `|${link.label}`}]]`
        at = link.to
    }
    return out + text.slice(at)
}
