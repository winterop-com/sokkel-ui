import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    BookOpen,
    Download,
    FolderInput,
    FolderOpen,
    FolderPlus,
    FolderTree,
    LayoutDashboard,
    Pencil,
    Play,
    Settings,
    Trash2,
    Upload as UploadIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { type DataColumn, DataTable, findInTree } from '@winterop-com/sokkel-ui/DataTable'
import { DownloadButton, type DownloadState } from '@winterop-com/sokkel-ui/DownloadButton'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { ConfirmDialog, DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { FileGrid, FileList, FileTypeIcon, formatSize, sortFiles, type FileEntry, type FileSort } from '@winterop-com/sokkel-ui/FileList'
import { FilePreview } from '@winterop-com/sokkel-ui/FilePreview'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SelectionBar } from '@winterop-com/sokkel-ui/SelectionBar'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { DropZone, UploadTray, type Upload } from '@winterop-com/sokkel-ui/UploadTray'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { CHART, FIELD, HARBOR_DUSK, LIGHTHOUSE, PINES } from '../fixtures/photos'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'

/**
 * A file browser for a project's stored data in the library's frame: the folder tree beside the
 * listing, the trail to the folder in the top bar, rows or tiles, a selection with its actions,
 * the chosen file previewed in the side panel, uploads in a tray over the corner, and an empty
 * folder that asks for files.
 */
const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'files', label: 'Files', icon: FolderTree, href: '#', active: true },
            { id: 'docs', label: 'Docs', icon: BookOpen, href: '#' },
        ],
    },
    { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#' }] },
]

const FOLDERS: TreeNode[] = [
    {
        id: 'harbor',
        label: 'harbor',
        children: [
            {
                id: 'harbor/exports',
                label: 'exports',
                children: [
                    { id: 'harbor/exports/2026-10', label: '2026-10' },
                    { id: 'harbor/exports/2026-11', label: '2026-11' },
                ],
            },
            { id: 'harbor/imports', label: 'imports', children: [{ id: 'harbor/imports/orders', label: 'orders' }] },
            {
                id: 'harbor/shared',
                label: 'shared',
                children: [
                    { id: 'harbor/shared/review', label: 'review' },
                    { id: 'harbor/shared/archive', label: 'archive' },
                ],
            },
        ],
    },
    { id: 'juniper', label: 'juniper', children: [{ id: 'juniper/exports', label: 'exports' }] },
    { id: 'larkspur', label: 'larkspur', children: [{ id: 'larkspur/exports', label: 'exports' }] },
]

const ORDERS_CSV = `order_id,site,amount,currency,status
10421,Oslo,184.50,EUR,succeeded
10422,Lisbon,72.00,EUR,succeeded
10423,Bergen,1290.00,EUR,failed
10424,Porto,45.90,EUR,succeeded
10425,Tromsø,310.25,EUR,succeeded
10426,Reykjavík,88.10,EUR,queued
10427,Oslo,402.75,EUR,succeeded
10428,Trondheim,19.99,EUR,cancelled
10429,Lisbon,640.00,EUR,succeeded
10430,Porto,233.40,EUR,succeeded
10431,Bergen,97.60,EUR,succeeded
10432,Oslo,1504.00,EUR,succeeded
10433,Lisbon,12.30,EUR,failed
10434,Tromsø,58.00,EUR,succeeded
`

const SUMMARY_JSON = JSON.stringify(
    {
        job: 'nightly-export',
        run: 'r-2041',
        state: 'succeeded',
        started: '2026-11-04T02:00:00Z',
        steps: [
            { name: 'fetch', rows: 2184, duration_ms: 912 },
            { name: 'transform', rows: 2184, duration_ms: 1281 },
            { name: 'validate', rows: 2147, rejected: 37, duration_ms: 1943 },
            { name: 'upload', duration_ms: 604 },
        ],
        output: { host: 'files.example.org', path: '/harbor/exports/2026-11/orders-2026-11-04.csv', size_bytes: 48210 },
    },
    null,
    4,
)

