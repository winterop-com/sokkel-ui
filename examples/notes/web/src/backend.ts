/** The vault on the fake backend: its folders, its notes and the reader's settings, kept in this browser. */

import { collection } from 'tidevann-shared/backend'

import { DEFAULT_PREFS, type Folder, type Note, type Prefs } from './model'
import { FOLDERS, seedNotes } from './seed'

export const folders = collection<Folder>('notes-folders', () => FOLDERS.map((folder) => ({ ...folder })))
export const notes = collection<Note>('notes-notes', seedNotes)
export const prefs = collection<Prefs>('notes-prefs', () => [
    { ...DEFAULT_PREFS, tabs: ['retry', 'nightly-export'], active: 'retry', recent: ['retry', 'nightly-export', 'weekly-sync'] },
])
