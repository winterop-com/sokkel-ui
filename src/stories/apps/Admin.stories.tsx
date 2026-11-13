import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { ChoiceList } from '@winterop-com/sokkel-ui/ChoiceList'
import { CheckboxField } from '@winterop-com/sokkel-ui/CheckboxField'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    Ban,
    Download,
    Gauge,
    KeyRound,
    LayoutDashboard,
    ListChecks,
    Pencil,
    Play,
    Plus,
    RotateCcw,
    ScrollText,
    Send,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react'
import { differenceInCalendarDays, format } from 'date-fns'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { AddressInput, isAddress, type Address } from '@winterop-com/sokkel-ui/AddressInput'
import { DueText } from '@winterop-com/sokkel-ui/DueText'
import { DashboardGrid, KpiRow, SPAN } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { BarGauge } from '@winterop-com/sokkel-ui-charts/dashboard/BarGauge'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { DataTable, type DataAction, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { ConfirmDialog, DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { DiffView } from '@winterop-com/sokkel-ui/DiffView'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { FilterChip, type FilterOption } from '@winterop-com/sokkel-ui/FilterChip'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { countChanges, PermissionMatrix, type Grants, type MatrixGroup, type MatrixRole } from '@winterop-com/sokkel-ui/PermissionMatrix'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SaveBar } from '@winterop-com/sokkel-ui/SaveBar'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { SecretReveal } from '@winterop-com/sokkel-ui/SecretReveal'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Board, type BoardMove } from '@winterop-com/sokkel-ui/board/Board'
import { BoardCard } from '@winterop-com/sokkel-ui/board/BoardCard'
import { BoardColumn } from '@winterop-com/sokkel-ui/board/BoardColumn'
import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { PEOPLE_OPTIONS, PERIOD_OPTIONS, PROJECT_OPTIONS } from '../fixtures/filters'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

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
    /** Minutes since they were last active, for sorting; never active sorts last. */
    idle: number
    state: MemberState
}

const MEMBERS: Member[] = [
    { username: 'ada', name: 'Ada Berg', email: 'ada@example.org', role: 'owner', active: 'now', idle: 0, state: 'active' },
    { username: 'grace', name: 'Grace Holm', email: 'grace@example.org', role: 'admin', active: '12 min ago', idle: 12, state: 'active' },
    { username: 'linus', name: 'Linus Dahl', email: 'linus@example.org', role: 'editor', active: '2 h ago', idle: 120, state: 'active' },
    {
        username: 'margaret',
        name: 'Margaret Lund',
        email: 'margaret@example.org',
        role: 'operator',
        active: 'yesterday',
        idle: 1_500,
        state: 'active',
    },
    { username: 'ops', name: 'Operations', email: 'ops@example.org', role: 'viewer', active: 'Oct 12', idle: 33_000, state: 'suspended' },
    {
        username: '',
        name: 'data@example.org',
        email: 'data@example.org',
        role: 'editor',
        active: '-',
        idle: Number.MAX_SAFE_INTEGER,
        state: 'invited',
    },
]

interface Invite {
    email: string
    role: Role
    by: string
    sent: string
    expires: Date
}

/** Today, which the expiry dates are judged against. */
const NOW = new Date(2026, 10, 4)

/** An invite's expiry as days from today. */
const INVITE_EXPIRY = {
    date: (date: Date, now: Date) => {
        const days = differenceInCalendarDays(date, now)
        return days === 1 ? 'tomorrow' : `in ${String(days)} days`
    },
    title: () => undefined,
}

