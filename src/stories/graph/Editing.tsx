import { useState } from 'react'

import { Field } from '../../components/Field'
import type { GraphPointer } from '../../components/graph/GraphCanvas'
import { PipelineGraph, type PipelineStep } from '../../components/graph/PipelineGraph'
import { Input } from '../../components/ui/input'
import { Stage } from './Frame'
import { NIGHTLY_EXPORT } from './data'

/** A step's menu, open at the point the box was right-clicked. */
interface Menu {
    step: string
    at: GraphPointer
}

/**
 * The pipeline as an editor with local state: the graph reports each gesture, and this applies it
 * to its own list of steps and positions and says what it did.
 */
export function Editor() {
    const [steps, setSteps] = useState<PipelineStep[]>(NIGHTLY_EXPORT)
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
    const [selected, setSelected] = useState<string | null>('validate')
    const [menu, setMenu] = useState<Menu | null>(null)
    const [said, setSaid] = useState('Drag from a port to connect, select and press Delete to remove, right-click a box for its menu.')
    const [added, setAdded] = useState(0)
    const chosen = steps.find((step) => step.code === selected)

    const remove = (code: string) => {
        setSteps((held) =>
            held.filter((step) => step.code !== code).map((step) => ({ ...step, needs: step.needs.filter((need) => need !== code) })),
        )
        if (selected === code) setSelected(null)
        setSaid(`Removed ${code}.`)
    }
    const add = (after: string, at?: { x: number; y: number }) => {
        const code = `step-${String(added + 1)}`
        setAdded(added + 1)
        setSteps((held) => [...held, { code, kind: 'python', needs: [after] }])
        if (at !== undefined) setPositions((held) => ({ ...held, [code]: at }))
        setSelected(code)
        setSaid(`Added ${code} after ${after}.`)
    }

    return (
        <Stage title="nightly-export" meta="harbor, editing">
            <div className="relative flex min-h-0 min-w-0 flex-1">
                <PipelineGraph
                    steps={steps}
                    positions={positions}
                    selected={selected}
                    onSelect={(code) => {
                        setSelected(code)
                        setMenu(null)
                    }}
                    words={{ label: 'nightly-export' }}
                    editing={{
                        onConnect: (source, target) => {
                            setSteps((held) =>
                                held.map((step) =>
                                    step.code === target && !step.needs.includes(source)
                                        ? { ...step, needs: [...step.needs, source] }
                                        : step,
                                ),
                            )
                            setSaid(`${target} now needs ${source}.`)
                        },
                        onDisconnect: (_, source, target) => {
                            setSteps((held) =>
                                held.map((step) =>
                                    step.code === target ? { ...step, needs: step.needs.filter((need) => need !== source) } : step,
                                ),
                            )
                            setSaid(`${target} no longer needs ${source}.`)
                        },
                        onRemove: remove,
                        onMove: (code, position) => {
                            setPositions((held) => ({ ...held, [code]: position }))
                            setSaid(`Moved ${code}.`)
                        },
                        onNodeMenu: (step, at) => {
                            setSelected(step)
                            setMenu({ step, at })
                        },
                        onDrop: (source, at) => add(source, { x: at.x, y: at.y - 22 }),
                    }}
                />
                {menu !== null && (
                    <div
                        role="menu"
                        className="fixed z-50 flex w-44 flex-col rounded-control border border-border bg-popover p-1 text-sm text-popover-foreground shadow-pop"
                        style={{ left: menu.at.clientX, top: menu.at.clientY }}
                    >
                        <button
                            type="button"
                            role="menuitem"
                            className="rounded-chip px-2 py-1.5 text-left hover:bg-muted"
                            onClick={() => {
                                add(menu.step)
                                setMenu(null)
                            }}
                        >
                            Add a step after
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className="rounded-chip px-2 py-1.5 text-left text-destructive hover:bg-muted"
                            onClick={() => {
                                remove(menu.step)
                                setMenu(null)
                            }}
                        >
                            Remove step
                        </button>
                    </div>
                )}
            </div>
            <aside className="flex shrink-0 flex-col gap-4 rounded-surface border border-border bg-card p-4 md:w-72">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                    {said}
                </p>
                {chosen !== undefined && (
                    <Field id="step-name" label="Name" help="Backspace here edits the name and never removes the step.">
                        <Input
                            id="step-name"
                            value={chosen.name ?? ''}
                            placeholder={chosen.code}
                            onChange={(event) => {
                                const name = event.target.value
                                setSteps((held) =>
                                    held.map((step) =>
                                        step.code === chosen.code ? { ...step, name: name === '' ? undefined : name } : step,
                                    ),
                                )
                            }}
                        />
                    </Field>
                )}
            </aside>
        </Stage>
    )
}
