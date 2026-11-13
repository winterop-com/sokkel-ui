/** The vault on the fake backend: its folders, its notes and the reader's settings, kept in this browser. */

import { collection } from 'tidevann-shared/backend'

import { DEFAULT_PREFS, type Folder, type Note, type Prefs } from './model'
import { FOLDERS, seedNotes } from './seed'
import { foldersIn, indexVault, notesInOrder } from './vault'

/** The seeded vault with each folder and note ranked as it sorts by name, so the reader's own order starts from that. */
function seeded(): { folders: Folder[]; notes: Note[] } {
    const vault = indexVault(seedNotes(), FOLDERS)
    const levels = [null, ...FOLDERS.map((folder) => folder.id)]
    const folders = levels.flatMap((parent) => foldersIn(vault, parent, 'name').map((folder, rank) => ({ ...folder, rank })))
    const notes = notesInOrder(vault, null, 'name', 'daily').map((note, rank) => ({ ...note, rank }))
    return { folders, notes }
}

export const folders = collection<Folder>('folders', () => seeded().folders)
export const notes = collection<Note>('notes', () => seeded().notes)
export const prefs = collection<Prefs>('prefs', () => [
    { ...DEFAULT_PREFS, tabs: ['retry', 'nightly-export'], active: 'retry', recent: ['retry', 'nightly-export', 'weekly-sync'] },
])
