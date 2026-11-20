import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { NotFound } from '@winterop-com/sokkel-ui/NotFound'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Toaster, createToastManager } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { TRACKING_WORDS } from '@winterop-com/sokkel-ui-tracking/affiliation'
import type { TrackAffiliation } from '@winterop-com/sokkel-ui-tracking/track'
import { Hexagon, ListChecks, Moon, Pause, Play, Plus, Radar, ScrollText, Settings as SettingsIcon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { APPEARANCE, settingsSection, useFrame } from 'tidevann-shared/frame'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'
import { isOpen, ME } from './data'
import { formatClock } from './format'
import { Log } from './pages/Log'
import { isNight, setNight, Settings } from './pages/Settings'
import { Tasks } from './pages/Tasks'
import { followTrack, shownAt, Watch, WatchPanel, WatchTimeline } from './pages/Watch'
import { Zones } from './pages/Zones'
import { TaskDialog } from './parts/TaskDialog'
import { setSettings } from './settings'
import { CARRIED } from './themes'
import { picked, useWatch, WatchProvider } from './watch'

/** The notices in the corner: a contact turned hostile, or a new one heard. */
const notices = createToastManager()

const PLACES = ['watch', 'tasks', 'zones', 'log'] as const
type Place = (typeof PLACES)[number]

const LABELS: Record<Place, string> = { watch: 'Watch', tasks: 'Tasks', zones: 'Zones', log: 'Log' }

/** Tells when a live track turns hostile, with a way to it. */
function Notices() {
    const watch = useWatch()
    const before = useRef<Map<string, TrackAffiliation> | null>(null)
    useEffect(() => {
        const now = new Map(watch.picture.tracks.map((track) => [track.id, track.affiliation]))
        const last = before.current
        before.current = now
        if (last === null) return
        for (const track of watch.picture.tracks) {
            const was = last.get(track.id)
            if (track.affiliation !== 'hostile' || was === undefined || was === 'hostile') continue
            notices.add({
                title: `${track.label ?? track.id} is hostile`,
                description: `It was ${TRACKING_WORDS.affiliations[was].toLowerCase()}.`,
                type: 'error',
                timeout: 8000,
                actionProps: {
                    children: 'Show',
                    onClick: () => {
                        shownAt.set(null)
                        followTrack(track.id)
                        go('/watch')
                    },
                },
            })
        }
    }, [watch.picture.tracks])
    return null
}

/** The watch inside the shell: the rail, the palette, the foot strip, and the page the route names. */
function Board({ frame }: { frame: ReturnType<typeof useFrame> }) {
    const watch = useWatch()
    const { options } = watch
    const at = useStore(shownAt)
    const [setting, setSetting] = useState(false)
    const overlay = useOverlayRoute(frame.route, 'settings')
    const [first] = overlay.route
    const place: Place = PLACES.includes(first as Place) ? (first as Place) : 'watch'
    const missing = first !== undefined && first !== '' && !PLACES.includes(first as Place)
    const tracks = watch.picture.tracks
    const open = (watch.tasks ?? []).filter(isOpen)
    const hostile = tracks.filter((track) => track.affiliation === 'hostile').length
    const night = isNight(frame.appearance)

    const groups: RailGroup[] = [
        {
            id: 'watch',
            entries: [
                { id: 'watch', label: 'Watch', icon: Radar, href: '#/watch', description: 'The tracks on the map' },
                {
                    id: 'tasks',
                    label: 'Tasks',
                    icon: ListChecks,
                    href: '#/tasks',
                    description: 'Investigate, follow, report',
                    count: open.length > 0 ? open.length : undefined,
                },
                { id: 'zones', label: 'Zones', icon: Hexagon, href: '#/zones', description: 'The areas the watch keeps' },
                { id: 'log', label: 'Log', icon: ScrollText, href: '#/log', description: 'What happened, and who did what' },
            ],
        },
        {
            id: 'system',
            entries: [{ id: 'settings', label: 'Settings', icon: SettingsIcon, href: '#/settings', description: 'Units, feed, look' }],
        },
    ].map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: entry.id === place })) }))

    const palette: PaletteGroup[] = [
        {
            title: 'Watch',
            commands: [
                { id: 'task', label: 'New task', icon: Plus, onSelect: () => setSetting(true) },
                {
                    id: 'feed',
                    label: options.paused ? 'Resume the feed' : 'Pause the feed',
                    icon: options.paused ? Play : Pause,
                    onSelect: () => setSettings({ paused: !options.paused }),
                },
                {
                    id: 'night',
                    label: night ? 'Leave night watch' : 'Night watch',
                    icon: night ? Sun : Moon,
                    keywords: ['darkroom', 'red'],
                    onSelect: () => setNight(frame.appearance, !night),
                },
                ...(at === null ? [] : [{ id: 'live', label: 'Back to live', icon: Radar, onSelect: () => shownAt.set(null) }]),
            ],
        },
        ...placeCommands(groups, (href) => go(href.slice(1)), { title: 'Go to' }),
        {
            title: 'Tracks',
            commands: tracks.map((track) => ({
                id: `track-${track.id}`,
                label: track.label ?? track.id,
                icon: Radar,
                hint: TRACKING_WORDS.affiliations[track.affiliation],
                keywords: [track.id, TRACKING_WORDS.kinds[track.kind]],
                onSelect: () => {
                    picked.set(track.id)
                    go('/watch')
                },
            })),
        },
        ...frame.palette,
    ]

    const page = missing ? (
        <NotFound />
    ) : place === 'tasks' ? (
        <Tasks />
    ) : place === 'zones' ? (
        <Zones />
    ) : place === 'log' ? (
        <Log />
    ) : (
        <Watch />
    )

    const note =
        at !== null
            ? `Playing back ${formatClock(at)}`
            : options.paused
              ? `Paused at ${formatClock(watch.now)}`
              : `Live ${formatClock(watch.now)}`

    return (
        <>
            <Shell
                palette={palette}
                paletteFilter="terms"
                desktop={frame.desktop}
                route={overlay.route.join('/')}
                panel={place === 'watch' && !missing ? <WatchPanel /> : undefined}
                bottom={place === 'watch' && !missing ? <WatchTimeline /> : undefined}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#/watch"
                        name="Harbor watch"
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
                        trail={[{ label: 'Harbor watch', href: '#/watch' }, { label: missing ? 'Not found' : LABELS[place] }]}
                        actions={
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSettings({ paused: !options.paused })}
                                aria-label={options.paused ? 'Resume the feed' : 'Pause the feed'}
                            >
                                {options.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                                {options.paused ? 'Paused' : 'Live'}
                            </Button>
                        }
                    />
                }
                foot={
                    <StatusLine live={!options.paused && at === null} tone={at === null && !options.paused ? 'live' : 'quiet'} note={note}>
                        <StatusItem label="tracks">{tracks.length}</StatusItem>
                        <StatusItem label="hostile">{hostile}</StatusItem>
                        <StatusItem label="open tasks">{open.length}</StatusItem>
                        <StatusItem label="speed">{`${String(options.speed)}×`}</StatusItem>
                    </StatusLine>
                }
            >
                {place === 'watch' && !missing ? page : <Page className={place === 'tasks' ? undefined : 'h-full'}>{page}</Page>}
            </Shell>
            <TaskDialog open={setting} onOpenChange={setSetting} tracks={tracks} all={watch.tasks ?? []} now={watch.now} />
            {overlay.open && (
                <Settings
                    options={options}
                    appearance={frame.appearance}
                    themes={frame.themes}
                    section={settingsSection(frame.route)}
                    onClose={overlay.close}
                />
            )}
        </>
    )
}

/** The harbor watch: the console, tasks, zones and the log inside the shell, over the simulated feed. */
export function App() {
    const frame = useFrame(CARRIED)
    return (
        <TooltipProvider>
            <WatchProvider>
                <Toaster toastManager={notices}>
                    <Notices />
                    <Board frame={frame} />
                </Toaster>
            </WatchProvider>
            {frame.dialogs}
        </TooltipProvider>
    )
}
