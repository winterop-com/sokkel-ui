import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '../../components/ui/field'
import { Label } from '../../components/ui/label'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Row } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

function Choices({ prefix, ...props }: { prefix: string } & React.ComponentProps<typeof RadioGroup>) {
    return (
        <RadioGroup defaultValue="daily" {...props}>
            {['hourly', 'daily', 'weekly'].map((value) => (
                <Row key={value}>
                    <RadioGroupItem id={`${prefix}-${value}`} value={value} />
                    <Label htmlFor={`${prefix}-${value}`}>{value}</Label>
                </Row>
            ))}
        </RadioGroup>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/RadioGroup', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="3xl" align="stretch" wrap>
            <Specimen label="vertical">
                <Choices prefix="v" />
            </Specimen>
            <Specimen label="horizontal">
                <Choices prefix="h" orientation="horizontal" />
            </Specimen>
            <Specimen label="nothing picked">
                <Choices prefix="n" defaultValue={undefined} />
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="3xl" align="stretch" wrap>
            <Specimen label="group disabled">
                <Choices prefix="d" disabled />
            </Specimen>
            <Specimen label="one disabled">
                <RadioGroup defaultValue="daily">
                    <Row>
                        <RadioGroupItem id="o-daily" value="daily" />
                        <Label htmlFor="o-daily">daily</Label>
                    </Row>
                    <Row>
                        <RadioGroupItem id="o-minute" value="minute" disabled />
                        <Label htmlFor="o-minute">each minute</Label>
                    </Row>
                </RadioGroup>
            </Specimen>
            <Specimen label="invalid">
                <RadioGroup>
                    {['hourly', 'daily'].map((value) => (
                        <Row key={value}>
                            <RadioGroupItem id={`i-${value}`} value={value} aria-invalid />
                            <Label htmlFor={`i-${value}`}>{value}</Label>
                        </Row>
                    ))}
                </RadioGroup>
            </Specimen>
        </Row>
    ),
}

const ON_FAILURE = [
    { value: 'stop', title: 'Stop the run', detail: 'Later steps are skipped and the run ends failed.' },
    { value: 'continue', title: 'Continue', detail: 'Later steps run; the run ends completed with errors.' },
    { value: 'retry', title: 'Retry the step', detail: 'Up to 3 times, 10s apart, then stop.' },
]

export const StepFailurePolicy: StoryObj = {
    render: () => (
        <FieldSet className="max-w-md">
            <FieldLegend>When the step upload fails</FieldLegend>
            <FieldDescription>Applies to every run of nightly-export.</FieldDescription>
            <RadioGroup defaultValue="retry">
                {ON_FAILURE.map((choice) => (
                    <FieldLabel key={choice.value} htmlFor={`p-${choice.value}`}>
                        <Field orientation="horizontal">
                            <FieldContent>
                                <FieldTitle>{choice.title}</FieldTitle>
                                <FieldDescription>{choice.detail}</FieldDescription>
                            </FieldContent>
                            <RadioGroupItem id={`p-${choice.value}`} value={choice.value} />
                        </Field>
                    </FieldLabel>
                ))}
            </RadioGroup>
        </FieldSet>
    ),
}