const INVITES: Invite[] = [
    { email: 'data@example.org', role: 'editor', by: 'grace', sent: 'Nov 2', expires: new Date(2026, 10, 9) },
    { email: 'oncall@example.org', role: 'viewer', by: 'ada', sent: 'Oct 30', expires: new Date(2026, 10, 5) },
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

/* Members */

const memberColumns: DataColumn<Member>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(10rem,1.2fr)',
        cell: (member) => (
            <Row as="span" className="min-w-0">
                <PersonAvatar name={member.username || member.email} image={pictureOf(member.username || member.email)} />
                <span className="truncate">{member.name}</span>
            </Row>
        ),
        sortValue: (member) => member.name,
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
        sortValue: (member) => member.username,
    },
    { id: 'email', header: 'Email', width: 'minmax(10rem,1fr)', cell: (member) => member.email, sortValue: (member) => member.email },
    {
        id: 'role',
        header: 'Role',
        width: '6rem',
        cell: (member) => ROLE_LABEL[member.role],
        sortValue: (member) => ROLE_IDS.indexOf(member.role),
    },
    {
        id: 'active',
        header: 'Last active',
        width: '7rem',
        cell: (member) => <span className="text-muted-foreground tabular-nums">{member.active}</span>,
        sortValue: (member) => member.idle,
    },
    {
        id: 'state',
        header: 'Status',
        width: '6.5rem',
        cell: (member) => <StatusChip status={MEMBER_STATE[member.state]} label={member.state} />,
        sortValue: (member) => member.state,
    },
]

const inviteColumns: DataColumn<Invite>[] = [
    {
        id: 'email',
        header: 'Address',
        width: 'minmax(12rem,1.4fr)',
        cell: (invite) => (
            <Row as="span" className="min-w-0">
                <PersonAvatar name={invite.email} image={pictureOf(invite.email)} />
                <span className="truncate">{invite.email}</span>
            </Row>
        ),
        sortValue: (invite) => invite.email,
    },
    {
        id: 'role',
        header: 'Role',
        width: '6rem',
        cell: (invite) => ROLE_LABEL[invite.role],
        sortValue: (invite) => ROLE_IDS.indexOf(invite.role),
    },
    {
        id: 'by',
        header: 'Invited by',
        width: '7rem',
        cell: (invite) => <span className="font-mono text-muted-foreground">{invite.by}</span>,
        sortValue: (invite) => invite.by,
    },
    {
        id: 'sent',
        header: 'Sent',
        width: '6rem',
        cell: (invite) => <span className="text-muted-foreground tabular-nums">{invite.sent}</span>,
        sortValue: (invite) => -invite.expires.getTime(),
    },
    {
        id: 'expires',
        header: 'Expires',
        width: '7rem',
        cell: (invite) => <DueText date={invite.expires} now={NOW} nearDays={1} words={INVITE_EXPIRY} />,
        sortValue: (invite) => invite.expires.getTime(),
    },
]

/** The roles a person can be given, each with what it may do; the owner is never given. */
function RoleChoice({ id, label, value, onChange }: { id: string; label: string; value: Role; onChange: (role: Role) => void }) {
    return (
        <Stack gap="xs">
            <span id={id} className="text-sm font-medium">
                {label}
            </span>
            <ChoiceList
                labelledBy={id}
                value={value}
                onValueChange={onChange}
                options={ROLE_IDS.filter((role) => role !== 'owner').map((role) => ({
                    value: role,
                    label: ROLE_LABEL[role],
                    description: ROLE_ABOUT[role],
                }))}
            />
        </Stack>
    )
}

function RoleDialog({ member, onOpenChange }: { member: Member | null; onOpenChange: (open: boolean) => void }) {
    const [role, setRole] = useState<Role>(member?.role ?? 'editor')
    return (
        <DialogShell
            open={member !== null}
            onOpenChange={onOpenChange}
            title={`Change the role of ${member?.username || (member?.email ?? '')}`}
            confirm={{ label: 'Change role', onConfirm: () => onOpenChange(false) }}
        >
            <RoleChoice id="member-role" label="Role" value={role} onChange={setRole} />
        </DialogShell>
    )
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [emails, setEmails] = useState<Address[]>([
        { address: 'data@example.org' },
        { address: 'support@example.org' },
        { address: 'margaret@example' },
    ])
    const [role, setRole] = useState<Role>('editor')
    const [issueOpen, setIssueOpen] = useState(false)
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
            count={
                <IssueCount
                    critical={bad}
                    list={
                        bad === 0
                            ? []
                            : [
                                  {
                                      label: 'Email addresses',
                                      issue: {
                                          tone: 'critical',
                                          text:
                                              bad === 1
                                                  ? '1 address is not an email address'
                                                  : `${String(bad)} addresses are not email addresses`,
                                      },
                                      onGo: () => setIssueOpen(true),
                                  },
                              ]
                    }
                />
            }
        >
            <Field id="email-addresses" label="Email addresses" help="Separate them with commas, or paste a list.">
                <AddressInput
                    id="email-addresses"
                    value={emails}
                    onChange={setEmails}
                    autoFocus
                    issueOpen={issueOpen}
                    onIssueOpenChange={setIssueOpen}
                    words={{ placeholder: 'Email addresses' }}
                />
            </Field>
            <RoleChoice id="invite-role" label="Role" value={role} onChange={setRole} />
        </DialogShell>
    )
}

