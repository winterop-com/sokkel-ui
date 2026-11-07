import { TextField } from '../../components/TextField'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature } from 'geojson'
import {
    CheckCircle2,
    CircleAlert,
    ClipboardList,
    Download,
    FilePlus2,
    FolderOpen,
    Map as MapIcon,
    MapPin,
    Plus,
    Undo2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { DescriptionList } from '../../components/DescriptionList'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { Field } from '../../components/Field'
import { FilterChip, type FilterOption } from '../../components/FilterChip'
import { FormBar } from '../../components/FormBar'
import { Inspector, InspectorSection } from '../../components/Inspector'
import { IssueCount } from '../../components/IssueMark'
import { BoundaryLayer } from '../../components/map/BoundaryLayer'
import { MapLegend } from '../../components/map/MapLegend'
import { MapOverlay, MapView } from '../../components/map/MapView'
import { PeriodSlider } from '../../components/map/PeriodSlider'
import { colorOf, sequentialScale } from '../../components/map/scale'
import { PageHeader } from '../../components/PageHeader'
import { Rail, type RailGroup } from '../../components/Rail'
import { SearchField } from '../../components/SearchField'
import { Section } from '../../components/Section'
import { Segmented } from '../../components/Segmented'
import { Page, Shell } from '../../components/Shell'
import { StatusChip, type Status } from '../../components/StatusChip'
import { TopBar, type Crumb } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'
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
} from '../../components/ui/questionnaire'
import { TooltipProvider } from '../../components/ui/tooltip'
import { PEOPLE_OPTIONS } from '../fixtures/filters'
import { TidevannMark } from '../fixtures/TidevannMark'
import { NUMBER, regionName, regions } from '../map/data'
import { Dot } from '../../components/Dot'
import { Columns, Row, Stack } from '../../components/Layout'
import { TableOfContents } from '../../components/TableOfContents'

/**
 * A records app for structured data capture in the library's frame: a list of site visits with
 * filters and the chosen one in an inspector, a long visit form in sections with a step-through
 * site check and fields that refuse their values, and the visits by region on a map with a legend
 * and a month slider.
 */
type View = 'records' | 'form' | 'map'

type State = 'draft' | 'submitted' | 'approved' | 'returned'

const STATE: Record<State, Status> = { draft: 'pending', submitted: 'running', approved: 'succeeded', returned: 'failed' }

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
                { id: 'visits', label: 'Visits', icon: ClipboardList, href: '#', active: view === 'records' },
                { id: 'new', label: 'New visit', icon: FilePlus2, href: '#', active: view === 'form' },
                { id: 'sites', label: 'Sites', icon: MapPin, href: '#' },
                { id: 'map', label: 'Map', icon: MapIcon, href: '#', active: view === 'map' },
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
            <div className="flex min-h-0 flex-1 items-start gap-(--density-inspector-gap)">
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
                <div className="hidden self-stretch xl:flex">
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
                </div>
            </div>
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
                    <form
                        className="flex max-w-4xl min-w-0 flex-1 flex-col gap-(--density-page-gap)"
                        onSubmit={(event) => event.preventDefault()}
                    >
                        <Section title="Where and when">
                            <Columns gap="lg">
                                <Field id="site" label="Site" required>
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
                        <Section title="Measurements" meta="4 of 5">
                            <Columns gap="lg">
                                <TextField
                                    id="level"
                                    label="Water level"
                                    hint="m"
                                    required
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
                        <Section title="Site check" meta="3 questions">
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
                    </form>
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
                        className="sticky top-0 hidden w-52 shrink-0 xl:flex"
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
        <span className="flex size-4 shrink-0 items-center justify-center" aria-label="Not started">
            <Dot outline />
        </span>
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
                <span className="flex min-w-0 items-center gap-2.5">
                    <span className="size-2.5 shrink-0 rounded-mini" style={{ background: colorOf(visitScale, counts[id]) ?? undefined }} />
                    <span className="truncate">{regionName[id]}</span>
                </span>
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
                        onChoose={setMeasure}
                        options={[
                            { value: 'visits', label: 'Visits' },
                            { value: 'returned', label: 'Returned' },
                        ]}
                    />
                }
            />
            <div className="flex min-h-0 flex-1 flex-col gap-(--density-inspector-gap) xl:flex-row">
                <div className="flex min-h-[28rem] min-w-0 flex-1 flex-col gap-3">
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
                </div>
                <DataTable
                    columns={regionColumns(counts)}
                    rows={REGION_IDS}
                    rowKey={(id) => id}
                    defaultSort={{ column: 'visits', direction: 'desc' }}
                    toolbar={<span className="font-medium">Regions</span>}
                    minWidth="14rem"
                    className="shrink-0 xl:w-72"
                />
            </div>
        </Page>
    )
}

function RecordsApp({ view, children }: { view: View; children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(view)}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="grace" where="tidevann.example.org" collapsed={collapsed} onSettings={() => undefined} />}
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

/** Site visits with filters, the chosen one in the inspector with its measurements and actions. */
export const RecordList: StoryObj = {
    name: 'Records',
    render: () => (
        <RecordsApp view="records">
            <Records />
        </RecordsApp>
    ),
}

/** A long visit form in sections, two fields refusing their values, the site check partway through, and the actions pinned at the foot. */
export const Form: StoryObj = {
    render: () => (
        <RecordsApp view="form">
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
