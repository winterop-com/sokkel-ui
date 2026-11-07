import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Inputs/Input', parameters: { frame: 'column' } }
export default meta

/** Every prop of an input, to try live. */
export const Playground: StoryObj<{
    label: string
    placeholder: string
    value: string
    code: boolean
    invalid: boolean
    disabled: boolean
}> = {
    parameters: { frame: 'padded', controls: { disable: false } },
    args: { label: 'Endpoint', placeholder: 'https://api.example.org', value: '', code: false, invalid: false, disabled: false },
    render: (args) => (
        <Stack gap="xs" className="max-w-sm">
            <Label htmlFor="playground">{args.label}</Label>
            <Input
                id="playground"
                placeholder={args.placeholder}
                defaultValue={args.value}
                className={args.code ? 'font-mono' : undefined}
                aria-invalid={args.invalid || undefined}
                disabled={args.disabled}
            />
        </Stack>
    ),
}

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-xs" label="text">
                <Input aria-label="Code" placeholder="import-orders" />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="filled">
                <Input aria-label="Code" defaultValue="import-orders" />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="url">
                <Input aria-label="Base URL" type="url" defaultValue="https://api.example.org" />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="password">
                <Input aria-label="Token" type="password" defaultValue="tok_abcdefghijklm" />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="number">
                <Input aria-label="Retries" type="number" defaultValue={3} />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="file">
                <Input aria-label="Upload" type="file" />
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-xs" label="disabled">
                <Input aria-label="Code" disabled defaultValue="import-orders" />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="read only">
                <Input aria-label="Id" readOnly defaultValue="0193f1c2-7a4e-7c8b-9d11-2f6a0b3e5c71" />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="invalid">
                <Input aria-label="Code" aria-invalid defaultValue="Import Orders" />
            </Specimen>
            <Specimen className="w-full max-w-xs" label="empty">
                <Input aria-label="Code" placeholder="A code, such as import-orders" />
            </Specimen>
        </Row>
    ),
}

/** No border, background or focus ring: a title typed straight onto a card, which draws the frame. */
export const Bare: StoryObj = {
    render: () => (
        <Card className="max-w-md">
            <CardContent>
                <Input
                    bare
                    aria-label="Title"
                    placeholder="Untitled"
                    defaultValue="Why import-orders skipped validate"
                    className="text-title font-medium"
                />
            </CardContent>
        </Card>
    ),
}

export const SearchRuns: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-md">
            <Label htmlFor="run-search">Find a run</Label>
            <Input id="run-search" type="search" placeholder="Run id, job or person" defaultValue="import-orders" />
            <p className="text-xs text-muted-foreground">3 runs of import-orders since 2026-11-04 12:00.</p>
        </Stack>
    ),
}
