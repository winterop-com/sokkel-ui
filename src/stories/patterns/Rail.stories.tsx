import { IconButton } from '../../components/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Bell,
    BookOpen,
    Bookmark,
    CalendarClock,
    Ellipsis,
    Files,
    FlaskConical,
    House,
    LayoutDashboard,
    MessagesSquare,
    Play,
    Plus,
    Server,
    Webhook,
    Workflow,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Rail, type RailEntry, type RailGroup } from '../../components/Rail'
import { TooltipProvider } from '../../components/ui/tooltip'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Row } from '../../components/Layout'

/**
 * The app's navigation down the left of the window. As a strip it is the narrow column a team chat
 * keeps on its far left, each entry an icon over its short label; expanded and collapsed it is the
 * navigation every other app uses. An entry carries a count of what waits there, or a dot for
 * something new without a number.
 */
const meta: Meta = { title: 'Patterns/Rail' }
export default meta

/** The rail at the full height of the window, as an app's shell holds it. */
function Frame({ children }: { children: ReactNode }) {
    return (
        <TooltipProvider>
            <Row gap="none" align="stretch" className="h-svh bg-background">
                {children}
            </Row>
        </TooltipProvider>
    )
}

function strip(waiting: boolean, nested = false): RailGroup[] {
    const entries: RailEntry[] = [
        { id: 'home', label: 'Home', icon: House, href: '#', active: true },
        { id: 'dms', label: 'DMs', icon: MessagesSquare, href: '#', count: waiting ? 3 : undefined },
        { id: 'activity', label: 'Activity', icon: Bell, href: '#', count: waiting ? 128 : undefined },
        { id: 'files', label: 'Files', icon: Files, href: '#', unread: waiting },
        {
            id: 'more',
            label: 'More',
            icon: Ellipsis,
            entries: nested
                ? [
                      { id: 'saved', label: 'Saved', icon: Bookmark, href: '#' },
                      { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
                      { id: 'docs', label: 'Docs', icon: BookOpen, href: '#' },
                  ]
                : undefined,
            href: nested ? undefined : '#',
        },
    ]
    return [{ id: 'places', entries }]
}

/** The foot of a strip: a button that makes something new, and the account's avatar with its presence. */
const STRIP_FOOT = (
    <>
        <IconButton label="Create" variant="secondary" size="icon-lg">
            <Plus aria-hidden />
        </IconButton>
        <IconButton label="Account" size="icon-lg">
            <PersonAvatar name="ada" color="blue" size="lg" shape="square" presence="active" />
        </IconButton>
    </>
)

const NAV: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true, count: 3 },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#', unread: true },
            { id: 'services', label: 'Services', icon: Server, href: '#', count: 12 },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook, href: '#' },
        ],
    },
    { id: 'learn', title: 'Learn', entries: [{ id: 'docs', label: 'Docs', icon: BookOpen, href: '#' }] },
]

/** The navigation with parents: Evaluate folds its pages with Compare active, and Services leads to its own page beside its fold. */
const NESTED: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
            { id: 'runs', label: 'Runs', icon: Play, href: '#', count: 3 },
            {
                id: 'evaluate',
                label: 'Evaluate',
                icon: FlaskConical,
                entries: [
                    { id: 'summary', label: 'Summary', href: '#' },
                    { id: 'compare', label: 'Compare', href: '#', active: true },
                    { id: 'benchmarks', label: 'Benchmarks', href: '#', count: 2 },
                ],
            },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#', unread: true },
            {
                id: 'services',
                label: 'Services',
                icon: Server,
                href: '#',
                entries: [
                    { id: 'api', label: 'api', href: '#' },
                    { id: 'worker', label: 'worker', href: '#' },
                    { id: 'scheduler', label: 'scheduler', href: '#' },
                ],
            },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook, href: '#' },
        ],
    },
]

