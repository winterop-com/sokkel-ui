import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Download,
    Gauge,
    KeyRound,
    LayoutDashboard,
    ListChecks,
    MoreHorizontal,
    Play,
    Plus,
    ScrollText,
    ShieldCheck,
    TriangleAlert,
    UserPlus,
    Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { AddressInput, isAddress, type Address } from '../../components/AddressInput'
import { DashboardGrid, KpiRow, SPAN } from '../../components/dashboard/DashboardGrid'
import { BarGauge } from '../../components/dashboard/BarGauge'
import type { PanelSeries } from '../../components/dashboard/series'
import type { Threshold } from '../../components/dashboard/thresholds'
import { TimeSeriesPanel } from '../../components/dashboard/TimeSeriesPanel'
import { DescriptionList } from '../../components/DescriptionList'
import { ConfirmDialog, DialogShell } from '../../components/DialogShell'
import { DiffView } from '../../components/DiffView'
import { Field } from '../../components/Field'
import { FilterChip } from '../../components/FilterChip'
import { ListTable, type Column } from '../../components/ListTable'
import { PageHeader } from '../../components/PageHeader'
import { countChanges, PermissionMatrix, type Grants, type MatrixGroup, type MatrixRole } from '../../components/PermissionMatrix'
import { Rail, type RailGroup } from '../../components/Rail'
import { SaveBar } from '../../components/SaveBar'
import { SearchField } from '../../components/SearchField'
import { SecretReveal } from '../../components/SecretReveal'
import { Section } from '../../components/Section'
import { Segmented } from '../../components/Segmented'
import { Page, Shell } from '../../components/Shell'
import { PanelSection, SidePanel } from '../../components/SidePanel'
import { StatusChip, type Status } from '../../components/StatusChip'
import { TopBar, type Crumb } from '../../components/TopBar'
import { Avatar, AvatarFallback, AvatarGroup } from '../../components/ui/avatar'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { TooltipProvider } from '../../components/ui/tooltip'
import { cn } from '../../lib/cn'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * Tidevann's administration side: the members with their roles and pending invites, the roles
 * against what each may do, the API tokens with a new one shown once, the audit log with an
 * event's before and after in the side panel, and the plan's usage.
 */
type View = 'members' | 'roles' | 'tokens' | 'audit' | 'usage'

const ROLE_IDS = ['owner', 'admin', 'editor', 'viewer', 'operator'] as const
type Role = (typeof ROLE_IDS)[number]

const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', editor: 'Editor', viewer: 'Viewer', operator: 'Operator' }

const ROLE_ABOUT: Record<Role, string> = {
    owner: 'Everything, the plan and billing included.',
    admin: 'Everything but changing the plan.',
    editor: 'Builds and runs jobs in every project.',
    viewer: 'Reads projects and runs, changes nothing.',
    operator: 'Starts and schedules runs, reads secrets.',
}

type MemberState = 'active' | 'invited' | 'suspended'

const MEMBER_STATE: Record<MemberState, Status> = { active: 'succeeded', invited: 'pending', suspended: 'cancelled' }

interface Member {
    username: string
    name: string
    email: string
    role: Role
    active: string
    state: MemberState
}

const MEMBERS: Member[] = [
    { username: 'ada', name: 'Ada Berg', email: 'ada@example.org', role: 'owner', active: 'now', state: 'active' },
    { username: 'grace', name: 'Grace Holm', email: 'grace@example.org', role: 'admin', active: '12 min ago', state: 'active' },
    { username: 'linus', name: 'Linus Dahl', email: 'linus@example.org', role: 'editor', active: '2 h ago', state: 'active' },
    { username: 'margaret', name: 'Margaret Lund', email: 'margaret@example.org', role: 'operator', active: 'yesterday', state: 'active' },
    { username: 'ops', name: 'Operations', email: 'ops@example.org', role: 'viewer', active: 'Oct 12', state: 'suspended' },
    { username: '', name: 'data@example.org', email: 'data@example.org', role: 'editor', active: '-', state: 'invited' },
]

interface Invite {
    email: string
    role: Role
    by: string
    sent: string
    expires: string
}

const INVITES: Invite[] = [
    { email: 'data@example.org', role: 'editor', by: 'grace', sent: 'Nov 2', expires: 'in 5 days' },
    { email: 'oncall@example.org', role: 'viewer', by: 'ada', sent: 'Oct 30', expires: 'tomorrow' },
]

