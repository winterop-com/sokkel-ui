import type { Meta, StoryObj } from '@storybook/react-vite'
import { Database, FileText, Filter, Globe, Mail, ShieldCheck, Table2, Upload, Webhook } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { CapabilityPicker, type Capability, type PickerItem } from '../../components/CapabilityPicker'
import { Stack } from '../../components/Layout'

/**
 * Picking one block for a pipeline step from a catalog, by searching and by what each block can
 * do: read, write, reach the network, use a secret, stream.
 */
const meta: Meta = { title: 'Patterns/Capability picker', parameters: { frame: 'padded' } }
export default meta

const CAPABILITIES: Capability[] = [
    { id: 'reads', label: 'reads' },
    { id: 'writes', label: 'writes' },
    { id: 'network', label: 'network' },
    { id: 'secrets', label: 'secrets' },
    { id: 'streams', label: 'streams' },
]

const icon = (Icon: typeof Globe) => <Icon className="size-4" aria-hidden />

const BLOCKS: PickerItem[] = [
    {
        code: 'http.fetch',
        name: 'Fetch over HTTP',
        description: 'Reads a JSON or CSV answer from a URL.',
        group: 'Sources',
        capabilities: ['reads', 'network', 'secrets'],
        icon: icon(Globe),
    },
    {
        code: 'sql.query',
        name: 'SQL query',
        description: 'Runs a query against a database and returns its rows.',
        group: 'Sources',
        capabilities: ['reads', 'network', 'secrets', 'streams'],
        icon: icon(Database),
    },
    {
        code: 'file.read',
        description: 'Reads a file from the project storage.',
        group: 'Sources',
        capabilities: ['reads', 'streams'],
        icon: icon(FileText),
    },
    {
        code: 'rows.filter',
        name: 'Filter rows',
        description: 'Keeps the rows a condition holds for.',
        group: 'Transform',
        capabilities: ['streams'],
        icon: icon(Filter),
    },
    {
        code: 'rows.join',
        name: 'Join rows',
        description: 'Joins two inputs on matching keys.',
        group: 'Transform',
        capabilities: [],
        icon: icon(Table2),
    },
    {
        code: 'schema.validate',
        name: 'Validate against a schema',
        description: 'Rejects rows that do not fit a JSON Schema, with why.',
        group: 'Check',
        capabilities: ['streams'],
        icon: icon(ShieldCheck),
    },
    {
        code: 's3.upload',
        name: 'Upload to storage',
        description: 'Writes the input to an S3-compatible bucket.',
        group: 'Destinations',
        capabilities: ['writes', 'network', 'secrets'],
        icon: icon(Upload),
    },
    {
        code: 'email.send',
        name: 'Send email',
        description: 'Sends a message to a list of people.',
        group: 'Destinations',
        capabilities: ['network', 'secrets'],
        icon: icon(Mail),
    },
    {
        code: 'webhook.post',
        name: 'Post a webhook',
        description: 'Posts the run summary to a URL.',
        group: 'Destinations',
        capabilities: ['writes', 'network'],
        icon: icon(Webhook),
    },
]

function Ground({ children }: { children: ReactNode }) {
    return (
        <Stack gap="none" className="h-[32rem] max-w-xl overflow-hidden rounded-surface border border-border-strong shadow-pop">
            {children}
        </Stack>
    )
}

function Picker({ query, chosen }: { query?: string; chosen?: string[] }) {
    const [picked, setPicked] = useState<string | null>(null)
    return (
        <Ground>
            <CapabilityPicker
                items={BLOCKS}
                capabilities={CAPABILITIES}
                onChoose={setPicked}
                defaultQuery={query}
                defaultCapabilities={chosen}
                words={{ search: 'Search' }}
                className="flex-1"
            />
            {picked !== null && <p className="border-t border-border px-3 py-2 font-mono text-xs text-muted-foreground">{picked}</p>}
        </Ground>
    )
}

export const Catalog: StoryObj = { name: 'Catalog', render: () => <Picker /> }

export const Filtered: StoryObj = { name: 'Filtered', render: () => <Picker chosen={['network', 'secrets']} /> }

export const Searching: StoryObj = { name: 'Searching', render: () => <Picker query="rows" /> }

export const NothingLeft: StoryObj = { name: 'Nothing left', render: () => <Picker query="ferry" chosen={['writes']} /> }
