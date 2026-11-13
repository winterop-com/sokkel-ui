import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteCommand, PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { ChartColumn, Database, LayoutDashboard, LayoutGrid, Plus, Presentation, Settings2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go, useOverlayRoute } from 'tidevann-shared/router'

import { boards as boardStore, charts as chartStore, datasets as datasetStore, preferences } from './backend'
import { BoardDialog } from './dialogs'
import { ImportDialog } from './ImportDialog'
import { DEFAULT_PREFERENCES, orderBoards } from './model'
import { BoardPage } from './pages/Board'
import { BoardsPage } from './pages/Boards'
import { BuilderPage } from './pages/Builder'
import { ChartsPage } from './pages/Charts'
import { DatasetPage } from './pages/Dataset'
import { DatasetsPage } from './pages/Datasets'
import { SettingsPage } from './pages/Settings'
import { SharedPage } from './pages/Shared'
import { VIEW_ICONS } from './views'

/** The Visualizer: datasets to chart, a builder with a live preview, saved and shared charts, and boards of them. */
export function Visualizer({ frame }: { frame: Frame }) {
    const datasets = useCollection(datasetStore)
    const charts = useCollection(chartStore)
    const boards = useCollection(boardStore)
    const prefsRows = useCollection(preferences)
    const prefs = prefsRows.rows?.[0] ?? DEFAULT_PREFERENCES
    const [importing, setImporting] = useState(false)
    const [newBoard, setNewBoard] = useState(false)

    // Settings open as a dialog over the page they were opened from.
    const settings = useOverlayRoute(frame.route, 'settings', ['datasets'])
    const [section, id, mode] = settings.route
    useEffect(() => {
        if (section === undefined) window.location.replace('#/datasets')
    }, [section])

    const allDatasets = datasets.rows ?? []
    const allCharts = charts.rows ?? []
    const allBoards = orderBoards(boards.rows ?? [], prefs.boardOrder)
    const loading = datasets.rows === undefined || charts.rows === undefined || boards.rows === undefined

    const groups: RailGroup[] = [
        {
            id: 'main',
            entries: [
                {
                    id: 'datasets',
                    label: 'Datasets',
                    description: 'Tables of data to chart',
                    icon: Database,
                    href: '#/datasets',
                    active: section === 'datasets' || section === 'build',
                    count: allDatasets.length || undefined,
                    keywords: ['data', 'import', 'tables'],
                },
                {
                    id: 'charts',
                    label: 'Charts',
                    description: 'Saved charts',
                    icon: ChartColumn,
                    href: '#/charts',
                    active: section === 'charts',
                    count: allCharts.length || undefined,
                    keywords: ['saved', 'views'],
                },
                {
                    id: 'boards',
                    label: 'Boards',
                    description: 'Charts arranged together',
                    icon: LayoutGrid,
                    href: '#/boards',
                    active: section === 'boards' && id === undefined,
                    keywords: ['dashboards'],
                },
            ],
        },
        {
            id: 'board-list',
            title: 'Boards',
            entries: allBoards.map((board) => ({
                id: `board-${board.id}`,
                label: board.name,
                icon: LayoutDashboard,
                href: `#/boards/${board.id}`,
                active: section === 'boards' && id === board.id,
            })),
        },
        {
            id: 'system',
            title: 'System',
            entries: [
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: Settings2,
                    href: '#/settings',
                    keywords: ['preferences', 'palette', 'numbers'],
                },
            ],
        },
    ]

    const datasetCommands: PaletteCommand[] = allDatasets.map((one) => ({
        id: `dataset-${one.id}`,
        label: one.name,
        hint: `${one.rows.length.toLocaleString('en-US')} rows`,
        icon: Database,
        keywords: one.columns.map((column) => column.name),
        onSelect: () => go(`/datasets/${one.id}`),
    }))
    const chartCommands: PaletteCommand[] = allCharts.map((chart) => ({
        id: `chart-${chart.id}`,
        label: chart.name,
        hint: allDatasets.find((one) => one.id === chart.datasetId)?.name,
        icon: VIEW_ICONS[chart.spec.view],
        keywords: [chart.spec.view],
        onSelect: () => go(`/charts/${chart.id}`),
    }))
    const boardCommands: PaletteCommand[] = allBoards.flatMap((board) => [
        {
            id: `board-${board.id}`,
            label: board.name,
            hint: `${String(board.items.length)} charts`,
            icon: LayoutDashboard,
            onSelect: () => go(`/boards/${board.id}`),
        },
        {
            id: `board-present-${board.id}`,
            label: `Present ${board.name}`,
            icon: Presentation,
            keywords: ['full screen', 'present'],
            onSelect: () => go(`/boards/${board.id}/present`),
        },
    ])
    const actions: PaletteCommand[] = [
        { id: 'import', label: 'Import data', hint: 'CSV, TSV or JSON', icon: Upload, onSelect: () => setImporting(true) },
        ...allDatasets.slice(0, 1).map((one) => ({
            id: 'chart-new',
            label: 'New chart',
            hint: `From ${one.name}`,
            icon: Plus,
            onSelect: () => go(`/build/${one.id}`),
        })),
        { id: 'board-new', label: 'New board', icon: Plus, onSelect: () => setNewBoard(true) },
    ]
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => {
            window.location.hash = href
        }),
        { title: 'Actions', commands: actions, rank: 5 },
        { title: 'Datasets', commands: datasetCommands, rank: 6 },
        { title: 'Charts', commands: chartCommands, rank: 7 },
        { title: 'Boards', commands: boardCommands, rank: 8 },
        ...frame.palette,
    ]

    const chart = section === 'charts' && id !== undefined ? allCharts.find((one) => one.id === id) : undefined
    const dataset = section === 'datasets' && id !== undefined ? allDatasets.find((one) => one.id === id) : undefined
    const board = section === 'boards' && id !== undefined ? allBoards.find((one) => one.id === id) : undefined

    const trail = (() => {
        if (section === 'datasets')
            return id === undefined
                ? [{ label: 'Datasets' }]
                : [{ label: 'Datasets', href: '#/datasets' }, { label: dataset?.name ?? 'Dataset' }]
        if (section === 'build') return [{ label: 'Datasets', href: '#/datasets' }, { label: 'New chart' }]
        if (section === 'charts')
            return id === undefined ? [{ label: 'Charts' }] : [{ label: 'Charts', href: '#/charts' }, { label: chart?.name ?? 'Chart' }]
        if (section === 'boards')
            return id === undefined ? [{ label: 'Boards' }] : [{ label: 'Boards', href: '#/boards' }, { label: board?.name ?? 'Board' }]
        if (section === 'shared') return [{ label: 'Shared chart' }]
        return []
    })()

    const page = (() => {
        if (section === 'shared' && id !== undefined) return <SharedPage key={id} payload={id} prefs={prefs} />
        if (loading)
            return (
                <Page>
                    <PageState loading error={datasets.error ?? charts.error ?? boards.error}>
                        {null}
                    </PageState>
                </Page>
            )
        if (section === 'datasets' && id === undefined)
            return <DatasetsPage datasets={allDatasets} charts={allCharts} loading={false} onImport={() => setImporting(true)} />
        if (section === 'datasets') return <DatasetPage key={id} dataset={dataset} charts={allCharts} prefs={prefs} />
        if (section === 'build')
            return <BuilderPage key={`new-${id ?? ''}`} datasets={allDatasets} boards={allBoards} prefs={prefs} datasetId={id} />
        if (section === 'charts' && id === undefined)
            return <ChartsPage charts={allCharts} datasets={allDatasets} boards={allBoards} prefs={prefs} loading={false} />
        if (section === 'charts' && chart !== undefined)
            return <BuilderPage key={chart.id} datasets={allDatasets} boards={allBoards} prefs={prefs} chart={chart} />
        if (section === 'boards' && id === undefined)
            return <BoardsPage boards={allBoards} prefs={prefs} loading={false} onCreate={() => setNewBoard(true)} />
        if (section === 'boards')
            return (
                <BoardPage key={id} board={board} charts={allCharts} datasets={allDatasets} prefs={prefs} presenting={mode === 'present'} />
            )
        return (
            <Page>
                <PageState
                    loading={false}
                    empty
                    emptyMessage={
                        section === 'charts'
                            ? 'There is no such chart here. It may have been deleted.'
                            : 'Nothing is here. Pick a place in the rail.'
                    }
                >
                    {null}
                </PageState>
            </Page>
        )
    })()

    return (
        <>
            <Shell
                palette={palette}
                desktop={frame.desktop}
                route={settings.route.join('/')}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/datasets"
                        name="Visualizer"
                        groups={groups}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" onSettings={() => go('/settings')} />}
                    />
                }
                top={<TopBar trail={trail} />}
                foot={
                    <StatusLine note="All changes saved">
                        <StatusItem label="datasets">{allDatasets.length}</StatusItem>
                        <StatusItem label="charts">{allCharts.length}</StatusItem>
                        <StatusItem label="boards">{allBoards.length}</StatusItem>
                    </StatusLine>
                }
            >
                {page}
            </Shell>
            {settings.open && <SettingsPage prefs={prefs} frame={frame} datasets={allDatasets} open onClose={settings.close} />}
            <ImportDialog open={importing} onOpenChange={setImporting} />
            <BoardDialog open={newBoard} onOpenChange={setNewBoard} onMade={(made) => go(`/boards/${made.id}`)} />
            <Toaster position="bottom-right" />
        </>
    )
}
