import type { Meta, StoryObj } from '@storybook/react-vite'
import {
    CheckIcon,
    CopyIcon,
    EllipsisVerticalIcon,
    ExternalLinkIcon,
    ListPlusIcon,
    MenuIcon,
    PlayIcon,
    RotateCcwIcon,
    Trash2Icon,
    UserIcon,
    XIcon,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { Chip, type ChipTone } from '@winterop-com/sokkel-ui/Chip'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import {
    type CellFocus,
    type DataAction,
    type DataColumn,
    type DataRowTone,
    DataTable,
    DataTableGroup,
    type DataSort,
    findInTree,
    sortRows,
    TableCellFill,
    treeBranchKeys,
    useTableCell,
} from '@winterop-com/sokkel-ui/DataTable'
import { FileTypeIcon, formatSize } from '@winterop-com/sokkel-ui/FileList'
import { InlineCode } from '@winterop-com/sokkel-ui/InlineCode'
import { ItemHeading } from '@winterop-com/sokkel-ui/ItemHeading'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Checkbox } from '@winterop-com/sokkel-ui/primitives/checkbox'
import {
    Empty as EmptyBox,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@winterop-com/sokkel-ui/primitives/empty'
import { DueText } from '@winterop-com/sokkel-ui/DueText'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { saveTask, TASK_PEOPLE, TASK_PROJECTS, taskDate, type TaskRow, TASKS, TASKS_TODAY } from '../fixtures/tasks'
import { type Album, makeAlbums } from '../fixtures/albums'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { folderContents, type FolderRow, makeFolderTree, projectFolders } from '../fixtures/folders'
import { JOB_OWNERS, JOB_SETTINGS, type JobSetting, saveJobSetting } from '../fixtures/jobs'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { makeRuns, makeRunTree, startedAt, type TableRun, took, type TreeRow } from '../fixtures/tableRuns'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A table for many rows. Only the rows in view are drawn, so the 10k and 50k tables scroll like
 * the 100. Each column head sorts; the boxes select, Shift picks a range, and the bar above then
 * offers what to do with the selection. The menu at a row's end, or a right-click on the row,
 * offers what to do with that row. The column menu at the bar's end hides columns; the first stays
 * put while the rest scroll sideways, and every column head's right edge resizes its column. A
 * tree's rows open to their children, at any depth or loaded as a branch opens, and choosing a
 * project chooses every run in it. A short listing drops the bar above its head.
 */
const meta: Meta = { title: 'Patterns/Data table', parameters: { frame: 'padded' } }
export default meta

const COLUMNS: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span>, sortValue: (run) => run.id },
    {
        id: 'job',
        header: 'Job',
        width: 'minmax(10rem,1fr)',
        cell: (run) => <span className="font-mono">{run.job}</span>,
        sortValue: (run) => run.job,
    },
    { id: 'project', header: 'Project', width: '7rem', cell: (run) => run.project, sortValue: (run) => run.project },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} />, sortValue: (run) => run.state },
    { id: 'step', header: 'Step', width: '6.5rem', cell: (run) => run.step, sortValue: (run) => run.step },
    {
        id: 'by',
        header: 'Started by',
        width: '7rem',
        cell: (run) => <span className="text-muted-foreground">{run.by}</span>,
        sortValue: (run) => run.by,
    },
    { id: 'started', header: 'Started', width: '8rem', cell: (run) => startedAt(run.ago), sortValue: (run) => -run.ago },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (run) => took(run.duration),
        sortValue: (run) => run.duration,
    },
    {
        id: 'records',
        header: 'Records',
        width: '6.5rem',
        align: 'end',
        cell: (run) => run.records.toLocaleString('en-US'),
        sortValue: (run) => run.records,
    },
    { id: 'attempts', header: 'Attempts', width: '5.5rem', align: 'end', cell: (run) => run.attempts, sortValue: (run) => run.attempts },
]

const runActions = (run: TableRun): DataAction[] => [
    { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => undefined },
    {
        id: 'retry',
        label: 'Retry',
        icon: <RotateCcwIcon />,
        disabled: run.state === 'running' || run.state === 'queued',
        onSelect: () => undefined,
    },
    { id: 'copy', label: 'Copy run ID', icon: <CopyIcon />, onSelect: () => undefined },
    { id: 'line', separator: true },
    {
        id: 'cancel',
        label: 'Cancel run',
        icon: <XIcon />,
        destructive: true,
        disabled: run.state !== 'running' && run.state !== 'queued',
        onSelect: () => undefined,
    },
]

const bulk = (_: ReadonlySet<string>, clear: () => void) => (
    <>
        <Button variant="outline" size="xs" onClick={clear}>
            <RotateCcwIcon />
            Retry
        </Button>
        <Button variant="outline" size="xs" onClick={clear}>
            <XIcon />
            Cancel
        </Button>
    </>
)

/** Tidevann's runs in a table that fills the canvas, with search, selection, menus and the opened row. */
function Runs({
    count,
    defaultSelection,
    defaultSort = null,
    reorderable,
}: {
    count: number
    defaultSelection?: ReadonlySet<string>
    defaultSort?: DataSort | null
    reorderable?: boolean
}) {
    const all = makeRuns(count)
    const [query, setQuery] = useState('')
    const [opened, setOpened] = useState<string | undefined>(undefined)
    const rows = useMemo(() => {
        const wanted = query.trim().toLowerCase()
        return wanted === ''
            ? all
            : all.filter((run) => run.id.includes(wanted) || run.job.includes(wanted) || run.project.includes(wanted))
    }, [all, query])
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={rows}
                rowKey={(run) => run.id}
                selectable
                defaultSelection={defaultSelection}
                defaultSort={defaultSort}
                reorderable={reorderable}
                bulkActions={bulk}
                rowActions={runActions}
                onOpen={(run) => setOpened(run.id)}
                opened={(run) => run.id === opened}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
            />
        </Stack>
    )
}

interface ListRun {
    id: string
    job: string
    state: 'succeeded' | 'failed' | 'running' | 'queued'
    by: string
    took: string
    note: string
}

const LIST_RUNS: ListRun[] = [
    {
        id: 'r1',
        job: 'import-orders',
        state: 'running',
        by: 'schedule',
        took: '1m 12s',
        note: 'Reading the third of four files from the orders bucket.',
    },
    {
        id: 'r2',
        job: 'nightly-export',
        state: 'failed',
        by: 'schedule',
        took: '4.2s',
        note: 'The upload step was refused: the bucket on files.example.org asked for a fresh token, and the run stopped before it wrote anything, so the export can be retried as it is.',
    },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', by: 'ada', took: '6m 03s', note: 'Rebuilt 1,204,880 entries.' },
    { id: 'r4', job: 'send-digest', state: 'succeeded', by: 'schedule', took: '12.8s', note: 'Sent to 48 people.' },
    { id: 'r5', job: 'sync-inventory', state: 'queued', by: 'grace', took: '-', note: 'Waiting for a worker.' },
]

const LIST_COLUMNS: DataColumn<ListRun>[] = [
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.state} /> },
    { id: 'by', header: 'Started by', width: '8rem', cell: (run) => <span className="text-muted-foreground">{run.by}</span> },
    { id: 'took', header: 'Took', width: '6rem', align: 'end', cell: (run) => <span className="tabular-nums">{run.took}</span> },
]

/** A short listing: no bar above the head, the column names as the box's head, and a foot that counts the rows loaded. */
export const ShortList: StoryObj = {
    name: 'Short list',
    render: () => (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS}
            rows={LIST_RUNS}
            rowKey={(run) => run.id}
            foot={`${String(LIST_RUNS.length)} of 248`}
        />
    ),
}

/** A chevron at each row's end (`chevron`): a press opens the run's own page rather than a panel beside the list. */
export const RowPages: StoryObj = {
    name: 'Row pages',
    render: () => (
        <DataTable variant="list" columns={LIST_COLUMNS} rows={LIST_RUNS} rowKey={(run) => run.id} onOpen={() => undefined} chevron />
    ),
}

