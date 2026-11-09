/**
 * Two years of Tidevann's teams, made the same way every time from the day each signed up: who
 * they are, where they work, and every change to their plans up to now. The fake server keeps only
 * what changes after this, so the history itself never needs storing.
 */

import {
    COUNTRIES,
    DAY,
    REGION_OWNER,
    REGIONS,
    dayOf,
    startOf,
    type Change,
    type Country,
    type Plan,
    type Region,
    type TeamRecord,
} from './model'

/** A random source that gives the same numbers for the same seed (mulberry32). */
export function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let value = state
        value = Math.imul(value ^ (value >>> 15), value | 1)
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
        return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    }
}

/** A number made from several, spread across the whole range, for seeding. */
export function hash(...parts: number[]): number {
    let value = 2_166_136_261
    for (const part of parts) {
        value ^= part
        value = Math.imul(value, 16_777_619)
        value ^= value >>> 13
    }
    return value >>> 0
}

/** One of `items`, each as likely as its weight. */
export function pick<T>(random: () => number, items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0)
    let left = random() * total
    for (const item of items) {
        left -= weight(item)
        if (left <= 0) return item
    }
    return items[items.length - 1] as T
}

const between = (random: () => number, low: number, high: number) => low + Math.floor(random() * (high - low + 1))

/** How far back the history reaches, in days. */
export const HISTORY = 730

/** The day sign-ups are counted from: about 22 a day then, a little more each day since. */
const ANCHOR = Math.floor(Date.UTC(2026, 0, 1) / DAY)

const REGION_WEIGHT: Record<Region, number> = {
    europe: 34,
    'north-america': 30,
    'asia-pacific': 18,
    'south-america': 10,
    'middle-east-africa': 8,
}

const FIRST = [
    'Alder',
    'Amber',
    'Ash',
    'Aspen',
    'Basalt',
    'Birch',
    'Bramble',
    'Briar',
    'Cedar',
    'Cinder',
    'Clover',
    'Cobalt',
    'Copper',
    'Coral',
    'Cypress',
    'Dune',
    'Elm',
    'Ember',
    'Fern',
    'Fjord',
    'Flint',
    'Frost',
    'Garnet',
    'Glacier',
    'Granite',
    'Hazel',
    'Heath',
    'Heron',
    'Holly',
    'Iris',
    'Ivory',
    'Jasper',
    'Kelp',
    'Kestrel',
    'Laurel',
    'Linden',
    'Lumen',
    'Maple',
    'Marble',
    'Meadow',
    'Moss',
    'Nimbus',
    'North',
    'Oak',
    'Onyx',
    'Orchid',
    'Osprey',
    'Pebble',
    'Pine',
    'Plover',
    'Quarry',
    'Quartz',
    'Raven',
    'Reed',
    'Ridge',
    'Rowan',
    'Sable',
    'Saffron',
    'Sage',
    'Shale',
    'Slate',
    'Sorrel',
    'Spruce',
    'Summit',
    'Tansy',
    'Thistle',
    'Thorn',
    'Timber',
    'Tundra',
    'Umber',
    'Vale',
    'Willow',
    'Wren',
    'Yarrow',
    'Zephyr',
    'Beacon',
    'Comet',
    'Delta',
    'Echo',
    'Falcon',
]
const MIDDLE = ['', 'wood', 'field', 'brook', 'stone', 'ford', 'gate', 'mere']
const LAST = [
    'Labs',
    'Studio',
    'Works',
    'Systems',
    'Logistics',
    'Analytics',
    'Foods',
    'Health',
    'Design',
    'Freight',
    'Bakery',
    'Clinic',
    'Robotics',
    'Energy',
    'Media',
    'Ventures',
    'Partners',
    'Supply',
    'Outdoors',
    'Textiles',
    'Brewing',
    'Architects',
    'Dental',
    'Learning',
    'Travel',
    'Games',
    'Software',
    'Print',
    'Florists',
    'Legal',
    'Motors',
    'Optics',
    'Records',
    'Coffee',
    'Pharmacy',
    'Builders',
    'Finance',
    'Insurance',
    'Marine',
    'Farms',
    'Audio',
    'Furniture',
    'Fitness',
    'Books',
    'Interiors',
    'Engineering',
    'Consulting',
    'Aviation',
    'Bikes',
    'Gardens',
]

/** Every name a team can have, in an order the seed spreads them in. */
const NAMES_IN_ALL = FIRST.length * MIDDLE.length * LAST.length

function nameAt(index: number): string {
    const first = FIRST[index % FIRST.length] ?? ''
    const middle = MIDDLE[Math.floor(index / FIRST.length) % MIDDLE.length] ?? ''
    const last = LAST[Math.floor(index / (FIRST.length * MIDDLE.length)) % LAST.length] ?? ''
    const joined = first.toLowerCase().endsWith(middle) ? first : first + middle
    return `${joined} ${last}`
}

