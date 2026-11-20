import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Activity, BellRing, Globe2, Pause, Play, Settings2, TableProperties } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { APPEARANCE, type Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { tuneAlerts } from './alerts'
import { alerts as alertsStore, prefs as prefsStore } from './collections'
import { clock, formatRate } from './format'
import { DEFAULT_PREFS, type Prefs } from './model'
import { AlertsPage } from './pages/AlertsPage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { HostPanel } from './pages/HostPanel'
import { MapPage } from './pages/MapPage'
import { TrafficPage } from './pages/TrafficPage'
import { Settings } from './Settings'
import { KEEP, runWatch, snapshotAt, useWatch, type WatchState } from './watch'

const PAGES = {
    map: 'Map',
    connections: 'Connections',
    traffic: 'Traffic',
    alerts: 'Alerts',
} as const

type PageId = keyof typeof PAGES

/** How many bars the timeline's activity strip draws over the history. */
const BINS = 90

/** The number of connections open at each step of the history, for the timeline's strip. */
function activityOf(state: WatchState, from: number, to: number): number[] {
    const bins = Array<number>(BINS).fill(0)
    const counted = Array<number>(BINS).fill(0)
    const width = (to - from) / BINS
    if (width <= 0) return bins
    for (const snapshot of state.history) {
        const bin = Math.min(BINS - 1, Math.floor((snapshot.at - from) / width))
        if (bin < 0) continue
        bins[bin] += snapshot.connections.length
        counted[bin] += 1
    }
    return bins.map((total, index) => (counted[index] === 0 ? 0 : Math.round(total / counted[index])))
}

/** The foot strip: where the readings come from, when the last came, and how busy the machine is. */
function Foot({ state, prefs, shownAt }: { state: WatchState; prefs: Prefs; shownAt: number | null }) {
    const latest = snapshotAt(state, shownAt)
    const where = state.source === 'machine' ? `this machine, through ${state.tool ?? 'lsof'}` : 'the simulated machine'
    const note = !state.ready
        ? 'Starting the watch'
        : state.problem !== undefined
          ? `This machine could not be read: ${state.problem}`
          : shownAt !== null
            ? `Looking back at ${clock(shownAt)}`
            : prefs.live
              ? `Live from ${where}, last read at ${state.at === 0 ? 'none yet' : clock(state.at)}`
              : `Paused at ${state.at === 0 ? 'the start' : clock(state.at)}`
    return (
        <StatusLine
            live={prefs.live && shownAt === null && state.ready}
            tone={state.problem === undefined ? undefined : 'warn'}
            note={note}
        >
            <StatusItem label="connections">{latest?.connections.length ?? 0}</StatusItem>
            <StatusItem label="hosts">{latest?.remotes.length ?? 0}</StatusItem>
            {state.metered && <StatusItem label="in">{formatRate(latest?.rateIn ?? 0)}</StatusItem>}
            {state.metered && <StatusItem label="out">{formatRate(latest?.rateOut ?? 0)}</StatusItem>}
        </StatusLine>
    )
}

/** Tidevann's network watch: the pages in the rail, the one the address names, and the settings over any page. */
export function Home({ frame }: { frame: Frame }) {
    const settings = useOverlayRoute(frame.route, 'settings')
    const route = settings.route
    const prefsRows = useCollection(prefsStore)
    const alertRows = useCollection(alertsStore)
    const prefs: Prefs = prefsRows.rows?.[0] ?? { id: 'prefs', ...DEFAULT_PREFS }
    const state = useWatch()
    // The time looked back at: null while live.
    const [shownAt, setShownAt] = useState<number | null>(null)
    const [selected, setSelected] = useState<string | null>(null)

    useEffect(() => {
        if (prefsRows.rows === undefined) return
        tuneAlerts(prefs)
        runWatch(prefs)
    }, [prefsRows.rows, prefs])
    // A new source has a history of its own, so a time looked back at in the old one means nothing.
    useEffect(() => setShownAt(null), [state.source])

    const section = route[0]
    const page: PageId | undefined = section === undefined ? 'map' : Object.hasOwn(PAGES, section) ? (section as PageId) : undefined
    const openAlerts = (alertRows.rows ?? []).filter((alert) => !alert.acknowledged).length
    // Before this machine's first reading there is nothing yet: an empty moment stands in.
    const snapshot = snapshotAt(state, shownAt) ?? { at: state.at, connections: [], remotes: [], processes: [], rateIn: 0, rateOut: 0 }
    const set = (patch: Partial<Prefs>) => void prefsStore.update(prefs.id, patch)
    const setLive = (live: boolean) => set({ live })

    const groups: RailGroup[] = [
        {
            id: 'watch',
            title: 'Watch',
            entries: [
                { id: 'map', label: 'Map', icon: Globe2, href: '#/map', active: page === 'map' },
                {
                    id: 'connections',
                    label: 'Connections',
                    icon: TableProperties,
                    href: '#/connections',
                    active: page === 'connections',
                    keywords: ['table', 'sockets', 'processes'],
                },
                {
                    id: 'traffic',
                    label: 'Traffic',
                    icon: Activity,
                    href: '#/traffic',
                    active: page === 'traffic',
                    keywords: ['rates', 'chart'],
                },
                { id: 'alerts', label: 'Alerts', icon: BellRing, href: '#/alerts', active: page === 'alerts', count: openAlerts },
            ],
        },
        { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings2, href: '#/settings' }] },
    ]
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => {
            window.location.hash = href
        }),
        {
            title: 'Watch',
            rank: 5,
            commands: [
                {
                    id: 'live',
                    label: prefs.live ? 'Pause the watch' : 'Follow live',
                    icon: prefs.live ? Pause : Play,
                    keywords: ['live', 'stream', 'pause'],
                    onSelect: () => setLive(!prefs.live),
                },
                ...(shownAt === null ? [] : [{ id: 'back-to-live', label: 'Back to live', icon: Play, onSelect: () => setShownAt(null) }]),
                {
                    id: 'color-by',
                    label: prefs.colorBy === 'state' ? 'Color the map by process' : 'Color the map by state',
                    icon: Globe2,
                    onSelect: () => set({ colorBy: prefs.colorBy === 'state' ? 'process' : 'state' }),
                },
            ],
        },
        ...frame.palette,
    ]

    const home: Crumb = { label: 'Tidevann', href: '#/' }
    const trail: Crumb[] = page === undefined ? [home] : [home, { label: PAGES[page] }]
    const looksBack = page === 'map' || page === 'connections' || page === 'traffic'
    const oldest = state.history[0]?.at ?? state.at - KEEP
    const from = Math.min(oldest, state.at - 60_000)
    const activity = useMemo(() => activityOf(state, from, state.at), [state, from])

    let content
    if (prefsRows.rows === undefined || !state.ready)
        content = (
            <PageState loading={prefsRows.error === undefined} error={prefsRows.error}>
                {null}
            </PageState>
        )
    else if (page === 'map')
        content = (
            <MapPage
                state={state}
                snapshot={snapshot}
                prefs={prefs}
                selected={selected}
                onSelect={setSelected}
                onColorBy={(colorBy) => set({ colorBy })}
            />
        )
    else if (page === 'connections')
        content = (
            <ConnectionsPage
                state={state}
                snapshot={snapshot}
                prefs={prefs}
                onGroupBy={(groupBy) => set({ groupBy })}
                onShowOnMap={(address) => {
                    setSelected(`flow:${address}`)
                    go('/map')
                }}
            />
        )
    else if (page === 'traffic') content = <TrafficPage state={state} shownAt={shownAt} prefs={prefs} onSpan={(span) => set({ span })} />
    else if (page === 'alerts')
        content = (
            <AlertsPage
                alerts={alertRows.rows}
                error={alertRows.error}
                onShowOnMap={(address) => {
                    setShownAt(null)
                    setSelected(`flow:${address}`)
                    go('/map')
                }}
            />
        )
    else
        content = (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>Nothing at this address</EmptyTitle>
                    <EmptyDescription>{`There is no page at #/${route.join('/')}.`}</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go('/map')}>
                    Open the map
                </Button>
            </Empty>
        )

    return (
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
                            onAppearance={() => go(APPEARANCE)}
                        />
                    }
                />
            }
            top={
                <TopBar
                    trail={trail}
                    actions={
                        <IconButton
                            label={prefs.live ? 'Pause the watch' : 'Follow live'}
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setLive(!prefs.live)}
                        >
                            {prefs.live ? <Pause aria-hidden /> : <Play aria-hidden />}
                        </IconButton>
                    }
                />
            }
            panel={
                page === 'map' && state.ready ? (
                    <HostPanel state={state} snapshot={snapshot} selected={selected} onSelect={setSelected} now={shownAt ?? state.at} />
                ) : undefined
            }
            bottom={
                looksBack && state.ready && state.history.length > 1 ? (
                    <PlaybackTimeline
                        label="Network watch"
                        from={from}
                        to={state.at}
                        value={shownAt}
                        onValueChange={setShownAt}
                        rate={10}
                        step={10_000}
                        activity={activity}
                    />
                ) : undefined
            }
            foot={<Foot state={state} prefs={prefs} shownAt={shownAt} />}
        >
            <Page className="h-full">{content}</Page>
            {settings.open && prefsRows.rows !== undefined && (
                <Settings prefs={prefs} state={state} frame={frame} onClose={settings.close} />
            )}
        </Shell>
    )
}