function groups(view: View): RailGroup[] {
    return [
        {
            id: 'work',
            entries: [
                { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
                { id: 'runs', label: 'Runs', icon: Play, href: '#' },
                { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#' },
            ],
        },
        {
            id: 'admin',
            title: 'Admin',
            entries: [
                { id: 'members', label: 'Members', icon: Users, href: '#', active: view === 'members' },
                { id: 'roles', label: 'Roles', icon: ShieldCheck, href: '#', active: view === 'roles' },
                { id: 'tokens', label: 'API tokens', icon: KeyRound, href: '#', active: view === 'tokens' },
                { id: 'audit', label: 'Audit log', icon: ScrollText, href: '#', active: view === 'audit' },
                { id: 'usage', label: 'Usage', icon: Gauge, href: '#', active: view === 'usage' },
            ],
        },
    ]
}

const TITLES: Record<View, string> = { members: 'Members', roles: 'Roles', tokens: 'API tokens', audit: 'Audit log', usage: 'Usage' }

const trail = (view: View): Crumb[] => [{ label: 'Tidevann', href: '#' }, { label: 'Admin', href: '#' }, { label: TITLES[view] }]

/** A person's round mark: the first letter of their username, or of their address. */
function Person({ who, size = 'sm' }: { who: string; size?: 'sm' | 'default' }) {
    return (
        <Avatar size={size}>
            <AvatarFallback className="bg-primary/15 font-medium text-primary-ink uppercase">{who.slice(0, 1)}</AvatarFallback>
        </Avatar>
    )
}

/* Members */

function MemberMenu({ member, onRemove }: { member: Member; onRemove: (member: Member) => void }) {
    const [role, setRole] = useState<string>(member.role)
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={`Actions for ${member.username || member.email}`}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
                <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-36">
                        <DropdownMenuRadioGroup value={role} onValueChange={setRole}>
                            {ROLE_IDS.map((id) => (
                                <DropdownMenuRadioItem key={id} value={id}>
                                    {ROLE_LABEL[id]}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem>{member.state === 'suspended' ? 'Reactivate' : 'Suspend'}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onRemove(member)}>
                    Remove
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function memberColumns(onRemove: (member: Member) => void): Column<Member>[] {
    return [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(10rem,1.2fr)',
            cell: (member) => (
                <span className="flex min-w-0 items-center gap-2.5">
                    <Person who={member.username || member.email} />
                    <span className="truncate">{member.name}</span>
                </span>
            ),
        },
        {
            id: 'username',
            header: 'Username',
            width: '7rem',
            cell: (member) =>
                member.username === '' ? (
                    <span className="text-faint">-</span>
                ) : (
                    <span className="font-mono text-muted-foreground">{member.username}</span>
                ),
        },
        { id: 'email', header: 'Email', width: 'minmax(0,1fr)', cell: (member) => <span className="truncate">{member.email}</span> },
        { id: 'role', header: 'Role', width: '6rem', cell: (member) => ROLE_LABEL[member.role] },
        {
            id: 'active',
            header: 'Last active',
            width: '6.5rem',
            cell: (member) => <span className="text-muted-foreground tabular-nums">{member.active}</span>,
        },
        {
            id: 'state',
            header: 'Status',
            width: '6rem',
            cell: (member) => <StatusChip status={MEMBER_STATE[member.state]} label={member.state} />,
        },
        {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            width: '2rem',
            align: 'end',
            cell: (member) => <MemberMenu member={member} onRemove={onRemove} />,
        },
    ]
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [emails, setEmails] = useState<Address[]>([
        { address: 'data@example.org' },
        { address: 'support@example.org' },
        { address: 'margaret@example' },
    ])
    const [role, setRole] = useState<Role>('editor')
    const bad = emails.filter((email) => !isAddress(email.address)).length
    const why = emails.length === 0 ? 'Add at least one address.' : bad > 0 ? 'Fix or remove the addresses that are not valid.' : undefined
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="Invite people"
            description="Each address gets an email with a link that works for seven days."
            confirm={{
                label: emails.length > 1 ? `Send ${String(emails.length)} invites` : 'Send invite',
                onConfirm: () => onOpenChange(false),
                why,
            }}
        >
            <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Email addresses</span>
                <AddressInput value={emails} onChange={setEmails} autoFocus words={{ placeholder: 'Email addresses' }} />
                <p className={cn('text-xs', bad > 0 ? 'text-critical-ink' : 'text-muted-foreground')}>
                    {bad === 0
                        ? 'Separate them with commas, or paste a list.'
                        : bad === 1
                          ? '1 address is not valid.'
                          : `${String(bad)} addresses are not valid.`}
                </p>
            </div>
            <div className="flex flex-col gap-1.5">
                <span id="invite-role" className="text-sm font-medium">
                    Role
                </span>
                <RadioGroup aria-labelledby="invite-role" value={role} onValueChange={(next) => setRole(next as Role)} className="gap-0">
                    {ROLE_IDS.filter((id) => id !== 'owner').map((id) => (
                        <label
                            key={id}
                            className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-control px-2 py-2 hover:bg-secondary/60',
                                role === id && 'bg-secondary',
                            )}
                        >
                            <RadioGroupItem value={id} className="mt-0.5" />
                            <span className="flex min-w-0 flex-col">
                                <span className="text-sm font-medium">{ROLE_LABEL[id]}</span>
                                <span className="text-xs text-muted-foreground">{ROLE_ABOUT[id]}</span>
                            </span>
                        </label>
                    ))}
                </RadioGroup>
            </div>
        </DialogShell>
    )
}

function MembersPage({ inviting = false }: { inviting?: boolean }) {
    const [query, setQuery] = useState('')
    const [role, setRole] = useState<string>('all')
    const [invite, setInvite] = useState(inviting)
    const [removing, setRemoving] = useState<Member | null>(null)
    const q = query.trim().toLowerCase()
    const rows = MEMBERS.filter(
        (member) =>
            (role === 'all' || member.role === role) && `${member.name} ${member.username} ${member.email}`.toLowerCase().includes(q),
    )
    const roleItems = [{ value: 'all', label: 'All roles' }, ...ROLE_IDS.map((id) => ({ value: id, label: ROLE_LABEL[id] }))]
    return (
        <Page>
            <PageHeader
                title="Members"
                count="5 members, 1 invited"
                actions={
                    <Button size="sm" onClick={() => setInvite(true)}>
                        <UserPlus aria-hidden />
                        Invite
                    </Button>
                }
            />
            <div className="flex flex-wrap items-center gap-2">
                <SearchField value={query} onChange={setQuery} placeholder="Search members" className="w-full sm:w-64" />
                <Select items={roleItems} value={role} onValueChange={(next) => setRole(String(next))}>
                    <SelectTrigger className="w-36" aria-label="Role">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {roleItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <ListTable
                columns={memberColumns(setRemoving)}
                rows={rows}
                rowKey={(member) => member.email}
                empty="No member matches."
                foot={`${String(rows.length)} of ${String(MEMBERS.length)}`}
            />
            <Section title="Pending invites" meta={String(INVITES.length)} flush>
                <ul className="divide-y divide-border">
                    {INVITES.map((invite) => (
                        <li
                            key={invite.email}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-(--density-panel-pad) py-2.5 text-sm"
                        >
                            <Person who={invite.email} />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate">{invite.email}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {ROLE_LABEL[invite.role]}, invited by <span className="font-mono">{invite.by}</span> on {invite.sent}
                                    <span className={cn(invite.expires === 'tomorrow' && 'text-warning-ink')}>
                                        , expires {invite.expires}
                                    </span>
                                </span>
                            </span>
                            <span className="ml-auto flex shrink-0 items-center gap-1">
                                <Button size="sm" variant="outline">
                                    Resend
                                </Button>
                                <Button size="sm" variant="ghost" className="text-critical-ink">
                                    Revoke
                                </Button>
                            </span>
                        </li>
                    ))}
                </ul>
            </Section>
            <InviteDialog open={invite} onOpenChange={setInvite} />
            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoving(null)
                }}
                question={`Remove ${removing?.username || (removing?.email ?? '')} from Tidevann?`}
                detail="They lose access at once. Runs they started keep their name."
                confirm={{ label: 'Remove', destructive: true, onConfirm: () => setRemoving(null) }}
            />
        </Page>
    )
}

