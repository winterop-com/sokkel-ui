import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClipboardList, Inbox, LayoutDashboard, ServerCog } from 'lucide-react'
import { useState } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { ServerMenu, type ServerCheck, type ServerMenuProps, type ServerState } from '@winterop-com/sokkel-ui/ServerMenu'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip, type StatusMap } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * The server an app talks to, at the end of the top bar: its state as a dot, its name and the
 * version it answers with, and a menu that says the state in words with what the server is, Check
 * again, and the app's own items. An app may name states of its own, keep the face quiet until
 * something is wrong, list the checks behind the state, or open its own pane in place of the menu.
 */
const meta: Meta = { title: 'Patterns/Server menu', parameters: { layout: 'fullscreen' } }
export default meta

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#', active: true },
            { id: 'forms', label: 'Forms', icon: ClipboardList, href: '#' },
            { id: 'responses', label: 'Responses', icon: Inbox, href: '#' },
            { id: 'server', label: 'Server', icon: ServerCog, href: '#' },
        ],
    },
]

const FACTS = ['records.example.org', 'Serves 8 kinds of record and 3 operations', 'Keeps what it receives on disk']

/** Tidevann's own states for its services, beside up, down and checking. */
const STATES: StatusMap = {
    healthy: { label: 'Healthy', color: 'good' },
    degraded: { label: 'Degraded', color: 'warning' },
    unhealthy: { label: 'Unhealthy', color: 'critical' },
}

const HEALTHY: ServerCheck[] = [
    { name: 'api', state: 'healthy', detail: '42 ms' },
    { name: 'worker', state: 'healthy', detail: '3 jobs running' },
    { name: 'scheduler', state: 'healthy', detail: 'next run at 02:00' },
]

const DEGRADED: ServerCheck[] = [
    { name: 'api', state: 'healthy', detail: '48 ms' },
    { name: 'worker', state: 'degraded', detail: '214 jobs queued' },
    { name: 'scheduler', state: 'healthy', detail: 'next run at 02:00' },
]

const UNHEALTHY: ServerCheck[] = [
    { name: 'api', state: 'healthy', detail: '51 ms' },
    { name: 'worker', state: 'unhealthy', detail: 'no answer for 5 minutes' },
    { name: 'scheduler', state: 'degraded', detail: 'last run skipped' },
]

type Server = Partial<Omit<ServerMenuProps, 'state' | 'onCheck'>>

function App({ initial, defaultOpen = false, ...server }: { initial: ServerState } & Server) {
    const [state, setState] = useState(initial)
    const check = () => {
        setState('checking')
        window.setTimeout(() => setState(initial === 'checking' ? 'up' : initial), 1200)
    }
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={GROUPS} />}
                top={
                    <TopBar
                        onSearch={() => undefined}
                        actions={
                            <ServerMenu
                                name="Tidevann records"
                                version="2.4.0"
                                state={state}
                                facts={FACTS}
                                onCheck={check}
                                defaultOpen={defaultOpen}
                                {...server}
                            >
                                <DropdownMenuItem>
                                    <ServerCog aria-hidden />
                                    What this server offers
                                </DropdownMenuItem>
                            </ServerMenu>
                        }
                    />
                }
            >
                <Page>
                    <PageHeader title="Overview" description="What the server holds right now." />
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

/** Answering: a green dot beside the name and the version. */
export const Up: StoryObj = { render: () => <App initial="up" /> }

/** The menu open: the state in words, the server's facts, Check again and the app's own item. */
export const Open: StoryObj = { render: () => <App initial="up" defaultOpen /> }

/** Not answering: a red dot, and the menu says so; Check again asks it once more. */
export const Down: StoryObj = { render: () => <App initial="down" defaultOpen /> }

/** Asking the server: the dot pulses and Check again turns, shut until the answer comes. */
export const Checking: StoryObj = { render: () => <App initial="checking" defaultOpen /> }

/**
 * The app's own states: degraded in the warning color, the menu saying so, and every check behind
 * it (api, worker, scheduler) listed with its state and detail, as the face's tooltip lists them too.
 */
export const Degraded: StoryObj = {
    render: () => <App initial="degraded" name="Tidevann" version="3.1.0" states={STATES} checks={DEGRADED} defaultOpen />,
}

/** A quiet face while all is well: the dot alone, the name and version kept in the menu and the tooltip's checks. */
export const Quiet: StoryObj = {
    render: () => <App initial="healthy" name="Tidevann" version="3.1.0" states={STATES} checks={HEALTHY} quiet />,
}

/** A quiet face when something is wrong: the dot says its words, here Unhealthy in the critical color. */
export const QuietUnhealthy: StoryObj = {
    name: 'Quiet, unhealthy',
    render: () => <App initial="unhealthy" name="Tidevann" version="3.1.0" states={STATES} checks={UNHEALTHY} quiet />,
}

/** Pressing the face opens the app's own pane about the server in place of the menu; here a dialog of its services. */
function Pressed() {
    const [open, setOpen] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={GROUPS} />}
                top={
                    <TopBar
                        onSearch={() => undefined}
                        actions={
                            <ServerMenu
                                name="Tidevann"
                                version="3.1.0"
                                state="degraded"
                                states={STATES}
                                checks={DEGRADED}
                                quiet
                                onPress={() => setOpen(true)}
                            />
                        }
                    />
                }
            >
                <Page>
                    <PageHeader title="Overview" description="What the server holds right now." />
                </Page>
                <DialogShell open={open} onOpenChange={setOpen} title="Server" description="Tidevann 3.1.0 at tidevann.example.org">
                    <DescriptionList
                        items={DEGRADED.map((one) => ({
                            term: one.name,
                            value: (
                                <>
                                    <StatusChip status={one.state} statuses={STATES} /> {one.detail}
                                </>
                            ),
                        }))}
                    />
                </DialogShell>
            </Shell>
        </TooltipProvider>
    )
}

/** Pressing the face calls the app, which opens its own pane about the server; no menu is drawn. */
export const Press: StoryObj = { render: () => <Pressed /> }
