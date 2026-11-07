import {
    ArrowDown,
    ArrowUp,
    File,
    FileArchive,
    FileBraces,
    FileCode,
    FileImage,
    FileSpreadsheet,
    FileText,
    Folder,
    type LucideIcon,
} from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Checkbox } from './ui/checkbox'
import { TABLE_HEAD_TEXT } from '../lib/table'

/** What a file is, which picks its icon and how it previews. */
export type FileKind = 'folder' | 'image' | 'table' | 'json' | 'text' | 'code' | 'pdf' | 'archive' | 'other'

/** One file or folder in a listing. */
export interface FileEntry {
    id: string
    name: string
    kind: FileKind
    /** The size in bytes; a folder has none. */
    size?: number
    /** When it last changed, as the reader sees it: `Nov 4, 14:02`, `yesterday`. */
    modified: string
    /** A value that sorts in time order, such as an ISO timestamp; `modified` sorts when absent. */
    modifiedAt?: string
    owner?: string
    /** A picture of the file for the grid, as a URL or a data URI. */
    thumbnail?: string
}

export type FileSortKey = 'name' | 'size' | 'modified' | 'owner'

export interface FileSort {
    key: FileSortKey
    direction: 'asc' | 'desc'
}

export interface FileListWords {
    name: string
    size: string
    modified: string
    owner: string
    selectAll: string
    select: string
    empty: string
}

const WORDS: FileListWords = {
    name: 'Name',
    size: 'Size',
    modified: 'Modified',
    owner: 'Owner',
    selectAll: 'Select all',
    select: 'Select',
    empty: 'This folder is empty.',
}

const ICONS: Record<FileKind, { icon: LucideIcon; tone: string }> = {
    folder: { icon: Folder, tone: 'text-kind-blue-ink' },
    image: { icon: FileImage, tone: 'text-kind-pink-ink' },
    table: { icon: FileSpreadsheet, tone: 'text-kind-green-ink' },
    json: { icon: FileBraces, tone: 'text-kind-violet-ink' },
    text: { icon: FileText, tone: 'text-muted-foreground' },
    code: { icon: FileCode, tone: 'text-kind-teal-ink' },
    pdf: { icon: FileText, tone: 'text-critical-ink' },
    archive: { icon: FileArchive, tone: 'text-warning-ink' },
    other: { icon: File, tone: 'text-muted-foreground' },
}

/** The icon of a file's kind, in that kind's color. */
export function FileTypeIcon({ kind, className }: { kind: FileKind; className?: string }) {
    const { icon: Icon, tone } = ICONS[kind]
    return <Icon aria-hidden className={cn('size-4 shrink-0', tone, className)} />
}

