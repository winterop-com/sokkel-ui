import type { Meta, StoryObj } from '@storybook/react-vite'

import { Callout } from '@winterop-com/sokkel-ui/Callout'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Surface, type SurfaceTone } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'

/** A bordered surface with no heading of its own, in its three grounds. */
const meta: Meta = { title: 'Patterns/Surface' }
export default meta

const FACTS = [
    { term: 'Job', value: 'sync-inventory' },
    { term: 'Project', value: 'harbor' },
    { term: 'Service', value: 'worker' },
]

/** The card raised on its own ground, a well on a panel's ground and an inset on the page's, each with its edge. */
export const Tones: StoryObj = {
    render: () => (
        <Stack gap="lg" className="min-h-svh bg-background p-6 text-foreground">
            <Columns gap="lg" count={3}>
                {(['card', 'well', 'inset'] as SurfaceTone[]).map((tone) => (
                    <Surface key={tone} tone={tone} pad>
                        <Stack gap="sm">
                            <p className="text-sm font-medium">{tone}</p>
                            <DescriptionList items={FACTS} />
                        </Stack>
                    </Surface>
                ))}
            </Columns>
        </Stack>
    ),
}

/**
 * The connection sync-inventory reads from, its fields in a well inside a card. The surface clips
 * nothing, so a focused field's ring shows whole at the well's edge.
 */
export const Connection: StoryObj = {
    render: () => (
        <Stack gap="lg" className="min-h-svh bg-background p-6 text-foreground">
            <Surface pad className="max-w-2xl">
                <Stack gap="md">
                    <p className="text-sm font-medium">Connection for sync-inventory</p>
                    <Callout tone="neutral" icon={false}>
                        The worker reads stock levels from this host every 15 minutes.
                    </Callout>
                    <Surface tone="well" pad>
                        <Stack gap="md">
                            <Field id="connection-host" label="Host">
                                <Input id="connection-host" defaultValue="https://inventory.example.org" />
                            </Field>
                            <Field id="connection-user" label="User" hint="read-only">
                                <Input id="connection-user" defaultValue="grace" />
                            </Field>
                        </Stack>
                    </Surface>
                    <Surface tone="inset" pad>
                        <DescriptionList items={[...FACTS, { term: 'Last sync', value: '14 minutes ago' }]} />
                    </Surface>
                    <div>
                        <Button variant="outline">Test connection</Button>
                    </div>
                </Stack>
            </Surface>
        </Stack>
    ),
}
