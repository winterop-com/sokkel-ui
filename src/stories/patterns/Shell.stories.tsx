import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, CalendarClock, Play, Server, Workflow } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailEntry, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { makeRuns, startedAt, type TableRun } from '../fixtures/tableRuns'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * The app's frame: the rail, the top bar, the content that scrolls and the status foot, with a
 * banner between the top bar and the content, the rail's drawer on a phone, and the frame in a
 * desktop window whose native title bar is hidden.
 */
const meta: Meta = { title: 'Patterns/Shell' }
export default meta

const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#runs' },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#schedules' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#jobs' },
            { id: 'services', label: 'Services', icon: Server, href: '#services' },
        ],
    },
    { id: 'reference', title: 'Reference', entries: [{ id: 'docs', label: 'Docs', icon: BookOpen, href: '#docs' }] },
]

/** The rail's groups with the place shown marked active. */
const placesAt = (place: string): RailGroup[] =>
    GROUPS.map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: entry.id === place })) }))

const labelOf = (place: string) => GROUPS.flatMap((group) => group.entries).find((entry) => entry.id === place)?.label ?? place

const COLUMNS: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'project', header: 'Project', width: '7rem', cell: (run) => run.project },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} /> },
    { id: 'started', header: 'Started', width: '8rem', cell: (run) => startedAt(run.ago) },
]

/**
 * Tidevann's frame. A press on a place in the rail, or a place chosen in the palette, moves to it
 * through the shell's `route`, which closes the drawer however the place was reached.
 */
function Frame({ banner, collapsed: start = false, drawer = false }: { banner?: ReactNode; collapsed?: boolean; drawer?: boolean }) {
    const [collapsed, setCollapsed] = useState(start)
    const [drawerOpen, setDrawerOpen] = useState(drawer)
    const [place, setPlace] = useState('runs')
    const go = (entry: RailEntry) => setPlace(entry.id)
    return (
        <TooltipProvider>
            <Shell
                route={place}
                drawerOpen={drawerOpen}
                onDrawerOpenChange={setDrawerOpen}
                banner={banner}
                palette={placeCommands(GROUPS, (_, entry) => go(entry))}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={placesAt(place)}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        renderLink={(entry, children, className) => (
                            <a
                                href={entry.href}
                                aria-current={entry.active ? 'page' : undefined}
                                className={className}
                                onClick={(event) => {
                                    event.preventDefault()
                                    go(entry)
                                }}
                            >
                                {children}
                            </a>
                        )}
                        foot={
                            <AccountMenu
                                name="ada"
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSettings={() => undefined}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={<TopBar trail={[{ label: 'harbor', href: '#' }, { label: labelOf(place) }]} />}
                foot={
                    <StatusLine note="api.example.org">
                        <StatusItem label="project">harbor</StatusItem>
                        <StatusItem>1.4.0</StatusItem>
                    </StatusLine>
                }
            >
                <Page className="h-full">
                    <PageHeader title={labelOf(place)} description="Every run of every job in harbor, newest first." />
                    <DataTable columns={COLUMNS} rows={makeRuns(60)} rowKey={(run) => run.id} minWidth="36rem" className="min-h-0 flex-1" />
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

/**
 * A banner between the top bar and the content, for the app's news rather than one screen's: the
 * server has stopped answering. It does not scroll with the content and covers none of it.
 */
export const WithBanner: StoryObj = {
    name: 'Banner',
    render: function Render() {
        const [shown, setShown] = useState(true)
        return (
            <Frame
                banner={
                    shown && (
                        <Banner
                            tone="critical"
                            onDismiss={() => setShown(false)}
                            actions={
                                <Button size="sm" variant="outline">
                                    Retry
                                </Button>
                            }
                        >
                            <span className="font-mono">api.example.org</span> is not answering. Trying again every 10 seconds.
                        </Banner>
                    )
                }
            />
        )
    },
}

/**
 * On a phone the rail opens as a drawer from the top bar's menu button, here open. The app holds
 * the rail collapsed, as it shows on a wide window, and the drawer still draws it expanded, the
 * account with it; its head's end closes it. Escape, a press outside, a place chosen in it or in
 * the palette close it, and the focus goes back to the menu button.
 */
export const Drawer: StoryObj = { render: () => <Frame collapsed drawer /> }

function DesktopFrame({ collapsed: start = false }: { collapsed?: boolean }) {
    const [collapsed, setCollapsed] = useState(start)
    const [moves, setMoves] = useState({ drag: 0, zoom: 0 })
    return (
        <TooltipProvider>
            <Shell
                desktop={{
                    trafficLights: true,
                    onWindowDrag: () => setMoves((old) => ({ ...old, drag: old.drag + 1 })),
                    onWindowZoom: () => setMoves((old) => ({ ...old, zoom: old.zoom + 1 })),
                }}
                palette={placeCommands(GROUPS, () => undefined)}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={placesAt('runs')}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSignOut={() => undefined} />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'harbor', href: '#' }, { label: 'Runs' }]}
                        actions={
                            <Button size="sm" variant="outline">
                                Run now
                            </Button>
                        }
                    />
                }
                foot={
                    <StatusLine note="Connected to api.example.org">
                        <StatusItem label="moved">{moves.drag}</StatusItem>
                        <StatusItem label="zoomed">{moves.zoom}</StatusItem>
                    </StatusLine>
                }
            >
                <Page>
                    <PageHeader title="Runs" description="Every run of every job in harbor, newest first." />
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

/**
 * The frame in a desktop window whose native title bar is hidden. The story draws the window's
 * buttons where macOS puts them and outlines the strip that moves the window: the rail's head and
 * the top bar. Pressing the strip outside its controls counts a move in the status line, as
 * `onWindowDrag` would start one, and a double click counts a zoom. The expanded rail's head
 * leaves room for the window's buttons before the mark.
 */
export const Desktop: StoryObj = { parameters: { desktopWindow: true }, render: () => <DesktopFrame /> }

/**
 * A collapsed rail is narrower than the buttons: its head stays empty under them, its edge
 * undrawn there, the mark just below, and the top bar leaves what is left of the room.
 */
export const CollapsedRail: StoryObj = {
    name: 'Collapsed rail',
    parameters: { desktopWindow: true },
    render: () => <DesktopFrame collapsed />,
}