function MembersPage({ inviting = false }: { inviting?: boolean }) {
    const [query, setQuery] = useState('')
    const [role, setRole] = useState<string>('all')
    const [invite, setInvite] = useState(inviting)
    const [removing, setRemoving] = useState<Member | null>(null)
    const [changing, setChanging] = useState<Member | null>(null)
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
            <DataTable
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={
                    <>
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
                    </>
                }
                columns={memberColumns}
                rows={rows}
                rowKey={(member) => member.email}
                rowActions={(member) => [
                    { id: 'role', label: 'Change role', icon: <ShieldCheck />, onSelect: () => setChanging(member) },
                    {
                        id: 'suspend',
                        label: member.state === 'suspended' ? 'Reactivate' : 'Suspend',
                        icon: member.state === 'suspended' ? <RotateCcw /> : <Ban />,
                        onSelect: () => undefined,
                    },
                    { id: 'line', separator: true },
                    { id: 'remove', label: 'Remove', icon: <Trash2 />, destructive: true, onSelect: () => setRemoving(member) },
                ]}
                minWidth="44rem"
                words={{ empty: 'No member matches.' }}
            />
            <Section title="Pending invites" variant="flat">
                <DataTable
                    columns={inviteColumns}
                    rows={INVITES}
                    rowKey={(invite) => invite.email}
                    rowActions={() => [
                        { id: 'resend', label: 'Resend', icon: <Send />, onSelect: () => undefined },
                        { id: 'line', separator: true },
                        { id: 'revoke', label: 'Revoke', icon: <X />, destructive: true, onSelect: () => undefined },
                    ]}
                    minWidth="40rem"
                />
            </Section>
            <InviteDialog open={invite} onOpenChange={setInvite} />
            <RoleDialog
                key={changing?.email ?? 'none'}
                member={changing}
                onOpenChange={(open) => {
                    if (!open) setChanging(null)
                }}
            />
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

const holders = (people: readonly Member[], role: Role) => people.filter((member) => member.role === role && member.state !== 'invited')

const rolesOf = (people: readonly Member[]): MatrixRole[] =>
    ROLE_IDS.map((id) => {
        const count = holders(people, id).length
        return {
            id,
            label: ROLE_LABEL[id],
            locked: id !== 'operator',
            note: count === 1 ? '1 member' : `${String(count)} members`,
        }
    })

const ROLES = rolesOf(MEMBERS)

/** How many members hold another role than the one saved. */
const regiven = (people: readonly Member[], saved: readonly Member[]) =>
    people.filter((member) => saved.find((each) => each.email === member.email)?.role !== member.role).length

/** Gives a member the role they were dragged to, at their place among its holders. */
function giveRole(people: readonly Member[], { card, to, index }: BoardMove): Member[] {
    const moving = people.find((member) => member.email === card)
    if (moving === undefined) return [...people]
    const rest = people.filter((member) => member.email !== card)
    const inRole = holders(rest, to as Role)
    const at = index >= inRole.length ? rest.length : rest.indexOf(inRole[index])
    return insertItem(rest, { ...moving, role: to as Role }, at)
}

function RolesPage() {
    const [grants, setGrants] = useState<Grants>(EDITED)
    const [saved, setSaved] = useState<Grants>(SAVED)
    const [people, setPeople] = useState<Member[]>(MEMBERS)
    const [kept, setKept] = useState<Member[]>(MEMBERS)
    const changes = countChanges(grants, saved, ROLES, PERMISSIONS) + regiven(people, kept)
    const toggle = (role: string, permission: string, granted: boolean) =>
        setGrants({
            ...grants,
            [role]: granted ? [...(grants[role] ?? []), permission] : (grants[role] ?? []).filter((id) => id !== permission),
        })
    return (
        <Stack gap="none" className="min-h-full">
            <Page className="flex-1">
                <PageHeader
                    title="Roles"
                    count="4 built in, 1 custom"
                    actions={
                        <Button size="sm" variant="outline">
                            <Plus aria-hidden />
                            New
                        </Button>
                    }
                />
                <PermissionMatrix roles={rolesOf(people)} groups={PERMISSIONS} value={grants} saved={saved} onChange={toggle} />
                <Section
                    title="Who holds each role"
                    variant="flat"
                    description="Drag a member to another role to give it to them. The owner is set under Settings, so that column stays as it is."
                >
                    <Board onMove={(move) => setPeople(giveRole(people, move))} columnWidth="11rem">
                        <Row gap="md" align="start">
                            {ROLE_IDS.map((id) => {
                                const held = holders(people, id)
                                return (
                                    <BoardColumn
                                        key={id}
                                        id={id}
                                        title={ROLE_LABEL[id]}
                                        icon={<ShieldCheck className="size-4 text-muted-foreground" aria-hidden />}
                                        count={held.length}
                                        locked={id === 'owner'}
                                        empty="No one"
                                    >
                                        {held.map((member) => (
                                            <BoardCard
                                                key={member.email}
                                                id={member.email}
                                                code={member.username}
                                                title={member.name}
                                                assignee={{ name: member.username, image: pictureOf(member.username) }}
                                            />
                                        ))}
                                    </BoardColumn>
                                )
                            })}
                        </Row>
                    </Board>
                </Section>
            </Page>
            <SaveBar
                count={changes}
                onSave={() => {
                    setSaved(grants)
                    setKept(people)
                }}
                onDiscard={() => {
                    setGrants(saved)
                    setPeople(kept)
                }}
            />
        </Stack>
    )
}

/* Tokens */

interface Token {
    name: string
    scopes: string[]
    created: string
    used: string
    /** None for a token that never expires. */
    expires?: Date
    /** Days since it was made and minutes since it was used, for sorting. */
    age: number
    idle: number
}

const TOKENS: Token[] = [
    {
        name: 'ci-deploy',
        scopes: ['runs:start', 'projects:read'],
        created: 'Aug 6, grace',
        used: '14 min ago',
        expires: new Date(2026, 10, 7),
        age: 90,
        idle: 14,
    },
    {
        name: 'metrics-export',
        scopes: ['runs:read'],
        created: 'Jun 2, ada',
        used: '2 h ago',
        expires: new Date(2026, 11, 31),
        age: 155,
        idle: 120,
    },
    {
        name: 'backup-sync',
        scopes: ['secrets:read', 'projects:read', 'runs:read'],
        created: 'Mar 14, linus',
        used: 'Oct 2',
        age: 235,
        idle: 46_000,
    },
    {
        name: 'old-webhook',
        scopes: ['runs:start'],
        created: 'Feb 1, grace',
        used: 'Feb 20',
        expires: new Date(2026, 9, 30),
        age: 276,
        idle: 365_000,
    },
]

const NEW_TOKEN: Token = {
    name: 'release-bot',
    scopes: ['runs:read', 'runs:start'],
    created: 'Nov 4, ada',
    used: 'never',
    expires: new Date(2027, 1, 2),
    age: 0,
    idle: Number.MAX_SAFE_INTEGER,
}

function Scope({ scope }: { scope: string }) {
    return (
        <Badge variant="secondary" className="font-mono">
            {scope}
        </Badge>
    )
}

/** A token's expiry: its date, with how near it is within a week, and "never" without one. */
const TOKEN_EXPIRY = {
    date: (date: Date, now: Date) => {
        const days = differenceInCalendarDays(date, now)
        const written = format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy')
        if (days < 0) return `${written}, expired`
        return days <= 7 ? `${written}, in ${String(days)} days` : written
    },
    title: () => undefined,
    none: 'never',
}

const TOKEN_COLUMNS: DataColumn<Token>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(8rem,0.8fr)',
        cell: (token) => <span className="font-mono">{token.name}</span>,
        sortValue: (token) => token.name,
    },
    {
        id: 'scopes',
        header: 'Scopes',
        width: 'minmax(10rem,1.4fr)',
        cell: (token) => (
            <Row as="span" gap="2xs" className="min-w-0 overflow-hidden">
                {token.scopes.map((scope) => (
                    <Scope key={scope} scope={scope} />
                ))}
            </Row>
        ),
        sortValue: (token) => token.scopes.length,
    },
    {
        id: 'created',
        header: 'Created',
        width: '7.5rem',
        cell: (token) => <span className="text-muted-foreground tabular-nums">{token.created}</span>,
        sortValue: (token) => token.age,
    },
    {
        id: 'used',
        header: 'Last used',
        width: '6.5rem',
        cell: (token) => <span className="text-muted-foreground tabular-nums">{token.used}</span>,
        sortValue: (token) => token.idle,
    },
    {
        id: 'expires',
        header: 'Expires',
        width: '9rem',
        cell: (token) => <DueText date={token.expires} now={NOW} nearDays={7} alert words={TOKEN_EXPIRY} />,
        sortValue: (token) => token.expires?.getTime() ?? Number.MAX_SAFE_INTEGER,
    },
]