const README = `# Review, November

Files collected for the monthly review of the harbor project.

- orders exports from nightly-export, one per day
- the run summary of the last run
- site photos from the visits in Oslo and Bergen

Questions go to grace.
`

const SCHEDULE_YAML = `job: sync-inventory
schedule: "0 */4 * * *"
steps:
  - fetch:
      url: https://api.example.org/inventory
  - transform: {}
  - upload:
      host: files.example.org
notify:
  - margaret
`

/** Every file of the review folder, with what its preview needs. */
interface StoredFile extends FileEntry {
    src?: string
    text?: string
}

const REVIEW: StoredFile[] = [
    { id: 'rejected', name: 'rejected', kind: 'folder', modified: 'Nov 4, 02:01', modifiedAt: '2026-11-04T02:01', owner: 'ada' },
    { id: 'raw', name: 'raw', kind: 'folder', modified: 'Nov 1, 09:12', modifiedAt: '2026-11-01T09:12', owner: 'grace' },
    {
        id: 'orders-04',
        name: 'orders-2026-11-04.csv',
        kind: 'table',
        size: 48_210,
        modified: 'Nov 4, 02:00',
        modifiedAt: '2026-11-04T02:00',
        owner: 'ada',
        text: ORDERS_CSV,
    },
    {
        id: 'orders-03',
        name: 'orders-2026-11-03.csv',
        kind: 'table',
        size: 46_880,
        modified: 'Nov 3, 02:00',
        modifiedAt: '2026-11-03T02:00',
        owner: 'ada',
        text: ORDERS_CSV,
    },
    {
        id: 'summary',
        name: 'run-summary.json',
        kind: 'json',
        size: 1_204,
        modified: 'Nov 4, 02:01',
        modifiedAt: '2026-11-04T02:01',
        owner: 'linus',
        text: SUMMARY_JSON,
    },
    {
        id: 'dusk',
        name: 'harbor-at-dusk.png',
        kind: 'image',
        size: 2_840_000,
        modified: 'Nov 2, 18:44',
        modifiedAt: '2026-11-02T18:44',
        owner: 'grace',
        thumbnail: HARBOR_DUSK,
        src: HARBOR_DUSK,
    },
    {
        id: 'lighthouse',
        name: 'site-bergen.jpg',
        kind: 'image',
        size: 3_120_000,
        modified: 'Nov 2, 11:20',
        modifiedAt: '2026-11-02T11:20',
        owner: 'grace',
        thumbnail: LIGHTHOUSE,
        src: LIGHTHOUSE,
    },
    {
        id: 'pines',
        name: 'site-oslo.jpg',
        kind: 'image',
        size: 2_610_000,
        modified: 'Oct 30, 15:02',
        modifiedAt: '2026-10-30T15:02',
        owner: 'margaret',
        thumbnail: PINES,
        src: PINES,
    },
    {
        id: 'field',
        name: 'site-porto.jpg',
        kind: 'image',
        size: 1_980_000,
        modified: 'Oct 28, 10:37',
        modifiedAt: '2026-10-28T10:37',
        owner: 'margaret',
        thumbnail: FIELD,
        src: FIELD,
    },
    {
        id: 'chart',
        name: 'throughput.png',
        kind: 'image',
        size: 184_000,
        modified: 'Nov 4, 08:15',
        modifiedAt: '2026-11-04T08:15',
        owner: 'linus',
        thumbnail: CHART,
        src: CHART,
    },
    {
        id: 'readme',
        name: 'README.md',
        kind: 'text',
        size: 342,
        modified: 'Nov 1, 09:15',
        modifiedAt: '2026-11-01T09:15',
        owner: 'grace',
        text: README,
    },
    {
        id: 'schedule',
        name: 'sync-inventory.yaml',
        kind: 'code',
        size: 228,
        modified: 'Oct 29, 16:50',
        modifiedAt: '2026-10-29T16:50',
        owner: 'linus',
        text: SCHEDULE_YAML,
    },
    {
        id: 'report',
        name: 'review-q3.pdf',
        kind: 'pdf',
        size: 912_000,
        modified: 'Oct 12, 13:05',
        modifiedAt: '2026-10-12T13:05',
        owner: 'margaret',
    },
    {
        id: 'backup',
        name: 'exports-2026-10.zip',
        kind: 'archive',
        size: 31_400_000,
        modified: 'Nov 1, 00:30',
        modifiedAt: '2026-11-01T00:30',
        owner: 'ada',
    },
]