/* Roles */

const PERMISSIONS: MatrixGroup[] = [
    {
        id: 'projects',
        label: 'Projects',
        permissions: [
            { id: 'projects:read', label: 'View projects', code: 'projects:read' },
            { id: 'projects:write', label: 'Create and edit', code: 'projects:write' },
            { id: 'projects:delete', label: 'Delete', code: 'projects:delete' },
        ],
    },
    {
        id: 'runs',
        label: 'Runs',
        permissions: [
            { id: 'runs:read', label: 'View runs and logs', code: 'runs:read' },
            { id: 'runs:start', label: 'Start and cancel', code: 'runs:start' },
            { id: 'runs:schedule', label: 'Edit schedules', code: 'runs:schedule' },
        ],
    },
    {
        id: 'secrets',
        label: 'Secrets',
        permissions: [
            { id: 'secrets:list', label: 'See names', code: 'secrets:list' },
            { id: 'secrets:read', label: 'Read values', code: 'secrets:read', description: 'Shown in a step that uses them' },
            { id: 'secrets:write', label: 'Create and edit', code: 'secrets:write' },
        ],
    },
    {
        id: 'billing',
        label: 'Billing',
        permissions: [
            { id: 'billing:read', label: 'View usage and invoices', code: 'billing:read' },
            { id: 'billing:manage', label: 'Change the plan', code: 'billing:manage' },
        ],
    },
    {
        id: 'members',
        label: 'Members',
        permissions: [
            { id: 'members:read', label: 'View members', code: 'members:read' },
            { id: 'members:invite', label: 'Invite', code: 'members:invite' },
            { id: 'members:manage', label: 'Change roles and remove', code: 'members:manage' },
        ],
    },
]

