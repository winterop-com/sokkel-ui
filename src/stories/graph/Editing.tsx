import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useState } from 'react'

import type { GraphPointer } from '@winterop-com/sokkel-ui-graph/GraphCanvas'
import { PipelineGraph, type PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Stage } from './Frame'
import { NIGHTLY_EXPORT } from './data'

/** A step's menu, open at the point the box was right-clicked. */
interface Menu {
    step: string
    at: GraphPointer
}

/** A point on the screen as the box a menu opens beside. */
function pointAt(at: GraphPointer) {
    return { getBoundingClientRect: () => DOMRect.fromRect({ x: at.clientX, y: at.clientY, width: 0, height: 0 }) }
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
    const [menuOpen, setMenuOpen] = useState(false)
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
            <Fill className="relative">
                <PipelineGraph
                    steps={steps}
                    positions={positions}
                    selected={selected}
                    onSelect={(code) => {
                        setSelected(code)
                        setMenuOpen(false)
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
                            setMenuOpen(true)
                        },
                        onDrop: (source, at) => add(source, { x: at.x, y: at.y - 22 }),
                    }}
                />
                <DropdownMenu
                    open={menuOpen}
                    onOpenChange={(open) => {
                        if (!open) setMenuOpen(false)
                    }}
                >
                    <DropdownMenuContent anchor={menu === null ? undefined : pointAt(menu.at)} side="bottom" align="start" className="w-44">
                        <DropdownMenuItem
                            onClick={() => {
                                if (menu !== null) add(menu.step)
                                setMenuOpen(false)
                            }}
                        >
                            Add a step after
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                                if (menu !== null) remove(menu.step)
                                setMenuOpen(false)
                            }}
                        >
                            Remove step
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </Fill>
            <Stack as="aside" gap="lg" className="shrink-0 rounded-surface border border-border bg-card p-4 md:w-72">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                    {said}
                </p>
                {chosen !== undefined && (
                    <TextField
                        id="step-name"
                        label="Name"
                        help="Backspace here edits the name and never removes the step."
                        value={chosen.name ?? ''}
                        placeholder={chosen.code}
                        onChange={(value) => {
                            const name = value
                            setSteps((held) =>
                                held.map((step) => (step.code === chosen.code ? { ...step, name: name === '' ? undefined : name } : step)),
                            )
                        }}
                    />
                )}
            </Stack>
        </Stage>
    )
}