const UPLOADS: Upload[] = [
    { id: 'u1', name: 'site-trondheim.jpg', size: 3_420_000, state: 'uploading', progress: 0.64 },
    { id: 'u2', name: 'orders-2026-11-05.csv', size: 49_100, state: 'uploading', progress: 0.18 },
    { id: 'u3', name: 'site-tromso.jpg', size: 2_210_000, state: 'done' },
    { id: 'u4', name: 'notes.md', size: 1_420, state: 'done' },
    { id: 'u5', name: 'inventory-dump.json', size: 212_000_000, state: 'failed', error: 'Larger than the 100 MB a file may be' },
]

/** A folder or file in the project's tree: the folders from the folder tree, each with the files stored in it. */
interface StoreRow {
    id: string
    entry: FileEntry
    children?: StoreRow[]
}

function storeTree(nodes: readonly TreeNode[], store: Record<string, StoredFile[]>): StoreRow[] {
    return nodes.map((node) => ({
        id: node.id,
        entry: { id: node.id, name: node.label, kind: 'folder', modified: '' },
        children: [
            ...storeTree(node.children ?? [], store),
            ...(store[node.id] ?? []).map((file) => ({ id: `${node.id}/${file.id}`, entry: file })),
        ],
    }))
}

const storeChildren = (row: StoreRow) => row.children

/** The project's tree cut down to the names holding `text`. */
function findInStore(text: string, store: Record<string, StoredFile[]>) {
    const wanted = text.trim().toLowerCase()
    return findInTree({
        rows: storeTree(FOLDERS, store),
        rowKey: (row) => row.id,
        childRows: storeChildren,
        match: wanted === '' ? undefined : (row) => row.entry.name.toLowerCase().includes(wanted),
    })
}

const STORE_COLUMNS: DataColumn<StoreRow>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(16rem,1fr)',
        cell: (row) => (
            <Row as="span" className="min-w-0">
                <FileTypeIcon kind={row.entry.kind} className="size-4 shrink-0" />
                <span className="truncate">{row.entry.name}</span>
            </Row>
        ),
        sortValue: (row) => `${row.entry.kind === 'folder' ? 0 : 1}${row.entry.name}`,
    },
    {
        id: 'size',
        header: 'Size',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.entry.size === undefined ? null : formatSize(row.entry.size)),
        sortValue: (row) => row.entry.size ?? -1,
    },
    {
        id: 'modified',
        header: 'Modified',
        width: '8rem',
        cell: (row) => (row.entry.modified === '' ? null : <span className="text-muted-foreground">{row.entry.modified}</span>),
        sortValue: (row) => row.entry.modifiedAt ?? row.entry.modified,
    },
    {
        id: 'owner',
        header: 'Owner',
        width: '6rem',
        cell: (row) => (row.entry.owner === undefined ? null : <span className="text-muted-foreground">{row.entry.owner}</span>),
        sortValue: (row) => row.entry.owner ?? '',
    },
]

const PATHS: Record<string, string[]> = {
    'harbor/shared/review': ['harbor', 'shared', 'review'],
    'harbor/shared/archive': ['harbor', 'shared', 'archive'],
}

/** A download of a file in eight parts, one every 400ms once pressed, held by the story. */
function useDownload() {
    const [state, setState] = useState<DownloadState>('idle')
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (state !== 'running') return
        if (count >= 8) {
            setState('kept')
            return
        }
        const timer = setTimeout(() => setCount(count + 1), 400)
        return () => clearTimeout(timer)
    }, [state, count])
    return {
        state,
        count,
        start: () => {
            setCount(0)
            setState('running')
        },
        cancel: () => setState('idle'),
    }
}