/** Only a failed run can be retried; every other row's actions are empty. */
const listActions = (run: ListRun): DataAction[] =>
    run.state === 'failed' ? [{ id: 'retry', label: 'Retry', icon: <RotateCcwIcon />, onSelect: () => undefined }] : []

/** Menus on some rows only: a row whose actions are empty draws no button and opens no menu on a right-click. */
export const SomeMenus: StoryObj = {
    name: 'Some menus',
    render: () => <DataTable variant="list" columns={LIST_COLUMNS} rows={LIST_RUNS} rowKey={(run) => run.id} rowActions={listActions} />,
}

function Picking() {
    const [chosen, setChosen] = useState('r2')
    return (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS}
            rows={LIST_RUNS}
            rowKey={(one) => one.id}
            onOpen={(one) => setChosen(one.id)}
            opened={(one) => one.id === chosen}
            foot={`${String(LIST_RUNS.length)} of 248`}
        />
    )
}

/** A list that picks the row its detail shows: a click, Enter or Space picks it, and it is filled and marked selected. No boxes. */
export const Pick: StoryObj = {
    render: () => <Picking />,
}

/** A table whose columns keep their order: its columns menu shows and hides them, with no moves. */
export const FixedOrder: StoryObj = {
    name: 'Fixed order',
    parameters: { frame: 'none' },
    render: () => <Runs count={100} reorderable={false} />,
}

/** The tint under the pointer turned off, for a listing that should stay still. */
export const NoHover: StoryObj = {
    name: 'No hover',
    render: () => <DataTable variant="list" columns={LIST_COLUMNS} rows={LIST_RUNS} rowKey={(run) => run.id} hover={false} />,
}

/**
 * A list that turns to cards below a width of its own box (`stackBelow="64rem"`), such as the
 * width an app's listings go to cards under; the box's width, never the window's.
 */
export const StackWidth: StoryObj = {
    name: 'Stack width',
    render: () => <DataTable variant="list" columns={LIST_COLUMNS} rows={LIST_RUNS} rowKey={(run) => run.id} stackBelow="64rem" />,
}

interface Delivery {
    id: string
    name: string
    code: string
    channel: string
    via: string
}

const DELIVERIES: Delivery[] = [
    {
        id: 'd1',
        name: 'Nightly export to the harbor archive',
        code: 'nightly-export-harbor-archive',
        channel: 'Email',
        via: 'smtp-relay-harbor-primary-eu-north',
    },
    {
        id: 'd2',
        name: 'Inventory sync for juniper',
        code: 'sync-inventory-juniper',
        channel: 'Webhook',
        via: 'hooks-juniper-inventory-updates',
    },
    { id: 'd3', name: 'Weekly digest', code: 'send-digest-weekly', channel: 'Chat', via: 'larkspur-team-digest' },
]

/** A delivery's name over its code once stacked, so the code is never cut; beside it in a row. */
function DeliveryName({ delivery }: { delivery: Delivery }) {
    const { stacked } = useTableCell()
    return <ItemHeading name={delivery.name} code={delivery.code} variant={stacked ? 'stacked' : 'inline'} />
}

/**
 * Stacked on a phone, each card's title takes `stackTitle="free"`, so the name stands over its code
 * and the code is never cut; a line holding a chip and a long code keeps the chip and cuts the code.
 */
export const StackedNames: StoryObj = {
    name: 'Stacked names',
    render: () => (
        <DataTable
            variant="list"
            stackBelow="40rem"
            columns={[
                {
                    id: 'name',
                    header: 'Delivery',
                    width: 'minmax(16rem,2fr)',
                    stackTitle: 'free',
                    cell: (row) => <DeliveryName delivery={row} />,
                },
                {
                    id: 'via',
                    header: 'Delivers through',
                    width: 'minmax(14rem,1fr)',
                    stack: 'line',
                    cell: (row) => (
                        <Row gap="sm" className="min-w-0">
                            <Chip>{row.channel}</Chip>
                            <InlineCode value={row.via} bare />
                        </Row>
                    ),
                },
            ]}
            rows={DELIVERIES}
            rowKey={(row) => row.id}
        />
    ),
}

/** Rows that grow to fit a cell longer than one line, here each run's note. */
export const TallRows: StoryObj = {
    name: 'Tall rows',
    render: () => (
        <DataTable
            variant="list"
            rowHeight="auto"
            columns={[
                ...LIST_COLUMNS.slice(0, 2),
                {
                    id: 'note',
                    header: 'Note',
                    width: 'minmax(12rem,2fr)',
                    cell: (run) => <span className="text-muted-foreground">{run.note}</span>,
                },
            ]}
            rows={LIST_RUNS}
            rowKey={(run) => run.id}
        />
    ),
}

const RUN_STEPS: Record<string, { step: string; said: string }[]> = {
    r1: [
        { step: 'fetch', said: 'Three of four files read, 12,400 orders so far.' },
        { step: 'transform', said: 'Waiting for fetch.' },
    ],
    r2: [
        { step: 'fetch', said: 'Read 2,310 rows from the warehouse.' },
        { step: 'transform', said: 'Wrote 2,310 rows as one file.' },
        { step: 'upload', said: 'Refused: files.example.org asked for a fresh token. Nothing was written.' },
    ],
    r3: [
        { step: 'fetch', said: 'Read every entry from the store.' },
        { step: 'validate', said: 'Every entry had a key and a body.' },
        { step: 'upload', said: 'Swapped the new index in for the old one.' },
    ],
    r4: [
        { step: 'transform', said: 'Built a digest for each of 48 people.' },
        { step: 'notify', said: 'Sent 48 mails, none returned.' },
    ],
}

/**
 * Each run opens into its own detail (`detail`): its note and what each step said, drawn under the
 * row across the table rather than as more rows. The failed run starts open; the queued run has no
 * detail and no control. A press, Enter or Right opens a row, Left closes it.
 */
export const RowDetail: StoryObj = {
    name: 'Row detail',
    render: () => (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS}
            rows={LIST_RUNS}
            rowKey={(run) => run.id}
            defaultExpanded={new Set(['r2'])}
            detail={(run) =>
                RUN_STEPS[run.id] === undefined ? undefined : (
                    <Stack gap="sm">
                        <p className="text-muted-foreground">{run.note}</p>
                        <DescriptionList
                            termWidth="6rem"
                            items={RUN_STEPS[run.id].map((step) => ({
                                term: <span className="font-mono">{step.step}</span>,
                                value: step.said,
                            }))}
                        />
                    </Stack>
                )
            }
        />
    ),
}

interface AccountToken {
    id: string
    name: string
    scope: string
    expires: string
    state: 'active' | 'expiring' | 'expired' | 'revoked'
}

interface Account {
    id: string
    name: string
    email: string
    role: 'Admin' | 'Editor' | 'Viewer'
    active: boolean
    about: string
    tokens: AccountToken[]
}

const ACCOUNTS: Account[] = [
    {
        id: 'ada',
        name: 'ada',
        email: 'ada@example.org',
        role: 'Admin',
        active: true,
        about: 'Runs the harbor and juniper projects and keeps the scheduler fed.',
        tokens: [
            { id: 'ada-1', name: 'deploy-harbor', scope: 'jobs:write', expires: '2027-03-01', state: 'active' },
            { id: 'ada-2', name: 'nightly-export', scope: 'runs:read', expires: '2026-11-14', state: 'expiring' },
            { id: 'ada-3', name: 'laptop', scope: 'all', expires: '2026-06-30', state: 'expired' },
        ],
    },
    {
        id: 'grace',
        name: 'grace',
        email: 'grace@example.org',
        role: 'Editor',
        active: true,
        about: 'Writes the import-orders and sync-inventory jobs for larkspur.',
        tokens: [
            { id: 'grace-1', name: 'sync-inventory', scope: 'jobs:write', expires: '2027-01-15', state: 'active' },
            { id: 'grace-2', name: 'import-orders', scope: 'jobs:write', expires: '2026-09-01', state: 'revoked' },
        ],
    },
    {
        id: 'linus',
        name: 'linus',
        email: 'linus@example.org',
        role: 'Viewer',
        active: true,
        about: 'Reads the run history for the weekly digest.',
        tokens: [],
    },
    {
        id: 'margaret',
        name: 'margaret',
        email: 'margaret@example.org',
        role: 'Editor',
        active: false,
        about: 'Switched off since she moved to another team; her tokens were revoked with her account.',
        tokens: [{ id: 'margaret-1', name: 'rebuild-index', scope: 'jobs:write', expires: '2026-12-31', state: 'revoked' }],
    },
]

