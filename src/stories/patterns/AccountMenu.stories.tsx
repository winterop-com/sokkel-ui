import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, FolderGit2, Play, Workflow } from 'lucide-react'
import { useState } from 'react'

import { AccountMenu, type AccountMenuProps } from '@winterop-com/sokkel-ui/AccountMenu'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import type { Scheme } from '@winterop-com/sokkel-ui/lib/appearance'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * The account in the rail's foot: who is signed in and where, and the menu that opens upward from
 * it with settings, the keyboard shortcuts, the scheme and signing out. On a phone its rows are a
 * finger's height and Keyboard shortcuts is left out.
 */
const meta: Meta = { title: 'Patterns/Account menu' }
export default meta

const PLACES: RailGroup[] = [
    {
        id: 'operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
        ],
    },
]

/** The menu open in the foot of Tidevann's rail, at the full height of the window. */
function Foot({ railSize, ...props }: Omit<AccountMenuProps, 'scheme' | 'onSchemeChange'> & { railSize?: number }) {
    const [scheme, setScheme] = useState<Scheme>('system')
    return (
        <TooltipProvider>
            <Row gap="none" align="stretch" className="h-svh bg-background">
                <Rail
                    mark={<TidevannMark />}
                    name="Tidevann"
                    groups={PLACES}
                    defaultSize={railSize}
                    foot={<AccountMenu {...props} scheme={scheme} onSchemeChange={setScheme} defaultOpen />}
                />
            </Row>
        </TooltipProvider>
    )
}

/**
 * Signed in: the person and the host at the head, Settings, Keyboard shortcuts with its key, a row
 * the app adds with an icon of its own, the scheme as three rows with the one in use checked, which
 * stay open as one is chosen, and Sign out.
 */
export const SignedIn: StoryObj = {
    name: 'Signed in',
    render: () => (
        <Foot
            name="ada"
            image={pictureOf('ada')}
            where="tidevann.example.org"
            onSettings={() => undefined}
            onShortcuts={() => undefined}
            extra={[{ id: 'project', label: 'Switch project', icon: FolderGit2, onSelect: () => undefined }]}
            onSignOut={() => undefined}
        />
    ),
}

/** A role beside the name: "admin", muted, in the rail's foot and in the menu's head. */
export const Role: StoryObj = {
    render: () => (
        <Foot
            name="grace"
            image={pictureOf('grace')}
            detail="admin"
            where="tidevann.example.org"
            onSettings={() => undefined}
            onShortcuts={() => undefined}
            onSignOut={() => undefined}
        />
    ),
}

/**
 * A rail at its narrowest: the name keeps the row's room and the role gives way in the face,
 * still said beside the name in the menu's head.
 */
export const NarrowRail: StoryObj = {
    name: 'Narrow rail',
    render: () => (
        <Foot
            name="margaret"
            image={pictureOf('margaret')}
            detail="admin"
            where="tidevann.example.org"
            railSize={200}
            onSettings={() => undefined}
            onShortcuts={() => undefined}
            onSignOut={() => undefined}
        />
    ),
}

/** No one signed in: the neutral figure for the avatar, and Sign in with its own icon where Sign out would stand. */
export const Local: StoryObj = {
    render: () => <Foot name="Local" where="No server" local onSettings={() => undefined} onSignIn={() => undefined} />,
}