/** A rail of text alone: no icons, Evaluate unfolded with its pages indented under its label, and Jobs active. */
const TEXT: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', href: '#' },
            { id: 'runs', label: 'Runs', href: '#' },
            {
                id: 'evaluate',
                label: 'Evaluate',
                entries: [
                    { id: 'summary', label: 'Summary', href: '#' },
                    { id: 'compare', label: 'Compare', href: '#' },
                    { id: 'benchmarks', label: 'Benchmarks', href: '#' },
                ],
            },
            { id: 'schedules', label: 'Schedules', href: '#' },
            { id: 'models', label: 'Models', href: '#' },
            { id: 'jobs', label: 'Jobs', href: '#', active: true },
        ],
    },
]

/** The labeled strip: the workspace's tile at the top, each place an icon over its label with Home on a soft wash, and the foot's create button and account. */
export const Strip: StoryObj = {
    render: () => (
        <Frame>
            <Rail variant="strip" mark={<TidevannMark className="size-5" />} name="Tidevann" groups={strip(false)} foot={STRIP_FOOT} />
        </Frame>
    ),
}

/** The strip with what waits: a small count at an icon's upper corner, clear of the icon and the column's edge, from one digit to 99+, and a dot for Files, new without a number. */
export const Counts: StoryObj = {
    render: () => (
        <Frame>
            <Rail variant="strip" mark={<TidevannMark className="size-5" />} name="Tidevann" groups={strip(true)} foot={STRIP_FOOT} />
        </Frame>
    ),
}

/** The strip with a parent: More opens its places in a flyout beside the column. */
export const StripFlyout: StoryObj = {
    name: 'Strip flyout',
    render: () => (
        <Frame>
            <Rail
                variant="strip"
                mark={<TidevannMark className="size-5" />}
                name="Tidevann"
                groups={strip(false, true)}
                foot={STRIP_FOOT}
                defaultFlyout="more"
            />
        </Frame>
    ),
}

/** The navigation collapsed to icons, for comparison: counts over the icons and a dot on Jobs, each entry named in a tooltip. */
export const Collapsed: StoryObj = {
    render: () => (
        <Frame>
            <Rail
                mark={<TidevannMark />}
                name="Tidevann"
                groups={NAV}
                collapsed
                onCollapsedChange={() => undefined}
                foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed onSettings={() => undefined} />}
            />
        </Frame>
    ),
}

/** The navigation expanded, for comparison: titled groups, the active entry's accent bar, counts at the rows' ends and a dot on Jobs. */
export const Expanded: StoryObj = {
    render: () => (
        <Frame>
            <Rail
                mark={<TidevannMark />}
                name="Tidevann"
                groups={NAV}
                onCollapsedChange={() => undefined}
                foot={<AccountMenu name="ada" where="tidevann.example.org" onSettings={() => undefined} />}
            />
        </Frame>
    ),
}

/** Parents in the expanded rail: Evaluate holds the active Compare and starts unfolded, its pages lined up under its label; Services has a page of its own, so only its chevron folds it. */
export const Nested: StoryObj = {
    render: () => (
        <Frame>
            <Rail
                mark={<TidevannMark />}
                name="Tidevann"
                groups={NESTED}
                onCollapsedChange={() => undefined}
                foot={<AccountMenu name="ada" where="tidevann.example.org" onSettings={() => undefined} />}
            />
        </Frame>
    ),
}

/** A rail without icons, its labels lined up as text: Evaluate unfolded with its pages indented under it, and Jobs active. */
export const TextOnly: StoryObj = {
    name: 'Text only',
    render: () => (
        <Frame>
            <Rail
                mark={<TidevannMark />}
                name="Tidevann"
                groups={TEXT}
                defaultOpen={['evaluate']}
                onCollapsedChange={() => undefined}
                foot={<AccountMenu name="ada" where="tidevann.example.org" onSettings={() => undefined} />}
            />
        </Frame>
    ),
}

/** Parents in the collapsed rail: Evaluate wears the accent for the active Compare, and its flyout lists its pages. */
export const NestedCollapsed: StoryObj = {
    name: 'Nested collapsed',
    render: () => (
        <Frame>
            <Rail
                mark={<TidevannMark />}
                name="Tidevann"
                groups={NESTED}
                collapsed
                onCollapsedChange={() => undefined}
                defaultFlyout="evaluate"
                foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed onSettings={() => undefined} />}
            />
        </Frame>
    ),
}