const TOKEN_STATES: Record<AccountToken['state'], { label: string; tone: ChipTone }> = {
    active: { label: 'Active', tone: 'good' },
    expiring: { label: 'Expires soon', tone: 'warning' },
    expired: { label: 'Expired', tone: 'neutral' },
    revoked: { label: 'Revoked', tone: 'neutral' },
}

const TOKEN_COLUMNS: DataColumn<AccountToken>[] = [
    { id: 'name', header: 'Token', width: 'content', cell: (token) => <span className="font-mono">{token.name}</span> },
    { id: 'scope', header: 'Scope', width: 'minmax(6rem,1fr)', cell: (token) => <span className="font-mono">{token.scope}</span> },
    { id: 'expires', header: 'Expires', width: '7rem', cell: (token) => <span className="tabular-nums">{token.expires}</span> },
    {
        id: 'state',
        header: 'State',
        width: '8rem',
        cell: (token) => <Chip tone={TOKEN_STATES[token.state].tone}>{TOKEN_STATES[token.state].label}</Chip>,
    },
]

/** A revoked or expired token is dimmed, one about to expire is tinted. */
const tokenTone = (token: AccountToken): DataRowTone | undefined =>
    token.state === 'revoked' || token.state === 'expired' ? 'muted' : token.state === 'expiring' ? 'warning' : undefined

const ACCOUNT_COLUMNS: DataColumn<Account>[] = [
    {
        id: 'name',
        header: 'Account',
        width: 'content',
        cell: (account) => (
            <Stack gap="none">
                <span className="font-medium">{account.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{account.email}</span>
            </Stack>
        ),
        stackLabel: false,
    },
    { id: 'role', header: 'Role', width: '6rem', cell: (account) => account.role, stack: 'secondary' },
    {
        id: 'about',
        header: 'About',
        width: 'minmax(0,1fr)',
        cell: (account) => <span className="text-muted-foreground">{account.about}</span>,
        stack: 'primary',
    },
    {
        id: 'tokens',
        header: 'Tokens',
        width: '5rem',
        align: 'end',
        cell: (account) => account.tokens.length,
        stack: 'secondary',
    },
]

/** Accounts, each opening into its own table of tokens. */
function AccountList({ framed = true }: { framed?: boolean }) {
    return (
        <DataTable
            variant="list"
            rowHeight="auto"
            framed={framed}
            columns={ACCOUNT_COLUMNS}
            rows={ACCOUNTS}
            rowKey={(account) => account.id}
            rowTone={(account) => (account.active ? undefined : 'muted')}
            hasDetail={(account) => account.tokens.length > 0}
            expandLabel={(account, open) => `${open ? 'Hide' : 'Show'} the tokens of ${account.name}`}
            defaultExpanded={new Set(['ada'])}
            detail={(account) => (
                <DataTable
                    variant="list"
                    columns={TOKEN_COLUMNS}
                    rows={account.tokens}
                    rowKey={(token) => token.id}
                    rowTone={tokenTone}
                    empty="No tokens."
                />
            )}
        />
    )
}

/**
 * Accounts that open into their tokens (`detail`, with `hasDetail` so a token table is built only
 * for an opened account). The disclosure names its account (`expandLabel`), in its tooltip too; the
 * account column is as wide as its widest name (`width: 'content'`) and the about line shares the
 * rest. Margaret's account is switched off and dimmed, as are revoked and expired tokens
 * (`rowTone`); a token about to expire is tinted.
 */
export const AccountTokens: StoryObj = { name: 'Account tokens', render: () => <AccountList /> }

/**
 * A titled listing with its count: a boxed `Section` with the count in its head, around a list
 * drawn without a frame of its own (`framed={false}`), its column heads under the section's head.
 */
export const InSection: StoryObj = {
    name: 'In a section',
    render: () => (
        <Section title="Accounts" meta={ACCOUNTS.length} flush>
            <AccountList framed={false} />
        </Section>
    ),
}

interface Job {
    id: string
    name: string
    step: string
    state: string
    runs: number
    about: string
    service: string
    projects: string[]
}

const JOBS: Job[] = [
    {
        id: 'nightly-export',
        name: 'Nightly export',
        step: 'upload',
        state: 'failed',
        runs: 412,
        about: 'Writes the day’s orders to files.example.org.',
        service: 'worker',
        projects: ['harbor', 'juniper', 'larkspur'],
    },
    {
        id: 'sync-inventory',
        name: 'Sync inventory',
        step: 'transform',
        state: 'running',
        runs: 1_208,
        about: 'Brings stock counts from every site.',
        service: 'scheduler',
        projects: ['juniper'],
    },
    {
        id: 'rebuild-index',
        name: 'Rebuild index',
        step: 'validate',
        state: 'succeeded',
        runs: 96,
        about: 'Rebuilds the search index from scratch.',
        service: 'worker',
        projects: ['harbor', 'larkspur'],
    },
    {
        id: 'send-digest',
        name: 'Send digest',
        step: 'notify',
        state: 'queued',
        runs: 52,
        about: 'Sends the weekly digest to its readers.',
        service: 'api',
        projects: ['larkspur', 'harbor'],
    },
    {
        id: 'import-orders',
        name: 'Import orders',
        step: 'fetch',
        state: 'succeeded',
        runs: 3_310,
        about: 'Takes in the orders of every region.',
        service: 'api',
        projects: ['harbor', 'juniper', 'larkspur'],
    },
]

const JOB_COLUMNS: DataColumn<Job>[] = [
    {
        id: 'job',
        header: 'Job',
        width: 'content',
        maxWidth: '24rem',
        cell: (job) => <ItemHeading variant="inline" as="span" name={job.name} code={job.id} />,
    },
    { id: 'step', header: 'Step', width: 'content', cell: (job) => <span className="font-mono font-semibold">{job.step}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (job) => <StatusChip status={job.state} /> },
    { id: 'about', header: 'About', width: 'minmax(8rem,1fr)', cell: (job) => <span className="text-muted-foreground">{job.about}</span> },
    { id: 'runs', header: 'Runs', width: '5rem', align: 'end', cell: (job) => job.runs.toLocaleString('en-US') },
]

/** About how wide a chip of a short name is with the gap after it, and the chip that counts the rest, in pixels. */
const CHIP = 88
const MORE_CHIP = 40

/** A job's tags as chips, as many as its own column's room holds (`useTableCell().columnWidth`) and a count of the rest. */
function JobTags({ tags }: { tags: readonly string[] }) {
    const { columnWidth } = useTableCell()
    const fit = tags.length * CHIP <= columnWidth ? tags.length : Math.max(1, Math.floor((columnWidth - MORE_CHIP) / CHIP))
    return (
        <Row gap="2xs" inline>
            {tags.slice(0, fit).map((tag) => (
                <Chip key={tag}>{tag}</Chip>
            ))}
            {tags.length > fit && <Chip>+{tags.length - fit}</Chip>}
        </Row>
    )
}

const DELIVERY_COLUMNS: DataColumn<Job>[] = [
    JOB_COLUMNS[0],
    JOB_COLUMNS[1],
    { id: 'service', header: 'Delivers through', width: 'content', cell: (job) => <span className="font-mono">{job.service}</span> },
    { id: 'projects', header: 'Projects', width: 'minmax(6rem,1fr)', cell: (job) => <JobTags tags={job.projects} /> },
    JOB_COLUMNS[2],
]

/**
 * Jobs whose heading and step are as wide as their widest cell (`width: 'content'`), measured again
 * once the fonts have loaded; the about line shares the rest. Once the content columns and the
 * least of the others no longer fit the box, the rows stack as cards.
 */
export const ContentWidths: StoryObj = {
    name: 'Content widths',
    render: () => <DataTable variant="list" columns={JOB_COLUMNS} rows={JOBS} rowKey={(job) => job.id} stackBelow="64rem" />,
}

const FILLED_COLUMNS: DataColumn<Job>[] = [
    {
        id: 'job',
        header: 'Job',
        width: 'content',
        minWidth: '14rem',
        cell: (job) => (
            <Stack gap="none">
                <span className="font-mono">{job.id}</span>
                <TableCellFill>
                    <span className="text-xs text-muted-foreground">{job.about}</span>
                </TableCellFill>
            </Stack>
        ),
    },
    JOB_COLUMNS[1],
    JOB_COLUMNS[2],
    {
        id: 'service',
        header: 'Delivers through',
        width: 'minmax(8rem,1fr)',
        cell: (job) => <span className="font-mono">{job.service}</span>,
    },
    JOB_COLUMNS[4],
]

/**
 * Each job's code over its description in a content column: the codes set the column's width, no
 * narrower than its `minWidth`, and the description (`TableCellFill`) takes that whole width
 * without adding to it, cut short within it.
 */
export const CellFill: StoryObj = {
    name: 'Cell fill',
    render: () => <DataTable variant="list" rowHeight="auto" columns={FILLED_COLUMNS} rows={JOBS} rowKey={(job) => job.id} />,
}

/**
 * Two sections of jobs in one `DataTableGroup`, so their content columns take the widest of both
 * tables and line up. Each job's projects show as many chips as their column's room holds
 * (`useTableCell`); stacked, every line's name is as wide as the widest, "Delivers through" whole.
 */
export const SharedWidths: StoryObj = {
    name: 'Shared widths',
    render: () => (
        <DataTableGroup>
            <Stack gap="md">
                <Section title="Scheduled" meta={3} flush>
                    <DataTable
                        variant="list"
                        framed={false}
                        columns={DELIVERY_COLUMNS}
                        rows={JOBS.slice(0, 3)}
                        rowKey={(job) => job.id}
                        stackBelow="48rem"
                    />
                </Section>
                <Section title="On demand" meta={2} flush>
                    <DataTable
                        variant="list"
                        framed={false}
                        columns={DELIVERY_COLUMNS}
                        rows={JOBS.slice(3)}
                        rowKey={(job) => job.id}
                        stackBelow="48rem"
                    />
                </Section>
            </Stack>
        </DataTableGroup>
    ),
}

const TAG_COLUMNS: DataColumn<Job>[] = [
    JOB_COLUMNS[0],
    {
        id: 'tags',
        header: 'Tags',
        width: 'minmax(6rem,1fr)',
        cell: (job) => <JobTags tags={[...job.projects, job.service, job.step]} />,
    },
    JOB_COLUMNS[2],
    JOB_COLUMNS[4],
]

/**
 * Each job's tags on a column that shares the table's room: as many chips as the column's own
 * width holds (`useTableCell().columnWidth`) and a count of the rest, folding as the column
 * narrows, and to its line's room once the rows stack.
 */
export const FoldingTags: StoryObj = {
    name: 'Folding tags',
    render: () => <DataTable variant="list" columns={TAG_COLUMNS} rows={JOBS} rowKey={(job) => job.id} stackBelow="40rem" />,
}

const STATE_NAMES: Record<string, string> = { running: 'Running', queued: 'Queued', failed: 'Failed', succeeded: 'Succeeded' }

/** A short listing grouped by state, the runs still going first; each head folds its group. */
export const GroupedList: StoryObj = {
    name: 'Grouped list',
    render: () => (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS.filter((column) => column.id !== 'state')}
            rows={LIST_RUNS}
            rowKey={(run) => run.id}
            groupBy="state"
            groupOrder={['running', 'queued', 'failed']}
            groupLabel={(state) => STATE_NAMES[state] ?? state}
        />
    ),
}

