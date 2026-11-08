import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SaveBar } from '@winterop-com/sokkel-ui/SaveBar'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useUnsavedChanges } from '@winterop-com/sokkel-ui/UnsavedChanges'
import { Tabs, TabsList, TabsTrigger } from '@winterop-com/sokkel-ui/primitives/tabs'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/**
 * A page that guards its unsaved changes: closing the tab or reloading asks through the browser's
 * own warning, and a move inside the app, here to another tab, asks first through
 * `confirmLeave`, as an app's router blocker would.
 */
const meta: Meta = { title: 'Patterns/Unsaved changes' }
export default meta

interface Settings {
    name: string
    schedule: string
    timeout: string
}

const SAVED: Settings = { name: 'Nightly export', schedule: '0 2 * * *', timeout: '900' }
const EDITED: Settings = { name: 'Nightly export to harbor', schedule: '0 3 * * *', timeout: '900' }

function GuardedPage({ asking = false }: { asking?: boolean }) {
    const [saved, setSaved] = useState(SAVED)
    const [draft, setDraft] = useState(EDITED)
    const [tab, setTab] = useState('settings')
    const count = (Object.keys(draft) as (keyof Settings)[]).filter((key) => draft[key] !== saved[key]).length
    const leave = useUnsavedChanges(count > 0, { defaultAsking: asking })
    const go = async (next: string) => {
        // The app's router asks the guard before it moves; on Leave the page's changes go with it.
        if (!(await leave.confirmLeave())) return
        setDraft(saved)
        setTab(next)
    }
    return (
        <TooltipProvider>
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <Stack gap="none" className="min-h-full">
                        <Page className="flex-1">
                            <PageHeader title="Nightly export" code="nightly-export" />
                            <Tabs value={tab} onValueChange={(next: string) => void go(next)}>
                                <TabsList variant="line">
                                    <TabsTrigger value="settings">Settings</TabsTrigger>
                                    <TabsTrigger value="runs">Runs</TabsTrigger>
                                    <TabsTrigger value="files">Files</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            {tab === 'settings' ? (
                                <Stack gap="lg" className="max-w-md">
                                    <TextField
                                        id="guard-name"
                                        label="Name"
                                        value={draft.name}
                                        onChange={(name) => setDraft({ ...draft, name })}
                                    />
                                    <TextField
                                        id="guard-schedule"
                                        label="Schedule"
                                        hint="cron"
                                        mono
                                        value={draft.schedule}
                                        onChange={(schedule) => setDraft({ ...draft, schedule })}
                                    />
                                    <TextField
                                        id="guard-timeout"
                                        label="Timeout"
                                        hint="seconds"
                                        mono
                                        value={draft.timeout}
                                        onChange={(timeout) => setDraft({ ...draft, timeout })}
                                    />
                                </Stack>
                            ) : (
                                <p className="text-sm text-muted-foreground">The {tab} of nightly-export.</p>
                            )}
                        </Page>
                        <SaveBar count={count} onSave={() => setSaved(draft)} onDiscard={() => setDraft(saved)} />
                    </Stack>
                </div>
                {leave.dialog}
            </Stack>
        </TooltipProvider>
    )
}

/** Two settings changed and not saved: the save bar counts them, and moving to another tab asks first. */
export const Edited: StoryObj = { render: () => <GuardedPage /> }

/** Another tab pressed with the changes unsaved: Stay keeps the page and its changes, Leave goes on without them. */
export const Leaving: StoryObj = { render: () => <GuardedPage asking /> }
