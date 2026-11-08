import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DueText } from '@winterop-com/sokkel-ui/DueText'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { Checkbox } from '@winterop-com/sokkel-ui/primitives/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { CalendarDays, CheckIcon, Folder, Inbox, type LucideIcon, Plus, Sun, Trash2, Undo2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { dateOf, day, PEOPLE, PROJECTS, type Project, type Task, tasks } from './data'
import type { Frame } from 'tidevann-shared/frame'
import { go } from 'tidevann-shared/router'
import { TidevannMark } from 'tidevann-shared/mark'

interface List {
    id: string
    label: string
    icon: LucideIcon
    /** What a task needs to be in the list. */
    holds: (task: Task, today: string) => boolean
    /** What a task added here starts with. */
    adds: (today: string) => Pick<Task, 'due' | 'project'>
}

const PROJECT_LISTS: List[] = PROJECTS.map((project) => ({
    id: project,
    label: project,
    icon: Folder,
    holds: (task) => task.project === project,
    adds: () => ({ due: null, project }),
}))

const LISTS: List[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, holds: () => true, adds: () => ({ due: null, project: 'harbor' }) },
    {
        id: 'today',
        label: 'Today',
        icon: Sun,
        holds: (task, today) => task.due !== null && task.due <= today,
        adds: (today) => ({ due: today, project: 'harbor' }),
    },
    {
        id: 'upcoming',
        label: 'Upcoming',
        icon: CalendarDays,
        holds: (task, today) => task.due !== null && task.due > today,
        adds: () => ({ due: day(1), project: 'harbor' }),
    },
    ...PROJECT_LISTS,
]

const PEOPLE_OPTIONS = PEOPLE.map((person) => ({ value: person, label: person }))
const PROJECT_OPTIONS = PROJECTS.map((project) => ({ value: project, label: project }))

/** Open tasks first, by the day they are due, those with none after. */
const order = (left: Task, right: Task) =>
    Number(left.done) - Number(right.done) ||
    (left.due ?? '9999').localeCompare(right.due ?? '9999') ||
    left.title.localeCompare(right.title)

const save = (task: Task, patch: Partial<Omit<Task, 'id'>>) => tasks.update(task.id, patch).then(() => undefined)

function columns(now: Date): DataColumn<Task>[] {
    return [
        {
            id: 'done',
            header: 'Done',
            width: '3rem',
            resizable: false,
            cell: (task) => (
                <Checkbox
                    aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                    checked={task.done}
                    onCheckedChange={(checked) => void save(task, { done: checked })}
                />
            ),
        },
        {
            id: 'title',
            header: 'Title',
            width: 'minmax(14rem,1fr)',
            cell: (task) => task.title,
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
            width: '8rem',
            cell: (task) => <DueText date={task.due === null ? undefined : dateOf(task.due)} now={now} done={task.done} />,
            sortValue: (task) => task.due ?? '9999',
            edit: { editor: 'date', value: (task) => task.due, save: (task, value) => save(task, { due: value }) },
        },
        {
            id: 'assignee',
            header: 'Assignee',
            width: '8.5rem',
            cell: (task) => <PersonAvatar name={task.assignee} label={task.assignee} size="sm" />,
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

/** Tasks: lists in the rail, a quick add, and tasks edited in place. */
export function TasksDemo({ frame }: { frame: Frame }) {
    const { settings, setSettings, resolved } = frame.appearance
    const dark = resolved === 'dark'
    const today = day(0)
    const now = useMemo(() => dateOf(today), [today])
    const list = LISTS.find((one) => one.id === frame.route[0]) ?? LISTS[0]
    const { rows, error } = useCollection(tasks)
    const [showDone, setShowDone] = useState(false)
    const [draft, setDraft] = useState('')
    const quickAdd = useRef<HTMLInputElement>(null)

    const all = rows ?? []
    const inList = all.filter((task) => list?.holds(task, today) === true)
    const shown = (showDone ? inList : inList.filter((task) => !task.done)).sort(order)
    const open = inList.filter((task) => !task.done).length
    const hiddenDone = inList.length - open

    const openIn = (one: List) => all.filter((task) => !task.done && one.holds(task, today)).length
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
    ]

    const focusQuickAdd = () => {
        // After the palette has closed and handed the focus back.
        window.setTimeout(() => quickAdd.current?.focus(), 50)
    }

    const palette: PaletteGroup[] = [
        { title: 'Tasks', commands: [{ id: 'task-new', label: 'New task', icon: Plus, onSelect: focusQuickAdd }] },
        ...placeCommands(groups.slice(0, 2), (href) => go(href.slice(1)), { title: 'Lists' }),
        ...frame.palette,
    ]

    const add = () => {
        const title = draft.trim()
        if (title === '' || list === undefined) return
        setDraft('')
        void tasks.create({ title, assignee: 'ada', done: false, ...list.adds(today) })
    }

    const actions = (task: Task): DataAction[] => [
        {
            id: 'done',
            label: task.done ? 'Reopen' : 'Mark done',
            icon: task.done ? <Undo2 /> : <CheckIcon />,
            onSelect: () => void save(task, { done: !task.done }),
        },
        { id: 'line', separator: true },
        { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => void tasks.remove(task.id) },
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
                    foot={<AccountMenu name="ada" where="tidevann.example.org" onSignOut={() => undefined} />}
                />
            }
            top={
                <TopBar
                    trail={[{ label: 'Tasks', href: '#/inbox' }, { label }]}
                    actions={<ThemeToggle dark={dark} onToggle={() => setSettings({ ...settings, scheme: dark ? 'light' : 'dark' })} />}
                />
            }
            foot={
                <StatusLine note="Kept in this browser">
                    <StatusItem label="open">{all.filter((task) => !task.done).length}</StatusItem>
                </StatusLine>
            }
        >
            <Page className="h-full">
                <PageHeader title={label} count={`${String(open)} open`} />
                <Toolbar
                    search={
                        <Input
                            ref={quickAdd}
                            aria-label="Add a task"
                            placeholder="Add a task and press Enter"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') add()
                            }}
                        />
                    }
                    end={<SwitchField id="show-done" label="Show done" checked={showDone} onCheckedChange={setShowDone} />}
                />
                <PageState
                    loading={rows === undefined && error === undefined}
                    error={error}
                    empty={shown.length === 0}
                    emptyRender={
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
                        </Empty>
                    }
                >
                    <DataTable
                        className="min-h-0 flex-1"
                        variant="list"
                        minWidth="auto"
                        columns={columns(now)}
                        rows={shown}
                        rowKey={(task) => task.id}
                        rowActions={actions}
                        editing={tableEditing}
                    />
                </PageState>
            </Page>
        </Shell>
    )
}
