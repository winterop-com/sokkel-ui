import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { AsyncSelect } from '../../components/AsyncSelect'
import { Field } from '../../components/Field'
import { Row } from '../../components/Layout'

/**
 * A select whose options come from a search, for lists too long to send whole: datasets on a
 * server, people in a directory. Each story answers from a fixed list, so it renders the same
 * every time.
 */
const meta: Meta = { title: 'Patterns/Async select', parameters: { frame: 'padded' } }
export default meta

interface Dataset {
    code: string
    name: string
    project: string
    rows: string
}

const DATASETS: Dataset[] = [
    { code: 'harbor-orders', name: 'Harbor orders', project: 'harbor', rows: '2.1M rows' },
    { code: 'harbor-inventory', name: 'Harbor inventory', project: 'harbor', rows: '48k rows' },
    { code: 'harbor-returns', name: 'Harbor returns', project: 'harbor', rows: '310k rows' },
    { code: 'juniper-customers', name: 'Juniper customers', project: 'juniper', rows: '92k rows' },
    { code: 'juniper-invoices', name: 'Juniper invoices', project: 'juniper', rows: '1.4M rows' },
    { code: 'larkspur-events', name: 'Larkspur events', project: 'larkspur', rows: '18M rows' },
]

function answer(query: string): Promise<Dataset[]> {
    const q = query.toLowerCase()
    return Promise.resolve(DATASETS.filter((dataset) => `${dataset.code} ${dataset.name} ${dataset.project}`.includes(q)))
}

const never = () => new Promise<Dataset[]>(() => undefined)
const refuse = () => Promise.reject(new Error('503'))

function DatasetRow({ dataset }: { dataset: Dataset }) {
    return (
        <Row as="span" align="baseline">
            <span className="truncate">{dataset.name}</span>
            <span className="truncate font-mono text-xs text-muted-foreground">{dataset.code}</span>
            <span className="ml-auto shrink-0 text-xs text-faint tabular-nums">{dataset.rows}</span>
        </Row>
    )
}

function Ground({ children }: { children: ReactNode }) {
    return <div className="max-w-sm">{children}</div>
}

function Picker({
    load = answer,
    open = false,
    query = '',
    minQuery = 0,
    chosen = null,
}: {
    load?: (query: string) => Promise<Dataset[]>
    open?: boolean
    query?: string
    minQuery?: number
    chosen?: Dataset | null
}) {
    const [value, setValue] = useState<Dataset | null>(chosen)
    return (
        <Ground>
            <Field label="Source dataset" id="dataset">
                <AsyncSelect
                    id="dataset"
                    value={value}
                    onChange={setValue}
                    load={load}
                    itemKey={(dataset) => dataset.code}
                    itemLabel={(dataset) => dataset.name}
                    renderItem={(dataset) => <DatasetRow dataset={dataset} />}
                    defaultOpen={open}
                    defaultQuery={query}
                    minQuery={minQuery}
                    debounce={0}
                    words={{ placeholder: 'Choose a dataset', search: 'Search' }}
                />
            </Field>
        </Ground>
    )
}

export const Closed: StoryObj = { name: 'Closed', render: () => <Picker chosen={DATASETS[0]} /> }

export const Results: StoryObj = { name: 'Results', render: () => <Picker open query="harbor" /> }

export const Searching: StoryObj = { name: 'Searching', render: () => <Picker open query="har" load={never} /> }

export const NoMatch: StoryObj = { name: 'No match', render: () => <Picker open query="ferry" /> }

export const Failed: StoryObj = { name: 'Failed', render: () => <Picker open query="harbor" load={refuse} /> }

export const TypeMore: StoryObj = { name: 'Type more', render: () => <Picker open minQuery={2} /> }
