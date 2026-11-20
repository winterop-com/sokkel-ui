import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { NotFound } from '@winterop-com/sokkel-ui/NotFound'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import type { MapViewport } from '@winterop-com/sokkel-ui-maps/MapView'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    Crosshair,
    History as HistoryIcon,
    Map as MapIcon,
    Palette,
    Pause,
    Plane,
    Play,
    Radio,
    Settings as SettingsIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { APPEARANCE, settingsSection, type Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { REGION, retryLive, setView, useFeed } from './feed'
import { formatAltitude, nameOf, onGround } from './flights'
import { ADSB_LOL, liveAvailable, ODBL } from './live'
import { History } from './pages/History'
import { Flights } from './pages/Flights'
import { MapPage } from './pages/MapPage'
import { Settings } from './pages/Settings'
import { FlightPanel } from './parts/FlightPanel'
import { formatTime } from './parts/time'
import { DEFAULT_SETTINGS, setSettings, settings } from './settings'

/** Who is signed in to the watch. */
const ME = 'margaret'

const PLACES = ['map', 'flights', 'history'] as const
type Place = (typeof PLACES)[number]

const LABELS: Record<Place, string> = { map: 'Map', flights: 'Flights', history: 'History' }

/** Whether a position lies in a box of west, south, east and north. */
const inside = (lng: number, lat: number, [west, south, east, north]: MapViewport['bounds']) =>
    lng >= west && lng <= east && lat >= south && lat <= north

/** The watch inside the shell: the rail of places, the palette, the foot strip, a banner while live cannot be read, and the page the route names. */
export function Console({ frame }: { frame: Frame }) {
    const options = { ...DEFAULT_SETTINGS, ...useStore(settings) }
    const state = useFeed()
    const [followed, setFollowed] = useState<string | null>(null)
    const [viewport, setViewport] = useState<MapViewport>(REGION)

    // Settings open as a dialog over the page they were opened from.
    const overlay = useOverlayRoute(frame.route, 'settings')
    const [first, second] = overlay.route
    const place: Place = PLACES.includes(first as Place) ? (first as Place) : 'map'
    const missing = first !== undefined && first !== '' && !PLACES.includes(first as Place)
    const selected = place === 'map' && second !== undefined ? decodeURIComponent(second) : null
    const select = (id: string | null) => go(id === null ? '/map' : `/map/${encodeURIComponent(id)}`)

    const flights = state.flights
    const picked = selected === null ? undefined : flights.find((flight) => flight.id === selected)
    const airborne = flights.filter((flight) => !onGround(flight)).length
    const inView = useMemo(() => flights.filter((flight) => inside(flight.lon, flight.lat, viewport.bounds)), [flights, viewport])
    const live = state.source === 'live'
    const wantsLive = options.source === 'live'

    const groups: RailGroup[] = [
        {
            id: 'watch',
            entries: [
                { id: 'map', label: 'Map', icon: MapIcon, href: '#/map', description: 'Aircraft in the area' },
                {
                    id: 'flights',
                    label: 'Flights',
                    icon: Plane,
                    href: '#/flights',
                    description: 'Searched and filtered',
                    count: airborne > 0 ? airborne : undefined,
                },
                { id: 'history', label: 'History', icon: HistoryIcon, href: '#/history', description: 'The last hour played back' },
            ],
        },
        {
            id: 'system',
            entries: [{ id: 'settings', label: 'Settings', icon: SettingsIcon, href: '#/settings', description: 'Source, map, units' }],
        },
    ].map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: !missing && entry.id === place })) }))

    const palette: PaletteGroup[] = [
        {
            title: 'Watch',
            commands: [
                {
                    id: 'running',
                    label: options.running ? 'Pause the feed' : 'Resume the feed',
                    icon: options.running ? Pause : Play,
                    onSelect: () => setSettings({ running: !options.running }),
                },
                {
                    id: 'color',
                    label: options.colorBy === 'altitude' ? 'Color aircraft by affiliation' : 'Color aircraft by altitude',
                    icon: Palette,
                    onSelect: () => setSettings({ colorBy: options.colorBy === 'altitude' ? 'affiliation' : 'altitude' }),
                },
                ...(picked === undefined
                    ? []
                    : [
                          {
                              id: 'follow',
                              label: followed === picked.id ? `Stop following ${nameOf(picked)}` : `Follow ${nameOf(picked)}`,
                              icon: Crosshair,
                              onSelect: () => setFollowed(followed === picked.id ? null : picked.id),
                          },
                      ]),
                ...(liveAvailable()
                    ? [
                          {
                              id: 'source',
                              label: wantsLive ? 'Use the simulated feed' : 'Use the live feed',
                              icon: Radio,
                              onSelect: () => setSettings({ source: wantsLive ? 'simulated' : 'live' }),
                          },
                      ]
                    : []),
            ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        {
            title: 'Flights',
            commands: [...flights]
                .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
                .map((flight) => ({
                    id: `flight-${flight.id}`,
                    label: nameOf(flight),
                    icon: Plane,
                    code: flight.id,
                    hint: formatAltitude(flight, options.units),
                    keywords: [flight.id, String(flight.properties?.aircraftType ?? '')],
                    onSelect: () => select(flight.id),
                })),
        },
        ...frame.palette,
    ]

    const trail = missing
        ? [{ label: 'Not found' }]
        : place === 'map' && selected !== null
          ? [
                { label: 'Map', href: '#/map' },
                { label: picked === undefined ? selected : nameOf(picked), code: picked === undefined },
            ]
          : [{ label: LABELS[place] }]

    const page = missing ? (
        <Page>
            <NotFound />
        </Page>
    ) : place === 'flights' ? (
        <Page className="h-full">
            <Flights flights={flights} now={state.at} options={options} onOpen={(id) => select(id)} />
        </Page>
    ) : place === 'history' ? (
        <History options={options} live={wantsLive} />
    ) : (
        <MapPage
            flights={flights}
            at={state.at}
            options={options}
            selected={selected}
            onSelect={select}
            followed={followed === null ? undefined : flights.find((flight) => flight.id === followed)}
            onRelease={() => setFollowed(null)}
            onView={(next) => {
                setViewport(next)
                setView(next)
            }}
        />
    )

    const banner =
        wantsLive && state.fallback !== undefined ? (
            <Banner
                tone="warning"
                actions={
                    <>
                        {liveAvailable() && (
                            <Button variant="outline" size="sm" onClick={retryLive}>
                                Retry
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setSettings({ source: 'simulated' })}>
                            Use simulated
                        </Button>
                    </>
                }
            >
                The live feed cannot be read, so the simulation is shown. {state.fallback}
            </Banner>
        ) : undefined

    const zone = options.zone === 'utc' ? 'UTC' : undefined
    const note = !options.running
        ? 'Paused'
        : live
          ? `Live, read ${formatTime(state.at, zone)}`
          : `Simulated, ${formatTime(state.at, zone)}`

    return (
        <>
            <Shell
                palette={palette}
                paletteFilter="terms"
                desktop={frame.desktop}
                route={overlay.route.join('/')}
                banner={banner}
                panel={
                    place === 'map' && !missing ? (
                        <FlightPanel
                            flight={picked}
                            inView={inView}
                            at={state.at}
                            options={options}
                            followed={followed}
                            onFollow={setFollowed}
                            onSelect={select}
                        />
                    ) : undefined
                }
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/map"
                        name="Flight watch"
                        groups={groups}
                        foot={
                            <AccountMenu
                                name={ME}
                                where="tidevann.example.org"
                                onSettings={() => go('/settings')}
                                onAppearance={() => go(APPEARANCE)}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Flight watch', href: '#/map' }, ...trail]}
                        actions={
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSettings({ running: !options.running })}
                                aria-label={options.running ? 'Pause the feed' : 'Resume the feed'}
                            >
                                {options.running ? <Pause aria-hidden /> : <Play aria-hidden />}
                                {options.running ? 'Pause' : 'Resume'}
                            </Button>
                        }
                    />
                }
                foot={
                    <StatusLine live={options.running} tone={!options.running ? 'quiet' : wantsLive && !live ? 'warn' : 'live'} note={note}>
                        <StatusItem label="airborne">{airborne}</StatusItem>
                        <StatusItem label="on the ground">{flights.length - airborne}</StatusItem>
                        {live && (
                            <StatusItem label="data">
                                <TextLink href={ADSB_LOL} external variant="aside">
                                    adsb.lol
                                </TextLink>{' '}
                                <TextLink href={ODBL} external variant="aside">
                                    ODbL
                                </TextLink>
                            </StatusItem>
                        )}
                    </StatusLine>
                }
            >
                {page}
            </Shell>
            {overlay.open && (
                <Settings
                    options={options}
                    remaining={state.remaining}
                    appearance={frame.appearance}
                    section={settingsSection(frame.route)}
                    open
                    onClose={overlay.close}
                    onReset={frame.askReset}
                />
            )}
        </>
    )
}
