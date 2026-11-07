import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Inputs/Textarea', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-sm" label="empty">
                <Textarea aria-label="Description" placeholder="What this job does, in a sentence or two." />
            </Specimen>
            <Specimen className="w-full max-w-sm" label="filled">
                <Textarea
                    aria-label="Description"
                    defaultValue="Fetches the day's orders, validates each row, and uploads the rows that pass."
                />
            </Specimen>
            <Specimen className="w-full max-w-sm" label="mono">
                <Textarea aria-label="Filter" className="font-mono" defaultValue={'.rows\n| map(select(.amount > 0))\n| length'} />
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-sm" label="disabled">
                <Textarea aria-label="Description" disabled defaultValue="Managed by the harbor project." />
            </Specimen>
            <Specimen className="w-full max-w-sm" label="invalid">
                <Textarea aria-label="Filter" className="font-mono" aria-invalid defaultValue=".rows | map(select(.amount >" />
            </Specimen>
            <Specimen className="w-full max-w-sm" label="read only">
                <Textarea aria-label="Description" readOnly defaultValue="Written by the run; it cannot be changed." />
            </Specimen>
        </Row>
    ),
}

/** No border, background or focus ring: a note written straight onto a card, which draws the frame, and grows with its text. */
export const Bare: StoryObj = {
    render: () => (
        <Card className="max-w-md">
            <CardContent>
                <Textarea
                    bare
                    aria-label="Note"
                    placeholder="Write a note"
                    className="min-h-24 text-sm"
                    defaultValue="The validate step skipped 14 rows of import-orders: their amounts were empty. Linus is looking at the source."
                />
            </CardContent>
        </Card>
    ),
}

export const RunNote: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-lg">
            <Label htmlFor="note">Note on run 01a1a5c2</Label>
            <Textarea
                id="note"
                defaultValue="Failed at 2026-11-04 14:02 after 0.3s: api refused the request during its maintenance window. Retried by hand at 14:20."
            />
            <p className="text-xs text-muted-foreground">Markdown is fine. Everyone who can see the run sees the note.</p>
            <Row gap="none" align="stretch" justify="end">
                <Button size="sm">Save note</Button>
            </Row>
        </Stack>
    ),
}
