import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AsyncSelect, type AsyncPage } from '@winterop-com/sokkel-ui/AsyncSelect'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { REGIONS } from '../fixtures/weekRuns'

/**
 * A select whose options come from a search, for lists too long to send whole: datasets on a
 * server, people in a directory. Several values show as chips in the field, a typed name can be
 * made into a new option, and a long answer comes a page at a time. Each story answers from a
 * fixed list, so it renders the same every time.
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
                    onValueChange={setValue}
                    load={load}
                    itemKey={(dataset) => dataset.code}
                    itemLabel={(dataset) => dataset.name}
                    itemDetail={(dataset) => dataset.code}
                    itemMeta={(dataset) => dataset.rows}
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

interface Job {
    code: string
    name: string
    scheduled: boolean
}

const JOB_OPTIONS: Job[] = [
    { code: 'nightly-export', name: 'Nightly export', scheduled: true },
    { code: 'sync-inventory', name: 'Sync inventory', scheduled: true },
    { code: 'rebuild-index', name: 'Rebuild index', scheduled: false },
    { code: 'send-digest', name: 'Send digest', scheduled: true },
    { code: 'import-orders', name: 'Import orders', scheduled: false },
]

const jobs = (query: string) =>
    Promise.resolve(JOB_OPTIONS.filter((job) => `${job.code} ${job.name.toLowerCase()}`.includes(query.toLowerCase())))

/** A job picker whose options carry a mark for how the job starts and its code beside its name. */
function JobPicker() {
    const [value, setValue] = useState<Job | null>(JOB_OPTIONS[0] ?? null)
    return (
        <Ground>
            <Field label="Job" id="job">
                <AsyncSelect
                    id="job"
                    value={value}
                    onValueChange={setValue}
                    load={jobs}
                    itemKey={(job) => job.code}
                    itemLabel={(job) => job.name}
                    itemDetail={(job) => job.code}
                    itemMark={(job) => (job.scheduled ? <CalendarClock aria-hidden /> : <Play aria-hidden />)}
                    defaultOpen
                    debounce={0}
                    words={{ placeholder: 'Choose a job' }}
                />
            </Field>
        </Ground>
    )
}

/**
 * Options with a mark before the name (`itemMark`), here a calendar for a scheduled job and a play
 * mark for one started by hand, and the job's code beside it (`itemDetail`), in the list and in the
 * chosen value alike.
 */
export const Marks: StoryObj = { name: 'Marks', render: () => <JobPicker /> }

/** A job picker over a list it holds, narrowed as it is typed. */
function LocalJobs() {
    const [value, setValue] = useState<Job | null>(null)
    return (
        <Ground>
            <Field label="Job" id="local-job">
                <AsyncSelect
                    id="local-job"
                    value={value}
                    onValueChange={setValue}
                    items={JOB_OPTIONS}
                    itemKey={(job) => job.code}
                    itemLabel={(job) => job.name}
                    itemDetail={(job) => job.code}
                    itemMeta={(job) => (job.scheduled ? 'scheduled' : 'by hand')}
                    defaultOpen
                    defaultQuery="in"
                    words={{ placeholder: 'Choose a job' }}
                />
            </Field>
        </Ground>
    )
}

/**
 * `items` in place of `load`: a searchable select over a list the app already holds. Typing narrows
 * it at once by the name or the code, with no pause and no searching line, and `itemMeta` puts a
 * quiet word at each row's end.
 */
export const Local: StoryObj = { name: 'Local list', render: () => <LocalJobs /> }

/** Places to run in: each country's parts, 240 in all, too many to send at once. */
const PLACES = REGIONS.flatMap((country) =>
    ['North', 'South', 'East', 'West', 'Central', 'Coast', 'Highlands', 'Lakes'].map((part) => `${country} ${part}`),
)

const PAGE = 20

/** Answers a page of the places matching the query, and where the next page starts. */
function placePage(query: string, _signal: AbortSignal, cursor?: string | number): Promise<AsyncPage<string>> {
    const matching = PLACES.filter((place) => place.toLowerCase().includes(query.toLowerCase()))
    const from = typeof cursor === 'number' ? cursor : 0
    const next = from + PAGE < matching.length ? from + PAGE : null
    return Promise.resolve({ items: matching.slice(from, from + PAGE), next })
}

function Places({ chosen = [], open = false, query = '' }: { chosen?: string[]; open?: boolean; query?: string }) {
    const [value, setValue] = useState<string[]>(chosen)
    return (
        <Ground>
            <Field label="Run in" id="places">
                <AsyncSelect
                    id="places"
                    multiple
                    value={value}
                    onValueChange={setValue}
                    load={placePage}
                    itemKey={(place) => place}
                    itemLabel={(place) => place}
                    defaultOpen={open}
                    defaultQuery={query}
                    debounce={0}
                    words={{ placeholder: 'Choose places' }}
                />
            </Field>
        </Ground>
    )
}

/** Several values chosen, each a chip with its remove button, the search typed in the field after them. */
export const Several: StoryObj = { render: () => <Places chosen={['Norway North', 'Kenya Coast', 'Peru Highlands']} /> }

/** Picking several: the list stays open as each is ticked, the first page of a long answer listed. */
export const PickSeveral: StoryObj = { name: 'Pick several', render: () => <Places chosen={['Austria Central']} open /> }

const LABELS = ['nightly', 'hourly', 'export', 'warehouse', 'csv', 'orders', 'retry-on-failure']

/** Answers the labels that hold the query. */
function labels(query: string): Promise<string[]> {
    return Promise.resolve(LABELS.filter((label) => label.includes(query.toLowerCase())))
}

function Labels({ query = '' }: { query?: string }) {
    const [value, setValue] = useState<string[]>(['nightly', 'export'])
    return (
        <Ground>
            <Field label="Labels" id="labels">
                <AsyncSelect
                    id="labels"
                    multiple
                    value={value}
                    onValueChange={setValue}
                    load={labels}
                    itemKey={(label) => label}
                    itemLabel={(label) => label}
                    onCreate={(text) => text.toLowerCase().replaceAll(' ', '-')}
                    defaultOpen
                    defaultQuery={query}
                    debounce={0}
                    words={{ placeholder: 'Add labels' }}
                />
            </Field>
        </Ground>
    )
}

/** A label no option is called: the list ends in a row that makes it, and the label made is chosen. */
export const Create: StoryObj = { render: () => <Labels query="weekly" /> }

function Place() {
    const [value, setValue] = useState<string | null>(null)
    return (
        <Ground>
            <Field label="Run in" id="place">
                <AsyncSelect
                    id="place"
                    value={value}
                    onValueChange={setValue}
                    load={placePage}
                    itemKey={(place) => place}
                    itemLabel={(place) => place}
                    defaultOpen
                    debounce={0}
                    words={{ placeholder: 'Choose a place' }}
                />
            </Field>
        </Ground>
    )
}

/** One value from a long answer: scrolling near the list's end loads the next page, the line under it saying so. */
export const Paged: StoryObj = { render: () => <Place /> }
