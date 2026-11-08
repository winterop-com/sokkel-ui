import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClipboardList, Inbox, LayoutDashboard, ServerCog } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { ServerMenu, type ServerState } from '@winterop-com/sokkel-ui/ServerMenu'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * The server an app talks to, at the end of the top bar: its state as a dot, its name and the
 * version it answers with, and a menu that says the state in words with what the server is, Check
 * again, and the app's own items.
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

function App({ initial, defaultOpen = false }: { initial: ServerState; defaultOpen?: boolean }) {
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