function Details({ file, folder }: { file: StoredFile; folder: string }) {
    const download = useDownload()
    return (
        <>
            <PanelSection title="Preview">
                <FilePreview name={file.name} kind={file.kind} src={file.src} text={file.text} />
            </PanelSection>
            <PanelSection title="File">
                <DescriptionList
                    termWidth="5.5rem"
                    items={[
                        { term: 'Name', value: file.name, code: true },
                        { term: 'Size', value: file.size === undefined ? '' : formatSize(file.size) },
                        { term: 'Modified', value: file.modified },
                        { term: 'Owner', value: file.owner },
                        { term: 'Path', value: `/${folder}/${file.name}`, code: true },
                    ]}
                />
            </PanelSection>
            <Row align="stretch" className="px-4 py-3">
                <DownloadButton
                    size="sm"
                    state={download.state}
                    count={download.count}
                    total={8}
                    onDownload={download.start}
                    onCancel={download.cancel}
                />
                <Button variant="ghost" size="sm">
                    <Pencil aria-hidden />
                    Rename
                </Button>
            </Row>
        </>
    )
}

function FilesApp({
    view: initialView = 'list',
    folder: initialFolder = 'harbor/shared/review',
    chosen: initialChosen,
    selected: initialSelected = [],
    confirming = false,
    dropping = false,
    uploads: initialUploads = [],
}: {
    view?: 'list' | 'grid' | 'tree'
    folder?: string
    chosen?: string
    selected?: string[]
    confirming?: boolean
    dropping?: boolean
    uploads?: Upload[]
}) {
    const [dark, setDark] = useState(true)
    const [collapsed, setCollapsed] = useState(false)
    const [view, setView] = useState(initialView)
    const [treeOpen, setTreeOpen] = useState<ReadonlySet<string>>(new Set(['harbor', 'harbor/shared', 'harbor/shared/review']))
    const [folder, setFolder] = useState(initialFolder)
    const [sort, setSort] = useState<FileSort>({ key: 'name', direction: 'asc' })
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState<string[]>(initialSelected)
    const [chosen, setChosen] = useState<string | undefined>(initialChosen)
    const [panelOpen, setPanelOpen] = useState(initialChosen !== undefined)
    const [deleting, setDeleting] = useState(confirming)
    const [moving, setMoving] = useState(false)
    const [renaming, setRenaming] = useState(false)
    const [moveTo, setMoveTo] = useState<string[]>([])
    const [uploads, setUploads] = useState(initialUploads)
    const [store, setStore] = useState<Record<string, StoredFile[]>>({ 'harbor/shared/review': REVIEW, 'harbor/shared/archive': [] })

    const files = store[folder] ?? []
    const shown = sortFiles(
        files.filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase())),
        sort,
    )
    const file = files.find((each) => each.id === chosen)
    const path = PATHS[folder] ?? folder.split('/')
    const total = files.reduce((sum, each) => sum + (each.size ?? 0), 0)
    const single = selected.length === 1 ? files.find((each) => each.id === selected[0]) : undefined
    const found = findInStore(query, store)

    const open = (entry: FileEntry) => {
        if (entry.kind === 'folder') return
        setChosen(entry.id)
        setPanelOpen(true)
    }
    const remove = () => {
        setStore({ ...store, [folder]: files.filter((each) => !selected.includes(each.id)) })
        if (chosen !== undefined && selected.includes(chosen)) setChosen(undefined)
        setSelected([])
        setDeleting(false)
    }
    const goTo = (id: string) => {
        setFolder(id)
        setSelected([])
        setChosen(undefined)
        setQuery('')
    }

    const empty = (
        <Empty className="min-h-80 border border-border-strong">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FolderOpen />
                </EmptyMedia>
                <EmptyTitle>This folder is empty</EmptyTitle>
                <EmptyDescription>Drop files anywhere on this page, or upload them from your computer.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button size="sm">
                    <UploadIcon aria-hidden />
                    Upload files
                </Button>
            </EmptyContent>
        </Empty>
    )

    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        defaultSize={232}
                        foot={
                            <AccountMenu
                                name="grace"
                                image={pictureOf('grace')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[
                            { label: 'Files', href: '#' },
                            ...path.map((part, index) => ({
                                label: part,
                                code: true,
                                href: index < path.length - 1 ? '#' : undefined,
                            })),
                        ]}
                        onSearch={() => undefined}
                        actions={<ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />}
                    />
                }
                foot={
                    <StatusLine note={uploads.some((each) => each.state === 'uploading') ? 'Uploading to harbor' : 'Synced'}>
                        <StatusItem label="harbor">4.2 GB of 20 GB</StatusItem>
                    </StatusLine>
                }
                panelOpen={panelOpen && file !== undefined}
                onPanelOpenChange={setPanelOpen}
                panel={
                    file === undefined ? undefined : (
                        <SidePanel
                            tabs={[{ id: 'file', label: file.name, content: <Details file={file} folder={folder} /> }]}
                            width="24rem"
                        />
                    )
                }
            >
                <Row gap="none" align="stretch" className="h-full min-h-0">
                    <SubNav title="Folders">
                        <Tree
                            label="Folders"
                            nodes={FOLDERS}
                            selected={[folder]}
                            onSelect={(ids) => goTo(ids[0])}
                            defaultExpanded={['harbor', 'harbor/shared']}
                        />
                    </SubNav>
                    <DropZone
                        open={dropping || undefined}
                        className="min-w-0 flex-1"
                        onFiles={(dropped) =>
                            setUploads([
                                ...uploads,
                                ...dropped.map((each, index) => ({
                                    id: `drop-${uploads.length + index}`,
                                    name: each.name,
                                    size: each.size,
                                    state: 'uploading' as const,
                                    progress: 0,
                                })),
                            ])
                        }
                        words={{ detail: `The files go into ${path.join('/')}.` }}
                    >
                        <div className="h-full overflow-y-auto">
                            <Page>
                                <PageHeader
                                    title={path[path.length - 1]}
                                    count={files.length === 0 ? undefined : `${files.length} items, ${formatSize(total)}`}
                                    actions={
                                        <>
                                            <Button variant="outline" size="sm">
                                                <FolderPlus aria-hidden />
                                                New folder
                                            </Button>
                                            <Button size="sm">
                                                <UploadIcon aria-hidden />
                                                Upload
                                            </Button>
                                        </>
                                    }
                                />
                                {files.length > 0 && (
                                    <Toolbar
                                        search={
                                            selected.length > 0 ? undefined : (
                                                <SearchField
                                                    value={query}
                                                    onChange={(text) => {
                                                        setQuery(text)
                                                        if (view === 'tree')
                                                            setTreeOpen(new Set([...treeOpen, ...findInStore(text, store).open]))
                                                    }}
                                                    placeholder={view === 'tree' ? 'Find' : 'Filter this folder'}
                                                />
                                            )
                                        }
                                        end={
                                            <Segmented
                                                label="View"
                                                value={view}
                                                options={[
                                                    { value: 'list', label: 'List' },
                                                    { value: 'grid', label: 'Grid' },
                                                    { value: 'tree', label: 'Tree' },
                                                ]}
                                                onValueChange={setView}
                                            />
                                        }
                                    >
                                        {selected.length > 0 && (
                                            <SelectionBar count={selected.length} onClear={() => setSelected([])} framed>
                                                <Button variant="ghost" size="sm">
                                                    <Download aria-hidden />
                                                    Download
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setMoving(true)}>
                                                    <FolderInput aria-hidden />
                                                    Move
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={single === undefined}
                                                    onClick={() => setRenaming(true)}
                                                >
                                                    <Pencil aria-hidden />
                                                    Rename
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="ml-auto"
                                                    onClick={() => setDeleting(true)}
                                                >
                                                    <Trash2 aria-hidden />
                                                    Delete
                                                </Button>
                                            </SelectionBar>
                                        )}
                                    </Toolbar>
                                )}
                                {files.length === 0 ? (
                                    empty
                                ) : view === 'tree' ? (
                                    <DataTable
                                        variant="list"
                                        columns={STORE_COLUMNS}
                                        rows={found.rows}
                                        rowKey={(row) => row.id}
                                        childRows={found.childRows}
                                        expanded={treeOpen}
                                        onExpandedChange={setTreeOpen}
                                        defaultSort={{ column: 'name', direction: 'asc' }}
                                        onOpen={(row) => (row.entry.kind === 'folder' ? undefined : open(row.entry))}
                                        opened={(row) => panelOpen && row.entry.id === chosen}
                                        words={{ empty: 'Nothing matches.' }}
                                    />
                                ) : view === 'list' ? (
                                    <FileList
                                        entries={shown}
                                        sort={sort}
                                        onSortChange={setSort}
                                        selected={selected}
                                        onSelectedChange={setSelected}
                                        active={panelOpen ? chosen : undefined}
                                        onOpen={open}
                                    />
                                ) : (
                                    <FileGrid
                                        entries={shown}
                                        selected={selected}
                                        onSelectedChange={setSelected}
                                        active={panelOpen ? chosen : undefined}
                                        onOpen={open}
                                    />
                                )}
                            </Page>
                        </div>
                        {uploads.length > 0 && (
                            <UploadTray
                                uploads={uploads}
                                onRetry={(id) =>
                                    setUploads(
                                        uploads.map((each) => (each.id === id ? { ...each, state: 'uploading', progress: 0 } : each)),
                                    )
                                }
                                onCancel={(id) => setUploads(uploads.filter((each) => each.id !== id))}
                                onClose={() => setUploads([])}
                                className="absolute right-4 bottom-4 z-10 max-sm:right-2 max-sm:bottom-2 max-sm:left-2 max-sm:w-auto"
                            />
                        )}
                    </DropZone>
                </Row>
            </Shell>
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={selected.length === 1 ? `Delete ${single?.name ?? 'this file'}?` : `Delete ${selected.length} files?`}
                detail="They are removed from harbor for everyone. A deleted file cannot be brought back."
                confirm={{ label: 'Delete', destructive: true, onConfirm: remove }}
            />
            <DialogShell
                open={moving}
                onOpenChange={setMoving}
                title={`Move ${selected.length} ${selected.length === 1 ? 'file' : 'files'}`}
                description="Choose the folder they go into."
                confirm={{
                    label: 'Move here',
                    why: moveTo.length === 0 ? 'Choose a folder first' : undefined,
                    onConfirm: () => setMoving(false),
                }}
            >
                <Tree label="Folders" nodes={FOLDERS} selected={moveTo} onSelect={setMoveTo} defaultExpanded={['harbor']} />
            </DialogShell>
            <DialogShell
                open={renaming}
                onOpenChange={setRenaming}
                width="sm"
                title="Rename"
                confirm={{ label: 'Rename', onConfirm: () => setRenaming(false) }}
            >
                <Input defaultValue={single?.name} aria-label="New name" className="font-mono" />
            </DialogShell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Files' }
