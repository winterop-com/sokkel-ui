/** The pipeline's steps as a graph that edits them: every gesture is written into the pipeline's YAML, and the graph is drawn from it again. */

import type { SharedDocument } from '@winterop-com/sokkel-ui/CodeEditor'
import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { BlockPicker } from '@winterop-com/sokkel-ui-graph/BlockPicker'
import type { BlockGroup, PipelineBlock } from '@winterop-com/sokkel-ui-graph/blocks'
import type { GraphControls, GraphEditing, GraphPointer } from '@winterop-com/sokkel-ui-graph/GraphCanvas'
import { GraphNotice, GraphOverlay, type GraphAnchor } from '@winterop-com/sokkel-ui-graph/GraphOverlay'
import { GraphToolbar } from '@winterop-com/sokkel-ui-graph/GraphToolbar'
import { GraphControlButton } from '@winterop-com/sokkel-ui-graph/GraphViewButtons'
import { cyclePath } from '@winterop-com/sokkel-ui-graph/cycles'
import { PipelineGraph, type PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { useHistoryKeys } from '@winterop-com/sokkel-ui-graph/use-graph-history'
import { Bell, Download, Plus, ShieldCheck, Shuffle, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { layouts } from '../backend'
import { KIND_DOCS, STEP_KINDS, type Pipeline, type StepKind } from '../pipeline'
import { addStep, connect, disconnect, removeSteps } from '../pipeline-edit'

type Point = { x: number; y: number }

/** Each kind of step's glyph, on its box and in the picker. */
export const KIND_ICONS: Record<StepKind, typeof Download> = {
    fetch: Download,
    transform: Shuffle,
    validate: ShieldCheck,
    upload: Upload,
    notify: Bell,
}

const GROUPS: BlockGroup[] = [
    { id: 'read', label: 'Read' },
    { id: 'shape', label: 'Shape' },
    { id: 'write', label: 'Write' },
]

const GROUP_OF: Record<StepKind, string> = { fetch: 'read', transform: 'shape', validate: 'shape', upload: 'write', notify: 'write' }

const BLOCKS: PipelineBlock[] = STEP_KINDS.map((kind) => ({
    kind,
    description: KIND_DOCS[kind],
    group: GROUP_OF[kind],
    icon: KIND_ICONS[kind],
}))

const isKind = (kind: string): kind is StepKind => (STEP_KINDS as readonly string[]).includes(kind)

/** Where a step picked from the picker goes. */
type Picker =
    | { mode: 'after'; source: string }
    | { mode: 'insert'; source: string; target: string; edge: string }
    /** A connection from `source` let go on the ground at `at`. */
    | { mode: 'drop'; source: string; at: Point }
    /** The ground right-clicked at `at`. */
    | { mode: 'here'; at: Point }
    /** The add button, or the empty canvas's: after the chosen step, if one is. */
    | { mode: 'button'; element: Element; after: string | null }

interface Notice {
    tone: 'critical' | 'info'
    text: string
}

/** Carries a step's place on the graph over to its new id. */
export function renamePlace(fileId: string, from: string, to: string): void {
    void layouts.list().then((rows) => {
        const row = rows.find((one) => one.id === fileId)
        const at = row?.positions[from]
        if (row === undefined || at === undefined) return
        const { [from]: _gone, ...rest } = row.positions
        return layouts.update(fileId, { positions: { ...rest, [to]: at } })
    })
}

/** How far a box goes from the one it follows, across and down. */
const GAP = { across: 64, down: 48 }

/** How far a box's corner sits from the point it was put at, so the box lands under the pointer. */
const DROP_OFFSET = { x: 16, y: 22 }

export interface PipelineCanvasProps {
    fileId: string
    doc: SharedDocument
    pipeline: Pipeline
    /** What is wrong with each step, by id. */
    issues: ReadonlyMap<string, Issue[]>
    selected: string | null
    onSelect: (id: string | null) => void
    /** Shows a step in the text, from its menu. */
    onShowText: (id: string) => void
    /** Shows a step's settings, from its menu. */
    onSettings: (id: string) => void
    /** Whether the graph is drawn now, which gives it the undo keys outside the text. */
    shown: boolean
}

/**
 * The pipeline's steps on a canvas that edits them: steps added from the picker (the add button,
 * a step's plus or menu, an edge's middle, a connection let go on the ground, or the ground
 * right-clicked), connected port to port with loops refused, removed with Delete or from the menu,
 * and moved, where they stay for this pipeline. Undo and redo are the text's own, so the text and
 * the graph go back together.
 */
export function PipelineCanvas({ fileId, doc, pipeline, issues, selected, onSelect, onShowText, onSettings, shown }: PipelineCanvasProps) {
    const kept = useCollection(layouts)
    const positions = useMemo(() => kept.rows?.find((row) => row.id === fileId)?.positions ?? {}, [kept.rows, fileId])
    const [controls, setControls] = useState<GraphControls | null>(null)
    const [picker, setPicker] = useState<Picker | null>(null)
    const [notice, setNotice] = useState<Notice | null>(null)
    const [menu, setMenu] = useState<{ step: string; at: GraphPointer } | null>(null)

    const undo = () => {
        if (doc.undo()) setNotice(null)
    }
    const redo = () => {
        if (doc.redo()) setNotice(null)
    }
    useHistoryKeys(undo, redo, { enabled: shown })

    const ids = useMemo(() => new Set(pipeline.steps.map((step) => step.id)), [pipeline.steps])
    const graphSteps = useMemo<PipelineStep[]>(
        () =>
            pipeline.steps.map((step) => ({
                code: step.id,
                kind: step.kind,
                needs: step.needs.filter((need) => ids.has(need) && need !== step.id),
                icon: isKind(step.kind) ? KIND_ICONS[step.kind] : undefined,
                issues: issues.get(step.id),
            })),
        [pipeline.steps, issues, ids],
    )

    const keep = (next: Record<string, Point>) => {
        const exists = kept.rows?.some((row) => row.id === fileId) ?? false
        void (exists ? layouts.update(fileId, { positions: next }) : layouts.create({ positions: next }, fileId))
    }
    const placed = Object.keys(positions).some((id) => ids.has(id))

    /** Where a box after `id` goes: on the side its edges leave from. */
    const beside = (id: string): Point | undefined => {
        const box = controls?.nodeBox(id)
        if (box === null || box === undefined || controls === null) return undefined
        return controls.direction === 'down'
            ? { x: box.x, y: box.y + box.height + GAP.down }
            : { x: box.x + box.width + GAP.across, y: box.y }
    }

    /** Past every box, for a step added on its own to a graph placed by hand. */
    const pastAll = (): Point | undefined => {
        const boxes = pipeline.steps.flatMap((step) => controls?.nodeBox(step.id) ?? [])
        if (boxes.length === 0 || controls === null) return undefined
        if (controls.direction === 'down')
            return { x: Math.min(...boxes.map((box) => box.x)), y: Math.max(...boxes.map((box) => box.y + box.height)) + GAP.down }
        return { x: Math.max(...boxes.map((box) => box.x + box.width)) + GAP.across, y: Math.min(...boxes.map((box) => box.y)) }
    }

    const say = (tone: Notice['tone'], text: string) => setNotice({ tone, text })

    const canConnect = (source: string, target: string): string | null => {
        const into = pipeline.steps.find((step) => step.id === target)
        if (into === undefined) return null
        if (into.needs.includes(source)) return `${target} already comes after ${source}.`
        const loop = cyclePath(graphSteps, source, target)
        if (loop !== null) return `That makes a loop: ${[...loop, target].join(' → ')}.`
        return null
    }

    const remove = (gone: readonly string[]) => {
        if (gone.length === 0) return
        doc.replace(removeSteps(doc.text, gone))
        if (selected !== null && gone.includes(selected)) onSelect(null)
        setPicker(null)
        say('info', `Removed ${gone.join(', ')}. Undo brings ${gone.length === 1 ? 'it' : 'them'} back.`)
    }

    const editing: GraphEditing = {
        canConnect,
        onConnect: (source, target) => {
            const reason = canConnect(source, target)
            if (reason !== null) {
                say('critical', reason)
                return
            }
            doc.replace(connect(doc.text, source, target))
            setNotice(null)
        },
        onRefuse: (_source, _target, reason) => say('critical', reason),
        onDisconnect: (_edge, source, target) => {
            doc.replace(disconnect(doc.text, source, target))
            say('info', `${target} no longer comes after ${source}.`)
        },
        onRemove: (id) => remove([id]),
        onMove: (id, at) => keep({ ...positions, [id]: at }),
        onAppend: (id) => {
            onSelect(id)
            setPicker({ mode: 'after', source: id })
        },
        onInsert: (edge) => setPicker({ mode: 'insert', source: edge.source, target: edge.target, edge: edge.id }),
        onDrop: (source, at) => {
            onSelect(source)
            setPicker({ mode: 'drop', source, at: { x: at.x, y: at.y } })
        },
        onPaneMenu: (at) => setPicker({ mode: 'here', at: { x: at.x, y: at.y } }),
        onNodeMenu: (id, at) => {
            onSelect(id)
            setPicker(null)
            setMenu({ step: id, at })
        },
    }

    const pick = (block: PipelineBlock) => {
        if (picker === null || !isKind(block.kind)) return
        const at = (point: Point) => ({ x: point.x - DROP_OFFSET.x, y: point.y - DROP_OFFSET.y })
        let needs: string[] = []
        let before: string | undefined
        let where: Point | undefined
        if (picker.mode === 'after') {
            needs = [picker.source]
            where = placed ? beside(picker.source) : undefined
        } else if (picker.mode === 'insert') {
            needs = [picker.source]
            before = picker.target
        } else if (picker.mode === 'drop') {
            needs = [picker.source]
            where = at(picker.at)
        } else if (picker.mode === 'here') where = at(picker.at)
        else {
            needs = picker.after === null ? [] : [picker.after]
            where = placed ? (picker.after === null ? pastAll() : beside(picker.after)) : undefined
        }
        const added = addStep(doc.text, block.kind, { needs, before })
        if (added.id === '') return
        doc.replace(added.text)
        if (where !== undefined) keep({ ...positions, [added.id]: where })
        onSelect(added.id)
        setPicker(null)
        setNotice(null)
    }

    const openFromButton = (element: Element) =>
        setPicker((open) => (open?.mode === 'button' ? null : { mode: 'button', element, after: selected }))

    const anchor: GraphAnchor | null =
        picker === null
            ? null
            : picker.mode === 'after'
              ? { node: picker.source, dx: 34 }
              : picker.mode === 'insert'
                ? { edge: picker.edge }
                : picker.mode === 'button'
                  ? { element: picker.element }
                  : picker.at
    const pickerTitle =
        picker === null
            ? undefined
            : picker.mode === 'insert'
              ? `Between ${picker.source} and ${picker.target}`
              : picker.mode === 'after' || picker.mode === 'drop'
                ? `After ${picker.source}`
                : picker.mode === 'button' && picker.after !== null
                  ? `After ${picker.after}`
                  : 'A step on its own'

    const firstIssue = pipeline.steps.find((step) => issues.has(step.id))

    return (
        <>
            <PipelineGraph
                steps={graphSteps}
                positions={positions}
                selected={selected}
                onSelect={onSelect}
                editing={editing}
                onControls={setControls}
                words={{ label: pipeline.name === '' ? 'Pipeline' : pipeline.name, empty: 'No steps yet' }}
                emptyAction={
                    <Button size="sm" onClick={(event) => openFromButton(event.currentTarget)}>
                        <Plus aria-hidden />
                        Add step
                    </Button>
                }
                extraControls={
                    <GraphControlButton
                        label="Add a step"
                        aria-expanded={picker?.mode === 'button'}
                        onClick={(event) => openFromButton(event.currentTarget)}
                    >
                        <Plus aria-hidden />
                    </GraphControlButton>
                }
                toolbar={
                    <GraphToolbar
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={doc.canUndo}
                        canRedo={doc.canRedo}
                        zoom={false}
                        onLayout={placed ? () => keep({}) : undefined}
                        issues={pipeline.steps.length === 0 ? undefined : issues.size}
                        onIssues={firstIssue === undefined ? undefined : () => onSelect(firstIssue.id)}
                    />
                }
            >
                {anchor !== null && (
                    <GraphOverlay at={anchor} link={picker?.mode === 'drop' ? picker.source : undefined} onClose={() => setPicker(null)}>
                        <BlockPicker
                            blocks={BLOCKS}
                            groups={GROUPS}
                            title={pickerTitle}
                            words={{ search: 'Find a kind of step', list: 'Kinds of step' }}
                            onPick={pick}
                            onClose={() => setPicker(null)}
                        />
                    </GraphOverlay>
                )}
                {notice !== null && (
                    <GraphNotice tone={notice.tone} onClose={() => setNotice(null)}>
                        {notice.text}
                    </GraphNotice>
                )}
            </PipelineGraph>
            <DropdownMenu
                open={menu !== null}
                onOpenChange={(open) => {
                    if (!open) setMenu(null)
                }}
            >
                <DropdownMenuContent anchor={menu === null ? undefined : pointAt(menu.at)} side="bottom" align="start" className="w-48">
                    <DropdownMenuItem
                        onClick={() => {
                            if (menu !== null) setPicker({ mode: 'after', source: menu.step })
                            setMenu(null)
                        }}
                    >
                        Add a step after
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            if (menu !== null) onSettings(menu.step)
                            setMenu(null)
                        }}
                    >
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            if (menu !== null) onShowText(menu.step)
                            setMenu(null)
                        }}
                    >
                        Show in the text
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                            if (menu !== null) remove([menu.step])
                            setMenu(null)
                        }}
                    >
                        Remove step
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

/** A point on the screen as the box a menu opens beside. */
function pointAt(at: GraphPointer) {
    return { getBoundingClientRect: () => DOMRect.fromRect({ x: at.clientX, y: at.clientY, width: 0, height: 0 }) }
}
