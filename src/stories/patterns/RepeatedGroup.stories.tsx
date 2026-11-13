import type { Meta, StoryObj } from '@storybook/react-vite'

import { useRepeated } from '@winterop-com/sokkel-ui/hooks/use-repeated'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { RepeatedDrag } from '@winterop-com/sokkel-ui/RepeatedDrag'
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

function Recipients() {
    const recipients = useRepeated<string>(['ada@example.org', 'grace@example.org'], () => '')
    return (
        <TooltipProvider>
            <Stack gap="lg" className="max-w-xl">
                <RepeatedGroup
                    label="Recipients"
                    description="Who send-digest mails each morning, one address an answer."
                    rows={recipients.rows}
                    onAdd={() => recipients.add()}
                    onRemove={recipients.remove}
                    min={1}
                    words={{ item: (index) => `Recipient ${String(index + 1)}` }}
                >
                    {(key, index) => (
                        <TextField
                            id={`${key}-address`}
                            label="Address"
                            mono
                            value={recipients.rows[index].value}
                            onChange={(address) => recipients.set(key, address)}
                        />
                    )}
                </RepeatedGroup>
            </Stack>
        </TooltipProvider>
    )
}

function Services() {
    const services = useRepeated<string>(['api', 'worker'], () => '')
    const few = services.rows.length < 3
    return (
        <TooltipProvider>
            <Stack gap="lg" className="max-w-xl">
                <RepeatedGroup
                    label="Services"
                    description="Every service the harbor project runs, each watched by sync-inventory."
                    required
                    error={few ? 'Add at least 3 services' : null}
                    rows={services.rows}
                    onAdd={() => services.add()}
                    onRemove={services.remove}
                    words={{ item: (index) => `Service ${String(index + 1)}` }}
                >
                    {(key, index) => (
                        <TextField
                            id={`${key}-name`}
                            label="Name"
                            mono
                            required
                            value={services.rows[index].value}
                            onChange={(name) => services.set(key, name)}
                        />
                    )}
                </RepeatedGroup>
            </Stack>
        </TooltipProvider>
    )
}

/** A question answered more than once: a row of one control for each answer, each with Remove, and Add for another. */
export const OneControl: StoryObj = { name: 'One control', render: () => <Recipients /> }

/** A run's three steps, each with its code and retries: Add, Move up, Move down and Remove, which goes at the last step. */
export const Editable: StoryObj = { name: 'Steps', render: () => <Steps /> }

/**
 * The same steps inside a `RepeatedDrag`: a grip before each step's number drags it to another
 * place, the others moving aside, and with the grip focused the up and down arrows move it a place.
 */
export const Dragged: StoryObj = {
    render: () => (
        <RepeatedDrag>
            <Steps />
        </RepeatedDrag>
    ),
}

/** The same steps read only: no Add, Move or Remove, and the fields locked. */
export const ReadOnly: StoryObj = { name: 'Read only', render: () => <Steps readOnly /> }

/**
 * A required group, starred after its name as a required field is, refused as a whole: the issue
 * mark beside its name opens why ("Add at least 3 services"), and goes once a third service is added.
 */
export const Refused: StoryObj = { render: () => <Services /> }
