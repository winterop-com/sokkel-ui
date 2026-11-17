import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleDot } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { BoardLabel } from '@winterop-com/sokkel-ui/board/BoardCard'
import { BoardChecklist, BoardItemPanel, type ChecklistStep } from '@winterop-com/sokkel-ui/board/BoardItemPanel'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SidePanel } from '@winterop-com/sokkel-ui/SidePanel'

/**
 * One work item of a board in the side panel: its code over its title, its column and labels, its
 * description, fields, checklist and activity.
 */
const meta: Meta = { title: 'Patterns/Board item panel' }
export default meta

/** The panel at the page's right edge, the full height of the canvas. */
function Edge({ children }: { children: ReactNode }) {
    return (
        <Row gap="none" align="stretch" justify="end" className="h-svh bg-background text-foreground">
            {children}
        </Row>
    )
}

const STEPS: ChecklistStep[] = [
    { text: 'Reproduce with the 1 November feed', done: true },
    { text: 'Guard transform against an empty feed', done: true },
    { text: 'Add a validate rule for zero rows', done: false },
    { text: 'Run nightly-export by hand', done: false },
]

const tick = (steps: ChecklistStep[], index: number, done: boolean) => steps.map((step, at) => (at === index ? { ...step, done } : step))

/** The checklist alone: two of four steps done, the bar half full; each box ticks its step. */
export const Checklist: StoryObj = {
    render: function Render() {
        const [steps, setSteps] = useState(STEPS)
        return (
            <Edge>
                <SidePanel
                    tabs={[
                        {
                            id: 'checklist',
                            label: 'Checklist',
                            content: <BoardChecklist steps={steps} onStepChange={(index, done) => setSteps(tick(steps, index, done))} />,
                        },
                    ]}
                />
            </Edge>
        )
    },
}

/** HRB-142 in full: the head with its column and labels, the description, fields, checklist and activity. */
export const Item: StoryObj = {
    render: function Render() {
        const [steps, setSteps] = useState(STEPS)
        return (
            <Edge>
                <SidePanel
                    width="24rem"
                    tabs={[
                        {
                            id: 'item',
                            label: 'Item',
                            content: (
                                <BoardItemPanel
                                    code="HRB-142"
                                    title="nightly-export fails when the orders feed is empty"
                                    state={{
                                        icon: <CircleDot aria-hidden />,
                                        label: 'In progress',
                                    }}
                                    labels={
                                        <>
                                            <BoardLabel name="bug" color="pink" />
                                            <BoardLabel name="export" color="teal" />
                                        </>
                                    }
                                    description="With no orders in a day's feed, transform divides by zero and the run fails at validate."
                                    fields={[
                                        { term: 'Project', value: 'harbor', code: true },
                                        { term: 'Assignee', value: 'ada' },
                                        { term: 'Reporter', value: 'margaret' },
                                        { term: 'Created', value: '28 October' },
                                    ]}
                                    checklist={steps}
                                    onChecklistChange={(index, done) => setSteps(tick(steps, index, done))}
                                    activity={[
                                        { id: 'made', title: 'margaret opened it', at: '28 Oct' },
                                        {
                                            id: 'given',
                                            title: 'grace assigned it to ada',
                                            at: '30 Oct',
                                        },
                                        {
                                            id: 'run',
                                            title: 'nightly-export failed at validate',
                                            at: '04:00',
                                            tone: 'failed',
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
            </Edge>
        )
    },
}
