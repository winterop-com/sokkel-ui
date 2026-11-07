import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field as IssueField } from '@winterop-com/sokkel-ui/Field'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Checkbox } from '@winterop-com/sokkel-ui/primitives/checkbox'
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldTitle,
} from '@winterop-com/sokkel-ui/primitives/field'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@winterop-com/sokkel-ui/primitives/input-group'
import { RadioGroup, RadioGroupItem } from '@winterop-com/sokkel-ui/primitives/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Inputs/Field', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="2xl" align="stretch" wrap>
            <Specimen className="w-full max-w-sm" label="vertical">
                <Field>
                    <FieldLabel htmlFor="f-code">Code</FieldLabel>
                    <Input id="f-code" defaultValue="import-orders" />
                    <FieldDescription>Lowercase letters, digits and dashes.</FieldDescription>
                </Field>
            </Specimen>
            <Specimen className="w-full max-w-sm" label="horizontal">
                <Field orientation="horizontal">
                    <Checkbox id="f-notify" defaultChecked />
                    <FieldLabel htmlFor="f-notify">Notify on failure</FieldLabel>
                </Field>
            </Specimen>
            <Specimen className="w-full max-w-sm" label="horizontal with content">
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldLabel htmlFor="f-paused">Paused</FieldLabel>
                        <FieldDescription>Schedules stay in place but start no runs.</FieldDescription>
                    </FieldContent>
                    <Switch id="f-paused" />
                </Field>
            </Specimen>
            <Specimen className="w-full max-w-sm" label="responsive">
                <FieldGroup>
                    <Field orientation="responsive">
                        <FieldContent>
                            <FieldLabel htmlFor="f-retries">Retries</FieldLabel>
                            <FieldDescription>Per step, before the run fails.</FieldDescription>
                        </FieldContent>
                        <Input id="f-retries" type="number" defaultValue={3} className="md:w-24" />
                    </Field>
                </FieldGroup>
            </Specimen>
            <Specimen className="w-full max-w-sm" label="fieldset with legend">
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
            </Specimen>
            <Specimen className="w-full max-w-sm" label="choice card">
                <FieldLabel htmlFor="f-card">
                    <Field orientation="horizontal">
                        <FieldContent>
                            <FieldTitle>Keep run outputs</FieldTitle>
                            <FieldDescription>Store each step's output for 30 days.</FieldDescription>
                        </FieldContent>
                        <Checkbox id="f-card" defaultChecked />
                    </Field>
                </FieldLabel>
            </Specimen>
            <Specimen className="w-full max-w-sm" label="separator">
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
            </Specimen>
        </Row>
    ),
}

/**
 * An invalid value is drawn by the library's Field with `error` or `issues`: the issue mark at the
 * control's end, so nothing is inserted under it. A disabled field keeps its description.
 */
export const States: StoryObj = {
    render: () => (
        <Row gap="2xl" align="stretch" wrap>
            <Specimen className="w-full max-w-sm" label="invalid">
                <IssueField id="s-code" label="Code" error="Use lowercase letters, digits and dashes." className="w-full">
                    <Input id="s-code" aria-invalid defaultValue="Import Orders" />
                </IssueField>
            </Specimen>
            <Specimen className="w-full max-w-sm" label="several errors">
                <IssueField
                    id="s-url"
                    label="Base URL"
                    issues={[
                        { tone: 'critical', text: 'Start with https://.' },
                        { tone: 'critical', text: 'Name a full host.' },
                    ]}
                    className="w-full"
                >
                    <Input id="s-url" aria-invalid defaultValue="api.example" />
                </IssueField>
            </Specimen>
            <Specimen className="w-full max-w-sm" label="disabled">
                <Field data-disabled="true">
                    <FieldLabel htmlFor="s-dis">Code</FieldLabel>
                    <Input id="s-dis" disabled defaultValue="import-orders" />
                    <FieldDescription>A code cannot change once runs exist.</FieldDescription>
                </Field>
            </Specimen>
        </Row>
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
        <Stack onSubmit={(event) => event.preventDefault()} as="form" gap="xl" className="max-w-lg rounded-lg border border-border p-5">
            <FieldSet>
                <FieldLegend>New service</FieldLegend>
                <FieldDescription>Jobs reach an outside system through a service.</FieldDescription>
                <FieldGroup>
                    <IssueField
                        id="c-code"
                        label="Code"
                        help="What jobs name this service by."
                        error={codeOk ? null : 'Use lowercase letters, digits and dashes.'}
                    >
                        <Input
                            id="c-code"
                            className="font-mono"
                            value={code}
                            aria-invalid={!codeOk}
                            aria-describedby="c-code-help"
                            onChange={(event) => setCode(event.target.value)}
                        />
                    </IssueField>
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
            <Row align="stretch" justify="end" wrap>
                <Button variant="outline" type="button">
                    Test connection
                </Button>
                <Button type="submit" disabled={!codeOk}>
                    Create
                </Button>
            </Row>
        </Stack>
    )
}

export const ServiceForm: StoryObj = { render: () => <ServiceFormDemo /> }
