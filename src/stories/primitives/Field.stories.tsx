import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldTitle,
} from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../../components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex w-full max-w-sm flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Field' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-8">
                <Labeled label="vertical">
                    <Field>
                        <FieldLabel htmlFor="f-code">Code</FieldLabel>
                        <Input id="f-code" defaultValue="import-orders" />
                        <FieldDescription>Lowercase letters, digits and dashes.</FieldDescription>
                    </Field>
                </Labeled>
                <Labeled label="horizontal">
                    <Field orientation="horizontal">
                        <Checkbox id="f-notify" defaultChecked />
                        <FieldLabel htmlFor="f-notify">Notify on failure</FieldLabel>
                    </Field>
                </Labeled>
                <Labeled label="horizontal with content">
                    <Field orientation="horizontal">
                        <FieldContent>
                            <FieldLabel htmlFor="f-paused">Paused</FieldLabel>
                            <FieldDescription>Schedules stay in place but start no runs.</FieldDescription>
                        </FieldContent>
                        <Switch id="f-paused" />
                    </Field>
                </Labeled>
                <Labeled label="responsive">
                    <FieldGroup>
                        <Field orientation="responsive">
                            <FieldContent>
                                <FieldLabel htmlFor="f-retries">Retries</FieldLabel>
                                <FieldDescription>Per step, before the run fails.</FieldDescription>
                            </FieldContent>
                            <Input id="f-retries" type="number" defaultValue={3} className="md:w-24" />
                        </Field>
                    </FieldGroup>
                </Labeled>
                <Labeled label="fieldset with legend">
                    <FieldSet>
                        <FieldLegend>Run when</FieldLegend>
                        <FieldDescription>Pick what starts this job.</FieldDescription>
                        <RadioGroup defaultValue="schedule">
                            <Field orientation="horizontal">
                                <RadioGroupItem id="f-schedule" value="schedule" />
                                <FieldLabel htmlFor="f-schedule">On a schedule</FieldLabel>
                            </Field>
                            <Field orientation="horizontal">
                                <RadioGroupItem id="f-webhook" value="webhook" />
                                <FieldLabel htmlFor="f-webhook">On a webhook</FieldLabel>
                            </Field>
                        </RadioGroup>
                    </FieldSet>
                </Labeled>
                <Labeled label="choice card">
                    <FieldLabel htmlFor="f-card">
                        <Field orientation="horizontal">
                            <FieldContent>
                                <FieldTitle>Keep run outputs</FieldTitle>
                                <FieldDescription>Store each step's output for 30 days.</FieldDescription>
                            </FieldContent>
                            <Checkbox id="f-card" defaultChecked />
                        </Field>
                    </FieldLabel>
                </Labeled>
                <Labeled label="separator">
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="f-a">Name</FieldLabel>
                            <Input id="f-a" defaultValue="Import orders" />
                        </Field>
                        <FieldSeparator>or</FieldSeparator>
                        <Field>
                            <FieldLabel htmlFor="f-b">Copy from</FieldLabel>
                            <Input id="f-b" placeholder="A job code" />
                        </Field>
                    </FieldGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-8">
                <Labeled label="invalid">
                    <Field data-invalid="true">
                        <FieldLabel htmlFor="s-code">Code</FieldLabel>
                        <Input id="s-code" aria-invalid defaultValue="Import Orders" />
                        <FieldError>Use lowercase letters, digits and dashes.</FieldError>
                    </Field>
                </Labeled>
                <Labeled label="several errors">
                    <Field data-invalid="true">
                        <FieldLabel htmlFor="s-url">Base URL</FieldLabel>
                        <Input id="s-url" aria-invalid defaultValue="api.example" />
                        <FieldError errors={[{ message: 'Start with https://.' }, { message: 'Name a full host.' }]} />
                    </Field>
                </Labeled>
                <Labeled label="disabled">
                    <Field data-disabled="true">
                        <FieldLabel htmlFor="s-dis">Code</FieldLabel>
                        <Input id="s-dis" disabled defaultValue="import-orders" />
                        <FieldDescription>A code cannot change once runs exist.</FieldDescription>
                    </Field>
                </Labeled>
            </div>
        </Ground>
    ),
}

const AUTH_KINDS = [
    { value: 'none', label: 'None' },
    { value: 'basic', label: 'Basic' },
    { value: 'token', label: 'Personal access token' },
    { value: 'oauth2', label: 'OAuth 2 client credentials' },
]

function ServiceFormDemo() {
    const [code, setCode] = useState('orders-api')
    const [auth, setAuth] = useState<string | null>('token')
    const codeOk = /^[a-z0-9][a-z0-9-]*$/.test(code)
    return (
        <Ground>
            <form className="flex max-w-lg flex-col gap-6 rounded-lg border border-border p-5" onSubmit={(event) => event.preventDefault()}>
                <FieldSet>
                    <FieldLegend>New service</FieldLegend>
                    <FieldDescription>Jobs reach an outside system through a service.</FieldDescription>
                    <FieldGroup>
                        <Field data-invalid={!codeOk}>
                            <FieldLabel htmlFor="c-code">Code</FieldLabel>
                            <Input
                                id="c-code"
                                className="font-mono"
                                value={code}
                                aria-invalid={!codeOk}
                                onChange={(event) => setCode(event.target.value)}
                            />
                            {codeOk ? (
                                <FieldDescription>What jobs name this service by.</FieldDescription>
                            ) : (
                                <FieldError>Use lowercase letters, digits and dashes.</FieldError>
                            )}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="c-name">Name</FieldLabel>
                            <Input id="c-name" defaultValue="Orders API" />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="c-url">Base URL</FieldLabel>
                            <Input id="c-url" type="url" defaultValue="https://api.example.org" />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="c-auth">Auth kind</FieldLabel>
                            <Select items={AUTH_KINDS} value={auth} onValueChange={setAuth}>
                                <SelectTrigger id="c-auth" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AUTH_KINDS.map((kind) => (
                                        <SelectItem key={kind.value} value={kind.value}>
                                            {kind.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor="c-tls">Verify TLS</FieldLabel>
                                <FieldDescription>Refuse a server whose certificate does not check out.</FieldDescription>
                            </FieldContent>
                            <Switch id="c-tls" defaultChecked />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="c-timeout">Timeout</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id="c-timeout" defaultValue="30s" />
                                <InputGroupAddon align="inline-end">
                                    <InputGroupText>per request</InputGroupText>
                                </InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>A duration, such as 30s or 2m.</FieldDescription>
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" type="button">
                        Test connection
                    </Button>
                    <Button type="submit" disabled={!codeOk}>
                        Create
                    </Button>
                </div>
            </form>
        </Ground>
    )
}

export const ServiceForm: StoryObj = { render: () => <ServiceFormDemo /> }
