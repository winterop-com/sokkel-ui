import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, CalendarClock, Play, Server, Workflow } from 'lucide-react'
import { useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * The app's frame in a desktop window whose native title bar is hidden. The story draws the
 * window's buttons where macOS puts them and outlines the strip that moves the window: the rail's
 * head and the top bar. Pressing the strip outside its controls counts a move in the status
 * line, as `onWindowDrag` would start one, and a double click counts a zoom.
 */
const meta: Meta = { title: 'Patterns/Shell', parameters: { desktopWindow: true } }
export default meta

const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
            { id: 'services', label: 'Services', icon: Server, href: '#' },
        ],
    },
    { id: 'reference', title: 'Reference', entries: [{ id: 'docs', label: 'Docs', icon: BookOpen, href: '#' }] },
]

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
                        groups={GROUPS}
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

/** The expanded rail's head leaves room for the window's buttons before the mark. */
export const Desktop: StoryObj = { render: () => <DesktopFrame /> }

/**
 * A collapsed rail is narrower than the buttons: its head stays empty under them, its edge
 * undrawn there, the mark just below, and the top bar leaves what is left of the room.
 */
export const CollapsedRail: StoryObj = { name: 'Collapsed rail', render: () => <DesktopFrame collapsed /> }