export default meta

/** The review folder as rows, sorted by name, folders first. */
export const List: StoryObj = { render: () => <FilesApp /> }

/** The same folder as tiles: pictures for the images, icons for everything else. */
export const Grid: StoryObj = { render: () => <FilesApp view="grid" /> }

/** The whole project as a tree: every folder in its folder, opened down to the review folder's files. */
export const TreeView: StoryObj = { name: 'Folder tree', render: () => <FilesApp view="tree" /> }

/** A file chosen from the listing, previewed in the side panel with its facts. */
export const Preview: StoryObj = { name: 'Preview', render: () => <FilesApp chosen="orders-04" /> }

/** Two files selected, the toolbar offering what can be done to them, and the delete asked about first. */
export const Delete: StoryObj = { render: () => <FilesApp view="grid" selected={['pines', 'field']} confirming /> }

/** Files dragged over the folder, the frame saying where they go. */
export const Dropping: StoryObj = { render: () => <FilesApp dropping /> }

/** Uploads under way in the tray: two going, two done, one refused. */
export const Uploads: StoryObj = { render: () => <FilesApp uploads={UPLOADS} /> }

/** A folder with nothing in it yet. */
export const EmptyFolder: StoryObj = { name: 'Empty folder', render: () => <FilesApp folder="harbor/shared/archive" /> }