interface JobCounts {
    job: string
    counts: Record<string, number>
}

const BAND_SERVICES = ['api', 'worker'] as const
const BAND_STATES = ['succeeded', 'failed', 'cancelled'] as const
const JOB_COUNTS: JobCounts[] = [
    {
        job: 'nightly-export',
        counts: {
            'api-succeeded': 28,
            'api-failed': 2,
            'api-cancelled': 0,
            'worker-succeeded': 30,
            'worker-failed': 0,
            'worker-cancelled': 1,
        },
    },
    {
        job: 'sync-inventory',
        counts: {
            'api-succeeded': 412,
            'api-failed': 9,
            'api-cancelled': 3,
            'worker-succeeded': 380,
            'worker-failed': 41,
            'worker-cancelled': 3,
        },
    },
    {
        job: 'rebuild-index',
        counts: {
            'api-succeeded': 4,
            'api-failed': 0,
            'api-cancelled': 0,
            'worker-succeeded': 3,
            'worker-failed': 1,
            'worker-cancelled': 0,
        },
    },
    {
        job: 'send-digest',
        counts: {
            'api-succeeded': 30,
            'api-failed': 0,
            'api-cancelled': 1,
            'worker-succeeded': 31,
            'worker-failed': 0,
            'worker-cancelled': 0,
        },
    },
    {
        job: 'import-orders',
        counts: {
            'api-succeeded': 96,
            'api-failed': 4,
            'api-cancelled': 0,
            'worker-succeeded': 88,
            'worker-failed': 12,
            'worker-cancelled': 0,
        },
    },
]
const BAND_COLUMNS: DataColumn<JobCounts>[] = [
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (row) => <span className="font-mono">{row.job}</span> },
    ...BAND_SERVICES.flatMap((service) =>
        BAND_STATES.map((state): DataColumn<JobCounts> => ({
            id: `${service}-${state}`,
            header: state,
            band: service,
            width: '6.5rem',
            align: 'end',
            cell: (row) => row.counts[`${service}-${state}`].toLocaleString('en-US'),
        })),
    ),
    {
        id: 'total',
        header: 'Total',
        width: '6rem',
        align: 'end',
        cell: (row) => (
            <span className="font-medium">
                {Object.values(row.counts)
                    .reduce((sum, count) => sum + count, 0)
                    .toLocaleString('en-US')}
            </span>
        ),
    },
]

/**
 * Columns in bands (`band`): a month's runs of each job by service, and under each service by how
 * they ended, a rule where each band starts and ends. A list given a search keeps its bar. Stacked,
 * each line is named by its band and its header.
 */
export const Bands: StoryObj = {
    render: function Render() {
        const [query, setQuery] = useState('')
        return (
            <DataTable
                variant="list"
                columns={BAND_COLUMNS}
                rows={JOB_COUNTS.filter((row) => row.job.includes(query.trim()))}
                rowKey={(row) => row.job}
                minWidth="auto"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                empty="No job is named like that."
            />
        )
    },
}

const TODAY = taskDate(TASKS_TODAY)
const PEOPLE_OPTIONS = TASK_PEOPLE.map((person) => ({ value: person }))
const PROJECT_OPTIONS = TASK_PROJECTS.map((project) => ({ value: project }))

