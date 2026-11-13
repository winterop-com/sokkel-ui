import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { RailDrops } from '@winterop-com/sokkel-ui/RailDrops'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Copy, LayoutDashboard, LayoutGrid, Pause, PencilLine, Play, Plus, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go, useOverlayRoute } from 'tidevann-shared/router'
import { createDashboard, deleteDashboard, duplicateDashboard, inOrder, renameDashboard } from './actions'
import { dashboards, prefs as prefsStore } from './collections'
import { DashboardDialog } from './DashboardDialog'
import { DashboardPage } from './DashboardPage'
import { DashboardsPage } from './DashboardsPage'
import { startLive, useLive } from './live'
import { DEFAULT_PREFS, PACES, type Dashboard, type Prefs } from './model'
import { Settings } from './Settings'
import { clockOf } from './widgets'

/** The foot strip: when the source was last read and how many runs are going. */
function Foot({ prefs }: { prefs: Prefs }) {
    const state = useLive()
    const running = state.runs.filter((run) => run.state === 'running').length
    const troubled = state.sites.filter((site) => site.state !== 'operational').length
    return (
        <StatusLine
            live={prefs.live}
            tone={troubled > 0 ? 'warn' : undefined}
            note={
                prefs.live
                    ? `Live, read ${PACES[prefs.pace].label.toLowerCase()}, last at ${clockOf(state.at, prefs.clock, true)}`
                    : `Paused at ${clockOf(state.at, prefs.clock, true)}`
            }
        >
            <StatusItem label="running">{running}</StatusItem>
            <StatusItem label="sites in trouble">{troubled}</StatusItem>
        </StatusLine>
    )
}

type Asking = { kind: 'new' } | { kind: 'rename'; board: Dashboard } | { kind: 'delete'; board: Dashboard } | null

