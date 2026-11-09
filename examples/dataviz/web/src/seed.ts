import type { Board, Column, DataRow, Dataset, SavedChart, ViewSpec } from './model'

/**
 * The demo's first data: four invented datasets in Tidevann's world and plain geography, the charts
 * saved from them and two boards. Everything is made the same way every time: the figures come
 * from a hash of where they stand, never from the clock or chance.
 */

const SEEDED_AT = '2025-11-03T09:00:00.000Z'

/** A number in [0, 1) that is always the same for the same text. */
function noise(text: string): number {
    let hash = 2166136261
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
    return (hash % 10000) / 10000
}

const pad = (value: number) => String(value).padStart(2, '0')

/** The day `offset` days after `start`, as `YYYY-MM-DD`. */
function dayAfter(start: string, offset: number): string {
    const [year, month, day] = start.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day + offset))
    return `${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function dataset(id: string, name: string, description: string, columns: Column[], values: string[][]): Dataset {
    const rows = values.map((row, index): DataRow => ({
        id: `${id}-r${String(index + 1)}`,
        ...Object.fromEntries(columns.map((column, at) => [column.id, row[at] ?? ''])),
    }))
    return { id, name, description, source: 'seed', columns, rows, updatedAt: SEEDED_AT }
}

export const REGION_NAMES = [
    'Bo',
    'Bombali',
    'Bonthe',
    'Kailahun',
    'Kambia',
    'Kenema',
    'Koinadugu',
    'Kono',
    'Moyamba',
    'Port Loko',
    'Pujehun',
    'Tonkolili',
    'Western Area',
]

/** Each month's share of a wet year, peaking in August. */
const SEASON = [0.08, 0.1, 0.22, 0.45, 0.8, 1.25, 1.75, 1.95, 1.6, 1.1, 0.5, 0.18]

function rainfall(): Dataset {
    const columns: Column[] = [
        { id: 'c1', name: 'Month', type: 'date' },
        { id: 'c2', name: 'Region', type: 'region' },
        { id: 'c3', name: 'Rainfall', type: 'number' },
        { id: 'c4', name: 'Rain days', type: 'number' },
    ]
    const values = REGION_NAMES.flatMap((region, at) => {
        const wetness = 160 + at * 9 + noise(region) * 70
        return SEASON.map((share, month) => {
            const wobble = 0.85 + noise(`${region}-${String(month)}`) * 0.3
            const rain = Math.round(wetness * share * wobble)
            const days = Math.min(30, Math.round(2 + share * 12 * wobble))
            return [`2025-${pad(month + 1)}-01`, region, String(rain), String(days)]
        })
    })
    return dataset(
        'ds-rainfall',
        'Rainfall by region',
        'Rain at each region’s stations in 2025, a row a month: millimeters and the days it rained.',
        columns,
        values,
    )
}

const HARBORS = ['Bergen', 'Lisbon', 'Cork', 'Tallinn']
const VESSELS = ['cargo', 'ferry', 'fishing']

function arrivals(): Dataset {
    const columns: Column[] = [
        { id: 'c1', name: 'Date', type: 'date' },
        { id: 'c2', name: 'Harbor', type: 'text' },
        { id: 'c3', name: 'Vessel', type: 'text' },
        { id: 'c4', name: 'Arrivals', type: 'number' },
        { id: 'c5', name: 'Tonnage', type: 'number' },
    ]
    const size: Record<string, number> = { Bergen: 1.1, Lisbon: 1.5, Cork: 0.7, Tallinn: 0.9 }
    const base: Record<string, number> = { cargo: 6, ferry: 9, fishing: 4 }
    const tons: Record<string, number> = { cargo: 18, ferry: 4, fishing: 0.6 }
    const values: string[][] = []
    for (let day = 0; day < 90; day += 1) {
        const date = dayAfter('2025-01-01', day)
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
        const weekend = weekday === 0 || weekday === 6
        for (const harbor of HARBORS) {
            for (const vessel of VESSELS) {
                const spring = 1 + day / 180
                const busy = vessel === 'ferry' && weekend ? 1.4 : vessel === 'cargo' && weekend ? 0.55 : 1
                const count = Math.max(
                    0,
                    Math.round(base[vessel] * size[harbor] * spring * busy * (0.6 + noise(`${date}${harbor}${vessel}`) * 0.8)),
                )
                const tonnage = Math.round(count * tons[vessel] * (0.8 + noise(`${harbor}${vessel}${date}t`) * 0.4) * 10) / 10
                values.push([date, harbor, vessel, String(count), String(tonnage)])
            }
        }
    }
    return dataset(
        'ds-arrivals',
        'Harbor arrivals',
        'Vessels arriving at four harbors each day in the first quarter of 2025, and the tonnage they carried in thousands of metric tons.',
        columns,
        values,
    )
}

const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']
const PROJECT_OF: Record<string, string> = {
    'nightly-export': 'harbor',
    'sync-inventory': 'harbor',
    'rebuild-index': 'juniper',
    'send-digest': 'larkspur',
    'import-orders': 'juniper',
}
const STARTERS = ['schedule', 'schedule', 'ada', 'grace', 'linus', 'margaret']

function runs(): Dataset {
    const columns: Column[] = [
        { id: 'c1', name: 'Day', type: 'date' },
        { id: 'c2', name: 'Job', type: 'text' },
        { id: 'c3', name: 'Project', type: 'text' },
        { id: 'c4', name: 'State', type: 'text' },
        { id: 'c5', name: 'Duration', type: 'number' },
        { id: 'c6', name: 'Rows', type: 'number' },
        { id: 'c7', name: 'Started by', type: 'text' },
    ]
    const typical: Record<string, number> = {
        'nightly-export': 640,
        'sync-inventory': 210,
        'rebuild-index': 1180,
        'send-digest': 45,
        'import-orders': 380,
    }
    const values: string[][] = []
    for (let day = 0; day < 31; day += 1) {
        const date = dayAfter('2025-10-01', day)
        for (const job of JOBS) {
            const times = job === 'sync-inventory' ? 3 : job === 'import-orders' ? 2 : 1
            for (let run = 0; run < times; run += 1) {
                const key = `${date}${job}${String(run)}`
                const roll = noise(key)
                const state = roll < 0.08 ? 'failed' : roll < 0.11 ? 'cancelled' : roll < 0.14 ? 'skipped' : 'succeeded'
                const duration =
                    state === 'skipped' ? 0 : Math.round(typical[job] * (0.7 + noise(`${key}d`) * 0.7) * (state === 'failed' ? 0.4 : 1))
                const rows = state === 'succeeded' ? Math.round(duration * (20 + noise(`${key}r`) * 60)) : 0
                const by = STARTERS[Math.floor(noise(`${key}b`) * STARTERS.length)]
                values.push([date, job, PROJECT_OF[job], state, String(duration), String(rows), by])
            }
        }
    }
    return dataset(
        'ds-runs',
        'Runs by job',
        'Every run of Tidevann’s jobs in October 2025: its state, how long it took in seconds and the rows it moved.',
        columns,
        values,
    )
}

const CITIES: [string, string, string, number, number][] = [
    ['Lagos', 'Nigeria', 'Africa', 15.4, 1171],
    ['Nairobi', 'Kenya', 'Africa', 4.4, 696],
    ['Accra', 'Ghana', 'Africa', 2.6, 225],
    ['Dakar', 'Senegal', 'Africa', 3.3, 547],
    ['Lusaka', 'Zambia', 'Africa', 3.0, 418],
    ['Hanoi', 'Vietnam', 'Asia', 8.4, 3359],
    ['Kathmandu', 'Nepal', 'Asia', 1.6, 50],
    ['Ulaanbaatar', 'Mongolia', 'Asia', 1.7, 4704],
    ['Phnom Penh', 'Cambodia', 'Asia', 2.3, 679],
    ['Vientiane', 'Laos', 'Asia', 1.0, 3920],
    ['Oslo', 'Norway', 'Europe', 0.7, 454],
    ['Lisbon', 'Portugal', 'Europe', 0.55, 100],
    ['Reykjavik', 'Iceland', 'Europe', 0.14, 274],
    ['Tallinn', 'Estonia', 'Europe', 0.45, 159],
    ['Vienna', 'Austria', 'Europe', 2.0, 415],
    ['Dublin', 'Ireland', 'Europe', 0.6, 118],
    ['Lima', 'Peru', 'South America', 10.9, 2672],
    ['Santiago', 'Chile', 'South America', 6.9, 641],
    ['Montevideo', 'Uruguay', 'South America', 1.4, 201],
    ['La Paz', 'Bolivia', 'South America', 0.8, 472],
    ['Quito', 'Ecuador', 'South America', 2.0, 372],
    ['Suva', 'Fiji', 'Oceania', 0.09, 2048],
    ['Apia', 'Samoa', 'Oceania', 0.04, 60],
    ['Nuku’alofa', 'Tonga', 'Oceania', 0.03, 11],
]

function cities(): Dataset {
    const columns: Column[] = [
        { id: 'c1', name: 'City', type: 'text' },
        { id: 'c2', name: 'Country', type: 'text' },
        { id: 'c3', name: 'Continent', type: 'text' },
        { id: 'c4', name: 'Population', type: 'number' },
        { id: 'c5', name: 'Area', type: 'number' },
    ]
    const values = CITIES.map(([city, country, continent, millions, area]) => [
        city,
        country,
        continent,
        String(Math.round(millions * 1_000_000)),
        String(area),
    ])
    return dataset(
        'ds-cities',
        'Population by city',
        'People living in two dozen cities, and each city’s area in square kilometers. Rounded figures, for drawing rather than citing.',
        columns,
        values,
    )
}

export function seedDatasets(): Dataset[] {
    return [rainfall(), arrivals(), runs(), cities()]
}

const SPEC: ViewSpec = {
    view: 'bar',
    aggregate: 'sum',
    bin: 'month',
    sort: 'natural',
    limit: 0,
    stack: false,
    horizontal: false,
    palette: 'default',
}

const chart = (id: string, name: string, datasetId: string, spec: Partial<ViewSpec>): SavedChart => ({
    id,
    name,
    datasetId,
    spec: { ...SPEC, ...spec },
    updatedAt: SEEDED_AT,
})

export function seedCharts(): SavedChart[] {
    return [
        chart('ch-rain-map', 'Rainfall across the regions', 'ds-rainfall', { view: 'map', x: 'c2', y: 'c3' }),
        chart('ch-rain-season', 'Rainfall through the year', 'ds-rainfall', { view: 'area', x: 'c1', y: 'c3', bin: 'month' }),
        chart('ch-rain-grid', 'Rain days by region and month', 'ds-rainfall', {
            view: 'heatmap',
            x: 'c1',
            series: 'c2',
            y: 'c4',
            aggregate: 'avg',
        }),
        chart('ch-rain-total', 'Rain in the year', 'ds-rainfall', { view: 'stat', x: 'c1', y: 'c3', aggregate: 'sum' }),
        chart('ch-runs-state', 'Runs by job and state', 'ds-runs', { view: 'bar', x: 'c2', series: 'c4', stack: true, sort: 'desc' }),
        chart('ch-runs-duration', 'Duration through October', 'ds-runs', {
            view: 'line',
            x: 'c1',
            y: 'c5',
            series: 'c3',
            aggregate: 'avg',
            bin: 'day',
        }),
        chart('ch-runs-share', 'Runs by state', 'ds-runs', { view: 'pie', x: 'c4' }),
        chart('ch-runs-count', 'Rows moved this month', 'ds-runs', { view: 'stat', x: 'c1', y: 'c6', bin: 'day' }),
        chart('ch-runs-rows', 'Rows moved by project', 'ds-runs', { view: 'table', x: 'c3', y: 'c6', sort: 'desc' }),
        chart('ch-arrivals-week', 'Arrivals by week', 'ds-arrivals', {
            view: 'bar',
            x: 'c1',
            y: 'c4',
            series: 'c2',
            bin: 'week',
            stack: true,
            palette: 'cool',
        }),
        chart('ch-cities', 'Population against area', 'ds-cities', { view: 'scatter', x: 'c5', y: 'c4', color: 'c3' }),
    ]
}

export function seedBoards(): Board[] {
    return [
        {
            id: 'bd-weather',
            name: 'Weather',
            description: 'Where and when the rain fell in 2025.',
            items: [
                { id: 'it-1', chartId: 'ch-rain-total', span: 'third' },
                { id: 'it-2', chartId: 'ch-rain-season', span: 'two-thirds' },
                { id: 'it-3', chartId: 'ch-rain-map', span: 'half' },
                { id: 'it-4', chartId: 'ch-rain-grid', span: 'half' },
            ],
            filters: [],
            updatedAt: SEEDED_AT,
        },
        {
            id: 'bd-runs',
            name: 'Runs in October',
            description: 'How Tidevann’s jobs ran through the month.',
            items: [
                { id: 'it-5', chartId: 'ch-runs-count', span: 'third' },
                { id: 'it-6', chartId: 'ch-runs-share', span: 'third' },
                { id: 'it-7', chartId: 'ch-runs-rows', span: 'third' },
                { id: 'it-8', chartId: 'ch-runs-state', span: 'half' },
                { id: 'it-9', chartId: 'ch-runs-duration', span: 'half' },
            ],
            filters: [],
            updatedAt: SEEDED_AT,
        },
    ]
}
