import { useMemo, useState } from 'react'

import type { Issue } from '../../../components/IssueMark'
import type { GraphEditing } from '../../../components/graph/GraphCanvas'
import type { GraphAnchor } from '../../../components/graph/GraphOverlay'
import { wouldCycle, type PipelineStep } from '../../../components/graph/PipelineGraph'
import { useGraphHistory } from '../../../components/graph/use-graph-history'
import { initialValue } from '../../../components/schema/SchemaForm'
import { validate } from '../../../components/schema/validate'
import { BLOCKS, blockOf, cannotFollow, type BlockSpec } from './blocks'

/** A step as the editor holds it: the block it is made from, and its settings. */
export interface EditorStep {
    code: string
    name?: string
    kind: string
    needs: string[]
    settings: Record<string, unknown>
}

type Point = { x: number; y: number }

/** What the editor's history holds: the steps, and where the person put the ones they moved. */
export interface PipelineDoc {
    steps: EditorStep[]
    positions: Record<string, Point>
}

/** Where a new step from the picker goes. */
export type Picker =
    | { mode: 'after'; source: string }
    | { mode: 'insert'; source: string; target: string }
    /** A connection let go at `at`; a story opening on one names a place beside a node as `anchor` instead, and the layout places the step. */
    | { mode: 'drop'; source: string; at: Point | null; anchor?: GraphAnchor }

export interface Notice {
    tone: 'critical' | 'info'
    text: string
}

/** How far a dropped box's corner sits from the point it was dropped at, so the box lands under the pointer. */
const DROP_OFFSET = { x: 16, y: 22 }

/** A code not yet taken, from a block's prefix: fetch, fetch-2, fetch-3. */
function freeCode(steps: readonly EditorStep[], prefix: string): string {
    const taken = new Set(steps.map((step) => step.code))
    if (!taken.has(prefix)) return prefix
    for (let n = 2; ; n += 1) if (!taken.has(`${prefix}-${String(n)}`)) return `${prefix}-${String(n)}`
}

/** What is wrong with each step: an input with nothing flowing in, and every setting its schema refuses. */
export function stepIssues(steps: readonly EditorStep[], onOpen?: (code: string) => void): Map<string, Issue[]> {
    const out = new Map<string, Issue[]>()
    for (const step of steps) {
        const block = blockOf(step.kind)
        if (block === undefined) continue
        const issues: Issue[] = []
        const open = onOpen === undefined ? undefined : [{ label: 'Open its settings', onClick: () => onOpen(step.code) }]
        if (block.accepts.length > 0 && step.needs.length === 0)
            issues.push({ tone: 'critical', text: 'Nothing flows in', detail: `Connect a step that gives ${block.accepts.join(' or ')}.` })
        for (const issue of validate(block.schema, step.settings)) {
            if (issue.tone !== 'critical') continue
            const key = String(issue.path[issue.path.length - 1] ?? '')
            const title = (block.schema.properties?.[key]?.title as string | undefined) ?? key
            issues.push({
                tone: 'critical',
                text: issue.kind === 'required' || issue.kind === 'minItems' ? `${title} is not set` : `${title} is not valid`,
                detail: 'Every required setting needs a value before the pipeline runs.',
                actions: open,
            })
        }
        if (issues.length > 0) out.set(step.code, issues)
    }
    return out
}

/**
 * A pipeline editor's state as an app would keep it: the document under undo, the chosen steps,
 * the open picker and the last notice, with every gesture of the canvas applied to the document.
 */
