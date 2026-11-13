import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    ArrowRightLeft,
    Boxes,
    CircleAlert,
    Database,
    Globe,
    LayoutDashboard,
    Pause,
    PhoneCall,
    Play,
    Server,
    Settings as SettingsIcon,
    Siren,
    SquareArrowOutUpRight,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'

import type { Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { type Person, SERVICE_IDS, type ServiceId, SERVICES, SITE_BY_ID, SITES } from './data'
import { useLive, worstOf } from './live'
import { Incident } from './pages/Incident'
import { Incidents } from './pages/Incidents'
import { OnCall } from './pages/OnCall'
import { Overview } from './pages/Overview'
import { Regions } from './pages/Regions'
import { Services } from './pages/Services'
import { Settings } from './pages/Settings'
import { HandOverDialog } from './parts/HandOverDialog'
import { NewIncidentDialog } from './parts/NewIncidentDialog'
import { useRows } from './rows'
import { DEFAULT_SETTINGS, setSettings, settings } from './settings'
import { formatClock, type Health, healthCss } from './status'

/** A service's page carries the charts and the graph, so it loads when first opened. */
const Service = lazy(() => import('./pages/Service').then((module) => ({ default: module.Service })))

/** Who is signed in to the board. */
const ME: Person = 'ada'

const PLACES = ['overview', 'incidents', 'services', 'regions', 'on-call'] as const
type Place = (typeof PLACES)[number]

const LABELS: Record<Place, string> = {
    overview: 'Overview',
    incidents: 'Incidents',
    services: 'Services',
    regions: 'Regions',
    'on-call': 'On call',
}

const BANNER_TONE: Record<Health, 'critical' | 'warning' | 'info' | 'good'> = {
    outage: 'critical',
    degraded: 'warning',
    maintenance: 'info',
    operational: 'good',
}

/** The board inside the shell: the rail of places, the palette, the foot strip, a banner while anything is wrong, and the page the route names. */
export function Board({ frame }: { frame: Frame }) {
    const options = { ...DEFAULT_SETTINGS, ...useStore(settings) }
    const state = useLive()
    const rows = useRows()
    const [reporting, setReporting] = useState(false)
    const [handingOver, setHandingOver] = useState(false)
    const { settings: look, setSettings: setLook } = frame.appearance

    // Settings open as a dialog over the page they were opened from.
    const overlay = useOverlayRoute(frame.route, 'settings')
    const [first, second, third] = overlay.route
    const place: Place = PLACES.includes(first as Place) ? (first as Place) : 'overview'
    const service = place === 'services' && SERVICE_IDS.includes(second as ServiceId) ? (second as ServiceId) : undefined
    const incident = place === 'incidents' ? rows.incidents?.find((one) => one.id === second) : undefined

    const open = (rows.incidents ?? []).filter((one) => one.state !== 'resolved')
    const worst = worstOf(SERVICE_IDS.map((id) => state.health[id]))
    const wrong = SERVICE_IDS.filter((id) => state.health[id] === 'degraded' || state.health[id] === 'outage')
    const wrongSites = SITES.filter((site) => state.siteHealth[site.id] !== 'operational')
    const onCallNow = rows.onCall?.person

    const groups: RailGroup[] = [
        {
            id: 'board',
            entries: [
                {
                    id: 'overview',
                    label: 'Overview',
                    icon: LayoutDashboard,
                    href: '#/',
                    description: 'Everything at a glance',
                },
                {
                    id: 'incidents',
                    label: 'Incidents',
                    icon: Siren,
                    href: '#/incidents',
                    description: 'Open and past',
                    count: open.length > 0 ? open.length : undefined,
                },
                {
                    id: 'services',
                    label: 'Services',
                    icon: Boxes,
                    href: '#/services',
                    description: 'Latency and deploys',
                    dot: worst === 'operational' ? undefined : healthCss(worst),
                },
                {
                    id: 'regions',
                    label: 'Regions',
                    icon: Globe,
                    href: '#/regions',
                    description: 'Sites on a map',
                    dot: wrongSites.length === 0 ? undefined : healthCss(worstOf(wrongSites.map((site) => state.siteHealth[site.id]))),
                },
                {
                    id: 'on-call',
                    label: 'On call',
                    icon: PhoneCall,
                    href: '#/on-call',
                    description: onCallNow === undefined ? 'The rotation' : `${onCallNow} now`,
                },
            ],
        },
        {
            id: 'public',
            title: 'Customers',
            entries: [
                { id: 'public', label: 'Status page', icon: SquareArrowOutUpRight, href: '#/public', description: 'What customers see' },
            ],
        },
        {
            id: 'system',
            entries: [
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: SettingsIcon,
                    href: '#/settings',
                    description: 'Readings, notices, demo',
                },
            ],
        },
    ].map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: entry.id === place })) }))

    const palette: PaletteGroup[] = [
        {
            title: 'Status',
            commands: [
                { id: 'report', label: 'Report an incident', icon: Siren, onSelect: () => setReporting(true) },
                { id: 'hand-over', label: 'Hand over on call', icon: ArrowRightLeft, onSelect: () => setHandingOver(true) },
                {
                    id: 'live',
                    label: options.live ? 'Pause live readings' : 'Resume live readings',
                    icon: options.live ? Pause : Play,
                    onSelect: () => setSettings({ live: !options.live }),
                },
                { id: 'public', label: 'Open the status page', icon: SquareArrowOutUpRight, onSelect: () => go('/public') },
            ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        {
            title: 'Services',
            commands: SERVICES.map((one) => ({
                id: `service-${one.id}`,
                label: one.id,
                icon: one.store ? Database : Server,
                hint: state.health[one.id],
                detail: one.description,
                keywords: [one.host, one.group],
                onSelect: () => go(`/services/${one.id}`),
            })),
        },
        {
            title: 'Incidents',
            commands: [...open, ...(rows.incidents ?? []).filter((one) => one.state === 'resolved')].map((one) => ({
                id: `incident-${one.id}`,
                label: one.title,
                icon: CircleAlert,
                code: one.code,
                hint: one.state,
                keywords: [...one.services, ...one.sites.map((id) => SITE_BY_ID[id]?.city ?? id), one.assignee],
                onSelect: () => go(`/incidents/${one.id}`),
            })),
        },
        ...frame.palette,
    ]

    const trail =
        service !== undefined
            ? [{ label: 'Services', href: '#/services' }, { label: service }]
            : place === 'incidents' && second !== undefined
              ? [
                    { label: 'Incidents', href: '#/incidents' },
                    { label: incident?.code ?? second, code: true },
                ]
              : [{ label: LABELS[place] }]

    const page =
        place === 'incidents' ? (
            second === undefined ? (
                <Incidents me={ME} onReport={() => setReporting(true)} />
            ) : (
                <Incident id={second} me={ME} options={options} />
            )
        ) : place === 'services' ? (
            service === undefined ? (
                <Services />
            ) : (
                <Suspense fallback={<PageState loading>{null}</PageState>}>
                    <Service id={service} day={third} me={ME} options={options} onReport={() => setReporting(true)} />
                </Suspense>
            )
        ) : place === 'regions' ? (
            <Regions />
        ) : place === 'on-call' ? (
            <OnCall options={options} onHandOver={() => setHandingOver(true)} />
        ) : (
            <Overview options={options} onReport={() => setReporting(true)} />
        )

    // The listings fill the page's height, so their tables scroll inside it.
    const fills = (place === 'incidents' && second === undefined) || (place === 'services' && service === undefined) || place === 'regions'

    const covering = open.find((one) => one.services.some((id) => wrong.includes(id)))
    const banner =
        wrong.length === 0 ? undefined : (
            <Banner
                tone={BANNER_TONE[worst]}
                actions={
                    covering === undefined ? (
                        <Button variant="outline" size="sm" onClick={() => setReporting(true)}>
                            Report incident
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => go(`/incidents/${covering.id}`)}>
                            Open {covering.code}
                        </Button>
                    )
                }
            >
                {wrong.map((id) => `${id} ${state.health[id] === 'outage' ? 'is down' : 'is degraded'}`).join(', ')}
            </Banner>
        )

    return (
        <>
            <Shell
                palette={palette}
                paletteFilter="terms"
                desktop={frame.desktop}
                route={overlay.route.join('/')}
                banner={banner}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/"
                        name="Status"
                        groups={groups}
                        foot={
                            <AccountMenu
                                name={ME}
                                where="tidevann.example.org"
                                scheme={look.scheme}
                                onSchemeChange={(scheme) => setLook({ ...look, scheme })}
                                onSettings={() => go('/settings')}
                                onSignOut={() => go('/public')}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Status', href: '#/' }, ...trail]}
                        actions={
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSettings({ live: !options.live })}
                                    aria-label={options.live ? 'Pause live readings' : 'Resume live readings'}
                                >
                                    {options.live ? <Pause aria-hidden /> : <Play aria-hidden />}
                                    {options.live ? 'Live' : 'Paused'}
                                </Button>
                            </>
                        }
                    />
                }
                foot={
                    <StatusLine
                        live={options.live}
                        tone={options.live ? 'live' : 'quiet'}
                        note={options.live ? `Live, last reading ${formatClock(new Date(state.at), options.clock)}` : 'Paused'}
                    >
                        <StatusItem label="operational">
                            {SERVICE_IDS.filter((id) => state.health[id] === 'operational').length}/{SERVICE_IDS.length}
                        </StatusItem>
                        <StatusItem label="open">{open.length}</StatusItem>
                        {onCallNow !== undefined && <StatusItem label="on call">{onCallNow}</StatusItem>}
                    </StatusLine>
                }
            >
                <Page className={fills ? 'h-full' : undefined}>{page}</Page>
            </Shell>
            <NewIncidentDialog open={reporting} onOpenChange={setReporting} me={ME} service={service} />
            <HandOverDialog open={handingOver} onOpenChange={setHandingOver} />
            {overlay.open && <Settings options={options} appearance={frame.appearance} open onClose={overlay.close} />}
        </>
    )
}
