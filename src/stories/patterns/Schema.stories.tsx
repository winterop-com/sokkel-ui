import type { Meta, StoryObj } from '@storybook/react-vite'

import { IOCard } from '../../components/schema/IOCard'
import { SchemaView } from '../../components/schema/SchemaView'
import { StatusChip } from '../../components/StatusChip'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import type { JsonSchema } from '../../components/schema/read'
import { Section } from '../../components/Section'

/**
 * JSON Schemas read as field lists: a job's settings with defaults and rules, and an order with
 * nested objects, a list of line items and a shared definition.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="flex flex-col gap-6">{children}</div>
        </div>
    )
}

const JOB: JsonSchema = {
    type: 'object',
    required: ['code', 'schedule'],
    additionalProperties: false,
    properties: {
        code: { type: 'string', description: 'How the job is addressed.', pattern: '^[a-z][a-z0-9-]*$', maxLength: 64 },
        schedule: { type: 'string', description: 'When it runs, as a cron expression.', examples: ['0 2 * * *'] },
        timeout: { type: 'integer', description: 'Seconds before a run is stopped.', minimum: 1, maximum: 3600, default: 300 },
        retries: { type: 'integer', minimum: 0, maximum: 5, default: 2 },
        notify: { type: 'string', description: 'Who hears about a failure.', enum: ['owner', 'project', 'nobody'], default: 'owner' },
        endpoint: { type: ['string', 'null'], format: 'uri', description: 'Where the results are sent.' },
        legacy_mode: { type: 'boolean', deprecated: true, description: 'Kept for old jobs; use the new runner.' },
    },
}

const ORDER: JsonSchema = {
    type: 'object',
    required: ['id', 'customer', 'lines'],
    $defs: {
        Address: {
            type: 'object',
            required: ['city', 'country'],
            properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string', description: 'Two letters, ISO 3166.', minLength: 2, maxLength: 2 },
            },
        },
    },
    properties: {
        id: { type: 'string', readOnly: true, description: 'Assigned when the order is created.' },
        customer: {
            type: 'object',
            required: ['email'],
            properties: {
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                ship_to: { $ref: '#/$defs/Address' },
            },
        },
        lines: {
            type: 'array',
            minItems: 1,
            description: 'What was ordered.',
            items: {
                type: 'object',
                required: ['sku', 'quantity'],
                properties: {
                    sku: { type: 'string' },
                    quantity: { type: 'integer', minimum: 1 },
                    amount: { type: 'string', pattern: '^[0-9]+[.][0-9]{2}$', description: 'Price per unit, written like 12.50.' },
                },
            },
        },
        currency: { type: 'string', const: 'EUR' },
    },
}

const meta: Meta = { title: 'Patterns/Schema' }
export default meta

export const Flat: StoryObj = {
    name: 'Settings',
    render: () => (
        <Ground>
            <Section title="Job settings" flush>
                <div className="px-3">
                    <SchemaView schema={JOB} />
                </div>
            </Section>
        </Ground>
    ),
}

export const Nested: StoryObj = {
    name: 'Nested',
    render: () => (
        <Ground>
            <Section title="Order" flush>
                <div className="px-3">
                    <SchemaView schema={ORDER} open={2} />
                </div>
            </Section>
        </Ground>
    ),
}

const VALIDATE_IN: JsonSchema = {
    type: 'object',
    required: ['rows'],
    properties: {
        rows: { type: 'array', description: 'The rows read by the step before.', items: { $ref: '#/$defs/Order' } },
        strict: { type: 'boolean', default: false, description: 'Fail on the first bad row instead of collecting them.' },
    },
    $defs: {
        Order: {
            type: 'object',
            required: ['sku', 'amount'],
            properties: { sku: { type: 'string' }, amount: { type: 'string', pattern: '^[0-9]+[.][0-9]{2}$' } },
        },
    },
}

const VALIDATE_OUT: JsonSchema = {
    type: 'object',
    required: ['accepted', 'rejected'],
    properties: {
        accepted: { type: 'integer', minimum: 0, description: 'Rows that passed.' },
        rejected: {
            type: 'array',
            description: 'Rows that failed, with why.',
            items: {
                type: 'object',
                required: ['row', 'field', 'problem'],
                properties: { row: { type: 'integer' }, field: { type: 'string' }, problem: { type: 'string' } },
            },
        },
    },
}

/** A step's input and output as JSON Schemas, with a filled-in example on each side. */
export const InputOutput: StoryObj = {
    name: 'Input and output',
    render: () => (
        <Ground>
            <IOCard
                title="Validate orders"
                code="validate"
                description="Checks each order row against the rules and splits them into accepted and rejected."
                status={<StatusChip status="failed" label="failed in the last run" />}
                menu={
                    <>
                        <DropdownMenuItem>Open the step</DropdownMenuItem>
                        <DropdownMenuItem>Copy the schemas</DropdownMenuItem>
                    </>
                }
                input={{ schema: VALIDATE_IN, example: { rows: [{ sku: 'A-20431', amount: '12.50' }], strict: false } }}
                output={{
                    schema: VALIDATE_OUT,
                    example: { accepted: 2147, rejected: [{ row: 112, field: 'amount', problem: 'not a number' }] },
                }}
            />
            <IOCard
                code="send-digest"
                description="Takes nothing and sends the weekly digest."
                output={{ schema: { type: 'object', properties: { sent: { type: 'integer', description: 'How many emails went out.' } } } }}
            />
        </Ground>
    ),
}
