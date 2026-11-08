import { TextField } from '@winterop-com/sokkel-ui/TextField'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import {
    ArrowRight,
    ArrowUpRight,
    CheckCircle2,
    CircleAlert,
    ClipboardList,
    Download,
    FilePlus2,
    FolderOpen,
    LayoutDashboard,
    Map as MapIcon,
    MapPin,
    Plus,
    Undo2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DetailSheet } from '@winterop-com/sokkel-ui/DetailSheet'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { FilterChip, type FilterOption } from '@winterop-com/sokkel-ui/FilterChip'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { Inspector, InspectorSection } from '@winterop-com/sokkel-ui/Inspector'
import { IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PeriodSlider } from '@winterop-com/sokkel-ui-maps/PeriodSlider'
import { colorOf, sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import {
    Questionnaire,
    QuestionnaireActions,
    QuestionnaireChoice,
    QuestionnaireChoiceDescription,
    QuestionnaireChoices,
    QuestionnaireItem,
    QuestionnaireNext,
    QuestionnairePrevious,
    QuestionnaireProgress,
    QuestionnaireTitle,
} from '@winterop-com/sokkel-ui/primitives/questionnaire'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { PEOPLE_OPTIONS } from '../fixtures/filters'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { NUMBER, regionName, regions } from '../map/data'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Center, Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { TableOfContents } from '@winterop-com/sokkel-ui/TableOfContents'

/**
 * A records app for structured data entry in the library's frame: an overview of what waits for
 * review with the forms a record starts from, a list of site visits with filters and the chosen one
 * in an inspector or a sheet, a long visit form in sections with a step-through site check and
 * fields that refuse their values, and the visits by region on a map with a legend and a month
 * slider. Each place in the rail says what it holds on a second line.
 */
type View = 'overview' | 'records' | 'form' | 'map'

type State = 'draft' | 'submitted' | 'approved' | 'returned'

const STATE: Record<State, Status> = { draft: 'pending', submitted: 'running', approved: 'succeeded', returned: 'failed' }

/** Each state's color, for the dot before its count. */
const STATE_DOT: Record<State, string> = {
    draft: 'var(--status-pending)',
    submitted: 'var(--status-running)',
    approved: 'var(--status-succeeded)',
    returned: 'var(--status-failed)',
}

function StateChip({ state }: { state: State }) {
    return <StatusChip status={STATE[state]} label={state} />
}

interface Visit {
    code: string
    site: string
    region: string
    visited: string
    by: string
    state: State
    level: number
    temperature: number
    turbidity: number
    ph: number
}

const VISITS: Visit[] = [
    {
        code: 'VIS-2048',
        site: 'Riverside station',
        region: 'Bo',
        visited: 'Nov 4, 09:40',
        by: 'grace',
        state: 'submitted',
        level: 1.42,
        temperature: 26.1,
        turbidity: 12,
        ph: 7.2,
    },
    {
        code: 'VIS-2047',
        site: 'North ferry landing',
        region: 'Port Loko',
        visited: 'Nov 4, 08:15',
        by: 'linus',
        state: 'draft',
        level: 2.08,
        temperature: 25.4,
        turbidity: 31,
        ph: 6.9,
    },
    {
        code: 'VIS-2046',
        site: 'Market well',
        region: 'Kenema',
        visited: 'Nov 3, 16:20',
        by: 'ada',
        state: 'approved',
        level: 0.86,
        temperature: 27.3,
        turbidity: 4,
        ph: 7.4,
    },
    {
        code: 'VIS-2045',
        site: 'Hill reservoir',
        region: 'Kono',
        visited: 'Nov 3, 11:05',
        by: 'margaret',
        state: 'returned',
        level: 3.71,
        temperature: 23.8,
        turbidity: 58,
        ph: 6.4,
    },
    {
        code: 'VIS-2044',
        site: 'Estuary gauge',
        region: 'Bonthe',
        visited: 'Nov 3, 07:50',
        by: 'grace',
        state: 'approved',
        level: 1.95,
        temperature: 26.7,
        turbidity: 18,
        ph: 7.1,
    },
    {
        code: 'VIS-2043',
        site: 'Bridge crossing',
        region: 'Tonkolili',
        visited: 'Nov 2, 15:30',
        by: 'linus',
        state: 'approved',
        level: 1.12,
        temperature: 25.9,
        turbidity: 9,
        ph: 7.3,
    },
    {
        code: 'VIS-2042',
        site: 'Lake outlet',
        region: 'Moyamba',
        visited: 'Nov 2, 10:10',
        by: 'ada',
        state: 'submitted',
        level: 2.44,
        temperature: 24.6,
        turbidity: 22,
        ph: 7.0,
    },
    {
        code: 'VIS-2041',
        site: 'Coastal spring',
        region: 'Western Area',
        visited: 'Nov 1, 14:45',
        by: 'margaret',
        state: 'approved',
        level: 0.64,
        temperature: 27.8,
        turbidity: 3,
        ph: 7.6,
    },
    {
        code: 'VIS-2040',
        site: 'Valley weir',
        region: 'Koinadugu',
        visited: 'Nov 1, 09:20',
        by: 'grace',
        state: 'approved',
        level: 1.38,
        temperature: 22.9,
        turbidity: 7,
        ph: 7.2,
    },
    {
        code: 'VIS-2039',
        site: 'School borehole',
        region: 'Kailahun',
        visited: 'Oct 31, 13:00',
        by: 'linus',
        state: 'approved',
        level: 0.92,
        temperature: 25.1,
        turbidity: 5,
        ph: 7.3,
    },
]

const COLUMNS: DataColumn<Visit>[] = [
    {
        id: 'code',
        header: 'Visit',
        width: '6.5rem',
        cell: (visit) => <span className="font-mono">{visit.code}</span>,
        sortValue: (visit) => visit.code,
    },
    { id: 'site', header: 'Site', width: 'minmax(10rem,1fr)', cell: (visit) => visit.site, sortValue: (visit) => visit.site },
    {
        id: 'region',
        header: 'Region',
        width: '7.5rem',
        cell: (visit) => <span className="text-muted-foreground">{visit.region}</span>,
        sortValue: (visit) => visit.region,
    },
    {
        id: 'visited',
        header: 'Visited',
        width: '7.5rem',
        cell: (visit) => <span className="tabular-nums">{visit.visited}</span>,
        sortValue: (visit) => visit.code,
    },
    {
        id: 'by',
        header: 'By',
        width: '5.5rem',
        cell: (visit) => <span className="text-muted-foreground">{visit.by}</span>,
        sortValue: (visit) => visit.by,
    },
    {
        id: 'state',
        header: 'State',
        width: '6.5rem',
        cell: (visit) => <StateChip state={visit.state} />,
        sortValue: (visit) => visit.state,
    },
]

function groups(view: View): RailGroup[] {
    return [
        {
            id: 'capture',
            entries: [
                {
                    id: 'overview',
                    label: 'Overview',
                    description: 'What waits for review',
                    icon: LayoutDashboard,
                    href: '#',
                    active: view === 'overview',
                },
                {
                    id: 'visits',
                    label: 'Visits',
                    description: 'Every record filed',
                    icon: ClipboardList,
                    href: '#',
                    active: view === 'records',
                },
                { id: 'new', label: 'New visit', description: 'Start a record', icon: FilePlus2, href: '#', active: view === 'form' },
                { id: 'sites', label: 'Sites', description: 'Where visits happen', icon: MapPin, href: '#' },
                { id: 'map', label: 'Map', description: 'Visits by region', icon: MapIcon, href: '#', active: view === 'map' },
            ],
        },
        {
            id: 'projects',
            title: 'Projects',
            entries: [
                { id: 'harbor', label: 'harbor', icon: FolderOpen, href: '#' },
                { id: 'juniper', label: 'juniper', icon: FolderOpen, href: '#' },
                { id: 'larkspur', label: 'larkspur', icon: FolderOpen, href: '#' },
            ],
        },
    ]
}

const TRAILS: Record<View, Crumb[]> = {
    overview: [{ label: 'juniper', href: '#', code: true }, { label: 'Overview' }],
    records: [{ label: 'juniper', href: '#', code: true }, { label: 'Visits' }],
    form: [{ label: 'juniper', href: '#', code: true }, { label: 'Visits', href: '#' }, { label: 'New visit' }],
    map: [{ label: 'juniper', href: '#', code: true }, { label: 'Map' }],
}

function Measurements({ visit }: { visit: Visit }) {
    return (
        <DescriptionList
            termWidth="7.5rem"
            items={[
                { term: 'Water level', value: `${visit.level.toFixed(2)} m` },
                { term: 'Water temperature', value: `${visit.temperature.toFixed(1)} °C` },
                { term: 'Turbidity', value: `${String(visit.turbidity)} NTU` },
                { term: 'pH', value: visit.ph.toFixed(1) },
            ]}
        />
    )
}

const PERIOD_OPTIONS: FilterOption[] = [
    { value: '2026-09', label: 'Sep 2026' },
    { value: '2026-10', label: 'Oct 2026' },
    { value: '2026-11', label: 'Nov 2026' },
]

const STATE_OPTIONS: FilterOption[] = (['draft', 'submitted', 'approved', 'returned'] as const).map((state) => ({
    value: state,
    row: <StateChip state={state} />,
}))

/** The regions the visits were made in, each once, in order. */
const REGION_OPTIONS: FilterOption[] = [...new Set(VISITS.map((visit) => visit.region))].sort().map((region) => ({ value: region }))

function Records() {
    const [query, setQuery] = useState('')
    const [chosen, setChosen] = useState<Visit>(VISITS[0])
    const [states, setStates] = useState<string[]>([])
    const [places, setPlaces] = useState<string[]>([])
    const [people, setPeople] = useState<string[]>([])
    const rows = VISITS.filter(
        (visit) =>
            (states.length === 0 || states.includes(visit.state)) &&
            (places.length === 0 || places.includes(visit.region)) &&
            (people.length === 0 || people.includes(visit.by)) &&
            `${visit.code} ${visit.site}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    return (
        <Page className="h-full">
            <PageHeader
                title="Visits"
                count="248 this month"
                actions={
                    <>
                        <Button size="sm" variant="outline">
                            <Download aria-hidden />
                            Export
                        </Button>
                        <Button size="sm">
                            <Plus aria-hidden />
                            New
                        </Button>
                    </>
                }
            />
            <Row gap="inspector" align="start" className="min-h-0 flex-1">
                <DataTable
                    toolbar={
                        <>
                            <SearchField value={query} onChange={setQuery} placeholder="Search" className="w-full max-w-64 min-w-40" />
                            <FilterChip facet="Period" options={PERIOD_OPTIONS} defaultSelected={['2026-11']} />
                            <FilterChip facet="State" options={STATE_OPTIONS} multiple selected={states} onSelectedChange={setStates} />
                            <FilterChip facet="Region" options={REGION_OPTIONS} multiple selected={places} onSelectedChange={setPlaces} />
                            <FilterChip
                                facet="Collected by"
                                options={PEOPLE_OPTIONS}
                                multiple
                                selected={people}
                                onSelectedChange={setPeople}
                            />
                        </>
                    }
                    columns={COLUMNS}
                    rows={rows}
                    rowKey={(visit) => visit.code}
                    onOpen={setChosen}
                    opened={(visit) => visit.code === chosen.code}
                    total={248}
                    minWidth="40rem"
                    className="min-w-0 flex-1"
                />
                <Row gap="none" align="stretch" from="xl" className="self-stretch">
                    <Inspector
                        title={chosen.site}
                        code={chosen.code}
                        status={
                            <>
                                <StateChip state={chosen.state} />
                                <span>
                                    by <span className="text-foreground">{chosen.by}</span>, {chosen.visited}
                                </span>
                            </>
                        }
                        actions={
                            chosen.state === 'submitted' ? (
                                <>
                                    <Button size="sm">
                                        <CheckCircle2 aria-hidden />
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        <Undo2 aria-hidden />
                                        Return
                                    </Button>
                                </>
                            ) : undefined
                        }
                        menu={
                            <>
                                <DropdownMenuItem>Open the site</DropdownMenuItem>
                                <DropdownMenuItem>Copy a link</DropdownMenuItem>
                            </>
                        }
                    >
                        <InspectorSection title="Measurements">
                            <Measurements visit={chosen} />
                        </InspectorSection>
                        <InspectorSection title="Site">
                            <DescriptionList
                                termWidth="7.5rem"
                                items={[
                                    { term: 'Region', value: chosen.region },
                                    { term: 'Position', value: '7.96° N, 11.74° W', code: true },
                                    { term: 'Last visit', value: 'Oct 21, by ada' },
                                ]}
                            />
                        </InspectorSection>
                        <InspectorSection title="Notes">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Gauge board cleaned before reading. The bank on the east side has worn since the last visit.
                            </p>
                        </InspectorSection>
                    </Inspector>
                </Row>
            </Row>
        </Page>
    )
}

const OUTLINE: { id: string; label: string; state: 'done' | 'error' | 'open' }[] = [
    { id: 'where', label: 'Where and when', state: 'done' },
    { id: 'measurements', label: 'Measurements', state: 'error' },
    { id: 'conditions', label: 'Site check', state: 'open' },
    { id: 'notes', label: 'Notes', state: 'open' },
]

const CHECKS = [
    { name: 'access', choices: [{ value: 'open' }, { value: 'partly' }, { value: 'closed' }] },
    { name: 'weather', choices: [{ value: 'dry' }, { value: 'rain' }, { value: 'storm' }] },
    { name: 'gauge', choices: [{ value: 'good' }, { value: 'damaged' }] },
]

function VisitForm() {
    const levelError = 'Water level must be between 0 and 10 m; 14.2 is outside it.'
    const timeError = 'Say when the reading was taken.'
    const [issueOpen, setIssueOpen] = useState<'time' | 'level' | null>(null)
    const holdOpen = (which: 'time' | 'level') => (open: boolean) => setIssueOpen(open ? which : null)
    return (
        <Stack gap="none" className="min-h-full">
            <Page className="flex-1">
                <PageHeader title="New visit" code="VIS-2049" />
                <Row gap="2xl" align="start">
                    <Stack as="form" gap="page" className="max-w-4xl flex-1" onSubmit={(event) => event.preventDefault()}>
                        <Section
                            title="Where and when"
                            description="The site and the moment of the reading. Every answer below is filed under them."
                        >
                            <Columns gap="lg">
                                <Field
                                    id="site"
                                    label="Site"
                                    required
                                    description="The station this visit reports from."
                                    help="Only the sites assigned to juniper are offered."
                                >
                                    <NativeSelect id="site" defaultValue="riverside" className="w-full">
                                        <NativeSelectOption value="riverside">Riverside station, Bo</NativeSelectOption>
                                        <NativeSelectOption value="ferry">North ferry landing, Port Loko</NativeSelectOption>
                                        <NativeSelectOption value="well">Market well, Kenema</NativeSelectOption>
                                    </NativeSelect>
                                </Field>
                                <Field id="by" label="Collected by" required>
                                    <NativeSelect id="by" defaultValue="grace" className="w-full">
                                        <NativeSelectOption value="ada">ada</NativeSelectOption>
                                        <NativeSelectOption value="grace">grace</NativeSelectOption>
                                        <NativeSelectOption value="linus">linus</NativeSelectOption>
                                        <NativeSelectOption value="margaret">margaret</NativeSelectOption>
                                    </NativeSelect>
                                </Field>
                                <TextField id="date" label="Visit date" required type="date" defaultValue="2026-11-04" />
                                <TextField
                                    id="time"
                                    label="Reading taken at"
                                    hint="24-hour"
                                    required
                                    error={timeError}
                                    issueOpen={issueOpen === 'time'}
                                    onIssueOpenChange={holdOpen('time')}
                                    placeholder="09:40"
                                />
                            </Columns>
                        </Section>
                        <Section title="Measurements" meta="4 of 5" description="Read at the gauge, in the units beside each label.">
                            <Columns gap="lg">
                                <TextField
                                    id="level"
                                    label="Water level"
                                    hint="m"
                                    required
                                    description="Read off the gauge board before the sample is taken."
                                    help="Between 0 and 10."
                                    error={levelError}
                                    issueOpen={issueOpen === 'level'}
                                    onIssueOpenChange={holdOpen('level')}
                                    inputMode="decimal"
                                    defaultValue="14.2"
                                    numeric
                                />
                                <TextField
                                    id="temperature"
                                    label="Water temperature"
                                    hint="°C"
                                    inputMode="decimal"
                                    defaultValue="26.1"
                                    numeric
                                />
                                <TextField
                                    id="turbidity"
                                    label="Turbidity"
                                    hint="NTU"
                                    help="Read after the sample has settled for a minute."
                                    inputMode="numeric"
                                    defaultValue="12"
                                    numeric
                                />
                                <TextField id="ph" label="pH" hint="0 to 14" inputMode="decimal" defaultValue="7.2" numeric />
                                <TextField
                                    id="rain"
                                    label="Rainfall, last 24 hours"
                                    hint="mm"
                                    inputMode="decimal"
                                    placeholder="0.0"
                                    numeric
                                />
                            </Columns>
                        </Section>
                        <Section title="Site check" meta="3 questions" description="The conditions at the site, one question at a time.">
                            <Questionnaire shortcuts="letters" items={CHECKS} defaultItem="weather" className="max-w-xl">
                                <QuestionnaireProgress />
                                <QuestionnaireItem name="access">
                                    <QuestionnaireTitle>Could you reach the site?</QuestionnaireTitle>
                                    <QuestionnaireChoices>
                                        <QuestionnaireChoice value="open" defaultChecked>
                                            Yes, on the usual path
                                        </QuestionnaireChoice>
                                        <QuestionnaireChoice value="partly">Only part of it</QuestionnaireChoice>
                                        <QuestionnaireChoice value="closed">No, the way was closed</QuestionnaireChoice>
                                    </QuestionnaireChoices>
                                </QuestionnaireItem>
                                <QuestionnaireItem name="weather">
                                    <QuestionnaireTitle>What was the weather during the reading?</QuestionnaireTitle>
                                    <QuestionnaireChoices>
                                        <QuestionnaireChoice value="dry" defaultChecked>
                                            Dry
                                            <QuestionnaireChoiceDescription>No rain in the last hour</QuestionnaireChoiceDescription>
                                        </QuestionnaireChoice>
                                        <QuestionnaireChoice value="rain">
                                            Light rain
                                            <QuestionnaireChoiceDescription>The surface was disturbed</QuestionnaireChoiceDescription>
                                        </QuestionnaireChoice>
                                        <QuestionnaireChoice value="storm">
                                            Heavy rain or wind
                                            <QuestionnaireChoiceDescription>The reading may be off</QuestionnaireChoiceDescription>
                                        </QuestionnaireChoice>
                                    </QuestionnaireChoices>
                                </QuestionnaireItem>
                                <QuestionnaireItem name="gauge">
                                    <QuestionnaireTitle>What state was the gauge in?</QuestionnaireTitle>
                                    <QuestionnaireChoices>
                                        <QuestionnaireChoice value="good">Readable</QuestionnaireChoice>
                                        <QuestionnaireChoice value="damaged">Damaged or covered</QuestionnaireChoice>
                                    </QuestionnaireChoices>
                                </QuestionnaireItem>
                                <QuestionnaireActions>
                                    <QuestionnairePrevious />
                                    <QuestionnaireNext />
                                </QuestionnaireActions>
                            </Questionnaire>
                        </Section>
                        <Section title="Notes">
                            <TextField
                                id="notes"
                                label="What else did you see?"
                                help="Anything the next visitor should know."
                                multiline
                                rows={4}
                                defaultValue="Gauge board cleaned before reading. The bank on the east side has worn since the last visit."
                            />
                        </Section>
                    </Stack>
                    <TableOfContents
                        entries={OUTLINE.map((part) => ({
                            id: part.id,
                            label: part.label,
                            level: 1,
                            icon: <OutlineMark state={part.state} />,
                        }))}
                        active="measurements"
                        onJump={() => undefined}
                        words={{ title: 'On this form' }}
                        className="sticky top-0 w-52 shrink-0 max-xl:hidden"
                    />
                </Row>
            </Page>
            <FormBar note="Draft saved at 09:52">
                <IssueCount
                    critical={2}
                    list={[
                        {
                            label: 'Reading taken at',
                            issue: { tone: 'critical', text: timeError },
                            onGo: () => setIssueOpen('time'),
                        },
                        { label: 'Water level', issue: { tone: 'critical', text: levelError }, onGo: () => setIssueOpen('level') },
                    ]}
                />
                <Button size="sm" variant="ghost">
                    Cancel
                </Button>
                <Button size="sm" variant="outline">
                    Save draft
                </Button>
                <Button size="sm" disabled>
                    Submit
                </Button>
            </FormBar>
        </Stack>
    )
}

function OutlineMark({ state }: { state: 'done' | 'error' | 'open' }) {
    if (state === 'done') return <CheckCircle2 className="size-4 text-good-ink" aria-label="Complete" />
    if (state === 'error') return <CircleAlert className="size-4 text-critical-ink" aria-label="Needs attention" />
    return (
        <Center as="span" className="size-4 shrink-0" aria-label="Not started">
            <Dot outline />
        </Center>
    )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, index) => ({
    id: `2026-${String(index + 1).padStart(2, '0')}`,
    label,
}))

/** How busy each month is for visits, as a share of the busiest. */
const SEASON = [0.55, 0.6, 0.72, 0.8, 0.9, 1, 0.95, 0.88, 0.76, 0.7, 0.64, 0.5]

const REGION_IDS = regions.features.map((feature) => String(feature.id))

/** Visits recorded in each region and month, the same every time. */
const VISITS_BY: Record<string, Record<string, number>> = Object.fromEntries(
    MONTHS.map((month, index) => [
        month.id,
        Object.fromEntries(REGION_IDS.map((id, at) => [id, Math.round((14 + ((at * 37) % 41)) * SEASON[index])])),
    ]),
)

const visitScale = sequentialScale({ breaks: [10, 20, 30, 40], hue: 'var(--chart-2)' })

/** The regions with the color each has on the map and its count, for a month's counts. */
function regionColumns(counts: Record<string, number>): DataColumn<string>[] {
    return [
        {
            id: 'region',
            header: 'Region',
            width: 'minmax(8rem,1fr)',
            cell: (id) => (
                <Row as="span" className="min-w-0">
                    <span className="size-2.5 shrink-0 rounded-mini" style={{ background: colorOf(visitScale, counts[id]) ?? undefined }} />
                    <span className="truncate">{regionName[id]}</span>
                </Row>
            ),
            sortValue: (id) => regionName[id],
        },
        {
            id: 'visits',
            header: 'Visits',
            width: '6rem',
            align: 'end',
            cell: (id) => <span className="font-mono text-xs text-muted-foreground tabular-nums">{counts[id]}</span>,
            sortValue: (id) => counts[id],
        },
    ]
}

function RegionsMap() {
    const [month, setMonth] = useState('2026-10')
    const [measure, setMeasure] = useState<'visits' | 'returned'>('visits')
    const counts = VISITS_BY[month]
    const label = `${MONTHS.find((one) => one.id === month)?.label ?? ''} 2026`
    const total = REGION_IDS.reduce((sum, id) => sum + counts[id], 0)
    return (
        <Page className="h-full">
            <PageHeader
                title="Visits by region"
                count={`${NUMBER.format(total)} in ${label}`}
                actions={
                    <Segmented
                        label="Measure"
                        value={measure}
                        onValueChange={setMeasure}
                        options={[
                            { value: 'visits', label: 'Visits' },
                            { value: 'returned', label: 'Returned' },
                        ]}
                    />
                }
            />
            <Row gap="inspector" align="stretch" stackBelow="xl" className="min-h-0 flex-1">
                <Stack className="min-h-[28rem] flex-1">
                    <MapView label={`Visits by region, ${label}`} className="min-h-[22rem] flex-1">
                        <BoundaryLayer
                            id="regions"
                            data={regions}
                            scale={visitScale}
                            value={(region: Feature) => counts[String(region.id)]}
                        />
                        <MapOverlay corner="bottom-left">
                            <MapLegend title="Visits" description={label} scale={visitScale} captions={['Fewer', 'More']} />
                        </MapOverlay>
                    </MapView>
                    <PeriodSlider label="Month" periods={MONTHS} value={month} onValueChange={setMonth} />
                </Stack>
                <DataTable
                    columns={regionColumns(counts)}
                    rows={REGION_IDS}
                    rowKey={(id) => id}
                    defaultSort={{ column: 'visits', direction: 'desc' }}
                    toolbar={<span className="font-medium">Regions</span>}
                    minWidth="14rem"
                    className="shrink-0 xl:w-72"
                />
            </Row>
        </Page>
    )
}

type FormKind = 'monthly' | 'visit' | 'register' | 'followup'

/** What each kind of form is called and the color its chip wears wherever a form is shown. */
const KIND: Record<FormKind, { label: string; color: KindColor }> = {
    monthly: { label: 'Monthly report', color: 'teal' },
    visit: { label: 'Single visit', color: 'pink' },
    register: { label: 'Registration', color: 'violet' },
    followup: { label: 'Follow-up', color: 'green' },
}

const KINDS: FormKind[] = ['monthly', 'visit', 'register', 'followup']

interface RecordForm {
    code: string
    title: string
    kind: FormKind
    questions: number
}

const FORMS: RecordForm[] = [
    { code: 'FRM-MONTH', title: 'Monthly station summary', kind: 'monthly', questions: 116 },
    { code: 'FRM-STOCK', title: 'Gauge and kit stock', kind: 'monthly', questions: 18 },
    { code: 'FRM-SITE', title: 'Site visit', kind: 'visit', questions: 14 },
    { code: 'FRM-SAMPLE', title: 'Water sample', kind: 'visit', questions: 9 },
    { code: 'FRM-STATION', title: 'New station', kind: 'register', questions: 6 },
    { code: 'FRM-OBSERVER', title: 'New observer', kind: 'register', questions: 3 },
    { code: 'FRM-RECHECK', title: 'Gauge recheck after a flood', kind: 'followup', questions: 3 },
    { code: 'FRM-REPAIR', title: 'Repair follow-up', kind: 'followup', questions: 8 },
]

function KindChip({ kind }: { kind: FormKind }) {
    return <Badge kind={KIND[kind].color}>{KIND[kind].label}</Badge>
}

/** The month's records by state, each with what its count means. */
const TILES: { state: State; label: string; count: number; note: string }[] = [
    { state: 'submitted', label: 'Submitted', count: 3, note: 'waiting for review' },
    { state: 'draft', label: 'Draft', count: 2, note: 'saved, not yet submitted' },
    { state: 'approved', label: 'Approved', count: 18, note: 'accepted into the register' },
    { state: 'returned', label: 'Returned', count: 1, note: 'sent back to grace with a reason' },
]

function Overview() {
    const [kind, setKind] = useState<'all' | FormKind>('all')
    const shown = FORMS.filter((form) => kind === 'all' || form.kind === kind)
    return (
        <Page>
            <PageHeader title="Overview" description="What waits for review this month, and the forms a record starts from." />
            <Section
                variant="flat"
                title="Records"
                description="November's records by the state they are in. Each tile opens the list of them."
            >
                <Columns count={4} min="xs" gap="md">
                    {TILES.map((tile) => (
                        <Stat
                            key={tile.state}
                            variant="tile"
                            dot={STATE_DOT[tile.state]}
                            label={tile.label}
                            value={tile.count}
                            note={tile.note}
                            href="#"
                            emphasis={tile.state === 'submitted'}
                        />
                    ))}
                </Columns>
            </Section>
            <Section
                variant="flat"
                title="Start a record"
                meta={String(FORMS.length)}
                description="The forms juniper offers. Each opens empty and is filed as a record when submitted."
                actions={
                    <Button size="sm" variant="outline">
                        All forms
                        <ArrowRight data-icon="inline-end" aria-hidden />
                    </Button>
                }
            >
                <Stack gap="md">
                    <Segmented
                        label="Kind of form"
                        value={kind}
                        onValueChange={setKind}
                        options={[
                            { value: 'all', label: 'All', count: FORMS.length },
                            ...KINDS.map((one) => ({
                                value: one,
                                label: KIND[one].label,
                                count: FORMS.filter((form) => form.kind === one).length,
                                dot: `var(--kind-${KIND[one].color})`,
                            })),
                        ]}
                    />
                    <Columns count={4} min="md" gap="md">
                        {shown.map((form) => (
                            <ItemCard
                                key={form.code}
                                title={form.title}
                                code={form.code}
                                href="#"
                                status={
                                    <>
                                        <KindChip kind={form.kind} />
                                        <span>{form.questions} questions</span>
                                    </>
                                }
                            />
                        ))}
                    </Columns>
                </Stack>
            </Section>
        </Page>
    )
}

interface Answer {
    id: string
    part: string
    question: string
    answer: string
}

const ANSWERS: Answer[] = [
    { id: 'site', part: 'Where and when', question: 'Site', answer: 'Riverside station, Bo' },
    { id: 'by', part: 'Where and when', question: 'Collected by', answer: 'grace' },
    { id: 'date', part: 'Where and when', question: 'Visit date', answer: '2026-11-04' },
    { id: 'time', part: 'Where and when', question: 'Reading taken at', answer: '09:40' },
    { id: 'level', part: 'Measurements', question: 'Water level', answer: '1.42 m' },
    { id: 'temperature', part: 'Measurements', question: 'Water temperature', answer: '26.1 °C' },
    { id: 'turbidity', part: 'Measurements', question: 'Turbidity', answer: '12 NTU' },
    { id: 'ph', part: 'Measurements', question: 'pH', answer: '7.2' },
    { id: 'access', part: 'Site check', question: 'Could you reach the site?', answer: 'Yes, on the usual path' },
    { id: 'weather', part: 'Site check', question: 'What was the weather during the reading?', answer: 'Dry' },
]

const ANSWER_COLUMNS: DataColumn<Answer>[] = [
    {
        id: 'question',
        header: 'Question',
        width: 'minmax(12rem,2fr)',
        cell: (row) => (
            <Stack gap="none">
                <span className="text-help text-muted-foreground">{row.part}</span>
                <span className="font-medium">{row.question}</span>
            </Stack>
        ),
    },
    { id: 'answer', header: 'Answer', width: 'minmax(8rem,1fr)', cell: (row) => row.answer },
]

/** The visit list with the first visit open in a sheet: what was filed, and every answer in the form's order. */
function RecordSheet() {
    const [open, setOpen] = useState(true)
    const visit = VISITS[0]
    return (
        <>
            <Records />
            <DetailSheet
                open={open}
                onOpenChange={setOpen}
                code={visit.code}
                title={visit.site}
                chips={
                    <>
                        <KindChip kind="visit" />
                        <StateChip state={visit.state} />
                    </>
                }
                actions={
                    <>
                        <Button size="sm" variant="outline" render={<a href="#" />}>
                            Open the full page
                            <ArrowUpRight data-icon="inline-end" aria-hidden />
                        </Button>
                        <ApiLink path={`/api/visits/${visit.code}`} />
                    </>
                }
                foot={
                    <>
                        <Button size="sm" variant="outline">
                            <Undo2 aria-hidden />
                            Return
                        </Button>
                        <Button size="sm">
                            <CheckCircle2 aria-hidden />
                            Approve
                        </Button>
                    </>
                }
            >
                <Section title="Filed" description="Who filed it, when, and from which form.">
                    <DescriptionList
                        layout="stacked"
                        columns={2}
                        items={[
                            { term: 'Filed', value: `${visit.visited}, by ${visit.by}` },
                            { term: 'Form', value: 'FRM-SITE', code: true },
                            { term: 'Region', value: visit.region },
                            { term: 'Answers', value: String(ANSWERS.length) },
                        ]}
                    />
                </Section>
                <Section
                    variant="flat"
                    title="Answers"
                    meta={String(ANSWERS.length)}
                    description="Each answer under the part of the form that asks it."
                >
                    <DataTable variant="list" columns={ANSWER_COLUMNS} rows={ANSWERS} rowKey={(row) => row.id} rowHeight="auto" />
                </Section>
            </DetailSheet>
        </>
    )
}

function RecordsApp({ view, foot, children }: { view: View; foot?: ReactNode; children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                foot={foot}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(view)}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={
                            <AccountMenu
                                name="grace"
                                image={pictureOf('grace')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSettings={() => undefined}
                            />
                        }
                    />
                }
                top={<TopBar trail={TRAILS[view]} onSearch={() => undefined} />}
            >
                {children}
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Records' }
export default meta

/** What waits for review: the month's records by state as tiles that lead to the list, Submitted edged as the one asking for work, and the forms a record starts from, each with its kind's chip and filtered by kind. */
export const RecordsOverview: StoryObj = {
    name: 'Overview',
    render: () => (
        <RecordsApp
            view="overview"
            foot={
                <StatusLine note="3 records wait for review">
                    <StatusItem>{FORMS.length} forms</StatusItem>
                </StatusLine>
            }
        >
            <Overview />
        </RecordsApp>
    ),
}

/** Site visits with filters, the chosen one in the inspector with its measurements and actions. */
export const RecordList: StoryObj = {
    name: 'Records',
    render: () => (
        <RecordsApp view="records" foot={<StatusLine note={`Showing ${String(VISITS.length)} of 248 visits`} />}>
            <Records />
        </RecordsApp>
    ),
}

/** A visit open from the list in a sheet, with its kind and state as chips beside the full page and the request, what was filed, every answer under the part of the form that asks it, and Approve and Return at the foot. */
export const RecordSheetStory: StoryObj = {
    name: 'Record sheet',
    render: () => (
        <RecordsApp view="records" foot={<StatusLine note={`Showing ${String(VISITS.length)} of 248 visits`} />}>
            <RecordSheet />
        </RecordsApp>
    ),
}

/** A long visit form in sections, each saying what it asks, two fields refusing their values, the site check partway through, and the actions pinned at the foot. */
export const Form: StoryObj = {
    render: () => (
        <RecordsApp view="form" foot={<StatusLine note="9 of 12 questions answered" />}>
            <VisitForm />
        </RecordsApp>
    ),
}

/** Visits by region for one month, with the legend, the month slider under the map, and the regions ranked beside it. */
export const RegionMap: StoryObj = {
    name: 'Map',
    render: () => (
        <RecordsApp view="map">
            <RegionsMap />
        </RecordsApp>
    ),
}
