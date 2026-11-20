import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'

import { isOpen, KIND_LABEL, type Task } from '../data'
import { TaskDialog } from '../parts/TaskDialog'
import { TaskList } from '../parts/TaskList'
import { useWatch } from '../watch'

type Shown = 'open' | 'closed' | 'all'

/** Every task, open ones first and the newest first among them, with a search and the dialog that sets and edits them. */
export function Tasks() {
    const watch = useWatch()
    const [shown, setShown] = useState<Shown>('open')
    const [search, setSearch] = useState('')
    const [editing, setEditing] = useState<Task | undefined>(undefined)
    const [setting, setSetting] = useState(false)
    const all = watch.tasks ?? []
    const open = all.filter(isOpen)
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const listed = all
        .filter((task) => shown === 'all' || (shown === 'open') === isOpen(task))
        .filter((task) => {
            const text = [KIND_LABEL[task.kind], task.code, task.from.name, task.to.name, task.by, task.note, task.priority].join(' ')
            return words.every((word) => text.toLowerCase().includes(word))
        })
        .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || b.createdAt - a.createdAt)
    const create = () => {
        setEditing(undefined)
        setSetting(true)
    }
    return (
        <Stack gap="section">
            <PageHeader
                title="Tasks"
                count={`${String(open.length)} open`}
                actions={
                    <Button onClick={create}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            <Toolbar>
                <Segmented
                    label="Tasks shown"
                    value={shown}
                    onValueChange={setShown}
                    options={[
                        { value: 'open', label: 'Open', count: open.length },
                        { value: 'closed', label: 'Closed', count: all.length - open.length },
                        { value: 'all', label: 'All', count: all.length },
                    ]}
                />
                <SearchField value={search} onChange={setSearch} placeholder="Search" />
            </Toolbar>
            {watch.tasks === undefined ? (
                <PageState loading={watch.error === undefined} error={watch.error}>
                    {null}
                </PageState>
            ) : listed.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ListChecks aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>{words.length > 0 ? 'Nothing matches' : shown === 'open' ? 'No open tasks' : 'No tasks'}</EmptyTitle>
                        <EmptyDescription>
                            {words.length > 0
                                ? 'Try fewer words, or look among all tasks.'
                                : 'Set one with New, or from a track on the watch.'}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Columns count={3} min="md" gap="lg" align="start">
                    <TaskList
                        rows={listed}
                        tracks={watch.picture.tracks}
                        now={watch.now}
                        onEdit={(task) => {
                            setEditing(task)
                            setSetting(true)
                        }}
                    />
                </Columns>
            )}
            <TaskDialog open={setting} onOpenChange={setSetting} task={editing} tracks={watch.picture.tracks} all={all} now={watch.now} />
        </Stack>
    )
}
