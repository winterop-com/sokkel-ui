import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Board, type BoardMove } from '@winterop-com/sokkel-ui/board/Board'
import { BoardCard } from '@winterop-com/sokkel-ui/board/BoardCard'
import { BoardColumn } from '@winterop-com/sokkel-ui/board/BoardColumn'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DueText } from '@winterop-com/sokkel-ui/DueText'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { QuickAdd } from '@winterop-com/sokkel-ui/QuickAdd'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Checkbox } from '@winterop-com/sokkel-ui/primitives/checkbox'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import {
    CalendarDays,
    CheckIcon,
    Circle,
    CircleCheck,
    CircleDot,
    Folder,
    Inbox,
    type LucideIcon,
    Plus,
    Settings as SettingsIcon,
    Sun,
    Trash2,
    Undo2,
} from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import {
    dateOf,
    day,
    DEFAULT_PREFS,
    PEOPLE,
    type Prefs,
    prefs as prefRows,
    PROJECTS,
    type Project,
    STATES,
    type Task,
    type TaskState,
    tasks,
} from './data'
import { Settings } from './Settings'
import type { Frame } from 'tidevann-shared/frame'
import { go, useOverlayRoute } from 'tidevann-shared/router'
import { TidevannMark } from 'tidevann-shared/mark'

interface List {
    id: string
    label: string
    icon: LucideIcon
    /** What a task needs to be in the list. */
    holds: (task: Task, today: string) => boolean
    /** What a task added here starts with, given the project a task outside a project's list goes into. */
    adds: (today: string, project: Project) => Pick<Task, 'due' | 'project'>
}

const PROJECT_LISTS: List[] = PROJECTS.map((project) => ({
    id: project,
    label: project,
    icon: Folder,
    holds: (task) => task.project === project,
    adds: () => ({ due: null, project }),
}))

const LISTS: List[] = [
    {
        id: 'inbox',
        label: 'Inbox',
        icon: Inbox,
        holds: () => true,
        adds: (_today, project) => ({ due: null, project }),
    },
    {
        id: 'today',
        label: 'Today',
        icon: Sun,
        holds: (task, today) => task.due !== null && task.due <= today,
        adds: (today, project) => ({ due: today, project }),
    },
    {
        id: 'upcoming',
        label: 'Upcoming',
        icon: CalendarDays,
        holds: (task, today) => task.due !== null && task.due > today,
        adds: (_today, project) => ({ due: day(1), project }),
    },
    ...PROJECT_LISTS,
]

const PEOPLE_OPTIONS = PEOPLE.map((person) => ({
    value: person,
    label: person,
}))
const PROJECT_OPTIONS = PROJECTS.map((project) => ({
    value: project,
    label: project,
}))

const isDone = (task: Task) => task.state === 'done'

/** Open tasks first, by the day they are due, those with none after. */
const byDue = (left: Task, right: Task) =>
    Number(isDone(left)) - Number(isDone(right)) ||
    (left.due ?? '9999').localeCompare(right.due ?? '9999') ||
    left.title.localeCompare(right.title)

/** The person's own order. */
const byRank = (left: Task, right: Task) => left.rank - right.rank

/** The rank that puts a task between `before` and `after`, the tasks it lands between. */
function rankBetween(before: Task | undefined, after: Task | undefined): number {
    if (before !== undefined && after !== undefined) return (before.rank + after.rank) / 2
    if (before !== undefined) return before.rank + 1
    if (after !== undefined) return after.rank - 1
    return 0
}

/** The board's columns, one for each state. */
const COLUMNS: Record<TaskState, { title: string; icon: ReactNode }> = {
    todo: {
        title: 'To do',
        icon: <Circle className="size-4 text-muted-foreground" aria-hidden />,
    },
    doing: {
        title: 'Doing',
        icon: <CircleDot className="size-4 text-status-running" aria-hidden />,
    },
    done: {
        title: 'Done',
        icon: <CircleCheck className="size-4 text-status-succeeded" aria-hidden />,
    },
}

type Patch = Partial<Omit<Task, 'id'>>

const save = (task: Task, patch: Patch) => tasks.update(task.id, patch).then(() => undefined)