/** Tidevann's tasks in a list that stacks compact: each edited in place, done from its box. */
function TaskList() {
    const [tasks, setTasks] = useState(TASKS)
    const put = (task: TaskRow, patch: Partial<TaskRow>) =>
        setTasks((all) => all.map((one) => (one.id === task.id ? { ...one, ...patch } : one)))
    const change = (task: TaskRow, patch: Partial<TaskRow>) => saveTask().then(() => put(task, patch))
    const columns: DataColumn<TaskRow>[] = [
        {
            id: 'done',
            header: 'Done',
            width: '3rem',
            resizable: false,
            stack: 'lead',
            cell: (task) => (
                <Checkbox
                    aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                    checked={task.done}
                    onCheckedChange={(done) => put(task, { done })}
                />
            ),
        },
        {
            id: 'title',
            header: 'Title',
            width: 'minmax(14rem,1fr)',
            cell: (task) => <span className={task.done ? 'text-muted-foreground line-through' : undefined}>{task.title}</span>,
            edit: {
                editor: 'text',
                value: (task) => task.title,
                validate: (title) => (title.trim() === '' ? 'A task needs a title.' : null),
                save: (task, title) => change(task, { title: title.trim() }),
            },
        },
        {
            id: 'due',
            header: 'Due',
            width: '7rem',
            cell: (task) => <DueText date={task.due === null ? undefined : taskDate(task.due)} now={TODAY} done={task.done} />,
            edit: { editor: 'date', value: (task) => task.due, save: (task, due) => change(task, { due }) },
        },
        {
            id: 'assignee',
            header: 'Assignee',
            width: '8rem',
            cell: (task) => (
                <Row gap="2xs" inline>
                    <PersonAvatar name={task.assignee} size="2xs" />
                    {task.assignee}
                </Row>
            ),
            edit: {
                editor: 'select',
                options: PEOPLE_OPTIONS,
                value: (task) => task.assignee,
                save: (task, assignee) => change(task, { assignee: assignee as TaskRow['assignee'] }),
            },
        },
        {
            id: 'project',
            header: 'Project',
            width: '7rem',
            cell: (task) => task.project,
            edit: {
                editor: 'select',
                options: PROJECT_OPTIONS,
                value: (task) => task.project,
                save: (task, project) => change(task, { project: project as TaskRow['project'] }),
            },
        },
    ]
    return (
        <DataTable
            variant="list"
            stackLayout="compact"
            columns={columns}
            rows={tasks}
            rowKey={(task) => task.id}
            rowActions={(task) => [
                {
                    id: 'done',
                    label: task.done ? 'Reopen' : 'Mark done',
                    icon: <CheckIcon />,
                    onSelect: () => put(task, { done: !task.done }),
                },
                { id: 'line', separator: true },
                {
                    id: 'delete',
                    label: 'Delete',
                    icon: <Trash2Icon />,
                    destructive: true,
                    onSelect: () => setTasks((all) => all.filter((one) => one.id !== task.id)),
                },
            ]}
            editing={tableEditing}
        />
    )
}

/**
 * Tidevann's tasks as a list whose rows stack compact on a narrow box (see it at a phone's width):
 * the done box before the title, and the due day, the assignee and the project in one quiet line
 * under it. A press on the title or on a detail opens its editor in that line's place; each save
 * takes a moment. Wide, it is a list with the same cells edited in place.
 */
export const CompactList: StoryObj = { name: 'Compact list', render: () => <TaskList /> }

/** A hundred runs: the whole table at a size that needs no scrolling to see its parts. */
export const Hundred: StoryObj = { parameters: { frame: 'none' }, name: '100 rows', render: () => <Runs count={100} /> }

/** Five hundred runs. */
export const FiveHundred: StoryObj = { parameters: { frame: 'none' }, name: '500 rows', render: () => <Runs count={500} /> }

/** Ten thousand runs; only the rows in view are drawn. */
export const TenThousand: StoryObj = { parameters: { frame: 'none' }, name: '10k rows', render: () => <Runs count={10_000} /> }

/** Fifty thousand runs, sorted from a column head as quickly as the hundred. */
export const FiftyThousand: StoryObj = { parameters: { frame: 'none' }, name: '50k rows', render: () => <Runs count={50_000} /> }

/** Ten thousand runs fifty to a page: the table sorts them all and shows a page, with the pager at its foot. */
export const Pages: StoryObj = {
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={makeRuns(10_000)}
                rowKey={(run) => run.id}
                selectable
                bulkActions={bulk}
                rowActions={runActions}
                paging="client"
            />
        </Stack>
    ),
}

/** The first page selected from the head's box: the bar offers every one of the ten thousand as a second step. */
export const PageSelected: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Page selected',
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={makeRuns(10_000)}
                rowKey={(run) => run.id}
                selectable
                defaultSelection={
                    new Set(
                        makeRuns(10_000)
                            .slice(0, 50)
                            .map((run) => run.id),
                    )
                }
                bulkActions={bulk}
                rowActions={runActions}
                paging="client"
            />
        </Stack>
    ),
}

/** Pages as a server gives them: the app sorts and slices, as a server would, and the table shows the page it hears of. */
function ServerPages() {
    const all = makeRuns(50_000)
    const [sort, setSort] = useState<DataSort | null>(null)
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(50)
    const rows = useMemo(() => {
        const column = COLUMNS.find((one) => one.id === sort?.column)
        const sorted = sort === null || column?.sortValue === undefined ? all : sortRows(all, column.sortValue, sort.direction)
        return sorted.slice(page * size, (page + 1) * size)
    }, [all, sort, page, size])
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={rows}
                rowKey={(run) => run.id}
                rowActions={runActions}
                paging="server"
                total={all.length}
                manualSort
                sort={sort}
                onSortChange={setSort}
                page={page}
                onPageChange={setPage}
                pageSize={size}
                onPageSizeChange={setSize}
            />
        </Stack>
    )
}

/** Fifty thousand runs a page at a time from a server: only the page shown is ever handed to the table. */
export const ServerPaging: StoryObj = { parameters: { frame: 'none' }, name: 'Server pages', render: () => <ServerPages /> }

/** Runs arriving as they are scrolled to: 200 at first, 200 more each time the end comes near. */
function LoadMore() {
    const all = makeRuns(50_000)
    const [count, setCount] = useState(200)
    const [loading, setLoading] = useState(false)
    const timer = useRef<number | undefined>(undefined)
    const more = useCallback(() => {
        setLoading(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
            setCount((now) => Math.min(all.length, now + 200))
            setLoading(false)
        }, 600)
    }, [all.length])
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={all.slice(0, count)}
                rowKey={(run) => run.id}
                selectable
                bulkActions={bulk}
                rowActions={runActions}
                hasMore={count < all.length}
                loading={loading}
                onLoadMore={more}
            />
        </Stack>
    )
}

/** Progressive loading: the bar counts what has loaded, and placeholder rows stand in while more arrive. */
export const LoadsMore: StoryObj = { parameters: { frame: 'none' }, name: 'Load more', render: () => <LoadMore /> }

/** Runs twenty at a time, more only when the reader asks for them. */
function LoadByButton() {
    const all = makeRuns(120)
    const [count, setCount] = useState(20)
    const [loading, setLoading] = useState(false)
    const timer = useRef<number | undefined>(undefined)
    const more = useCallback(() => {
        setLoading(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
            setCount((now) => Math.min(all.length, now + 20))
            setLoading(false)
        }, 600)
    }, [all.length])
    return (
        <DataTable
            variant="list"
            rowHeight="auto"
            columns={COLUMNS.slice(0, 5)}
            rows={all.slice(0, count)}
            rowKey={(run) => run.id}
            hasMore={count < all.length}
            loading={loading}
            onLoadMore={more}
            loadMore="button"
            loadMoreCount={Math.min(20, all.length - count)}
            foot={`${String(count)} of ${String(all.length)}`}
        />
    )
}

/** Loading more by a button after the last row (`loadMore="button"`), for a list whose reader decides when to see more. */
export const LoadMoreButton: StoryObj = { name: 'Load more button', render: () => <LoadByButton /> }

/** The first rows still on their way: placeholder rows fill the table. */
export const Loading: StoryObj = {
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable className="flex-1" columns={COLUMNS} rows={[]} rowKey={(run) => run.id} selectable loading />
        </Stack>
    ),
}

/** Runs sorted by duration, longest first: the arrow in the head says which way. */
export const Sorted: StoryObj = {
    parameters: { frame: 'none' },
    render: () => <Runs count={500} defaultSort={{ column: 'duration', direction: 'desc' }} />,
}