const EVERY = PERMISSIONS.flatMap((group) => group.permissions.map((permission) => permission.id))

const SAVED: Grants = {
    owner: EVERY,
    admin: EVERY.filter((id) => id !== 'billing:manage'),
    editor: [
        'projects:read',
        'projects:write',
        'runs:read',
        'runs:start',
        'runs:schedule',
        'secrets:list',
        'secrets:write',
        'members:read',
    ],
    viewer: ['projects:read', 'runs:read', 'secrets:list', 'members:read'],
    operator: ['projects:read', 'runs:read', 'runs:start', 'secrets:list', 'members:read'],
}

const EDITED: Grants = {
    ...SAVED,
    operator: ['projects:read', 'runs:read', 'runs:start', 'runs:schedule', 'secrets:list', 'secrets:read', 'billing:read'],
}

const holders = (role: Role) => MEMBERS.filter((member) => member.role === role && member.state !== 'invited')

const ROLES: MatrixRole[] = ROLE_IDS.map((id) => {
    const count = holders(id).length
    return {
        id,
        label: ROLE_LABEL[id],
        locked: id !== 'operator',
        note: count === 1 ? '1 member' : `${String(count)} members`,
    }
})

function RolesPage() {
    const [grants, setGrants] = useState<Grants>(EDITED)
    const [saved, setSaved] = useState<Grants>(SAVED)
    const changes = countChanges(grants, saved, ROLES, PERMISSIONS)
    const toggle = (role: string, permission: string, granted: boolean) =>
        setGrants({
            ...grants,
            [role]: granted ? [...(grants[role] ?? []), permission] : (grants[role] ?? []).filter((id) => id !== permission),
        })
    return (
        <div className="flex min-h-full flex-col">
            <Page className="flex-1">
                <PageHeader
                    title="Roles"
                    count="4 built in, 1 custom"
                    actions={
                        <Button size="sm" variant="outline">
                            <Plus aria-hidden />
                            New role
                        </Button>
                    }
                />
                <PermissionMatrix roles={ROLES} groups={PERMISSIONS} value={grants} saved={saved} onChange={toggle} />
                <Section title="Who holds each role" flush>
                    <ul className="divide-y divide-border">
                        {ROLE_IDS.map((id) => {
                            const people = holders(id)
                            return (
                                <li key={id} className="flex items-center gap-3 px-(--density-panel-pad) py-2.5 text-sm">
                                    <span className="flex w-28 shrink-0 flex-col sm:w-40">
                                        <span className="font-medium">{ROLE_LABEL[id]}</span>
                                        <span className="text-xs text-muted-foreground">{id === 'operator' ? 'custom' : 'built in'}</span>
                                    </span>
                                    <AvatarGroup className="shrink-0">
                                        {people.map((person) => (
                                            <Person key={person.email} who={person.username} />
                                        ))}
                                    </AvatarGroup>
                                    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                                        {people.map((person) => person.username).join(', ')}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </Section>
            </Page>
            <SaveBar count={changes} onSave={() => setSaved(grants)} onDiscard={() => setGrants(saved)} />
        </div>
    )
}

/* Tokens */

type ExpiryTone = 'normal' | 'soon' | 'expired'

interface Token {
    name: string
    scopes: string[]
    created: string
    used: string
    expires: string
    tone: ExpiryTone
}

const TOKENS: Token[] = [
    {
        name: 'ci-deploy',
        scopes: ['runs:start', 'projects:read'],
        created: 'Aug 6, grace',
        used: '14 min ago',
        expires: 'Nov 7, in 3 days',
        tone: 'soon',
    },
    { name: 'metrics-export', scopes: ['runs:read'], created: 'Jun 2, ada', used: '2 h ago', expires: 'Dec 31', tone: 'normal' },
    {
        name: 'backup-sync',
        scopes: ['secrets:read', 'projects:read', 'runs:read'],
        created: 'Mar 14, linus',
        used: 'Oct 2',
        expires: 'never',
        tone: 'normal',
    },
    { name: 'old-webhook', scopes: ['runs:start'], created: 'Feb 1, grace', used: 'Feb 20', expires: 'Oct 30, expired', tone: 'expired' },
]

const NEW_TOKEN: Token = {
    name: 'release-bot',
    scopes: ['runs:read', 'runs:start'],
    created: 'Nov 4, ada',
    used: 'never',
    expires: 'Feb 2, 2027',
    tone: 'normal',
}

function Scope({ scope }: { scope: string }) {
    return <span className="inline-flex rounded-chip bg-muted px-1.5 py-0.5 font-mono text-xs whitespace-nowrap">{scope}</span>
}

function Expiry({ token }: { token: Token }) {
    if (token.tone === 'normal') return <span className="text-muted-foreground tabular-nums">{token.expires}</span>
    return (
        <span className={cn('flex items-center gap-1 tabular-nums', token.tone === 'soon' ? 'text-warning-ink' : 'text-critical-ink')}>
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{token.expires}</span>
        </span>
    )
}

const TOKEN_COLUMNS: Column<Token>[] = [
    { id: 'name', header: 'Name', width: 'minmax(8rem,0.8fr)', cell: (token) => <span className="truncate font-mono">{token.name}</span> },
    {
        id: 'scopes',
        header: 'Scopes',
        width: 'minmax(0,1.4fr)',
        cell: (token) => (
            <span className="flex min-w-0 gap-1 overflow-hidden">
                {token.scopes.map((scope) => (
                    <Scope key={scope} scope={scope} />
                ))}
            </span>
        ),
    },
    {
        id: 'created',
        header: 'Created',
        width: '7.5rem',
        cell: (token) => <span className="text-muted-foreground tabular-nums">{token.created}</span>,
    },
    {
        id: 'used',
        header: 'Last used',
        width: '6.5rem',
        cell: (token) => <span className="text-muted-foreground tabular-nums">{token.used}</span>,
    },
    { id: 'expires', header: 'Expires', width: '9rem', cell: (token) => <Expiry token={token} /> },
    {
        id: 'actions',
        header: <span className="sr-only">Actions</span>,
        width: '4.5rem',
        align: 'end',
        cell: () => (
            <Button size="xs" variant="ghost" className="text-critical-ink">
                Revoke
            </Button>
        ),
    },
]

const SCOPES = [
    { id: 'projects:read', about: 'Read projects and their jobs' },
    { id: 'runs:read', about: 'Read runs and their logs' },
    { id: 'runs:start', about: 'Start and cancel runs' },
    { id: 'secrets:read', about: 'Read secret values' },
]

type Expires = '30' | '90' | '365' | 'never'

const EXPIRES_ON: Record<Expires, string> = {
    '30': 'Expires on Dec 4, 2026.',
    '90': 'Expires on Feb 2, 2027.',
    '365': 'Expires on Nov 4, 2027.',
    never: 'Never expires. Revoke it when it is no longer used.',
}

function TokenDialog({
    open,
    onOpenChange,
    shown,
    onCreate,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    shown: boolean
    onCreate: () => void
}) {
    const [name, setName] = useState('release-bot')
    const [scopes, setScopes] = useState<string[]>(['runs:read', 'runs:start'])
    const [expires, setExpires] = useState<Expires>('90')
    if (shown)
        return (
            <DialogShell
                open={open}
                onOpenChange={onOpenChange}
                title="Token created"
                description={
                    <>
                        <span className="font-mono">{name}</span> can now act with {scopes.join(', ')}.
                    </>
                }
                confirm={{ label: 'Done', onConfirm: () => onOpenChange(false) }}
            >
                <SecretReveal value="tdv_test_0000000000000000" label="Your new token" note="Keep it in a secret store, not in code." />
            </DialogShell>
        )
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="New API token"
            description="A token acts as the workspace, with only the scopes it is given."
            confirm={{
                label: 'Create token',
                onConfirm: onCreate,
                why: name.trim() === '' ? 'Give the token a name.' : scopes.length === 0 ? 'Choose at least one scope.' : undefined,
            }}
        >
            <Field id="token-name" label="Name" hint="what uses it">
                <Input id="token-name" className="font-mono" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Scopes</span>
                <div className="flex flex-col">
                    {SCOPES.map((scope) => (
                        <label
                            key={scope.id}
                            className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 hover:bg-secondary/60"
                        >
                            <Checkbox
                                checked={scopes.includes(scope.id)}
                                onCheckedChange={(next) =>
                                    setScopes(next ? [...scopes, scope.id] : scopes.filter((one) => one !== scope.id))
                                }
                            />
                            <span className="w-28 shrink-0 font-mono text-sm">{scope.id}</span>
                            <span className="min-w-0 truncate text-xs text-muted-foreground">{scope.about}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Expires after</span>
                <Segmented
                    label="Expires after"
                    size="md"
                    fill
                    value={expires}
                    onChoose={setExpires}
                    options={[
                        { value: '30', label: '30 days' },
                        { value: '90', label: '90 days' },
                        { value: '365', label: 'A year' },
                        { value: 'never', label: 'Never' },
                    ]}
                />
                <p className={cn('text-xs', expires === 'never' ? 'text-warning-ink' : 'text-muted-foreground')}>{EXPIRES_ON[expires]}</p>
            </div>
        </DialogShell>
    )
}

function TokensPage({ opening }: { opening?: 'form' | 'shown' }) {
    const [open, setOpen] = useState(opening !== undefined)
    const [shown, setShown] = useState(opening === 'shown')
    const rows = shown ? [NEW_TOKEN, ...TOKENS] : TOKENS
    return (
        <Page>
            <PageHeader
                title="API tokens"
                count={`${String(rows.length)} tokens`}
                actions={
                    <Button
                        size="sm"
                        onClick={() => {
                            setShown(false)
                            setOpen(true)
                        }}
                    >
                        <Plus aria-hidden />
                        New token
                    </Button>
                }
            />
            <ListTable columns={TOKEN_COLUMNS} rows={rows} rowKey={(token) => token.name} foot={`${String(rows.length)} tokens`} />
            <p className="text-xs text-muted-foreground">
                A token is shown once, when it is made. One that is lost is revoked and made again.
            </p>
            <TokenDialog open={open} onOpenChange={setOpen} shown={shown} onCreate={() => setShown(true)} />
        </Page>
    )
}

/* Audit log */

type Tone = 'neutral' | 'warning' | 'critical'

interface AuditEvent {
    id: string
    day: string
    at: string
    who: string
    did: ReactNode
    action: string
    object: string
    ip: string
    tone?: Tone
    before?: string
    after?: string
}

const json = (value: object) => JSON.stringify(value, null, 2)

const EVENTS: AuditEvent[] = [
    {
        id: 'e10',
        day: 'Wednesday, Nov 4',
        at: '14:02:11',
        who: 'grace',
        did: 'changed the role of linus to Editor',
        action: 'member.role_changed',
        object: 'member/linus',
        ip: '192.0.2.14',
        before: json({ username: 'linus', role: 'viewer', projects: ['harbor', 'juniper'] }),
        after: json({ username: 'linus', role: 'editor', projects: ['harbor', 'juniper'] }),
    },
    {
        id: 'e9',
        day: 'Wednesday, Nov 4',
        at: '13:47:30',
        who: 'ada',
        did: 'created the API token release-bot',
        action: 'token.created',
        object: 'token/release-bot',
        ip: '192.0.2.7',
        before: '',
        after: json({ name: 'release-bot', scopes: ['runs:read', 'runs:start'], expires: '2027-02-02' }),
    },
    {
        id: 'e8',
        day: 'Wednesday, Nov 4',
        at: '11:20:04',
        who: 'linus',
        did: 'updated the secret SMTP_PASSWORD in harbor',
        action: 'secret.updated',
        object: 'harbor/SMTP_PASSWORD',
        ip: '192.0.2.31',
        before: json({ name: 'SMTP_PASSWORD', version: 3 }),
        after: json({ name: 'SMTP_PASSWORD', version: 4 }),
    },
    {
        id: 'e7',
        day: 'Wednesday, Nov 4',
        at: '09:05:52',
        who: 'margaret',
        did: 'cancelled a run of nightly-export',
        action: 'run.cancelled',
        object: 'juniper/nightly-export',
        ip: '192.0.2.52',
        tone: 'warning',
    },
    {
        id: 'e6',
        day: 'Tuesday, Nov 3',
        at: '17:40:18',
        who: 'ada',
        did: 'changed the permissions of Operator',
        action: 'role.updated',
        object: 'role/operator',
        ip: '192.0.2.7',
        before: json({ role: 'operator', grants: ['projects:read', 'runs:read', 'secrets:list'] }),
        after: json({ role: 'operator', grants: ['projects:read', 'runs:read', 'runs:start', 'secrets:list'] }),
    },
    {
        id: 'e5',
        day: 'Tuesday, Nov 3',
        at: '16:12:45',
        who: 'grace',
        did: 'invited data@example.org as Editor',
        action: 'member.invited',
        object: 'invite/data@example.org',
        ip: '192.0.2.14',
    },
    {
        id: 'e4',
        day: 'Tuesday, Nov 3',
        at: '08:55:09',
        who: 'linus',
        did: 'created the project larkspur',
        action: 'project.created',
        object: 'project/larkspur',
        ip: '192.0.2.31',
    },
    {
        id: 'e3',
        day: 'Monday, Nov 2',
        at: '22:14:37',
        who: 'margaret',
        did: 'failed to sign in, wrong password',
        action: 'session.failed',
        object: 'member/margaret',
        ip: '192.0.2.88',
        tone: 'critical',
    },
    {
        id: 'e2',
        day: 'Monday, Nov 2',
        at: '15:03:26',
        who: 'ada',
        did: 'suspended ops',
        action: 'member.suspended',
        object: 'member/ops',
        ip: '192.0.2.7',
        tone: 'warning',
    },
]

const TONE_INK: Record<Tone, string> = { neutral: 'text-muted-foreground', warning: 'text-warning-ink', critical: 'text-critical-ink' }

function EventDetail({ event }: { event: AuditEvent }) {
    return (
        <>
            <PanelSection title="Event">
                <p className="text-sm">
                    <span className="font-medium">{event.who}</span> {event.did}
                </p>
                <DescriptionList
                    termWidth="5.5rem"
                    items={[
                        { term: 'Action', value: event.action, code: true },
                        { term: 'Object', value: event.object, code: true },
                        { term: 'Actor', value: event.who, code: true },
                        { term: 'When', value: `${event.day}, ${event.at} UTC` },
                        { term: 'From', value: event.ip, code: true },
                        { term: 'Request', value: `req_${event.id}_00000000`, code: true },
                    ]}
                />
            </PanelSection>
            {event.after !== undefined && (
                <PanelSection title="Change">
                    <DiffView before={event.before ?? ''} after={event.after} title={event.object} size="sm" />
                </PanelSection>
            )}
        </>
    )
}

function AuditPage({ chosen, onChoose }: { chosen: AuditEvent; onChoose: (event: AuditEvent) => void }) {
    const [query, setQuery] = useState('')
    const q = query.trim().toLowerCase()
    const shown = EVENTS.filter((event) => `${event.who} ${event.action} ${event.object} ${event.ip}`.toLowerCase().includes(q))
    const days = [...new Set(shown.map((event) => event.day))]
    return (
        <Page>
            <PageHeader
                title="Audit log"
                count="1,284 events in 90 days"
                actions={
                    <Button size="sm" variant="outline">
                        <Download aria-hidden />
                        Export
                    </Button>
                }
            />
            <div className="flex flex-wrap items-center gap-2">
                <SearchField value={query} onChange={setQuery} placeholder="Search events" className="w-full sm:w-64" />
                <FilterChip facet="Period" value="Last 7 days" onClear={() => undefined} />
                <FilterChip facet="Actor" />
                <FilterChip facet="Action" />
                <FilterChip facet="Project" />
            </div>
            {days.length === 0 && <p className="text-sm text-muted-foreground">No event matches.</p>}
            {days.map((day) => (
                <section key={day} className="flex flex-col gap-2">
                    <h2 className="text-xs font-medium tracking-wide text-faint uppercase">{day}</h2>
                    <ol className="overflow-hidden rounded-surface border border-border-strong bg-card">
                        {shown
                            .filter((event) => event.day === day)
                            .map((event) => {
                                const active = event.id === chosen.id
                                return (
                                    <li key={event.id} className="border-b border-border last:border-b-0">
                                        <button
                                            type="button"
                                            aria-current={active || undefined}
                                            className={cn(
                                                'flex w-full items-center gap-3 px-(--density-panel-pad) py-2 text-left text-sm outline-none hover:bg-secondary/60 focus-visible:bg-secondary',
                                                active && 'bg-secondary',
                                            )}
                                            onClick={() => onChoose(event)}
                                        >
                                            <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                                                {event.at}
                                            </span>
                                            <Person who={event.who} />
                                            <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-3">
                                                <span className="min-w-0 truncate">
                                                    <span className="font-medium">{event.who}</span>{' '}
                                                    <span className={TONE_INK[event.tone ?? 'neutral']}>{event.did}</span>
                                                </span>
                                                <span className="min-w-0 truncate font-mono text-xs text-muted-foreground md:ml-auto">
                                                    {event.action}
                                                </span>
                                            </span>
                                            <span className="hidden w-24 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums lg:inline">
                                                {event.ip}
                                            </span>
                                        </button>
                                    </li>
                                )
                            })}
                    </ol>
                </section>
            ))}
        </Page>
    )
}

/* Usage */

const DAYS = Array.from({ length: 30 }, (_, index) => {
    const day = index + 6
    return day <= 31 ? `Oct ${String(day)}` : `Nov ${String(day - 31)}`
})

/** Runs each day, the same every time: a weekly rhythm on a slow rise, with one day over the limit. */
const DAILY = DAYS.map((_, index) => {
    const weekday = (index + 1) % 7
    const quiet = weekday === 5 || weekday === 6
    const base = 520 + index * 9 + ((index * 53) % 70)
    return index === 23 ? 1084 : Math.round(quiet ? base * 0.55 : base)
})

const LIMIT = 1000

const DAILY_SERIES: PanelSeries[] = [
    { name: 'Runs', values: DAILY, color: 'chart-2' },
    { name: 'Daily limit', values: DAILY.map(() => LIMIT), color: 'critical', dashed: true },
]

const PLAN_STEPS: Threshold[] = [{ color: 'good' }, { value: 70, color: 'warning' }, { value: 90, color: 'critical' }]

const MONTH_RUNS = DAILY.slice(-4).reduce((total, value) => total + value, 0) + 14_212

function UsagePage() {
    return (
        <Page>
            <PageHeader
                title="Usage"
                count="Team plan, Nov 1 to Nov 30"
                actions={
                    <Button size="sm" variant="outline">
                        Change plan
                    </Button>
                }
            />
            <KpiRow
                items={[
                    {
                        id: 'runs',
                        label: 'Runs this month',
                        value: MONTH_RUNS.toLocaleString('en-US'),
                        note: 'of 30,000 in the plan',
                        change: '+8%',
                        good: true,
                    },
                    { id: 'seats', label: 'Seats', value: '5', unit: '/ 10', note: '1 invite pending' },
                    { id: 'storage', label: 'Log storage', value: '41.2', unit: 'GB', note: 'of 100 GB', change: '+3.1 GB' },
                    { id: 'api', label: 'API calls', value: '1.2M', note: 'no limit on this plan', change: '-4%' },
                ]}
            />
            <DashboardGrid>
                <TimeSeriesPanel
                    title="Runs per day"
                    subtitle="last 30 days"
                    info="Runs started each day, against the plan's daily limit. Runs over the limit wait for the next day."
                    span="two-thirds"
                    x={DAYS}
                    series={DAILY_SERIES}
                    labelEvery={6}
                    bodyClassName="h-64"
                    file="runs-per-day"
                />
                <div className={cn(SPAN.third, 'flex flex-col gap-(--density-section-gap)')}>
                    <BarGauge
                        title="Plan used"
                        subtitle="this month"
                        span="full"
                        className="flex-1"
                        bars={[
                            { name: 'Runs', value: Math.round((MONTH_RUNS / 30_000) * 100) },
                            { name: 'Seats', value: 50 },
                            { name: 'Log storage', value: 41 },
                            { name: 'Projects', value: 60 },
                        ]}
                        unit="%"
                        thresholds={PLAN_STEPS}
                    />
                    <BarGauge
                        title="Runs by project"
                        subtitle="this month"
                        span="full"
                        className="flex-1"
                        bars={[
                            { name: 'harbor', value: 7_940 },
                            { name: 'juniper', value: 5_310 },
                            { name: 'larkspur', value: 2_062 },
                        ]}
                        max={8_000}
                        color="chart-3"
                    />
                </div>
            </DashboardGrid>
        </Page>
    )
}

/* The app */

function AdminApp({ view, panel, children }: { view: View; panel?: ReactNode; children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(view)}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
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
                top={<TopBar trail={trail(view)} onSearch={() => undefined} />}
                panel={panel}
            >
                {children}
            </Shell>
        </TooltipProvider>
    )
}

function AuditApp() {
    const [chosen, setChosen] = useState<AuditEvent>(EVENTS[0])
    const [width, setWidth] = useState(400)
    return (
        <AdminApp
            view="audit"
            panel={
                <SidePanel
                    tabs={[{ id: 'event', label: 'Event', content: <EventDetail event={chosen} /> }]}
                    size={width}
                    onSizeChange={setWidth}
                    defaultSize={400}
                />
            }
        >
            <AuditPage chosen={chosen} onChoose={setChosen} />
        </AdminApp>
    )
}

const meta: Meta = { title: 'Apps/Admin' }
export default meta

/** The members with their avatar, username, role, last activity and status, a search and a role filter, and the invites still pending. */
export const Members: StoryObj = {
    render: () => (
        <AdminApp view="members">
            <MembersPage />
        </AdminApp>
    ),
}

/** The invite dialog over the members: several addresses as chips, one refused, and the role each will get. */
export const Invite: StoryObj = {
    render: () => (
        <AdminApp view="members">
            <MembersPage inviting />
        </AdminApp>
    ),
}

/** The roles against what each may do: the built-in roles read-only, the custom one with four unsaved changes and the save bar. */
export const Roles: StoryObj = {
    render: () => (
        <AdminApp view="roles">
            <RolesPage />
        </AdminApp>
    ),
}

/** The API tokens with one near and one past its expiry, and a token just created, shown once with its copy button. */
export const Tokens: StoryObj = {
    render: () => (
        <AdminApp view="tokens">
            <TokensPage opening="shown" />
        </AdminApp>
    ),
}

/** The audit log grouped by day, the first event open in the side panel with its before and after. */
export const AuditLog: StoryObj = {
    render: () => <AuditApp />,
}

/** The plan's usage: key figures, runs per day against the daily limit, and how the plan is spent. */
export const Usage: StoryObj = {
    render: () => (
        <AdminApp view="usage">
            <UsagePage />
        </AdminApp>
    ),
}