const tokenActions = (): DataAction[] => [
    { id: 'rename', label: 'Rename', icon: <Pencil />, onSelect: () => undefined },
    { id: 'line', separator: true },
    { id: 'revoke', label: 'Revoke', icon: <X />, destructive: true, onSelect: () => undefined },
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
    const [issueOpen, setIssueOpen] = useState<'name' | 'scopes' | null>(null)
    const nameError = name.trim() === '' ? 'Give the token a name.' : null
    const scopesError = scopes.length === 0 ? 'Choose at least one scope.' : null
    const holdOpen = (which: 'name' | 'scopes') => (next: boolean) => setIssueOpen(next ? which : null)
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
                why: nameError ?? scopesError ?? undefined,
            }}
            count={
                <IssueCount
                    critical={(nameError === null ? 0 : 1) + (scopesError === null ? 0 : 1)}
                    list={[
                        ...(nameError === null
                            ? []
                            : [{ label: 'Name', issue: { tone: 'critical' as const, text: nameError }, onGo: () => setIssueOpen('name') }]),
                        ...(scopesError === null
                            ? []
                            : [
                                  {
                                      label: 'Scopes',
                                      issue: { tone: 'critical' as const, text: scopesError },
                                      onGo: () => setIssueOpen('scopes'),
                                  },
                              ]),
                    ]}
                />
            }
        >
            <TextField
                id="token-name"
                label="Name"
                hint="what uses it"
                required
                error={nameError}
                issueOpen={issueOpen === 'name'}
                onIssueOpenChange={holdOpen('name')}
                mono
                value={name}
                onChange={(value) => setName(value)}
            />
            <Field
                id="token-scopes"
                label="Scopes"
                required
                error={scopesError}
                issueOpen={issueOpen === 'scopes'}
                onIssueOpenChange={holdOpen('scopes')}
            >
                <Stack id="token-scopes" role="group" aria-label="Scopes" gap="none">
                    {SCOPES.map((scope) => (
                        <CheckboxField
                            key={scope.id}
                            label={<span className="font-mono">{scope.id}</span>}
                            description={scope.about}
                            checked={scopes.includes(scope.id)}
                            onCheckedChange={(next) => setScopes(next ? [...scopes, scope.id] : scopes.filter((one) => one !== scope.id))}
                        />
                    ))}
                </Stack>
            </Field>
            <Field id="expires-after" label="Expires after">
                <Segmented
                    id="expires-after"
                    label="Expires after"
                    size="md"
                    fill
                    value={expires}
                    onValueChange={setExpires}
                    options={[
                        { value: '30', label: '30 days' },
                        { value: '90', label: '90 days' },
                        { value: '365', label: 'A year' },
                        { value: 'never', label: 'Never' },
                    ]}
                />
                <p className={cn('text-xs', expires === 'never' ? 'text-warning-ink' : 'text-muted-foreground')}>{EXPIRES_ON[expires]}</p>
            </Field>
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
                        New
                    </Button>
                }
            />
            <DataTable columns={TOKEN_COLUMNS} rows={rows} rowKey={(token) => token.name} rowActions={tokenActions} minWidth="44rem" />
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
    did: string
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