/** Three runs selected: the bar says how many and offers to retry or cancel them, or to clear. */
export const Selection: StoryObj = {
    parameters: { frame: 'none' },
    render: () => <Runs count={500} defaultSelection={new Set(['run_8f3a01', 'run_8f3a02', 'run_8f3a04'])} />,
}

/** The run columns with what each says for a group: the records and time summed, the most attempts. */
const GROUP_COLUMNS: DataColumn<TableRun>[] = COLUMNS.map((column) =>
    column.id === 'records'
        ? { ...column, aggregate: (runs) => runs.reduce((sum, run) => sum + run.records, 0).toLocaleString('en-US') }
        : column.id === 'duration'
          ? { ...column, aggregate: (runs) => took(runs.reduce((sum, run) => sum + run.duration, 0)) }
          : column.id === 'attempts'
            ? { ...column, aggregate: (runs) => Math.max(...runs.map((run) => run.attempts)) }
            : column,
)

/** What each project holds, said in its group's head. */
const PROJECT_LABELS: Record<string, string> = {
    harbor: 'harbor: orders, stock and the nightly export',
    juniper: 'juniper: the search index and its rebuilds',
    larkspur: 'larkspur: the weekly digest',
}

function GroupedRuns() {
    const rows = useMemo(() => makeRuns(300), [])
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={GROUP_COLUMNS.filter((column) => column.id !== 'project')}
                rows={rows}
                rowKey={(run) => run.id}
                groupBy="project"
                groupLabel={(project) => PROJECT_LABELS[project] ?? project}
                defaultFoldedGroups={new Set(['larkspur'])}
                defaultSort={{ column: 'duration', direction: 'desc' }}
                defaultSelection={new Set(rows.filter((run) => run.project === 'harbor').map((run) => run.id))}
                selectable
                bulkActions={bulk}
                rowActions={runActions}
            />
        </Stack>
    )
}

/**
 * Runs under a head for each project, with its count and the records, time and attempts summed up
 * in its columns. A head's label runs on across the columns with nothing to sum, so the narrow Run
 * column never cuts it. Pressing a head folds its group (larkspur is folded), rows sort within their
 * group, and a head's box selects the group: harbor is selected whole.
 */
export const Groups: StoryObj = { parameters: { frame: 'none' }, render: () => <GroupedRuns /> }

/** The same actions with the retry and cancel buttons on the row itself, shown on hover. */
const quickActions = (run: TableRun): DataAction[] =>
    runActions(run).map((action) =>
        'separator' in action || (action.id !== 'retry' && action.id !== 'cancel') ? action : { ...action, inline: true },
    )

const MENUS: { title: string; what: string; props: Partial<Parameters<typeof DataTable<TableRun>>[0]> }[] = [
    {
        title: 'Right-click only',
        what: 'No button; a right-click on a row opens its menu.',
        props: { rowActions: runActions, actionButton: 'none' },
    },
    { title: 'Menu button', what: 'The menu button at every row’s end, always shown.', props: { rowActions: runActions } },
    {
        title: 'Menu on hover',
        what: 'The button, upright dots, shown on the row under the pointer.',
        props: { rowActions: runActions, actionButton: 'hover', actionIcon: <EllipsisVerticalIcon /> },
    },
    {
        title: 'Quick actions',
        what: 'Retry and cancel as buttons on the row under the pointer, the rest behind the menu.',
        props: { rowActions: quickActions, actionButton: 'hover', actionIcon: <MenuIcon /> },
    },
]

/** Four ways to reach a row's actions, side by side; every one also opens on a right-click. */
export const RowMenus: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Row menus',
    render: () => (
        <Columns count={2} min="xl" gap="lg" className="h-svh bg-background p-4 text-foreground">
            {MENUS.map((menu) => (
                <Stack key={menu.title} as="section" gap="sm" className="min-h-0">
                    <div className="text-sm">
                        <span className="font-medium">{menu.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{menu.what}</span>
                    </div>
                    <DataTable
                        className="flex-1"
                        columns={COLUMNS.slice(0, 5)}
                        rows={makeRuns(40)}
                        rowKey={(run) => run.id}
                        minWidth="36rem"
                        {...menu.props}
                    />
                </Stack>
            ))}
        </Columns>
    ),
}

const OWNER_OPTIONS = JOB_OWNERS.map((owner) => ({ value: owner }))

/** Tidevann's jobs with their settings edited in place, each cell saved on its own after a short wait. */
function EditableJobs({ cellFocus, count, fill = true }: { cellFocus?: CellFocus; count?: number; fill?: boolean }) {
    const [jobs, setJobs] = useState(count === undefined ? JOB_SETTINGS : JOB_SETTINGS.slice(0, count))
    const change = <K extends keyof JobSetting>(job: JobSetting, field: K, value: JobSetting[K]) =>
        saveJobSetting(field, value).then(() => setJobs((all) => all.map((one) => (one.id === job.id ? { ...one, [field]: value } : one))))
    const columns: DataColumn<JobSetting>[] = [
        {
            id: 'job',
            header: 'Job',
            width: '10rem',
            cell: (job) => <span className="font-mono">{job.job}</span>,
            sortValue: (job) => job.job,
        },
        { id: 'project', header: 'Project', width: '6.5rem', cell: (job) => job.project, sortValue: (job) => job.project },
        {
            id: 'schedule',
            header: 'Schedule',
            width: '9rem',
            cell: (job) => <span className="font-mono">{job.schedule}</span>,
            sortValue: (job) => job.schedule,
            edit: {
                editor: 'text',
                value: (job) => job.schedule,
                save: (job, schedule) => change(job, 'schedule', schedule),
                // A project's own schedule is set on the project, not here.
                enabled: (job) => job.locked !== true,
                display: (schedule) => <span className="font-mono">{schedule}</span>,
            },
        },
        {
            id: 'retries',
            header: 'Retries',
            width: '5.5rem',
            align: 'end',
            cell: (job) => job.retries,
            sortValue: (job) => job.retries,
            edit: {
                editor: 'number',
                value: (job) => job.retries,
                validate: (retries) => (retries === null || retries < 0 || retries > 10 ? 'Retries go from 0 to 10.' : undefined),
                save: (job, retries) => change(job, 'retries', retries ?? 0),
            },
        },
        {
            id: 'owner',
            header: 'Owner',
            width: '7rem',
            cell: (job) => job.owner,
            sortValue: (job) => job.owner,
            edit: {
                editor: 'select',
                options: OWNER_OPTIONS,
                value: (job) => job.owner,
                save: (job, owner) => change(job, 'owner', owner as JobSetting['owner']),
            },
        },
        {
            id: 'timeout',
            header: 'Timeout',
            width: '6rem',
            align: 'end',
            cell: (job) => (job.timeout === null ? <span className="text-muted-foreground">None</span> : `${String(job.timeout)} min`),
            sortValue: (job) => job.timeout ?? Number.POSITIVE_INFINITY,
            edit: {
                editor: 'number',
                value: (job) => job.timeout,
                display: (minutes) => (minutes === null ? 'None' : `${String(minutes)} min`),
                save: (job, timeout) => change(job, 'timeout', timeout),
            },
        },
        {
            id: 'paused',
            header: 'Paused until',
            width: '9.5rem',
            cell: (job) => job.pausedUntil ?? <span className="text-muted-foreground">Running</span>,
            sortValue: (job) => job.pausedUntil ?? '',
            edit: {
                editor: 'date',
                value: (job) => job.pausedUntil ?? null,
                save: (job, day) => change(job, 'pausedUntil', day),
            },
        },
        {
            id: 'note',
            header: 'Note',
            width: 'minmax(12rem,1fr)',
            cell: (job) => <span className="text-muted-foreground">{job.note}</span>,
            edit: { editor: 'multiline', value: (job) => job.note, save: (job, note) => change(job, 'note', note) },
        },
        { id: 'last', header: 'Last run', width: '7.5rem', cell: (job) => <StatusChip status={job.last} />, stack: 'secondary' },
    ]
    return (
        <Stack gap="none" className={fill ? 'h-svh bg-background p-4 text-foreground' : 'h-60'}>
            <DataTable
                className="flex-1"
                columns={columns}
                rows={jobs}
                rowKey={(job) => job.id}
                selectable
                bulkActions={bulk}
                minWidth="68rem"
                editing={tableEditing}
                cellFocus={cellFocus}
            />
        </Stack>
    )
}

