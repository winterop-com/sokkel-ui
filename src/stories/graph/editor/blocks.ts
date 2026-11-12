import {
    CloudUpload,
    Combine,
    CopyMinus,
    Database,
    FileDown,
    FileSpreadsheet,
    Funnel,
    Globe,
    ListChecks,
    Mail,
    ShieldCheck,
    TableProperties,
} from 'lucide-react'

import type { BlockGroup, PipelineBlock } from '@winterop-com/sokkel-ui-graph/blocks'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'

/** What passes along an edge of the Tidevann pipelines. */
export type Data = 'records' | 'files'

/** A block of Tidevann's: what it takes in, what it gives on, its settings, and the code a new step of it starts from. */
export interface BlockSpec extends PipelineBlock {
    /** What it takes in; empty for a source, which takes nothing. */
    accepts: Data[]
    /** What it gives on; none for an output, which ends a branch. */
    produces?: Data
    schema: JsonSchema
    prefix: string
}

export const GROUPS: BlockGroup[] = [
    { id: 'source', label: 'Sources' },
    { id: 'transform', label: 'Transforms' },
    { id: 'check', label: 'Checks' },
    { id: 'output', label: 'Outputs' },
]

export const BLOCKS: BlockSpec[] = [
    {
        kind: 'http.get',
        name: 'HTTP request',
        description: 'Fetch records from a JSON endpoint.',
        group: 'source',
        icon: Globe,
        accepts: [],
        produces: 'records',
        prefix: 'fetch',
        schema: {
            type: 'object',
            required: ['url'],
            properties: {
                url: {
                    type: 'string',
                    title: 'Address',
                    format: 'uri',
                    description: 'The endpoint, as in https://api.example.org/orders.',
                },
                timeout: { type: 'string', title: 'Timeout', default: '30s', description: 'How long to wait, as in 30s or 2m.' },
            },
        },
    },
    {
        kind: 'csv.read',
        name: 'Read CSV',
        badge: 'legacy',
        description: 'Read records from a CSV file in storage.',
        group: 'source',
        icon: FileSpreadsheet,
        accepts: [],
        produces: 'records',
        prefix: 'read',
        schema: {
            type: 'object',
            required: ['path'],
            properties: {
                path: { type: 'string', title: 'Path' },
                delimiter: { type: 'string', title: 'Delimiter', enum: [',', ';', 'tab'], default: ',' },
            },
        },
    },
    {
        kind: 'sql.query',
        name: 'SQL query',
        badge: { label: 'database', hue: 2, title: 'Reads from a database' },
        description: 'Run a query and pass on its rows as records.',
        group: 'source',
        icon: Database,
        accepts: [],
        produces: 'records',
        prefix: 'query',
        schema: {
            type: 'object',
            required: ['connection', 'query'],
            properties: {
                connection: { type: 'string', title: 'Connection', enum: ['warehouse', 'replica'] },
                query: { type: 'string', title: 'Query' },
            },
        },
    },
    {
        kind: 'join',
        name: 'Join',
        description: 'Join two or more inputs on a shared key.',
        group: 'transform',
        icon: Combine,
        accepts: ['records'],
        produces: 'records',
        prefix: 'join',
        schema: {
            type: 'object',
            required: ['on'],
            properties: { on: { type: 'string', title: 'Key', description: 'The field the inputs share.' } },
        },
    },
    {
        kind: 'dedupe',
        name: 'Remove duplicates',
        badge: { label: 'new', tone: 'info', title: 'Added in this version' },
        description: 'Keep the first record of each key.',
        group: 'transform',
        icon: CopyMinus,
        accepts: ['records'],
        produces: 'records',
        prefix: 'dedupe',
        schema: {
            type: 'object',
            required: ['keys'],
            properties: { keys: { type: 'array', title: 'Keys', items: { type: 'string' }, minItems: 1 } },
        },
    },
    {
        kind: 'filter.rows',
        name: 'Filter rows',
        description: 'Keep the records that match a condition.',
        group: 'transform',
        icon: Funnel,
        accepts: ['records'],
        produces: 'records',
        prefix: 'filter',
        schema: {
            type: 'object',
            required: ['where'],
            properties: { where: { type: 'string', title: 'Condition', description: 'As in status = "open".' } },
        },
    },
    {
        kind: 'csv.write',
        name: 'Write CSV',
        description: 'Write records to a CSV file.',
        group: 'transform',
        icon: FileDown,
        accepts: ['records'],
        produces: 'files',
        prefix: 'write',
        schema: {
            type: 'object',
            required: ['path'],
            properties: { path: { type: 'string', title: 'Path' }, header: { type: 'boolean', title: 'Header row', default: true } },
        },
    },
    {
        kind: 'validate.schema',
        name: 'Validate',
        description: 'Check every record against a JSON Schema.',
        group: 'check',
        icon: ShieldCheck,
        accepts: ['records'],
        produces: 'records',
        prefix: 'validate',
        schema: {
            type: 'object',
            required: ['schema'],
            properties: {
                schema: { type: 'string', title: 'Schema', format: 'uri' },
                on_error: { type: 'string', title: 'On a bad record', enum: ['fail', 'skip', 'warn'], default: 'fail' },
            },
        },
    },
    {
        kind: 'check.rows',
        name: 'Row count',
        description: 'Stop the run when too few records arrive.',
        group: 'check',
        icon: ListChecks,
        accepts: ['records'],
        produces: 'records',
        prefix: 'check',
        schema: {
            type: 'object',
            properties: { min: { type: 'integer', title: 'At least', minimum: 0, default: 1 } },
        },
    },
    {
        kind: 'upload.s3',
        name: 'Upload',
        badge: { label: 'storage', hue: 4, title: 'Writes to a storage bucket' },
        description: 'Upload a file to a storage bucket.',
        group: 'output',
        icon: CloudUpload,
        accepts: ['files'],
        prefix: 'upload',
        schema: {
            type: 'object',
            required: ['bucket'],
            properties: { bucket: { type: 'string', title: 'Bucket' }, prefix: { type: 'string', title: 'Prefix' } },
        },
    },
    {
        kind: 'sql.insert',
        name: 'Insert rows',
        badge: { label: 'beta', tone: 'warning', title: 'Its settings may still change' },
        description: 'Insert records into a table.',
        group: 'output',
        icon: TableProperties,
        accepts: ['records'],
        prefix: 'insert',
        schema: {
            type: 'object',
            required: ['table'],
            properties: {
                table: { type: 'string', title: 'Table' },
                mode: { type: 'string', title: 'Mode', enum: ['append', 'replace'], default: 'append' },
            },
        },
    },
    {
        kind: 'notify.email',
        name: 'Send email',
        description: 'Email a summary of what arrived.',
        group: 'output',
        icon: Mail,
        accepts: ['records', 'files'],
        prefix: 'notify',
        schema: {
            type: 'object',
            required: ['to'],
            properties: {
                to: { type: 'array', title: 'To', items: { type: 'string', format: 'email' }, minItems: 1 },
                subject: { type: 'string', title: 'Subject' },
            },
        },
    },
]

export const BY_KIND = new Map(BLOCKS.map((block) => [block.kind, block]))

/** The block a step is made from. */
export function blockOf(kind: string | undefined): BlockSpec | undefined {
    return kind === undefined ? undefined : BY_KIND.get(kind)
}

/** Why a step of `next` cannot follow one of `previous`, or null when it can. */
export function cannotFollow(previous: BlockSpec, next: BlockSpec): string | null {
    if (previous.produces === undefined) return `${previous.kind} ends a branch and passes nothing on.`
    if (next.accepts.length === 0) return `${next.kind} is a source and takes no input.`
    if (!next.accepts.includes(previous.produces))
        return `${next.kind} takes ${next.accepts.join(' or ')}, and ${previous.kind} gives ${previous.produces}.`
    return null
}
