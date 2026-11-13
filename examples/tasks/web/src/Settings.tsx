import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Database, ListTodo, Palette, Plus } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { DEFAULT_PREFS, PEOPLE, PROJECTS, type Person, type Prefs, type Project } from './data'

/** The preferences each section holds, so Reset to defaults puts back those and leaves the rest. */
const HELD: Record<string, (keyof Omit<Prefs, 'id'>)[]> = {
    lists: ['startList', 'view', 'order', 'showDone'],
    adding: ['assignee', 'project'],
}

/** A choice from a short list, named for the setting it sets. */
function Choose<T extends string>({
    label,
    value,
    items,
    onChange,
}: {
    label: string
    value: T
    items: readonly { value: T; label: string }[]
    onChange: (value: T) => void
}) {
    return (
        <Select items={items} value={value} onValueChange={(next) => onChange(String(next) as T)}>
            <SelectTrigger aria-label={label} className="w-40">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

/** The person's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function Settings({
    frame,
    prefs,
    setPrefs,
    lists,
    onClose,
}: {
    frame: Frame
    prefs: Prefs
    setPrefs: (patch: Partial<Omit<Prefs, 'id'>>) => void
    /** The lists the app can open on. */
    lists: readonly { id: string; label: string }[]
    onClose: () => void
}) {
    const { settings: look, setSettings: setLook } = frame.appearance
    const [active, setActive] = useState('lists')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const [busy, setBusy] = useState(false)

    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'lists',
                    label: 'Lists',
                    icon: ListTodo,
                    settings: [
                        {
                            id: 'start-list',
                            title: 'Open on',
                            description: 'The list shown when the app opens, and when the mark is pressed.',
                            keywords: ['start', 'default', 'home'],
                            control: (
                                <Choose
                                    label="Open on"
                                    value={prefs.startList}
                                    items={lists.map((list) => ({
                                        value: list.id,
                                        label: list.label,
                                    }))}
                                    onChange={(startList) => setPrefs({ startList })}
                                />
                            ),
                        },
                        {
                            id: 'view',
                            title: 'Show lists as',
                            description: 'Rows, or a board with a column for each state whose cards are dragged between them.',
                            keywords: ['board', 'columns', 'kanban', 'layout'],
                            control: (
                                <Choose<Prefs['view']>
                                    label="Show lists as"
                                    value={prefs.view}
                                    items={[
                                        { value: 'list', label: 'List' },
                                        { value: 'board', label: 'Board' },
                                    ]}
                                    onChange={(view) => setPrefs({ view })}
                                />
                            ),
                        },
                        {
                            id: 'order',
                            title: 'Order',
                            description: 'Your order is set by dragging a row by its grip; due date puts the soonest first.',
                            keywords: ['sort', 'drag', 'rank', 'priority'],
                            control: (
                                <Choose<Prefs['order']>
                                    label="Order"
                                    value={prefs.order}
                                    items={[
                                        { value: 'mine', label: 'Your order' },
                                        { value: 'due', label: 'Due date' },
                                    ]}
                                    onChange={(order) => setPrefs({ order })}
                                />
                            ),
                        },
                        {
                            id: 'show-done',
                            title: 'Show done tasks',
                            description:
                                'Lists keep the tasks already done, struck through; ordered by due date, they come after the open ones.',
                            keywords: ['completed', 'finished', 'hide'],
                            control: (
                                <Switch
                                    aria-label="Show done tasks"
                                    checked={prefs.showDone}
                                    onCheckedChange={(showDone) => setPrefs({ showDone })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'adding',
                    label: 'New tasks',
                    icon: Plus,
                    settings: [
                        {
                            id: 'assignee',
                            title: 'Assign to',
                            description: 'Who a task added from the quick add is given to.',
                            keywords: ['assignee', 'person', 'owner'],
                            control: (
                                <Choose<Person>
                                    label="Assign to"
                                    value={prefs.assignee}
                                    items={PEOPLE.map((person) => ({
                                        value: person,
                                        label: person,
                                    }))}
                                    onChange={(assignee) => setPrefs({ assignee })}
                                />
                            ),
                        },
                        {
                            id: 'project',
                            title: 'Project',
                            description: "The project a task added in Inbox, Today or Upcoming goes into; a project's own list adds to it.",
                            control: (
                                <Choose<Project>
                                    label="Project"
                                    value={prefs.project}
                                    items={PROJECTS.map((project) => ({
                                        value: project,
                                        label: project,
                                    }))}
                                    onChange={(project) => setPrefs({ project })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'appearance',
                    label: 'Appearance',
                    icon: Palette,
                    settings: [
                        ...themeSettings({
                            value: look,
                            onChange: setLook,
                            themes: THEMES,
                            system: true,
                        }),
                    ],
                },
            ],
        },
        {
            id: 'workspace',
            title: 'This demo',
            sections: [
                {
                    id: 'demo',
                    label: 'Demo data',
                    icon: Database,
                    reset: false,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description: 'Puts back the tasks and these settings, as the demo started.',
                            control: (
                                <Button size="sm" variant="outline" onClick={() => setResetting(true)}>
                                    Reset
                                </Button>
                            ),
                        },
                    ],
                },
            ],
        },
    ]

    return (
        <>
            <SettingsDialog
                open
                onOpenChange={(next) => {
                    if (!next) onClose()
                }}
                groups={groups}
                active={active}
                onActiveChange={setActive}
                search={search}
                onSearchChange={setSearch}
                onReset={(section) => {
                    if (section === 'appearance') {
                        setLook({ ...DEFAULT_APPEARANCE })
                        return
                    }
                    const keys = section === undefined ? [] : (HELD[section] ?? [])
                    if (keys.length > 0) setPrefs(Object.fromEntries(keys.map((key) => [key, DEFAULT_PREFS[key]])))
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={(next) => !busy && setResetting(next)}
                question="Reset the demo data?"
                detail="Tasks added, changed or deleted since are put back, and the page loads again."
                confirm={{
                    label: 'Reset',
                    destructive: true,
                    busy,
                    busyLabel: 'Resetting',
                    onConfirm: () => {
                        setBusy(true)
                        void resetAll().then(() => window.location.reload())
                    },
                }}
            />
        </>
    )
}