/**
 * Cells edited in place: the schedule, retries, owner, timeout and note of each job. Press a cell
 * to make it active and again (or double-click, Enter or F2) to edit; typing a figure opens a number
 * cell on it. Enter saves and moves down, Tab saves and moves to the next editable cell, Escape drops
 * the edit, and the arrows move between cells. Each save takes a moment, shown in its cell; the
 * scheduler refuses a schedule without five fields, marking the cell with its reason, and retries
 * past ten are refused before anything is sent. The send-digest jobs' schedules are their
 * project's and cannot be edited here.
 */
export const EditableCells: StoryObj = { parameters: { frame: 'none' }, name: 'Editable cells', render: () => <EditableJobs /> }

const CELL_LOOKS: { look: CellFocus; name: string }[] = [
    { look: 'ring', name: 'A · Ring: a 2px ring in the focus color' },
    { look: 'soft', name: 'B · Soft: the cell washed, with a quiet outline' },
    { look: 'underline', name: 'C · Underline: a line in the focus color under the cell (the default)' },
    { look: 'row', name: 'D · Row: the whole row washed, a quiet line under the cell' },
]

/**
 * Four ways to mark the active cell of an editable table, `cellFocus`: press a cell in each to see
 * its look (only the table that has the focus marks its cell). The underline is the default. A press on a
 * table's empty ground, past its rows, leaves it.
 */
export const CellLooks: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Active cell looks',
    render: () => (
        <Stack gap="lg" className="min-h-svh bg-background p-4 text-foreground">
            {CELL_LOOKS.map(({ look, name }) => (
                <Stack key={look} gap="sm">
                    <GroupLabel>{name}</GroupLabel>
                    <EditableJobs cellFocus={look} count={3} fill={false} />
                </Stack>
            ))}
        </Stack>
    ),
}

const children = (row: TreeRow) => (row.kind === 'run' ? undefined : row.children)
const runOf = (row: TreeRow) => (row.kind === 'run' ? row.run : undefined)
const countRuns = (row: TreeRow): number => (row.kind === 'run' ? 1 : row.children.reduce((sum, child) => sum + countRuns(child), 0))
const countFailed = (row: TreeRow): number =>
    row.kind === 'run' ? (row.run.state === 'failed' ? 1 : 0) : row.children.reduce((sum, child) => sum + countFailed(child), 0)

const TREE_COLUMNS: DataColumn<TreeRow>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(16rem,1fr)',
        cell: (row) =>
            row.kind === 'project' ? (
                <span className="font-medium">{row.name}</span>
            ) : row.kind === 'job' ? (
                <span className="font-mono">{row.name}</span>
            ) : (
                <span className="font-mono text-muted-foreground">{row.run.id}</span>
            ),
        sortValue: (row) => (row.kind === 'run' ? row.run.id : row.name),
    },
    {
        id: 'runs',
        header: 'Runs',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.kind === 'run' ? '' : countRuns(row).toLocaleString('en-US')),
        sortValue: countRuns,
    },
    {
        id: 'failed',
        header: 'Failed',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.kind === 'run' ? '' : countFailed(row).toLocaleString('en-US')),
        sortValue: countFailed,
    },
    {
        id: 'state',
        header: 'State',
        width: '7.5rem',
        cell: (row) => (row.kind === 'run' ? <StatusChip status={row.run.state} /> : null),
        sortValue: (row) => runOf(row)?.state ?? '',
    },
    {
        id: 'started',
        header: 'Started',
        width: '8rem',
        cell: (row) => (row.kind === 'run' ? startedAt(row.run.ago) : ''),
        sortValue: (row) => -(runOf(row)?.ago ?? 0),
    },
    {
        id: 'duration',
        header: 'Duration',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.kind === 'run' ? took(row.run.duration) : ''),
        sortValue: (row) => runOf(row)?.duration ?? 0,
    },
]

/** Runs grouped by project and job, `count` runs in all, with the given branches open. */
function RunTree({ count, open }: { count: number; open: string[] }) {
    const rows = makeRunTree(count)
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={TREE_COLUMNS}
                rows={rows}
                rowKey={(row) => row.id}
                childRows={children}
                defaultExpanded={new Set(open)}
                selectable
                bulkActions={bulk}
                minWidth="44rem"
            />
        </Stack>
    )
}

/** Three hundred runs under their projects and jobs, one project and one job open. */
export const Tree: StoryObj = {
    parameters: { frame: 'none' },
    render: () => <RunTree count={300} open={['harbor', 'harbor/nightly-export']} />,
}

/** Fifty thousand runs under their projects and jobs, with a job of over three thousand runs open. */
export const LargeTree: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Large tree',
    render: () => <RunTree count={50_000} open={['harbor', 'harbor/nightly-export', 'juniper']} />,
}

const FOLDER_COLUMNS: DataColumn<FolderRow>[] = [
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(18rem,1fr)',
        cell: (row) => (
            <Row as="span" className="min-w-0">
                <FileTypeIcon kind={row.kind} className="size-4 shrink-0" />
                <span className="truncate font-mono">{row.name}</span>
            </Row>
        ),
        sortValue: (row) => `${row.kind === 'folder' ? 0 : 1}${row.name}`,
    },
    {
        id: 'size',
        header: 'Size',
        width: '6rem',
        align: 'end',
        cell: (row) => (row.size === undefined ? '' : formatSize(row.size)),
        sortValue: (row) => row.size ?? -1,
    },
    { id: 'modified', header: 'Modified', width: '8rem', cell: (row) => row.modified, sortValue: (row) => row.modified },
    {
        id: 'owner',
        header: 'Owner',
        width: '7rem',
        cell: (row) => <span className="text-muted-foreground">{row.owner}</span>,
        sortValue: (row) => row.owner,
    },
]

const folderChildren = (row: FolderRow) => row.children
const DEEP = makeFolderTree(8)
/** The way down to one folder eight deep. */
const DEEP_PATH = (() => {
    const path: string[] = []
    let level: readonly FolderRow[] = DEEP
    while (level.length > 0) {
        const folder = level.find((one) => one.kind === 'folder' && (one.children?.length ?? 0) > 0)
        if (folder === undefined) break
        path.push(folder.id)
        level = folder.children ?? []
    }
    return path
})()

function Frame({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            {children}
        </Stack>
    )
}

/** Folders in folders, eight deep, open along the way to the deepest. */
export const DeepTree: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Deep tree',
    render: () => (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={DEEP}
                rowKey={(row) => row.id}
                childRows={folderChildren}
                defaultExpanded={new Set(DEEP_PATH)}
                minWidth="40rem"
            />
        </Frame>
    ),
}

function OpenAllTree() {
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['harbor']))
    const every = useMemo(() => treeBranchKeys(DEEP, (row) => row.id, folderChildren), [])
    return (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={DEEP}
                rowKey={(row) => row.id}
                childRows={folderChildren}
                expanded={expanded}
                onExpandedChange={setExpanded}
                minWidth="40rem"
                toolbar={
                    <>
                        <Button variant="outline" size="xs" onClick={() => setExpanded(every)}>
                            Open all
                        </Button>
                        <Button variant="outline" size="xs" onClick={() => setExpanded(new Set())}>
                            Close all
                        </Button>
                    </>
                }
            />
        </Frame>
    )
}

/** Every branch opened or closed at once from the bar, the open branches held by the app. */
export const OpenAll: StoryObj = { parameters: { frame: 'none' }, name: 'Open all', render: () => <OpenAllTree /> }

