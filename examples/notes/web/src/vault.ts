/** What the vault's notes say about each other: their links and backlinks, their tags, and where they sit. */

import type { TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { mentionsOf, tagsIn, wikiLinksIn, type WikiLink } from '@winterop-com/sokkel-ui/lib/wiki-links'
import { CalendarDays, FileText, Folder as FolderIcon, FolderOpen } from 'lucide-react'

import type { Folder, Note } from './model'

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

/** Folders first, then notes, each by name; daily notes newest first. */
function byName(a: { name: string }, b: { name: string }): number {
    return a.name.localeCompare(b.name, 'en', { numeric: true })
}

/** The vault as a tree: its folders with their folders and notes, then the notes at the top. */
export function vaultTree(vault: Vault, daily: string | null): TreeNode[] {
    const level = (parent: string | null): TreeNode[] => {
        const folders = vault.folders
            .filter((folder) => folder.parent === parent)
            .map((folder) => ({ folder, name: folder.name }))
            .sort(byName)
            .map(({ folder }) => ({
                id: `folder:${folder.id}`,
                label: folder.name,
                icon: FolderIcon,
                openIcon: FolderOpen,
                children: level(folder.id),
            }))
        const notes = vault.notes
            .filter((note) => note.folder === parent)
            .map((note) => ({ note, name: note.title }))
            .sort((a, b) => (parent !== null && parent === daily ? byName(b, a) : byName(a, b)))
            .map(({ note }) => ({ id: note.id, label: note.title, icon: note.day === undefined ? FileText : CalendarDays }))
        return [...folders, ...notes]
    }
    return level(null)
}

/** The folders alone as a tree, under the top of the vault, for picking where a note or a folder goes. */
export function folderTree(vault: Vault, top: string): TreeNode[] {
    const level = (parent: string | null): TreeNode[] =>
        vault.folders
            .filter((folder) => folder.parent === parent)
            .map((folder) => ({ folder, name: folder.name }))
            .sort(byName)
            .map(({ folder }) => ({
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