/** Events in the order they happened, from the number in their id. */
const happened = (event: AuditEvent) => Number(event.id.slice(1))

const EVENT_COLUMNS: DataColumn<AuditEvent>[] = [
    {
        id: 'when',
        header: 'When',
        width: '9.5rem',
        cell: (event) => (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {event.day.split(', ')[1]}, {event.at}
            </span>
        ),
        sortValue: happened,
    },
    {
        id: 'who',
        header: 'Actor',
        width: '8rem',
        cell: (event) => (
            <Row as="span" className="min-w-0">
                <PersonAvatar name={event.who} image={pictureOf(event.who)} />
                <span className="truncate font-medium">{event.who}</span>
            </Row>
        ),
        sortValue: (event) => event.who,
        stack: 'secondary',
    },
    {
        id: 'did',
        header: 'Event',
        width: 'minmax(14rem,1.6fr)',
        cell: (event) => <span className={TONE_INK[event.tone ?? 'neutral']}>{event.did}</span>,
        sortValue: (event) => event.did,
        stack: 'primary',
    },
    {
        id: 'action',
        header: 'Action',
        width: 'minmax(9rem,1fr)',
        cell: (event) => <span className="font-mono text-xs text-muted-foreground">{event.action}</span>,
        sortValue: (event) => event.action,
        stack: 'secondary',
    },
    {
        id: 'ip',
        header: 'From',
        width: '7rem',
        align: 'end',
        cell: (event) => <span className="font-mono text-xs text-muted-foreground tabular-nums">{event.ip}</span>,
        sortValue: (event) => event.ip,
        hideable: true,
    },
]

