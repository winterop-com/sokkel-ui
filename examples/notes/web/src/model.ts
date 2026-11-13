/** What the vault holds: folders, the notes in them, and the reader's own settings. */

import type { EditPreviewView } from '@winterop-com/sokkel-ui/EditPreview'

export interface Folder {
    id: string
    name: string
    /** The folder it sits in, or null at the top of the vault. */
    parent: string | null
    /** Its place among the folders beside it, in the reader's own order. */
    rank?: number
}

export interface Note {
    id: string
    /** The note's name, which `[[links]]` name it by; no two notes share one, in any case. */
    title: string
    folder: string | null
    /** The note as markdown. */
    body: string
    /** When it was made and last changed, as milliseconds since 1970. */
    created: number
    updated: number
    /** The day a daily note is for, `YYYY-MM-DD`. */
    day?: string
    /** Its place among the notes beside it, in the reader's own order. */
    rank?: number
}

export type FontSize = 'sm' | 'md' | 'lg'
/** How the vault orders each folder: by name, or in the order the reader drags things into. */
export type Order = 'name' | 'manual'
export type View = EditPreviewView

export interface Prefs {
    id: string
    /** The editor's text size. */
    fontSize: FontSize
    /** Long lines fold at the editor's edge. */
    wrap: boolean
    lineNumbers: boolean
    /** What a note opens in: the editor, its preview, or both. */
    defaultView: View
    /** What each open note shows now, by its id. */
    views: Record<string, View>
    /** The notes open as tabs, in order, and the one shown. */
    tabs: string[]
    active: string | null
    /** The notes opened most lately, newest first. */
    recent: string[]
    /** Whether the panel of links and the outline shows beside a note. */
    panel: boolean
    /** The folder daily notes go in, and the text a new one starts from. */
    dailyFolder: string | null
    template: string
    /** Whether the graph shows the notes with no link. */
    orphans: boolean
    /** How the vault orders each folder; a vault kept before there was a choice has none, and reads as `manual`. */
    order?: Order
}

export const TEMPLATE = `# {{date}}

## Plan

- [ ]

## Log

## Notes

#journal
`

export const DEFAULT_PREFS: Prefs = {
    id: 'me',
    fontSize: 'md',
    wrap: true,
    lineNumbers: false,
    defaultView: 'both',
    views: {},
    tabs: [],
    active: null,
    recent: [],
    panel: true,
    dailyFolder: 'daily',
    template: TEMPLATE,
    orphans: true,
    order: 'manual',
}

/** How many notes the recent list keeps. */
export const RECENT = 12

const pad = (value: number) => String(value).padStart(2, '0')

/** The local day `offset` days from today, as `YYYY-MM-DD`. */
export function day(offset = 0, from = new Date()): string {
    const date = new Date(from)
    date.setDate(date.getDate() + offset)
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A `YYYY-MM-DD` day as a local date. */
export function dateOf(text: string): Date {
    const [year = 0, month = 1, date = 1] = text.split('-').map(Number)
    return new Date(year, month - 1, date)
}

/** A day written out for a reader: Monday 9 November 2026. */
export function longDay(text: string): string {
    return dateOf(text).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** A daily note's text from the template, with `{{date}}` and `{{long}}` filled in for the day. */
export function fromTemplate(template: string, forDay: string): string {
    return template.replaceAll('{{date}}', forDay).replaceAll('{{long}}', longDay(forDay))
}

/** A time of day on the clock, 14:05. */
export function clock(at: number): string {
    const date = new Date(at)
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** How many words a text holds. */
export function wordCount(text: string): number {
    return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

/** A name for a note or a folder that none of `taken` has, in any case: the name, or the name and a number. */
export function freeName(name: string, taken: readonly string[]): string {
    const lower = new Set(taken.map((one) => one.toLowerCase()))
    if (!lower.has(name.toLowerCase())) return name
    for (let count = 2; ; count += 1) {
        const next = `${name} ${String(count)}`
        if (!lower.has(next.toLowerCase())) return next
    }
}

/** Why a name cannot be a note's, or null when it can: empty, holding a character links read, or taken. */
export function badTitle(title: string, taken: readonly string[]): string | null {
    const trimmed = title.trim()
    if (trimmed === '') return 'A note needs a name.'
    if (/[[\]|#]/.test(trimmed)) return 'A name cannot hold [ ] | or #, which links read.'
    if (taken.some((one) => one.toLowerCase() === trimmed.toLowerCase())) return `A note named ${trimmed} is already in the vault.`
    return null
}
