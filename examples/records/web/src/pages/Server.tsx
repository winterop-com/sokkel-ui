import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'

import { SERVER } from '../data/backend'
import { useFoot } from '../ui'

interface Operation {
    name: string
    on: string
    does: string
}

interface Kind {
    name: string
    interactions: string
    params: string[]
    detail: string
}

const OPERATIONS: Operation[] = [
    {
        name: 'draft',
        on: 'forms',
        does: 'Answers a form with test answers drawn from a seed, the same again for the same seed. What Fill with test data asks for.',
    },
    {
        name: 'forward',
        on: 'responses',
        does: 'Sends one received response on to the register, which takes it or refuses it with a reason.',
    },
    { name: 'health', on: 'the server', does: 'Runs every check over the metadata and the households, and answers with what it finds.' },
]

const KINDS: Kind[] = [
    {
        name: 'forms',
        interactions: 'read, list',
        params: ['kind', 'count'],
        detail: 'The forms the server serves, each with its sections and questions.',
    },
    {
        name: 'places',
        interactions: 'read, list',
        params: ['level', 'parent', 'count'],
        detail: 'The country, its regions and their sites, each with its parent.',
    },
    {
        name: 'households',
        interactions: 'list, create by registration',
        params: ['identifier', 'count'],
        detail: 'The registered households, named by their identifiers.',
    },
    {
        name: 'responses',
        interactions: 'create, read, list',
        params: ['state', 'form', 'count'],
        detail: 'Every record filed, with where it is now.',
    },
]

const OPERATION_COLUMNS: DataColumn<Operation>[] = [
    { id: 'name', header: 'Operation', width: '8rem', cell: (operation) => <span className="font-mono">{operation.name}</span> },
    { id: 'on', header: 'Declared on', width: '9rem', cell: (operation) => <Badge variant="outline">{operation.on}</Badge> },
    { id: 'does', header: 'What it does', width: 'minmax(16rem,1fr)', cell: (operation) => operation.does, stack: 'primary' },
]

const KIND_COLUMNS: DataColumn<Kind>[] = [
    {
        id: 'name',
        header: 'Kind',
        width: 'minmax(10rem,1fr)',
        cell: (kind) => (
            <span>
                <span className="font-mono">{kind.name}</span>
                <span className="block text-help text-muted-foreground">{kind.detail}</span>
            </span>
        ),
    },
    {
        id: 'interactions',
        header: 'Interactions',
        width: '12rem',
        cell: (kind) => <span className="font-mono text-xs">{kind.interactions}</span>,
    },
    { id: 'params', header: 'Parameters', width: '14rem', cell: (kind) => <TagChips tags={kind.params} variant="outline" /> },
]

/** What the demo server is and what it offers: its kinds of record, the parameters each reads, and its operations. */
export function Server() {
    useFoot(`${String(KINDS.length)} kinds served · ${String(OPERATIONS.length)} operations declared`)
    return (
        <Page>
            <PageHeader
                title="Server"
                description="What the server says about itself at /metadata: the whole of what a caller can ask of it."
                actions={<ApiLink path="/metadata" />}
            />
            <Section title={SERVER.name} description="The server the app reads and files through.">
                <DescriptionList
                    columns={2}
                    layout="stacked"
                    items={[
                        { term: 'Version', value: SERVER.version, code: true },
                        { term: 'Base', value: SERVER.base, code: true },
                        { term: 'Authentication', value: 'None: this demo sends no credentials' },
                        { term: 'Storage', value: 'This browser, through the demo backend' },
                    ]}
                />
            </Section>
            <Section
                variant="flat"
                title="Kinds of record"
                meta={String(KINDS.length)}
                description="What a caller can read from the server, and how."
            >
                <DataTable
                    variant="list"
                    columns={KIND_COLUMNS}
                    rows={KINDS}
                    rowKey={(kind) => kind.name}
                    rowHeight="auto"
                    minWidth="auto"
                />
            </Section>
            <Section
                variant="flat"
                title="Declared operations"
                meta={String(OPERATIONS.length)}
                description="What a caller can ask the server to do beyond reading."
            >
                <DataTable
                    variant="list"
                    columns={OPERATION_COLUMNS}
                    rows={OPERATIONS}
                    rowKey={(operation) => operation.name}
                    rowHeight="auto"
                    minWidth="auto"
                />
            </Section>
        </Page>
    )
}