/** The actions the audit log records, each once, in the order first seen. */
const ACTION_OPTIONS: FilterOption[] = [...new Set(EVENTS.map((event) => event.action))].map((action) => ({ value: action }))

function AuditPage({ chosen, onChoose }: { chosen: AuditEvent; onChoose: (event: AuditEvent) => void }) {
    const [query, setQuery] = useState('')
    const [actors, setActors] = useState<string[]>([])
    const [actions, setActions] = useState<string[]>([])
    const q = query.trim().toLowerCase()
    const shown = EVENTS.filter(
        (event) =>
            (actors.length === 0 || actors.includes(event.who)) &&
            (actions.length === 0 || actions.includes(event.action)) &&
            `${event.who} ${event.action} ${event.object} ${event.ip}`.toLowerCase().includes(q),
    )
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
            <DataTable
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={
                    <>
                        <FilterChip facet="Period" options={PERIOD_OPTIONS} defaultSelected={['7d']} />
                        <FilterChip facet="Actor" options={PEOPLE_OPTIONS} multiple selected={actors} onSelectedChange={setActors} />
                        <FilterChip facet="Action" options={ACTION_OPTIONS} multiple selected={actions} onSelectedChange={setActions} />
                        <FilterChip facet="Project" options={PROJECT_OPTIONS} multiple />
                    </>
                }
                columns={EVENT_COLUMNS}
                rows={shown}
                rowKey={(event) => event.id}
                onOpen={onChoose}
                opened={(event) => event.id === chosen.id}
                total={1_284}
                defaultHiddenColumns={new Set(['ip'])}
                minWidth="36rem"
                words={{ empty: 'No event matches.' }}
            />
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
                <Stack gap="section" className={SPAN.third}>
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
                </Stack>
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
                                image={pictureOf('ada')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSettings={() => undefined}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={<TopBar trail={trail(view)} onSearch={() => undefined} />}
                foot={
                    <StatusLine note="Connected to api.example.org">
                        <StatusItem label="members">24</StatusItem>
                        <StatusItem>1.4.0</StatusItem>
                    </StatusLine>
                }
                panel={panel}
            >
                {children}
            </Shell>
        </TooltipProvider>
    )
}

function AuditApp() {
    const [chosen, setChosen] = useState<AuditEvent>(EVENTS[0])
    return (
        <AdminApp
            view="audit"
            panel={<SidePanel tabs={[{ id: 'event', label: 'Event', content: <EventDetail event={chosen} /> }]} defaultSize={400} />}
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

/**
 * The roles against what each may do: the built-in roles read-only, the custom one with four
 * unsaved changes and the save bar, and who holds each role on a board: a member dragged to another
 * role is given it, counted on the save bar. The Owner column is locked: its member stays, and no
 * one lands in it.
 */
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

/** The audit log as a table that sorts from its heads, the first event open in the side panel with its before and after. */
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
