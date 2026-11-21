import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { NotFound } from '@winterop-com/sokkel-ui/NotFound'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { BellOff, Map as MapIcon, MonitorPlay, Radio, Settings as SettingsIcon } from 'lucide-react'
import { Fragment, useState } from 'react'
import { APPEARANCE, settingsSection, type Frame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'

import { Operator, OperatorPanel } from './pages/Operator'
import { Settings } from './pages/Settings'
import { SourcePanel, Sources } from './pages/Sources'
import { Wall } from './pages/Wall'
import { SOURCE_ICONS } from './parts/words'
import { SOURCES } from './sources'
import { change } from './store'
import { openWall } from './transport'
import { clockTime, useWatch } from './watch'

/** Who is signed in to the site. */
const ME = 'grace'

const PLACES = ['operator', 'sources', 'wall'] as const
type Place = (typeof PLACES)[number]

/** The control site: the wall alone on its own route, and the operator's console in the shell on every other. */
export function Console({ frame }: { frame: Frame }) {
    const watch = useWatch()
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
    // Settings open as a dialog over the page they were opened from.
    const overlay = useOverlayRoute(frame.route, 'settings')
    const [first, second] = overlay.route
    const place: Place = PLACES.includes(first as Place) ? (first as Place) : 'operator'
    const missing = first !== undefined && first !== '' && !PLACES.includes(first as Place)
    const opened = place === 'sources' && second !== undefined ? decodeURIComponent(second) : null
    const { state, shared, open, options } = watch

    const settings = overlay.open && (
        <Settings
            watch={watch}
            appearance={frame.appearance}
            section={settingsSection(frame.route)}
            open
            onClose={overlay.close}
            onReset={frame.askReset}
        />
    )
    if (place === 'wall' && !missing)
        return (
            <>
                <Wall watch={watch} />
                {settings}
            </>
        )

    const groups: RailGroup[] = [
        {
            id: 'site',
            entries: [
                { id: 'operator', label: 'Operator', icon: MapIcon, href: '#/operator', description: 'The map, the roster and the alerts' },
                {
                    id: 'sources',
                    label: 'Sources',
                    icon: Radio,
                    href: '#/sources',
                    description: 'Each source, its checks and its history',
                    count: open.length > 0 ? open.length : undefined,
                },
                { id: 'wall', label: 'Wall', icon: MonitorPlay, href: '#/wall', description: 'The site for a screen on a wall' },
            ],
        },
        {
            id: 'system',
            entries: [{ id: 'settings', label: 'Settings', icon: SettingsIcon, href: '#/settings', description: 'Sources, wall, map' }],
        },
    ].map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: !missing && entry.id === place })) }))

    const palette: PaletteGroup[] = [
        {
            title: 'Site',
            commands: [
                { id: 'wall-window', label: 'Open wall in new window', icon: MonitorPlay, onSelect: openWall },
                ...(open.length > 0
                    ? [
                          {
                              id: 'acknowledge',
                              label: 'Acknowledge every alert',
                              icon: BellOff,
                              onSelect: () => watch.acknowledge(open.map((alert) => alert.id)),
                          },
                      ]
                    : []),
                ...(shared.playhead === null
                    ? []
                    : [{ id: 'live', label: 'Return to live', icon: Radio, onSelect: () => change({ playhead: null }) }]),
            ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        {
            title: 'Sources',
            commands: SOURCES.map((source) => ({
                id: `source-${source.id}`,
                label: source.label,
                icon: SOURCE_ICONS[source.id] ?? Radio,
                hint: state.sources.find((each) => each.id === source.id)?.status,
                onSelect: () => go(`/sources/${source.id}`),
            })),
        },
        ...frame.palette,
    ]

    const picked = state.sources.find((source) => source.id === opened)
    const trail = missing
        ? [{ label: 'Not found' }]
        : place === 'sources'
          ? picked === undefined
              ? [{ label: 'Sources' }]
              : [{ label: 'Sources', href: '#/sources' }, { label: picked.label }]
          : [{ label: 'Operator' }]

    const down = state.sources.filter((source) => source.status === 'down')
    const live = state.sources.filter((source) => source.mode === 'live')
    const credited = SOURCES.filter((source) => source.attribution !== undefined && live.some((each) => each.id === source.id))
    const banner =
        down.length > 0 ? (
            <Banner
                tone="warning"
                actions={
                    <Button variant="outline" size="sm" onClick={() => go('/sources')}>
                        Sources
                    </Button>
                }
            >
                {down.map((source) => source.label).join(', ')} {down.length === 1 ? 'is' : 'are'} down
                {down.some((source) => source.fallback) ? '; the simulation is shown in its place.' : '.'}
            </Banner>
        ) : undefined

    return (
        <>
            <Shell
                palette={palette}
                paletteFilter="terms"
                desktop={frame.desktop}
                route={overlay.route.join('/')}
                banner={banner}
                panel={
                    missing ? undefined : place === 'sources' ? (
                        <SourcePanel watch={watch} id={opened} />
                    ) : (
                        <OperatorPanel watch={watch} hidden={hidden} onHiddenChange={setHidden} />
                    )
                }
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/operator"
                        name="Control site"
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
                        trail={[{ label: 'Control site', href: '#/operator' }, ...trail]}
                        actions={
                            <IconButton label="Open wall in new window" variant="ghost" size="icon-sm" onClick={openWall}>
                                <MonitorPlay aria-hidden />
                            </IconButton>
                        }
                    />
                }
                foot={
                    <StatusLine
                        live={shared.playhead === null}
                        tone={shared.playhead !== null ? 'quiet' : down.length > 0 ? 'warn' : 'live'}
                        note={
                            shared.playhead !== null
                                ? `Played back, ${clockTime(shared.playhead, options.zone)}`
                                : `${watch.leading ? 'Reading the sources' : 'Following another window'}, ${clockTime(watch.now, options.zone)}`
                        }
                    >
                        <StatusItem label="open alerts">{String(open.length)}</StatusItem>
                        {credited.length > 0 && (
                            <StatusItem label="data">
                                {credited.map((source, index) => (
                                    <Fragment key={source.id}>
                                        {index > 0 && ', '}
                                        <TextLink href={source.attribution?.href ?? ''} external variant="aside">
                                            {source.attribution?.short}
                                        </TextLink>
                                    </Fragment>
                                ))}
                            </StatusItem>
                        )}
                    </StatusLine>
                }
            >
                {missing ? (
                    <Page>
                        <NotFound />
                    </Page>
                ) : place === 'sources' ? (
                    <Sources watch={watch} opened={opened} />
                ) : (
                    <Operator watch={watch} hidden={hidden} />
                )}
            </Shell>
            {settings}
        </>
    )
}
