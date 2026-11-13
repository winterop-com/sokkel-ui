import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteCommand, PaletteGroup, PaletteSearch } from '@winterop-com/sokkel-ui/CommandPalette'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import {
    Banknote,
    CalendarRange,
    FileText,
    Filter,
    GitCompareArrows,
    LayoutDashboard,
    ListFilter,
    Pause,
    Play,
    Plus,
    Settings as SettingsIcon,
    Target,
    Users,
    type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { funnels, invoiceViews, reports } from './collections'
import { EVERYONE, levels } from './metrics'
import { PLAN_NAMES, counted } from './model'
import { Customer } from './pages/Customer'
import { Customers } from './pages/Customers'
import { Funnels } from './pages/Funnels'
import { Goals } from './pages/Goals'
import { Overview } from './pages/Overview'
import { Reports } from './pages/Reports'
import { Revenue } from './pages/Revenue'
import { Settings } from './pages/Settings'
import { useApp } from './state'
import { go, PRESETS } from './view'
import { standing } from './world'

const PAGES = ['overview', 'revenue', 'customers', 'funnels', 'reports', 'goals'] as const
type PageId = (typeof PAGES)[number]

const LABELS: Record<PageId | 'settings' | 'missing', string> = {
    overview: 'Overview',
    revenue: 'Revenue',
    customers: 'Customers',
    funnels: 'Funnels',
    reports: 'Reports',
    goals: 'Goals',
    settings: 'Settings',
    missing: 'Not found',
}

/** Tidevann's analytics: the rail of its pages, the palette, the page the address names, and the live stream's state at the foot. */
export function Analytics({ frame }: { frame: Frame }) {
    const { world, error, view, settingsOpen, href, prefs, setPrefs, setView, stream, money } = useApp()
    const { settings: look, setSettings: setLook } = frame.appearance
    // Settings open as a dialog over the page they were opened from, which keeps its whole address,
    // range and segment included, to go back to.
    const settings = useOverlayRoute(settingsOpen ? ['settings'] : frame.route, 'settings')
    const shown = view
    const [first = 'overview', second] = shown.path
    const page: PageId | 'missing' = (PAGES as readonly string[]).includes(first) ? (first as PageId) : 'missing'
    const views = useCollection(invoiceViews).rows ?? []
    const savedFunnels = useCollection(funnels).rows ?? []
    const savedReports = useCollection(reports).rows ?? []

    const { paying, mrr } = useMemo(() => {
        if (world === undefined) return { paying: 0, mrr: 0 }
        const now = levels(world, EVERYONE, [world.now])
        return { paying: now.paying[0] ?? 0, mrr: now.mrr[0] ?? 0 }
    }, [world])
    const entry = (id: PageId | 'settings', icon: LucideIcon, description: string, count?: number) => ({
        id,
        label: LABELS[id],
        icon,
        description,
        href: href(id === 'overview' ? '' : id),
        active: page === id,
        ...(count === undefined ? {} : { count }),
    })
    const groups: RailGroup[] = [
        { id: 'home', entries: [entry('overview', LayoutDashboard, 'Key figures and the live feed')] },
        {
            id: 'sales',
            title: 'Sales',
            entries: [
                entry('revenue', Banknote, 'MRR, breakdowns and invoices'),
                entry('customers', Users, 'Every team and what it pays', paying),
            ],
        },
        {
            id: 'explore',
            title: 'Explore',
            entries: [
                entry('funnels', ListFilter, 'How far teams get, step by step'),
                entry('reports', FileText, 'Panels put together, as CSV'),
                entry('goals', Target, 'Targets read live'),
            ],
        },
        { id: 'system', title: 'System', entries: [entry('settings', SettingsIcon, 'Preferences and demo data')] },
    ]

    const paused = prefs.pace === 'off'
    const toggleStream = () => void setPrefs({ pace: paused ? 'fast' : 'off' })
    const saved: PaletteCommand[] = [
        ...views.map((one) => ({
            id: `view-${one.id}`,
            label: one.name,
            icon: Filter,
            hint: 'Invoices',
            keywords: ['view', 'invoices'],
            onSelect: () => go(href('revenue/invoices', { view: one.id })),
        })),
        ...savedFunnels.map((one) => ({
            id: `funnel-${one.id}`,
            label: one.name,
            icon: ListFilter,
            hint: 'Funnel',
            keywords: ['funnel'],
            onSelect: () => go(href(`funnels/${one.id}`)),
        })),
        ...savedReports.map((one) => ({
            id: `report-${one.id}`,
            label: one.name,
            icon: FileText,
            hint: 'Report',
            keywords: ['report'],
            onSelect: () => go(href(`reports/${one.id}`)),
        })),
    ]
    const palette: PaletteGroup[] = [
        ...placeCommands(groups, (target) => go(target)),
        { title: 'Saved', rank: 5, commands: saved },
        {
            title: 'Create',
            rank: 6,
            commands: [
                { id: 'new-funnel', label: 'New funnel', icon: Plus, onSelect: () => go(href('funnels/new')) },
                { id: 'new-report', label: 'New report', icon: Plus, onSelect: () => go(href('reports/new')) },
                { id: 'new-goal', label: 'New goal', icon: Plus, onSelect: () => go(href('goals', { new: '1' })) },
            ],
        },
        {
            title: 'View',
            rank: 7,
            commands: [
                ...PRESETS.map((preset) => ({
                    id: `range-${preset.id}`,
                    label: `Show ${preset.label.toLowerCase()}`,
                    icon: CalendarRange,
                    keywords: ['range', 'period'],
                    onSelect: () => setView({ range: { preset: preset.id } }),
                })),
                {
                    id: 'compare',
                    label: view.compare ? 'Stop comparing with the period before' : 'Compare with the period before',
                    icon: GitCompareArrows,
                    onSelect: () => setView({ compare: !view.compare }),
                },
                {
                    id: 'stream',
                    label: paused ? 'Resume the live stream' : 'Pause the live stream',
                    icon: paused ? Play : Pause,
                    keywords: ['live', 'events'],
                    onSelect: toggleStream,
                },
            ],
        },
        ...frame.palette,
    ]

    const search: PaletteSearch = {
        minQuery: 2,
        debounce: 80,
        search: (query) => {
            if (world === undefined) return []
            const wanted = query.trim().toLowerCase()
            const found = world.teams.filter((team) => team.name.toLowerCase().includes(wanted))
            const results = found
                .map((team) => ({ team, now: standing(team, world.now) }))
                .sort((left, right) => right.now.mrr - left.now.mrr)
                .slice(0, 8)
                .map(({ team, now }) => ({
                    id: team.id,
                    title: team.name,
                    detail: `${PLAN_NAMES[now.plan]}${now.status === 'churned' ? ', left' : ''}, ${team.country}`,
                    meta: now.mrr > 0 ? `${money(now.mrr)} a month` : undefined,
                    icon: Users,
                }))
            return [{ kind: 'customers', title: 'Customers', results, total: found.length }]
        },
        onOpen: (result) => go(href(`customers/${result.id}`)),
        words: { searching: 'Looking' },
    }

    const customer = page === 'customers' && second !== undefined ? world?.byId.get(second) : undefined
    const trail: Crumb[] = [{ label: prefs.workspace, href: href('') }]
    if (page === 'customers' && second !== undefined)
        trail.push({ label: LABELS.customers, href: href('customers') }, { label: customer?.name ?? second })
    else if (page === 'revenue' && second === 'invoices')
        trail.push({ label: LABELS.revenue, href: href('revenue') }, { label: 'Invoices' })
    else trail.push({ label: LABELS[page] })

    let content
    if (world === undefined)
        content = (
            <PageState loading={error === undefined} error={error}>
                {null}
            </PageState>
        )
    else if (page === 'overview') content = <Overview />
    else if (page === 'revenue') content = <Revenue tab={second === 'invoices' ? 'invoices' : 'breakdowns'} />
    else if (page === 'customers') content = second === undefined ? <Customers /> : <Customer key={second} id={second} />
    else if (page === 'funnels') content = <Funnels id={second} />
    else if (page === 'reports') content = <Reports id={second} />
    else if (page === 'goals') content = <Goals />
    else
        content = (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>Nothing at this address</EmptyTitle>
                    <EmptyDescription>There is no page at #/{shown.path.join('/')}.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go(href(''))}>
                    Go to the overview
                </Button>
            </Empty>
        )
    const fills = (page === 'customers' && second === undefined) || (page === 'revenue' && second === 'invoices')
    const note =
        stream === 'live'
            ? paused
                ? 'Live stream paused'
                : `Live: ${prefs.pace === 'fast' ? 'an event every second or two' : 'an event every few seconds'}`
            : stream === 'off'
              ? 'Live stream paused'
              : stream === 'hidden'
                ? 'Live stream waits while the page is hidden'
                : 'Live stream stopped at its limit: reset the demo data to start it again'

    return (
        <Shell
            palette={palette}
            paletteSearch={search}
            paletteFilter="terms"
            desktop={frame.desktop}
            route={shown.path.join('/')}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref={href('')}
                    name={prefs.workspace}
                    groups={groups}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            local
                            onSettings={() => go(href('settings'))}
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
                            <IconButton
                                label={paused ? 'Resume the live stream' : 'Pause the live stream'}
                                variant="ghost"
                                size="icon-sm"
                                onClick={toggleStream}
                            >
                                {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                            </IconButton>
                        </>
                    }
                />
            }
            foot={
                <StatusLine live={stream === 'live' && !paused} tone={stream === 'full' ? 'warn' : undefined} note={note}>
                    <StatusItem label="MRR">{money(mrr, true)}</StatusItem>
                    <StatusItem label="live">{counted(world?.liveCount ?? 0, 'change')}</StatusItem>
                </StatusLine>
            }
        >
            <Page className={fills ? 'h-full' : undefined}>{content}</Page>
            {settings.open && world !== undefined && <Settings frame={frame} open onClose={settings.close} />}
        </Shell>
    )
}
