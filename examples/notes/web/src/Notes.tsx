import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { CommandPalette, type PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import type { DataAction } from '@winterop-com/sokkel-ui/DataTable'
import { useMedia } from '@winterop-com/sokkel-ui/hooks/use-mobile'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Search } from '@winterop-com/sokkel-ui/Search'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { keyLabels } from '@winterop-com/sokkel-ui/lib/keys'
import type { SearchResult } from '@winterop-com/sokkel-ui/lib/search'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import {
    CalendarDays,
    FilePlus,
    FileText,
    FolderInput,
    FolderPlus,
    Hash,
    Library,
    Network,
    PanelRight,
    Pencil,
    Search as SearchIcon,
    Settings,
    Trash2,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go, useOverlayRoute } from 'tidevann-shared/router'
import { Dialogs } from './Dialogs'
import { clock, day, wordCount } from './model'
import { NotePanel } from './NotePanel'
import { AllNotes } from './pages/AllNotes'
import { Daily } from './pages/Daily'
import { SearchPage, searchVault } from './pages/SearchPage'
import { Tags } from './pages/Tags'
import { useVault } from './state'
import { vaultTree } from './vault'

// The graph loads React Flow and elk the first time it is opened, and a note and settings the
// editor (CodeMirror), so the list a reader lands on carries none of them.
const GraphPage = lazy(() => import('./pages/Graph').then((module) => ({ default: module.GraphPage })))
const NotePage = lazy(() => import('./pages/NotePage').then((module) => ({ default: module.NotePage })))
const SettingsPage = lazy(() => import('./pages/Settings').then((module) => ({ default: module.SettingsPage })))

const PAGES = ['notes', 'folder', 'note', 'daily', 'tags', 'graph', 'search'] as const

/** Where the shell sets its panel as a column rather than a sheet over the content. */
const WIDE = '(min-width: 64rem)'

/** What the note or the folder a tree row stands for offers in its menu. */
function useRowActions(): (node: TreeNode) => DataAction[] {
    const { vault, ask, newNote, open } = useVault()
    return (node) => {
        if (node.id.startsWith('folder:')) {
            const id = node.id.slice('folder:'.length)
            return [
                { id: 'new-note', label: 'New note', icon: <FilePlus />, onSelect: () => newNote(id) },
                { id: 'new-folder', label: 'New folder', icon: <FolderPlus />, onSelect: () => ask({ kind: 'new-folder', parent: id }) },
                { id: 'line', separator: true },
                { id: 'rename', label: 'Rename', icon: <Pencil />, onSelect: () => ask({ kind: 'rename-folder', id }) },
                { id: 'move', label: 'Move to', icon: <FolderInput />, onSelect: () => ask({ kind: 'move-folder', id }) },
                { id: 'line-2', separator: true },
                { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => ask({ kind: 'delete-folder', id }) },
            ]
        }
        if (!vault.byId.has(node.id)) return []
        return [
            { id: 'open', label: 'Open', icon: <FileText />, onSelect: () => open(node.id) },
            { id: 'rename', label: 'Rename', icon: <Pencil />, onSelect: () => ask({ kind: 'rename-note', id: node.id }) },
            { id: 'move', label: 'Move to', icon: <FolderInput />, onSelect: () => ask({ kind: 'move-note', id: node.id }) },
            { id: 'line', separator: true },
            {
                id: 'delete',
                label: 'Delete',
                icon: <Trash2 />,
                destructive: true,
                onSelect: () => ask({ kind: 'delete-note', id: node.id }),
            },
        ]
    }
}

