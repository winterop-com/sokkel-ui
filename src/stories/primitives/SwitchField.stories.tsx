import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'

const meta: Meta = { title: 'Primitives/Inputs/Switch field', parameters: { frame: 'column' } }
export default meta

/** Settings of a job: a press anywhere on a row turns its switch, and a help mark says what one does. */
export const Plain: StoryObj = {
    render: function Render() {
        const [schedule, setSchedule] = useState(true)
        return (
            <Stack gap="2xs" className="max-w-md">
                <SwitchField id="sf-schedule" label="Run nightly-export on its schedule" checked={schedule} onCheckedChange={setSchedule} />
                <SwitchField
                    id="sf-notify"
                    label="Tell grace when a run fails"
                    explain="One message per failed run, sent from the notify step."
                    defaultChecked
                />
                <SwitchField id="sf-retry" label="Retry a failed step once" />
            </Stack>
        )
    },
}

/** Settings that cannot be changed now: each switch disabled, with why in place of the help mark. */
export const Reason: StoryObj = {
    render: () => (
        <Stack gap="2xs" className="max-w-md">
            <SwitchField id="sr-schedule" label="Run sync-inventory on its schedule" defaultChecked />
            <SwitchField
                id="sr-worker"
                label="Run on the worker service"
                explain="Steps run on the worker rather than the api service."
                reason="The scheduler holds every job on the worker while it is upgraded."
                defaultChecked
            />
            <SwitchField id="sr-delete" label="Delete runs after 30 days" reason="Only an owner of sync-inventory can change this." />
        </Stack>
    ),
}