export function usePipelineEditor(
    initial: PipelineDoc,
    {
        selection: firstSelection = [],
        picker: firstPicker = null,
        notice: firstNotice = null,
        past,
    }: { selection?: string[]; picker?: Picker | null; notice?: Notice | null; past?: PipelineDoc[] } = {},
) {
    const history = useGraphHistory(initial, { past })
    const doc = history.value
    const [chosen, setSelection] = useState<string[]>(firstSelection)
    const [picker, setPicker] = useState<Picker | null>(firstPicker)
    const [notice, setNotice] = useState<Notice | null>(firstNotice)

    const codes = new Set(doc.steps.map((step) => step.code))
    const selection = chosen.filter((code) => codes.has(code))
    const selected = selection.length === 1 ? (selection[0] as string) : null
    const step = (code: string) => doc.steps.find((each) => each.code === code)
    const blockAt = (code: string) => blockOf(step(code)?.kind)
    const say = (tone: Notice['tone'], text: string) => setNotice({ tone, text })

    const issues = useMemo(() => stepIssues(doc.steps, (code) => setSelection([code])), [doc.steps])
    const issueCount = issues.size

    const steps = useMemo<PipelineStep[]>(
        () =>
            doc.steps.map((each) => ({
                code: each.code,
                name: each.name,
                kind: each.kind,
                needs: each.needs,
                icon: blockOf(each.kind)?.icon,
                issues: issues.get(each.code),
            })),
        [doc.steps, issues],
    )

    /** Adds a step of `block` after `needs`, at `at` if given, chooses it, and says what was done. */
    const create = (block: BlockSpec, needs: string[], at?: Point, then?: (current: PipelineDoc, code: string) => PipelineDoc) => {
        const code = freeCode(doc.steps, block.prefix)
        const settings = (initialValue(block.schema) ?? {}) as Record<string, unknown>
        history.set((current) => {
            const added: PipelineDoc = {
                steps: [...current.steps, { code, kind: block.kind, needs, settings }],
                positions:
                    at === undefined
                        ? current.positions
                        : { ...current.positions, [code]: { x: at.x - DROP_OFFSET.x, y: at.y - DROP_OFFSET.y } },
            }
            return then === undefined ? added : then(added, code)
        })
        setSelection([code])
        setPicker(null)
        setNotice(null)
        return code
    }

    const canConnect = (source: string, target: string): string | null => {
        const from = blockAt(source)
        const to = step(target)
        const into = blockAt(target)
        if (from === undefined || to === undefined || into === undefined) return null
        if (to.needs.includes(source)) return `${target} already follows ${source}.`
        if (wouldCycle(doc.steps, source, target)) return `That would make a loop: ${target} already leads to ${source}.`
        return cannotFollow(from, into)
    }

    const remove = (gone: readonly string[]) => {
        if (gone.length === 0) return
        const out = new Set(gone)
        history.set((current) => ({
            steps: current.steps
                .filter((each) => !out.has(each.code))
                .map((each) => ({ ...each, needs: each.needs.filter((need) => !out.has(need)) })),
            positions: Object.fromEntries(Object.entries(current.positions).filter(([code]) => !out.has(code))),
        }))
        setSelection((held) => held.filter((code) => !out.has(code)))
        setPicker(null)
        say(
            'info',
            gone.length === 1
                ? `Removed ${gone[0] as string}. Undo brings it back.`
                : `Removed ${String(gone.length)} steps. Undo brings them back.`,
        )
    }

    const editing: GraphEditing = {
        canConnect,
        onConnect: (source, target) => {
            const reason = canConnect(source, target)
            if (reason !== null) {
                say('critical', reason)
                return
            }
            history.set((current) => ({
                ...current,
                steps: current.steps.map((each) => (each.code === target ? { ...each, needs: [...each.needs, source] } : each)),
            }))
            setNotice(null)
        },
        onRefuse: (_source, _target, reason) => say('critical', reason),
        onDisconnect: (_, source, target) =>
            history.set((current) => ({
                ...current,
                steps: current.steps.map((each) =>
                    each.code === target ? { ...each, needs: each.needs.filter((need) => need !== source) } : each,
                ),
            })),
        onRemove: (code) => remove([code]),
        onMove: (code, position) => history.set((current) => ({ ...current, positions: { ...current.positions, [code]: position } })),
        onDrop: (source, at) => {
            if (blockAt(source)?.produces === undefined) return
            setSelection([source])
            setPicker({ mode: 'drop', source, at: { x: at.x, y: at.y } })
        },
        onInsert: (edge) => setPicker({ mode: 'insert', source: edge.source, target: edge.target }),
        canAppend: (code) => blockAt(code)?.produces !== undefined,
        onAppend: (code) => {
            setSelection([code])
            setPicker({ mode: 'after', source: code })
        },
        onDropItem: (kind, at) => {
            const block = blockOf(kind)
            if (block !== undefined) create(block, [], at)
        },
    }

    /** The blocks that fit where the open picker would put a step. */
    const offered = useMemo<BlockSpec[]>(() => {
        if (picker === null) return []
        const from = blockOf(doc.steps.find((each) => each.code === picker.source)?.kind)
        if (from === undefined) return []
        const into = picker.mode === 'insert' ? blockOf(doc.steps.find((each) => each.code === picker.target)?.kind) : undefined
        return BLOCKS.filter(
            (block) =>
                cannotFollow(from, block) === null &&
                (into === undefined || (block.produces !== undefined && into.accepts.includes(block.produces))),
        )
    }, [picker, doc.steps])

    const anchor: GraphAnchor | null =
        picker === null
            ? null
            : picker.mode === 'after'
              ? { node: picker.source, dx: 34 }
              : picker.mode === 'insert'
                ? { edge: `${picker.source}->${picker.target}` }
                : (picker.anchor ?? picker.at ?? { node: picker.source, dx: 60 })

    const pickerTitle =
        picker === null ? undefined : picker.mode === 'insert' ? `Between ${picker.source} and ${picker.target}` : `After ${picker.source}`

    const pick = (block: BlockSpec) => {
        if (picker === null) return
        if (picker.mode === 'insert') {
            const { source, target } = picker
            create(block, [source], undefined, (current, code) => ({
                ...current,
                steps: current.steps.map((each) =>
                    each.code === target ? { ...each, needs: each.needs.map((need) => (need === source ? code : need)) } : each,
                ),
            }))
        } else create(block, [picker.source], picker.mode === 'drop' ? (picker.at ?? undefined) : undefined)
    }

    /** A palette's click: after the one chosen step when the block can follow it, else on its own. */
    const addFromPalette = (block: BlockSpec) => {
        const after = selected === null ? undefined : blockAt(selected)
        const reason = after === undefined ? null : cannotFollow(after, block)
        if (selected !== null && reason === null) create(block, [selected])
        else {
            create(block, [])
            if (reason !== null) say('info', `${reason} It was added on its own.`)
        }
    }

    const update = (code: string, change: (step: EditorStep) => EditorStep, merge?: string) =>
        history.set((current) => ({ ...current, steps: current.steps.map((each) => (each.code === code ? change(each) : each)) }), {
            merge,
        })

    /** Why a code cannot be given to a step, or null. */
    const codeProblem = (code: string, next: string): string | null => {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(next)) return 'Use lowercase letters, digits and dashes.'
        if (next !== code && codes.has(next)) return `${next} is taken by another step.`
        return null
    }

    const rename = (code: string, next: string) => {
        if (next === code || codeProblem(code, next) !== null) return
        history.set((current) => ({
            steps: current.steps.map((each) => ({
                ...each,
                code: each.code === code ? next : each.code,
                needs: each.needs.map((need) => (need === code ? next : need)),
            })),
            positions: Object.fromEntries(Object.entries(current.positions).map(([key, at]) => [key === code ? next : key, at])),
        }))
        setSelection((held) => held.map((each) => (each === code ? next : each)))
    }

    return {
        history,
        doc,
        steps,
        issues,
        issueCount,
        selection,
        selected,
        setSelection,
        editing,
        picker,
        setPicker,
        offered,
        anchor,
        pickerTitle,
        pick,
        notice,
        setNotice,
        addFromPalette,
        remove,
        layout: () => {
            history.set((current) => ({ ...current, positions: {} }))
            setNotice(null)
        },
        setSettings: (code: string, settings: Record<string, unknown>) =>
            update(code, (each) => ({ ...each, settings }), `settings:${code}`),
        setName: (code: string, name: string) =>
            update(code, (each) => ({ ...each, name: name === '' ? undefined : name }), `name:${code}`),
        rename,
        codeProblem,
        step,
        firstIssue: () => {
            const first = doc.steps.find((each) => issues.has(each.code))
            if (first !== undefined) setSelection([first.code])
        },
    }
}

export type PipelineEditorState = ReturnType<typeof usePipelineEditor>
