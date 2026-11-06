import type { Meta, StoryObj } from '@storybook/react-vite'

import { Checkbox } from '../../components/ui/checkbox'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Inputs/Label', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-xs" label="over an input">
                <Stack gap="sm" className="w-full">
                    <Label htmlFor="label-code">Code</Label>
                    <Input id="label-code" defaultValue="import-orders" />
                </Stack>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="beside a checkbox">
                <Row>
                    <Checkbox id="label-notify" defaultChecked />
                    <Label htmlFor="label-notify">Notify on failure</Label>
                </Row>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="with a hint">
                <Label>
                    Timeout <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-xs" label="peer disabled">
                <Row>
                    <Checkbox id="label-disabled" disabled />
                    <Label htmlFor="label-disabled">Notify on failure</Label>
                </Row>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="group disabled">
                <Stack data-disabled="true" gap="sm" className="group">
                    <Label htmlFor="label-group">Base URL</Label>
                    <Input id="label-group" disabled defaultValue="https://api.example.org" />
                </Stack>
            </Specimen>
        </Row>
    ),
}
