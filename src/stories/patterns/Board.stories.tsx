import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleDashed, CircleDot, Plus } from 'lucide-react'
import { useState } from 'react'

import { Board, type BoardMove } from '../../components/board/Board'
import { BoardCard } from '../../components/board/BoardCard'
import { BoardColumn } from '../../components/board/BoardColumn'
import { PeopleFilter } from '../../components/PeopleFilter'
import { Button } from '../../components/ui/button'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { Row, Stack } from '../../components/Layout'

/** The parts of a board: its cards, and its columns with their counts and limits. */
const meta: Meta = { title: 'Patterns/Board' }
export default meta

const NOW = new Date(2026, 10, 5, 9, 30)
const day = (date: number) => new Date(2026, 10, date)

/**
 * Cards from the barest to the fullest: a title alone; a code, labels and an assignee; one overdue;
 * one due today; one finished, whose date is never overdue; and the chosen one.
 */
export const Cards: StoryObj = {
    name: 'Cards',
    render: () => (
        <Stack gap="sm" className="w-72 p-6">
            <BoardCard id="a" title="Rename the scheduler's queue metrics" />
            <BoardCard
                id="b"
                code="JNP-88"
                title="Show the last five runs on a job's page"
                labels={[{ name: 'feature' }, { name: 'design', color: 'violet' }]}
                assignee={{ name: 'margaret' }}
                comments={4}
                now={NOW}
            />
            <BoardCard
                id="c"
                code="HRB-142"
                title="nightly-export fails when the orders feed is empty"
                labels={[{ name: 'bug', color: 'pink' }]}
                assignee={{ name: 'ada' }}
                due={day(3)}
                now={NOW}
                comments={7}
                checklist={{ done: 3, total: 5 }}
                onSelect={() => undefined}
                menu={<DropdownMenuItem>Move to Review</DropdownMenuItem>}
            />
            <BoardCard
                id="d"
                code="JNP-86"
                title="Rebuild the search index without downtime"
                labels={[{ name: 'feature', color: 'blue' }]}
                assignee={{ name: 'linus' }}
                due={day(5)}
                now={NOW}
                checklist={{ done: 2, total: 6 }}
            />
            <BoardCard
                id="e"
                code="JNP-84"
                title="Upgrade the worker base image"
                labels={[{ name: 'chore', color: 'teal' }]}
                assignee={{ name: 'grace' }}
                due={day(2)}
                now={NOW}
                done
                checklist={{ done: 3, total: 3 }}
            />
            <BoardCard
                id="f"
                code="LRK-31"
                title="A dark palette for the run graph"
                assignee={{ name: 'margaret' }}
                selected
                onSelect={() => undefined}
            />
        </Stack>
    ),
}

const START = [
    { id: 'LRK-40', column: 'ready', title: "Rename the scheduler's queue metrics" },
    { id: 'HRB-146', column: 'ready', title: 'Retry upload when the bucket times out' },
    { id: 'HRB-142', column: 'progress', title: 'nightly-export fails when the orders feed is empty' },
    { id: 'JNP-86', column: 'progress', title: 'Rebuild the search index without downtime' },
    { id: 'HRB-144', column: 'progress', title: 'Validate amounts before upload' },
]

function ColumnsDemo() {
    const [cards, setCards] = useState(START)
    const onMove = ({ card, to, before }: BoardMove) =>
        setCards((now) => {
            const moving = now.find((item) => item.id === card)
            if (moving === undefined) return now
            const rest = now.filter((item) => item.id !== card)
            const at = before === null ? rest.length : rest.findIndex((item) => item.id === before)
            return [...rest.slice(0, at), { ...moving, column: to }, ...rest.slice(at)]
        })
    const columns = [
        { id: 'backlog', title: 'Backlog', icon: <CircleDashed className="size-4 text-faint" aria-hidden /> },
        { id: 'ready', title: 'Ready', icon: <CircleDashed className="size-4 text-muted-foreground" aria-hidden /> },
        { id: 'progress', title: 'In progress', icon: <CircleDot className="size-4 text-status-running" aria-hidden />, limit: 2 },
    ]
    return (
        <Board onMove={onMove} className="h-svh p-6">
            <Row gap="md" align="stretch" className="h-full w-max">
                {columns.map((column) => {
                    const here = cards.filter((item) => item.column === column.id)
                    return (
                        <BoardColumn
                            key={column.id}
                            id={column.id}
                            title={column.title}
                            icon={column.icon}
                            count={here.length}
                            limit={column.limit}
                            empty="No items"
                            foot={
                                <Button size="sm" variant="ghost" className="w-full justify-start text-muted-foreground">
                                    <Plus aria-hidden />
                                    Add item
                                </Button>
                            }
                        >
                            {here.map((item) => (
                                <BoardCard key={item.id} id={item.id} code={item.id} title={item.title} now={NOW} />
                            ))}
                        </BoardColumn>
                    )
                })}
            </Row>
        </Board>
    )
}

/**
 * Columns on a board, the cards dragged between them: an empty one, one under its limit, and
 * "In progress" past its limit of two, its count turned to a warning.
 */
export const Columns: StoryObj = { name: 'Columns', render: () => <ColumnsDemo /> }

function PeopleDemo() {
    const [chosen, setChosen] = useState<string[]>(['grace'])
    return (
        <div className="p-6">
            <PeopleFilter
                people={[{ name: 'ada' }, { name: 'grace' }, { name: 'linus' }, { name: 'margaret' }]}
                chosen={chosen}
                onChange={setChosen}
                words={{ label: 'Assignees' }}
            />
        </div>
    )
}

/** The people on a board as avatars that filter it: grace is on, so the others fade until hovered. */
export const People: StoryObj = { name: 'People filter', render: () => <PeopleDemo /> }
