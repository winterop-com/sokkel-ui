import type { Meta, StoryObj } from '@storybook/react-vite'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { Field } from '../../components/Field'
import { NavBar } from '../../components/NavBar'
import { Section } from '../../components/Section'
import { Segmented } from '../../components/Segmented'
import { SwitchField } from '../../components/SwitchField'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * An app with few places, framed by the navbar along the top instead of a rail: a settings page of
 * boxed sections, each with its fields and the one verb that saves it.
 */
function SettingsApp() {
    const [dark, setDark] = useState(true)
    const [scheme, setScheme] = useState<'system' | 'light' | 'dark'>('system')
    const [clock, setClock] = useState<'utc' | 'local'>('utc')
    const [density, setDensity] = useState<'regular' | 'compact'>('regular')
    return (
        <TooltipProvider>
            <div className="flex h-svh flex-col bg-background text-foreground">
                <NavBar
                    mark="H"
                    name="harbor"
                    links={[
                        { id: 'overview', label: 'Overview', href: '#' },
                        { id: 'projects', label: 'Projects', href: '#' },
                        { id: 'people', label: 'People', href: '#' },
                        { id: 'settings', label: 'Settings', href: '#', active: true },
                    ]}
                    end={
                        <>
                            <Button variant="ghost" size="icon-sm" aria-label="Search">
                                <Search aria-hidden />
                            </Button>
                            <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
                            <span className="ml-1 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                G
                            </span>
                        </>
                    }
                />
                <main className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
                        <h1 className="text-page font-semibold">Settings</h1>
                        <Section title="Appearance">
                            <div className="flex flex-col gap-4">
                                <div className="flex w-full max-w-80 flex-col gap-1.5">
                                    <span className="text-sm font-medium">Scheme</span>
                                    <Segmented
                                        fill
                                        label="Scheme"
                                        value={scheme}
                                        onChoose={setScheme}
                                        options={[
                                            { value: 'system', label: 'System' },
                                            { value: 'light', label: 'Light' },
                                            { value: 'dark', label: 'Dark' },
                                        ]}
                                    />
                                </div>
                                <div className="flex w-full max-w-80 flex-col gap-1.5">
                                    <span className="text-sm font-medium">Density</span>
                                    <Segmented
                                        fill
                                        label="Density"
                                        value={density}
                                        onChoose={setDensity}
                                        options={[
                                            { value: 'regular', label: 'Regular' },
                                            { value: 'compact', label: 'Compact' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </Section>
                        <Section title="Workspace" actions={<Button size="sm">Save</Button>}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field id="name" label="Name">
                                    <Input id="name" defaultValue="Harbor" />
                                </Field>
                                <Field id="url" label="Address" hint="base_url" keyHint>
                                    <Input id="url" className="font-mono" defaultValue="https://harbor.example.org" />
                                </Field>
                                <div className="flex w-full flex-col gap-1.5">
                                    <span className="text-sm font-medium">Schedule clock</span>
                                    <Segmented
                                        fill
                                        label="Schedule clock"
                                        value={clock}
                                        onChoose={setClock}
                                        options={[
                                            { value: 'utc', label: 'UTC' },
                                            { value: 'local', label: 'Server time' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </Section>
                        <Section title="Notifications">
                            <div className="flex flex-col gap-3">
                                <SwitchField
                                    id="failures"
                                    label="Email me when a job fails"
                                    explain="One email per failed run, sent to your address."
                                    defaultChecked
                                />
                                <SwitchField
                                    id="digest"
                                    label="Weekly digest"
                                    explain="A summary of the week's runs every Monday morning."
                                />
                            </div>
                        </Section>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Settings' }
export default meta

export const WithNavBar: StoryObj = { name: 'Settings under a navbar', render: () => <SettingsApp /> }