/** The deep tree cut down to the names holding `text`. */
function findFolders(text: string) {
    const wanted = text.trim().toLowerCase()
    return findInTree({
        rows: DEEP,
        rowKey: (row) => row.id,
        childRows: folderChildren,
        match: wanted === '' ? undefined : (row) => row.name.toLowerCase().includes(wanted),
    })
}

function FindInTree({ initial }: { initial: string }) {
    const [query, setQuery] = useState(initial)
    const found = useMemo(() => findFolders(query), [query])
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(found.open)
    return (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={found.rows}
                rowKey={(row) => row.id}
                childRows={found.childRows}
                expanded={expanded}
                onExpandedChange={setExpanded}
                minWidth="40rem"
                words={{ empty: 'Nothing matches.' }}
                search={
                    <SearchField
                        value={query}
                        onChange={(text) => {
                            setQuery(text)
                            setExpanded(findFolders(text).open)
                        }}
                        placeholder="Find"
                    />
                }
            />
        </Frame>
    )
}

/** A find in the tree: only the branches with a match stay, opened down to every match. */
export const TreeFind: StoryObj = { parameters: { frame: 'none' }, name: 'Tree find', render: () => <FindInTree initial="summary" /> }

function OnDemandTree() {
    const load = useCallback(
        (row: FolderRow) =>
            new Promise<readonly FolderRow[]>((resolve) => {
                setTimeout(() => resolve(folderContents(row, 12)), 900)
            }),
        [],
    )
    return (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={projectFolders()}
                rowKey={(row) => row.id}
                hasChildren={(row) => row.kind === 'folder'}
                loadChildren={load}
                minWidth="40rem"
            />
        </Frame>
    )
}

/** Folders whose contents load as each one first opens, a spinner in its control while they come. */
export const OnDemand: StoryObj = { parameters: { frame: 'none' }, name: 'On demand', render: () => <OnDemandTree /> }

const folderActions = (row: FolderRow): DataAction[] =>
    row.kind === 'folder'
        ? [
              { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => undefined },
              { id: 'new', label: 'New folder', icon: <ListPlusIcon />, onSelect: () => undefined },
              { id: 'copy', label: 'Copy path', icon: <CopyIcon />, onSelect: () => undefined },
              { id: 'line', separator: true },
              { id: 'delete', label: 'Delete', icon: <Trash2Icon />, destructive: true, onSelect: () => undefined },
          ]
        : [
              { id: 'open', label: 'Open', icon: <ExternalLinkIcon />, onSelect: () => undefined },
              { id: 'copy', label: 'Copy path', icon: <CopyIcon />, onSelect: () => undefined },
              { id: 'line', separator: true },
              { id: 'delete', label: 'Delete', icon: <Trash2Icon />, destructive: true, onSelect: () => undefined },
          ]

/** A tree whose rows have menus, from the button at each row's end or a right-click, folders and files offering different things. */
export const TreeMenus: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Tree menus',
    render: () => (
        <Frame>
            <DataTable
                className="flex-1"
                columns={FOLDER_COLUMNS}
                rows={DEEP}
                rowKey={(row) => row.id}
                childRows={folderChildren}
                defaultExpanded={new Set(DEEP_PATH.slice(0, 3))}
                rowActions={folderActions}
                minWidth="40rem"
            />
        </Frame>
    ),
}

const ALBUM_COLUMNS: DataColumn<Album>[] = [
    {
        id: 'title',
        header: 'Title',
        width: 'minmax(12rem,1fr)',
        cell: (album) => <span className="font-medium">{album.title}</span>,
        sortValue: (album) => album.title,
    },
    { id: 'artist', header: 'Artist', width: '10rem', cell: (album) => album.artist, sortValue: (album) => album.artist },
    { id: 'year', header: 'Year', width: '5rem', align: 'end', cell: (album) => album.year, sortValue: (album) => album.year },
    { id: 'tracks', header: 'Tracks', width: '5rem', align: 'end', cell: (album) => album.tracks, sortValue: (album) => album.tracks },
    {
        id: 'length',
        header: 'Length',
        width: '6rem',
        align: 'end',
        cell: (album) => took(album.length),
        sortValue: (album) => album.length,
    },
    {
        id: 'plays',
        header: 'Plays',
        width: '7rem',
        align: 'end',
        cell: (album) => album.plays.toLocaleString('en-US'),
        sortValue: (album) => album.plays,
    },
]

const albumActions = (): DataAction[] => [
    { id: 'play', label: 'Play', icon: <PlayIcon />, onSelect: () => undefined },
    { id: 'queue', label: 'Add to queue', icon: <ListPlusIcon />, onSelect: () => undefined },
    { id: 'artist', label: 'Go to artist', icon: <UserIcon />, onSelect: () => undefined },
    { id: 'line', separator: true },
    { id: 'remove', label: 'Remove from library', icon: <Trash2Icon />, destructive: true, onSelect: () => undefined },
]

/** An album as a card: its cover filling the top, its title, artist and year under it. */
function AlbumCard({ album }: { album: Album }) {
    return (
        <Stack gap="sm" className="h-full rounded-surface border border-border bg-card p-2 group-hover/card:bg-hover">
            <Artwork cover={album.cover} className="min-h-0 w-full flex-1 rounded-mini" />
            <div className="min-w-0 px-0.5">
                <div className="truncate text-sm font-medium">{album.title}</div>
                <MetaLine truncate items={[album.artist, album.year]} />
            </div>
        </Stack>
    )
}

/** A library of `count` albums as cards, switchable to the table, with search, selection and menus. */
function Albums({ count }: { count: number }) {
    const all = makeAlbums(count)
    const [query, setQuery] = useState('')
    const rows = useMemo(() => {
        const wanted = query.trim().toLowerCase()
        return wanted === ''
            ? all
            : all.filter((album) => album.title.toLowerCase().includes(wanted) || album.artist.toLowerCase().includes(wanted))
    }, [all, query])
    return (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={ALBUM_COLUMNS}
                rows={rows}
                rowKey={(album) => album.id}
                card={(album) => <AlbumCard album={album} />}
                defaultView="grid"
                cardWidth="9rem"
                cardHeight="13.5rem"
                selectable
                rowActions={albumActions}
                actionButton="hover"
                bulkActions={(_, clear) => (
                    <Button variant="outline" size="xs" onClick={clear}>
                        <ListPlusIcon />
                        Add to queue
                    </Button>
                )}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                minWidth="40rem"
            />
        </Stack>
    )
}

/** 2,400 albums as cards: the grid fits as many to a line as the width allows, and the switch in the bar shows the same rows as a table. */
export const AlbumGrid: StoryObj = { parameters: { frame: 'none' }, name: 'Albums', render: () => <Albums count={2_400} /> }

/** Fifty thousand albums as cards; only the lines in view are drawn, and the sort menu orders them all. */
export const LargeAlbumGrid: StoryObj = { parameters: { frame: 'none' }, name: '50k albums', render: () => <Albums count={50_000} /> }

/** A search that matches nothing. */
export const Empty: StoryObj = {
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
            <DataTable
                className="flex-1"
                columns={COLUMNS}
                rows={[]}
                rowKey={(run) => run.id}
                selectable
                words={{ empty: 'No runs match the search.' }}
            />
        </Stack>
    ),
}

/** A list with nothing in it yet, saying so with an icon, a sentence and the way to make the first. */
export const EmptyState: StoryObj = {
    name: 'Empty state',
    render: () => (
        <DataTable
            variant="list"
            columns={LIST_COLUMNS}
            rows={[]}
            rowKey={(run) => run.id}
            empty={
                <EmptyBox>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <PlayIcon />
                        </EmptyMedia>
                        <EmptyTitle>No runs yet</EmptyTitle>
                        <EmptyDescription>Runs show here once a job has started.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button size="sm">
                            <PlayIcon />
                            Run a job
                        </Button>
                    </EmptyContent>
                </EmptyBox>
            }
        />
    ),
}
