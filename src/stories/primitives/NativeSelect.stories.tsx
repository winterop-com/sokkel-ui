import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field, FieldDescription, FieldLabel } from '../../components/ui/field'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '../../components/ui/native-select'
import { Row } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

function States3(props: React.ComponentProps<typeof NativeSelect>) {
    return (
        <NativeSelect aria-label="State" defaultValue="failed" {...props}>
            <NativeSelectOption value="">Any state</NativeSelectOption>
            <NativeSelectOption value="succeeded">succeeded</NativeSelectOption>
            <NativeSelectOption value="failed">failed</NativeSelectOption>
            <NativeSelectOption value="running">running</NativeSelectOption>
        </NativeSelect>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/NativeSelect', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen label="default">
                <States3 />
            </Specimen>
            <Specimen label="sm">
                <States3 size="sm" />
            </Specimen>
            <Specimen label="placeholder">
                <States3 defaultValue="" />
            </Specimen>
            <Specimen label="option groups">
                <NativeSelect aria-label="Destination" defaultValue="api">
                    <NativeSelectOptGroup label="Services">
                        <NativeSelectOption value="api">api</NativeSelectOption>
                        <NativeSelectOption value="worker">worker</NativeSelectOption>
                    </NativeSelectOptGroup>
                    <NativeSelectOptGroup label="Storage">
                        <NativeSelectOption value="harbor-exports">harbor-exports</NativeSelectOption>
                    </NativeSelectOptGroup>
                </NativeSelect>
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen label="disabled">
                <States3 disabled />
            </Specimen>
            <Specimen label="invalid">
                <States3 aria-invalid defaultValue="" />
            </Specimen>
        </Row>
    ),
}

export const RunsPerPage: StoryObj = {
    render: () => (
        <>
            <Row gap="md" justify="between" wrap className="rounded-lg border border-border px-3 py-2">
                <p className="text-sm text-muted-foreground">Runs 1 to 25 of 312</p>
                <Field orientation="horizontal" className="w-auto">
                    <FieldLabel htmlFor="per-page" className="font-normal text-muted-foreground">
                        Per page
                    </FieldLabel>
                    <NativeSelect id="per-page" size="sm" defaultValue="25">
                        <NativeSelectOption value="25">25</NativeSelectOption>
                        <NativeSelectOption value="50">50</NativeSelectOption>
                        <NativeSelectOption value="100">100</NativeSelectOption>
                    </NativeSelect>
                </Field>
            </Row>
            <FieldDescription>A native select suits short lists on a phone, where the system picker is easier to use.</FieldDescription>
        </>
    ),
}
