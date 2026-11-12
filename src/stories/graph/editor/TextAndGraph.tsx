import { CodeEditor, useSharedDocument, useSharedText, type SharedDocument } from '@winterop-com/sokkel-ui/CodeEditor'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { BlockPicker } from '@winterop-com/sokkel-ui-graph/BlockPicker'
import type { GraphControls, GraphEditing } from '@winterop-com/sokkel-ui-graph/GraphCanvas'
import { GraphNotice, GraphOverlay, type GraphAnchor } from '@winterop-com/sokkel-ui-graph/GraphOverlay'
import { GraphToolbar } from '@winterop-com/sokkel-ui-graph/GraphToolbar'
import { GraphControlButton } from '@winterop-com/sokkel-ui-graph/GraphViewButtons'
import { cyclePath } from '@winterop-com/sokkel-ui-graph/cycles'
import { PipelineGraph, type PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { useHistoryKeys } from '@winterop-com/sokkel-ui-graph/use-graph-history'
import { blockOf, BLOCKS, GROUPS } from './blocks'
import { NIGHTLY } from './documents'

/** A step as the text writes it. */
interface TextStep {
    code: string
    kind: string
    needs: string[]
}

const START = `${JSON.stringify({ steps: NIGHTLY.map(({ code, kind, needs }) => ({ code, kind, needs })) }, null, 2)}\n`

/** The steps the text holds, or null while it does not read. */
function readSteps(text: string): TextStep[] | null {
    try {
        const value = JSON.parse(text) as { steps?: unknown }
        return Array.isArray(value.steps) ? (value.steps as TextStep[]) : null
    } catch {
        return null
    }
}

/** Writes steps back as the text, an edit to undo in the editor too. */
function write(doc: SharedDocument, steps: readonly TextStep[]) {
    doc.replace(`${JSON.stringify({ steps }, null, 2)}\n`)
}

/**
 * A pipeline kept as text and edited in both its editor and its graph: each gesture on the graph
 * is written into the text with `replace`, each keystroke redraws the graph, and the text's own
 * history is the one undo, from the toolbar, the keys or the editor.
 */
export function TextAndGraph() {
    const doc = useSharedDocument(START)
    const text = useSharedText(doc)
    const read = useMemo(() => readSteps(text), [text])
    const [last, setLast] = useState<TextStep[]>(read ?? [])
    if (read !== null && read !== last) setLast(read)
    const steps = read ?? last
    const [selected, setSelected] = useState<string | null>('validate')
    const [adding, setAdding] = useState<GraphAnchor | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [controls, setControls] = useState<GraphControls | null>(null)
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

    useHistoryKeys(
        () => doc.undo(),
        () => doc.redo(),
    )

    const drawn = useMemo<PipelineStep[]>(
        () => steps.map((step) => ({ code: step.code, kind: step.kind, needs: step.needs, icon: blockOf(step.kind)?.icon })),
        [steps],
    )
    const editing: GraphEditing = {
        canConnect: (source, target) => {
            const loop = cyclePath(drawn, source, target)
            return loop === null ? null : `That makes a loop: ${[...loop, target].join(' → ')}.`
        },
        onRefuse: (_source, _target, reason) => setNotice(reason),
        onConnect: (source, target) =>
            write(
                doc,
                steps.map((step) => (step.code === target ? { ...step, needs: [...new Set([...step.needs, source])] } : step)),
            ),
        onDisconnect: (_edge, source, target) =>
            write(
                doc,
                steps.map((step) => (step.code === target ? { ...step, needs: step.needs.filter((need) => need !== source) } : step)),
            ),
        onRemove: (code) =>
            write(
                doc,
                steps.filter((step) => step.code !== code).map((step) => ({ ...step, needs: step.needs.filter((need) => need !== code) })),
            ),
        onMove: (code, at) => setPositions((held) => ({ ...held, [code]: at })),
        onAppend: (code) => {
            setSelected(code)
            setAdding({ node: code, dx: 34 })
        },
    }

    const pick = (kind: string) => {
        const block = blockOf(kind)
        if (block === undefined) return
        const taken = new Set(steps.map((step) => step.code))
        let code = block.prefix
        for (let n = 2; taken.has(code); n += 1) code = `${block.prefix}-${String(n)}`
        write(doc, [...steps, { code, kind, needs: selected === null ? [] : [selected] }])
        // On a graph placed by hand, the new box goes beside the one it follows, on the side the graph runs to.
        const box = selected === null ? null : (controls?.nodeBox(selected) ?? null)
        if (box !== null && controls !== null && Object.keys(positions).length > 0)
            setPositions((held) => ({
                ...held,
                [code]: controls.direction === 'down' ? { x: box.x, y: box.y + box.height + 48 } : { x: box.x + box.width + 64, y: box.y },
            }))
        setSelected(code)
        setAdding(null)
    }

    return (
        <Stack className="h-svh bg-background p-4 text-foreground md:p-6">
            <PageHeader title="nightly-export" description="harbor, edited as text and as a graph" />
            <SplitPane
                className="min-h-0 flex-1 rounded-surface border border-border"
                defaultShare={0.4}
                first={<CodeEditor doc={doc} label="nightly-export" language="json" variant="pane" size="sm" />}
                second={
                    <PipelineGraph
                        steps={drawn}
                        positions={positions}
                        selected={selected}
                        onSelect={setSelected}
                        editing={editing}
                        onControls={setControls}
                        words={{ label: 'nightly-export', empty: 'No steps yet' }}
                        extraControls={
                            <GraphControlButton
                                label="Add a step"
                                aria-expanded={adding !== null}
                                onClick={(event) => setAdding(adding === null ? { element: event.currentTarget } : null)}
                            >
                                <Plus aria-hidden />
                            </GraphControlButton>
                        }
                        toolbar={
                            <GraphToolbar
                                onUndo={() => doc.undo()}
                                onRedo={() => doc.redo()}
                                canUndo={doc.canUndo}
                                canRedo={doc.canRedo}
                                onLayout={Object.keys(positions).length > 0 ? () => setPositions({}) : undefined}
                                zoom={false}
                            />
                        }
                    >
                        {adding !== null && (
                            <GraphOverlay at={adding} onClose={() => setAdding(null)}>
                                <BlockPicker
                                    blocks={BLOCKS}
                                    groups={GROUPS}
                                    title={selected === null ? 'First step' : `After ${selected}`}
                                    onPick={(block) => pick(block.kind)}
                                    onClose={() => setAdding(null)}
                                />
                            </GraphOverlay>
                        )}
                        {notice !== null && (
                            <GraphNotice tone="critical" onClose={() => setNotice(null)}>
                                {notice}
                            </GraphNotice>
                        )}
                    </PipelineGraph>
                }
            />
        </Stack>
    )
}
