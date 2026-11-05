import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    BookOpen,
    CalendarClock,
    ChevronsUpDownIcon,
    FileText,
    MoreHorizontalIcon,
    Play,
    PlusIcon,
    Server,
    Settings,
    Webhook,
    Workflow,
    type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { ListTable, type Column } from '../../components/ListTable'
import { PageHeader } from '../../components/PageHeader'
import { StatusChip, type Status } from '../../components/StatusChip'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
} from '../../components/ui/sidebar'
import { PersonAvatar } from '../../components/PersonAvatar'

/**
 * The app's side navigation and the frame around it. On a desktop it sits fixed at the edge and
 * folds away or down to icons; below 768px it becomes a sheet the trigger opens.
 */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

interface Entry {
    label: string
    icon: LucideIcon
    active?: boolean
    badge?: string
}

const GROUPS: { title: string; entries: Entry[] }[] = [
    {
        title: 'Operate',
        entries: [
            { label: 'Runs', icon: Play, badge: '2' },
            { label: 'Schedules', icon: CalendarClock },
        ],
    },
    {
        title: 'Build',
        entries: [
            { label: 'Jobs', icon: Workflow, active: true },
            { label: 'Services', icon: Server },
            { label: 'Webhooks', icon: Webhook },
        ],
    },
    {
        title: 'Reference',
        entries: [
            { label: 'Docs', icon: FileText },
            { label: 'Examples', icon: BookOpen },
        ],
    },
]

const JOBS = ['import-orders', 'nightly-export', 'sync-inventory', 'rebuild-index']

function Workspace() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip="Tidevann">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        <Workflow />
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-medium">Tidevann</span>
                        <span className="truncate font-mono text-xs text-muted-foreground">api.example.org</span>
                    </span>
                    <ChevronsUpDownIcon className="ml-auto" />
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

function Navigation() {
    return (
        <>
            {GROUPS.map((group) => (
                <SidebarGroup key={group.title}>
                    <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                    {group.title === 'Build' ? (
                        <SidebarGroupAction title="New job">
                            <PlusIcon />
                        </SidebarGroupAction>
                    ) : null}
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {group.entries.map((entry) => (
                                <SidebarMenuItem key={entry.label}>
                                    <SidebarMenuButton isActive={entry.active} tooltip={entry.label} render={<a href="#" />}>
                                        <entry.icon />
                                        <span>{entry.label}</span>
                                    </SidebarMenuButton>
                                    {entry.badge ? <SidebarMenuBadge>{entry.badge}</SidebarMenuBadge> : null}
                                    {entry.active ? (
                                        <SidebarMenuSub>
                                            {JOBS.map((code) => (
                                                <SidebarMenuSubItem key={code}>
                                                    <SidebarMenuSubButton href="#" isActive={code === 'import-orders'}>
                                                        <span className="font-mono">{code}</span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    ) : null}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ))}
        </>
    )
}

function Account() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings">
                    <Settings />
                    <span>Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip="ada">
                    <PersonAvatar name="ada" initials="AL" size="md" />
                    <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-medium">Ada Lovelace</span>
                        <span className="truncate font-mono text-xs text-muted-foreground">ada</span>
                    </span>
                </SidebarMenuButton>
                <SidebarMenuAction aria-label="Account menu">
                    <MoreHorizontalIcon />
                </SidebarMenuAction>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

interface Run {
    id: string
    status: Status
    at: string
    took: string
}

const RUNS: Run[] = [
    { id: '01a1a5c6', status: 'succeeded', at: '2026-11-04 15:02', took: '1.2s' },
    { id: '01a1a5c2', status: 'failed', at: '2026-11-04 14:02', took: '0.3s' },
    { id: '01a1a5b9', status: 'succeeded', at: '2026-11-04 13:02', took: '1.4s' },
    { id: '01a1a5b1', status: 'running', at: '2026-11-04 15:04', took: '-' },
]

const COLUMNS: Column<Run>[] = [
    { id: 'run', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'state', header: 'State', width: '7rem', cell: (run) => <StatusChip status={run.status} /> },
    { id: 'started', header: 'Started', width: 'minmax(0,1fr)', cell: (run) => <span className="tabular-nums">{run.at}</span> },
    { id: 'took', header: 'Took', width: '4rem', align: 'end', cell: (run) => <span className="tabular-nums">{run.took}</span> },
]

function Frame({
    variant = 'sidebar',
    collapsible = 'offcanvas',
    defaultOpen = true,
}: {
    variant?: 'sidebar' | 'floating' | 'inset'
    collapsible?: 'offcanvas' | 'icon'
    defaultOpen?: boolean
}) {
    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <Sidebar variant={variant} collapsible={collapsible}>
                <SidebarHeader>
                    <Workspace />
                    <SidebarInput placeholder="Search" aria-label="Search" className="group-data-[collapsible=icon]:hidden" />
                </SidebarHeader>
                <SidebarContent>
                    <Navigation />
                </SidebarContent>
                <SidebarSeparator />
                <SidebarFooter>
                    <Account />
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>
            <SidebarInset>
                <header className="flex h-12 items-center gap-2 border-b border-border px-4">
                    <SidebarTrigger />
                    <span className="text-sm text-muted-foreground">Jobs</span>
                    <span className="text-sm text-muted-foreground">/</span>
                    <span className="font-mono text-sm">import-orders</span>
                </header>
                <div className="flex max-w-[1100px] flex-col gap-4 p-6">
                    <PageHeader title="Import orders" code="import-orders" />
                    <ListTable columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

/** A static sidebar, not fixed to the edge, so several can stand side by side. */
function Static({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider className="min-h-0 w-auto">
            <Sidebar collapsible="none" className="h-auto rounded-lg border border-sidebar-border">
                {children}
            </Sidebar>
        </SidebarProvider>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Sidebar' }
export default meta

export const AppFrame: StoryObj = { render: () => <Frame /> }

export const Floating: StoryObj = { render: () => <Frame variant="floating" /> }

export const Inset: StoryObj = { render: () => <Frame variant="inset" /> }

export const CollapsedToIcons: StoryObj = { render: () => <Frame collapsible="icon" defaultOpen={false} /> }

export const Variants: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-wrap items-start gap-6">
                <div className="flex flex-col gap-2">
                    <Caption>menu button sizes and variants</Caption>
                    <Static>
                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarMenu>
                                    {(
                                        [
                                            ['default', 'default'],
                                            ['default', 'sm'],
                                            ['default', 'lg'],
                                            ['outline', 'default'],
                                        ] as const
                                    ).map(([variant, size]) => (
                                        <SidebarMenuItem key={`${variant}-${size}`}>
                                            <SidebarMenuButton variant={variant} size={size}>
                                                <Workflow />
                                                <span>
                                                    {variant}, {size}
                                                </span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                    <SidebarMenuItem>
                                        <SidebarMenuButton isActive>
                                            <Workflow />
                                            <span>active</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroup>
                        </SidebarContent>
                    </Static>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>states: disabled and loading</Caption>
                    <Static>
                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarGroupLabel>Services</SidebarGroupLabel>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton disabled>
                                            <Server />
                                            <span>scheduler</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    {[0, 1, 2].map((at) => (
                                        <SidebarMenuItem key={at}>
                                            <SidebarMenuSkeleton showIcon />
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        </SidebarContent>
                    </Static>
                </div>
            </div>
        </div>
    ),
}
