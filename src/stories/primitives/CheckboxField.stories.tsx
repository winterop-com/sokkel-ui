import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CheckboxField, CheckboxList } from '@winterop-com/sokkel-ui/CheckboxField'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Inputs/Checkbox field', parameters: { frame: 'column' } }
export default meta

/** A box with its label: the whole row ticks it. */
export const Plain: StoryObj = {
    render: function Render() {
        const [notify, setNotify] = useState(true)
        return (
            <Stack gap="2xs" className="max-w-md">
                <CheckboxField label="Tell ada when it finishes" checked={notify} onCheckedChange={setNotify} />
                <CheckboxField label="Run it again tomorrow" defaultChecked={false} />
                <CheckboxField label="Skip the notify step" disabled />
            </Stack>
        )
    },
}

/** A titled group of boxes, each with a line saying what it brings in. */
export const List: StoryObj = {
    render: function Render() {
        const [include, setInclude] = useState({ runs: true, logs: true, artifacts: false })
        return (
            <CheckboxList label="Include" className="max-w-md">
                <CheckboxField
                    label="Runs"
                    description="Every run of nightly-export in the period, with its state."
                    checked={include.runs}
                    onCheckedChange={(runs) => setInclude({ ...include, runs })}
                />
                <CheckboxField
                    label="Logs"
                    description="The log lines of each run, up to 10,000 a run."
                    checked={include.logs}
                    onCheckedChange={(logs) => setInclude({ ...include, logs })}
                />
                <CheckboxField
                    label="Artifacts"
                    description="Files the upload step wrote, as links."
                    checked={include.artifacts}
                    onCheckedChange={(artifacts) => setInclude({ ...include, artifacts })}
                />
            </CheckboxList>
        )
    },
}

/** Calendar toggles: each box with its calendar's color dot, the label quiet while the calendar is hidden. */
export const Colored: StoryObj = {
    render: function Render() {
        const [shown, setShown] = useState(['runs', 'releases'])
        const toggle = (id: string) => (on: boolean) => setShown((now) => (on ? [...now, id] : now.filter((each) => each !== id)))
        return (
            <Stack gap="2xs" className="max-w-xs">
                <CheckboxField
                    label="Runs"
                    dot="blue"
                    quiet="unchecked"
                    checked={shown.includes('runs')}
                    onCheckedChange={toggle('runs')}
                />
                <CheckboxField
                    label="Releases"
                    dot="violet"
                    quiet="unchecked"
                    checked={shown.includes('releases')}
                    onCheckedChange={toggle('releases')}
                />
                <CheckboxField
                    label="On call"
                    dot="green"
                    quiet="unchecked"
                    checked={shown.includes('call')}
                    onCheckedChange={toggle('call')}
                />
            </Stack>
        )
    },
}

/** A checklist: a done step's label struck through and quiet. */
export const Steps: StoryObj = {
    render: function Render() {
        const [done, setDone] = useState(['fetch'])
        const toggle = (id: string) => (on: boolean) => setDone((now) => (on ? [...now, id] : now.filter((each) => each !== id)))
        return (
            <Stack gap="2xs" className="max-w-md">
                {['fetch', 'transform', 'validate'].map((step) => (
                    <CheckboxField key={step} label={step} quiet="checked" checked={done.includes(step)} onCheckedChange={toggle(step)} />
                ))}
            </Stack>
        )
    },
}

/** The acknowledgement a destructive step waits on, framed in the critical tone. */
export const Critical: StoryObj = {
    render: function Render() {
        const [understood, setUnderstood] = useState(false)
        return (
            <CheckboxField
                tone="critical"
                className="max-w-md"
                label="I understand that the runs of harbor are deleted for good."
                checked={understood}
                onCheckedChange={setUnderstood}
            />
        )
    },
}
