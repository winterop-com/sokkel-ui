import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { CommandPalette, type PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import type { DataAction } from '@winterop-com/sokkel-ui/DataTable'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { useUnsavedChanges } from '@winterop-com/sokkel-ui/UnsavedChanges'
import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { keyLabels } from '@winterop-com/sokkel-ui/lib/keys'
import { STATUS_CSS } from '@winterop-com/sokkel-ui/lib/status'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { FileCode, FilePlus, FolderInput, FolderOpen, History, Pencil, Save, Settings as SettingsIcon, Sheet, SquareTerminal, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go, useOverlayRoute } from 'tidevann-shared/router'
import { Dialogs } from './Dialogs'
import { clock, counted, kindOf, KINDS, PROJECTS, type FileKind, type Project, type WorkFile } from './model'
import { RunPage, RunsPage } from './pages/Runs'
import { WorkArea } from './pages/WorkArea'
import { Settings } from './Settings'
import { tabHref, useStudio } from './state'
import { tablesWith } from './tables'

/** The rail's tree: each project's files by kind, then the tables a query reads. */
function workspaceTree(files: readonly WorkFile[], dirty: ReadonlySet<string>, tables: readonly { name: string; rows: readonly unknown[] }[]): TreeNode[] {
    return [
        ...PROJECTS.map(
            (project): TreeNode => ({
                id: `project:${project}`,
                label: project,
                icon: FolderOpen,
                children: KINDS.map((kind) => ({
                    id: `group:${project}:${kind.kind}`,
                    label: kind.plural,
                    children: files
                        .filter((file) => file.project === project && file.kind === kind.kind)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((file) => ({
                            id: file.id,
                            label: file.name,
                            icon: kind.icon,
                            ...(dirty.has(file.id) ? { meta: <Dot color={STATUS_CSS.warning} size="sm" label="Not saved" /> } : {}),
                        })),
                })),
            }),
        ),
        {
            id: 'tables',
            label: 'Tables',
            icon: SquareTerminal,
            children: tables.map((table) => ({
                id: `table:${table.name}`,
                label: table.name,
                icon: Sheet,
                meta: table.rows.length.toLocaleString('en-US'),
            })),
        },
    ]
}

/** The project and kind a tree row stands for, when it is a project or one of its groups. */
function placeOf(id: string): { project: Project; kind?: FileKind } | undefined {
    const [what, project, kind] = id.split(':')
    if ((what !== 'project' && what !== 'group') || !PROJECTS.includes(project as Project)) return undefined
    return { project: project as Project, ...(kind === undefined ? {} : { kind: kind as FileKind }) }
}

/** The studio: the rail of places over the workspace's tree, the page the route names, the palettes and the dialogs. */
export function Studio({ frame }: { frame: Frame }) {
    const state = useStudio()
    const { files, byId, runs, prefs, dirty, saving, open, ask, saveAll, moveFile } = state
    const { settings: look, setSettings: setLook } = frame.appearance
    const settings = useOverlayRoute(frame.route, 'settings')
    const [first, second] = settings.route
    const [filter, setFilter] = useState('')
    const [switching, setSwitching] = useState(false)
    const tables = useMemo(() => tablesWith(runs), [runs])
    const guard = useUnsavedChanges(dirty.size > 0)

    // The workspace's own address opens the tab last shown.
    useEffect(() => {
        if (first === undefined && prefs.active !== null && !state.loading) window.location.replace(`#${tabHref(prefs.active)}`)
    }, [first, prefs.active, state.loading])

    const page = first === 'file' || first === 'table' ? 'work' : first === 'runs' ? (second === undefined ? 'runs' : 'run') : first === undefined ? 'home' : 'missing'
    const tab = first === 'table' ? `table:${second ?? ''}` : (second ?? '')
    const file = first === 'file' ? byId.get(second ?? '') : undefined
    const going = runs.filter((run) => run.state === 'running').length

    const groups: RailGroup[] = [
        {
            id: 'studio',
            entries: [
                { id: 'workspace', label: 'Workspace', icon: FileCode, href: '#/', active: page === 'work' || page === 'home' },
                { id: 'runs', label: 'Runs', icon: History, href: '#/runs', active: page === 'runs' || page === 'run', count: runs.length },
            ],
        },
        { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: SettingsIcon, href: '#/settings' }] },
    ]

    const tree = useMemo(() => workspaceTree(files, dirty, tables), [files, dirty, tables])

    const rowActions = (node: TreeNode): DataAction[] => {
        const place = placeOf(node.id)
        if (place !== undefined)
            return (place.kind === undefined ? KINDS : KINDS.filter((kind) => kind.kind === place.kind)).map((kind) => ({
                id: `new-${kind.kind}`,
                label: `New ${kind.label.toLowerCase()}`,
                icon: <kind.icon />,
                onSelect: () => ask({ kind: 'new', project: place.project, fileKind: kind.kind }),
            }))
        if (node.id.startsWith('table:')) return [{ id: 'open', label: 'Open', icon: <Sheet />, onSelect: () => open(node.id) }]
        const one = byId.get(node.id)
        if (one === undefined) return []
        return [
            { id: 'open', label: 'Open', icon: <FileCode />, onSelect: () => open(one.id) },
            { id: 'rename', label: 'Rename', icon: <Pencil />, onSelect: () => ask({ kind: 'rename', id: one.id }) },
            ...(dirty.has(one.id)
                ? [{ id: 'save', label: 'Save', icon: <Save />, onSelect: () => void state.save(one.id) }]
                : []),
            { id: 'line', separator: true as const },
            ...PROJECTS.filter((project) => project !== one.project).map((project) => ({
                id: `move-${project}`,
                label: `Move to ${project}`,
                icon: <FolderInput />,
                onSelect: () => void moveFile(one.id, project),
            })),
            { id: 'line-2', separator: true as const },
            { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => ask({ kind: 'delete', id: one.id }) },
        ]
    }

    const fileCommands = (title: string, list: readonly WorkFile[], rank?: number): PaletteGroup => ({
        title,
        ...(rank === undefined ? {} : { rank }),
        commands: list.map((one) => ({
            id: `${title}-${one.id}`,
            label: one.name,
            icon: kindOf(one.kind).icon,
            hint: one.project,
            keywords: [one.project, one.kind],
            onSelect: () => open(one.id),
        })),
    })
    const byName = useMemo(() => [...files].sort((a, b) => a.name.localeCompare(b.name)), [files])
    const openTabs = prefs.tabs.flatMap((id) => byId.get(id) ?? [])
    const project = file?.project ?? 'harbor'

    const palette: PaletteGroup[] = [
        {
            title: 'Studio',
            rank: 1,
            commands: [
                {
                    id: 'open-file',
                    label: 'Open a file',
                    icon: FolderOpen,
                    keys: keyLabels({ key: 'p', mod: true }),
                    onSelect: () => setSwitching(true),
                },
                ...KINDS.map((kind) => ({
                    id: `new-${kind.kind}`,
                    label: `New ${kind.label.toLowerCase()}`,
                    icon: FilePlus,
                    keywords: ['make', 'create', kind.extension],
                    onSelect: () => ask({ kind: 'new', project, fileKind: kind.kind }),
                })),
                {
                    id: 'save-all',
                    label: 'Save all',
                    icon: Save,
                    keys: keyLabels({ key: 's', mod: true, shift: true }),
                    disabled: dirty.size === 0 ? 'No changes to save.' : false,
                    onSelect: () => void saveAll(),
                },
            ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        fileCommands('Files', byName, 5),
        {
            title: 'Tables',
            rank: 6,
            commands: tables.map((table) => ({
                id: `table-${table.name}`,
                label: table.name,
                icon: Sheet,
                hint: `${counted(table.rows.length, 'row')}`,
                keywords: ['table', 'sql'],
                onSelect: () => open(`table:${table.name}`),
            })),
        },
        ...frame.palette,
    ]

    useShortcuts(
        [
            { id: 'open-file', key: 'p', mod: true, inFields: true, label: 'Open a file', group: 'Studio', run: () => setSwitching(true) },
            { id: 'save-all', key: 's', mod: true, shift: true, inFields: true, label: 'Save all', group: 'Studio', run: () => void saveAll() },
        ],
        [saveAll],
    )

    const trail: Crumb[] = []
    if (page === 'work' && file !== undefined) trail.push({ label: file.project }, { label: kindOf(file.kind).plural }, { label: file.name, code: true })
    else if (page === 'work' && first === 'table') trail.push({ label: 'Tables' }, { label: second ?? '', code: true })
    else if (page === 'runs' || page === 'run') {
        const run = runs.find((one) => one.id === second)
        trail.push({ label: 'Runs', href: '#/runs' }, ...(run === undefined ? [] : [{ label: `Run ${String(run.number)}` }]))
    } else trail.push({ label: 'Workspace' })

    const saying =
        saving.state === 'saving'
            ? 'Saving'
            : saving.state === 'failed'
              ? `Not saved: ${saving.reason}`
              : dirty.size > 0
                ? `${counted(dirty.size, 'file')} not saved`
                : saving.state === 'saved'
                  ? `Saved at ${clock(saving.at)}`
                  : 'All changes saved'

    let content
    if (page === 'work') content = <WorkArea tab={tab} />
    else if (page === 'runs')
        content = (
            <Page className="h-full min-h-0">
                <RunsPage />
            </Page>
        )
    else if (page === 'run')
        content = (
            <Page className="h-full min-h-0">
                <RunPage id={second ?? ''} />
            </Page>
        )
    else
        content = (
            <Page className="h-full min-h-0">
                {page === 'home' ? <Home onOpen={() => setSwitching(true)} /> : <Gone />}
            </Page>
        )

    return (
        <Shell
            palette={palette}
            paletteFilter="terms"
            desktop={frame.desktop}
            route={settings.route.join('/')}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/"
                    name="Studio"
                    groups={groups}
                    body={{
                        title: 'Workspace',
                        search: (
                            <Row gap="2xs">
                                <SearchField value={filter} onChange={setFilter} placeholder="Filter" className="min-w-0 flex-1" />
                                <IconButton label="New file" onClick={() => ask({ kind: 'new', project, fileKind: file?.kind ?? 'pipeline' })}>
                                    <FilePlus />
                                </IconButton>
                            </Row>
                        ),
                        content: (
                            <Tree
                                label="Workspace"
                                nodes={tree}
                                query={filter}
                                selected={page === 'work' ? [tab] : []}
                                onSelect={([id]) => {
                                    if (id === undefined || placeOf(id) !== undefined || id === 'tables') return
                                    open(id)
                                }}
                                defaultExpanded={[
                                    'project:harbor',
                                    'group:harbor:pipeline',
                                    'group:harbor:schema',
                                    'group:harbor:query',
                                    ...(file === undefined ? [] : [`project:${file.project}`, `group:${file.project}:${file.kind}`]),
                                ]}
                                actions={rowActions}
                                onMove={(id, into) => {
                                    const place = into === null ? undefined : placeOf(into)
                                    if (place !== undefined) void moveFile(id, place.project)
                                }}
                                canMove={(id, into) => {
                                    const moving = byId.get(id)
                                    const place = into === null ? undefined : placeOf(into)
                                    return (
                                        moving !== undefined &&
                                        place !== undefined &&
                                        place.project !== moving.project &&
                                        (place.kind === undefined || place.kind === moving.kind)
                                    )
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
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    actions={
                        <>
                            <IconButton label="Save all" disabled={dirty.size === 0} onClick={() => void saveAll()}>
                                <Save />
                            </IconButton>
                            <IconButton label="New file" onClick={() => ask({ kind: 'new', project, fileKind: file?.kind ?? 'pipeline' })}>
                                <FilePlus />
                            </IconButton>
                        </>
                    }
                />
            }
            foot={
                <StatusLine note={saying} tone={saving.state === 'failed' ? 'warn' : undefined} live={saving.state === 'saving' || going > 0}>
                    {going > 0 && <StatusItem label="running">{going}</StatusItem>}
                    {openTabs.length > 0 && <StatusItem label="open">{openTabs.length}</StatusItem>}
                    <StatusItem label="files">{files.length}</StatusItem>
                </StatusLine>
            }
        >
            {content}
            {settings.open && <Settings frame={frame} open onClose={settings.close} />}
            <Dialogs />
            {guard.dialog}
            <CommandPalette
                open={switching}
                onOpenChange={setSwitching}
                filter="terms"
                groups={[...(openTabs.length === 0 ? [] : [fileCommands('Open', openTabs)]), fileCommands('Files', byName)]}
                words={{ placeholder: 'Open a file by name', empty: 'No file is named that.', title: 'Open a file' }}
                foot={{ mark: <TidevannMark />, name: 'Studio', keys: keyLabels({ key: 'p', mod: true }) }}
            />
        </Shell>
    )

}

/** The workspace with no tab open: a way to open a file or make one. */
function Home({ onOpen }: { onOpen: () => void }) {
    const { ask } = useStudio()
    return (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>No file open</EmptyTitle>
                <EmptyDescription>Open a pipeline, a schema or a query from the workspace, or make a new one.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Row gap="xs" justify="center" wrap>
                    <Button size="sm" onClick={onOpen}>
                        <FolderOpen aria-hidden />
                        Open a file
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => ask({ kind: 'new', project: 'harbor', fileKind: 'pipeline' })}>
                        <FilePlus aria-hidden />
                        New pipeline
                    </Button>
                </Row>
            </EmptyContent>
        </Empty>
    )
}

/** A page for an address that leads nowhere. */
function Gone() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>Nothing here</EmptyTitle>
                <EmptyDescription>The address is wrong, or what it named was deleted.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={() => go('/')}>
                Back to the workspace
            </Button>
        </Empty>
    )
}
