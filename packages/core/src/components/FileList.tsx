import { File, FileArchive, FileBraces, FileCode, FileImage, FileSpreadsheet, FileText, Folder, type LucideIcon } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { DataTable, type DataColumn, type DataSort } from './DataTable'
import type { DragData } from './DragDrop'
import { DRAG_GROUP, DragSource, DragSourceGrip, GRIP_ON_HOVER, type DragSourceState } from './DragSource'
import { Checkbox } from './ui/checkbox'

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
    /** A tile's grip, with `dragKind`: what the keyboard picks the file up by. */
    drag: (name: string) => string
}

const WORDS: FileListWords = {
    name: 'Name',
    size: 'Size',
    modified: 'Modified',
    owner: 'Owner',
    selectAll: 'Select all',
    select: 'Select',
    empty: 'This folder is empty.',
    drag: (name) => `Drag ${name}`,
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

export interface FileTypeIconProps {
    kind: FileKind
    className?: string
}

/** The icon of a file's kind, in that kind's color. */
export function FileTypeIcon({ kind, className }: FileTypeIconProps) {
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

export interface FileListProps {
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
    /**
     * Puts the rows in the reader's order: each row dragged by the grip at its start, a line
     * showing where it lands, and Alt (Option) with the up and down arrows moving the active row.
     * Hears where the entry at `from` goes, both places among `entries`; the rows reorder only
     * while they are not sorted.
     */
    onReorder?: (from: number, to: number) => void
    /** What a row is called by its grip and to a screen reader as it moves; its name without it. */
    rowLabel?: (entry: FileEntry) => string
    /**
     * What a target elsewhere on the page, such as a tree's folders, takes the rows as, each
     * carrying its entry as `row`; given, the rows drag out by their grips whether or not they
     * reorder here.
     */
    dragKind?: string
    className?: string
    words?: Partial<FileListWords>
}

/**
 * A folder's contents as rows of a `DataTable` list: a checkbox, the name with its kind's icon, the
 * size, when it changed, and who owns it. A column header sorts by that column and a second press
 * reverses it; the app orders the entries (`sortFiles` keeps folders above files whichever way it
 * sorts). A press on a row opens it (`onOpen`), the checkbox adds it to the selection, and the
 * head's checkbox selects or clears every row.
 *
 * On a narrow box each row is its name over a quiet line of its size and time, so a listing beside
 * an open panel or on a phone still reads.
 *
 * With `onReorder` the folder is in the reader's order, its rows dragged by their grips, and with
 * `dragKind` its rows drag out to targets elsewhere on the page, such as a tree's folders, as
 * `DataTable`'s do.
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
    onReorder,
    rowLabel = (entry) => entry.name,
    dragKind,
    className,
    words: given,
}: FileListProps) {
    const words = { ...WORDS, ...given }
    // A column sorts from its head only when the app hears it; the app orders the entries, folders first.
    const sortable = (value: (entry: FileEntry) => string | number) => (onSortChange === undefined ? {} : { sortValue: value })
    const columns: DataColumn<FileEntry>[] = [
        {
            ...sortable((entry) => entry.name),
            id: 'name',
            header: words.name,
            width: 'minmax(12rem,1fr)',
            hideable: false,
            cell: (entry) => (
                <span className="flex min-w-0 items-center gap-2">
                    <FileTypeIcon kind={entry.kind} />
                    <span className="truncate">{entry.name}</span>
                </span>
            ),
        },
        {
            ...sortable((entry) => entry.size ?? 0),
            id: 'size',
            header: words.size,
            width: '5.5rem',
            align: 'end',
            stack: 'secondary',
            cell: (entry) => (entry.size === undefined ? null : <span className="text-muted-foreground">{formatSize(entry.size)}</span>),
        },
        {
            ...sortable((entry) => entry.modifiedAt ?? entry.modified),
            id: 'modified',
            header: words.modified,
            width: '9rem',
            stack: 'secondary',
            cell: (entry) => <span className="text-muted-foreground tabular-nums">{entry.modified}</span>,
        },
        {
            ...sortable((entry) => entry.owner ?? ''),
            id: 'owner',
            header: words.owner,
            width: '6.5rem',
            stack: 'none',
            cell: (entry) => (entry.owner === undefined ? null : <span className="text-muted-foreground">{entry.owner}</span>),
        },
    ]
    /** A press on a head: the other way round on the sorted column, else that column's own first way. */
    const changeSort = (next: DataSort | null) => {
        if (onSortChange === undefined) return
        const key = (next?.column ?? sort?.key ?? 'name') as FileSortKey
        const flipped = sort?.key === key ? (sort.direction === 'asc' ? 'desc' : 'asc') : undefined
        onSortChange({ key, direction: flipped ?? (key === 'name' || key === 'owner' ? 'asc' : 'desc') })
    }
    return (
        <DataTable
            columns={columns}
            rows={entries}
            rowKey={(entry) => entry.id}
            variant="list"
            stackLayout="compact"
            sort={sort === undefined ? null : { column: sort.key, direction: sort.direction }}
            onSortChange={changeSort}
            manualSort
            selectable={onSelectedChange !== undefined}
            selection={new Set(selected)}
            onSelectionChange={(next) => onSelectedChange?.([...next])}
            onOpen={onOpen}
            opened={active === undefined ? undefined : (entry) => entry.id === active}
            onReorder={onReorder}
            rowLabel={rowLabel}
            dragKind={dragKind}
            empty={empty ?? words.empty}
            words={{ selectAll: words.selectAll, selectRow: words.select, empty: words.empty }}
            className={className}
        />
    )
}

export interface FileTileProps {
    entry: FileEntry
    selected?: boolean
    /** Draws the checkbox; without it the tile has no selection. */
    onSelectedChange?: (selected: boolean) => void
    /** Whether anything in the grid is selected, which keeps every checkbox in view. */
    selecting?: boolean
    active?: boolean
    onOpen?: (entry: FileEntry) => void
    /** What the tile carries when it is dragged to a target elsewhere on the page; it does not drag without it. */
    drag?: DragData
    words?: Partial<Pick<FileListWords, 'select' | 'drag'>>
}

/**
 * One file as a tile: its picture when it has one, its kind's icon on a wash when not, then the
 * name and the size. The checkbox in its corner shows on hover, on focus, and whenever anything
 * is selected, so a selection grows by pressing boxes rather than hunting for them. With `drag`
 * the tile drags as a whole to a target elsewhere on the page, and from the keyboard by the grip
 * in its corner, shown on hover or focus.
 */
export function FileTile({
    entry,
    selected = false,
    onSelectedChange,
    selecting = false,
    active = false,
    onOpen,
    drag,
    words: given,
}: FileTileProps) {
    const words = { ...WORDS, ...given }
    return (
        <DragSource drag={drag === undefined ? undefined : { compact: true, ...drag }}>
            {(source) => (
                <TileFace
                    entry={entry}
                    selected={selected}
                    onSelectedChange={onSelectedChange}
                    selecting={selecting}
                    active={active}
                    onOpen={onOpen}
                    source={source}
                    words={words}
                />
            )}
        </DragSource>
    )
}

function TileFace({
    entry,
    selected,
    onSelectedChange,
    selecting,
    active,
    onOpen,
    source,
    words,
}: Required<Pick<FileTileProps, 'entry' | 'selected' | 'selecting' | 'active'>> &
    Pick<FileTileProps, 'onSelectedChange' | 'onOpen'> & { source: DragSourceState; words: FileListWords }) {
    return (
        <div
            ref={source.ref}
            {...source.press}
            role="gridcell"
            aria-selected={onSelectedChange === undefined ? undefined : selected}
            aria-current={active || undefined}
            data-dragging={source.dragging || undefined}
            {...pressable(onOpen === undefined ? undefined : () => onOpen(entry))}
            className={cn(
                'group/tile relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-card text-sm outline-none',
                onOpen !== undefined && 'cursor-pointer hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring',
                selected && 'border-primary ring-1 ring-primary',
                active && !selected && 'border-border-strong ring-1 ring-border-strong',
                source.enabled && DRAG_GROUP,
                source.dragging && 'opacity-40',
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
                        'absolute top-2 left-2 flex rounded-md bg-card/90 p-0.5 shadow-sm transition-opacity',
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
            {source.enabled && (
                <span
                    className={cn('absolute top-2 right-2 flex rounded-md bg-card/90 shadow-sm', GRIP_ON_HOVER)}
                    onClick={(event) => event.stopPropagation()}
                >
                    <DragSourceGrip source={source} size="icon-xs" label={words.drag(entry.name)} />
                </span>
            )}
        </div>
    )
}

export interface FileGridProps {
    entries: readonly FileEntry[]
    selected?: readonly string[]
    onSelectedChange?: (ids: string[]) => void
    active?: string
    onOpen?: (entry: FileEntry) => void
    empty?: ReactNode
    /** The narrowest a tile gets before the row holds one fewer. */
    minTile?: string
    /**
     * What a target elsewhere on the page, such as a tree's folders, takes the tiles as, each
     * carrying its entry as `row`, as `FileList`'s rows do; given, a tile drags out as a whole, and
     * from the keyboard by the grip in its corner.
     */
    dragKind?: string
    /** What a tile is called to a screen reader as it moves; its name without it. */
    rowLabel?: (entry: FileEntry) => string
    className?: string
    words?: Partial<FileListWords>
}

/**
 * A folder's contents as tiles, as many to a row as the box holds: pictures for images, icons for
 * everything else. Selection and opening work as in `FileList`, and with `dragKind` a tile drags to
 * a target elsewhere on the page.
 */
export function FileGrid({
    entries,
    selected = [],
    onSelectedChange,
    active,
    onOpen,
    empty,
    minTile = '9.5rem',
    dragKind,
    rowLabel = (entry) => entry.name,
    className,
    words: given,
}: FileGridProps) {
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
                    drag={dragKind === undefined ? undefined : { kind: dragKind, label: rowLabel(entry), value: { row: entry } }}
                    words={words}
                />
            ))}
        </div>
    )
}
