/** A forms-only app: Tidevann's job settings page and the dialog that creates a job, with no chart, map, graph or editor. */

import '@winterop-com/sokkel-ui/styles.css'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { CheckboxField } from '@winterop-com/sokkel-ui/CheckboxField'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { SchemaForm, SchemaIssueCount, useSchemaForm } from '@winterop-com/sokkel-ui/schema/SchemaForm'
import { ListChecks, Settings } from 'lucide-react'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#', active: true },
            { id: 'settings', label: 'Settings', icon: Settings, href: '#' },
        ],
    },
]

const JOB: JsonSchema = {
    type: 'object',
    required: ['code', 'name', 'schedule'],
    properties: {
        code: { type: 'string', title: 'Code', pattern: '^[a-z][a-z0-9-]*$', maxLength: 40 },
        name: { type: 'string', title: 'Name', maxLength: 64 },
        endpoint: { type: 'string', title: 'Endpoint', format: 'uri' },
        schedule: { type: 'string', title: 'Schedule', description: 'Five cron fields, in UTC.' },
        timeout: { type: 'integer', title: 'Timeout', minimum: 1, maximum: 3600 },
        priority: { type: 'string', title: 'Priority', enum: ['low', 'normal', 'high'], default: 'normal' },
        paused: { type: 'boolean', title: 'Paused' },
    },
}

function NewJob({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const form = useSchemaForm(JOB, { initial: { code: 'send-digest', name: 'Send digest', schedule: '0 7 * * 1-5' } })
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="New job"
            count={<SchemaIssueCount form={form} />}
            confirm={{
                label: 'Create',
                onConfirm: () => {
                    if (form.submit()) onOpenChange(false)
                },
            }}
        >
            <SchemaForm form={form} />
        </DialogShell>
    )
}

function App() {
    const [name, setName] = useState('Import orders')
    const [retries, setRetries] = useState(3)
    const [history, setHistory] = useState('30')
    const [creating, setCreating] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail name="Tidevann" groups={GROUPS} foot={<AccountMenu name="ada" where="tidevann.example.org" />} />}
                top={<TopBar trail={[{ label: 'Jobs', href: '#' }, { label: 'import-orders' }]} />}
            >
                <Page>
                    <PageHeader title="import-orders" description="Loads the monthly orders file into the warehouse." />
                    <Stack gap="lg">
                        <Section title="Job">
                            <Stack gap="lg">
                                <TextField id="name" label="Name" value={name} onChange={setName} />
                                <TextField id="description" label="Description" multiline rows={3} />
                                <SliderField id="retries" label="Retries" value={retries} onChange={setRetries} max={10} />
                                <Segmented
                                    label="Run history"
                                    value={history}
                                    onChoose={setHistory}
                                    options={[
                                        { value: '30', label: '30 days' },
                                        { value: '90', label: '90 days' },
                                    ]}
                                />
                                <SwitchField id="paused" label="Paused" explain="A paused job keeps its schedule and does not run." />
                                <CheckboxField label="Notify grace when a run fails" defaultChecked />
                            </Stack>
                        </Section>
                        <FormBar>
                            <Button variant="ghost" onClick={() => setCreating(true)}>
                                New job
                            </Button>
                            <Button>Save</Button>
                        </FormBar>
                    </Stack>
                    <NewJob open={creating} onOpenChange={setCreating} />
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element')
createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
