import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '../../components/ui/field'
import { Label } from '../../components/ui/label'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

function Choices({ prefix, ...props }: { prefix: string } & React.ComponentProps<typeof RadioGroup>) {
    return (
        <RadioGroup defaultValue="daily" {...props}>
            {['hourly', 'daily', 'weekly'].map((value) => (
                <div key={value} className="flex items-center gap-2">
                    <RadioGroupItem id={`${prefix}-${value}`} value={value} />
                    <Label htmlFor={`${prefix}-${value}`}>{value}</Label>
                </div>
            ))}
        </RadioGroup>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/RadioGroup' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-10">
                <Labeled label="vertical">
                    <Choices prefix="v" />
                </Labeled>
                <Labeled label="horizontal">
                    <Choices prefix="h" className="flex flex-wrap gap-4" />
                </Labeled>
                <Labeled label="nothing picked">
                    <Choices prefix="n" defaultValue={undefined} />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-10">
                <Labeled label="group disabled">
                    <Choices prefix="d" disabled />
                </Labeled>
                <Labeled label="one disabled">
                    <RadioGroup defaultValue="daily">
                        <div className="flex items-center gap-2">
                            <RadioGroupItem id="o-daily" value="daily" />
                            <Label htmlFor="o-daily">daily</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <RadioGroupItem id="o-minute" value="minute" disabled />
                            <Label htmlFor="o-minute">each minute</Label>
                        </div>
                    </RadioGroup>
                </Labeled>
                <Labeled label="invalid">
                    <RadioGroup>
                        {['hourly', 'daily'].map((value) => (
                            <div key={value} className="flex items-center gap-2">
                                <RadioGroupItem id={`i-${value}`} value={value} aria-invalid />
                                <Label htmlFor={`i-${value}`}>{value}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

const ON_FAILURE = [
    { value: 'stop', title: 'Stop the run', detail: 'Later steps are skipped and the run ends failed.' },
    { value: 'continue', title: 'Continue', detail: 'Later steps run; the run ends completed with errors.' },
    { value: 'retry', title: 'Retry the step', detail: 'Up to 3 times, 10s apart, then stop.' },
]

export const StepFailurePolicy: StoryObj = {
    render: () => (
        <Ground>
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
        </Ground>
    ),
}