/** Tidevann's home: the dashboards in the rail, the one the address names, the list of them all, and the settings over any page. */
export function Home({ frame }: { frame: Frame }) {
    const settings = useOverlayRoute(frame.route, 'settings')
    const route = settings.route
    const boards = useCollection(dashboards)
    const prefsRows = useCollection(prefsStore)
    const prefs: Prefs = prefsRows.rows?.[0] ?? { id: 'prefs', order: [], ...DEFAULT_PREFS }
    // The order as last dragged in the rail or on All dashboards, drawn until the backend has kept it.
    const [held, setHeld] = useState<string[] | null>(null)
    const all = useMemo(() => inOrder(boards.rows ?? [], held ?? prefs.order), [boards.rows, held, prefs.order])
    const [asking, setAsking] = useState<Asking>(null)

    useEffect(() => (prefs.live ? startLive(PACES[prefs.pace].every) : undefined), [prefs.live, prefs.pace])

    const [section, id] = route
    const board = section === 'd' ? all.find((one) => one.id === id) : undefined
    // A bare address opens the first dashboard.
    useEffect(() => {
        if (section === undefined && all[0] !== undefined && !settings.open) window.location.replace(`#/d/${all[0].id}`)
    }, [section, all, settings.open])

    const order = all.map((one) => one.id)
    const keepOrder = (next: string[]) => {
        setHeld(next)
        return prefsStore.update(prefs.id, { order: next }).finally(() => setHeld(null))
    }
    const setLive = (live: boolean) => void prefsStore.update(prefs.id, { live })
    const groups: RailGroup[] = [
        {
            id: 'home',
            entries: [
                {
                    id: 'dashboards',
                    label: 'All dashboards',
                    icon: LayoutGrid,
                    href: '#/dashboards',
                    active: section === 'dashboards',
                    keywords: ['list', 'order', 'manage'],
                    count: all.length,
                },
            ],
        },
        {
            id: 'boards',
            title: 'Dashboards',
            onReorder: (from, to) => void keepOrder(moveItem(order, from, to)),
            entries: all.map((one) => ({
                id: one.id,
                label: one.name,
                icon: LayoutDashboard,
                href: `#/d/${one.id}`,
                active: board?.id === one.id,
            })),
        },
        { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings2, href: '#/settings' }] },
    ]
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => {
            window.location.hash = href
        }),
        {
            title: 'Dashboards',
            rank: 5,
            commands: [
                { id: 'new', label: 'New dashboard', icon: Plus, onSelect: () => setAsking({ kind: 'new' }) },
                ...(board === undefined
                    ? []
                    : [
                          {
                              id: 'rename',
                              label: 'Rename this dashboard',
                              icon: PencilLine,
                              onSelect: () => setAsking({ kind: 'rename', board }),
                          },
                          {
                              id: 'duplicate',
                              label: 'Duplicate this dashboard',
                              icon: Copy,
                              onSelect: () => void duplicateDashboard(board, prefs, order),
                          },
                      ]),
                {
                    id: 'live',
                    label: prefs.live ? 'Pause live data' : 'Follow live data',
                    icon: prefs.live ? Pause : Play,
                    keywords: ['live', 'stream', 'pause'],
                    onSelect: () => setLive(!prefs.live),
                },
            ],
        },
        ...frame.palette,
    ]

    const home: Crumb = { label: 'Tidevann', href: '#/' }
    const trail: Crumb[] =
        section === 'dashboards' ? [home, { label: 'Dashboards' }] : board !== undefined ? [home, { label: board.name }] : [home]

    let content
    if (boards.rows === undefined || prefsRows.rows === undefined)
        content = (
            <PageState loading={boards.error === undefined} error={boards.error}>
                {null}
            </PageState>
        )
    else if (section === 'dashboards')
        content = (
            <DashboardsPage
                boards={all}
                onReorder={keepOrder}
                onCreate={() => setAsking({ kind: 'new' })}
                onRename={(one) => setAsking({ kind: 'rename', board: one })}
                onDuplicate={(one) => void duplicateDashboard(one, prefs, order)}
                onDelete={(one) => setAsking({ kind: 'delete', board: one })}
            />
        )
    else if (board !== undefined)
        content = (
            <DashboardPage
                key={board.id}
                board={board}
                prefs={prefs}
                onRename={() => setAsking({ kind: 'rename', board })}
                onDuplicate={() => void duplicateDashboard(board, prefs, order)}
                onDelete={() => setAsking({ kind: 'delete', board })}
            />
        )
    else if (section === undefined && all.length > 0) content = null
    else
        content = (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>{all.length === 0 ? 'No dashboards' : 'Nothing at this address'}</EmptyTitle>
                    <EmptyDescription>
                        {all.length === 0 ? 'Make a dashboard to put widgets on.' : `There is no dashboard at #/${route.join('/')}.`}
                    </EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => (all.length === 0 ? setAsking({ kind: 'new' }) : go('/dashboards'))}>
                    {all.length === 0 ? 'New dashboard' : 'See every dashboard'}
                </Button>
            </Empty>
        )

    return (
        <RailDrops>
            <Shell
                palette={palette}
                desktop={frame.desktop}
                route={route.join('/')}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/"
                        name="Tidevann"
                        groups={groups}
                        foot={
                            <AccountMenu
                                name="ada"
                                where="tidevann.example.org"
                                local
                                onSettings={() => go('/settings')}
                                scheme={frame.appearance.settings.scheme}
                                onSchemeChange={(scheme) => frame.appearance.setSettings({ ...frame.appearance.settings, scheme })}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={trail}
                        actions={
                            <>
                                <IconButton label="New dashboard" variant="ghost" size="icon-sm" onClick={() => setAsking({ kind: 'new' })}>
                                    <Plus aria-hidden />
                                </IconButton>
                                <IconButton
                                    label={prefs.live ? 'Pause live data' : 'Follow live data'}
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setLive(!prefs.live)}
                                >
                                    {prefs.live ? <Pause aria-hidden /> : <Play aria-hidden />}
                                </IconButton>
                            </>
                        }
                    />
                }
                foot={<Foot prefs={prefs} />}
            >
                <Page className={section === 'dashboards' ? 'h-full' : undefined}>{content}</Page>
                {settings.open && prefsRows.rows !== undefined && <Settings prefs={prefs} frame={frame} onClose={settings.close} />}
                {(asking?.kind === 'new' || asking?.kind === 'rename') && (
                    <DashboardDialog
                        renaming={asking.kind === 'rename' ? asking.board : undefined}
                        taken={all.map((one) => one.name)}
                        onClose={() => setAsking(null)}
                        onCreate={(name, from) => createDashboard(name, from, prefs)}
                        onRename={renameDashboard}
                    />
                )}
                <ConfirmDialog
                    open={asking?.kind === 'delete'}
                    onOpenChange={(open) => {
                        if (!open) setAsking(null)
                    }}
                    question={`Delete ${asking?.kind === 'delete' ? asking.board.name : 'the dashboard'}?`}
                    detail={
                        asking?.kind === 'delete'
                            ? `Its ${String(asking.board.widgets.length)} widgets and their to-dos go with it. This cannot be undone.`
                            : undefined
                    }
                    confirm={{
                        label: 'Delete',
                        destructive: true,
                        onConfirm: () => {
                            if (asking?.kind !== 'delete') return
                            const gone = asking.board
                            setAsking(null)
                            void deleteDashboard(gone, prefs, all)
                        },
                    }}
                />
            </Shell>
        </RailDrops>
    )
}
