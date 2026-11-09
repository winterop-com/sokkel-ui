import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteCommand, PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import type { TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { useStore, useStoreValue } from '@winterop-com/sokkel-ui/hooks/use-store'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/sonner'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import {
    Bell,
    BellPlus,
    ChartArea,
    ChartColumn,
    Gauge,
    Grid3x3,
    LayoutDashboard,
    LayoutGrid,
    type LucideIcon,
    Pause,
    Play,
    Plus,
    RefreshCw,
    ScrollText,
    Settings2,
    Share2,
    SquareSigma,
    Table2,
    TextAlignStart,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { readings, type RuleReading, useAlerting } from './alerting'
import { AlertsPage } from './Alerts'
import { DashboardPage } from './Dashboard'
import { DashboardsPage } from './Dashboards'
import { dashboards, DEFAULT_PREFERENCES, events, preferences, rules } from './data'
import { DashboardDialog, ShareDialog } from './dialogs'
import { EditorPage } from './Editor'
import { scraped, useDashboardTime, useScrapeClock } from './live'
import type { PanelKind } from './model'
import { go, patchParams, type Place, rangeOf, rangeParams, usePlace, variablesOf, viewParams } from './place'
import { clockOf } from './query'
import { RuleDialog } from './RuleDialog'
import { SettingsPage } from './Settings'
import type { Variables } from './source'
import type { View } from './view'

export const KIND_ICONS: Record<PanelKind, LucideIcon> = {
    timeseries: ChartArea,
    stat: SquareSigma,
    gauge: Gauge,
    bargauge: TextAlignStart,
    bar: ChartColumn,
    heatmap: Grid3x3,
    table: Table2,
    logs: ScrollText,
}

/** The states the alert parts say, in the app's words and colors. */
const ALERT_STATUSES = {
    firing: { color: 'critical' },
    pending: { color: 'warning' },
    normal: { color: 'good' },
    paused: { color: 'neutral' },
    resolved: { color: 'neutral' },
    critical: { color: 'critical' },
    warning: { color: 'warning' },
} as const

const countFiring = (all: Readonly<Record<string, RuleReading>>) =>
    Object.values(all).filter((reading) => reading.state === 'firing').length

/** The foot strip: the newest scrape, ticking every second, and how many alerts fire. */
function Foot({ zone, firing, paused, refresh }: { zone: 'local' | 'utc'; firing: number; paused: boolean; refresh: number }) {
    const second = useStore(scraped)
    const mode = refresh === 0 ? 'refresh off' : paused ? 'refresh paused' : `refresh every ${String(refresh)}s`
    return (
        <StatusLine note={`Scraped ${clockOf(second, zone)}${zone === 'utc' ? ' UTC' : ''}, ${mode}`}>
            <StatusItem label="firing">{firing}</StatusItem>
            <StatusItem label="source">1s</StatusItem>
        </StatusLine>
    )
}

/** The Metrics app: live dashboards, a panel editor with a live preview, and alerts, over a simulated source. */
export function MetricsApp({ frame }: { frame: Frame }) {
    const { settings, setSettings, resolved } = frame.appearance
    const dark = resolved === 'dark'
    useScrapeClock()
    const place = usePlace()
    const boards = useCollection(dashboards)
    const ruleList = useCollection(rules)
    const fired = useCollection(events)
    const prefsRows = useCollection(preferences)
    const prefs = prefsRows.rows?.[0] ?? DEFAULT_PREFERENCES
    useAlerting(ruleList.rows, fired.rows, prefs)
    const firing = useStoreValue(readings, countFiring)

    const query = place.params.toString()
    const range = useMemo(() => rangeOf(new URLSearchParams(query), prefs.range), [query, prefs.range])
    const vars = useMemo(() => variablesOf(new URLSearchParams(query)), [query])
    const refreshParam = place.params.get('refresh')
    const refresh = refreshParam === null ? prefs.refresh : Number(refreshParam)
    const [paused, setPaused] = useState(false)
    const time = useDashboardTime(refresh, paused, JSON.stringify([range, vars]))

    const [sharing, setSharing] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newRule, setNewRule] = useState(false)

    const view: View = {
        range,
        vars,
        refresh,
        paused,
        zone: prefs.zone,
        at: time.at,
        refreshing: time.refreshing,
        refreshNow: time.refresh,
        setRange: (next: TimeRangeValue) => patchParams(rangeParams(next)),
        setVariables: (next: Variables) =>
            patchParams({
                service: next.service === 'all' ? null : next.service,
                host: next.host === 'all' ? null : next.host,
                project: next.project === 'all' ? null : next.project,
            }),
        setRefresh: (seconds: number) => patchParams({ refresh: String(seconds) }),
        setPaused,
    }

    const all = boards.rows ?? []
    const [section, id, mode, panelId] = place.path
    const board = section === 'd' ? all.find((one) => one.id === id) : undefined
    const kept = viewParams(place.params)
    const keptQuery = kept.toString() === '' ? '' : `?${kept.toString()}`

    const groups: RailGroup[] = [
        {
            id: 'main',
            entries: [
                {
                    id: 'dashboards',
                    label: 'Dashboards',
                    keywords: ['list', 'all'],
                    icon: LayoutGrid,
                    href: '#/dashboards',
                    active: section === 'dashboards',
                },
                {
                    id: 'alerts',
                    label: 'Alerts',
                    keywords: ['rules', 'fired', 'firing'],
                    icon: Bell,
                    href: '#/alerts',
                    active: section === 'alerts',
                    count: firing > 0 ? firing : undefined,
                },
            ],
        },
        {
            id: 'boards',
            title: 'Dashboards',
            entries: all.map((one) => ({
                id: one.id,
                label: one.title,
                icon: LayoutDashboard,
                href: `#/d/${one.id}${keptQuery}`,
                active: board?.id === one.id,
            })),
        },
        {
            id: 'system',
            title: 'System',
            entries: [{ id: 'settings', label: 'Settings', icon: Settings2, href: '#/settings', active: section === 'settings' }],
        },
    ]

    const panelCommands: PaletteCommand[] = all.flatMap((one) =>
        one.panels.map((panel) => ({
            id: `panel-${one.id}-${panel.id}`,
            label: panel.title,
            hint: one.title,
            icon: KIND_ICONS[panel.kind],
            keywords: [panel.kind, panel.metric],
            onSelect: () => {
                const params = new URLSearchParams(kept)
                params.set(panel.kind === 'stat' ? 'focus' : 'view', panel.id)
                go(`/d/${one.id}`, params)
            },
        })),
    )
    const actions: PaletteCommand[] = [
        { id: 'dashboard-new', label: 'New dashboard', icon: Plus, onSelect: () => setCreating(true) },
        ...(board === undefined
            ? []
            : [
                  {
                      id: 'panel-add',
                      label: 'Add panel',
                      hint: board.title,
                      icon: Plus,
                      onSelect: () => go(`/d/${board.id}/new`, kept),
                  },
                  { id: 'share', label: 'Share this view', icon: Share2, onSelect: () => setSharing(true) },
              ]),
        { id: 'refresh', label: 'Refresh now', icon: RefreshCw, onSelect: time.refresh },
        ...(refresh === 0
            ? []
            : [
                  {
                      id: 'pause',
                      label: paused ? 'Resume auto refresh' : 'Pause auto refresh',
                      icon: paused ? Play : Pause,
                      onSelect: () => setPaused(!paused),
                  },
              ]),
        { id: 'rule-new', label: 'New alert rule', icon: BellPlus, onSelect: () => setNewRule(true) },
    ]
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (href) => {
            window.location.hash = href
        }),
        { title: 'Panels', commands: panelCommands, rank: 5 },
        { title: 'Actions', commands: actions, rank: 10 },
        ...frame.palette,
    ]

    const trail = (label: string) => [{ label: 'Metrics', href: '#/dashboards' }, { label }]
    const page = route(place, {
        board,
        mode,
        loading: boards.rows === undefined,
        error: boards.error,
        firstId: all[0]?.id,
    })

    const title =
        page === 'dashboard' || page === 'editor'
            ? (board?.title ?? '')
            : page === 'alerts'
              ? 'Alerts'
              : page === 'settings'
                ? 'Settings'
                : page === 'dashboards'
                  ? 'Dashboards'
                  : ''

    return (
        <StatusProvider statuses={ALERT_STATUSES}>
            <Shell
                palette={palette}
                desktop={frame.desktop}
                route={place.path.join('/')}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/dashboards"
                        name="Metrics"
                        groups={groups}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" onSettings={() => go('/settings')} />}
                    />
                }
                top={
                    <TopBar
                        trail={page === 'editor' && board !== undefined ? [...trail(board.title), { label: 'Edit panel' }] : trail(title)}
                        actions={<ThemeToggle dark={dark} onToggle={() => setSettings({ ...settings, scheme: dark ? 'light' : 'dark' })} />}
                    />
                }
                foot={<Foot zone={prefs.zone} firing={firing} paused={paused} refresh={refresh} />}
            >
                {page === 'loading' || page === 'error' ? (
                    <PageState loading={page === 'loading'} error={boards.error}>
                        {null}
                    </PageState>
                ) : page === 'dashboards' ? (
                    <DashboardsPage dashboards={all} kept={kept} onCreate={() => setCreating(true)} />
                ) : page === 'dashboard' && board !== undefined ? (
                    <DashboardPage dashboard={board} view={view} params={place.params} all={all} onShare={() => setSharing(true)} />
                ) : page === 'editor' && board !== undefined ? (
                    <EditorPage key={`${board.id}/${panelId ?? 'new'}`} dashboard={board} panelId={panelId} view={view} kept={kept} />
                ) : page === 'alerts' ? (
                    <AlertsPage rules={ruleList.rows} fired={fired.rows} zone={prefs.zone} onNew={() => setNewRule(true)} />
                ) : page === 'settings' ? (
                    <SettingsPage prefs={prefs} frame={frame} />
                ) : (
                    <PageState loading={false} empty emptyMessage="Nothing is here. Pick a dashboard in the rail.">
                        {null}
                    </PageState>
                )}
            </Shell>
            {board !== undefined && <ShareDialog open={sharing} onOpenChange={setSharing} dashboard={board} view={view} />}
            <DashboardDialog open={creating} onOpenChange={setCreating} dashboards={all} kept={kept} />
            <RuleDialog open={newRule} onOpenChange={setNewRule} onSaved={() => go('/alerts')} />
            <Toaster position="bottom-right" />
        </StatusProvider>
    )
}

type PageName = 'loading' | 'error' | 'dashboards' | 'dashboard' | 'editor' | 'alerts' | 'settings' | 'missing'

/** Which page the place shows, sending a bare address to the first dashboard. */
function route(
    place: Place,
    {
        board,
        mode,
        loading,
        error,
        firstId,
    }: { board: unknown; mode: string | undefined; loading: boolean; error: string | undefined; firstId: string | undefined },
): PageName {
    const [section] = place.path
    if (section === 'alerts') return 'alerts'
    if (section === 'settings') return 'settings'
    if (section === 'dashboards') return 'dashboards'
    if (loading) return 'loading'
    if (error !== undefined) return 'error'
    if (section === undefined) {
        if (firstId !== undefined) queueMicrotask(() => window.location.replace(`#/d/${firstId}`))
        return firstId === undefined ? 'dashboards' : 'loading'
    }
    if (section !== 'd' || board === undefined) return 'missing'
    if (mode === 'edit' || mode === 'new') return 'editor'
    return 'dashboard'
}
