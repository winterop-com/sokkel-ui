import type { Meta, StoryObj } from '@storybook/react-vite'

import { useRepeated } from '@winterop-com/sokkel-ui/hooks/use-repeated'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { RepeatedGroup } from '@winterop-com/sokkel-ui/RepeatedGroup'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/** Fields asked again for each of several things in a hand-composed form, each row keeping its fields as rows move. */
const meta: Meta = { title: 'Patterns/Repeated group', parameters: { frame: 'column' } }
export default meta

interface Step {
    code: string
    retries: number | null
}

const STEPS: Step[] = [
    { code: 'fetch', retries: 3 },
    { code: 'transform', retries: 0 },
    { code: 'upload', retries: 5 },
]

function Steps({ readOnly = false }: { readOnly?: boolean }) {
    const steps = useRepeated<Step>(STEPS, () => ({ code: '', retries: 0 }))
    return (
        <TooltipProvider>
            <Stack gap="lg" className="max-w-xl">
                <RepeatedGroup
                    label="Steps"
                    description="Run in order; a failed step is tried again up to its retries."
                    rows={steps.rows}
                    onAdd={() => steps.add()}
                    onRemove={steps.remove}
                    onMove={steps.move}
                    min={1}
                    max={8}
                    readOnly={readOnly}
                    words={{ item: (index) => `Step ${String(index + 1)}` }}
                >
                    {(key, index) => {
                        const step = steps.rows[index].value
                        return (
                            <Stack gap="md">
                                <TextField
                                    id={`${key}-code`}
                                    label="Code"
                                    mono
                                    value={step.code}
                                    onChange={(code) => steps.set(key, { ...step, code })}
                                    readOnly={readOnly}
                                />
                                <NumberField
                                    id={`${key}-retries`}
                                    label="Retries"
                                    integer
                                    min={0}
                                    max={10}
                                    stepper
                                    value={step.retries}
                                    onValueChange={(retries) => steps.set(key, { ...step, retries })}
                                    readOnly={readOnly}
                                />
                            </Stack>
                        )
                    }}
                </RepeatedGroup>
            </Stack>
        </TooltipProvider>
    )
}

/** A run's three steps, each with its code and retries: Add, Move up, Move down and Remove, which goes at the last step. */
export const Editable: StoryObj = { name: 'Steps', render: () => <Steps /> }

/** The same steps read only: no Add, Move or Remove, and the fields locked. */
export const ReadOnly: StoryObj = { name: 'Read only', render: () => <Steps readOnly /> }