/** A byte count in the largest unit that keeps it at one or more: `812 B`, `14.2 KB`, `3.1 MB`. */
export function formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = bytes
    let unit = 0
    while (value >= 1000 && unit < units.length - 1) {
        value /= 1000
        unit += 1
    }
    return unit === 0 ? `${value} ${units[0]}` : `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/** The entries in the order a sort asks for, folders always before files. */
export function sortFiles<T extends FileEntry>(entries: readonly T[], sort: FileSort): T[] {
    const sign = sort.direction === 'asc' ? 1 : -1
    const value = (entry: T): string | number => {
        if (sort.key === 'size') return entry.size ?? 0
        if (sort.key === 'modified') return entry.modifiedAt ?? entry.modified
        if (sort.key === 'owner') return entry.owner ?? ''
        return entry.name
    }
    return [...entries].sort((a, b) => {
        const folders = Number(b.kind === 'folder') - Number(a.kind === 'folder')
        if (folders !== 0) return folders
        const x = value(a)
        const y = value(b)
        const order =
            typeof x === 'number' && typeof y === 'number'
                ? x - y
                : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })
        return order !== 0 ? order * sign : a.name.localeCompare(b.name, undefined, { numeric: true })
    })
}

/** The selection after a checkbox on one entry is flipped. */
function flip(selected: readonly string[], id: string): string[] {
    return selected.includes(id) ? selected.filter((each) => each !== id) : [...selected, id]
}

function pressable(onPress: (() => void) | undefined) {
    if (onPress === undefined) return {}
    return {
        tabIndex: 0,
        onClick: onPress,
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onPress()
            }
        },
    }
}

/**
 * A folder's contents as rows: a checkbox, the name with its kind's icon, the size, when it
 * changed, and who owns it. A column header sorts by that column and a second press reverses it;
 * folders stay above files whichever way it sorts. A press on a row opens it (`onOpen`), the
 * checkbox adds it to the selection, and the head's checkbox selects or clears every row.
 *
 * As its box narrows the owner goes first, then the size and the time move under the name, so a
 * listing beside an open panel or on a phone still reads.
 */
export function FileList({
    entries,
    sort,
    onSortChange,
    selected = [],
    onSelectedChange,
    active,
    onOpen,
    empty,
    className,
    words: given,
}: {
    /** The rows in the order to draw them; `sortFiles` orders them by `sort`. */
    entries: readonly FileEntry[]
    sort?: FileSort
    onSortChange?: (sort: FileSort) => void
    selected?: readonly string[]
    /** Draws the checkboxes; without it the listing has no selection. */
    onSelectedChange?: (ids: string[]) => void
    /** The row whose file is open, as in a preview beside the listing. */
    active?: string
    onOpen?: (entry: FileEntry) => void
    /** What an empty folder shows in place of the rows. */
    empty?: ReactNode
    className?: string
    words?: Partial<FileListWords>
}) {
    const words = { ...WORDS, ...given }
    const selectable = onSelectedChange !== undefined
    const chosen = new Set(selected)
    const all = entries.length > 0 && entries.every((entry) => chosen.has(entry.id))
    const template = selectable
        ? 'grid-cols-[1.25rem_minmax(0,1fr)] @md:grid-cols-[1.25rem_minmax(0,1fr)_5rem_7.5rem] @2xl:grid-cols-[1.25rem_minmax(0,1fr)_5.5rem_9rem_6.5rem]'
        : 'grid-cols-[minmax(0,1fr)] @md:grid-cols-[minmax(0,1fr)_5rem_7.5rem] @2xl:grid-cols-[minmax(0,1fr)_5.5rem_9rem_6.5rem]'
    const header = (key: FileSortKey, label: string, end = false) => {
        const on = sort?.key === key
        const Arrow = sort?.direction === 'desc' ? ArrowDown : ArrowUp
        return (
            <span
                role="columnheader"
                aria-sort={on ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                className={cn('min-w-0', key === 'owner' ? 'hidden @2xl:block' : key !== 'name' && 'hidden @md:block', end && 'text-right')}
            >
                {onSortChange === undefined ? (
                    <span className="truncate">{label}</span>
                ) : (
                    <button
                        type="button"
                        className={cn(
                            'inline-flex max-w-full items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                            on && 'text-foreground',
                        )}
                        onClick={() =>
                            onSortChange({
                                key,
                                direction:
                                    on && sort?.direction === 'asc'
                                        ? 'desc'
                                        : on
                                          ? 'asc'
                                          : key === 'name' || key === 'owner'
                                            ? 'asc'
                                            : 'desc',
                            })
                        }
                    >
                        <span className="truncate">{label}</span>
                        {on && <Arrow aria-hidden className="size-3 shrink-0" />}
                    </button>
                )}
            </span>
        )
    }
    return (
        <div
            className={cn(
                '@container flex min-h-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card',
                className,
            )}
        >
            <div role="table" className="min-h-0 overflow-y-auto">
                <div
                    role="row"
                    className={cn(
                        cn(
                            'sticky top-0 z-10 grid h-(--density-panel-head) items-center gap-3 border-b border-border-strong bg-panel-ground px-(--density-panel-pad)',
                            TABLE_HEAD_TEXT,
                        ),
                        template,
                    )}
                >
                    {selectable && (
                        <span role="columnheader" className="flex items-center">
                            <Checkbox
                                aria-label={words.selectAll}
                                checked={all}
                                disabled={entries.length === 0}
                                onCheckedChange={() => onSelectedChange(all ? [] : entries.map((entry) => entry.id))}
                            />
                        </span>
                    )}
                    {header('name', words.name)}
                    {header('size', words.size, true)}
                    {header('modified', words.modified)}
                    {header('owner', words.owner)}
                </div>
                {entries.length === 0
                    ? (empty ?? <p className="px-(--density-panel-pad) py-3 text-sm text-muted-foreground">{words.empty}</p>)
                    : entries.map((entry) => {
                          const isChosen = chosen.has(entry.id)
                          const size = entry.size === undefined ? '' : formatSize(entry.size)
                          return (
                              <div
                                  key={entry.id}
                                  role="row"
                                  aria-selected={selectable ? isChosen : undefined}
                                  aria-current={entry.id === active || undefined}
                                  {...pressable(onOpen === undefined ? undefined : () => onOpen(entry))}
                                  className={cn(
                                      'grid min-h-(--density-row) items-center gap-3 border-b border-border px-(--density-panel-pad) py-1 text-sm last:border-b-0',
                                      template,
                                      onOpen !== undefined && 'cursor-pointer outline-none hover:bg-hover focus-visible:bg-hover',
                                      isChosen && 'bg-primary/8 hover:bg-primary/12',
                                      entry.id === active && 'bg-secondary',
                                  )}
                              >
                                  {selectable && (
                                      <span role="cell" className="flex items-center" onClick={(event) => event.stopPropagation()}>
                                          <Checkbox
                                              aria-label={`${words.select} ${entry.name}`}
                                              checked={isChosen}
                                              onCheckedChange={() => onSelectedChange(flip(selected, entry.id))}
                                          />
                                      </span>
                                  )}
                                  <span role="cell" className="flex min-w-0 items-center gap-2">
                                      <FileTypeIcon kind={entry.kind} />
                                      <span className="flex min-w-0 flex-col">
                                          <span className="truncate">{entry.name}</span>
                                          <span className="truncate text-xs text-muted-foreground @md:hidden">
                                              {[size, entry.modified].filter((part) => part !== '').join(' · ')}
                                          </span>
                                      </span>
                                  </span>
                                  <span role="cell" className="hidden truncate text-right text-muted-foreground tabular-nums @md:block">
                                      {size}
                                  </span>
                                  <span role="cell" className="hidden truncate text-muted-foreground tabular-nums @md:block">
                                      {entry.modified}
                                  </span>
                                  <span role="cell" className="hidden truncate text-muted-foreground @2xl:block">
                                      {entry.owner}
                                  </span>
                              </div>
                          )
                      })}
            </div>
        </div>
    )
}

/**
 * One file as a tile: its picture when it has one, its kind's icon on a wash when not, then the
 * name and the size. The checkbox in its corner shows on hover, on focus, and whenever anything
 * is selected, so a selection grows by pressing boxes rather than hunting for them.
 */
export function FileTile({
    entry,
    selected = false,
    onSelectedChange,
    selecting = false,
    active = false,
    onOpen,
    words: given,
}: {
    entry: FileEntry
    selected?: boolean
    /** Draws the checkbox; without it the tile has no selection. */
    onSelectedChange?: (selected: boolean) => void
    /** Whether anything in the grid is selected, which keeps every checkbox in view. */
    selecting?: boolean
    active?: boolean
    onOpen?: (entry: FileEntry) => void
    words?: Partial<Pick<FileListWords, 'select'>>
}) {
    const words = { ...WORDS, ...given }
    return (
        <div
            role="gridcell"
            aria-selected={onSelectedChange === undefined ? undefined : selected}
            aria-current={active || undefined}
            {...pressable(onOpen === undefined ? undefined : () => onOpen(entry))}
            className={cn(
                'group/tile relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-card text-sm outline-none',
                onOpen !== undefined && 'cursor-pointer hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring',
                selected && 'border-primary ring-1 ring-primary',
                active && !selected && 'border-border-strong ring-1 ring-border-strong',
            )}
        >
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                {entry.thumbnail !== undefined ? (
                    <img src={entry.thumbnail} alt="" className="size-full object-cover" draggable={false} />
                ) : (
                    <FileTypeIcon kind={entry.kind} className="size-9 stroke-[1.25]" />
                )}
            </div>
            <div className="flex min-w-0 items-center gap-1.5 border-t border-border px-2.5 py-2">
                <FileTypeIcon kind={entry.kind} className="size-3.5" />
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            </div>
            <div className="-mt-1.5 truncate px-2.5 pb-2 text-xs text-muted-foreground tabular-nums">
                {[entry.size === undefined ? '' : formatSize(entry.size), entry.modified].filter((part) => part !== '').join(' · ')}
            </div>
            {onSelectedChange !== undefined && (
                <span
                    className={cn(
                        'absolute top-2 left-2 flex rounded-[5px] bg-card/90 p-0.5 shadow-sm transition-opacity',
                        selected || selecting
                            ? 'opacity-100'
                            : 'opacity-0 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 pointer-coarse:opacity-100',
                    )}
                    onClick={(event) => event.stopPropagation()}
                >
                    <Checkbox
                        aria-label={`${words.select} ${entry.name}`}
                        checked={selected}
                        onCheckedChange={(checked) => onSelectedChange(checked)}
                    />
                </span>
            )}
        </div>
    )
}

/**
 * A folder's contents as tiles, as many to a row as the box holds: pictures for images, icons for
 * everything else. Selection and opening work as in `FileList`.
 */
export function FileGrid({
    entries,
    selected = [],
    onSelectedChange,
    active,
    onOpen,
    empty,
    minTile = '9.5rem',
    className,
    words: given,
}: {
    entries: readonly FileEntry[]
    selected?: readonly string[]
    onSelectedChange?: (ids: string[]) => void
    active?: string
    onOpen?: (entry: FileEntry) => void
    empty?: ReactNode
    /** The narrowest a tile gets before the row holds one fewer. */
    minTile?: string
    className?: string
    words?: Partial<FileListWords>
}) {
    const words = { ...WORDS, ...given }
    if (entries.length === 0) return <>{empty ?? <p className="py-3 text-sm text-muted-foreground">{words.empty}</p>}</>
    const chosen = new Set(selected)
    return (
        <div
            role="grid"
            className={cn('grid gap-3', className)}
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minTile}, 1fr))` }}
        >
            {entries.map((entry) => (
                <FileTile
                    key={entry.id}
                    entry={entry}
                    selected={chosen.has(entry.id)}
                    selecting={selected.length > 0}
                    onSelectedChange={onSelectedChange === undefined ? undefined : () => onSelectedChange(flip(selected, entry.id))}
                    active={entry.id === active}
                    onOpen={onOpen}
                    words={words}
                />
            ))}
        </div>
    )
}