/** Names given out so far; each team gets the first free one from where its seed points. */
export class Names {
    private taken = new Set<string>()
    take(seed: number): string {
        for (let step = 0; step < NAMES_IN_ALL; step += 1) {
            const name = nameAt((seed + step * 7919) % NAMES_IN_ALL)
            if (!this.taken.has(name)) {
                this.taken.add(name)
                return name
            }
        }
        return `Team ${String(seed)}`
    }
    keep(name: string): void {
        this.taken.add(name)
    }
}

/** A country, by the sign-ups each region and country has. */
export function placeOf(random: () => number): Country {
    const region = pick(random, REGIONS, (one) => REGION_WEIGHT[one])
    return pick(
        random,
        COUNTRIES.filter((country) => country.region === region),
        (country) => country.weight,
    )
}

/** About how many teams sign up on a day: growing a little each day, quieter on weekends. */
function signupsOn(day: number, random: () => number): number {
    const weekday = new Date(day * DAY).getUTCDay()
    const weekend = weekday === 0 || weekday === 6 ? 0.55 : 1
    return Math.round(22 * 1.0011 ** (day - ANCHOR) * weekend * (0.8 + random() * 0.4))
}

/** A moment in a day's working hours. */
const momentIn = (day: number, random: () => number) => startOf(day) + Math.round((7 + random() * 14) * 3_600_000)

/** One team and its changes up to `now`, from its own seed alone. */
function team(day: number, index: number, names: Names, now: number): { record: TeamRecord; changes: Change[] } {
    const random = seeded(hash(day, index, 7))
    const id = `t${String(day)}-${String(index)}`
    const place = placeOf(random)
    const created = momentIn(day, random)
    const freeSeats = 1 + Math.floor(random() ** 2 * 5)
    const project = random() < 0.75 ? day + Math.floor(random() ** 2 * 4) : null
    const invited = project !== null && random() < 0.55 ? project + Math.floor(random() ** 2 * 10) : null
    const changes: Change[] = [{ id: `${id}-0`, team: id, kind: 'signup', at: created, plan: 'free', seats: freeSeats, by: null }]
    const upgradeChance = invited !== null ? 0.3 : project !== null ? 0.08 : 0.02
    let dormant: number | null = null
    if (random() < upgradeChance) {
        const from = invited ?? project ?? day
        let at = momentIn(from + between(random, 2, 45), random)
        let plan: Plan = random() < 0.78 ? 'team' : 'business'
        let seats =
            plan === 'team'
                ? between(random, 3, 6) + Math.floor(random() ** 3 * 18)
                : between(random, 8, 16) + Math.floor(random() ** 3 * 70)
        let made = 1
        const add = (kind: Change['kind'], nextPlan: Plan, nextSeats: number) => {
            if (at > now) return false
            changes.push({ id: `${id}-${String(made)}`, team: id, kind, at, plan: nextPlan, seats: nextSeats, by: null })
            made += 1
            return true
        }
        if (add('upgrade', plan, seats)) {
            for (;;) {
                at += (28 + Math.floor(random() * 6)) * DAY
                if (at > now) break
                const roll = random()
                const churn = plan === 'team' ? 0.022 : 0.012
                if (roll < churn) {
                    add('churn', plan, 0)
                    break
                }
                if (roll < churn + 0.1) {
                    seats += plan === 'team' ? between(random, 1, 4) : between(random, 2, 10)
                    add('seats', plan, seats)
                } else if (roll < churn + 0.14 && seats > 3) {
                    seats -= between(random, 1, Math.min(3, seats - 3))
                    add('seats', plan, seats)
                } else if (roll < churn + 0.155 && plan === 'team') {
                    plan = 'business'
                    seats = Math.max(seats, 8)
                    add('upgrade', plan, seats)
                } else if (roll < churn + 0.16 && plan === 'business') {
                    plan = 'team'
                    add('downgrade', plan, seats)
                }
            }
        }
    } else if (random() < 0.72) {
        dormant = day + between(random, 5, 120)
    }
    const record: TeamRecord = {
        id,
        name: names.take(hash(day, index, 11) % NAMES_IN_ALL),
        country: place.name,
        region: place.region,
        owner: REGION_OWNER[place.region],
        created,
        project,
        invited,
        dormant,
    }
    return { record, changes: changes.filter((change) => change.at <= now) }
}

/** Every team that signed up in the last two years, up to `now`, with their changes and the names given out. */
export function history(now: number): { teams: TeamRecord[]; changes: Change[]; names: Names } {
    const today = dayOf(now)
    const names = new Names()
    const teams: TeamRecord[] = []
    const changes: Change[] = []
    for (let day = today - HISTORY + 1; day <= today; day += 1) {
        const count = signupsOn(day, seeded(hash(day, 3)))
        for (let index = 0; index < count; index += 1) {
            const made = team(day, index, names, now)
            if (made.record.created > now) continue
            teams.push(made.record)
            changes.push(...made.changes)
        }
    }
    return { teams, changes, names }
}