/** The notes app: the rail of places over the vault's tree, the page the route names, a note's links beside it, and the palettes. */
export function Notes({ frame }: { frame: Frame }) {
    const state = useVault()
    const { vault, prefs, setPrefs, open, openDay, newNote, ask, moveNote, moveFolder, save, drafts } = state
    const { settings: look, setSettings: setLook } = frame.appearance
    // Settings open as a dialog over the page they were opened from.
    const settings = useOverlayRoute(frame.route, 'settings', ['notes'])
    const [first = 'notes', second] = settings.route
    const page = (PAGES as readonly string[]).includes(first) ? first : 'missing'
    const [filter, setFilter] = useState('')
    const [switching, setSwitching] = useState(false)
    const [topQuery, setTopQuery] = useState('')
    const rowActions = useRowActions()
    // Wide, the panel is a column the reader keeps shown or hidden; narrow, it is a sheet opened for a moment.
    const wide = useMedia(WIDE, true)
    const [sheet, setSheet] = useState(false)
    const where = settings.route.join('/')
    useEffect(() => setSheet(false), [where])
    const panelShown = wide ? prefs.panel : sheet

    const noteId = page === 'note' ? second : undefined
    const note = noteId === undefined ? undefined : vault.byId.get(noteId)
    const folderId = page === 'folder' ? second : undefined
    const today = day(0)

    const entry = (id: string, label: string, icon: typeof FileText, href: string, count?: number) => ({
        id,
        label,
        icon,
        href,
        active: page === id || (id === 'notes' && (page === 'note' || page === 'folder')),
        ...(count === undefined ? {} : { count }),
    })
    const groups: RailGroup[] = [
        {
            id: 'vault',
            entries: [
                entry('notes', 'All notes', Library, '#/notes', vault.notes.length),
                entry('daily', 'Daily', CalendarDays, '#/daily'),
                entry('tags', 'Tags', Hash, '#/tags', vault.tagged.size),
                entry('graph', 'Graph', Network, '#/graph'),
                entry('search', 'Search', SearchIcon, '#/search'),
            ],
        },
        { id: 'system', title: 'System', entries: [entry('settings', 'Settings', Settings, '#/settings')] },
    ]

    const tree = useMemo(() => vaultTree(vault, prefs.dailyFolder), [vault, prefs.dailyFolder])
    const chosen = noteId ?? (folderId === undefined ? undefined : `folder:${folderId}`)

    const switcher = (title: string, ids: readonly string[]) => ({
        title,
        commands: ids.flatMap((id) => {
            const one = vault.byId.get(id)
            if (one === undefined) return []
            const where = vault.path(one.folder)
            return [
                {
                    id: `${title}-${one.id}`,
                    label: one.title,
                    icon: one.day === undefined ? FileText : CalendarDays,
                    ...(where === '' ? {} : { hint: where }),
                    keywords: vault.tagsOf.get(one.id) ?? [],
                    onSelect: () => open(one.id),
                },
            ]
        }),
    })
    const byTitle = useMemo(() => [...vault.notes].sort((a, b) => a.title.localeCompare(b.title)).map((one) => one.id), [vault.notes])

    const palette: PaletteGroup[] = [
        {
            title: 'Notes',
            rank: 1,
            commands: [
                { id: 'new-note', label: 'New note', icon: FilePlus, onSelect: () => newNote(note?.folder ?? null) },
                {
                    id: 'new-folder',
                    label: 'New folder',
                    icon: FolderPlus,
                    onSelect: () => ask({ kind: 'new-folder', parent: note?.folder ?? null }),
                },
                {
                    id: 'today',
                    label: "Open today's note",
                    icon: CalendarDays,
                    keywords: ['daily', 'journal'],
                    onSelect: () => openDay(today),
                },
                {
                    id: 'switch',
                    label: 'Open a note by name',
                    icon: FileText,
                    keys: keyLabels({ key: 'o', mod: true }),
                    onSelect: () => setSwitching(true),
                },
                {
                    id: 'panel',
                    label: panelShown ? 'Hide links and outline' : 'Show links and outline',
                    icon: PanelRight,
                    keywords: ['backlinks', 'outline', 'panel'],
                    onSelect: () => (wide ? void setPrefs({ panel: !prefs.panel }) : setSheet(!sheet)),
                },
            ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        { ...switcher('Recent', prefs.recent), rank: 4 },
        { ...switcher('All notes', byTitle), rank: 5 },
        ...frame.palette,
    ]

    useShortcuts(
        [
            {
                id: 'switch',
                key: 'o',
                mod: true,
                inFields: true,
                label: 'Open a note by name',
                group: 'Notes',
                run: () => setSwitching(true),
            },
            {
                id: 'today',
                key: 'd',
                mod: true,
                shift: true,
                inFields: true,
                label: "Open today's note",
                group: 'Notes',
                run: () => openDay(today),
            },
            {
                id: 'search',
                key: 'f',
                mod: true,
                shift: true,
                inFields: true,
                label: 'Search the vault',
                group: 'Notes',
                run: () => go('/search'),
            },
        ],
        [today, openDay],
    )

    const label =
        page === 'note'
            ? (note?.title ?? 'Not found')
            : page === 'folder'
              ? (vault.folderById.get(folderId ?? '')?.name ?? 'Not found')
              : ({
                    notes: 'All notes',
                    daily: 'Daily',
                    tags: 'Tags',
                    graph: 'Graph',
                    search: 'Search',
                    settings: 'Settings',
                    missing: 'Not found',
                }[page] ?? '')
    const trail: Crumb[] = [{ label: 'Notes', href: '#/notes' }]
    if (page === 'note' && note !== undefined && note.folder !== null)
        trail.push({ label: vault.path(note.folder), href: `#/folder/${note.folder}` })
    if (page === 'tags' && second !== undefined) trail.push({ label: 'Tags', href: '#/tags' }, { label: `#${decodeURIComponent(second)}` })
    else trail.push({ label })

    const words = note === undefined ? undefined : wordCount(note.body)
    const unsaved = Object.keys(drafts).length
    const saying =
        save.state === 'saving' || unsaved > 0
            ? 'Saving'
            : save.state === 'saved'
              ? `Saved at ${clock(save.at)}`
              : save.state === 'failed'
                ? `Not saved: ${save.reason}`
                : 'All changes saved'

    let content
    if (page === 'note')
        content =
            note === undefined ? (
                <Page>
                    <Gone what="note" />
                </Page>
            ) : (
                <NotePage note={note} />
            )
    else if (page === 'notes') content = <AllNotes />
    else if (page === 'folder')
        content = folderId !== undefined && vault.folderById.has(folderId) ? <AllNotes folder={folderId} /> : <Gone what="folder" />
    else if (page === 'daily') content = <Daily />
    else if (page === 'tags') content = <Tags tag={second === undefined ? undefined : decodeURIComponent(second)} />
    else if (page === 'graph') content = <GraphPage />
    else if (page === 'search') content = <SearchPage key={second ?? ''} query={second === undefined ? '' : decodeURIComponent(second)} />
    else content = <Gone what="page" />

    // A note fills the content edge to edge, and the graph lays out its own page.
    const bare = page === 'note' || page === 'graph'

    return (
        <Shell
            palette={palette}
            paletteFilter="terms"
            desktop={frame.desktop}
            route={settings.route.join('/')}
            shortcuts={[]}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/notes"
                    name="Notes"
                    groups={groups}
                    body={{
                        title: 'Vault',
                        search: (
                            <Row gap="2xs">
                                <SearchField value={filter} onChange={setFilter} placeholder="Filter" className="min-w-0 flex-1" />
                                <IconButton label="New note" onClick={() => newNote(note?.folder ?? null)}>
                                    <FilePlus />
                                </IconButton>
                                <IconButton label="New folder" onClick={() => ask({ kind: 'new-folder', parent: null })}>
                                    <FolderPlus />
                                </IconButton>
                            </Row>
                        ),
                        content: (
                            <Tree
                                label="Vault"
                                nodes={tree}
                                query={filter}
                                selected={chosen === undefined ? [] : [chosen]}
                                onSelect={([id]) => {
                                    if (id === undefined) return
                                    if (id.startsWith('folder:')) go(`/folder/${id.slice('folder:'.length)}`)
                                    else open(id)
                                }}
                                defaultExpanded={['folder:runbooks', 'folder:jobs']}
                                actions={rowActions}
                                onMove={(id, into) => {
                                    const target = into === null ? null : into.slice('folder:'.length)
                                    if (id.startsWith('folder:')) void moveFolder(id.slice('folder:'.length), target)
                                    else void moveNote(id, target)
                                }}
                                canMove={(id, into) => {
                                    if (into !== null && !into.startsWith('folder:')) return false
                                    // The vault sorts each folder by name, so only a move to another folder changes anything.
                                    const from = id.startsWith('folder:')
                                        ? vault.folderById.get(id.slice('folder:'.length))?.parent
                                        : vault.byId.get(id)?.folder
                                    return from !== (into === null ? null : into.slice('folder:'.length))
                                }}
                            />
                        ),
                    }}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            onSettings={() => go('/settings')}
                            scheme={look.scheme}
                            onSchemeChange={(scheme) => setLook({ ...look, scheme })}
                            onSignOut={() => go('/notes')}
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    search={
                        <Search
                            query={topQuery}
                            onQueryChange={setTopQuery}
                            search={(query) =>
                                searchVault(vault, query, {}).groups.map((group) => ({ ...group, results: group.results.slice(0, 6) }))
                            }
                            onOpen={(result) => {
                                setTopQuery('')
                                open(result.id)
                            }}
                            onSeeAll={(query) => {
                                setTopQuery('')
                                go(`/search/${encodeURIComponent(query)}`)
                            }}
                            renderPreview={(result: SearchResult) => {
                                const found = vault.byId.get(result.id)
                                return found === undefined ? null : <Markdown content={found.body} scale="document" />
                            }}
                            words={{ placeholder: 'Search notes' }}
                        />
                    }
                    actions={
                        <>
                            <IconButton label="New note" onClick={() => newNote(note?.folder ?? null)}>
                                <FilePlus />
                            </IconButton>
                        </>
                    }
                />
            }
            foot={
                <StatusLine note={saying} tone={save.state === 'failed' ? 'warn' : undefined} live={save.state === 'saving'}>
                    {words !== undefined && <StatusItem label="words">{words}</StatusItem>}
                    {note !== undefined && <StatusItem label="links in">{vault.backlinks.get(note.id)?.length ?? 0}</StatusItem>}
                    <StatusItem label="notes">{vault.notes.length}</StatusItem>
                </StatusLine>
            }
            panel={note === undefined ? undefined : <NotePanel note={note} />}
            panelOpen={panelShown}
            onPanelOpenChange={(panel) => (wide ? void setPrefs({ panel }) : setSheet(panel))}
        >
            <Suspense fallback={null}>{bare ? content : <Page>{content}</Page>}</Suspense>
            {settings.open && (
                <Suspense fallback={null}>
                    <SettingsPage frame={frame} open onClose={settings.close} />
                </Suspense>
            )}
            <Dialogs />
            <CommandPalette
                open={switching}
                onOpenChange={setSwitching}
                filter="terms"
                groups={[{ ...switcher('Recent', prefs.recent) }, { ...switcher('Notes', byTitle) }]}
                search={{
                    search: (query) => {
                        const typed = query.trim()
                        if (typed === '' || vault.resolve(typed) !== undefined) return []
                        return [
                            {
                                kind: 'create',
                                title: 'Make',
                                results: [{ id: typed, title: `Make ${typed}`, icon: FilePlus, detail: 'A new note by that name' }],
                            },
                        ]
                    },
                    onOpen: (result) =>
                        void state.createNote({ title: result.id, folder: note?.folder ?? null }).then((made) => open(made.id)),
                }}
                words={{ placeholder: 'Open a note by name', empty: 'No note is named that.', title: 'Open a note' }}
                foot={{ mark: <TidevannMark />, name: 'Notes', keys: keyLabels({ key: 'o', mod: true }) }}
            />
        </Shell>
    )
}

/** A page for an address that leads nowhere: a note or a folder deleted since, or a mistyped one. */
function Gone({ what }: { what: string }) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>No {what} here</EmptyTitle>
                <EmptyDescription>It was deleted, or the address is wrong.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={() => go('/notes')}>
                All notes
            </Button>
        </Empty>
    )
}
