import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

const meta: Meta = { title: 'Patterns/Form bar' }
export default meta

/** A short form closed by its actions, Create last. */
export const End: StoryObj = {
    parameters: { frame: 'column' },
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <TextField id="end-name" label="Name" defaultValue="Send digest" />
            <TextField id="end-code" label="Code" mono defaultValue="send-digest" />
            <FormBar placement="end">
                <Button variant="ghost">Cancel</Button>
                <Button>Create</Button>
            </FormBar>
        </Stack>
    ),
}

/** A long form's bar at the foot of the page: when the draft was saved, the form's issues, and its verbs. */
export const Foot: StoryObj = {
    render: function Render() {
        const [levelOpen, setLevelOpen] = useState(false)
        return (
            <TooltipProvider>
                <Stack gap="none" className="h-svh bg-background text-foreground">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <Stack gap="none" className="min-h-full">
                            <Stack gap="lg" className="max-w-md flex-1 p-6">
                                <TextField id="foot-site" label="Site" defaultValue="Harbor gauge 3" />
                                <TextField
                                    id="foot-level"
                                    label="Water level"
                                    hint="cm"
                                    error="Enter the level as a number."
                                    issueOpen={levelOpen}
                                    onIssueOpenChange={setLevelOpen}
                                    defaultValue="about 40"
                                />
                                <TextField id="foot-notes" label="Notes" multiline rows={4} />
                            </Stack>
                            <FormBar note="Draft saved at 09:52">
                                <IssueCount
                                    critical={1}
                                    list={[
                                        {
                                            label: 'Water level',
                                            issue: { tone: 'critical', text: 'Enter the level as a number.' },
                                            onGo: () => setLevelOpen(true),
                                        },
                                    ]}
                                />
                                <Button size="sm" variant="ghost">
                                    Cancel
                                </Button>
                                <Button size="sm" variant="outline">
                                    Save draft
                                </Button>
                                <Button size="sm" disabled>
                                    Submit
                                </Button>
                            </FormBar>
                        </Stack>
                    </div>
                </Stack>
            </TooltipProvider>
        )
    },
}