function columns(now: Date, save: (task: Task, patch: Patch) => Promise<void>, weekStartsOn: 0 | 1): DataColumn<Task>[] {
    return [
        {
            id: 'done',
            header: 'Done',
            width: '3rem',
            resizable: false,
            // Stacked on a phone, the box leads each row's title.
            stack: 'lead',
            cell: (task) => (
                <Checkbox
                    aria-label={isDone(task) ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                    checked={isDone(task)}
                    onCheckedChange={(checked) => void save(task, { state: checked ? 'done' : 'todo' })}
                />
            ),
        },
        {
            id: 'title',
            header: 'Title',
            width: 'minmax(14rem,1fr)',
            cell: (task) => <span className={isDone(task) ? 'text-muted-foreground line-through' : undefined}>{task.title}</span>,
            sortValue: (task) => task.title,
            edit: {
                editor: 'text',
                value: (task) => task.title,
                validate: (value) => (value.trim() === '' ? 'A task needs a title.' : null),
                save: (task, value) => save(task, { title: value.trim() }),
            },
        },
        {
            id: 'due',
            header: 'Due',
            width: '9.5rem',
            cell: (task) => <DueText date={task.due === null ? undefined : dateOf(task.due)} now={now} done={isDone(task)} />,
            sortValue: (task) => task.due ?? '9999',
            edit: {
                editor: 'date',
                weekStartsOn,
                value: (task) => task.due,
                save: (task, value) => save(task, { due: value }),
            },
        },
        {
            id: 'assignee',
            header: 'Assignee',
            width: '8.5rem',
            cell: (task) => (
                <Row gap="2xs" inline>
                    <PersonAvatar name={task.assignee} size="2xs" />
                    {task.assignee}
                </Row>
            ),
            sortValue: (task) => task.assignee,
            edit: {
                editor: 'select',
                options: PEOPLE_OPTIONS,
                value: (task) => task.assignee,
                save: (task, value) => save(task, { assignee: value as Task['assignee'] }),
            },
        },
        {
            id: 'project',
            header: 'Project',
            width: '7rem',
            cell: (task) => task.project,
            sortValue: (task) => task.project,
            edit: {
                editor: 'select',
                options: PROJECT_OPTIONS,
                value: (task) => task.project,
                save: (task, value) => save(task, { project: value as Project }),
            },
        },
    ]
}

/** A task's menu on the board: the columns it can move to, from a phone or the keyboard as well as by drag, and delete. */
function CardMenu({ task, onMove }: { task: Task; onMove: (state: TaskState) => void }) {
    return (
        <>
            <DropdownMenuGroup>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {STATES.map((state) => (
                    <DropdownMenuItem key={state} disabled={state === task.state} onClick={() => onMove(state)}>
                        {COLUMNS[state].icon}
                        {COLUMNS[state].title}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void tasks.remove(task.id)}>
                <Trash2 aria-hidden />
                Delete
            </DropdownMenuItem>
        </>
    )
}

/**
 * Tasks: lists in the rail, a quick add, and tasks edited in place, each a compact row on a phone.
 * A list is drawn as rows, put in the person's own order by drag, or as a board whose cards are
 * dragged between the columns of their state.
 */
export function TasksDemo({ frame }: { frame: Frame }) {
    const today = day(0)
    const now = useMemo(() => dateOf(today), [today])
    // Settings open as a dialog over the list they were opened from.
    const settings = useOverlayRoute(frame.route, 'settings', [])
    const { rows: prefList } = useCollection(prefRows)
    // Preferences kept before a setting existed take its default.
    const mine: Prefs = { ...DEFAULT_PREFS, ...prefList?.[0] }
    const setPrefs = (patch: Partial<Omit<Prefs, 'id'>>) => void prefRows.update(mine.id, patch)
    const showDone = mine.showDone
    const list = LISTS.find((one) => one.id === settings.route[0]) ?? LISTS.find((one) => one.id === mine.startList) ?? LISTS[0]
    const { rows, error } = useCollection(tasks)
    const quickAdd = useRef<HTMLInputElement>(null)
    // Changes sent to the backend and not yet answered, drawn at once so a dropped card stays where it landed.
    const [sent, setSent] = useState<ReadonlyMap<string, Patch>>(new Map())

    const all = (rows ?? []).map((task) => {
        const patch = sent.get(task.id)
        return patch === undefined ? task : { ...task, ...patch }
    })
    const change = (task: Task, patch: Patch) => {
        setSent((now) => new Map(now).set(task.id, { ...now.get(task.id), ...patch }))
        return save(task, patch).finally(() =>
            setSent((now) => {
                const next = new Map(now)
                next.delete(task.id)
                return next
            }),
        )
    }
    const inList = all.filter((task) => list?.holds(task, today) === true)
    const shown = (showDone ? inList : inList.filter((task) => !isDone(task))).sort(mine.order === 'mine' ? byRank : byDue)
    const open = inList.filter((task) => !isDone(task)).length
    const hiddenDone = inList.length - open

    /** Moves the row at `from` to `to` in the person's order, between the rows it lands beside. */
    const reorder = (from: number, to: number) => {
        const moved = moveItem(shown, from, to)
        const task = moved[to]
        if (task !== undefined) void change(task, { rank: rankBetween(moved[to - 1], moved[to + 1]) })
    }

    /** Moves a card into the column of its new state, before the card it lands above. */
    const moveCard = ({ card, to, index }: BoardMove) => {
        const task = inList.find((one) => one.id === card)
        if (task === undefined) return
        const others = inList.filter((one) => one.state === to && one.id !== card).sort(byRank)
        void change(task, {
            state: to as TaskState,
            rank: rankBetween(others[index - 1], others[index]),
        })
    }

    /** Moves a task to the end of another column, from its card's menu. */
    const moveTo = (task: Task, state: TaskState) => {
        const last = inList
            .filter((one) => one.state === state)
            .sort(byRank)
            .at(-1)
        void change(task, { state, rank: rankBetween(last, undefined) })
    }

    const openIn = (one: List) => all.filter((task) => !isDone(task) && one.holds(task, today)).length
    const entry = (one: List) => ({
        id: one.id,
        label: one.label,
        icon: one.icon,
        href: `#/${one.id}`,
        active: one.id === list?.id,
        count: openIn(one),
    })
    const groups: RailGroup[] = [
        { id: 'lists', entries: LISTS.slice(0, 3).map(entry) },
        { id: 'projects', title: 'Projects', entries: PROJECT_LISTS.map(entry) },
        {
            id: 'system',
            title: 'System',
            entries: [
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: SettingsIcon,
                    href: '#/settings',
                    active: settings.open,
                },
            ],
        },
    ]

    const focusQuickAdd = () => {
        // After the palette has closed and handed the focus back.
        window.setTimeout(() => quickAdd.current?.focus(), 50)
    }

    const palette: PaletteGroup[] = [
        {
            title: 'Tasks',
            commands: [
                {
                    id: 'task-new',
                    label: 'New task',
                    icon: Plus,
                    onSelect: focusQuickAdd,
                },
            ],
        },
        ...placeCommands(groups.slice(0, 2), (href) => go(href.slice(1)), {
            title: 'Lists',
        }),
        ...placeCommands(groups.slice(2), (href) => go(href.slice(1))),
        ...frame.palette,
    ]

    const add = (title: string) =>
        list === undefined
            ? undefined
            : tasks
                  .create({
                      title,
                      assignee: mine.assignee,
                      state: 'todo',
                      // First in the person's order, as the newest task.
                      rank: Math.min(0, ...all.map((task) => task.rank)) - 1,
                      ...list.adds(today, mine.project),
                  })
                  .then(() => undefined)

    const actions = (task: Task): DataAction[] => [
        {
            id: 'done',
            label: isDone(task) ? 'Reopen' : 'Mark done',
            icon: isDone(task) ? <Undo2 /> : <CheckIcon />,
            onSelect: () => void change(task, { state: isDone(task) ? 'todo' : 'done' }),
        },
        { id: 'line', separator: true },
        {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => void tasks.remove(task.id),
        },
    ]

    const label = list?.label ?? ''

    return (
        <Shell
            palette={palette}
            desktop={frame.desktop}
            route={label}
            rail={
                <Rail
                    mark={<TidevannMark />}
                    markHref="#/"
                    name="Tasks"
                    groups={groups}
                    foot={
                        <AccountMenu
                            name="ada"
                            where="tidevann.example.org"
                            onSettings={() => go('/settings')}
                            scheme={frame.appearance.settings.scheme}
                            onSchemeChange={(scheme) =>
                                frame.appearance.setSettings({
                                    ...frame.appearance.settings,
                                    scheme,
                                })
                            }
                        />
                    }
                />
            }
            top={<TopBar trail={[{ label: 'Tasks', href: '#/inbox' }, { label }]} />}
            foot={
                <StatusLine note="All changes saved">
                    <StatusItem label="open">{all.filter((task) => !isDone(task)).length}</StatusItem>
                </StatusLine>
            }
        >
            <Page className="h-full">
                <PageHeader title={label} count={`${String(open)} open`} />
                <Toolbar
                    search={<QuickAdd inputRef={quickAdd} placeholder="Add a task" onAdd={add} />}
                    end={
                        <Row gap="md">
                            {mine.view === 'list' && (
                                <SwitchField
                                    id="show-done"
                                    label="Show done"
                                    checked={showDone}
                                    onCheckedChange={(next) => setPrefs({ showDone: next })}
                                />
                            )}
                            <Segmented
                                label="View"
                                size="sm"
                                value={mine.view}
                                onValueChange={(view) => setPrefs({ view })}
                                options={[
                                    { value: 'list', label: 'List' },
                                    { value: 'board', label: 'Board' },
                                ]}
                            />
                        </Row>
                    }
                />
                <PageState loading={rows === undefined && error === undefined} error={error}>
                    {mine.view === 'board' ? (
                        <Board onMove={moveCard} className="min-h-0 flex-1">
                            <Row gap="md" align="stretch" className="h-full w-max">
                                {STATES.map((state) => {
                                    const held = inList.filter((task) => task.state === state).sort(byRank)
                                    return (
                                        <BoardColumn
                                            key={state}
                                            id={state}
                                            title={COLUMNS[state].title}
                                            icon={COLUMNS[state].icon}
                                            count={held.length}
                                            empty="Nothing here"
                                        >
                                            {held.map((task) => (
                                                <BoardCard
                                                    key={task.id}
                                                    id={task.id}
                                                    title={task.title}
                                                    assignee={{ name: task.assignee }}
                                                    due={task.due === null ? undefined : dateOf(task.due)}
                                                    now={now}
                                                    done={isDone(task)}
                                                    menu={<CardMenu task={task} onMove={(next) => moveTo(task, next)} />}
                                                />
                                            ))}
                                        </BoardColumn>
                                    )
                                })}
                            </Row>
                        </Board>
                    ) : (
                        <DataTable
                            className="min-h-0 flex-1"
                            variant="list"
                            minWidth="auto"
                            stackLayout="compact"
                            columns={columns(now, change, mine.weekStart === 'sunday' ? 0 : 1)}
                            rows={shown}
                            rowKey={(task) => task.id}
                            rowLabel={(task) => task.title}
                            onReorder={mine.order === 'mine' ? reorder : undefined}
                            rowActions={actions}
                            editing={tableEditing}
                            empty={
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">{list === undefined ? null : <list.icon aria-hidden />}</EmptyMedia>
                                        <EmptyTitle>Nothing in {label}</EmptyTitle>
                                        <EmptyDescription>
                                            {hiddenDone > 0
                                                ? `${String(hiddenDone)} done ${hiddenDone === 1 ? 'task is' : 'tasks are'} hidden. Add one above, or show the done ones.`
                                                : 'Add one above, and it lands here.'}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    {hiddenDone > 0 && (
                                        <EmptyContent>
                                            <Button variant="outline" size="sm" onClick={() => setPrefs({ showDone: true })}>
                                                Show done
                                            </Button>
                                        </EmptyContent>
                                    )}
                                </Empty>
                            }
                        />
                    )}
                </PageState>
            </Page>
            {settings.open && (
                <Settings
                    frame={frame}
                    prefs={mine}
                    setPrefs={setPrefs}
                    lists={LISTS.map((one) => ({ id: one.id, label: one.label }))}
                    onClose={settings.close}
                />
            )}
        </Shell>
    )
}
