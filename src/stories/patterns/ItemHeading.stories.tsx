import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Server } from 'lucide-react'

import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { ItemHeading } from '@winterop-com/sokkel-ui/ItemHeading'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'

const meta: Meta = { title: 'Patterns/Item heading', parameters: { frame: 'padded' } }
export default meta

/** A job's name with its code under it, and a job with no name, whose code is its heading, drawn once in the code face. */
export const Stacked: StoryObj = {
    render: () => (
        <Stack gap="xl">
            <ItemHeading name="Nightly export" code="nightly-export" />
            <ItemHeading code="sync-inventory" />
        </Stack>
    ),
}

/** The name and its code on one line; a narrow panel cuts the code short before the name. */
export const Inline: StoryObj = {
    render: () => (
        <Stack gap="xl">
            <ItemHeading name="Nightly export" code="nightly-export" variant="inline" />
            <ItemHeading name="Sync inventory with the three warehouses" code="sync-inventory" variant="inline" />
        </Stack>
    ),
}

/**
 * A glyph saying what kind of thing it is, chips after the name, and one line of description cut
 * short with the whole of it on hover, stacked and inline.
 */
export const WithParts: StoryObj = {
    name: 'With parts',
    render: () => (
        <Stack gap="xl">
            <ItemHeading
                name="Nightly export"
                code="nightly-export"
                glyph={<CalendarClock />}
                chips={<StatusChip status="failed" />}
                description="Exports the day's orders at 02:00 and uploads them for the finance team, then tells grace when a run fails."
            />
            <ItemHeading
                name="Worker"
                code="worker"
                variant="inline"
                glyph={<Server />}
                chips={<StatusChip status="running" />}
                description="Runs each step of a job as the scheduler hands it over."
            />
            <ItemHeading
                code="api"
                variant="inline"
                glyph={<Server />}
                chips={<StatusChip status="succeeded" label="healthy" />}
                description="Serves the public API on api.example.org."
            />
        </Stack>
    ),
}

/** The dialog size, heading a dialog about one service. */
export const InADialog: StoryObj = {
    name: 'In a dialog',
    render: () => (
        <DialogShell
            open
            onOpenChange={() => undefined}
            title={
                <ItemHeading
                    name="Worker"
                    code="worker"
                    size="dialog"
                    as="div"
                    glyph={<Server />}
                    chips={<StatusChip status="running" />}
                />
            }
            confirm={{ label: 'Restart', onConfirm: () => undefined }}
        >
            <p className="text-sm text-muted-foreground">
                Restarting the worker cancels the runs it holds; the scheduler queues them again.
            </p>
        </DialogShell>
    ),
}
