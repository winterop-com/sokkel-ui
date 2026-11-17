import type { ReactNode } from 'react'

import { CheckboxField } from '../CheckboxField'
import { DescriptionList, type Description } from '../DescriptionList'
import { PaneHeader } from '../PaneHeader'
import { PanelSection } from '../SidePanel'
import { Timeline, type TimelineEvent } from '../Timeline'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'

/** One step of a work item's checklist and whether it is done. */
export interface ChecklistStep {
    text: string
    done: boolean
}

/** The words a checklist says; `title` heads it, with the steps done and the steps in all after it. */
export interface BoardChecklistWords {
    title: string
    progress: string
}

const CHECKLIST_WORDS: BoardChecklistWords = { title: 'Checklist', progress: 'Checklist done' }

export interface BoardChecklistProps {
    steps: readonly ChecklistStep[]
    /** A step ticked or unticked, by its place in `steps`; without it the steps are read only. */
    onStepChange?: (index: number, done: boolean) => void
    words?: Partial<BoardChecklistWords>
}

/**
 * A work item's checklist as a section of its panel: the heading with the steps done of the steps
 * in all, a bar filled as far, and each step as a box that ticks it, a done step's words struck
 * through and quiet. The checklist is held from outside: a tick calls `onStepChange`.
 */
export function BoardChecklist({ steps, onStepChange, words: given }: BoardChecklistProps) {
    const words = { ...CHECKLIST_WORDS, ...given }
    const done = steps.filter((step) => step.done).length
    return (
        <PanelSection title={`${words.title} ${done}/${steps.length}`}>
            <Progress value={steps.length === 0 ? 0 : (done / steps.length) * 100} aria-label={words.progress} />
            <ul className="-mx-1 flex flex-col">
                {steps.map((step, index) => (
                    <li key={`${index}-${step.text}`}>
                        <CheckboxField
                            label={step.text}
                            checked={step.done}
                            quiet="checked"
                            disabled={onStepChange === undefined}
                            onCheckedChange={(next) => onStepChange?.(index, next)}
                        />
                    </li>
                ))}
            </ul>
        </PanelSection>
    )
}

/** The words a work item's panel says: its sections' headings. */
export interface BoardItemPanelWords {
    description: string
    fields: string
    activity: string
    checklist: Partial<BoardChecklistWords>
}

const WORDS: Omit<BoardItemPanelWords, 'checklist'> = { description: 'Description', fields: 'Fields', activity: 'Activity' }

export interface BoardItemPanelProps {
    /** The item's code over its title, such as HRB-142. */
    code?: ReactNode
    title: ReactNode
    /** The column it stands in, as a chip with the column's icon. */
    state?: { label: ReactNode; icon?: ReactNode }
    /** Its labels on the chips' line, such as `BoardLabel`s. */
    labels?: ReactNode
    /** What the item is about, as prose. */
    description?: ReactNode
    /** Its fields as terms beside values: project, assignee, due date, reporter. */
    fields?: readonly Description[]
    /** Its checklist; a section is drawn only when it has steps. */
    checklist?: readonly ChecklistStep[]
    onChecklistChange?: (index: number, done: boolean) => void
    /** What happened to it, oldest first. */
    activity?: readonly TimelineEvent[]
    words?: Partial<BoardItemPanelWords>
}

/**
 * One work item of a board as a side panel's tab holds it: a head with its code over its title and
 * a line of its column's chip and its labels, then its description, its fields, its checklist
 * (`BoardChecklist`) and its activity, each a section of its own, drawn only when given.
 */
export function BoardItemPanel({
    code,
    title,
    state,
    labels,
    description,
    fields,
    checklist,
    onChecklistChange,
    activity,
    words: given,
}: BoardItemPanelProps) {
    const words = { ...WORDS, ...given }
    const chips = state !== undefined || labels !== undefined
    return (
        <>
            <PaneHeader size="lg" code={code} title={title}>
                {chips ? (
                    <>
                        {state !== undefined && (
                            <Badge variant="secondary">
                                {state.icon}
                                {state.label}
                            </Badge>
                        )}
                        {labels}
                    </>
                ) : undefined}
            </PaneHeader>
            {description !== undefined && (
                <PanelSection title={words.description}>
                    <div className="text-sm leading-6 text-pretty">{description}</div>
                </PanelSection>
            )}
            {fields !== undefined && fields.length > 0 && (
                <PanelSection title={words.fields}>
                    <DescriptionList items={fields} termWidth="auto" />
                </PanelSection>
            )}
            {checklist !== undefined && checklist.length > 0 && (
                <BoardChecklist steps={checklist} onStepChange={onChecklistChange} words={given?.checklist} />
            )}
            {activity !== undefined && activity.length > 0 && (
                <PanelSection title={words.activity}>
                    <Timeline events={activity} />
                </PanelSection>
            )}
        </>
    )
}
